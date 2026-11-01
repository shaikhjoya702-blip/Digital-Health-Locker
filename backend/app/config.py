import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables (supports running from both repo root and backend dir)
_base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
_env_file = os.path.join(_base_dir, '.env')
if os.path.exists(_env_file):
    load_dotenv(_env_file)
else:
    load_dotenv()

class Config:
    """Base Application Configuration"""
    # Application & Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-dev-secret-key-32-chars-long')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-dev-jwt-secret-key-32-chars')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    
    # CORS
    CORS_ORIGINS = [orig.strip() for orig in os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')]

    # Database Configuration (Neon Tech Serverless PostgreSQL as Primary)
    _raw_db_url = os.getenv('DATABASE_URL', '').strip()
    
    # Allow individual Postgres variables if full DATABASE_URL is not provided
    if not _raw_db_url:
        pg_host = os.getenv('PGHOST', 'localhost')
        pg_port = os.getenv('PGPORT', '5432')
        pg_user = os.getenv('PGUSER', 'neondb_owner')
        pg_password = os.getenv('PGPASSWORD', '')
        pg_database = os.getenv('PGDATABASE', 'neondb')
        if pg_password:
            _raw_db_url = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
        else:
            _raw_db_url = f"postgresql://{pg_user}@{pg_host}:{pg_port}/{pg_database}"

    # Normalize driver scheme for SQLAlchemy compatibility (e.g. postgres:// -> postgresql://)
    if _raw_db_url.startswith('postgres://'):
        _raw_db_url = _raw_db_url.replace('postgres://', 'postgresql://', 1)

    # In SQLAlchemy 2.1+, postgresql:// defaults to psycopg (v3). Fall back to psycopg2 if psycopg 3 is unavailable
    if _raw_db_url.startswith('postgresql://') and not _raw_db_url.startswith('postgresql+'):
        try:
            import psycopg  # noqa: F401
        except ImportError:
            _raw_db_url = _raw_db_url.replace('postgresql://', 'postgresql+psycopg2://', 1)

    # Ensure Neon serverless connections enforce SSL
    if 'neon.tech' in _raw_db_url and 'sslmode=' not in _raw_db_url:
        delimiter = '&' if '?' in _raw_db_url else '?'
        _raw_db_url = f"{_raw_db_url}{delimiter}sslmode=require"

    SQLALCHEMY_DATABASE_URI = _raw_db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 280,
        'pool_pre_ping': True,
    }

    # Protected File Storage (ensures path resolves to backend/storage/records reliably)
    _raw_storage = os.getenv('STORAGE_DIR', 'storage/records').strip()
    if not os.path.isabs(_raw_storage):
        STORAGE_DIR = os.path.abspath(os.path.join(_base_dir, _raw_storage))
    else:
        STORAGE_DIR = _raw_storage
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 15 * 1024 * 1024))  # 15 MB
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

    # OCR Settings
    TESSERACT_CMD = os.getenv('TESSERACT_CMD', r'C:\Program Files\Tesseract-OCR\tesseract.exe')

    # AI Provider Settings (Gemini)
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    AI_MODEL_NAME = os.getenv('AI_MODEL_NAME', 'gemini-1.5-flash')

    # Email Settings
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() in ('true', '1', 't')
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', 'xoya0102@gmail.com')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'xoya0102@gmail.com')
    SUPPORT_EMAIL = os.getenv('SUPPORT_EMAIL', 'xoya0102@gmail.com')

    # Front-end URLs
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:5000')

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
