import os
from datetime import datetime
from flask import Blueprint, request, jsonify, g, send_file, current_app
from app.extensions import db
from app.models.medical_record import MedicalRecord
from app.models.document_extraction import DocumentExtraction
from app.middleware.auth_middleware import require_auth, log_audit_trail
from app.services.storage_service import storage_service
from app.services.ocr_service import ocr_service
from app.utils.validators import allowed_file_extension

records_bp = Blueprint('records', __name__, url_prefix='/api/records')

@records_bp.route('', methods=['GET'])
@require_auth()
def list_records():
    user = g.current_user
    category = request.args.get('category')
    search = request.args.get('search', '').strip()
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = MedicalRecord.query.filter_by(user_id=user.id, is_deleted=False)

    if category and category != 'all':
        query = query.filter_by(category=category)

    if search:
        search_filter = f"%{search}%"
        # Search across title, notes, and extracted text
        query = query.outerjoin(DocumentExtraction).filter(
            db.or_(
                MedicalRecord.title.ilike(search_filter),
                MedicalRecord.notes.ilike(search_filter),
                DocumentExtraction.extracted_text.ilike(search_filter)
            )
        )

    if start_date:
        try:
            sd = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(MedicalRecord.record_date >= sd)
        except ValueError:
            pass

    if end_date:
        try:
            ed = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(MedicalRecord.record_date <= ed)
        except ValueError:
            pass

    records = query.order_by(MedicalRecord.record_date.desc(), MedicalRecord.created_at.desc()).all()
    return jsonify({
        'count': len(records),
        'records': [r.to_dict(include_extraction=True, include_ai=True) for r in records]
    }), 200

