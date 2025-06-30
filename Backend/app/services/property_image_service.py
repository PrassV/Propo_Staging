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
    
    def _is_legacy_path(self, path: str) -> bool:
        """
        Check if a path is in the legacy format (user_id/filename.ext)
        vs new secure format (users/user_id/properties/property_id/category/filename.ext)
        """
        if not path:
            return False
        
        # Legacy paths have format: {user_id}/{filename}
        # New secure paths have format: users/{user_id}/properties/{property_id}/...
        parts = path.split('/')
        
        # Legacy paths typically have 2 parts: user_id/filename
        # New paths have 5+ parts: users/user_id/properties/property_id/category/filename
        if len(parts) == 2:
            # Check if first part looks like a UUID (user_id)
            try:
                uuid.UUID(parts[0])
                return True
            except ValueError:
                pass
        
        return False
    
    def _convert_legacy_path_to_url(self, legacy_path: str) -> Optional[str]:
        """
        Convert legacy path format to public URL
        Legacy format: {user_id}/{filename}
        Public URL: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
        """
        try:
            if not legacy_path:
                return None
            
            # For legacy paths, construct the full public URL directly
            base_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{self.bucket_name}"
            public_url = f"{base_url}/{legacy_path}"
            
            logger.debug(f"Converted legacy path {legacy_path} to URL: {public_url}")
            return public_url
            
        except Exception as e:
            logger.warning(f"Error converting legacy path {legacy_path}: {str(e)}")
            return None
    
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
                    user_id=user_id,  # Add user_id parameter
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
        Generate public URLs for property images with backward compatibility
        Handles both legacy and new secure path formats
        
        Args:
            image_paths: List of storage paths (legacy or new format)
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
                
                # Check if this is already a full URL (avoid double URL construction)
                if path.startswith('http'):
                    logger.debug(f"Path is already a full URL: {path}")
                    urls.append(path)
                    continue
                
                # Check if this is a legacy path
                if self._is_legacy_path(path):
                    logger.debug(f"Processing legacy path: {path}")
                    
                    # Handle legacy path format
                    public_url = self._convert_legacy_path_to_url(path)
                    if public_url:
                        urls.append(public_url)
                        logger.debug(f"Legacy path converted to URL: {public_url}")
                    else:
                        logger.warning(f"Failed to convert legacy path: {path}")
                        
                else:
                    logger.debug(f"Processing new secure path: {path}")
                    
                    # Handle new secure path format - construct public URL manually
                    try:
                        # For new secure paths, construct the full public URL directly
                        base_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{self.bucket_name}"
                        public_url = f"{base_url}/{path}"
                        
                        urls.append(public_url)
                        logger.debug(f"New path converted to URL: {public_url}")
                        
                    except Exception as storage_error:
                        logger.warning(f"Error constructing URL for path {path}: {str(storage_error)}")
                        
                        # Fallback: try treating as legacy path
                        logger.debug(f"Attempting legacy conversion as fallback for: {path}")
                        fallback_url = self._convert_legacy_path_to_url(path)
                        if fallback_url:
                            urls.append(fallback_url)
                            logger.debug(f"Fallback legacy conversion successful: {fallback_url}")
                        else:
                            logger.error(f"All conversion attempts failed for path: {path}")
                    
            except Exception as e:
                logger.warning(f"Error processing image path {path}: {str(e)}")
                continue
        
        logger.info(f"Converted {len(urls)} image paths to URLs (from {len(image_paths)} total paths)")
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
property_image_service = PropertyImageService() # Deployment trigger comment
