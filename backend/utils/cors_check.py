"""
Utility module to check and diagnose CORS issues
"""
import os
import sys
import requests
from urllib.parse import urlparse
from fastapi import FastAPI
from fastapi.testclient import TestClient

def check_cors_config():
    """
    Print the current CORS configuration from environment variables
    """
    from config.settings import CORS_ORIGINS
    
    print("=== CORS Configuration ===")
    print(f"Allowed Origins: {CORS_ORIGINS}")
    print(f"DEBUG mode: {os.getenv('ENVIRONMENT', 'development') == 'development'}")
    print(f"FRONTEND_URL: {os.getenv('FRONTEND_URL', 'Not set')}")
    
    return CORS_ORIGINS

def test_cors_preflight(app: FastAPI, origin: str):
    """
    Test a CORS preflight request from the specified origin
    """
    client = TestClient(app)
    
    print(f"\n=== Testing CORS Preflight from {origin} ===")
    
    # Test OPTIONS request (preflight)
    headers = {
        "Origin": origin,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Content-Type, Authorization"
    }
    
    response = client.options("/", headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print("Response Headers:")
    for key, value in response.headers.items():
        if key.startswith("access-control"):
            print(f"  {key}: {value}")
    
    # Check if the origin is allowed
    if "Access-Control-Allow-Origin" in response.headers:
        if response.headers["Access-Control-Allow-Origin"] == origin or response.headers["Access-Control-Allow-Origin"] == "*":
            print("\n✅ Origin is allowed")
        else:
            print(f"\n❌ Origin is not explicitly allowed. Got: {response.headers['Access-Control-Allow-Origin']}")
    else:
        print("\n❌ No Access-Control-Allow-Origin header in response")
    
    return response

def main():
    """
    Run CORS diagnostics for the current environment
    """
    # Add parent directory to path
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    
    # Import app
    from main import app
    
    # Get current CORS config
    allowed_origins = check_cors_config()
    
    # Test preflight for each allowed origin
    for origin in allowed_origins:
        if origin != "*":  # Skip wildcard
            test_cors_preflight(app, origin)
    
    # Test with a common frontend origin
    test_cors_preflight(app, "https://propo-staging.vercel.app")
    
    print("\n=== CORS Diagnostics Complete ===")

if __name__ == "__main__":
    main() 