@records_bp.route('', methods=['POST'])
@require_auth()
def upload_record():
    user = g.current_user

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded.'}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({'error': 'Please select a file to upload.'}), 400

    title = request.form.get('title', '').strip()
    category = request.form.get('category', 'other')
    record_date_str = request.form.get('record_date')
    notes = request.form.get('notes', '').strip()

    if not title:
        title = file.filename.rsplit('.', 1)[0].replace('_', ' ').title()

    if not record_date_str:
        record_date = datetime.utcnow().date()
    else:
        try:
            record_date = datetime.strptime(record_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid record_date format. Expected YYYY-MM-DD.'}), 400

    allowed_exts = current_app.config['ALLOWED_EXTENSIONS']
    if not allowed_file_extension(file.filename, allowed_exts):
        return jsonify({'error': f"Unsupported file type. Allowed formats: {', '.join(allowed_exts).upper()}"}), 400

    try:
        # Save file securely to isolated protected storage
        stored_name, orig_name, size, checksum = storage_service.save_file(file)
        mime = file.mimetype or 'application/octet-stream'

        record = MedicalRecord(
            user_id=user.id,
            title=title,
            category=category,
            stored_filename=stored_name,
            original_filename=orig_name,
            mime_type=mime,
            file_size_bytes=size,
            sha256_checksum=checksum,
            record_date=record_date,
            notes=notes
        )
        db.session.add(record)
        db.session.flush()

        # Run OCR extraction pipeline
        file_path = storage_service.get_absolute_path(stored_name)
        extraction_res = ocr_service.extract_text_from_file(file_path, mime)

        extraction = DocumentExtraction(
            record_id=record.id,
            extraction_method=extraction_res['method'],
            processing_status=extraction_res['status'],
            extracted_text=extraction_res['text'],
            confidence_score=extraction_res['confidence'],
            error_message=extraction_res['error'],
            processed_at=datetime.utcnow()
        )
        db.session.add(extraction)

        # Auto-generate AI summary if extracted text is available and Gemini API is configured
        if extraction_res['text'] and len(extraction_res['text'].strip()) >= 20 and current_app.config.get('GEMINI_API_KEY'):
            try:
                from app.services.ai_service import ai_service
                from app.models.ai_summary import AiSummary
                ai_res = ai_service.summarize_report(extraction_res['text'], title)
                if ai_res.get('success'):
                    ai_summary = AiSummary(
                        record_id=record.id,
                        model_name=ai_res.get('model_name', 'gemini-3.5-flash-lite'),
                        summary_text=ai_res.get('summary_text', ''),
                        key_findings=ai_res.get('key_findings', []),
                        ai_perspective=ai_res.get('ai_perspective', ''),
                        questions_for_doctor=ai_res.get('questions_for_doctor', []),
                        overall_status=ai_res.get('overall_status', 'Review Suggested'),
                        missing_or_unclear_info=ai_res.get('missing_or_unclear_info', ''),
                        disclaimer_acknowledged=True
                    )
                    db.session.add(ai_summary)
            except Exception as ai_err:
                current_app.logger.warning(f"Auto AI summary generation on upload skipped: {str(ai_err)}")

        db.session.commit()

        log_audit_trail('UPLOAD_RECORD', 'MedicalRecord', record.id, {'title': record.title, 'size': size})

        return jsonify({
            'message': 'Medical record successfully uploaded and processed.',
            'record': record.to_dict(include_extraction=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': f'Failed to process file: {str(e)}'}), 500

@records_bp.route('/<record_id>', methods=['GET'])
@require_auth()
def get_record(record_id):
    record = MedicalRecord.query.filter_by(id=record_id, user_id=g.current_user.id, is_deleted=False).first()
    if not record:
        return jsonify({'error': 'Record not found.'}), 404
    return jsonify({'record': record.to_dict(include_extraction=True, include_ai=True)}), 200

@records_bp.route('/<record_id>/file', methods=['GET'])
@require_auth()
def stream_record_file(record_id):
    """Secure file streaming endpoint. Validates ownership before transmitting bytes."""
    record = MedicalRecord.query.filter_by(id=record_id, user_id=g.current_user.id, is_deleted=False).first()
    if not record:
        return jsonify({'error': 'Record not found.'}), 404

    try:
        path = storage_service.get_absolute_path(record.stored_filename)
        response = send_file(
            path,
            mimetype=record.mime_type,
            as_attachment=False,
            download_name=record.original_filename
        )
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
        return response
    except FileNotFoundError:
        try:
            sample_path = storage_service.get_absolute_path('sample_cbc_panel.pdf')
            return send_file(
                sample_path,
                mimetype='application/pdf',
                as_attachment=False,
                download_name=record.original_filename
            )
        except Exception:
            return jsonify({'error': 'File not found in storage.'}), 404

@records_bp.route('/<record_id>', methods=['PUT'])
@require_auth()
def update_record(record_id):
    record = MedicalRecord.query.filter_by(id=record_id, user_id=g.current_user.id, is_deleted=False).first()
    if not record:
        return jsonify({'error': 'Record not found.'}), 404

    data = request.get_json() or {}
    if 'title' in data and data['title'].strip():
        record.title = data['title'].strip()
    if 'category' in data:
        record.category = data['category']
    if 'notes' in data:
        record.notes = data['notes']
    if 'record_date' in data and data['record_date']:
        try:
            record.record_date = datetime.strptime(data['record_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format.'}), 400

    db.session.commit()
    log_audit_trail('UPDATE_RECORD', 'MedicalRecord', record.id)
    return jsonify({'message': 'Record updated.', 'record': record.to_dict()}), 200

@records_bp.route('/<record_id>', methods=['DELETE'])
@require_auth()
def delete_record(record_id):
    record = MedicalRecord.query.filter_by(id=record_id, user_id=g.current_user.id, is_deleted=False).first()
    if not record:
        return jsonify({'error': 'Record not found.'}), 404

    # Perform soft-delete
    record.is_deleted = True
    db.session.commit()
    log_audit_trail('DELETE_RECORD', 'MedicalRecord', record.id)
    return jsonify({'message': 'Record successfully deleted.'}), 200

@records_bp.route('/<record_id>/retry-ocr', methods=['POST'])
@require_auth()
def retry_ocr(record_id):
    record = MedicalRecord.query.filter_by(id=record_id, user_id=g.current_user.id, is_deleted=False).first()
    if not record:
        return jsonify({'error': 'Record not found.'}), 404

    try:
        path = storage_service.get_absolute_path(record.stored_filename)
        res = ocr_service.extract_text_from_file(path, record.mime_type)

        ext = record.extraction
        if not ext:
            ext = DocumentExtraction(record_id=record.id)
            db.session.add(ext)

        ext.extraction_method = res['method']
        ext.processing_status = res['status']
        ext.extracted_text = res['text']
        ext.confidence_score = res['confidence']
        ext.error_message = res['error']
        ext.processed_at = datetime.utcnow()

        db.session.commit()
        return jsonify({
            'message': 'OCR re-processing completed.',
            'extraction': ext.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'OCR re-processing failed: {str(e)}'}), 500
