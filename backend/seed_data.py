import os
import uuid
from datetime import datetime, date, timedelta
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.models.medical_record import MedicalRecord
from app.models.document_extraction import DocumentExtraction
from app.models.ai_summary import AiSummary
from app.models.medicine_reminder import MedicineReminder

app = create_app()

def seed_database():
    with app.app_context():
        print("🌱 Seeding Digital Health Locker database...")
        db.create_all()

        demo_email = "patient.demo@digitalhealthlocker.local"
        existing = User.query.filter_by(email=demo_email).first()
        if existing:
            print(f"Demo user already exists: {demo_email}")
            return

        # 1. Create Patient User
        user = User(
            id=str(uuid.uuid4()),
            email=demo_email,
            role='patient',
            is_verified=True
        )
        user.set_password("DemoHealth@2026")
        db.session.add(user)
        db.session.flush()

        # 2. Patient Profile
        profile = PatientProfile(
            user_id=user.id,
            full_name="Alex Morgan",
            date_of_birth=date(1988, 6, 14),
            gender="female",
            blood_group="O+",
            phone_number="+1 (555) 234-5678",
            emergency_contact_name="Dr. Evelyn Morgan",
            emergency_contact_phone="+1 (555) 876-5432",
            address="742 Evergreen Terrace, Springfield"
        )
        db.session.add(profile)

        # 3. Sample Medical Record 1: Complete Blood Count
        rec1 = MedicalRecord(
            id=str(uuid.uuid4()),
            user_id=user.id,
            title="Complete Blood Count (CBC) Routine Panel",
            category="blood_test",
            stored_filename="sample_cbc_panel.pdf",
            original_filename="CBC_Panel_June_2026.pdf",
            mime_type="application/pdf",
            file_size_bytes=245800,
            sha256_checksum="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            record_date=date(2026, 6, 10),
            notes="Annual routine preventive checkup performed at City Diagnostic Lab."
        )
        db.session.add(rec1)
        db.session.flush()

        ext1 = DocumentExtraction(
            record_id=rec1.id,
            extraction_method="native_pdf",
            processing_status="completed",
            confidence_score=99.0,
            extracted_text="""
CITY DIAGNOSTIC LABORATORIES
Patient: Alex Morgan | Age: 38 | Gender: F | Date: 10-Jun-2026
Test: COMPLETE BLOOD COUNT (CBC) WITH DIFFERENTIAL

TEST PARAMETER             RESULT       REFERENCE RANGE    UNITS
------------------------------------------------------------------
White Blood Cell (WBC)     6.8          4.5 - 11.0         x10^3/uL
Red Blood Cell (RBC)       4.42         4.00 - 5.20        x10^6/uL
Hemoglobin                 13.8         12.0 - 16.0        g/dL
Hematocrit                 41.2         37.0 - 47.0        %
Platelet Count             245          150 - 450          x10^3/uL
Mean Corpuscular Vol (MCV) 89.0         80.0 - 100.0       fL
Fasting Glucose            92           70 - 99            mg/dL

Remarks: All hematological parameters are within standard adult reference intervals.
Electronically signed by Dr. K. Sharma, MD (Pathology)
            """.strip(),
            processed_at=datetime.utcnow()
        )
        db.session.add(ext1)

        ai1 = AiSummary(
            record_id=rec1.id,
            model_name="gemini-1.5-flash",
            summary_text="This routine Complete Blood Count (CBC) panel and fasting glucose test show that all observed blood cell counts and blood sugar levels are within normal, healthy ranges. There is no evidence of anemia, active infection, or abnormal blood clotting markers.",
            key_findings=[
                {"parameter": "Hemoglobin", "observed_value": "13.8 g/dL", "reference_range": "12.0 - 16.0 g/dL", "interpretation": "Normal"},
                {"parameter": "White Blood Cells", "observed_value": "6.8 x10^3/uL", "reference_range": "4.5 - 11.0 x10^3/uL", "interpretation": "Normal"},
                {"parameter": "Platelets", "observed_value": "245 x10^3/uL", "reference_range": "150 - 450 x10^3/uL", "interpretation": "Normal"},
                {"parameter": "Fasting Glucose", "observed_value": "92 mg/dL", "reference_range": "70 - 99 mg/dL", "interpretation": "Optimal fasting glycemic level"}
            ],
            missing_or_unclear_info="None. All primary test indices were clearly legible.",
            disclaimer_acknowledged=True
        )
        db.session.add(ai1)

        # 4. Medicine Reminders
        rem1 = MedicineReminder(
            id=str(uuid.uuid4()),
            user_id=user.id,
            medicine_name="Atorvastatin",
            dosage="10 mg Tablet",
            frequency="daily",
            scheduled_times=["21:00"],
            start_date=date(2026, 1, 1),
            meal_instruction="after_meal",
            notes="Take with a full glass of water before bedtime.",
            status="active"
        )
        rem2 = MedicineReminder(
            id=str(uuid.uuid4()),
            user_id=user.id,
            medicine_name="Vitamin D3 (Cholecalciferol)",
            dosage="1000 IU Capsule",
            frequency="daily",
            scheduled_times=["08:30"],
            start_date=date(2026, 3, 1),
            meal_instruction="with_meal",
            notes="Take with morning breakfast.",
            status="active"
        )
        db.session.add(rem1)
        db.session.add(rem2)

        db.session.commit()
        print("✅ Sample seed data successfully populated!")
        print(f"👉 Demo Account: {demo_email} | Password: DemoHealth@2026")

if __name__ == '__main__':
    seed_database()
