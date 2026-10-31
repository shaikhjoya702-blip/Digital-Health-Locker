export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
  created_at: string;
  profile?: PatientProfile | null;
}

export interface PatientProfile {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth?: string | null;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  blood_group?: string | null;
  phone_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  address?: string | null;
}

export type RecordCategory = 
  | 'blood_test' 
  | 'prescription' 
  | 'radiology' 
  | 'discharge_summary' 
  | 'other';

export interface DocumentExtraction {
  id: string;
  record_id: string;
  extraction_method: 'native_pdf' | 'tesseract_ocr' | 'gemini_vision' | 'hybrid' | 'manual';
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'incomplete';
  extracted_text?: string | null;
  confidence_score?: number | null;
  error_message?: string | null;
  processed_at?: string | null;
}

export interface KeyFinding {
  parameter: string;
  observed_value: string;
  reference_range?: string;
  interpretation?: string;
  significance?: string;
}

export interface AiSummary {
  id: string;
  record_id: string;
  model_name: string;
  overall_status?: string;
  summary_text: string;
  key_findings?: KeyFinding[];
  ai_perspective?: string;
  questions_for_doctor?: string[];
  missing_or_unclear_info?: string | null;
  disclaimer_acknowledged: boolean;
  created_at: string;
}

export interface MedicalRecord {
  id: string;
  user_id: string;
  title: string;
  category: RecordCategory;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  record_date: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  has_extraction: boolean;
  extraction_status: 'not_started' | 'pending' | 'processing' | 'completed' | 'failed' | 'incomplete';
  has_ai_summary: boolean;
  extraction?: DocumentExtraction;
  ai_summary?: AiSummary;
  allow_download?: boolean;
}

export type MealInstruction = 'before_meal' | 'after_meal' | 'with_meal' | 'anytime';
export type ReminderFrequency = 'daily' | 'twice_daily' | 'thrice_daily' | 'weekly' | 'as_needed' | 'custom';
export type ReminderStatus = 'active' | 'paused' | 'completed';
export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed';

export interface MedicineReminder {
  id: string;
  user_id: string;
  medicine_name: string;
  dosage: string;
  frequency: ReminderFrequency;
  scheduled_times: string[];
  start_date: string;
  end_date?: string | null;
  meal_instruction: MealInstruction;
  notes?: string | null;
  status: ReminderStatus;
  created_at: string;
}

export interface TodayDose {
  log_id?: string | null;
  reminder_id: string;
  medicine_name: string;
  dosage: string;
  scheduled_time: string;
  scheduled_datetime: string;
  meal_instruction: MealInstruction;
  notes?: string | null;
  status: DoseStatus;
  logged_at?: string | null;
}

export interface DoseHistoryLog {
  id: string;
  reminder_id: string;
  user_id: string;
  scheduled_for: string;
  taken_at?: string | null;
  status: 'taken' | 'skipped' | 'missed';
  note?: string | null;
  created_at: string;
}

export interface SharingPermission {
  id: string;
  user_id: string;
  recipient_label?: string | null;
  allowed_record_ids: string[];
  allow_download: boolean;
  include_ai_summary: boolean;
  expires_at: string;
  is_revoked: boolean;
  revoked_at?: string | null;
  is_active: boolean;
  failed_otp_attempts: number;
  created_at: string;
  records?: Array<{ id: string; title: string; category: string }>;
}

export interface CreatedShareResult {
  permission_id: string;
  token: string;
  otp: string;
  sharing_url: string;
  expires_at: string;
  records_shared_count: number;
  allow_download: boolean;
  include_ai_summary: boolean;
}

export type TicketCategory = 
  | 'login_issues' 
  | 'password_recovery' 
  | 'report_upload' 
  | 'qr_sharing' 
  | 'medicine_reminders' 
  | 'general';

export interface SupportResponse {
  id: string;
  ticket_id: string;
  responder_email: string;
  message: string;
  is_staff: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id?: string | null;
  contact_email: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at?: string;
  responses?: SupportResponse[];
}

export interface AuditLogItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  ip_address?: string | null;
  created_at: string;
  metadata?: any;
}
