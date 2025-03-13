from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Depends, Request
from typing import List, Optional
import os
import json

# Import our storage utilities
from shared.storage import (
    verify_bucket_access,
    get_signed_url,
    get_public_url,
    upload_file,
    delete_files
)

# Create router
router = APIRouter(
    prefix="/storage",
    tags=["storage"],
    responses={404: {"description": "Not found"}},
)

@router.get("/verify-bucket")
async def verify_bucket(bucket_name: str = "propertyimage"):
    """Verify bucket access and return bucket information"""
    result = await verify_bucket_access(bucket_name)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Bucket access verification failed"))
    
    return result

@router.get("/signed-url")
async def get_file_signed_url(
    bucket_name: str = Query("propertyimage", description="Storage bucket name"),
    file_path: str = Query(..., description="Path to the file within the bucket"),
    expires_in: int = Query(60, description="Expiration time in seconds")
):
    """Generate a signed URL for file access"""
    result = await get_signed_url(bucket_name, file_path, expires_in)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to generate signed URL"))
    
    return result

@router.get("/public-url")
async def get_file_public_url(
    bucket_name: str = Query("propertyimage", description="Storage bucket name"),
    file_path: str = Query(..., description="Path to the file within the bucket")
):
    """Get public URL for a file"""
    result = await get_public_url(bucket_name, file_path)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to get public URL"))
    
    return result

@router.post("/upload")
async def upload_file_endpoint(
    file: UploadFile = File(...),
    bucket_name: str = Form("propertyimage"),
    file_path: Optional[str] = Form(None)
):
    """Upload a file to storage"""
    result = await upload_file(bucket_name, file, file_path)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to upload file"))
    
    return result

@router.delete("/delete")
async def delete_files_endpoint(
    bucket_name: str = Query("propertyimage", description="Storage bucket name"),
    file_paths: str = Query(..., description="JSON array of file paths to delete")
):
    """Delete files from storage"""
    try:
        # Parse file paths from JSON string
        paths = json.loads(file_paths)
        
        if not isinstance(paths, list):
            raise HTTPException(status_code=400, detail="file_paths must be a JSON array")
        
        result = await delete_files(bucket_name, paths)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to delete files"))
        
        return result
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in file_paths") 