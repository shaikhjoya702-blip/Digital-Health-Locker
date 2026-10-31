import uuid
from datetime import datetime
from app.extensions import db

class SharingPermission(db.Model):
    __tablename__ = 'sharing_permissions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    otp_hash = db.Column(db.String(64), nullable=False)
    otp_salt = db.Column(db.String(32), nullable=False)
    allowed_record_ids = db.Column(db.JSON, nullable=False)  # List of record IDs: ["id1", "id2"]
    recipient_label = db.Column(db.String(255), nullable=True)  # e.g., "Dr. Smith - City Hospital"
    allow_download = db.Column(db.Boolean, default=False, nullable=False)
    include_ai_summary = db.Column(db.Boolean, default=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    is_revoked = db.Column(db.Boolean, default=False, nullable=False, index=True)
    revoked_at = db.Column(db.DateTime, nullable=True)
    failed_otp_attempts = db.Column(db.Integer, default=0, nullable=False)
    max_otp_attempts = db.Column(db.Integer, default=5, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    access_events = db.relationship('SharingAccessEvent', backref='permission', cascade='all, delete-orphan')

    @property
    def is_active(self) -> bool:
        if self.is_revoked:
            return False
        if datetime.utcnow() > self.expires_at:
            return False
        if self.failed_otp_attempts >= self.max_otp_attempts:
            return False
        return True

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'recipient_label': self.recipient_label,
            'allowed_record_ids': self.allowed_record_ids,
            'allow_download': self.allow_download,
            'include_ai_summary': self.include_ai_summary,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_revoked': self.is_revoked,
            'revoked_at': self.revoked_at.isoformat() if self.revoked_at else None,
            'is_active': self.is_active,
            'failed_otp_attempts': self.failed_otp_attempts,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
