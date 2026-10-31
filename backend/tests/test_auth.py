import pytest
from app import create_app
from app.config import TestingConfig
from app.extensions import db
from app.models.user import User

@pytest.fixture
def client():
    app = create_app(TestingConfig)
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

def test_register_and_login(client):
    # 1. Register
    reg_res = client.post('/api/auth/register', json={
        'email': 'test.patient@example.com',
        'password': 'SecurePassword@123',
        'full_name': 'Jane Doe'
    })
    assert reg_res.status_code == 201
    data = reg_res.get_json()
    assert 'user_id' in data

    # 2. Unverified login should fail
    login_res = client.post('/api/auth/login', json={
        'email': 'test.patient@example.com',
        'password': 'SecurePassword@123'
    })
    assert login_res.status_code == 403
    assert login_res.get_json().get('unverified') is True

    # 3. Verify Email
    dev_code = data.get('dev_verification_code')
    verify_res = client.post('/api/auth/verify-email', json={
        'email': 'test.patient@example.com',
        'code': dev_code
    })
    assert verify_res.status_code == 200

    # 4. Verified Login should succeed
    login_success = client.post('/api/auth/login', json={
        'email': 'test.patient@example.com',
        'password': 'SecurePassword@123'
    })
    assert login_success.status_code == 200
    token = login_success.get_json().get('token')
    assert token is not None
