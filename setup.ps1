# ==============================================================================
# DIGITAL HEALTH LOCKER — QUICK SETUP SCRIPT (PowerShell / Windows)
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " DIGITAL HEALTH LOCKER — AUTOMATED SETUP SCRIPT" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Python
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "✔ Python found: $(python --version)" -ForegroundColor Green
} else {
    Write-Host "⚠ Python was not found in PATH. Please install Python 3.11+." -ForegroundColor Yellow
}

# 2. Check Node.js
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "✔ npm found: $(npm -v)" -ForegroundColor Green
} else {
    Write-Host "⚠ npm was not found in PATH. Please install Node.js (v18+ or v20+)." -ForegroundColor Yellow
}

# 3. Setup Backend
Write-Host "`n[1/3] Setting up Python virtual environment..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\backend"

if (-Not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "✔ Virtual environment created." -ForegroundColor Green
}

if (Test-Path "venv\Scripts\Activate.ps1") {
    & "venv\Scripts\Activate.ps1"
    pip install -r requirements.txt
    Write-Host "✔ Backend dependencies installed." -ForegroundColor Green
}

if (-Not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✔ Created backend/.env from .env.example" -ForegroundColor Green
}

# 4. Setup Frontend
Write-Host "`n[2/3] Setting up Frontend dependencies..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\frontend"

if (-Not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✔ Created frontend/.env from .env.example" -ForegroundColor Green
}

if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm install
    Write-Host "✔ Frontend dependencies installed." -ForegroundColor Green
}

Set-Location -Path "$PSScriptRoot"

Write-Host "`n[3/3] Setup Completed!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "To start the application:" -ForegroundColor Yellow
Write-Host "1. Configure your Neon Tech PostgreSQL connection in backend/.env (DATABASE_URL)"
Write-Host "2. Initialize DB & Seed test account: cd backend; python seed_data.py"
Write-Host "3. Start Backend: cd backend; python run.py"
Write-Host "4. Start Frontend: cd frontend; npm run dev"
Write-Host "==========================================================" -ForegroundColor Cyan
