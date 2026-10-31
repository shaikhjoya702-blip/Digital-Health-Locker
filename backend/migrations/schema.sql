-- ==============================================================================
-- DIGITAL HEALTH LOCKER — MASTER MYSQL SCHEMA (3NF Normalized)
-- Database: digital_health_locker
-- Engine: InnoDB, UTF-8 Unicode (utf8mb4)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `digital_health_locker` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `digital_health_locker`;

-- Disable foreign key checks during initialization
SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS TABLE
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('patient', 'doctor', 'admin') NOT NULL DEFAULT 'patient',
    `is_verified` BOOLEAN NOT NULL DEFAULT FALSE,
    `verification_token_hash` VARCHAR(255) NULL,
    `verification_expires_at` DATETIME NULL,
    `reset_token_hash` VARCHAR(255) NULL,
    `reset_expires_at` DATETIME NULL,
    `failed_login_attempts` INT NOT NULL DEFAULT 0,
    `locked_until` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_users_email` (`email`),
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_verified` (`is_verified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. PATIENT PROFILES TABLE
DROP TABLE IF EXISTS `patient_profiles`;
CREATE TABLE `patient_profiles` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `date_of_birth` DATE NULL,
    `gender` ENUM('male', 'female', 'other', 'prefer_not_to_say') NOT NULL DEFAULT 'prefer_not_to_say',
    `blood_group` VARCHAR(10) NULL,
    `phone_number` VARCHAR(25) NULL,
    `emergency_contact_name` VARCHAR(100) NULL,
    `emergency_contact_phone` VARCHAR(25) NULL,
    `address` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_patient_profiles_user` (`user_id`),
    CONSTRAINT `fk_patient_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. MEDICAL RECORDS TABLE
DROP TABLE IF EXISTS `medical_records`;
CREATE TABLE `medical_records` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `category` ENUM('blood_test', 'prescription', 'radiology', 'discharge_summary', 'other') NOT NULL DEFAULT 'other',
    `stored_filename` VARCHAR(255) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `file_size_bytes` BIGINT NOT NULL,
    `sha256_checksum` CHAR(64) NOT NULL,
    `record_date` DATE NOT NULL,
    `notes` TEXT NULL,
    `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_records_user_id` (`user_id`),
    INDEX `idx_records_category` (`category`),
    INDEX `idx_records_date` (`record_date`),
    INDEX `idx_records_deleted` (`is_deleted`),
    CONSTRAINT `fk_medical_records_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. DOCUMENT EXTRACTIONS (OCR & Embedded Text)
DROP TABLE IF EXISTS `document_extractions`;
CREATE TABLE `document_extractions` (
    `id` VARCHAR(36) NOT NULL,
    `record_id` VARCHAR(36) NOT NULL,
    `extraction_method` ENUM('native_pdf', 'tesseract_ocr', 'hybrid', 'manual') NOT NULL,
    `processing_status` ENUM('pending', 'processing', 'completed', 'failed', 'incomplete') NOT NULL DEFAULT 'pending',
    `extracted_text` LONGTEXT NULL,
    `confidence_score` DECIMAL(5,2) NULL,
    `error_message` TEXT NULL,
    `processed_at` DATETIME NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_extractions_record` (`record_id`),
    INDEX `idx_extractions_status` (`processing_status`),
    CONSTRAINT `fk_extractions_record` FOREIGN KEY (`record_id`) REFERENCES `medical_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. AI SUMMARIES TABLE
DROP TABLE IF EXISTS `ai_summaries`;
CREATE TABLE `ai_summaries` (
    `id` VARCHAR(36) NOT NULL,
    `record_id` VARCHAR(36) NOT NULL,
    `model_name` VARCHAR(100) NOT NULL DEFAULT 'gemini-1.5-flash',
    `summary_text` TEXT NOT NULL,
    `key_findings` JSON NULL,
    `missing_or_unclear_info` TEXT NULL,
    `disclaimer_acknowledged` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_ai_summaries_record` (`record_id`),
    CONSTRAINT `fk_ai_summaries_record` FOREIGN KEY (`record_id`) REFERENCES `medical_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. MEDICINE REMINDERS TABLE
DROP TABLE IF EXISTS `medicine_reminders`;
CREATE TABLE `medicine_reminders` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `medicine_name` VARCHAR(255) NOT NULL,
    `dosage` VARCHAR(100) NOT NULL,
    `frequency` ENUM('daily', 'twice_daily', 'thrice_daily', 'weekly', 'as_needed', 'custom') NOT NULL DEFAULT 'daily',
    `scheduled_times` JSON NOT NULL, -- e.g. ["08:00", "20:00"]
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `meal_instruction` ENUM('before_meal', 'after_meal', 'with_meal', 'anytime') NOT NULL DEFAULT 'anytime',
    `notes` TEXT NULL,
    `status` ENUM('active', 'paused', 'completed') NOT NULL DEFAULT 'active',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_reminders_user_id` (`user_id`),
    INDEX `idx_reminders_status` (`status`),
    CONSTRAINT `fk_medicine_reminders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. DOSE LOGS TABLE
DROP TABLE IF EXISTS `dose_logs`;
CREATE TABLE `dose_logs` (
    `id` VARCHAR(36) NOT NULL,
    `reminder_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `scheduled_for` DATETIME NOT NULL,
    `taken_at` DATETIME NULL,
    `status` ENUM('taken', 'skipped', 'missed') NOT NULL,
    `note` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_dose_logs_reminder` (`reminder_id`),
    INDEX `idx_dose_logs_user` (`user_id`),
    INDEX `idx_dose_logs_scheduled` (`scheduled_for`),
    CONSTRAINT `fk_dose_logs_reminder` FOREIGN KEY (`reminder_id`) REFERENCES `medicine_reminders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_dose_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. SHARING PERMISSIONS TABLE (QR & OTP)
DROP TABLE IF EXISTS `sharing_permissions`;
CREATE TABLE `sharing_permissions` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `otp_hash` VARCHAR(64) NOT NULL,
    `otp_salt` VARCHAR(32) NOT NULL,
    `allowed_record_ids` JSON NOT NULL, -- Array of record UUIDs: ["uuid1", "uuid2"]
    `recipient_label` VARCHAR(255) NULL,
    `allow_download` BOOLEAN NOT NULL DEFAULT FALSE,
    `include_ai_summary` BOOLEAN NOT NULL DEFAULT TRUE,
    `expires_at` DATETIME NOT NULL,
    `is_revoked` BOOLEAN NOT NULL DEFAULT FALSE,
    `revoked_at` DATETIME NULL,
    `failed_otp_attempts` INT NOT NULL DEFAULT 0,
    `max_otp_attempts` INT NOT NULL DEFAULT 5,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_sharing_token_hash` (`token_hash`),
    INDEX `idx_sharing_user_id` (`user_id`),
    INDEX `idx_sharing_expires` (`expires_at`),
    INDEX `idx_sharing_revoked` (`is_revoked`),
    CONSTRAINT `fk_sharing_permissions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. SHARING ACCESS EVENTS TABLE (Audit Trail)
DROP TABLE IF EXISTS `sharing_access_events`;
CREATE TABLE `sharing_access_events` (
    `id` VARCHAR(36) NOT NULL,
    `sharing_permission_id` VARCHAR(36) NOT NULL,
    `client_ip` VARCHAR(45) NOT NULL,
    `user_agent` VARCHAR(255) NULL,
    `event_type` ENUM('qr_scan', 'otp_attempt_success', 'otp_attempt_failed', 'view_record', 'download_record') NOT NULL,
    `accessed_record_id` VARCHAR(36) NULL,
    `status` ENUM('allowed', 'denied', 'expired', 'revoked') NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_access_events_perm` (`sharing_permission_id`),
    INDEX `idx_access_events_type` (`event_type`),
    CONSTRAINT `fk_access_events_perm` FOREIGN KEY (`sharing_permission_id`) REFERENCES `sharing_permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. SUPPORT TICKETS TABLE
DROP TABLE IF EXISTS `support_tickets`;
CREATE TABLE `support_tickets` (
    `id` VARCHAR(36) NOT NULL,
    `ticket_number` VARCHAR(30) NOT NULL, -- e.g. TKT-20261023-A4F1
    `user_id` VARCHAR(36) NULL,
    `contact_email` VARCHAR(255) NOT NULL,
    `category` ENUM('login_issues', 'password_recovery', 'report_upload', 'qr_sharing', 'medicine_reminders', 'general') NOT NULL DEFAULT 'general',
    `subject` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_support_ticket_number` (`ticket_number`),
    INDEX `idx_support_user_id` (`user_id`),
    INDEX `idx_support_status` (`status`),
    INDEX `idx_support_category` (`category`),
    CONSTRAINT `fk_support_tickets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. SUPPORT RESPONSES TABLE
DROP TABLE IF EXISTS `support_responses`;
CREATE TABLE `support_responses` (
    `id` VARCHAR(36) NOT NULL,
    `ticket_id` VARCHAR(36) NOT NULL,
    `responder_email` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `is_staff` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_support_responses_ticket` (`ticket_id`),
    CONSTRAINT `fk_support_responses_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. AUDIT LOGS TABLE
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` VARCHAR(36) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_audit_user` (`user_id`),
    INDEX `idx_audit_action` (`action`),
    INDEX `idx_audit_created` (`created_at`),
    CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- FICTIONAL SEED DATA FOR DEVELOPMENT AND TESTING
-- ==============================================================================

-- Seed Sample User (Password is 'DemoPass@123', hashed with bcrypt)
-- ID: 11111111-1111-1111-1111-111111111111
INSERT INTO `users` (`id`, `email`, `password_hash`, `role`, `is_verified`, `created_at`)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'patient.demo@digitalhealthlocker.local',
    '$2b$12$e6nB4w6X2hW8Z1y5A9jCpe9T4h4T2N9p5M6o0W1Q2R3S4T5U6V7W.',
    'patient',
    TRUE,
    CURRENT_TIMESTAMP
) ON DUPLICATE KEY UPDATE `email`=`email`;

-- Seed Patient Profile
INSERT INTO `patient_profiles` (`id`, `user_id`, `full_name`, `date_of_birth`, `gender`, `blood_group`, `phone_number`, `emergency_contact_name`, `emergency_contact_phone`)
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
) ON DUPLICATE KEY UPDATE `full_name`=`full_name`;
