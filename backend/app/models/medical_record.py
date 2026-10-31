import uuid
from datetime import datetime
from app.extensions import db

class MedicalRecord(db.Model):
    __tablename__ = 'medical_records'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(
        db.Enum('blood_test', 'prescription', 'radiology', 'discharge_summary', 'other', name='record_categories'),
        nullable=False,
        default='other',
        index=True
    )
    stored_filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    file_size_bytes = db.Column(db.BigInteger, nullable=False)
    sha256_checksum = db.Column(db.String(64), nullable=False)
    record_date = db.Column(db.Date, nullable=False, index=True)
    notes = db.Column(db.Text, nullable=True)
    is_deleted = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    extraction = db.relationship('DocumentExtraction', backref='record', uselist=False, cascade='all, delete-orphan')
    ai_summary = db.relationship('AiSummary', backref='record', uselist=False, cascade='all, delete-orphan')

    def to_dict(self, include_extraction=True, include_ai=True):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'category': self.category,
            'original_filename': self.original_filename,
            'mime_type': self.mime_type,
            'file_size_bytes': self.file_size_bytes,
            'record_date': self.record_date.isoformat() if self.record_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'has_extraction': self.extraction is not None,
            'extraction_status': self.extraction.processing_status if self.extraction else 'not_started',
            'has_ai_summary': self.ai_summary is not None
        }
        if include_extraction and self.extraction:
            data['extraction'] = self.extraction.to_dict()
        if include_ai and self.ai_summary:
            data['ai_summary'] = self.ai_summary.to_dict()
        return data
