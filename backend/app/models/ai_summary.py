import uuid
from datetime import datetime
from app.extensions import db

class AiSummary(db.Model):
    __tablename__ = 'ai_summaries'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id = db.Column(db.String(36), db.ForeignKey('medical_records.id', ondelete='CASCADE'), unique=True, nullable=False)
    model_name = db.Column(db.String(100), default='gemini-1.5-flash', nullable=False)
    summary_text = db.Column(db.Text, nullable=False)
    key_findings = db.Column(db.JSON, nullable=True)  # List of findings: [{"finding": "...", "status": "normal/abnormal"}]
    ai_perspective = db.Column(db.Text, nullable=True)  # AI clinical synthesis and health perspective
    questions_for_doctor = db.Column(db.JSON, nullable=True)  # List of recommended patient questions
    overall_status = db.Column(db.String(50), nullable=True)  # e.g., 'Normal / Stable', 'Requires Review'
    missing_or_unclear_info = db.Column(db.Text, nullable=True)
    disclaimer_acknowledged = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'record_id': self.record_id,
            'model_name': self.model_name,
            'summary_text': self.summary_text,
            'key_findings': self.key_findings,
            'ai_perspective': self.ai_perspective,
            'questions_for_doctor': self.questions_for_doctor,
            'overall_status': self.overall_status or 'Review Suggested',
            'missing_or_unclear_info': self.missing_or_unclear_info,
            'disclaimer_acknowledged': self.disclaimer_acknowledged,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
