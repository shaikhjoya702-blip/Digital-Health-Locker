from functools import wraps
from flask import request, jsonify, g, current_app
from app.utils.security import decode_jwt_token
from app.models.user import User
from app.models.sharing_permission import SharingPermission
from app.models.audit_log import AuditLog
from app.extensions import db
import jwt

def require_auth(roles=None):
    """Decorator to enforce authenticated user via Bearer JWT or query param (for media/file tags)."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = None
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ', 1)[1].strip()
            elif request.args.get('auth'):
                token = request.args.get('auth').strip()
            elif request.args.get('token'):
                token = request.args.get('token').strip()

            if not token:
                return jsonify({'error': 'Authorization token required'}), 401
            
            try:
                payload = decode_jwt_token(token)
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Session expired. Please log in again.'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid authentication token.'}), 401

            # Ensure this is a standard user token, not a scoped doctor token
            if payload.get('type') != 'user':
                return jsonify({'error': 'Unauthorized token type.'}), 403

            user = db.session.get(User, payload.get('user_id'))
            if not user:
                return jsonify({'error': 'User not found or deactivated.'}), 401

            if roles and user.role not in roles:
                return jsonify({'error': 'Insufficient permissions.'}), 403

            g.current_user = user
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_doctor_share_auth():
    """Decorator to enforce doctor access via a scoped Doctor View JWT."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = None
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ', 1)[1].strip()
            elif request.args.get('token'):
                token = request.args.get('token').strip()

            if not token:
                return jsonify({'error': 'Doctor access token required'}), 401
            
            try:
                payload = decode_jwt_token(token)
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Sharing access session has expired.'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid access session token.'}), 401

            if payload.get('type') != 'doctor_shared_access':
                return jsonify({'error': 'Invalid token scope.'}), 403

            perm_id = payload.get('permission_id')
            perm = db.session.get(SharingPermission, perm_id)
            if not perm or not perm.is_active:
                return jsonify({'error': 'This sharing link is expired or has been revoked by the patient.'}), 403

            g.doctor_permission = perm
            g.allowed_record_ids = perm.allowed_record_ids or []
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def log_audit_trail(action: str, entity_type: str, entity_id: str = None, metadata: dict = None, user_id: str = None):
    """Helper to log audit events into the audit_logs table."""
    try:
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        ua = request.headers.get('User-Agent', '')[:250]
        uid = user_id or (g.current_user.id if hasattr(g, 'current_user') and g.current_user else None)
        
        log_entry = AuditLog(
            user_id=uid,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            ip_address=ip,
            user_agent=ua,
            metadata_json=metadata
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to record audit log: {str(e)}")
