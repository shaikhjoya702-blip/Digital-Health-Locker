-- ==============================================================================
-- DIGITAL HEALTH LOCKER — MASTER POSTGRESQL / NEON TECH SCHEMA (3NF Normalized)
-- Database Engine: Neon Tech Serverless PostgreSQL
-- ==============================================================================

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_roles AS ENUM ('patient', 'doctor', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE patient_gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE record_categories AS ENUM ('blood_test', 'prescription', 'radiology', 'discharge_summary', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE extraction_methods AS ENUM ('native_pdf', 'tesseract_ocr', 'hybrid', 'manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE extraction_statuses AS ENUM ('pending', 'processing', 'completed', 'failed', 'incomplete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reminder_frequencies AS ENUM ('daily', 'twice_daily', 'thrice_daily', 'weekly', 'as_needed', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE meal_instructions AS ENUM ('before_meal', 'after_meal', 'with_meal', 'anytime');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reminder_statuses AS ENUM ('active', 'paused', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dose_statuses AS ENUM ('taken', 'skipped', 'missed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE share_event_types AS ENUM ('qr_scan', 'otp_attempt_success', 'otp_attempt_failed', 'view_record', 'download_record');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE share_event_statuses AS ENUM ('allowed', 'denied', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_categories AS ENUM ('login_issues', 'password_recovery', 'report_upload', 'qr_sharing', 'medicine_reminders', 'general');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_statuses AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priorities AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_roles NOT NULL DEFAULT 'patient',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token_hash VARCHAR(255) NULL,
    verification_expires_at TIMESTAMP NULL,
    reset_token_hash VARCHAR(255) NULL,
    reset_expires_at TIMESTAMP NULL,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_verified);

-- 3. PATIENT PROFILES TABLE
CREATE TABLE IF NOT EXISTS patient_profiles (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE NULL,
    gender patient_gender NOT NULL DEFAULT 'prefer_not_to_say',
    blood_group VARCHAR(10) NULL,
    phone_number VARCHAR(25) NULL,
    emergency_contact_name VARCHAR(100) NULL,
    emergency_contact_phone VARCHAR(25) NULL,
    address TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. MEDICAL RECORDS TABLE
CREATE TABLE IF NOT EXISTS medical_records (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category record_categories NOT NULL DEFAULT 'other',
    stored_filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_checksum CHAR(64) NOT NULL,
    record_date DATE NOT NULL,
    notes TEXT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_records_user_id ON medical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_category ON medical_records(category);
CREATE INDEX IF NOT EXISTS idx_records_date ON medical_records(record_date);
CREATE INDEX IF NOT EXISTS idx_records_deleted ON medical_records(is_deleted);

-- 5. DOCUMENT EXTRACTIONS TABLE
CREATE TABLE IF NOT EXISTS document_extractions (
    id VARCHAR(36) PRIMARY KEY,
    record_id VARCHAR(36) UNIQUE NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    extraction_method extraction_methods NOT NULL,
    processing_status extraction_statuses NOT NULL DEFAULT 'pending',
    extracted_text TEXT NULL,
    confidence_score DECIMAL(5,2) NULL,
    error_message TEXT NULL,
    processed_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_extractions_status ON document_extractions(processing_status);

-- 6. AI SUMMARIES TABLE
CREATE TABLE IF NOT EXISTS ai_summaries (
    id VARCHAR(36) PRIMARY KEY,
    record_id VARCHAR(36) UNIQUE NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL DEFAULT 'gemini-1.5-flash',
    summary_text TEXT NOT NULL,
    key_findings JSONB NULL,
    missing_or_unclear_info TEXT NULL,
    disclaimer_acknowledged BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. MEDICINE REMINDERS TABLE
CREATE TABLE IF NOT EXISTS medicine_reminders (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency reminder_frequencies NOT NULL DEFAULT 'daily',
    scheduled_times JSONB NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    meal_instruction meal_instructions NOT NULL DEFAULT 'anytime',
    notes TEXT NULL,
    status reminder_statuses NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON medicine_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON medicine_reminders(status);

-- 8. DOSE LOGS TABLE
CREATE TABLE IF NOT EXISTS dose_logs (
    id VARCHAR(36) PRIMARY KEY,
    reminder_id VARCHAR(36) NOT NULL REFERENCES medicine_reminders(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP NOT NULL,
    taken_at TIMESTAMP NULL,
    status dose_statuses NOT NULL,
    note VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dose_logs_reminder ON dose_logs(reminder_id);
CREATE INDEX IF NOT EXISTS idx_dose_logs_user ON dose_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_dose_logs_scheduled ON dose_logs(scheduled_for);

-- 9. SHARING PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS sharing_permissions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    otp_hash VARCHAR(64) NOT NULL,
    otp_salt VARCHAR(32) NOT NULL,
    allowed_record_ids JSONB NOT NULL,
    recipient_label VARCHAR(255) NULL,
    allow_download BOOLEAN NOT NULL DEFAULT FALSE,
    include_ai_summary BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    failed_otp_attempts INT NOT NULL DEFAULT 0,
    max_otp_attempts INT NOT NULL DEFAULT 5,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sharing_user_id ON sharing_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_sharing_expires ON sharing_permissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sharing_revoked ON sharing_permissions(is_revoked);

-- 10. SHARING ACCESS EVENTS TABLE
CREATE TABLE IF NOT EXISTS sharing_access_events (
    id VARCHAR(36) PRIMARY KEY,
    sharing_permission_id VARCHAR(36) NOT NULL REFERENCES sharing_permissions(id) ON DELETE CASCADE,
    client_ip VARCHAR(45) NOT NULL,
    user_agent VARCHAR(255) NULL,
    event_type share_event_types NOT NULL,
    accessed_record_id VARCHAR(36) NULL,
    status share_event_statuses NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_access_events_perm ON sharing_access_events(sharing_permission_id);
CREATE INDEX IF NOT EXISTS idx_access_events_type ON sharing_access_events(event_type);

-- 11. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(36) PRIMARY KEY,
    ticket_number VARCHAR(30) UNIQUE NOT NULL,
    user_id VARCHAR(36) NULL REFERENCES users(id) ON DELETE SET NULL,
    contact_email VARCHAR(255) NOT NULL,
    category ticket_categories NOT NULL DEFAULT 'general',
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ticket_statuses NOT NULL DEFAULT 'open',
    priority ticket_priorities NOT NULL DEFAULT 'medium',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_category ON support_tickets(category);

-- 12. SUPPORT RESPONSES TABLE
CREATE TABLE IF NOT EXISTS support_responses (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    responder_email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_responses_ticket ON support_responses(ticket_id);

-- 13. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(36) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    metadata JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ==============================================================================
-- INITIAL DEMO SEED DATA
-- ==============================================================================
INSERT INTO users (id, email, password_hash, role, is_verified, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'patient.demo@digitalhealthlocker.local',
    '$2b$12$e6nB4w6X2hW8Z1y5A9jCpe9T4h4T2N9p5M6o0W1Q2R3S4T5U6V7W.',
    'patient',
    TRUE,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO patient_profiles (id, user_id, full_name, date_of_birth, gender, blood_group, phone_number, emergency_contact_name, emergency_contact_phone)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Alex Morgan',
    '1988-06-14',
    'female',
    'O+',
    '+1 (555) 234-5678',
    'Dr. Evelyn Morgan',
    '+1 (555) 876-5432'
)
ON CONFLICT (user_id) DO NOTHING;
