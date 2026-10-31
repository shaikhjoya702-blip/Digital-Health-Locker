from datetime import datetime
from flask import Blueprint, request, jsonify, g, send_file, current_app
from app.models.medical_record import MedicalRecord
from app.models.sharing_permission import SharingPermission
from app.middleware.auth_middleware import require_doctor_share_auth
from app.middleware.rate_limiter import rate_limit
from app.services.sharing_service import sharing_service
from app.services.storage_service import storage_service

doctor_portal_bp = Blueprint('doctor_portal', __name__, url_prefix='/api/public/share')

@doctor_portal_bp.route('/resolve', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=60)
def resolve_share_token():
    """
    Validates opaque token from QR scan without revealing patient records or database details.
    """
    data = request.get_json() or {}
    token = data.get('token', '').strip()
    if not token:
        return jsonify({'error': 'Sharing token is required.'}), 400

    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    ua = request.headers.get('User-Agent', '')

    result = sharing_service.verify_token_and_resolve(token, ip, ua)
    if not result.get('valid'):
        return jsonify({'error': result.get('error')}), 403

    return jsonify({
        'valid': True,
        'permission_id': result['permission_id'],
        'recipient_label': result['recipient_label'],
        'expires_at': result['expires_at'],
        'requires_otp': result['requires_otp'],
        'record_count': result['record_count']
    }), 200

@doctor_portal_bp.route('/verify-otp', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=60)
def verify_otp():
    """
    Verifies OTP against salted hash. Issues a scoped, short-lived Doctor View JWT.
    """
    data = request.get_json() or {}
    token = data.get('token', '').strip()
    otp = data.get('otp', '').strip()

    if not token or not otp:
        return jsonify({'error': 'Token and 6-digit OTP are required.'}), 400

    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    ua = request.headers.get('User-Agent', '')

    res = sharing_service.verify_otp_and_issue_session(token, otp, ip, ua)
    if not res.get('success'):
        return jsonify({'error': res.get('error')}), 403

    return jsonify(res), 200

@doctor_portal_bp.route('/records', methods=['GET'])
@require_doctor_share_auth()
def list_shared_records():
    """
    Returns only the records specifically authorized by the patient in this session.
    """
    perm = g.doctor_permission
    allowed_ids = g.allowed_record_ids

    records = MedicalRecord.query.filter(
        MedicalRecord.id.in_(allowed_ids),
        MedicalRecord.user_id == perm.user_id,
        MedicalRecord.is_deleted == False
    ).all()

    # Filter out extraction text or full AI summary based on permission settings
    result = []
    for r in records:
        rec_dict = r.to_dict(include_extraction=False, include_ai=perm.include_ai_summary)
        rec_dict['allow_download'] = perm.allow_download
        result.append(rec_dict)

    return jsonify({
        'patient_alias': f"Authorized Records ({perm.recipient_label or 'Consultation'})",
        'expires_at': perm.expires_at.isoformat(),
        'allow_download': perm.allow_download,
        'include_ai_summary': perm.include_ai_summary,
        'records': result
    }), 200

@doctor_portal_bp.route('/records/<record_id>/view', methods=['GET'])
@require_doctor_share_auth()
def stream_shared_record_file(record_id):
    """
    Validates per-record permission before streaming the protected file to the doctor.
    """
    perm = g.doctor_permission
    if record_id not in g.allowed_record_ids:
        return jsonify({'error': 'Unauthorized. This record was not included in the patient sharing grant.'}), 403

    record = MedicalRecord.query.filter_by(id=record_id, user_id=perm.user_id, is_deleted=False).first()
    if not record:
        return jsonify({'error': 'Record not found.'}), 404

    # Log access event
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    ua = request.headers.get('User-Agent', '')
    sharing_service._log_event(perm.id, ip, ua, 'view_record', 'allowed', record.id)

    try:
        path = storage_service.get_absolute_path(record.stored_filename)
        # If download is disallowed, force inline viewing
        as_attachment = perm.allow_download and request.args.get('download') == 'true'
        response = send_file(
            path,
            mimetype=record.mime_type,
            as_attachment=as_attachment,
            download_name=record.original_filename
        )
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
        return response
    except FileNotFoundError:
        return jsonify({'error': 'File not found in storage.'}), 404

@doctor_portal_bp.route('/records/<record_id>/summary', methods=['GET'])
@require_doctor_share_auth()
def get_shared_record_summary(record_id):
    perm = g.doctor_permission
    if not perm.include_ai_summary:
        return jsonify({'error': 'AI summary is not authorized for this sharing session.'}), 403

    if record_id not in g.allowed_record_ids:
        return jsonify({'error': 'Record not authorized.'}), 403

    record = MedicalRecord.query.filter_by(id=record_id, user_id=perm.user_id, is_deleted=False).first()
    if not record or not record.ai_summary:
        return jsonify({'error': 'No AI summary available for this record.'}), 404

    return jsonify({
        'summary': record.ai_summary.to_dict(),
        'disclaimer': 'This summary is AI-generated for informational assistance only.'
    }), 200

@doctor_portal_bp.route('/records/<record_id>/summary/generate', methods=['POST'])
@require_doctor_share_auth()
def generate_shared_record_summary(record_id):
    """Allows authorized doctor to generate or refresh AI summary if included in patient share."""
    perm = g.doctor_permission
    if not perm.include_ai_summary:
        return jsonify({'error': 'AI summary is not authorized for this sharing session.'}), 403

    if record_id not in g.allowed_record_ids:
        return jsonify({'error': 'Record not authorized.'}), 403

    record = MedicalRecord.query.filter_by(id=record_id, user_id=perm.user_id, is_deleted=False).first()
    if not record:
        return jsonify({'error': 'Record not found.'}), 404

    if record.ai_summary:
        return jsonify({
            'message': 'AI summary already exists.',
            'summary': record.ai_summary.to_dict()
        }), 200

    extraction = record.extraction
    if not extraction or not extraction.extracted_text:
        return jsonify({'error': 'Document text extraction is empty or incomplete.'}), 400

    from app.services.ai_service import ai_service
    from app.models.ai_summary import AiSummary
    from app.extensions import db

    ai_res = ai_service.summarize_report(extraction.extracted_text, record.title)
    if not ai_res.get('success'):
        return jsonify({'error': ai_res.get('error', 'AI summary generation failed.')}), 500

    summary = AiSummary(
        record_id=record.id,
        model_name=ai_res.get('model_name', 'gemini-3.5-flash-lite'),
        summary_text=ai_res.get('summary_text', ''),
        key_findings=ai_res.get('key_findings', []),
        ai_perspective=ai_res.get('ai_perspective', ''),
        questions_for_doctor=ai_res.get('questions_for_doctor', []),
        overall_status=ai_res.get('overall_status', 'Review Suggested'),
        missing_or_unclear_info=ai_res.get('missing_or_unclear_info', ''),
        disclaimer_acknowledged=True
    )
    db.session.add(summary)
    db.session.commit()

    return jsonify({
        'message': 'AI summary successfully generated.',
        'summary': summary.to_dict()
    }), 200
