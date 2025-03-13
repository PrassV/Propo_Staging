#!/usr/bin/env python3
"""
Helper script to set up environment variables for the backend.
This will guide you through setting up the necessary variables.
"""

import os
import shutil
import sys
from dotenv import load_dotenv

def main():
    print("===== Propify Backend Environment Setup =====")
    print("This script will help you set up the necessary environment variables")
    print("for the Propify backend services.")
    
    # Check for existing .env files
    root_env_exists = os.path.exists(".env")
    backend_env_exists = os.path.exists("backend/.env")
    
    if root_env_exists:
        print("\nFound an existing .env file in the root directory.")
        if not backend_env_exists:
            print("Would you like to copy it to the backend directory? (yes/no)")
            response = input()
            if response.lower() in ["yes", "y"]:
                shutil.copy(".env", "backend/.env")
                print("Copied .env to backend/.env")
                backend_env_exists = True
    
    # Load environment variables from existing files
    load_dotenv()
    if backend_env_exists:
        load_dotenv("backend/.env")
    
    # Check for Supabase variables
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY")
    
    # Create a new .env file for the backend
    env_vars = {}
    
    print("\n1. Supabase Configuration")
    print("-------------------------")
    print("These are required for connecting to your Supabase database.")
    print("You can find these values in your Supabase project settings > API.")
    
    if supabase_url:
        print(f"Found existing SUPABASE_URL: {supabase_url}")
        use_existing = input("Use this value? (yes/no): ")
        if use_existing.lower() in ["yes", "y"]:
            env_vars["SUPABASE_URL"] = supabase_url
    
    if "SUPABASE_URL" not in env_vars:
        print("\nPlease enter your Supabase Project URL:")
        print("(Find this in Supabase Project Settings > API > Project URL)")
        supabase_url = input("SUPABASE_URL: ")
        if supabase_url:
            env_vars["SUPABASE_URL"] = supabase_url
    
    if supabase_key:
        print(f"\nFound existing Supabase API key (not showing for security)")
        use_existing = input("Use this value? (yes/no): ")
        if use_existing.lower() in ["yes", "y"]:
            env_vars["SUPABASE_SERVICE_ROLE_KEY"] = supabase_key
    
    if "SUPABASE_SERVICE_ROLE_KEY" not in env_vars:
        print("\nPlease enter your Supabase service role key:")
        print("(Find this in Supabase Project Settings > API > service_role)")
        supabase_key = input("SUPABASE_SERVICE_ROLE_KEY: ")
        if supabase_key:
            env_vars["SUPABASE_SERVICE_ROLE_KEY"] = supabase_key
    
    print("\n2. API Keys")
    print("-----------")
    
    # Anthropic API Key
    anthropic_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("VITE_ANTHROPIC_API_KEY")
    if anthropic_key:
        print(f"\nFound existing Anthropic API key (not showing for security)")
        use_existing = input("Use this value? (yes/no): ")
        if use_existing.lower() in ["yes", "y"]:
            env_vars["ANTHROPIC_API_KEY"] = anthropic_key
    
    if "ANTHROPIC_API_KEY" not in env_vars:
        print("\nPlease enter your Anthropic API key (required for agreement generation):")
        print("(Get this from https://console.anthropic.com)")
        anthropic_key = input("ANTHROPIC_API_KEY: ")
        if anthropic_key:
            env_vars["ANTHROPIC_API_KEY"] = anthropic_key
    
    # Resend API Key
    resend_key = os.getenv("RESEND_API_KEY") or os.getenv("VITE_RESEND_API_KEY")
    if resend_key:
        print(f"\nFound existing Resend API key (not showing for security)")
        use_existing = input("Use this value? (yes/no): ")
        if use_existing.lower() in ["yes", "y"]:
            env_vars["RESEND_API_KEY"] = resend_key
    
    if "RESEND_API_KEY" not in env_vars:
        print("\nPlease enter your Resend API key (optional - used for sending emails):")
        print("(Get this from https://resend.com)")
        resend_key = input("RESEND_API_KEY (press Enter to skip): ")
        if resend_key:
            env_vars["RESEND_API_KEY"] = resend_key
    
    # Other settings
    env_vars["ENVIRONMENT"] = "development"
    env_vars["FRONTEND_URL"] = os.getenv("FRONTEND_URL") or "http://localhost:3000"
    
    # Write to backend/.env file
    if len(env_vars) > 0:
        print("\nWriting environment variables to backend/.env")
        with open("backend/.env", "w") as f:
            for key, value in env_vars.items():
                f.write(f"{key}={value}\n")
        
        print("\n✅ Successfully created backend/.env file!")
        print("You can now run the verify_backend.py script to check if everything is working.")
    else:
        print("\n❌ No environment variables were set.")
        print("Please run this script again and provide the necessary values.")
    
    print("\nNote: If you need to update these values in the future, you can:")
    print("1. Edit the backend/.env file directly")
    print("2. Run this script again")

if __name__ == "__main__":
    main() 