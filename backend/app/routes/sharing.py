from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models.sharing_permission import SharingPermission
from app.models.sharing_access_event import SharingAccessEvent
from app.models.medical_record import MedicalRecord
from app.middleware.auth_middleware import require_auth, log_audit_trail
from app.services.sharing_service import sharing_service

sharing_bp = Blueprint('sharing', __name__, url_prefix='/api/sharing')

@sharing_bp.route('/create', methods=['POST'])
@require_auth()
def create_share():
    user = g.current_user
    data = request.get_json() or {}

    record_ids = data.get('record_ids', [])
    duration_hours = int(data.get('duration_hours', 1))
    recipient_label = data.get('recipient_label', '').strip()
    allow_download = bool(data.get('allow_download', False))
    include_ai_summary = bool(data.get('include_ai_summary', True))

    if not record_ids:
        return jsonify({'error': 'Please select at least one medical record to share.'}), 400

    try:
        session_data = sharing_service.create_sharing_session(
            user_id=user.id,
            record_ids=record_ids,
            duration_hours=duration_hours,
            recipient_label=recipient_label,
            allow_download=allow_download,
            include_ai_summary=include_ai_summary
        )

        log_audit_trail(
            'CREATE_SHARING_PERMISSION',
            'SharingPermission',
            session_data['permission_id'],
            {'recipient': recipient_label, 'record_count': len(record_ids), 'duration_hours': duration_hours}
        )

        return jsonify({
            'message': 'Secure sharing permission generated.',
            'share': session_data
        }), 201

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to generate share link: {str(e)}'}), 500

@sharing_bp.route('/active', methods=['GET'])
@require_auth()
def list_active_shares():
    permissions = SharingPermission.query.filter_by(user_id=g.current_user.id).order_by(SharingPermission.created_at.desc()).all()
    
    # Enrich with record titles
    result = []
    for perm in permissions:
        d = perm.to_dict()
        records = MedicalRecord.query.filter(MedicalRecord.id.in_(perm.allowed_record_ids or [])).all()
        d['records'] = [{'id': r.id, 'title': r.title, 'category': r.category} for r in records]
        result.append(d)

    return jsonify({'shares': result}), 200

@sharing_bp.route('/revoke/<permission_id>', methods=['POST'])
@require_auth()
def revoke_share(permission_id):
    success = sharing_service.revoke_permission(permission_id, g.current_user.id)
    if not success:
        return jsonify({'error': 'Sharing permission not found or unauthorized.'}), 404

    log_audit_trail('REVOKE_SHARING_PERMISSION', 'SharingPermission', permission_id)
    return jsonify({'message': 'Access has been immediately revoked. Subsequent scans or OTP attempts will be blocked.'}), 200

@sharing_bp.route('/audit/<permission_id>', methods=['GET'])
@require_auth()
def get_share_audit(permission_id):
    permission = SharingPermission.query.filter_by(id=permission_id, user_id=g.current_user.id).first()
    if not permission:
        return jsonify({'error': 'Sharing permission not found.'}), 404

    events = SharingAccessEvent.query.filter_by(sharing_permission_id=permission.id).order_by(SharingAccessEvent.created_at.desc()).all()
    return jsonify({
        'permission_id': permission.id,
        'recipient_label': permission.recipient_label,
        'events': [e.to_dict() for e in events]
    }), 200
