import secrets
from datetime import datetime, timedelta
from typing import Tuple, Dict, Any, List
from flask import current_app
from app.extensions import db
from app.models.sharing_permission import SharingPermission
from app.models.sharing_access_event import SharingAccessEvent
from app.models.medical_record import MedicalRecord
from app.utils.security import (
    generate_random_token,
    generate_numeric_otp,
    hash_token,
    hash_otp_with_salt,
    create_jwt_token
)

class SharingService:
    """
    Manages secure patient-governed report sharing via opaque QR tokens and salted OTPs.
    Enforces strict least-privilege scoping, expiry, and instant revocation.
    """

    @classmethod
    def create_sharing_session(
        cls,
        user_id: str,
        record_ids: List[str],
        duration_hours: int = 1,
        recipient_label: str = None,
        allow_download: bool = False,
        include_ai_summary: bool = True
    ) -> Dict[str, Any]:
        """
        Creates a new sharing session. Generates raw random token and OTP for the patient,
        storing only cryptographic SHA-256 hashes in the database.
        """
        # Validate that all selected records belong to the user
        valid_records = MedicalRecord.query.filter(
            MedicalRecord.id.in_(record_ids),
            MedicalRecord.user_id == user_id,
            MedicalRecord.is_deleted == False
        ).all()
        
        valid_ids = [r.id for r in valid_records]
        if not valid_ids:
            raise ValueError("No valid medical records selected for sharing.")

        raw_token = generate_random_token(32)
        raw_otp = generate_numeric_otp(6)
        salt = secrets.token_hex(16)

        token_hash = hash_token(raw_token)
        otp_hash = hash_otp_with_salt(raw_otp, salt)

        expires_at = datetime.utcnow() + timedelta(hours=max(1, min(duration_hours, 168)))

        permission = SharingPermission(
            user_id=user_id,
            token_hash=token_hash,
            otp_hash=otp_hash,
            otp_salt=salt,
            allowed_record_ids=valid_ids,
            recipient_label=recipient_label,
            allow_download=allow_download,
            include_ai_summary=include_ai_summary,
            expires_at=expires_at,
            is_revoked=False,
            failed_otp_attempts=0,
            max_otp_attempts=5
        )
        db.session.add(permission)
        db.session.commit()

        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        opaque_sharing_url = f"{frontend_url}/doctor/portal?token={raw_token}"

        return {
            'permission_id': permission.id,
            'token': raw_token,
            'otp': raw_otp,
            'sharing_url': opaque_sharing_url,
            'expires_at': expires_at.isoformat(),
            'records_shared_count': len(valid_ids),
            'allow_download': allow_download,
            'include_ai_summary': include_ai_summary
        }

    @classmethod
    def verify_token_and_resolve(cls, raw_token: str, client_ip: str, user_agent: str) -> Dict[str, Any]:
        """
        Resolves an opaque token from a QR scan.
        Logs the access event and returns metadata without leaking patient private records.
        """
        token_hash = hash_token(raw_token)
        permission = SharingPermission.query.filter_by(token_hash=token_hash).first()

        if not permission:
            return {'valid': False, 'error': 'Invalid or unrecognized sharing token.'}

        # Check revocation
        if permission.is_revoked:
            cls._log_event(permission.id, client_ip, user_agent, 'qr_scan', 'revoked')
            return {'valid': False, 'error': 'This sharing link has been revoked by the patient.'}

        # Check expiry
        if datetime.utcnow() > permission.expires_at:
            cls._log_event(permission.id, client_ip, user_agent, 'qr_scan', 'expired')
            return {'valid': False, 'error': 'This sharing link has expired.'}

        # Check failed attempts lockout
        if permission.failed_otp_attempts >= permission.max_otp_attempts:
            cls._log_event(permission.id, client_ip, user_agent, 'qr_scan', 'denied')
            return {'valid': False, 'error': 'This sharing link is locked due to multiple failed verification attempts.'}

        cls._log_event(permission.id, client_ip, user_agent, 'qr_scan', 'allowed')
        return {
            'valid': True,
            'permission_id': permission.id,
            'recipient_label': permission.recipient_label,
            'expires_at': permission.expires_at.isoformat(),
            'requires_otp': True,
            'record_count': len(permission.allowed_record_ids or [])
        }

    @classmethod
    def verify_otp_and_issue_session(
        cls,
        raw_token: str,
        raw_otp: str,
        client_ip: str,
        user_agent: str
    ) -> Dict[str, Any]:
        """
        Validates OTP against salted hash. If successful, issues a scoped Doctor View JWT.
        """
        token_hash = hash_token(raw_token)
        permission = SharingPermission.query.filter_by(token_hash=token_hash).first()

        if not permission or not permission.is_active:
            return {'success': False, 'error': 'Sharing session is invalid, expired, or revoked.'}

        computed_hash = hash_otp_with_salt(raw_otp.strip(), permission.otp_salt)
        if computed_hash != permission.otp_hash:
            permission.failed_otp_attempts += 1
            db.session.commit()
            cls._log_event(permission.id, client_ip, user_agent, 'otp_attempt_failed', 'denied')
            
            remaining = max(0, permission.max_otp_attempts - permission.failed_otp_attempts)
            if remaining == 0:
                return {'success': False, 'error': 'Too many failed attempts. This sharing link has been locked.'}
            return {'success': False, 'error': f'Incorrect OTP. {remaining} attempt(s) remaining.'}

        # Reset failed attempts on success
        permission.failed_otp_attempts = 0
        db.session.commit()
        cls._log_event(permission.id, client_ip, user_agent, 'otp_attempt_success', 'allowed')

        # Remaining seconds until share expiration
        time_left = max(60, int((permission.expires_at - datetime.utcnow()).total_seconds()))
        # Issue scoped doctor token valid for either 30 mins or share expiry (whichever is smaller)
        token_lifetime = min(1800, time_left)

        doctor_jwt = create_jwt_token({
            'type': 'doctor_shared_access',
            'permission_id': permission.id,
            'patient_user_id': permission.user_id,
            'allowed_record_ids': permission.allowed_record_ids,
            'allow_download': permission.allow_download,
            'include_ai_summary': permission.include_ai_summary
        }, expires_in_seconds=token_lifetime)

        return {
            'success': True,
            'doctor_token': doctor_jwt,
            'expires_in_seconds': token_lifetime,
            'expires_at': permission.expires_at.isoformat(),
            'allow_download': permission.allow_download,
            'include_ai_summary': permission.include_ai_summary
        }

    @classmethod
    def revoke_permission(cls, permission_id: str, user_id: str) -> bool:
        """Immediately revokes an active sharing permission."""
        permission = SharingPermission.query.filter_by(id=permission_id, user_id=user_id).first()
        if not permission:
            return False
        
        permission.is_revoked = True
        permission.revoked_at = datetime.utcnow()
        db.session.commit()
        return True

    @classmethod
    def _log_event(cls, permission_id: str, client_ip: str, user_agent: str, event_type: str, status: str, record_id: str = None):
        try:
            event = SharingAccessEvent(
                sharing_permission_id=permission_id,
                client_ip=client_ip,
                user_agent=user_agent[:250] if user_agent else '',
                event_type=event_type,
                accessed_record_id=record_id,
                status=status
            )
            db.session.add(event)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Failed to record access event: {str(e)}")

sharing_service = SharingService()
