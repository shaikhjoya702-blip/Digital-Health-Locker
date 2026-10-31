import hashlib
import secrets
import jwt
from datetime import datetime, timedelta
from flask import current_app

def generate_random_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token URL-safe string."""
    return secrets.token_urlsafe(length)

def generate_numeric_otp(digits: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP."""
    range_start = 10**(digits - 1)
    range_end = (10**digits) - 1
    return str(secrets.randbelow(range_end - range_start + 1) + range_start)

def hash_token(token: str) -> str:
    """Compute SHA-256 hash of a string token for secure storage."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def hash_otp_with_salt(otp: str, salt: str) -> str:
    """Compute SHA-256 hash of an OTP combined with a random salt."""
    salted = f"{salt}:{otp}"
    return hashlib.sha256(salted.encode('utf-8')).hexdigest()

def create_jwt_token(payload: dict, expires_in_seconds: int = 28800) -> str:
    """Create a signed JWT token with expiry."""
    data = payload.copy()
    now = datetime.utcnow()
    data['iat'] = now
    data['exp'] = now + timedelta(seconds=expires_in_seconds)
    secret = current_app.config['JWT_SECRET_KEY']
    return jwt.encode(data, secret, algorithm='HS256')

def decode_jwt_token(token: str) -> dict:
    """Decode and verify a signed JWT token."""
    secret = current_app.config['JWT_SECRET_KEY']
    return jwt.decode(token, secret, algorithms=['HS256'])
