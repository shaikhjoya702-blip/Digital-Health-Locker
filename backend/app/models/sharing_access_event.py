import uuid
from datetime import datetime
from app.extensions import db

class SharingAccessEvent(db.Model):
    __tablename__ = 'sharing_access_events'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sharing_permission_id = db.Column(db.String(36), db.ForeignKey('sharing_permissions.id', ondelete='CASCADE'), nullable=False, index=True)
    client_ip = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.String(255), nullable=True)
    event_type = db.Column(
        db.Enum('qr_scan', 'otp_attempt_success', 'otp_attempt_failed', 'view_record', 'download_record', name='share_event_types'),
        nullable=False,
        index=True
    )
    accessed_record_id = db.Column(db.String(36), nullable=True)
    status = db.Column(
        db.Enum('allowed', 'denied', 'expired', 'revoked', name='share_event_statuses'),
        nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'sharing_permission_id': self.sharing_permission_id,
            'client_ip': self.client_ip,
            'user_agent': self.user_agent,
            'event_type': self.event_type,
            'accessed_record_id': self.accessed_record_id,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
