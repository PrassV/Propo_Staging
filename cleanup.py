#!/usr/bin/env python3
"""
Cleanup script to remove old agreement-service directory after successful migration.
This should only be run after verifying the new structure works correctly.
"""

import os
import shutil
import sys

def main():
    print("WARNING: This script will permanently delete the agreement-service directory.")
    print("Make sure you have:")
    print("1. Successfully migrated all data using migrate_data.py")
    print("2. Verified the new backend structure works correctly")
    print("3. Backed up any important files if needed")
    
    confirm = input("\nAre you sure you want to proceed? (yes/no): ")
    if confirm.lower() != "yes":
        print("Cleanup aborted.")
        sys.exit(0)
    
    # Check if agreement-service directory exists
    if not os.path.exists("agreement-service"):
        print("Error: agreement-service directory not found. Nothing to clean up.")
        sys.exit(1)
    
    # Remove the old directory
    print("\nRemoving agreement-service directory...")
    try:
        shutil.rmtree("agreement-service")
        print("Successfully removed agreement-service directory.")
    except Exception as e:
        print(f"Error removing directory: {str(e)}")
        sys.exit(1)
    
    print("\nCleanup completed successfully!")
    print("\nThe codebase now uses the new structured backend architecture.")
    print("Remember to update any deployment scripts or documentation to reflect the new structure.")

if __name__ == "__main__":
    main() 