# Digital Health Locker

> **Full Title:** AI-Powered Portable Electronic Health Record (EHR) Management System  
> **Official Support Email:** `xoya0102@gmail.com`  
> **Architecture:** Decoupled Full-Stack Web Application (React + TypeScript + Vite + Tailwind CSS / Python Flask REST API / Neon Tech PostgreSQL)

---

## 1. System Overview

Digital Health Locker is a secure, patient-controlled EHR web application. It eliminates healthcare fragmentation by centralizing laboratory tests, prescriptions, radiology scans, and discharge summaries into a unified portal. 

### Core Capabilities
* **Patient Sovereignty & Authentication:** Secure email-based registration, email verification, single-use password resets, session management, and profile customization.
* **Medical Record Management:** Upload support for PDF, PNG, and JPG files stored in isolated protected storage (never placed in a public web root) with full categorization, date filtering, notes, and search.
* **Hybrid OCR Text Extraction:** Direct embedded text extraction for native digital PDFs with automated Tesseract OCR fallback for scanned images and documents.
* **AI-Assisted Medical Summaries:** Google Gemini API integration generating plain-language summaries of lab tests, highlighting reported biomarkers against reference ranges, and flagging unreadable data—strictly grounded on source text with medical disclaimers.
* **Medicine Reminder System:** Daily/weekly dosage scheduling, meal instructions, dose checklists (mark taken/skipped), adherence history, and browser push alerts.
* **Secure QR Code & OTP Doctor Sharing:** Granular sharing permissions allowing patients to grant time-limited, read-only access for selected reports to healthcare professionals.
  * **Zero Database Exposure:** QR codes contain only an opaque token URL (`/doctor/portal?token=...`). Neither database credentials, SQL queries, nor patient identifiers are ever exposed.
  * **Salted OTP Challenge:** Doctors verify access using a 6-digit numeric OTP with an automated lockout after 5 failed attempts.
  * **Instant Revocation:** Patients can revoke access at any time with immediate effect.
* **Help & Support Desk:** Inquiry ticketing system classified by category, tracking resolution status, with notifications routed to `xoya0102@gmail.com`.

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Lucide Icons, Axios, QRCode.react |
| **Backend** | Python 3.11+, Flask REST API, Flask-SQLAlchemy, Flask-Migrate, Flask-CORS, PyJWT, Passlib (Argon2 / Bcrypt) |
| **Database** | Neon Tech Serverless PostgreSQL (3NF normalized schema) |
| **Document Storage** | Isolated local file storage with SHA-256 deduplication and streaming endpoints |
| **OCR Engine** | `pypdf`, `pdfplumber`, `pytesseract` (Tesseract OCR Engine), `Pillow` |
| **AI Summarizer** | Google Gemini API (`gemini-1.5-flash`) with structured JSON schema output |
| **Email Service** | Python `smtplib` / TLS with designated mailbox `xoya0102@gmail.com` |

---

## 3. Directory Layout

```
D:\DigiLocker\
├── backend\
│   ├── app\
│   │   ├── __init__.py           # Flask app factory, extension setup, blueprint registration
│   │   ├── config.py             # Environment configurations
│   │   ├── extensions.py         # SQLAlchemy, Migrate, CORS
│   │   ├── models\               # 3NF PostgreSQL relational models
│   │   │   ├── user.py
│   │   │   ├── patient_profile.py
│   │   │   ├── medical_record.py
│   │   │   ├── document_extraction.py
│   │   │   ├── ai_summary.py
│   │   │   ├── medicine_reminder.py
│   │   │   ├── dose_log.py
│   │   │   ├── sharing_permission.py
│   │   │   ├── sharing_access_event.py
│   │   │   ├── support_ticket.py
│   │   │   └── audit_log.py
│   │   ├── routes\               # REST API endpoints
│   │   │   ├── auth.py
│   │   │   ├── profile.py
│   │   │   ├── records.py
│   │   │   ├── ai.py
│   │   │   ├── reminders.py
│   │   │   ├── sharing.py
│   │   │   ├── doctor_portal.py
│   │   │   ├── support.py
│   │   │   └── audit.py
│   │   ├── services\             # Core business logic
│   │   │   ├── storage_service.py
│   │   │   ├── email_service.py
│   │   │   ├── ocr_service.py
│   │   │   ├── ai_service.py
│   │   │   ├── reminder_service.py
│   │   │   └── sharing_service.py
│   │   ├── utils\                # Cryptography, tokens, and input validators
│   │   └── middleware\           # JWT auth decorators & sliding-window rate limiter
│   ├── migrations\
│   │   ├── schema_neon.sql       # Master PostgreSQL DDL script for Neon Tech
│   │   └── schema.sql            # Legacy MySQL DDL script
│   ├── storage\records\          # Protected file storage (isolated from web root)
│   ├── tests\                    # Automated pytest test suites
│   ├── run.py                    # Backend server entry point (port 5000)
│   ├── seed_data.py              # Development fixture seeder
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend\
│   ├── src\
│   │   ├── components\           # Modular, accessible UI components
│   │   │   ├── common\           # Navbar, Sidebar, Modal, Button, Badge, Toast
│   │   │   ├── dashboard\        # KPI cards, upcoming doses, quick actions
│   │   │   ├── records\          # Upload modal, viewer modal, OCR & AI tabs
│   │   │   ├── reminders\        # Dose checklist, schedule cards, add modal
│   │   │   ├── sharing\          # QR generator, OTP display, active shares table
│   │   │   └── support\          # Ticket modal, response thread
│   │   ├── contexts\             # AuthContext, NotificationContext
│   │   ├── pages\                # Auth, Patient portal, Doctor portal, 404
│   │   ├── services\             # Axios HTTP client & API service wrappers
│   │   ├── types\                # Comprehensive TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env.example
├── docker-compose.yml            # Multi-container orchestration (Backend + Neon cloud integration)
├── setup.ps1                     # PowerShell automation script for Windows
└── README.md
```

