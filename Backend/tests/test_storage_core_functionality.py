#!/usr/bin/env python3
"""
Core functionality tests for the Unified Storage System
Tests storage logic without requiring full application context
"""
import pytest
import os
import sys
from io import BytesIO
from unittest.mock import Mock, patch, MagicMock

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
    
    @patch('app.utils.storage.supabase')
    def test_storage_config_structure(self, mock_supabase):
        """Test that storage configuration is properly structured"""
        from app.utils.storage import STORAGE_CONFIG
        
        # Test that all required contexts exist
        contexts = ['property_images', 'tenant_documents', 'maintenance_files', 'agreements', 'id_documents']
        
        for context in contexts:
            assert context in STORAGE_CONFIG
            config = STORAGE_CONFIG[context]
            
            # Verify required fields exist
            assert 'bucket' in config
            assert 'max_size' in config
            assert 'allowed_types' in config
            assert 'path_template' in config
            
            # Verify data types
            assert isinstance(config['bucket'], str)
            assert isinstance(config['max_size'], int)
            assert isinstance(config['allowed_types'], list)
            assert isinstance(config['path_template'], str)
    
    @patch('app.utils.storage.supabase')
    def test_storage_contexts_uniqueness(self, mock_supabase):
        """Test that each storage context has unique configuration"""
        from app.utils.storage import STORAGE_CONFIG
        
        contexts = ['property_images', 'tenant_documents', 'maintenance_files', 'agreements', 'id_documents']
        buckets = []
        
        for context in contexts:
            config = STORAGE_CONFIG[context]
            buckets.append(config['bucket'])
        
        # All buckets should be unique
        assert len(set(buckets)) == len(buckets)


class TestPathGeneration:
    """Test secure path generation"""
    
    @patch('app.utils.storage.supabase')
    def test_secure_path_generation(self, mock_supabase):
        """Test that paths are generated securely with user isolation"""
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
        
        # Should contain user isolation
        assert f"users/{TEST_USER_ID}" in path
        assert f"properties/{TEST_PROPERTY_ID}" in path
        assert "exterior" in path
    
    @patch('app.utils.storage.supabase')
    def test_path_generation_validation(self, mock_supabase):
        """Test that path generation validates required parameters"""
        from app.utils.storage import UnifiedStorageService, StorageError
        
        storage_service = UnifiedStorageService()
        
        # Should raise error when user_id is missing
        with pytest.raises(StorageError):
            storage_service.generate_file_path(
                'test.jpg',
                'property_images',
                {'property_id': TEST_PROPERTY_ID}
            )
        
        # Should raise error when property_id is missing for property contexts
        with pytest.raises(StorageError):
            storage_service.generate_file_path(
                'test.jpg',
                'property_images',
                {'user_id': TEST_USER_ID}
            )
    
    @patch('app.utils.storage.supabase')
    def test_filename_sanitization(self, mock_supabase):
        """Test that dangerous filenames are sanitized"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        dangerous_filename = "../../../etc/passwd"
        
        path = storage_service.generate_file_path(
            dangerous_filename,
            'property_images',
            {
                'user_id': TEST_USER_ID,
                'property_id': TEST_PROPERTY_ID
            }
        )
        
        # Should not contain path traversal attempts
        assert "../" not in path
        assert "etc/passwd" not in path


class TestFileValidation:
    """Test file validation logic"""
    
    @patch('app.utils.storage.supabase')
    def test_mime_type_validation(self, mock_supabase):
        """Test MIME type validation for different contexts"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Create mock file content
        image_content = b"fake image content"
        pdf_content = b"fake pdf content"
        
        # Property images should only accept images
        result = storage_service.validate_file(image_content, "test.jpg", 'property_images')
        assert result['valid'] == True
        
        result = storage_service.validate_file(pdf_content, "test.pdf", 'property_images')
        assert result['valid'] == False
        
        # Agreements should only accept PDFs
        result = storage_service.validate_file(pdf_content, "test.pdf", 'agreements')
        assert result['valid'] == True
        
        result = storage_service.validate_file(image_content, "test.jpg", 'agreements')
        assert result['valid'] == False
        
        # Tenant documents should accept both
        result = storage_service.validate_file(image_content, "test.jpg", 'tenant_documents')
        assert result['valid'] == True
        
        result = storage_service.validate_file(pdf_content, "test.pdf", 'tenant_documents')
        assert result['valid'] == True
    
    @patch('app.utils.storage.supabase')
    def test_file_size_validation(self, mock_supabase):
        """Test file size validation per context"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Create oversized file for property_images (limit: 10MB)
        large_file = Mock()
        large_file.filename = "large.jpg"
        large_file.content_type = "image/jpeg"
        large_file.size = 11 * 1024 * 1024  # 11MB
        
        # Should be rejected for property_images (10MB limit)
        assert storage_service.validate_file('property_images', large_file) == False
        
        # Should be accepted for agreements (50MB limit)
        assert storage_service.validate_file('agreements', large_file) == True
    
    @patch('app.utils.storage.supabase')
    def test_malicious_file_detection(self, mock_supabase):
        """Test detection of potentially malicious files"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Create file with mismatched extension and content type
        malicious_file = Mock()
        malicious_file.filename = "image.jpg"
        malicious_file.content_type = "application/x-executable"
        malicious_file.size = 1024
        
        # Should be rejected
        assert storage_service.validate_file('property_images', malicious_file) == False


