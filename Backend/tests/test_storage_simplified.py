#!/usr/bin/env python3
"""
Simplified but comprehensive test suite for the Unified Storage System
Tests actual implementation without complex mocking
"""
import pytest
import os
import sys
from io import BytesIO
from unittest.mock import Mock, patch

# Set test environment
os.environ['SUPABASE_URL'] = 'https://oniudnupeazkagtbsxtt.supabase.co'
os.environ['SUPABASE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaXVkbnVwZWF6a2FndGJzeHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2NTg2NzIsImV4cCI6MjA1MDIzNDY3Mn0.IOk5CYAd_hBCIwNOYNBDiNDytVGKDbenINVADadkx6g'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaXVkbnVwZWF6a2FndGJzeHR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDY1ODY3MiwiZXhwIjoyMDUwMjM0NjcyfQ.kF_iq8OOlqnlbkFyMLPXN1wL_cTu7KBozmdmCdMsC5Y'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key-for-development'

# Add the app directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Test constants
TEST_USER_ID = "123e4567-e89b-12d3-a456-426614174000"
TEST_PROPERTY_ID = "123e4567-e89b-12d3-a456-426614174001"

class TestStorageConfiguration:
    """Test storage configuration and setup"""
    
    def test_storage_config_exists(self):
        """Test that storage configuration exists and is properly structured"""
        from app.utils.storage import STORAGE_CONFIG
        
        # Test that all required contexts exist
        required_contexts = ['property_images', 'tenant_documents', 'maintenance_files', 'agreements', 'id_documents']
        
        for context in required_contexts:
            assert context in STORAGE_CONFIG, f"Missing storage context: {context}"
            
            config = STORAGE_CONFIG[context]
            
            # Verify required fields exist
            assert 'bucket' in config, f"Missing bucket in {context}"
            assert 'max_size' in config, f"Missing max_size in {context}"
            assert 'allowed_types' in config, f"Missing allowed_types in {context}"
            assert 'path_template' in config, f"Missing path_template in {context}"
            
            # Verify data types
            assert isinstance(config['bucket'], str), f"bucket should be string in {context}"
            assert isinstance(config['max_size'], int), f"max_size should be int in {context}"
            assert isinstance(config['allowed_types'], list), f"allowed_types should be list in {context}"
            assert isinstance(config['path_template'], str), f"path_template should be string in {context}"
    
    def test_storage_contexts_have_unique_buckets(self):
        """Test that each storage context has a unique bucket"""
        from app.utils.storage import STORAGE_CONFIG
        
        buckets = [config['bucket'] for config in STORAGE_CONFIG.values()]
        
        # All buckets should be unique
        assert len(set(buckets)) == len(buckets), "Storage contexts should have unique buckets"
    
    def test_secure_path_templates(self):
        """Test that all path templates include user isolation"""
        from app.utils.storage import STORAGE_CONFIG
        
        for context, config in STORAGE_CONFIG.items():
            path_template = config['path_template']
            
            # All paths should start with user isolation
            assert 'users/{user_id}' in path_template, f"Path template for {context} should include user isolation"


class TestPathGeneration:
    """Test secure path generation"""
    
    @patch('app.utils.storage.supabase')
    def test_path_generation_with_valid_metadata(self, mock_supabase):
        """Test path generation with valid metadata"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Test property_images path
        path = storage_service.generate_file_path(
            'test.jpg',
            'property_images',
            {
                'user_id': TEST_USER_ID,
                'property_id': TEST_PROPERTY_ID,
                'category': 'exterior'
            }
        )
        
        # Verify secure path structure
        assert f"users/{TEST_USER_ID}" in path
        assert f"properties/{TEST_PROPERTY_ID}" in path
        assert "exterior" in path
        
        # Verify unique filename generation
        assert "test.jpg" not in path  # Should be replaced with unique name
        assert ".jpg" in path  # But extension should be preserved
    
    @patch('app.utils.storage.supabase')
    def test_path_generation_validation(self, mock_supabase):
        """Test that path generation validates required metadata"""
        from app.utils.storage import UnifiedStorageService, StorageError
        
        storage_service = UnifiedStorageService()
        
        # Should raise error when user_id is missing
        with pytest.raises(StorageError):
            storage_service.generate_file_path(
                'test.jpg',
                'property_images',
                {'property_id': TEST_PROPERTY_ID}  # Missing user_id
            )
        
        # Should raise error when property_id is missing for property contexts
        with pytest.raises(StorageError):
            storage_service.generate_file_path(
                'test.jpg',
                'property_images',
                {'user_id': TEST_USER_ID}  # Missing property_id
            )
    
    @patch('app.utils.storage.supabase')
    def test_different_users_get_isolated_paths(self, mock_supabase):
        """Test that different users get completely isolated paths"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        user1_path = storage_service.generate_file_path(
            'test.jpg',
            'property_images',
            {'user_id': 'user1', 'property_id': TEST_PROPERTY_ID}
        )
        
        user2_path = storage_service.generate_file_path(
            'test.jpg',
            'property_images',
            {'user_id': 'user2', 'property_id': TEST_PROPERTY_ID}
        )
        
        # Paths should be completely isolated
        assert "user1" in user1_path and "user1" not in user2_path
        assert "user2" in user2_path and "user2" not in user1_path


