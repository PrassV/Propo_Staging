import os
import pytest
import requests
from datetime import datetime

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

@pytest.fixture(scope="session")
def session():
    """
    Register a new test user and obtain an authenticated session.
    """
    sess = requests.Session()
    # Generate unique user
    ts = datetime.now().strftime('%Y%m%d%H%M%S')
    test_email = f"owner_{ts}@example.com"
    signup_data = {
        "email": test_email,
        "password": "TestPass123!",
        "name": "TestOwner",
        "phone": "1234567890"
    }
    # Register
    resp = sess.post(f"{BASE_URL}/auth/register", json=signup_data)
    assert resp.status_code in (200, 201), f"Signup failed: {resp.status_code} - {resp.text}"
    # Login
    resp = sess.post(f"{BASE_URL}/auth/login", json={"email": test_email, "password": "TestPass123!"})
    assert resp.status_code == 200, f"Login failed: {resp.status_code} - {resp.text}"
    token = resp.json().get("access_token")
    sess.headers.update({"Authorization": f"Bearer {token}"})
    return sess

TENANT_ID = None

def test_list_tenants(session):
    """
    Test GET /tenants returns a list of tenants with correct structure.
    """
    resp = session.get(f"{BASE_URL}/tenants")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "items" in data and isinstance(data["items"], list), "Missing 'items' list"
    assert "total" in data and isinstance(data["total"], int), "Missing 'total' count"

    # Capture a valid tenant_id for next test
    global TENANT_ID
    if data["items"]:
        TENANT_ID = data["items"][0]["id"]
    else:
        pytest.skip("No tenants to test GET /tenants/{tenant_id}")


def test_get_tenant_by_id(session):
    """
    Test GET /tenants/{tenant_id} returns the correct tenant structure.
    """
    if not TENANT_ID:
        pytest.skip("TENANT_ID not set from test_list_tenants")
    resp = session.get(f"{BASE_URL}/tenants/{TENANT_ID}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "tenant" in data and isinstance(data["tenant"], dict), "Missing 'tenant' object"
    assert data["tenant"]["id"] == TENANT_ID, "Returned tenant ID does not match" 