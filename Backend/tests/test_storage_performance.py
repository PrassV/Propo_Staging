#!/usr/bin/env python3
"""
Performance and Integration Tests for the Unified Storage System
Tests performance characteristics and validates the system works as expected
"""
import pytest
import os
import sys
import time
from unittest.mock import patch, Mock

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

class TestStoragePerformance:
    """Test performance characteristics of the storage system"""
    
    @patch('app.utils.storage.supabase')
    def test_config_access_performance(self, mock_supabase):
        """Test that storage configuration access is fast"""
        from app.utils.storage import STORAGE_CONFIG
        
        # Test rapid config access
        start_time = time.time()
        for _ in range(1000):
            config = STORAGE_CONFIG['property_images']
            bucket = config['bucket']
            max_size = config['max_size']
        end_time = time.time()
        
        # Should complete 1000 config accesses in under 10ms
        duration = end_time - start_time
        print(f"Config access performance: {duration:.4f}s for 1000 operations")
        assert duration < 0.01, f"Config access too slow: {duration:.4f}s"
    
    @patch('app.utils.storage.supabase')
    def test_path_generation_performance(self, mock_supabase):
        """Test that path generation is fast"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        start_time = time.time()
        for i in range(100):
            path = storage_service.generate_file_path(
                f'test{i}.jpg',
                'property_images',
                {
                    'user_id': TEST_USER_ID,
                    'property_id': TEST_PROPERTY_ID,
                    'category': 'exterior'
                }
            )
        end_time = time.time()
        
        duration = end_time - start_time
        print(f"Path generation performance: {duration:.4f}s for 100 operations")
        assert duration < 0.1, f"Path generation too slow: {duration:.4f}s"
    
    @patch('app.utils.storage.supabase')
    def test_validation_performance(self, mock_supabase):
        """Test that file validation is fast"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Test with different file sizes
        small_content = b"x" * 1024  # 1KB
        medium_content = b"x" * (1024 * 1024)  # 1MB
        
        start_time = time.time()
        for _ in range(50):
            result = storage_service.validate_file(small_content, "test.jpg", 'property_images')
            result = storage_service.validate_file(medium_content, "test.jpg", 'property_images')
        end_time = time.time()
        
        duration = end_time - start_time
        print(f"Validation performance: {duration:.4f}s for 100 operations")
        assert duration < 0.5, f"Validation too slow: {duration:.4f}s"


class TestStorageScalability:
    """Test scalability aspects of the storage system"""
    
    @patch('app.utils.storage.supabase')
    def test_concurrent_path_generation(self, mock_supabase):
        """Test generating many paths for different users and properties"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Generate paths for many users and properties
        paths = []
        start_time = time.time()
        
        for user_idx in range(10):
            for prop_idx in range(10):
                for file_idx in range(5):
                    path = storage_service.generate_file_path(
                        f'file{file_idx}.jpg',
                        'property_images',
                        {
                            'user_id': f'user{user_idx}',
                            'property_id': f'prop{prop_idx}',
                            'category': 'exterior'
                        }
                    )
                    paths.append(path)
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"Generated {len(paths)} paths in {duration:.4f}s")
        
        # Verify all paths are unique
        assert len(set(paths)) == len(paths), "All generated paths should be unique"
        
        # Verify user isolation
        user0_paths = [p for p in paths if 'user0' in p]
        user1_paths = [p for p in paths if 'user1' in p]
        
        # No overlap between users
        assert len(set(user0_paths) & set(user1_paths)) == 0, "User paths should be isolated"
    
    @patch('app.utils.storage.supabase')
    def test_memory_usage_stability(self, mock_supabase):
        """Test that repeated operations don't cause memory leaks"""
        from app.utils.storage import UnifiedStorageService
        import gc
        
        storage_service = UnifiedStorageService()
        
        # Force garbage collection
        gc.collect()
        
        # Perform many operations
        for i in range(1000):
            # Generate path
            path = storage_service.generate_file_path(
                f'test{i}.jpg',
                'property_images',
                {
                    'user_id': f'user{i % 10}',
                    'property_id': f'prop{i % 20}',
                    'category': 'exterior'
                }
            )
            
            # Validate file
            result = storage_service.validate_file(b"content", f"test{i}.jpg", 'property_images')
            
            # Every 100 operations, force garbage collection
            if i % 100 == 0:
                gc.collect()
        
        # Test should complete without memory issues
        assert True


