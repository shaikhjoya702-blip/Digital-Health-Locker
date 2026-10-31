from datetime import datetime
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.middleware.auth_middleware import require_auth, log_audit_trail

profile_bp = Blueprint('profile', __name__, url_prefix='/api/profile')

@profile_bp.route('', methods=['GET'])
@require_auth()
def get_profile():
    profile = g.current_user.profile
    if not profile:
        return jsonify({'error': 'Profile not found.'}), 404
    return jsonify({'profile': profile.to_dict()}), 200

@profile_bp.route('', methods=['PUT'])
@require_auth()
def update_profile():
    data = request.get_json() or {}
    profile = g.current_user.profile
    if not profile:
        return jsonify({'error': 'Profile not found.'}), 404

    if 'full_name' in data and data['full_name'].strip():
        profile.full_name = data['full_name'].strip()
    
    if 'date_of_birth' in data:
        dob_str = data['date_of_birth']
        if dob_str:
            try:
                profile.date_of_birth = datetime.strptime(dob_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format. Expected YYYY-MM-DD.'}), 400
        else:
            profile.date_of_birth = None

    if 'gender' in data:
        profile.gender = data['gender']
    if 'blood_group' in data:
        profile.blood_group = data['blood_group']
    if 'phone_number' in data:
        profile.phone_number = data['phone_number']
    if 'emergency_contact_name' in data:
        profile.emergency_contact_name = data['emergency_contact_name']
    if 'emergency_contact_phone' in data:
        profile.emergency_contact_phone = data['emergency_contact_phone']
    if 'address' in data:
        profile.address = data['address']

    db.session.commit()
    log_audit_trail('PROFILE_UPDATED', 'PatientProfile', profile.id)

    return jsonify({
        'message': 'Profile updated successfully.',
        'profile': profile.to_dict()
    }), 200
