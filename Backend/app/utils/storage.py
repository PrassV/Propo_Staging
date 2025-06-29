"""
Unified Storage Service for Supabase Storage
Handles all file uploads, downloads, and management across different contexts
"""

import os
import uuid
import mimetypes
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
import logging

from supabase import create_client, Client
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# Storage configuration for different contexts
STORAGE_CONFIG = {
    'property_images': {
        'bucket': 'propertyimage',
        'max_size': 10 * 1024 * 1024,  # 10MB
        'allowed_types': ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
        'path_template': 'properties/{property_id}/{category}/{filename}'
    },
    'tenant_documents': {
        'bucket': 'tenant-documents',
        'max_size': 25 * 1024 * 1024,  # 25MB
        'allowed_types': [
            'application/pdf', 'image/jpeg', 'image/png', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        'path_template': 'tenants/{tenant_id}/documents/{filename}'
    },
    'maintenance_files': {
        'bucket': 'maintenance-files',
        'max_size': 15 * 1024 * 1024,  # 15MB
        'allowed_types': ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'],
        'path_template': 'maintenance/{property_id}/{filename}'
    },
    'agreements': {
        'bucket': 'agreements',
        'max_size': 50 * 1024 * 1024,  # 50MB
        'allowed_types': ['application/pdf'],
        'path_template': 'agreements/{property_id}/{filename}'
    },
    'id_documents': {
        'bucket': 'id-documents',
        'max_size': 5 * 1024 * 1024,  # 5MB
        'allowed_types': ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'],
        'path_template': 'users/{user_id}/id/{filename}'
    }
}

class StorageError(Exception):
    """Custom exception for storage operations"""
    pass

class UnifiedStorageService:
    """Unified storage service for all file operations"""
    
    def __init__(self):
        self.supabase = supabase
        
    def validate_file(self, file_content: bytes, filename: str, context: str) -> Dict[str, Any]:
        """Validate file before upload"""
        if context not in STORAGE_CONFIG:
            return {'valid': False, 'error': f'Invalid storage context: {context}'}
            
        config = STORAGE_CONFIG[context]
        
        # Check file size
        if len(file_content) > config['max_size']:
            max_size_mb = config['max_size'] // (1024 * 1024)
            return {'valid': False, 'error': f'File size exceeds {max_size_mb}MB limit'}
        
        # Check file type
        mime_type, _ = mimetypes.guess_type(filename)
        if mime_type not in config['allowed_types']:
            return {'valid': False, 'error': f'File type {mime_type} not allowed for {context}'}
            
        return {'valid': True, 'mime_type': mime_type}
    
    def generate_file_path(self, filename: str, context: str, metadata: Dict[str, str]) -> str:
        """Generate structured file path based on context and metadata"""
        if context not in STORAGE_CONFIG:
            raise StorageError(f'Invalid storage context: {context}')
            
        config = STORAGE_CONFIG[context]
        
        # Generate unique filename
        timestamp = int(datetime.now().timestamp() * 1000)
        file_ext = os.path.splitext(filename)[1]
        unique_id = str(uuid.uuid4())[:8]
        unique_filename = f"{timestamp}-{unique_id}{file_ext}"
        
        # Replace placeholders in path template
        path_template = config['path_template']
        
        # Replace common placeholders
        replacements = {
            '{filename}': unique_filename,
            '{property_id}': metadata.get('property_id', 'unknown'),
            '{tenant_id}': metadata.get('tenant_id', 'unknown'),
            '{user_id}': metadata.get('user_id', 'unknown'),
            '{category}': metadata.get('category', 'general')
        }
        
        file_path = path_template
        for placeholder, value in replacements.items():
            file_path = file_path.replace(placeholder, str(value))
            
        return file_path
    
    def upload_file(
        self, 
        file_content: bytes, 
        filename: str, 
        context: str, 
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Upload file to appropriate bucket"""
        try:
            if metadata is None:
                metadata = {}
                
            # Validate file
            validation = self.validate_file(file_content, filename, context)
            if not validation['valid']:
                return {'success': False, 'error': validation['error']}
            
            # Get bucket name
            bucket_name = STORAGE_CONFIG[context]['bucket']
            
            # Generate file path
            file_path = self.generate_file_path(filename, context, metadata)
            
            # Upload to Supabase storage
            result = self.supabase.storage.from_(bucket_name).upload(
                file_path, 
                file_content,
                file_options={'cache-control': '3600', 'upsert': 'false'}
            )
            
            if result.error:
                logger.error(f"Upload error: {result.error}")
                return {'success': False, 'error': str(result.error)}
            
            # Get public URL
            public_url_result = self.supabase.storage.from_(bucket_name).get_public_url(file_path)
            public_url = public_url_result if isinstance(public_url_result, str) else public_url_result.get('publicURL')
            
            return {
                'success': True,
                'file_path': file_path,
                'public_url': public_url,
                'bucket': bucket_name,
                'mime_type': validation['mime_type'],
                'file_size': len(file_content)
            }
            
        except Exception as e:
            logger.error(f"Storage upload error: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_signed_url(self, file_path: str, bucket_name: str, expires_in: int = 3600) -> Optional[str]:
        """Get signed URL for private file access"""
        try:
            result = self.supabase.storage.from_(bucket_name).create_signed_url(
                file_path, 
                expires_in
            )
            
            if result.error:
                logger.error(f"Signed URL error: {result.error}")
                return None
                
            return result.data.get('signedURL') if result.data else None
            
        except Exception as e:
            logger.error(f"Error creating signed URL: {str(e)}")
            return None
    
    def delete_file(self, file_path: str, bucket_name: str) -> bool:
        """Delete file from storage"""
        try:
            result = self.supabase.storage.from_(bucket_name).remove([file_path])
            
            if result.error:
                logger.error(f"Delete error: {result.error}")
                return False
                
            return True
            
        except Exception as e:
            logger.error(f"Error deleting file: {str(e)}")
            return False
    
    def get_multiple_signed_urls(
        self, 
        file_paths: List[str], 
        bucket_name: str, 
        expires_in: int = 3600
    ) -> List[str]:
        """Get multiple signed URLs at once"""
        try:
            result = self.supabase.storage.from_(bucket_name).create_signed_urls(
                file_paths, 
                expires_in
            )
            
            if result.error:
                logger.error(f"Multiple signed URLs error: {result.error}")
                return []
            
            # Extract signed URLs from result
            signed_urls = []
            if result.data:
                for item in result.data:
                    if isinstance(item, dict) and 'signedURL' in item:
                        signed_urls.append(item['signedURL'])
                    elif isinstance(item, str):
                        signed_urls.append(item)
            
            return signed_urls
            
        except Exception as e:
            logger.error(f"Error getting multiple signed URLs: {str(e)}")
            return []
    
    def list_files(self, bucket_name: str, folder_path: str = '') -> List[Dict[str, Any]]:
        """List files in a bucket/folder"""
        try:
            result = self.supabase.storage.from_(bucket_name).list(folder_path)
            
            if result.error:
                logger.error(f"List files error: {result.error}")
                return []
                
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error listing files: {str(e)}")
            return []

# Global instance
storage_service = UnifiedStorageService()

# Convenience functions for backward compatibility
def upload_property_image(file_content: bytes, filename: str, property_id: str, category: str = 'general') -> Dict[str, Any]:
    """Upload property image"""
    metadata = {'property_id': property_id, 'category': category}
    return storage_service.upload_file(file_content, filename, 'property_images', metadata)

def upload_tenant_document(file_content: bytes, filename: str, tenant_id: str) -> Dict[str, Any]:
    """Upload tenant document"""
    metadata = {'tenant_id': tenant_id}
    return storage_service.upload_file(file_content, filename, 'tenant_documents', metadata)

def upload_maintenance_file(file_content: bytes, filename: str, property_id: str) -> Dict[str, Any]:
    """Upload maintenance file"""
    metadata = {'property_id': property_id}
    return storage_service.upload_file(file_content, filename, 'maintenance_files', metadata)

def upload_agreement(file_content: bytes, filename: str, property_id: str) -> Dict[str, Any]:
    """Upload agreement document"""
    metadata = {'property_id': property_id}
    return storage_service.upload_file(file_content, filename, 'agreements', metadata)

def upload_id_document(file_content: bytes, filename: str, user_id: str) -> Dict[str, Any]:
    """Upload ID document"""
    metadata = {'user_id': user_id}
    return storage_service.upload_file(file_content, filename, 'id_documents', metadata) 