from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models.medical_record import MedicalRecord
from app.models.ai_summary import AiSummary
from app.middleware.auth_middleware import require_auth, log_audit_trail
from app.services.ai_service import ai_service

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

@ai_bp.route('/summarize/<record_id>', methods=['POST'])
@require_auth()
def generate_summary(record_id):
    user = g.current_user
    record = MedicalRecord.query.filter_by(id=record_id, user_id=user.id, is_deleted=False).first()
    if not record:
        return jsonify({'error': 'Record not found.'}), 404

    # Check if extracted text exists
    extraction = record.extraction
    if not extraction or not extraction.extracted_text:
        return jsonify({
            'error': 'Text extraction has not yet completed for this document. Please verify the OCR tab.'
        }), 400

    # Call AI service
    result = ai_service.summarize_report(extraction.extracted_text, record.title)
    if not result.get('success'):
        return jsonify({'error': result.get('error', 'Failed to generate summary.')}), 500

    # Store or update in database
    existing_summary = record.ai_summary
    if not existing_summary:
        existing_summary = AiSummary(record_id=record.id)
        db.session.add(existing_summary)

    existing_summary.model_name = result.get('model_name', 'gemini-3.5-flash-lite')
    existing_summary.summary_text = result.get('summary_text', '')
    existing_summary.key_findings = result.get('key_findings', [])
    existing_summary.ai_perspective = result.get('ai_perspective', '')
    existing_summary.questions_for_doctor = result.get('questions_for_doctor', [])
    existing_summary.overall_status = result.get('overall_status', 'Review Suggested')
    existing_summary.missing_or_unclear_info = result.get('missing_or_unclear_info', '')
    existing_summary.disclaimer_acknowledged = True

    db.session.commit()
    log_audit_trail('GENERATE_AI_SUMMARY', 'AiSummary', existing_summary.id)

    return jsonify({
        'message': 'AI Summary generated successfully.',
        'summary': existing_summary.to_dict(),
        'is_simulated': result.get('is_simulated', False),
        'disclaimer': 'This summary is AI-generated for informational purposes and does not replace medical consultation with a licensed physician.'
    }), 200

@ai_bp.route('/summarize/<record_id>', methods=['GET'])
@require_auth()
def get_summary(record_id):
    record = MedicalRecord.query.filter_by(id=record_id, user_id=g.current_user.id, is_deleted=False).first()
    if not record:
        return jsonify({'error': 'Record not found.'}), 404

    summary = record.ai_summary
    if not summary:
        return jsonify({'error': 'No AI summary has been generated for this record yet.'}), 404

    return jsonify({
        'summary': summary.to_dict(),
        'disclaimer': 'This summary is AI-generated for informational purposes and does not replace medical consultation with a licensed physician.'
    }), 200
