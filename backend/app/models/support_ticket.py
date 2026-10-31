import uuid
from datetime import datetime
from app.extensions import db

class SupportTicket(db.Model):
    __tablename__ = 'support_tickets'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number = db.Column(db.String(30), unique=True, nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    contact_email = db.Column(db.String(255), nullable=False)
    category = db.Column(
        db.Enum('login_issues', 'password_recovery', 'report_upload', 'qr_sharing', 'medicine_reminders', 'general', name='ticket_categories'),
        default='general',
        nullable=False,
        index=True
    )
    subject = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(
        db.Enum('open', 'in_progress', 'resolved', 'closed', name='ticket_statuses'),
        default='open',
        nullable=False,
        index=True
    )
    priority = db.Column(
        db.Enum('low', 'medium', 'high', name='ticket_priorities'),
        default='medium',
        nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    responses = db.relationship('SupportResponse', backref='ticket', cascade='all, delete-orphan')

    def to_dict(self, include_responses=True):
        data = {
            'id': self.id,
            'ticket_number': self.ticket_number,
            'user_id': self.user_id,
            'contact_email': self.contact_email,
            'category': self.category,
            'subject': self.subject,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_responses:
            data['responses'] = [r.to_dict() for r in self.responses]
        return data

class SupportResponse(db.Model):
    __tablename__ = 'support_responses'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = db.Column(db.String(36), db.ForeignKey('support_tickets.id', ondelete='CASCADE'), nullable=False, index=True)
    responder_email = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_staff = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'responder_email': self.responder_email,
            'message': self.message,
            'is_staff': self.is_staff,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