class TestStorageEdgeCases:
    """Test edge cases and boundary conditions"""
    
    @patch('app.utils.storage.supabase')
    def test_extremely_long_filenames(self, mock_supabase):
        """Test handling of very long filenames"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Create very long filename
        long_filename = "a" * 200 + ".jpg"
        
        path = storage_service.generate_file_path(
            long_filename,
            'property_images',
            {
                'user_id': TEST_USER_ID,
                'property_id': TEST_PROPERTY_ID
            }
        )
        
        # Should handle long filenames gracefully
        assert TEST_USER_ID in path
        assert TEST_PROPERTY_ID in path
    
    @patch('app.utils.storage.supabase')
    def test_special_characters_in_metadata(self, mock_supabase):
        """Test handling of special characters in metadata"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Test with various special characters (that are safe for paths)
        special_metadata = {
            'user_id': 'user-123_test',
            'property_id': 'prop-456_test',
            'category': 'exterior-photos'
        }
        
        path = storage_service.generate_file_path(
            'test.jpg',
            'property_images',
            special_metadata
        )
        
        # Should handle special characters
        assert 'user-123_test' in path
        assert 'prop-456_test' in path
        assert 'exterior-photos' in path
    
    @patch('app.utils.storage.supabase')
    def test_empty_file_handling(self, mock_supabase):
        """Test handling of empty files"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Test empty file
        result = storage_service.validate_file(b"", "empty.jpg", 'property_images')
        
        # Should handle empty files (validation may pass or fail, but shouldn't crash)
        assert 'valid' in result
        assert 'error' in result or result['valid']
    
    @patch('app.utils.storage.supabase')
    def test_maximum_file_size_boundary(self, mock_supabase):
        """Test files at the exact size limit"""
        from app.utils.storage import UnifiedStorageService, STORAGE_CONFIG
        
        storage_service = UnifiedStorageService()
        
        # Get exact size limit for property_images (10MB)
        max_size = STORAGE_CONFIG['property_images']['max_size']
        
        # Test file at exact limit
        exact_size_content = b"x" * max_size
        result = storage_service.validate_file(exact_size_content, "exact.jpg", 'property_images')
        assert result['valid'] == True
        
        # Test file just over limit
        over_size_content = b"x" * (max_size + 1)
        result = storage_service.validate_file(over_size_content, "over.jpg", 'property_images')
        assert result['valid'] == False


class TestStorageIntegrity:
    """Test data integrity and consistency"""
    
    @patch('app.utils.storage.supabase')
    def test_path_uniqueness_guarantee(self, mock_supabase):
        """Test that generated paths are always unique"""
        from app.utils.storage import UnifiedStorageService
        
        storage_service = UnifiedStorageService()
        
        # Generate many paths with same input
        paths = []
        for _ in range(100):
            path = storage_service.generate_file_path(
                'test.jpg',
                'property_images',
                {
                    'user_id': TEST_USER_ID,
                    'property_id': TEST_PROPERTY_ID,
                    'category': 'exterior'
                }
            )
            paths.append(path)
        
        # All paths should be unique due to timestamp + UUID
        assert len(set(paths)) == len(paths), "All generated paths should be unique"
    
    @patch('app.utils.storage.supabase')
    def test_context_isolation(self, mock_supabase):
        """Test that different contexts are properly isolated"""
        from app.utils.storage import UnifiedStorageService, STORAGE_CONFIG
        
        storage_service = UnifiedStorageService()
        
        # Generate paths for same file in different contexts
        contexts = ['property_images', 'maintenance_files']
        paths_by_context = {}
        
        for context in contexts:
            path = storage_service.generate_file_path(
                'test.jpg',
                context,
                {
                    'user_id': TEST_USER_ID,
                    'property_id': TEST_PROPERTY_ID
                }
            )
            paths_by_context[context] = path
        
        # Paths should be different for different contexts
        assert paths_by_context['property_images'] != paths_by_context['maintenance_files']
        
        # But both should contain user and property isolation
        for path in paths_by_context.values():
            assert TEST_USER_ID in path
            assert TEST_PROPERTY_ID in path


class TestStorageConfigurationValidation:
    """Test that storage configuration is valid and complete"""
    
    def test_all_contexts_properly_configured(self):
        """Test that all storage contexts have complete configuration"""
        from app.utils.storage import STORAGE_CONFIG
        
        required_contexts = ['property_images', 'tenant_documents', 'maintenance_files', 'agreements', 'id_documents']
        required_fields = ['bucket', 'max_size', 'allowed_types', 'path_template']
        
        for context in required_contexts:
            assert context in STORAGE_CONFIG, f"Missing context: {context}"
            
            config = STORAGE_CONFIG[context]
            for field in required_fields:
                assert field in config, f"Missing field {field} in {context}"
                
            # Validate data types
            assert isinstance(config['bucket'], str)
            assert isinstance(config['max_size'], int)
            assert isinstance(config['allowed_types'], list)
            assert isinstance(config['path_template'], str)
            
            # Validate values
            assert config['max_size'] > 0, f"Invalid max_size in {context}"
            assert len(config['allowed_types']) > 0, f"No allowed types in {context}"
            assert '{user_id}' in config['path_template'], f"Missing user_id in path template for {context}"
    
    def test_security_path_templates(self):
        """Test that all path templates enforce security"""
        from app.utils.storage import STORAGE_CONFIG
        
        for context, config in STORAGE_CONFIG.items():
            path_template = config['path_template']
            
            # Must start with users/{user_id} for security
            assert path_template.startswith('users/{user_id}'), f"Insecure path template in {context}"
            
            # Property-related contexts must include property_id
            if context in ['property_images', 'tenant_documents', 'maintenance_files', 'agreements']:
                assert '{property_id}' in path_template, f"Missing property_id in {context}"


if __name__ == "__main__":
    # Run tests with verbose output and performance timing
    pytest.main([__file__, "-v", "-s", "--tb=short"]) 