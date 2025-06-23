import os
import uuid
import logging
from typing import List, Optional, Dict, Any
from fastapi import UploadFile, HTTPException, status
from supabase import Client

from app.config.settings import settings
from app.config.database import get_supabase_client

logger = logging.getLogger(__name__)

class PropertyImageService:
    """
    Clean property image service following S3-like patterns:
    1. Upload files to storage 
    2. Store only paths in database
    3. Generate URLs on-demand
    """
    
    def __init__(self):
        self.bucket_name = settings.PROPERTY_IMAGE_BUCKET  # "propertyimage"
    
    async def upload_property_images(
        self, 
        files: List[UploadFile], 
        property_id: str,
        user_id: str
    ) -> List[str]:
        """
        Upload property images to storage (S3-like pattern)
        
        Args:
            files: List of image files to upload
            property_id: Property ID for organization
            user_id: User ID for organization
            
        Returns:
            List of storage paths (not URLs)
        """
        if not files:
            return []
            
        storage_client = get_supabase_client()
        uploaded_paths = []
        
        for file in files:
            try:
                # Validate file type
                if not file.content_type or not file.content_type.startswith('image/'):
                    logger.warning(f"Skipping non-image file: {file.filename}")
                    continue
                
                # Validate file size (10MB limit)
                if file.size and file.size > 10 * 1024 * 1024:
                    logger.warning(f"Skipping oversized file: {file.filename}")
                    continue
                
                # Generate unique filename (S3-like pattern)
                file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
                unique_filename = f"{uuid.uuid4()}.{file_extension}"
                
                # Create structured path: user_id/property_id/filename
                storage_path = f"{user_id}/{property_id}/{unique_filename}"
                
                # Read file content
                content = await file.read()
                if not content:
                    logger.warning(f"Skipping empty file: {file.filename}")
                    continue
                
                # Upload to Supabase storage (like S3)
                upload_response = storage_client.storage.from_(self.bucket_name).upload(
                    path=storage_path,
                    file=content,
                    file_options={
                        "content-type": file.content_type,
                        "cache-control": "3600"
                    }
                )
                
                # Check for upload errors
                if hasattr(upload_response, 'error') and upload_response.error:
                    logger.error(f"Upload failed for {file.filename}: {upload_response.error}")
                    continue
                
                # Store the path (not URL)
                uploaded_paths.append(storage_path)
                logger.info(f"Successfully uploaded: {file.filename} -> {storage_path}")
                
            except Exception as e:
                logger.error(f"Error uploading {file.filename}: {str(e)}")
                continue
        
        return uploaded_paths
    
    async def get_property_image_urls(
        self, 
        image_paths: List[str], 
        expires_in: int = 3600
    ) -> List[str]:
        """
        Generate public URLs for property images (S3-like pattern)
        
        Args:
            image_paths: List of storage paths
            expires_in: URL expiration (not used for public buckets)
            
        Returns:
            List of public URLs
        """
        if not image_paths:
            return []
            
        storage_client = get_supabase_client()
        urls = []
        
        for path in image_paths:
            try:
                # Generate public URL (property images are public)
                public_url_response = storage_client.storage.from_(self.bucket_name).get_public_url(path)
                
                if public_url_response:
                    urls.append(public_url_response)
                    
            except Exception as e:
                logger.error(f"Error generating URL for {path}: {str(e)}")
                continue
        
        return urls
    
    async def delete_property_image(self, storage_path: str) -> bool:
        """
        Delete property image from storage (S3-like pattern)
        
        Args:
            storage_path: Storage path to delete
            
        Returns:
            True if deleted successfully
        """
        try:
            storage_client = get_supabase_client()
            
            delete_response = storage_client.storage.from_(self.bucket_name).remove([storage_path])
            
            if hasattr(delete_response, 'error') and delete_response.error:
                logger.error(f"Delete failed for {storage_path}: {delete_response.error}")
                return False
                
            logger.info(f"Successfully deleted: {storage_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting {storage_path}: {str(e)}")
            return False
    
    def validate_image_file(self, file: UploadFile) -> bool:
        """
        Validate image file (S3-like validation)
        
        Args:
            file: Uploaded file to validate
            
        Returns:
            True if valid image file
        """
        # Check file type
        if not file.content_type or not file.content_type.startswith('image/'):
            return False
            
        # Check file size (10MB limit)
        if file.size and file.size > 10 * 1024 * 1024:
            return False
            
        # Check allowed extensions
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
        if file.filename:
            file_ext = '.' + file.filename.split('.')[-1].lower()
            if file_ext not in allowed_extensions:
                return False
        
        return True

# Create service instance
property_image_service = PropertyImageService() 