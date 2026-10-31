from flask import Blueprint, jsonify, g
from app.models.audit_log import AuditLog
from app.middleware.auth_middleware import require_auth

audit_bp = Blueprint('audit', __name__, url_prefix='/api/audit')

@audit_bp.route('', methods=['GET'])
@require_auth()
def get_user_audit_logs():
    logs = AuditLog.query.filter_by(user_id=g.current_user.id).order_by(AuditLog.created_at.desc()).limit(50).all()
    return jsonify({'logs': [log.to_dict() for log in logs]}), 200
