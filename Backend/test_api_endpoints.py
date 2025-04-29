import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"  # Change to your actual API URL
AUTH_ADMIN_CREDENTIALS = {
    "email": "prassannavenkat@gmail.com",
    "password": "pikachu"
}
AUTH_USER_CREDENTIALS = {
    "email": "prassannavenkat@gmail.com",
    "password": "pikachu" 
}

# Test data
TEST_USER_DATA = {
    "email": f"test_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com",
    "password": "TestPass123!",
    "first_name": "Test",
    "last_name": "User",
    "phone": "1234567890"
}

# Colors for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

# Results tracking
results = {
    "passed": 0,
    "failed": 0,
    "skipped": 0
}

# Utility functions
def print_header(title):
    print(f"\n{YELLOW}{'=' * 80}{RESET}")
    print(f"{YELLOW}{title.center(80)}{RESET}")
    print(f"{YELLOW}{'=' * 80}{RESET}")

def print_result(name, status, message=""):
    if status == "PASS":
        print(f"{GREEN}✓ {name} - PASS{RESET}")
        results["passed"] += 1
    elif status == "FAIL":
        print(f"{RED}✗ {name} - FAIL: {message}{RESET}")
        results["failed"] += 1
    elif status == "SKIP":
        print(f"{YELLOW}⚠ {name} - SKIPPED: {message}{RESET}")
        results["skipped"] += 1

def summarize_results():
    total = sum(results.values())
    print(f"\n{YELLOW}{'=' * 80}{RESET}")
    print(f"{YELLOW}TEST SUMMARY{RESET}")
    print(f"{YELLOW}{'=' * 80}{RESET}")
    print(f"Total tests: {total}")
    print(f"{GREEN}Passed: {results['passed']}{RESET}")
    print(f"{RED}Failed: {results['failed']}{RESET}")
    print(f"{YELLOW}Skipped: {results['skipped']}{RESET}")
    print(f"Success rate: {(results['passed'] / total) * 100:.2f}%")

# Test Authentication Endpoints
def test_auth_endpoints():
    print_header("AUTHENTICATION ENDPOINTS")
    session = requests.Session()
    auth_token = None
    
    # Test health endpoint
    try:
        response = session.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print_result("Health check", "PASS")
        else:
            print_result("Health check", "FAIL", f"Status code: {response.status_code}")
    except Exception as e:
        print_result("Health check", "FAIL", str(e))
    
    # Test registration
    try:
        response = session.post(f"{BASE_URL}/auth/signup", json=TEST_USER_DATA)
        if response.status_code in [200, 201]:
            print_result("User registration", "PASS")
            auth_token = response.json().get("access_token")
        else:
            print_result("User registration", "FAIL", f"Status code: {response.status_code} - {response.text}")
    except Exception as e:
        print_result("User registration", "FAIL", str(e))
    
    # Test login with new user
    if not auth_token:
        try:
            response = session.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_USER_DATA["email"],
                "password": TEST_USER_DATA["password"]
            })
            if response.status_code == 200:
                auth_token = response.json().get("access_token")
                print_result("User login", "PASS")
            else:
                print_result("User login", "FAIL", f"Status code: {response.status_code} - {response.text}")
        except Exception as e:
            print_result("User login", "FAIL", str(e))
    
    # Setup auth header if we have a token
    if auth_token:
        session.headers.update({"Authorization": f"Bearer {auth_token}"})
    else:
        print_result("Authentication", "FAIL", "Could not obtain authentication token")
        # Try admin login as a fallback
        try:
            response = session.post(f"{BASE_URL}/auth/login", json=AUTH_ADMIN_CREDENTIALS)
            if response.status_code == 200:
                auth_token = response.json().get("access_token")
                session.headers.update({"Authorization": f"Bearer {auth_token}"})
                print_result("Admin fallback login", "PASS")
            else:
                print_result("Admin fallback login", "FAIL", f"Status code: {response.status_code} - {response.text}")
        except Exception as e:
            print_result("Admin fallback login", "FAIL", str(e))
    
    return session, auth_token

# Test User Profile Endpoints
def test_profile_endpoints(session):
    print_header("USER PROFILE ENDPOINTS")
    
    # Test GET /users/me endpoint
    try:
        response = session.get(f"{BASE_URL}/users/me")
        if response.status_code == 200:
            user_id = response.json().get("id")
            print_result("GET /users/me", "PASS")
        else:
            user_id = None
            print_result("GET /users/me", "FAIL", f"Status code: {response.status_code} - {response.text}")
    except Exception as e:
        user_id = None
        print_result("GET /users/me", "FAIL", str(e))
    
    # Test PUT /users/me endpoint
    if user_id:
        try:
            update_data = {
                "first_name": f"Updated_{datetime.now().strftime('%H%M%S')}",
                "last_name": "Test User",
                "phone": "9876543210"
            }
            response = session.put(f"{BASE_URL}/users/me", json=update_data)
            if response.status_code in [200, 201]:
                print_result("PUT /users/me", "PASS")
                # Verify the update worked
                check_response = session.get(f"{BASE_URL}/users/me")
                if check_response.status_code == 200:
                    profile = check_response.json()
                    if profile.get("first_name") == update_data["first_name"]:
                        print_result("Verify profile update", "PASS")
                    else:
                        print_result("Verify profile update", "FAIL", "Profile data not updated correctly")
            else:
                print_result("PUT /users/me", "FAIL", f"Status code: {response.status_code} - {response.text}")
        except Exception as e:
            print_result("PUT /users/me", "FAIL", str(e))
    
    # Test GET /auth/me endpoint 
    try:
        response = session.get(f"{BASE_URL}/auth/me")
        if response.status_code == 200:
            print_result("GET /auth/me", "PASS")
        else:
            print_result("GET /auth/me", "FAIL", f"Status code: {response.status_code} - {response.text}")
    except Exception as e:
        print_result("GET /auth/me", "FAIL", str(e))

def main():
    print_header("API ENDPOINT VALIDATION")
    print(f"Testing against: {BASE_URL}")
    
    try:
        session, token = test_auth_endpoints()
        if token:
            test_profile_endpoints(session)
        else:
            print(f"{RED}Skipping profile tests - could not authenticate{RESET}")
    except Exception as e:
        print(f"{RED}Error running tests: {str(e)}{RESET}")
    
    summarize_results()
    
    # Return non-zero exit code if any tests failed
    if results["failed"] > 0:
        sys.exit(1)

if __name__ == "__main__":
    main() 