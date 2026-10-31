import uuid
from datetime import datetime
from app.extensions import db

class MedicineReminder(db.Model):
    __tablename__ = 'medicine_reminders'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    medicine_name = db.Column(db.String(255), nullable=False)
    dosage = db.Column(db.String(100), nullable=False)
    frequency = db.Column(
        db.Enum('daily', 'twice_daily', 'thrice_daily', 'weekly', 'as_needed', 'custom', name='reminder_frequencies'),
        default='daily',
        nullable=False
    )
    scheduled_times = db.Column(db.JSON, nullable=False)  # e.g., ["08:00", "20:00"]
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    meal_instruction = db.Column(
        db.Enum('before_meal', 'after_meal', 'with_meal', 'anytime', name='meal_instructions'),
        default='anytime',
        nullable=False
    )
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(
        db.Enum('active', 'paused', 'completed', name='reminder_statuses'),
        default='active',
        nullable=False,
        index=True
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    dose_logs = db.relationship('DoseLog', backref='reminder', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'medicine_name': self.medicine_name,
            'dosage': self.dosage,
            'frequency': self.frequency,
            'scheduled_times': self.scheduled_times,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'meal_instruction': self.meal_instruction,
            'notes': self.notes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
