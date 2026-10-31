import secrets
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.utils.validators import validate_email, validate_password_strength
from app.utils.security import (
    generate_random_token,
    generate_numeric_otp,
    hash_token,
    create_jwt_token
)
from app.middleware.auth_middleware import require_auth, log_audit_trail
from app.middleware.rate_limiter import rate_limit
from app.services.email_service import EmailService

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=60)
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()

    if not validate_email(email):
        return jsonify({'error': 'Please provide a valid email address.'}), 400

    is_valid_pw, pw_err = validate_password_strength(password)
    if not is_valid_pw:
        return jsonify({'error': pw_err}), 400

    if not full_name:
        return jsonify({'error': 'Full name is required.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email address already exists.'}), 409

    # Generate verification token and 6-digit code
    raw_token = generate_random_token(32)
    raw_code = generate_numeric_otp(6)
    token_hash = hash_token(f"{raw_token}:{raw_code}")

    user = User(
        email=email,
        role='patient',
        is_verified=False,
        verification_token_hash=token_hash,
        verification_expires_at=datetime.utcnow() + timedelta(hours=24)
    )
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    profile = PatientProfile(
        user_id=user.id,
        full_name=full_name
    )
    db.session.add(profile)
    db.session.commit()

    # Dispatch verification email
    email_res = EmailService.send_verification_email(email, raw_token, raw_code)

    log_audit_trail('REGISTER', 'User', user.id, {'email': email}, user_id=user.id)

    response_data = {
        'message': 'Registration successful. Please verify your email.',
        'user_id': user.id,
        'email': email,
        'email_status': email_res
    }
    # In dev mode if SMTP is not configured, provide direct verification info for testing
    if not email_res.get('configured'):
        response_data['dev_verification_code'] = raw_code
        response_data['dev_verification_token'] = raw_token

    return jsonify(response_data), 201

@auth_bp.route('/verify-email', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=60)
def verify_email():
    data = request.get_json() or {}
    token = data.get('token', '').strip()
    code = data.get('code', '').strip()
    email = data.get('email', '').strip().lower()

    if not (token or (email and code)):
        return jsonify({'error': 'Verification token or email and 6-digit code is required.'}), 400

    user = None
    if email:
        user = User.query.filter_by(email=email).first()
    elif token:
        # Match user by scanning unverified users
        for u in User.query.filter_by(is_verified=False).all():
            if u.verification_token_hash:
                # Test with token
                if u.verification_token_hash.startswith(hash_token(token)[:16]):
                    user = u
                    break

    if not user:
        return jsonify({'error': 'Invalid verification credentials or user not found.'}), 400

    if user.is_verified:
        return jsonify({'message': 'Account is already verified. You may log in.'}), 200

    if user.verification_expires_at and datetime.utcnow() > user.verification_expires_at:
        return jsonify({'error': 'Verification token has expired. Please request a new one.'}), 400

    # Mark verified and clear tokens
    user.is_verified = True
    user.verification_token_hash = None
    user.verification_expires_at = None
    db.session.commit()

    log_audit_trail('VERIFY_EMAIL', 'User', user.id, {'email': user.email}, user_id=user.id)

    # Issue authenticated session token
    jwt_token = create_jwt_token({'user_id': user.id, 'email': user.email, 'type': 'user'})
    return jsonify({
        'message': 'Email successfully verified!',
        'token': jwt_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/login', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=60)
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Invalid email or password.'}), 401

    # Check lock out
    if user.locked_until and datetime.utcnow() < user.locked_until:
        return jsonify({'error': f'Account locked due to consecutive failed attempts. Try again after {user.locked_until.strftime("%H:%M:%S UTC")}.'}), 403

    if not user.check_password(password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
            db.session.commit()
            return jsonify({'error': 'Too many failed login attempts. Account temporarily locked for 15 minutes.'}), 403
        db.session.commit()
        return jsonify({'error': 'Invalid email or password.'}), 401

    # Check if email is verified
    if not user.is_verified:
        return jsonify({
            'error': 'Please verify your email address before logging in.',
            'unverified': True,
            'email': user.email
        }), 403

    # Reset failed attempts
    user.failed_login_attempts = 0
    user.locked_until = None
    db.session.commit()

    jwt_token = create_jwt_token({'user_id': user.id, 'email': user.email, 'type': 'user'})
    log_audit_trail('LOGIN_SUCCESS', 'User', user.id, {'email': user.email}, user_id=user.id)

    return jsonify({
        'message': 'Login successful.',
        'token': jwt_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
@rate_limit(max_requests=3, window_seconds=60)
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()

    if not validate_email(email):
        return jsonify({'error': 'Please enter a valid email address.'}), 400

    user = User.query.filter_by(email=email).first()
    # To prevent user enumeration, always return standard success message
    if not user:
        return jsonify({'message': 'If this email is registered, a password reset link has been dispatched.'}), 200

    raw_token = generate_random_token(32)
    user.reset_token_hash = hash_token(raw_token)
    user.reset_expires_at = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()

    email_res = EmailService.send_password_reset_email(email, raw_token)
    log_audit_trail('PASSWORD_RESET_REQUESTED', 'User', user.id, {'email': email}, user_id=user.id)

    response = {
        'message': 'If this email is registered, a password reset link has been dispatched.',
        'email_status': email_res
    }
    if not email_res.get('configured'):
        response['dev_reset_token'] = raw_token

    return jsonify(response), 200

@auth_bp.route('/reset-password', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=60)
def reset_password():
    data = request.get_json() or {}
    token = data.get('token', '').strip()
    new_password = data.get('new_password', '')

    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required.'}), 400

    is_valid_pw, pw_err = validate_password_strength(new_password)
    if not is_valid_pw:
        return jsonify({'error': pw_err}), 400

    token_hash = hash_token(token)
    user = User.query.filter_by(reset_token_hash=token_hash).first()

    if not user or not user.reset_expires_at or datetime.utcnow() > user.reset_expires_at:
        return jsonify({'error': 'Invalid or expired password reset link. Please request a new one.'}), 400

    user.set_password(new_password)
    user.reset_token_hash = None
    user.reset_expires_at = None
    user.failed_login_attempts = 0
    user.locked_until = None
    db.session.commit()

    log_audit_trail('PASSWORD_RESET_SUCCESS', 'User', user.id, {'email': user.email}, user_id=user.id)
    return jsonify({'message': 'Password has been successfully updated. You may now log in.'}), 200

@auth_bp.route('/change-password', methods=['POST'])
@require_auth()
def change_password():
    data = request.get_json() or {}
    current_pw = data.get('current_password', '')
    new_pw = data.get('new_password', '')

    user = g.current_user
    if not user.check_password(current_pw):
        return jsonify({'error': 'Current password is incorrect.'}), 400

    is_valid_pw, pw_err = validate_password_strength(new_pw)
    if not is_valid_pw:
        return jsonify({'error': pw_err}), 400

    user.set_password(new_pw)
    db.session.commit()

    log_audit_trail('PASSWORD_CHANGED', 'User', user.id, {'email': user.email})
    return jsonify({'message': 'Password changed successfully.'}), 200

@auth_bp.route('/me', methods=['GET'])
@require_auth()
def get_current_user():
    return jsonify({'user': g.current_user.to_dict()}), 200

@auth_bp.route('/logout', methods=['POST'])
@require_auth()
def logout():
    log_audit_trail('LOGOUT', 'User', g.current_user.id)
    return jsonify({'message': 'Logged out successfully.'}), 200
