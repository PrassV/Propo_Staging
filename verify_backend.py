#!/usr/bin/env python3
"""
Verification script to check if the new backend structure is working correctly.
This should be run before the final cleanup to ensure everything is working.
"""

import os
import sys
import subprocess
import time
import requests
import signal
import shutil
from dotenv import load_dotenv

def run_command(command, cwd=None):
    """Run a shell command and return the output"""
    try:
        return subprocess.check_output(command, shell=True, cwd=cwd, stderr=subprocess.STDOUT).decode('utf-8')
    except subprocess.CalledProcessError as e:
        return f"Error: {e.output.decode('utf-8')}"

def is_port_in_use(port):
    """Check if a port is in use"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def check_env_vars():
    """Check for necessary environment variables and guide how to set them"""
    # Load root .env file
    load_dotenv()
    
    # Check if backend .env exists, if not copy from root
    if not os.path.exists("backend/.env") and os.path.exists(".env"):
        print("Copying .env file to backend directory...")
        shutil.copy(".env", "backend/.env")
    
    # Load backend .env
    load_dotenv("backend/.env")
    
    # Variables to check
    required_vars = {
        "SUPABASE_URL": ["VITE_SUPABASE_URL"],
        "SUPABASE_SERVICE_ROLE_KEY": ["VITE_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY", "VITE_SUPABASE_KEY"],
        "ANTHROPIC_API_KEY": ["VITE_ANTHROPIC_API_KEY"],
    }
    
    missing_vars = []
    
    for main_var, alternates in required_vars.items():
        if not os.getenv(main_var):
            # Check alternates
            found = False
            for alt in alternates:
                if os.getenv(alt):
                    found = True
                    break
            
            if not found:
                all_names = [main_var] + alternates
                missing_vars.append(all_names)
    
    # If missing vars, guide the user
    if missing_vars:
        print("\n⚠️ Environment Variables Missing ⚠️")
        print("The following environment variables are missing from your .env files:")
        
        for var_group in missing_vars:
            print(f"  - Any of these: {', '.join(var_group)}")
        
        print("\nHow to fix:")
        
        if any("SUPABASE" in v[0] for v in missing_vars):
            print("\n1. For Supabase variables:")
            print("   a. Go to https://supabase.com and sign in")
            print("   b. Open your project")
            print("   c. Go to Project Settings > API")
            print("   d. For SUPABASE_URL, use the 'Project URL'")
            print("   e. For SUPABASE_SERVICE_ROLE_KEY, use the 'service_role' key (keep this secret!)")
        
        if any("ANTHROPIC" in v[0] for v in missing_vars):
            print("\n2. For Anthropic API key:")
            print("   a. Go to https://console.anthropic.com/")
            print("   b. Create or use an existing API key")
        
        print("\nAdd these variables to your backend/.env file.")
        print("Would you like to create a sample .env file in the backend directory? (yes/no)")
        
        response = input()
        if response.lower() in ["yes", "y"]:
            if not os.path.exists("backend/.env.example"):
                print("Error: backend/.env.example not found. Please create it manually.")
            else:
                shutil.copy("backend/.env.example", "backend/.env")
                print("Created backend/.env from the example file. Please fill in the values.")
            
            print("After updating your environment variables, run this script again.")
            return False
        
    return True

def main():
    print("Starting backend verification...")
    
    # Check if backend directory exists
    if not os.path.exists("backend"):
        print("Error: backend directory not found.")
        sys.exit(1)
    
    # Check if required files exist
    required_files = [
        "backend/main.py",
        "backend/requirements.txt",
        "backend/shared/database.py",
        "backend/services/agreements/router.py",
        "backend/services/properties/router.py"
    ]
    
    missing_files = [f for f in required_files if not os.path.exists(f)]
    if missing_files:
        print("Error: The following required files are missing:")
        for f in missing_files:
            print(f"  - {f}")
        sys.exit(1)
    
    # Check environment variables
    if not check_env_vars():
        print("Please fix environment variables before continuing.")
        sys.exit(1)
    
    # Check if port 8000 is already in use
    if is_port_in_use(8000):
        print("Error: Port 8000 is already in use. Please stop any running FastAPI servers and try again.")
        sys.exit(1)
    
    # Start the FastAPI server
    print("\nStarting the FastAPI server...")
    server_process = subprocess.Popen(
        ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd="backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        preexec_fn=os.setsid
    )
    
    # Give the server time to start
    print("Waiting for server to start...")
    time.sleep(3)
    
    # Check if server started successfully
    if server_process.poll() is not None:
        stdout, stderr = server_process.communicate()
        print(f"Error: Server failed to start.\nStdout: {stdout.decode('utf-8')}\nStderr: {stderr.decode('utf-8')}")
        sys.exit(1)
    
    # Test the API endpoints
    try:
        # Test root endpoint
        print("\nTesting root endpoint...")
        response = requests.get("http://localhost:8000/")
        if response.status_code == 200:
            print(f"Success: Root endpoint returned {response.status_code}")
            print(f"Response: {response.json()}")
        else:
            print(f"Error: Root endpoint returned {response.status_code}")
            print(f"Response: {response.text}")
        
        # Test docs endpoint
        print("\nTesting OpenAPI docs endpoint...")
        response = requests.get("http://localhost:8000/docs")
        if response.status_code == 200:
            print(f"Success: OpenAPI docs endpoint returned {response.status_code}")
        else:
            print(f"Error: OpenAPI docs endpoint returned {response.status_code}")
            print(f"Response: {response.text}")
        
    except requests.exceptions.ConnectionError:
        print("Error: Failed to connect to the server. The server may not have started correctly.")
    except Exception as e:
        print(f"Error during testing: {str(e)}")
    finally:
        # Stop the server
        print("\nStopping the FastAPI server...")
        try:
            os.killpg(os.getpgid(server_process.pid), signal.SIGTERM)
            server_process.wait(timeout=5)
            print("Server stopped successfully.")
        except:
            print("Warning: Failed to stop the server gracefully. You may need to stop it manually.")
    
    print("\nVerification completed.")
    print("If all tests passed, you can safely run the cleanup script to remove the old files.")

if __name__ == "__main__":
    main() 