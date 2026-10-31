from datetime import datetime
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models.medicine_reminder import MedicineReminder
from app.models.dose_log import DoseLog
from app.middleware.auth_middleware import require_auth, log_audit_trail
from app.services.reminder_service import reminder_service

reminders_bp = Blueprint('reminders', __name__, url_prefix='/api/reminders')

@reminders_bp.route('', methods=['GET'])
@require_auth()
def list_reminders():
    user = g.current_user
    status = request.args.get('status')
    query = MedicineReminder.query.filter_by(user_id=user.id)
    if status and status != 'all':
        query = query.filter_by(status=status)
    
    reminders = query.order_by(MedicineReminder.created_at.desc()).all()
    return jsonify({
        'reminders': [r.to_dict() for r in reminders]
    }), 200

@reminders_bp.route('/today', methods=['GET'])
@require_auth()
def get_today_doses():
    doses = reminder_service.get_today_doses_for_user(g.current_user.id)
    return jsonify({'doses': doses}), 200

@reminders_bp.route('', methods=['POST'])
@require_auth()
def create_reminder():
    user = g.current_user
    data = request.get_json() or {}

    name = data.get('medicine_name', '').strip()
    dosage = data.get('dosage', '').strip()
    frequency = data.get('frequency', 'daily')
    scheduled_times = data.get('scheduled_times', [])
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    meal_instruction = data.get('meal_instruction', 'anytime')
    notes = data.get('notes', '').strip()

    if not name or not dosage or not scheduled_times or not start_date_str:
        return jsonify({'error': 'Medicine name, dosage, scheduled times, and start date are required.'}), 400

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid start_date format (YYYY-MM-DD).' }), 400

    end_date = None
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid end_date format (YYYY-MM-DD).' }), 400

    reminder = MedicineReminder(
        user_id=user.id,
        medicine_name=name,
        dosage=dosage,
        frequency=frequency,
        scheduled_times=scheduled_times,
        start_date=start_date,
        end_date=end_date,
        meal_instruction=meal_instruction,
        notes=notes,
        status='active'
    )
    db.session.add(reminder)
    db.session.commit()

    log_audit_trail('CREATE_REMINDER', 'MedicineReminder', reminder.id, {'name': name})
    return jsonify({
        'message': 'Medicine reminder scheduled successfully.',
        'reminder': reminder.to_dict()
    }), 201

@reminders_bp.route('/<reminder_id>', methods=['PUT'])
@require_auth()
def update_reminder(reminder_id):
    reminder = MedicineReminder.query.filter_by(id=reminder_id, user_id=g.current_user.id).first()
    if not reminder:
        return jsonify({'error': 'Reminder not found.'}), 404

    data = request.get_json() or {}
    if 'medicine_name' in data:
        reminder.medicine_name = data['medicine_name'].strip()
    if 'dosage' in data:
        reminder.dosage = data['dosage'].strip()
    if 'frequency' in data:
        reminder.frequency = data['frequency']
    if 'scheduled_times' in data:
        reminder.scheduled_times = data['scheduled_times']
    if 'meal_instruction' in data:
        reminder.meal_instruction = data['meal_instruction']
    if 'notes' in data:
        reminder.notes = data['notes']
    if 'status' in data:
        reminder.status = data['status']
    if 'start_date' in data and data['start_date']:
        try:
            reminder.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid start_date format.'}), 400
    if 'end_date' in data:
        if data['end_date']:
            try:
                reminder.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid end_date format.'}), 400
        else:
            reminder.end_date = None

    db.session.commit()
    log_audit_trail('UPDATE_REMINDER', 'MedicineReminder', reminder.id)
    return jsonify({'message': 'Reminder updated.', 'reminder': reminder.to_dict()}), 200

@reminders_bp.route('/<reminder_id>/status', methods=['PATCH'])
@require_auth()
def toggle_status(reminder_id):
    reminder = MedicineReminder.query.filter_by(id=reminder_id, user_id=g.current_user.id).first()
    if not reminder:
        return jsonify({'error': 'Reminder not found.'}), 404

    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in ('active', 'paused', 'completed'):
        return jsonify({'error': 'Invalid status. Expected active, paused, or completed.'}), 400

    reminder.status = new_status
    db.session.commit()
    log_audit_trail('REMINDER_STATUS_CHANGE', 'MedicineReminder', reminder.id, {'status': new_status})
    return jsonify({'message': f'Reminder status set to {new_status}.', 'reminder': reminder.to_dict()}), 200

@reminders_bp.route('/<reminder_id>', methods=['DELETE'])
@require_auth()
def delete_reminder(reminder_id):
    reminder = MedicineReminder.query.filter_by(id=reminder_id, user_id=g.current_user.id).first()
    if not reminder:
        return jsonify({'error': 'Reminder not found.'}), 404

    db.session.delete(reminder)
    db.session.commit()
    log_audit_trail('DELETE_REMINDER', 'MedicineReminder', reminder_id)
    return jsonify({'message': 'Reminder deleted successfully.'}), 200

@reminders_bp.route('/<reminder_id>/doses', methods=['POST'])
@require_auth()
def log_dose(reminder_id):
    reminder = MedicineReminder.query.filter_by(id=reminder_id, user_id=g.current_user.id).first()
    if not reminder:
        return jsonify({'error': 'Reminder not found.'}), 404

    data = request.get_json() or {}
    status = data.get('status')  # 'taken' or 'skipped'
    scheduled_datetime_str = data.get('scheduled_datetime')
    note = data.get('note', '')

    if status not in ('taken', 'skipped'):
        return jsonify({'error': "Status must be 'taken' or 'skipped'."}), 400

    if not scheduled_datetime_str:
        return jsonify({'error': 'scheduled_datetime is required.'}), 400

    try:
        # Support ISO formats like 2026-10-23T08:00:00
        clean_str = scheduled_datetime_str.replace('Z', '')
        if 'T' in clean_str:
            dt = datetime.fromisoformat(clean_str)
        else:
            dt = datetime.strptime(clean_str, '%Y-%m-%d %H:%M:%S')
    except ValueError:
        return jsonify({'error': 'Invalid datetime format for scheduled_datetime.'}), 400

    dose_log = reminder_service.record_dose_status(reminder.id, g.current_user.id, dt, status, note)
    return jsonify({'message': f'Dose recorded as {status}.', 'dose_log': dose_log.to_dict()}), 200

@reminders_bp.route('/history', methods=['GET'])
@require_auth()
def get_dose_history():
    logs = DoseLog.query.filter_by(user_id=g.current_user.id).order_by(DoseLog.scheduled_for.desc()).limit(100).all()
    return jsonify({'history': [log.to_dict() for log in logs]}), 200
