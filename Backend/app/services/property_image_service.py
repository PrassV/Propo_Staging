import os
import uuid
import logging
from typing import List, Optional, Dict, Any
from fastapi import UploadFile, HTTPException, status
from supabase import Client

from app.config.settings import settings
from app.config.database import supabase_service_role_client
from app.utils.storage import storage_service, upload_property_image

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
        Upload property images using unified storage service
        
        Args:
            files: List of image files to upload
            property_id: Property ID for organization
            user_id: User ID for organization
            
        Returns:
            List of storage paths (not URLs)
        """
        if not files:
            return []
            
        uploaded_paths = []
        
        for file in files:
            try:
                # Validate file using unified service
                if not storage_service.validate_file(await file.read(), file.filename, 'property_images')['valid']:
                    logger.warning(f"File validation failed for: {file.filename}")
                    await file.seek(0)  # Reset file pointer
                    continue
                
                # Reset file pointer after validation
                await file.seek(0)
                
                # Read file content
                content = await file.read()
                if not content:
                    logger.warning(f"Skipping empty file: {file.filename}")
                    continue
                
                # Upload using unified storage service
                upload_result = upload_property_image(
                    file_content=content,
                    filename=file.filename,
                    property_id=property_id,
                    category='general'
                )
                
                if upload_result['success']:
                    uploaded_paths.append(upload_result['file_path'])
                    logger.info(f"Successfully uploaded: {file.filename} -> {upload_result['file_path']}")
                else:
                    logger.error(f"Upload failed for {file.filename}: {upload_result.get('error', 'Unknown error')}")
                    continue
                
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
        Generate public URLs for property images using unified storage service
        
        Args:
            image_paths: List of storage paths
            expires_in: URL expiration (not used for public buckets)
            
        Returns:
            List of public URLs
        """
        if not image_paths:
            return []
            
        urls = []
        
        for path in image_paths:
            try:
                # Skip empty or invalid paths
                if not path or not isinstance(path, str):
                    logger.warning(f"Skipping invalid image path: {path}")
                    continue
                
                # Use unified storage service to get public URL
                # For property images (public bucket), we can get public URL directly
                storage_client = supabase_service_role_client
                public_url_response = storage_client.storage.from_(self.bucket_name).get_public_url(path)
                
                if public_url_response:
                    urls.append(public_url_response)
                    
            except Exception as e:
                logger.warning(f"Error generating URL for {path}: {str(e)}")
                continue
        
        return urls
    
    async def delete_property_image(self, storage_path: str) -> bool:
        """
        Delete property image using unified storage service
        
        Args:
            storage_path: Storage path to delete
            
        Returns:
            True if deleted successfully
        """
        try:
            # Use unified storage service for deletion
            success = storage_service.delete_file(storage_path, self.bucket_name)
            
            if success:
                logger.info(f"Successfully deleted: {storage_path}")
            else:
                logger.error(f"Delete failed for {storage_path}")
                
            return success
            
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