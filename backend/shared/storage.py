import os
from typing import List, Optional, Dict, Any
from fastapi import UploadFile, HTTPException
import asyncio
import uuid
from datetime import datetime, timedelta

# Import the shared Supabase client
from .database import supabase_client

async def verify_bucket_access(bucket_name: str = "propertyimage") -> Dict[str, Any]:
    """
    Verify access to a Supabase storage bucket and return bucket information
    """
    try:
        # List files to verify access
        response = supabase_client.storage.from_(bucket_name).list()
        return {"success": True, "message": f"Successfully accessed bucket: {bucket_name}", "files_count": len(response)}
    except Exception as e:
        return {"success": False, "message": f"Failed to access bucket: {bucket_name}", "error": str(e)}

async def get_signed_url(
    bucket_name: str, 
    file_path: str, 
    expires_in: int = 60
) -> Dict[str, Any]:
    """
    Generate a signed URL for a file in Supabase storage
    
    Args:
        bucket_name: Name of the storage bucket
        file_path: Path to the file within the bucket
        expires_in: Expiration time in seconds (default: 60)
        
    Returns:
        Dictionary containing the signed URL and expiration
    """
    try:
        response = supabase_client.storage.from_(bucket_name).create_signed_url(
            path=file_path,
            expires_in=expires_in
        )
        
        if "error" in response and response["error"]:
            return {"success": False, "error": response["error"]}
            
        return {
            "success": True,
            "signed_url": response["signedURL"],
            "expires_at": (datetime.now() + timedelta(seconds=expires_in)).isoformat()
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

async def get_public_url(bucket_name: str, file_path: str) -> Dict[str, Any]:
    """Get a public URL for a file in Supabase storage"""
    try:
        public_url = supabase_client.storage.from_(bucket_name).get_public_url(file_path)
        return {"success": True, "public_url": public_url}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def upload_file(
    bucket_name: str,
    file: UploadFile,
    file_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Upload a file to Supabase storage
    
    Args:
        bucket_name: Name of the storage bucket
        file: The file to upload
        file_path: Path in the bucket (if None, a random path will be generated)
        
    Returns:
        Dictionary with upload status information
    """
    try:
        # Validate file is not None
        if file is None:
            return {"success": False, "error": "No file provided"}
        
        # Reset file position to beginning to ensure we can read it
        await file.seek(0)
        
        # Read file content
        content = await file.read()
        
        # Validate content
        if content is None or len(content) == 0:
            return {"success": False, "error": "File content is empty or could not be read"}
        
        # Generate file path if not provided
        if not file_path:
            file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
            file_path = f"{uuid.uuid4()}{file_ext}"
        
        # Set default content type if None
        content_type = file.content_type or "application/octet-stream"
        
        # Upload file
        print(f"Uploading file to {bucket_name}/{file_path}, size: {len(content)} bytes, type: {content_type}")
        response = supabase_client.storage.from_(bucket_name).upload(
            path=file_path,
            file=content,
            file_options={"content-type": content_type}
        )
        
        # Check for error in response
        if response and hasattr(response, 'error') and response.error:
            print(f"Supabase upload error: {response.error}")
            return {"success": False, "error": str(response.error)}
            
        # Get public URL
        public_url = supabase_client.storage.from_(bucket_name).get_public_url(file_path)
        
        return {
            "success": True,
            "file_path": file_path,
            "public_url": public_url,
            "content_type": content_type,
            "size": len(content)
        }
    except Exception as e:
        print(f"Exception in upload_file: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}

async def delete_files(bucket_name: str, file_paths: List[str]) -> Dict[str, Any]:
    """Delete one or more files from Supabase storage"""
    try:
        response = supabase_client.storage.from_(bucket_name).remove(file_paths)
        
        if response and response.get("message") == "Successfully deleted":
            return {
                "success": True, 
                "deleted_count": len(file_paths),
                "deleted_files": file_paths
            }
        return {"success": False, "error": "Unknown error during deletion"}
    except Exception as e:
        return {"success": False, "error": str(e)} 