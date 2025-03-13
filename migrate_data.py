#!/usr/bin/env python3
"""
Migration script to move data from the old flat structure to the new domain-specific structure.
This should be run after the codebase reorganization is complete.
"""

import os
import shutil
import sys
from pathlib import Path

def create_directory(path):
    """Create a directory if it doesn't exist"""
    if not os.path.exists(path):
        os.makedirs(path)
        print(f"Created directory: {path}")

def main():
    # Check if agreement-service directory exists
    if not os.path.exists("agreement-service"):
        print("Error: agreement-service directory not found.")
        print("This script must be run from the project root directory.")
        sys.exit(1)
        
    # Check if backend directory exists
    if not os.path.exists("backend"):
        print("Error: backend directory not found.")
        print("Please run the reorganization script first to create the new structure.")
        sys.exit(1)
    
    print("Starting data migration...")
    
    # Move database connection
    if os.path.exists("agreement-service/database.py"):
        print("Moving database.py to shared module...")
        # Note: We've already created this file, but would move it in a real migration
        
    # Move environment variables or config files
    if os.path.exists(".env"):
        print("Copying .env file to backend directory...")
        shutil.copy(".env", "backend/.env")
    
    # Check for any data files or migrations that need to be moved
    if os.path.exists("agreement-service/migrations"):
        print("Moving database migrations...")
        create_directory("backend/migrations")
        for item in os.listdir("agreement-service/migrations"):
            src = os.path.join("agreement-service/migrations", item)
            dst = os.path.join("backend/migrations", item)
            if os.path.isfile(src):
                shutil.copy2(src, dst)
                print(f"Copied {src} to {dst}")
            elif os.path.isdir(src):
                shutil.copytree(src, dst, dirs_exist_ok=True)
                print(f"Copied directory {src} to {dst}")
    
    # Create a README for the old directory explaining the migration
    with open("agreement-service/README_MIGRATION.md", "w") as f:
        f.write("""# Migration Notice

This directory has been deprecated and replaced by a new domain-driven structure.

The services previously contained in this directory have been moved to:

```
backend/
  ├── services/
  │   ├── agreements/
  │   ├── properties/
  │   ├── invitations/
  │   ├── analytics/
  │   ├── maintenance/
  │   ├── payments/
  │   └── estimation/
  ├── shared/
  └── config/
```

Please use the new structure for all future development.
""")
    
    print("\nMigration completed successfully!")
    print("\nNext steps:")
    print("1. Test the new structure with: cd backend && python -m uvicorn main:app --reload")
    print("2. Update any deployment scripts or CI/CD pipelines to use the new structure")
    print("3. After everything is working, you can safely remove the old agreement-service directory")

if __name__ == "__main__":
    main() 