class TestSecurityIsolation:
    """Test security and user isolation"""
    
    @patch('app.utils.storage.supabase')
    def test_user_isolation(self, mock_supabase):
        """Test that different users get isolated paths"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Generate paths for different users
        path1 = storage_service.generate_storage_path(
            'property_images',
            'test.jpg',
            user_id="user1",
            property_id=TEST_PROPERTY_ID
        )
        
        path2 = storage_service.generate_storage_path(
            'property_images',
            'test.jpg',
            user_id="user2",
            property_id=TEST_PROPERTY_ID
        )
        
        # Paths should be completely isolated
        assert "user1" in path1 and "user1" not in path2
        assert "user2" in path2 and "user2" not in path1
    
    @patch('app.utils.storage.supabase')
    def test_property_isolation(self, mock_supabase):
        """Test that different properties get isolated paths"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        path1 = storage_service.generate_storage_path(
            'property_images',
            'test.jpg',
            user_id=TEST_USER_ID,
            property_id="property1"
        )
        
        path2 = storage_service.generate_storage_path(
            'property_images',
            'test.jpg',
            user_id=TEST_USER_ID,
            property_id="property2"
        )
        
        # Properties should be isolated
        assert "property1" in path1 and "property1" not in path2
        assert "property2" in path2 and "property2" not in path1


class TestUploadWorkflow:
    """Test the complete upload workflow"""
    
    @patch('app.utils.storage.supabase')
    def test_successful_upload(self, mock_supabase):
        """Test successful file upload workflow"""
        from app.utils.storage import UnifiedStorageService
        
        # Mock successful upload
        mock_supabase.storage.from_.return_value.upload.return_value = {
            'data': {'path': f'users/{TEST_USER_ID}/properties/{TEST_PROPERTY_ID}/test.jpg'},
            'error': None
        }
        
        storage_service = UnifiedStorageService()
        
        # Create mock file
        test_file = Mock()
        test_file.filename = "test.jpg"
        test_file.content_type = "image/jpeg"
        test_file.size = 1024 * 1024  # 1MB
        test_file.file = BytesIO(b"fake image content")
        
        result = storage_service.upload_file(
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
    def test_upload_failure_handling(self, mock_supabase):
        """Test upload failure handling"""
        from app.utils.storage import UnifiedStorageService
        
        # Mock upload failure
        mock_supabase.storage.from_.return_value.upload.return_value = {
            'data': None,
            'error': {'message': 'Upload failed'}
        }
        
        storage_service = UnifiedStorageService()
        
        test_file = Mock()
        test_file.filename = "test.jpg"
        test_file.content_type = "image/jpeg"
        test_file.size = 1024 * 1024
        test_file.file = BytesIO(b"fake image content")
        
        result = storage_service.upload_file(
            'property_images',
            test_file,
            user_id=TEST_USER_ID,
            property_id=TEST_PROPERTY_ID
        )
        
        assert result['success'] == False
        assert 'error' in result


class TestPerformance:
    """Test performance characteristics"""
    
    @patch('app.utils.storage.supabase')
    def test_config_lookup_performance(self, mock_supabase):
        """Test that config lookups are fast"""
        from app.utils.storage import UnifiedStorageService
        import time
        
        storage_service = UnifiedStorageService()
        
        start_time = time.time()
        for _ in range(100):
            config = storage_service.get_storage_config('property_images')
        end_time = time.time()
        
        # Should complete 100 lookups in under 100ms
        assert (end_time - start_time) < 0.1
    
    @patch('app.utils.storage.supabase')
    def test_path_generation_performance(self, mock_supabase):
        """Test that path generation is fast"""
        from app.utils.storage import UnifiedStorageService
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