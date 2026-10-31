import uuid
from datetime import datetime
from app.extensions import db

class DocumentExtraction(db.Model):
    __tablename__ = 'document_extractions'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id = db.Column(db.String(36), db.ForeignKey('medical_records.id', ondelete='CASCADE'), unique=True, nullable=False)
    extraction_method = db.Column(
        db.Enum('native_pdf', 'tesseract_ocr', 'gemini_vision', 'hybrid', 'manual', name='extraction_methods'),
        nullable=False
    )
    processing_status = db.Column(
        db.Enum('pending', 'processing', 'completed', 'failed', 'incomplete', name='extraction_statuses'),
        default='pending',
        nullable=False,
        index=True
    )
    extracted_text = db.Column(db.Text, nullable=True)  # Unbounded TEXT for extracted medical documentation
    confidence_score = db.Column(db.Numeric(5, 2), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    processed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'record_id': self.record_id,
            'extraction_method': self.extraction_method,
            'processing_status': self.processing_status,
            'extracted_text': self.extracted_text,
            'confidence_score': float(self.confidence_score) if self.confidence_score else None,
            'error_message': self.error_message,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None
        }
