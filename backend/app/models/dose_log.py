import uuid
from datetime import datetime
from app.extensions import db

class DoseLog(db.Model):
    __tablename__ = 'dose_logs'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reminder_id = db.Column(db.String(36), db.ForeignKey('medicine_reminders.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    scheduled_for = db.Column(db.DateTime, nullable=False, index=True)
    taken_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(
        db.Enum('taken', 'skipped', 'missed', name='dose_statuses'),
        nullable=False
    )
    note = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'reminder_id': self.reminder_id,
            'user_id': self.user_id,
            'scheduled_for': self.scheduled_for.isoformat() if self.scheduled_for else None,
            'taken_at': self.taken_at.isoformat() if self.taken_at else None,
            'status': self.status,
            'note': self.note,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
