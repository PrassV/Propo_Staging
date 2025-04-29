import os
import requests
import pytest
from datetime import datetime

# Base API URL
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

@pytest.fixture(scope="session")
def session():
    """
    Create an authenticated session using admin credentials.
    """
    s = requests.Session()
    # Login as admin or owner
    login_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    login_password = os.getenv("ADMIN_PASSWORD", "password123")
    resp = s.post(f"{BASE_URL}/auth/login", json={"email": login_email, "password": login_password})
    assert resp.status_code == 200, f"Login failed: {resp.status_code} - {resp.text}"
    token = resp.json().get("access_token")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s

# Known tenants in Supabase (from mcp_supabase_execute_sql)
TEST_TENANTS = [
    {"id": 1, "name": "Tenant 1", "email": "tenant1@example.com", "phone": "+1-555-1234", "status": "active"},
    {"id": 2, "name": "Tenant 2", "email": "tenant2@example.com", "phone": "+1-555-5678", "status": "active"},
    {"id": 3, "name": "Tenant 3", "email": "tenant3@example.com", "phone": "+1-555-9012", "status": "active"},
]

def test_tenants_against_supabase(session):
    # Call the tenants list endpoint
    resp = session.get(f"{BASE_URL}/tenants")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "items" in data and isinstance(data["items"], list), "Missing 'items' list"
    api_tenants = {t["id"]: t for t in data["items"]}

    for expected in TEST_TENANTS:
        tid = expected["id"]
        assert tid in api_tenants, f"Tenant ID {tid} missing in API results"
        actual = api_tenants[tid]
        # Compare fields
        for field in ["name", "email", "phone", "status"]:
            assert actual.get(field) == expected[field], (
                f"Mismatch for tenant {tid} field '{field}': "
                f"Expected {expected[field]}, got {actual.get(field)}"
            ) 