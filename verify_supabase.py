#!/usr/bin/env python3
"""
Verify Supabase Setup Script

This script checks if your Supabase project has all the required tables and storage buckets
needed for the application to function properly.
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables from .env file
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Missing Supabase credentials in environment variables")
    print("Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file")
    sys.exit(1)

# Initialize Supabase client
print(f"🔄 Connecting to Supabase at {SUPABASE_URL}")
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Connected to Supabase successfully")
except Exception as e:
    print(f"❌ Error connecting to Supabase: {str(e)}")
    sys.exit(1)

# Check required database tables
required_tables = [
    "properties",
    "invitations", 
    "agreements",
    "users",
    "maintenance_requests",
    "payments"
]

print("\n🔍 Checking database tables...")
missing_tables = []

for table in required_tables:
    try:
        # Try to query the table to see if it exists
        print(f"  Checking table '{table}'...")
        response = supabase.table(table).select("*").limit(1).execute()
        print(f"  ✅ Table '{table}' exists")
    except Exception as e:
        error_str = str(e)
        if "relation" in error_str and "does not exist" in error_str:
            print(f"  ❌ Table '{table}' does not exist")
            missing_tables.append(table)
        else:
            print(f"  ⚠️ Error checking table '{table}': {error_str}")

# Check required storage buckets
required_buckets = ["propertyimage"]

print("\n🔍 Checking storage buckets...")
missing_buckets = []

for bucket in required_buckets:
    try:
        # Try to list files in the bucket to see if it exists
        print(f"  Checking bucket '{bucket}'...")
        supabase.storage.from_(bucket).list()
        print(f"  ✅ Bucket '{bucket}' exists")
    except Exception as e:
        error_str = str(e)
        if "does not exist" in error_str.lower():
            print(f"  ❌ Bucket '{bucket}' does not exist")
            missing_buckets.append(bucket)
        else:
            print(f"  ⚠️ Error checking bucket '{bucket}': {error_str}")

# Summary
print("\n📋 Summary:")
if missing_tables:
    print(f"  ❌ Missing tables: {', '.join(missing_tables)}")
else:
    print("  ✅ All required database tables exist")

if missing_buckets:
    print(f"  ❌ Missing storage buckets: {', '.join(missing_buckets)}")
else:
    print("  ✅ All required storage buckets exist")

if missing_tables or missing_buckets:
    print("\n⚠️ Action Required:")
    
    if missing_tables:
        print("\n📝 SQL to create missing tables:")
        print("---------------------------")
        print("-- Run this in the Supabase SQL Editor:")
        print("---------------------------")
        
        if "invitations" in missing_tables:
            print("""
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL,
    recipient_email TEXT NOT NULL,
    property_id UUID,
    status TEXT NOT NULL DEFAULT 'pending',
    invitation_type TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

-- Add RLS policies for invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
""")
        
        if "properties" in missing_tables:
            print("""
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    property_name TEXT NOT NULL,
    property_type TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'India',
    survey_number TEXT,
    door_number TEXT,
    size_sqft INTEGER NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    kitchens INTEGER,
    garages INTEGER,
    garage_size INTEGER,
    year_built INTEGER,
    floors INTEGER,
    price DECIMAL(12,2),
    yearly_tax_rate DECIMAL(5,2),
    category TEXT,
    listed_in TEXT,
    amenities TEXT[],
    description TEXT,
    image_urls TEXT[],
    image_paths TEXT[],
    image_names TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
""")
    
    if missing_buckets:
        print("\n🗄️ Instructions to create missing storage buckets:")
        print("1. Go to your Supabase Dashboard")
        print("2. Navigate to Storage")
        print("3. Click 'New Bucket'")
        print("4. Enter the bucket name and create it")
        print("5. For each bucket, set up the appropriate RLS policies")
        
        for bucket in missing_buckets:
            print(f"   - Create bucket: {bucket}")
else:
    print("\n🎉 Success! Your Supabase project is properly configured.") 