---

## 4. Setup and Installation

### Prerequisites
1. **Python 3.11+** installed and available in PATH.
2. **Node.js (v18+ or v20+) & npm** installed.
3. **Neon Tech PostgreSQL Database** (cloud connection string from [neon.tech](https://neon.tech)).
4. *(Optional for Image OCR)* **Tesseract OCR** binary.
5. *(Optional for Live AI)* **Google Gemini API Key**.

---

### Step 1: Database Setup (Neon Tech)
1. Sign up or log into **[Neon](https://neon.tech)** and create a new project (e.g., `digital-health-locker`).
2. Copy your connection string from the Neon dashboard (under **Connection Details**):
   ```
   postgresql://neondb_owner:YOUR_PASSWORD@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Set this string in `backend/.env` under `DATABASE_URL`.
4. *(Optional)* If you wish to execute the DDL directly via the Neon SQL Editor, copy and run the statements from `backend/migrations/schema_neon.sql`. (Otherwise, `python seed_data.py` will automatically create the tables via SQLAlchemy).

---

### Step 2: Backend Setup
1. Open a terminal in the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   # Windows PowerShell:
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS:
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   ```powershell
   Copy-Item .env.example .env
   ```
   *Update `DATABASE_URL`, `SECRET_KEY`, and optional `GEMINI_API_KEY` in `backend/.env`.*
5. Populate development seed data:
   ```bash
   python seed_data.py
   ```
   *This seeds a test patient account:*
   * **Email:** `patient.demo@digitalhealthlocker.local`
   * **Password:** `DemoHealth@2026`
6. Start the Flask REST API:
   ```bash
   python run.py
   ```
   *The backend will be live at `http://localhost:5000`.*

---

### Step 3: Frontend Setup
1. In a separate terminal, navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Copy the environment configuration:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will be live at `http://localhost:5173`.*

---

## 5. Security & Cryptographic Sharing Architecture

### QR Code & OTP Handshake Protocol
```
[ Patient App ]
       │
       ▼ (1) Selects records & duration
[ Flask Backend ] ───> Generates secrets.token_urlsafe(32) + 6-digit OTP
       │
       ├───> Stores SHA-256(token) & SHA-256(salt:OTP) in Neon PostgreSQL
       ▼
Displays QR Code: https://[domain]/doctor/portal?token=[raw_token]
Displays OTP: "849201"
       │
       ▼ (2) Doctor scans QR code
[ Doctor Portal ] ───> Sends token to POST /api/public/share/resolve
       │
       ▼ (3) Portal prompts doctor for 6-digit OTP
[ Doctor Portal ] ───> Sends token & OTP to POST /api/public/share/verify-otp
       │
       ▼ (4) Backend checks:
             - Is permission revoked? -> Deny
             - Is session expired?   -> Deny
             - Attempts >= 5?        -> Lockout
             - SHA-256(salt:OTP) matches? -> Issue scoped Doctor View JWT
       ▼
[ Doctor Viewer ] ───> Requests only authorized reports: GET /api/public/share/records
```

* **Zero-Knowledge QR Codes:** The QR code contains solely the opaque URL. No patient names, file paths, or SQL queries are exposed.
* **Protected File Streaming:** Files are kept in `backend/storage/records/<uuid>` with randomized filenames, never served from a public static folder. All file retrieval passes through Flask route `GET /api/records/<id>/file` which validates authentication, patient ownership, or active sharing session token permissions before streaming with appropriate mime-type and `X-Content-Type-Options: nosniff`.
* **Database Isolation:** The frontend never connects directly to the database. Neon PostgreSQL credentials exist exclusively within the backend environment.

---

## 6. Official Email Configuration

The designated official contact for system inquiries and alerts is:  
📧 **`xoya0102@gmail.com`**

### Production SMTP Setup
To enable live transactional email dispatch, supply a valid Gmail App Password in `backend/.env`:
```env
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=xoya0102@gmail.com
MAIL_PASSWORD=your-16-char-gmail-app-password
MAIL_DEFAULT_SENDER=xoya0102@gmail.com
SUPPORT_EMAIL=xoya0102@gmail.com
```

### Honest Fallback in Development
If SMTP credentials are not configured, the backend will **never simulate or claim false delivery**. Instead:
1. It records an informational notice in the server terminal logs.
2. It returns verification codes and reset links in development responses so you can test complete end-to-end user workflows without external mail configuration.

---

## 7. Running Automated Test Suites

The backend includes automated integration and security tests covering registration, login, unverified account lockout, QR token resolution, incorrect OTP rejection, scoped authorization, and instant access revocation:

```bash
cd backend
pytest -v
```

---

## 8. License & Disclaimers

Digital Health Locker is an assistive electronic health record management system. It is strictly non-diagnostic and does not replace the professional medical judgment of a licensed healthcare provider.
