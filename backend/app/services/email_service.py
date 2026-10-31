import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """
    Handles transactional email delivery for email verification, password reset,
    and support queries. Designated address: xoya0102@gmail.com
    """

    @staticmethod
    def is_configured() -> bool:
        """Checks if live SMTP sending credentials have been provided in environment."""
        cfg = current_app.config
        username = cfg.get('MAIL_USERNAME')
        password = cfg.get('MAIL_PASSWORD')
        # Requires an actual password, not an empty string or placeholder
        return bool(username and password and password != 'your-gmail-app-password')

    @classmethod
    def send_email(cls, to_email: str, subject: str, html_content: str, text_content: str = None) -> dict:
        """
        Sends an email via SMTP or logs delivery in development if credentials are absent.
        Returns a dict indicating actual delivery status.
        """
        cfg = current_app.config
        sender = cfg.get('MAIL_DEFAULT_SENDER', 'xoya0102@gmail.com')

        if not cls.is_configured():
            # Honest reporting: Email service is NOT configured
            logger.warning(
                f"[EMAIL NOTICE] SMTP not configured. Notification intended for: {to_email}. "
                f"Subject: '{subject}'"
            )
            return {
                'sent': False,
                'configured': False,
                'message': 'Email credentials not configured in backend environment (.env). In development mode, check server logs or direct links.',
                'dev_preview': text_content or html_content
            }

        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"Digital Health Locker <{sender}>"
            msg['To'] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, 'plain'))
            msg.attach(MIMEText(html_content, 'html'))

            server = smtplib.SMTP(cfg['MAIL_SERVER'], cfg['MAIL_PORT'])
            if cfg.get('MAIL_USE_TLS', True):
                server.starttls()
            server.login(cfg['MAIL_USERNAME'], cfg['MAIL_PASSWORD'])
            server.sendmail(sender, [to_email], msg.as_string())
            server.quit()

            logger.info(f"Email successfully delivered to {to_email}")
            return {'sent': True, 'configured': True, 'message': 'Email delivered successfully.'}
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return {'sent': False, 'configured': True, 'error': str(e), 'message': f'SMTP dispatch error: {str(e)}'}

    @classmethod
    def send_verification_email(cls, to_email: str, token: str, code: str) -> dict:
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        verify_url = f"{frontend_url}/verify-email?token={token}"
        
        subject = "Verify Your Digital Health Locker Account"
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0D9488; margin: 0; font-size: 24px;">Digital Health Locker</h1>
                <p style="color: #64748B; margin-top: 4px;">AI-Powered Portable EHR Management System</p>
            </div>
            <p>Welcome! Thank you for registering. Please verify your email to activate your account and start managing your health records.</p>
            <div style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; padding: 16px; text-align: center; border-radius: 6px; margin: 24px 0;">
                <p style="margin: 0; color: #475569; font-size: 14px;">Your 6-Digit Verification Code:</p>
                <h2 style="margin: 8px 0; font-size: 32px; letter-spacing: 6px; color: #0F172A;">{code}</h2>
                <p style="margin: 0; color: #94A3B8; font-size: 12px;">Valid for 24 hours.</p>
            </div>
            <div style="text-align: center; margin: 24px 0;">
                <a href="{verify_url}" style="background-color: #0D9488; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Verify Account Online</a>
            </div>
            <p style="font-size: 12px; color: #94A3B8; margin-top: 32px; border-top: 1px solid #F1F5F9; padding-top: 16px;">
                If you did not register for Digital Health Locker, please disregard this email or contact support at <a href="mailto:xoya0102@gmail.com">xoya0102@gmail.com</a>.
            </p>
        </div>
        """
        text = f"Your verification code is: {code}\nOr verify using this link: {verify_url}"
        return cls.send_email(to_email, subject, html, text)

    @classmethod
    def send_password_reset_email(cls, to_email: str, token: str) -> dict:
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173')
        reset_url = f"{frontend_url}/reset-password?token={token}"

        subject = "Reset Your Digital Health Locker Password"
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0D9488; margin: 0; font-size: 24px;">Digital Health Locker</h1>
                <p style="color: #64748B; margin-top: 4px;">Password Recovery Request</p>
            </div>
            <p>We received a request to reset your password. Click the button below to set a new password. This single-use link is valid for 15 minutes.</p>
            <div style="text-align: center; margin: 24px 0;">
                <a href="{reset_url}" style="background-color: #0D9488; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 13px; color: #64748B;">If the button does not work, copy and paste this URL into your browser:</p>
            <p style="font-size: 12px; word-break: break-all; color: #0284C7;">{reset_url}</p>
            <p style="font-size: 12px; color: #94A3B8; margin-top: 32px; border-top: 1px solid #F1F5F9; padding-top: 16px;">
                If you did not request a password reset, please contact us immediately at <a href="mailto:xoya0102@gmail.com">xoya0102@gmail.com</a>.
            </p>
        </div>
        """
        text = f"Reset your password at: {reset_url}\nThis link expires in 15 minutes."
        return cls.send_email(to_email, subject, html, text)

    @classmethod
    def send_support_notification(cls, ticket_number: str, contact_email: str, subject: str, description: str, category: str) -> dict:
        support_dest = current_app.config.get('SUPPORT_EMAIL', 'xoya0102@gmail.com')
        subj = f"[New Support Ticket #{ticket_number}] {subject}"
        html = f"""
        <div style="font-family: sans-serif; padding: 20px;">
            <h2>New Support Ticket: #{ticket_number}</h2>
            <p><strong>Category:</strong> {category}</p>
            <p><strong>From:</strong> {contact_email}</p>
            <p><strong>Subject:</strong> {subject}</p>
            <hr />
            <p><strong>Description:</strong></p>
            <blockquote style="background: #f8fafc; padding: 12px; border-left: 4px solid #0d9488;">
                {description}
            </blockquote>
        </div>
        """
        return cls.send_email(support_dest, subj, html, description)