class TestFileValidation:
    """Test file validation logic"""
    
    @patch('app.utils.storage.supabase')
    def test_file_type_validation(self, mock_supabase):
        """Test file type validation for different contexts"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Test image validation for property_images
        image_result = storage_service.validate_file(b"fake image", "test.jpg", 'property_images')
        assert image_result['valid'] == True
        
        # Test PDF rejection for property_images
        pdf_result = storage_service.validate_file(b"fake pdf", "test.pdf", 'property_images')
        assert pdf_result['valid'] == False
        assert "not allowed" in pdf_result['error']
        
        # Test PDF acceptance for agreements
        pdf_result = storage_service.validate_file(b"fake pdf", "test.pdf", 'agreements')
        assert pdf_result['valid'] == True
    
    @patch('app.utils.storage.supabase')
    def test_file_size_validation(self, mock_supabase):
        """Test file size validation"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Create content that exceeds property_images limit (10MB)
        large_content = b"x" * (11 * 1024 * 1024)  # 11MB
        
        result = storage_service.validate_file(large_content, "large.jpg", 'property_images')
        assert result['valid'] == False
        assert "exceeds" in result['error']
        
        # Same content should be valid for agreements (50MB limit)
        result = storage_service.validate_file(large_content, "large.pdf", 'agreements')
        assert result['valid'] == True
    
    @patch('app.utils.storage.supabase')
    def test_invalid_context_handling(self, mock_supabase):
        """Test handling of invalid storage contexts"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        result = storage_service.validate_file(b"content", "test.jpg", 'invalid_context')
        assert result['valid'] == False
        assert "Invalid storage context" in result['error']


class TestUploadWorkflow:
    """Test the complete upload workflow"""
    
    @patch('app.utils.storage.supabase')
    def test_successful_upload_workflow(self, mock_supabase):
        """Test complete successful upload workflow"""
        
        # Mock successful Supabase upload
        mock_upload_result = Mock()
        mock_upload_result.error = None
        mock_supabase.storage.from_.return_value.upload.return_value = mock_upload_result
        
        # Mock public URL generation
        mock_supabase.storage.from_.return_value.get_public_url.return_value = "https://example.com/test.jpg"
        
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        result = storage_service.upload_file(
            b"fake image content",
            "test.jpg",
            'property_images',
            {
                'user_id': TEST_USER_ID,
                'property_id': TEST_PROPERTY_ID,
                'category': 'exterior'
            }
        )
        
        # Verify successful result
        assert result['success'] == True
        assert 'file_path' in result
        assert 'public_url' in result
        assert 'bucket' in result
        assert result['bucket'] == 'propertyimage'
        
        # Verify secure path
        assert TEST_USER_ID in result['file_path']
        assert TEST_PROPERTY_ID in result['file_path']
    
    @patch('app.utils.storage.supabase')
    def test_upload_with_validation_failure(self, mock_supabase):
        """Test upload workflow when validation fails"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Try to upload PDF to property_images (should fail validation)
        result = storage_service.upload_file(
            b"fake pdf content",
            "test.pdf",
            'property_images',
            {
                'user_id': TEST_USER_ID,
                'property_id': TEST_PROPERTY_ID
            }
        )
        
        assert result['success'] == False
        assert 'error' in result
        assert "not allowed" in result['error']
    
    @patch('app.utils.storage.supabase')
    def test_upload_with_missing_metadata(self, mock_supabase):
        """Test upload workflow when required metadata is missing"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Try to upload without required property_id
        result = storage_service.upload_file(
            b"fake image content",
            "test.jpg",
            'property_images',
            {'user_id': TEST_USER_ID}  # Missing property_id
        )
        
        assert result['success'] == False
        assert 'error' in result
    
    @patch('app.utils.storage.supabase')
    def test_upload_with_supabase_error(self, mock_supabase):
        """Test upload workflow when Supabase returns an error"""
        
        # Mock Supabase upload to raise an exception (new client behavior)
        mock_supabase.storage.from_.return_value.upload.side_effect = Exception("Storage service unavailable")
        
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        result = storage_service.upload_file(
            b"fake image content",
            "test.jpg",
            'property_images',
            {
                'user_id': TEST_USER_ID,
                'property_id': TEST_PROPERTY_ID
            }
        )
        
        assert result['success'] == False
        assert 'error' in result
        assert "Storage service unavailable" in str(result['error'])


class TestConvenienceFunctions:
    """Test convenience functions for specific storage contexts"""
    
    @patch('app.utils.storage.storage_service')
    def test_convenience_functions_exist(self, mock_storage_service):
        """Test that convenience functions exist and work"""
        from app.utils.storage import (
            upload_property_image,
            upload_tenant_document,
            upload_maintenance_file,
            upload_agreement,
            upload_id_document
        )
        
        # Mock successful upload result
        mock_storage_service.upload_file.return_value = {
            'success': True,
            'file_path': 'test/path/file.jpg',
            'public_url': 'https://example.com/test.jpg',
            'bucket': 'test-bucket'
        }
        
        # Test each convenience function
        result = upload_property_image(b"image", "test.jpg", TEST_PROPERTY_ID, TEST_USER_ID)
        assert result['success'] == True
        
        result = upload_tenant_document(b"doc", "test.pdf", TEST_PROPERTY_ID, TEST_USER_ID, "tenant123")
        assert result['success'] == True
        
        result = upload_maintenance_file(b"file", "test.jpg", TEST_PROPERTY_ID, TEST_USER_ID)
        assert result['success'] == True
        
        result = upload_agreement(b"agreement", "test.pdf", TEST_PROPERTY_ID, TEST_USER_ID)
        assert result['success'] == True
        
        result = upload_id_document(b"id", "test.jpg", TEST_USER_ID)
        assert result['success'] == True
        
        # Verify the storage service was called correctly
        assert mock_storage_service.upload_file.call_count == 5


class TestSecurityValidation:
    """Test security aspects of the storage system"""
    
    @patch('app.utils.storage.supabase')
    def test_user_data_isolation(self, mock_supabase):
        """Test that user data is properly isolated"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Generate paths for different users with same property
        user1_path = storage_service.generate_file_path(
            'test.jpg',
            'property_images',
            {'user_id': 'user1', 'property_id': 'same_property'}
        )
        
        user2_path = storage_service.generate_file_path(
            'test.jpg',
            'property_images',
            {'user_id': 'user2', 'property_id': 'same_property'}
        )
        
        # Even with same property, users should have different paths
        assert user1_path != user2_path
        assert "user1" in user1_path and "user1" not in user2_path
        assert "user2" in user2_path and "user2" not in user1_path
    
    @patch('app.utils.storage.supabase')
    def test_property_data_isolation(self, mock_supabase):
        """Test that property data is properly isolated"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Generate paths for same user with different properties
        prop1_path = storage_service.generate_file_path(
            'test.jpg',
            'property_images',
            {'user_id': TEST_USER_ID, 'property_id': 'property1'}
        )
        
        prop2_path = storage_service.generate_file_path(
            'test.jpg',
            'property_images',
            {'user_id': TEST_USER_ID, 'property_id': 'property2'}
        )
        
        # Different properties should have different paths
        assert prop1_path != prop2_path
        assert "property1" in prop1_path and "property1" not in prop2_path
        assert "property2" in prop2_path and "property2" not in prop1_path


class TestLegacyPathHandling:
    """Test backward compatibility with legacy path formats"""
    
    def test_legacy_path_detection(self):
        """Test that legacy paths are correctly identified"""
        from app.services.property_image_service import property_image_service
        
        # Test legacy path format (user_id/filename)
        legacy_path = "2d54223c-92ea-46fb-a53b-53cc8567b6a8/image.jpg"
        assert property_image_service._is_legacy_path(legacy_path) == True
        
        # Test new secure path format
        new_path = "users/2d54223c-92ea-46fb-a53b-53cc8567b6a8/properties/prop123/general/image.jpg"
        assert property_image_service._is_legacy_path(new_path) == False
        
        # Test invalid paths
        assert property_image_service._is_legacy_path("") == False
        assert property_image_service._is_legacy_path("invalid/path/structure") == False
        assert property_image_service._is_legacy_path("not-a-uuid/image.jpg") == False
    
    def test_legacy_path_url_conversion(self):
        """Test conversion of legacy paths to public URLs"""
        from app.services.property_image_service import property_image_service
        
        legacy_path = "2d54223c-92ea-46fb-a53b-53cc8567b6a8/a2e7b020-4024-4ff2-beca-4dc9cb3ac545.jpeg"
        
        # Mock the settings
        with patch('app.services.property_image_service.settings') as mock_settings:
            mock_settings.SUPABASE_URL = "https://oniudnupeazkagtbsxtt.supabase.co"
            mock_settings.PROPERTY_IMAGE_BUCKET = "propertyimage"  # Use actual bucket ID
            
            url = property_image_service._convert_legacy_path_to_url(legacy_path)
            
            expected_url = "https://oniudnupeazkagtbsxtt.supabase.co/storage/v1/object/public/propertyimage/2d54223c-92ea-46fb-a53b-53cc8567b6a8/a2e7b020-4024-4ff2-beca-4dc9cb3ac545.jpeg"
            assert url == expected_url
    
    @patch('app.services.property_image_service.supabase_service_role_client')
    @patch('app.services.property_image_service.settings')
    @pytest.mark.asyncio
    async def test_mixed_path_formats_handling(self, mock_settings, mock_supabase):
        """Test handling of mixed legacy and new path formats"""
        from app.services.property_image_service import property_image_service
        
        # Setup mocks
        mock_settings.SUPABASE_URL = "https://oniudnupeazkagtbsxtt.supabase.co"
        mock_settings.PROPERTY_IMAGE_BUCKET = "propertyimage"
        
        # Mock storage client for new paths
        mock_supabase.storage.from_.return_value.get_public_url.return_value = "https://example.com/new-path-url"
        
        # Mixed paths: legacy and new formats
        mixed_paths = [
            "2d54223c-92ea-46fb-a53b-53cc8567b6a8/legacy-image.jpg",  # Legacy
            "users/2d54223c-92ea-46fb-a53b-53cc8567b6a8/properties/prop123/general/new-image.jpg",  # New
            "2d54223c-92ea-46fb-a53b-53cc8567b6a8/another-legacy.jpg"  # Legacy
        ]
        
        urls = await property_image_service.get_property_image_urls(mixed_paths)
        
        # Should return 3 URLs
        assert len(urls) == 3
        
        # First URL should be legacy format
        assert "legacy-image.jpg" in urls[0]
        assert "storage/v1/object/public/propertyimage" in urls[0]
        
        # Second URL should be from storage client (new format)
        assert urls[1] == "https://example.com/new-path-url"
        
        # Third URL should be legacy format
        assert "another-legacy.jpg" in urls[2]
        assert "storage/v1/object/public/propertyimage" in urls[2]
    
    @patch('app.services.property_image_service.supabase_service_role_client')
    @patch('app.services.property_image_service.settings')
    @pytest.mark.asyncio
    async def test_storage_error_fallback_to_legacy(self, mock_settings, mock_supabase):
        """Test fallback to legacy handling when storage service fails"""
        from app.services.property_image_service import property_image_service
        
        # Setup mocks
        mock_settings.SUPABASE_URL = "https://oniudnupeazkagtbsxtt.supabase.co"
        mock_settings.PROPERTY_IMAGE_BUCKET = "propertyimage"
        
        # Make storage client raise an error for new paths
        mock_supabase.storage.from_.return_value.get_public_url.side_effect = Exception("Storage error")
        
        # Test with a path that looks like new format but fails
        failing_new_path = "users/user123/properties/prop123/general/image.jpg"
        
        urls = await property_image_service.get_property_image_urls([failing_new_path])
        
        # Should fallback to legacy conversion
        assert len(urls) == 1
        assert "storage/v1/object/public/propertyimage" in urls[0]
        assert failing_new_path in urls[0]


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"]) 