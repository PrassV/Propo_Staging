#!/usr/bin/env python3
"""
Comprehensive test suite for the Unified Storage System
Tests all storage contexts, security, validation, and integration
"""
import pytest
import os
import tempfile
import uuid
from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient
from fastapi import UploadFile
from unittest.mock import Mock, patch, MagicMock

# Set test environment
os.environ['SUPABASE_URL'] = 'https://oniudnupeazkagtbsxtt.supabase.co'
os.environ['SUPABASE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaXVkbnVwZWF6a2FndGJzeHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2NTg2NzIsImV4cCI6MjA1MDIzNDY3Mn0.IOk5CYAd_hBCIwNOYNBDiNDytVGKDbenINVADadkx6g'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uaXVkbnVwZWF6a2FndGJzeHR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDY1ODY3MiwiZXhwIjoyMDUwMjM0NjcyfQ.kF_iq8OOlqnlbkFyMLPXN1wL_cTu7KBozmdmCdMsC5Y'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key-for-development'

# Mock the supabase client to avoid real connections during testing
with patch('app.config.database.supabase_client'):
    from app.main import app
    from app.utils.storage import UnifiedStorageService, StorageError
    from app.services.property_image_service import property_image_service

client = TestClient(app)

# Test constants
TEST_USER_ID = "123e4567-e89b-12d3-a456-426614174000"
TEST_PROPERTY_ID = "123e4567-e89b-12d3-a456-426614174001"
TEST_TENANT_ID = "123e4567-e89b-12d3-a456-426614174002"

class TestUnifiedStorageService:
    """Test the core unified storage service functionality"""
    
    def setup_method(self):
        """Setup for each test method"""
        self.storage_service = UnifiedStorageService()
    
    def create_test_file(self, filename="test.jpg", size=(100, 100), format="JPEG", content_type=None):
        """Create a test file for uploads"""
        if filename.endswith(('.jpg', '.jpeg', '.png')):
            # Create test image
            image = Image.new('RGB', size, color='red')
            image_bytes = BytesIO()
            image.save(image_bytes, format=format)
            image_bytes.seek(0)
            content_type = content_type or f"image/{format.lower()}"
        else:
            # Create test document
            image_bytes = BytesIO(b"Test document content")
            content_type = content_type or "application/pdf"
        
        return UploadFile(
            filename=filename,
            file=image_bytes,
            content_type=content_type
        )
    
    def test_storage_contexts_configuration(self):
        """Test that all storage contexts are properly configured"""
        contexts = ['property_images', 'tenant_documents', 'maintenance_files', 'agreements', 'id_documents']
        
        for context in contexts:
            config = self.storage_service.get_storage_config(context)
            assert config is not None
            assert 'bucket' in config
            assert 'max_size_mb' in config
            assert 'allowed_mime_types' in config
            assert 'path_template' in config
    
    def test_path_generation_security(self):
        """Test secure path generation for all contexts"""
        
        # Test property_images - requires user_id and property_id
        path = self.storage_service.generate_storage_path(
            'property_images',
            'test.jpg',
            user_id=TEST_USER_ID,
            property_id=TEST_PROPERTY_ID,
            category='exterior'
        )
        expected = f"users/{TEST_USER_ID}/properties/{TEST_PROPERTY_ID}/exterior/"
        assert path.startswith(expected)
        assert TEST_USER_ID in path
        assert TEST_PROPERTY_ID in path
        
        # Test tenant_documents - requires user_id and property_id
        path = self.storage_service.generate_storage_path(
            'tenant_documents',
            'lease.pdf',
            user_id=TEST_USER_ID,
            property_id=TEST_PROPERTY_ID
        )
        expected = f"users/{TEST_USER_ID}/properties/{TEST_PROPERTY_ID}/documents/"
        assert path.startswith(expected)
        
        # Test id_documents - requires only user_id
        path = self.storage_service.generate_storage_path(
            'id_documents',
            'id.jpg',
            user_id=TEST_USER_ID
        )
        expected = f"users/{TEST_USER_ID}/id/"
        assert path.startswith(expected)
    
    def test_path_generation_validation(self):
        """Test that path generation validates required metadata"""
        
        # Should raise error when user_id is missing
        with pytest.raises(StorageError, match="user_id is required"):
            self.storage_service.generate_storage_path(
                'property_images',
                'test.jpg',
                property_id=TEST_PROPERTY_ID
            )
        
        # Should raise error when property_id is missing for property contexts
        with pytest.raises(StorageError, match="property_id is required"):
            self.storage_service.generate_storage_path(
                'property_images',
                'test.jpg',
                user_id=TEST_USER_ID
            )
    
    def test_file_validation_by_context(self):
        """Test file validation for each storage context"""
        
        # Property images - only images allowed
        image_file = self.create_test_file("test.jpg", content_type="image/jpeg")
        assert self.storage_service.validate_file('property_images', image_file) == True
        
        pdf_file = self.create_test_file("test.pdf", content_type="application/pdf")
        assert self.storage_service.validate_file('property_images', pdf_file) == False
        
        # Agreements - only PDFs allowed
        assert self.storage_service.validate_file('agreements', pdf_file) == True
        assert self.storage_service.validate_file('agreements', image_file) == False
        
        # Tenant documents - multiple types allowed
        assert self.storage_service.validate_file('tenant_documents', pdf_file) == True
        assert self.storage_service.validate_file('tenant_documents', image_file) == True
    
    def test_file_size_validation(self):
        """Test file size validation per context"""
        
        # Create oversized file for property_images (limit: 10MB)
        large_file = Mock()
        large_file.filename = "large.jpg"
        large_file.content_type = "image/jpeg"
        large_file.size = 11 * 1024 * 1024  # 11MB
        
        assert self.storage_service.validate_file('property_images', large_file) == False
        
        # Same file should be valid for agreements (limit: 50MB)
        assert self.storage_service.validate_file('agreements', large_file) == True
    
    @patch('app.utils.storage.supabase')
    def test_upload_file_success(self, mock_supabase):
        """Test successful file upload"""
        mock_supabase.storage.from_.return_value.upload.return_value = {
            'data': {'path': 'test/path/file.jpg'},
            'error': None
        }
        
        test_file = self.create_test_file("test.jpg")
        
        result = self.storage_service.upload_file(
            'property_images',
            test_file,
            user_id=TEST_USER_ID,
            property_id=TEST_PROPERTY_ID,
            category='exterior'
        )
        
        assert result['success'] == True
        assert 'path' in result
        assert TEST_USER_ID in result['path']
        assert TEST_PROPERTY_ID in result['path']
    
    @patch('app.utils.storage.supabase')
    def test_upload_file_failure(self, mock_supabase):
        """Test file upload failure handling"""
        mock_supabase.storage.from_.return_value.upload.return_value = {
            'data': None,
            'error': {'message': 'Upload failed'}
        }
        
        test_file = self.create_test_file("test.jpg")
        
        result = self.storage_service.upload_file(
            'property_images',
            test_file,
            user_id=TEST_USER_ID,
            property_id=TEST_PROPERTY_ID
        )
        
        assert result['success'] == False
        assert 'error' in result


class TestStorageContexts:
    """Test each storage context individually"""
    
    def setup_method(self):
        self.storage_service = UnifiedStorageService()
    
    def test_property_images_context(self):
        """Test property_images storage context"""
        config = self.storage_service.get_storage_config('property_images')
        
        assert config['bucket'] == 'propertyimage'
        assert config['max_size_mb'] == 10
        assert config['is_public'] == True
        assert 'image/' in str(config['allowed_mime_types'])
        
        # Test path template
        assert 'users/{user_id}/properties/{property_id}' in config['path_template']
    
    def test_tenant_documents_context(self):
        """Test tenant_documents storage context"""
        config = self.storage_service.get_storage_config('tenant_documents')
        
        assert config['bucket'] == 'tenant-documents'
        assert config['max_size_mb'] == 25
        assert config['is_public'] == False
        
        # Should allow multiple file types
        mime_types = config['allowed_mime_types']
        assert any('pdf' in mime for mime in mime_types)
        assert any('image' in mime for mime in mime_types)
    
    def test_maintenance_files_context(self):
        """Test maintenance_files storage context"""
        config = self.storage_service.get_storage_config('maintenance_files')
        
        assert config['bucket'] == 'maintenance-files'
        assert config['max_size_mb'] == 15
        assert config['is_public'] == False
    
    def test_agreements_context(self):
        """Test agreements storage context"""
        config = self.storage_service.get_storage_config('agreements')
        
        assert config['bucket'] == 'agreements'
        assert config['max_size_mb'] == 50
        assert config['is_public'] == False
        assert config['allowed_mime_types'] == ['application/pdf']
    
    def test_id_documents_context(self):
        """Test id_documents storage context"""
        config = self.storage_service.get_storage_config('id_documents')
        
        assert config['bucket'] == 'id-documents'
        assert config['max_size_mb'] == 5
        assert config['is_public'] == False


class TestSecurityValidation:
    """Test security aspects of the storage system"""
    
    def setup_method(self):
        self.storage_service = UnifiedStorageService()
    
    def test_user_isolation_enforcement(self):
        """Test that user isolation is enforced in paths"""
        
        # Generate paths for different users
        path1 = self.storage_service.generate_storage_path(
            'property_images',
            'test.jpg',
            user_id="user1",
            property_id=TEST_PROPERTY_ID
        )
        
        path2 = self.storage_service.generate_storage_path(
            'property_images',
            'test.jpg',
            user_id="user2",
            property_id=TEST_PROPERTY_ID
        )
        
        # Paths should be completely different
        assert "user1" in path1 and "user1" not in path2
        assert "user2" in path2 and "user2" not in path1
    
    def test_property_isolation_enforcement(self):
        """Test that property isolation is enforced"""
        
        path1 = self.storage_service.generate_storage_path(
            'property_images',
            'test.jpg',
            user_id=TEST_USER_ID,
            property_id="property1"
        )
        
        path2 = self.storage_service.generate_storage_path(
            'property_images',
            'test.jpg',
            user_id=TEST_USER_ID,
            property_id="property2"
        )
        
        assert "property1" in path1 and "property1" not in path2
        assert "property2" in path2 and "property2" not in path1
    
    def test_filename_sanitization(self):
        """Test that filenames are properly sanitized"""
        
        dangerous_filename = "../../../etc/passwd"
        
        path = self.storage_service.generate_storage_path(
            'property_images',
            dangerous_filename,
            user_id=TEST_USER_ID,
            property_id=TEST_PROPERTY_ID
        )
        
        # Should not contain path traversal attempts
        assert "../" not in path
        assert "etc/passwd" not in path
    
    def test_mime_type_spoofing_protection(self):
        """Test protection against MIME type spoofing"""
        
        # Create file with mismatched extension and content type
        fake_image = Mock()
        fake_image.filename = "malicious.jpg"
        fake_image.content_type = "application/x-executable"
        fake_image.size = 1024
        
        # Should be rejected
        assert self.storage_service.validate_file('property_images', fake_image) == False


class TestIntegrationWorkflows:
    """Test complete integration workflows"""
    
    @patch('app.utils.storage.supabase')
    def test_complete_upload_workflow(self, mock_supabase):
        """Test complete upload workflow from start to finish"""
        
        # Mock successful upload
        mock_supabase.storage.from_.return_value.upload.return_value = {
            'data': {'path': 'test/path/file.jpg'},
            'error': None
        }
        
        # Mock URL generation
        mock_supabase.storage.from_.return_value.create_signed_url.return_value = {
            'data': {'signedURL': 'https://example.com/signed-url'},
            'error': None
        }
        
        storage_service = UnifiedStorageService()
        
        # 1. Upload file
        test_file = self.create_test_file("test.jpg")
        upload_result = storage_service.upload_file(
            'property_images',
            test_file,
            user_id=TEST_USER_ID,
            property_id=TEST_PROPERTY_ID,
            category='exterior'
        )
        
        assert upload_result['success'] == True
        
        # 2. Generate URL
        url_result = storage_service.get_signed_url('propertyimage', upload_result['path'])
        assert url_result['success'] == True
        assert 'url' in url_result
    
    def create_test_file(self, filename="test.jpg"):
        """Helper to create test files"""
        image = Image.new('RGB', (100, 100), color='red')
        image_bytes = BytesIO()
        image.save(image_bytes, format='JPEG')
        image_bytes.seek(0)
        
        return UploadFile(
            filename=filename,
            file=image_bytes,
            content_type="image/jpeg"
        )


class TestErrorHandling:
    """Test error handling and recovery"""
    
    def setup_method(self):
        self.storage_service = UnifiedStorageService()
    
    def test_invalid_context_handling(self):
        """Test handling of invalid storage contexts"""
        
        with pytest.raises(StorageError, match="Unknown storage context"):
            self.storage_service.get_storage_config('invalid_context')
    
    def test_missing_metadata_handling(self):
        """Test handling of missing required metadata"""
        
        with pytest.raises(StorageError):
            self.storage_service.generate_storage_path(
                'property_images',
                'test.jpg'
                # Missing required user_id and property_id
            )
    
    @patch('app.utils.storage.supabase')
    def test_storage_service_failure_handling(self, mock_supabase):
        """Test handling of storage service failures"""
        
        # Mock storage service failure
        mock_supabase.storage.from_.return_value.upload.side_effect = Exception("Storage service unavailable")
        
        test_file = Mock()
        test_file.filename = "test.jpg"
        test_file.content_type = "image/jpeg"
        test_file.size = 1024
        test_file.file = BytesIO(b"test content")
        
        result = self.storage_service.upload_file(
            'property_images',
            test_file,
            user_id=TEST_USER_ID,
            property_id=TEST_PROPERTY_ID
        )
        
        assert result['success'] == False
        assert 'error' in result


class TestPerformance:
    """Test performance aspects of the storage system"""
    
    def test_config_lookup_performance(self):
        """Test that storage config lookups are fast"""
        import time
        
        storage_service = UnifiedStorageService()
        
        start_time = time.time()
        for _ in range(100):
            config = storage_service.get_storage_config('property_images')
        end_time = time.time()
        
        # Should complete 100 lookups in under 100ms
        assert (end_time - start_time) < 0.1
    
    def test_path_generation_performance(self):
        """Test that path generation is fast"""
        import time
        
        storage_service = UnifiedStorageService()
        
        start_time = time.time()
        for i in range(100):
            path = storage_service.generate_storage_path(
                'property_images',
                f'test{i}.jpg',
                user_id=TEST_USER_ID,
                property_id=TEST_PROPERTY_ID
            )
        end_time = time.time()
        
        # Should complete 100 path generations in under 100ms
        assert (end_time - start_time) < 0.1


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"]) 