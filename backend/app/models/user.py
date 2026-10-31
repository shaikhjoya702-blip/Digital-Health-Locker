import uuid
from datetime import datetime
from app.extensions import db
from passlib.hash import bcrypt

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('patient', 'doctor', 'admin', name='user_roles'), nullable=False, default='patient')
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token_hash = db.Column(db.String(255), nullable=True)
    verification_expires_at = db.Column(db.DateTime, nullable=True)
    reset_token_hash = db.Column(db.String(255), nullable=True)
    reset_expires_at = db.Column(db.DateTime, nullable=True)
    failed_login_attempts = db.Column(db.Integer, default=0, nullable=False)
    locked_until = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    profile = db.relationship('PatientProfile', backref='user', uselist=False, cascade='all, delete-orphan')
    medical_records = db.relationship('MedicalRecord', backref='user', cascade='all, delete-orphan')
    reminders = db.relationship('MedicineReminder', backref='user', cascade='all, delete-orphan')
    sharing_permissions = db.relationship('SharingPermission', backref='user', cascade='all, delete-orphan')
    support_tickets = db.relationship('SupportTicket', backref='user')
    audit_logs = db.relationship('AuditLog', backref='user')

    def set_password(self, password: str):
        self.password_hash = bcrypt.using(rounds=12).hash(password)

    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return bcrypt.verify(password, self.password_hash)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'profile': self.profile.to_dict() if self.profile else None
        }
