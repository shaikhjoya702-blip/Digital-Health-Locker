import secrets
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models.support_ticket import SupportTicket, SupportResponse
from app.models.user import User
from app.middleware.auth_middleware import require_auth, log_audit_trail
from app.utils.validators import validate_email
from app.services.email_service import EmailService

support_bp = Blueprint('support', __name__, url_prefix='/api/support')

def generate_ticket_number() -> str:
    today_str = datetime.utcnow().strftime('%Y%m%d')
    rand_hex = secrets.token_hex(2).upper()
    return f"TKT-{today_str}-{rand_hex}"

@support_bp.route('/tickets', methods=['POST'])
def create_ticket():
    data = request.get_json() or {}
    subject = data.get('subject', '').strip()
    description = data.get('description', '').strip()
    category = data.get('category', 'general')
    contact_email = data.get('contact_email', '').strip().lower()

    # If user is authenticated, derive contact email from profile/user
    user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        from app.utils.security import decode_jwt_token
        try:
            payload = decode_jwt_token(auth_header.split(' ', 1)[1])
            user = User.query.get(payload.get('user_id'))
            if user:
                user_id = user.id
                if not contact_email:
                    contact_email = user.email
        except Exception:
            pass

    if not validate_email(contact_email):
        return jsonify({'error': 'A valid contact email is required.'}), 400

    if not subject or not description:
        return jsonify({'error': 'Subject and description are required.'}), 400

    allowed_cats = {'login_issues', 'password_recovery', 'report_upload', 'qr_sharing', 'medicine_reminders', 'general'}
    if category not in allowed_cats:
        category = 'general'

    ticket_num = generate_ticket_number()
    ticket = SupportTicket(
        ticket_number=ticket_num,
        user_id=user_id,
        contact_email=contact_email,
        category=category,
        subject=subject,
        description=description,
        status='open',
        priority='medium'
    )
    db.session.add(ticket)
    db.session.commit()

    # Send notification to designated official contact: xoya0102@gmail.com
    email_status = EmailService.send_support_notification(
        ticket_number=ticket_num,
        contact_email=contact_email,
        subject=subject,
        description=description,
        category=category
    )

    log_audit_trail('CREATE_SUPPORT_TICKET', 'SupportTicket', ticket.id, {'ticket_number': ticket_num}, user_id=user_id)

    return jsonify({
        'message': f'Support ticket #{ticket_num} created successfully.',
        'ticket': ticket.to_dict(include_responses=False),
        'email_status': email_status
    }), 201

@support_bp.route('/tickets', methods=['GET'])
@require_auth()
def list_user_tickets():
    tickets = SupportTicket.query.filter_by(user_id=g.current_user.id).order_by(SupportTicket.created_at.desc()).all()
    return jsonify({'tickets': [t.to_dict(include_responses=True) for t in tickets]}), 200

@support_bp.route('/tickets/<ticket_number>', methods=['GET'])
def get_ticket(ticket_number):
    ticket = SupportTicket.query.filter_by(ticket_number=ticket_number).first()
    if not ticket:
        return jsonify({'error': 'Ticket not found.'}), 404

    # Authorization check if user_id is assigned
    auth_header = request.headers.get('Authorization')
    if ticket.user_id:
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized to view this ticket.'}), 401
        from app.utils.security import decode_jwt_token
        try:
            payload = decode_jwt_token(auth_header.split(' ', 1)[1])
            if payload.get('user_id') != ticket.user_id:
                return jsonify({'error': 'Unauthorized access.'}), 403
        except Exception:
            return jsonify({'error': 'Invalid credentials.'}), 401

    return jsonify({'ticket': ticket.to_dict(include_responses=True)}), 200

@support_bp.route('/tickets/<ticket_number>/reply', methods=['POST'])
def reply_to_ticket(ticket_number):
    ticket = SupportTicket.query.filter_by(ticket_number=ticket_number).first()
    if not ticket:
        return jsonify({'error': 'Ticket not found.'}), 404

    data = request.get_json() or {}
    message = data.get('message', '').strip()
    responder_email = data.get('responder_email', '').strip().lower()

    if not message:
        return jsonify({'error': 'Message cannot be empty.'}), 400

    if not responder_email:
        responder_email = ticket.contact_email

    response = SupportResponse(
        ticket_id=ticket.id,
        responder_email=responder_email,
        message=message,
        is_staff=False
    )
    # Reopen ticket if resolved
    if ticket.status == 'resolved':
        ticket.status = 'open'

    db.session.add(response)
    db.session.commit()

    return jsonify({'message': 'Reply submitted.', 'response': response.to_dict()}), 201
