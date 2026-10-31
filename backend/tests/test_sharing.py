import pytest
from datetime import datetime, date
from app import create_app
from app.config import TestingConfig
from app.extensions import db
from app.models.user import User
from app.models.medical_record import MedicalRecord
from app.services.sharing_service import sharing_service

@pytest.fixture
def app_and_client():
    app = create_app(TestingConfig)
    ctx = app.app_context()
    ctx.push()
    db.create_all()
    
    # Setup patient and a record
    user = User(email='patient.share@example.com', role='patient', is_verified=True)
    user.set_password('SharePass@123')
    db.session.add(user)
    db.session.flush()

    rec = MedicalRecord(
        user_id=user.id,
        title='Lipid Panel',
        category='blood_test',
        stored_filename='dummy_file.pdf',
        original_filename='Lipid_Panel.pdf',
        mime_type='application/pdf',
        file_size_bytes=1024,
        sha256_checksum='abcd1234efgh5678',
        record_date=date.today()
    )
    db.session.add(rec)
    db.session.commit()

    client = app.test_client()
    yield app, client, user, rec

    db.session.remove()
    db.drop_all()
    ctx.pop()

def test_qr_and_otp_sharing_flow(app_and_client):
    app, client, user, rec = app_and_client
    # 1. Create sharing session
    share_res = sharing_service.create_sharing_session(
        user_id=user.id,
        record_ids=[rec.id],
        duration_hours=2,
        recipient_label='Dr. House',
        allow_download=False,
        include_ai_summary=True
    )

    raw_token = share_res['token']
    raw_otp = share_res['otp']
    perm_id = share_res['permission_id']

    # 2. Doctor scans QR (calls public resolve endpoint)
    resolve_res = client.post('/api/public/share/resolve', json={'token': raw_token})
    assert resolve_res.status_code == 200
    assert resolve_res.get_json()['requires_otp'] is True

    # 3. Doctor enters WRONG OTP
    bad_otp_res = client.post('/api/public/share/verify-otp', json={'token': raw_token, 'otp': '000000'})
    assert bad_otp_res.status_code == 403
    assert 'Incorrect OTP' in bad_otp_res.get_json()['error']

    # 4. Doctor enters CORRECT OTP
    good_otp_res = client.post('/api/public/share/verify-otp', json={'token': raw_token, 'otp': raw_otp})
    assert good_otp_res.status_code == 200
    doctor_token = good_otp_res.get_json()['doctor_token']
    assert doctor_token is not None

    # 5. Doctor lists shared records with scoped token
    doc_headers = {'Authorization': f'Bearer {doctor_token}'}
    list_res = client.get('/api/public/share/records', headers=doc_headers)
    assert list_res.status_code == 200
    records = list_res.get_json()['records']
    assert len(records) == 1
    assert records[0]['id'] == rec.id

    # 6. Patient revokes sharing permission
    revoke_success = sharing_service.revoke_permission(perm_id, user.id)
    assert revoke_success is True

    # 7. Doctor tries to view records after revocation -> MUST BE BLOCKED
    blocked_res = client.get('/api/public/share/records', headers=doc_headers)
    assert blocked_res.status_code == 403
