#!/usr/bin/env python3
"""
Simple script to start FastAPI server with correct environment variables
"""
import os
import sys
import subprocess
import time
import requests
import signal

# Set environment variables for Supabase
os.environ['SUPABASE_URL'] = 'https://oniudnupeazkagtbsxtt.supabase.co'
os.environ['SUPABASE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaXVkbnVwZWF6a2FndGJzeHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2NTg2NzIsImV4cCI6MjA1MDIzNDY3Mn0.IOk5CYAd_hBCIwNOYNBDiNDytVGKDbenINVADadkx6g'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaXVkbnVwZWF6a2FndGJzeHR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDY1ODY3MiwiZXhwIjoyMDUwMjM0NjcyfQ.kF_iq8OOlqnlbkFyMLPXN1wL_cTu7KBozmdmCdMsC5Y'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key-for-development'
os.environ['JWT_ALGORITHM'] = 'HS256'

def test_endpoints():
    """Test that our key endpoints are accessible"""
    print("\n🔍 Testing API Endpoints...")
    
    base_url = "http://localhost:8000"
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint working")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health endpoint error: {e}")
    
    # Test API documentation
    try:
        response = requests.get(f"{base_url}/docs", timeout=5)
        if response.status_code == 200:
            print("✅ API documentation accessible")
        else:
            print(f"❌ API docs failed: {response.status_code}")
    except Exception as e:
        print(f"❌ API docs error: {e}")
    
    # Test that key endpoints are defined (should return 401/422 not 404)
    endpoints_to_test = [
        "/payments/",
        "/dashboard/summary",
        "/maintenance/",
    ]
    
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            if response.status_code in [401, 422]:  # Auth required or validation error = good
                print(f"✅ {endpoint} endpoint exists (returned {response.status_code})")
            elif response.status_code == 404:
                print(f"❌ {endpoint} endpoint NOT FOUND")
            else:
                print(f"ℹ️  {endpoint} endpoint returned {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} endpoint error: {e}")

def main():
    print("🚀 Starting FastAPI Server Test...")
    
    # Start server in background
    print("📡 Starting server...")
    try:
        server_process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", 
            "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000",
            "--reload"
        ], env=os.environ.copy())
        
        # Wait for server to start
        print("⏱️  Waiting for server to start...")
        time.sleep(8)
        
        # Test endpoints
        test_endpoints()
        
        print("\n🎯 Server is running!")
        print("📖 API Documentation: http://localhost:8000/docs")
        print("🔍 Health Check: http://localhost:8000/health")
        print("\n🛑 Press Ctrl+C to stop the server")
        
        # Keep running until interrupted
        try:
            server_process.wait()
        except KeyboardInterrupt:
            print("\n🛑 Stopping server...")
            server_process.terminate()
            server_process.wait()
            print("✅ Server stopped")
            
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

if __name__ == "__main__":
    main() 