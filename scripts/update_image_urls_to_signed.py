#!/usr/bin/env python3
"""
Script to update existing property image URLs in the database to use signed URLs.
This script will:
1. Fetch all properties from the database
2. For each property, generate signed URLs for all images
3. Update the property with the new signed URLs
"""

import os
import sys
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Get Supabase credentials from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase environment variables.")
    print("Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file.")
    sys.exit(1)

# Initialize Supabase client
supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_signed_url(bucket_name: str, file_path: str, expiration_days: int = 7) -> str:
    """Generate a signed URL for a file with a specified expiration time in days"""
    try:
        expiration_seconds = expiration_days * 24 * 60 * 60  # Convert days to seconds
        response = supabase_client.storage.from_(bucket_name).create_signed_url(
            path=file_path,
            expires_in=expiration_seconds
        )
        
        if hasattr(response, 'error') and response.error:
            print(f"Error generating signed URL: {response.error}")
            # Fall back to public URL if signed URL generation fails
            return supabase_client.storage.from_(bucket_name).get_public_url(file_path)
            
        return response.data.get('signedUrl')
    except Exception as e:
        print(f"Exception generating signed URL: {str(e)}")
        # Fall back to public URL if there's an exception
        return supabase_client.storage.from_(bucket_name).get_public_url(file_path)

async def update_property_image_urls(property_id: str, image_paths: list) -> None:
    """Update a property's image URLs to use signed URLs"""
    try:
        # Generate signed URLs for all image paths
        image_urls = []
        for path in image_paths:
            signed_url = generate_signed_url("propertyimage", path)
            image_urls.append(signed_url)
            print(f"Generated signed URL for {path}")
        
        # Update the property with the new signed URLs
        response = supabase_client.table("properties").update({
            "image_urls": image_urls
        }).eq("id", property_id).execute()
        
        if hasattr(response, 'error') and response.error:
            print(f"Error updating property {property_id}: {response.error}")
        else:
            print(f"Successfully updated property {property_id} with {len(image_urls)} signed URLs")
    except Exception as e:
        print(f"Exception updating property {property_id}: {str(e)}")

async def main():
    try:
        print("Fetching properties from database...")
        response = supabase_client.table("properties").select("id, image_paths").execute()
        
        if hasattr(response, 'error') and response.error:
            print(f"Error fetching properties: {response.error}")
            return
        
        properties = response.data
        print(f"Found {len(properties)} properties")
        
        # Update each property's image URLs
        for property_data in properties:
            property_id = property_data.get("id")
            image_paths = property_data.get("image_paths", [])
            
            if not image_paths:
                print(f"Property {property_id} has no images, skipping")
                continue
            
            print(f"Updating {len(image_paths)} image URLs for property {property_id}")
            await update_property_image_urls(property_id, image_paths)
        
        print("Finished updating all property image URLs")
    except Exception as e:
        print(f"Error in main function: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main()) 