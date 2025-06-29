#!/usr/bin/env python3
"""
Comprehensive API endpoint tests for the Storage System
Tests all upload endpoints, validation, authentication, and error handling
"""
import pytest
import os
import json
from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient
from unittest.mock import patch, Mock

# Set test environment
os.environ['SUPABASE_URL'] = 'https://oniudnupeazkagtbsxtt.supabase.co'
os.environ['SUPABASE_KEY'] = 'test-key'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-key'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key'

from app.main import app

client = TestClient(app)

# Test constants
TEST_USER_ID = "123e4567-e89b-12d3-a456-426614174000"
TEST_PROPERTY_ID = "123e4567-e89b-12d3-a456-426614174001"
TEST_TENANT_ID = "123e4567-e89b-12d3-a456-426614174002"

class TestStorageAPIEndpoints:
    """Test all storage-related API endpoints"""
    
    def create_test_image(self, filename="test.jpg", size=(100, 100)):
        """Create a test image file"""
        image = Image.new('RGB', size, color='red')
        image_bytes = BytesIO()
        image.save(image_bytes, format='JPEG')
        image_bytes.seek(0)
        return (filename, image_bytes, "image/jpeg")
    
    def create_test_pdf(self, filename="test.pdf"):
        """Create a test PDF file"""
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
        return (filename, BytesIO(pdf_content), "application/pdf")
    
    def get_mock_auth_headers(self, user_id=TEST_USER_ID):
        """Get mock authentication headers"""
        return {"Authorization": f"Bearer mock-token-{user_id}"}
    
    @patch('app.config.auth.get_current_user')
    @patch('app.utils.storage.supabase')
    def test_property_image_upload_endpoint(self, mock_supabase, mock_get_user):
        """Test property image upload endpoint"""
        
        # Mock authentication
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        
        # Mock successful upload
        mock_supabase.storage.from_.return_value.upload.return_value = {
            'data': {'path': f'users/{TEST_USER_ID}/properties/{TEST_PROPERTY_ID}/exterior/test.jpg'},
            'error': None
        }
        
        # Create test image
        test_image = self.create_test_image("test.jpg")
        
        # Make request
        response = client.post(
            f"/api/v1/properties/{TEST_PROPERTY_ID}/images/upload",
            files={"files": test_image},
            data={"category": "exterior"},
            headers=self.get_mock_auth_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "uploaded_files" in data
    
    @patch('app.config.auth.get_current_user')
    def test_property_image_upload_unauthorized(self, mock_get_user):
        """Test property image upload without authentication"""
        
        # No authentication
        mock_get_user.side_effect = Exception("Unauthorized")
        
        test_image = self.create_test_image("test.jpg")
        
        response = client.post(
            f"/api/v1/properties/{TEST_PROPERTY_ID}/images/upload",
            files={"files": test_image},
            data={"category": "exterior"}
        )
        
        assert response.status_code == 401
    
    @patch('app.config.auth.get_current_user')
    def test_property_image_upload_invalid_file_type(self, mock_get_user):
        """Test property image upload with invalid file type"""
        
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        
        # Create invalid file (PDF for property images)
        test_pdf = self.create_test_pdf("invalid.pdf")
        
        response = client.post(
            f"/api/v1/properties/{TEST_PROPERTY_ID}/images/upload",
            files={"files": test_pdf},
            data={"category": "exterior"},
            headers=self.get_mock_auth_headers()
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "not allowed" in data["error"].lower()
    
    @patch('app.config.auth.get_current_user')
    def test_property_image_upload_file_too_large(self, mock_get_user):
        """Test property image upload with oversized file"""
        
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        
        # Create large image (mock size)
        large_image = self.create_test_image("large.jpg", size=(5000, 5000))
        
        # Mock file size to be over limit
        with patch('app.utils.storage.UnifiedStorageService.validate_file') as mock_validate:
            mock_validate.return_value = False
            
            response = client.post(
                f"/api/v1/properties/{TEST_PROPERTY_ID}/images/upload",
                files={"files": large_image},
                data={"category": "exterior"},
                headers=self.get_mock_auth_headers()
            )
        
        assert response.status_code == 400
    
    @patch('app.config.auth.get_current_user')
    @patch('app.utils.storage.supabase')
    def test_unified_upload_endpoint_property_images(self, mock_supabase, mock_get_user):
        """Test unified upload endpoint for property images"""
        
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        
        mock_supabase.storage.from_.return_value.upload.return_value = {
            'data': {'path': f'users/{TEST_USER_ID}/properties/{TEST_PROPERTY_ID}/test.jpg'},
            'error': None
        }
        
        test_image = self.create_test_image("test.jpg")
        
        response = client.post(
            "/api/v1/uploads/unified",
            files={"files": test_image},
            data={
                "context": "property_images",
                "user_id": TEST_USER_ID,
                "property_id": TEST_PROPERTY_ID,
                "category": "exterior"
            },
            headers=self.get_mock_auth_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert len(data["results"]) == 1
        assert data["results"][0]["success"] == True
    
    @patch('app.config.auth.get_current_user')
    @patch('app.utils.storage.supabase')
    def test_unified_upload_endpoint_tenant_documents(self, mock_supabase, mock_get_user):
        """Test unified upload endpoint for tenant documents"""
        
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        
        mock_supabase.storage.from_.return_value.upload.return_value = {
            'data': {'path': f'users/{TEST_USER_ID}/properties/{TEST_PROPERTY_ID}/documents/test.pdf'},
            'error': None
        }
        
        test_pdf = self.create_test_pdf("lease.pdf")
        
        response = client.post(
            "/api/v1/uploads/unified",
            files={"files": test_pdf},
            data={
                "context": "tenant_documents",
                "user_id": TEST_USER_ID,
                "property_id": TEST_PROPERTY_ID
            },
            headers=self.get_mock_auth_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    @patch('app.config.auth.get_current_user')
    @patch('app.utils.storage.supabase')
    def test_unified_upload_endpoint_id_documents(self, mock_supabase, mock_get_user):
        """Test unified upload endpoint for ID documents"""
        
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        
        mock_supabase.storage.from_.return_value.upload.return_value = {
            'data': {'path': f'users/{TEST_USER_ID}/id/id.jpg'},
            'error': None
        }
        
        test_image = self.create_test_image("id.jpg")
        
        response = client.post(
            "/api/v1/uploads/unified",
            files={"files": test_image},
            data={
                "context": "id_documents",
                "user_id": TEST_USER_ID
            },
            headers=self.get_mock_auth_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    @patch('app.config.auth.get_current_user')
    def test_unified_upload_missing_context(self, mock_get_user):
        """Test unified upload endpoint with missing context"""
        
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        
        test_image = self.create_test_image("test.jpg")
        
        response = client.post(
            "/api/v1/uploads/unified",
            files={"files": test_image},
            data={"user_id": TEST_USER_ID},
            headers=self.get_mock_auth_headers()
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "context" in data["error"].lower()
    
    @patch('app.config.auth.get_current_user')
    def test_unified_upload_invalid_context(self, mock_get_user):
        """Test unified upload endpoint with invalid context"""
        
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        
        test_image = self.create_test_image("test.jpg")
        
        response = client.post(
            "/api/v1/uploads/unified",
            files={"files": test_image},
            data={
                "context": "invalid_context",
                "user_id": TEST_USER_ID
            },
            headers=self.get_mock_auth_headers()
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "unknown storage context" in data["error"].lower()
    
    @patch('app.config.auth.get_current_user')
    def test_unified_upload_missing_required_metadata(self, mock_get_user):
        """Test unified upload with missing required metadata"""
        
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        
        test_image = self.create_test_image("test.jpg")
        
        # Property images require property_id
        response = client.post(
            "/api/v1/uploads/unified",
            files={"files": test_image},
            data={
                "context": "property_images",
                "user_id": TEST_USER_ID
                # Missing property_id
            },
            headers=self.get_mock_auth_headers()
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "property_id" in data["error"].lower()
    
    @patch('app.config.auth.get_current_user')
    @patch('app.utils.storage.supabase')
    def test_multiple_file_upload(self, mock_supabase, mock_get_user):
        """Test uploading multiple files at once"""
        
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        
        mock_supabase.storage.from_.return_value.upload.return_value = {
            'data': {'path': 'test/path/file.jpg'},
            'error': None
        }
        
        # Create multiple test files
        files = [
            ("files", self.create_test_image("test1.jpg")),
            ("files", self.create_test_image("test2.jpg")),
            ("files", self.create_test_image("test3.jpg"))
        ]
        
        response = client.post(
            "/api/v1/uploads/unified",
            files=files,
            data={
                "context": "property_images",
                "user_id": TEST_USER_ID,
                "property_id": TEST_PROPERTY_ID,
                "category": "exterior"
            },
            headers=self.get_mock_auth_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert len(data["results"]) == 3
    
    @patch('app.config.auth.get_current_user')
    @patch('app.utils.storage.supabase')
    def test_storage_service_failure(self, mock_supabase, mock_get_user):
        """Test handling of storage service failures"""
        
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        
        # Mock storage service failure
        mock_supabase.storage.from_.return_value.upload.return_value = {
            'data': None,
            'error': {'message': 'Storage service unavailable'}
        }
        
        test_image = self.create_test_image("test.jpg")
        
        response = client.post(
            "/api/v1/uploads/unified",
            files={"files": test_image},
            data={
                "context": "property_images",
                "user_id": TEST_USER_ID,
                "property_id": TEST_PROPERTY_ID
            },
            headers=self.get_mock_auth_headers()
        )
        
        assert response.status_code == 200  # Should return 200 but with error in results
        data = response.json()
        assert data["success"] == False
        assert len(data["results"]) == 1
        assert data["results"][0]["success"] == False


class TestPropertyImageEndpoints:
    """Test property-specific image endpoints"""
    
    def create_test_image(self, filename="test.jpg"):
        """Create a test image file"""
        image = Image.new('RGB', (100, 100), color='red')
        image_bytes = BytesIO()
        image.save(image_bytes, format='JPEG')
        image_bytes.seek(0)
        return (filename, image_bytes, "image/jpeg")
    
    @patch('app.config.auth.get_current_user')
    @patch('app.services.property_image_service.property_image_service.get_property_image_urls')
    def test_get_property_images(self, mock_get_urls, mock_get_user):
        """Test getting property images"""
        
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        mock_get_urls.return_value = {
            "success": True,
            "images": [
                {"url": "https://example.com/image1.jpg", "category": "exterior"},
                {"url": "https://example.com/image2.jpg", "category": "interior"}
            ]
        }
        
        response = client.get(
            f"/api/v1/properties/{TEST_PROPERTY_ID}/images/",
            headers={"Authorization": f"Bearer mock-token-{TEST_USER_ID}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "images" in data
        assert len(data["images"]) == 2
    
    @patch('app.config.auth.get_current_user')
    @patch('app.services.property_image_service.property_image_service.delete_property_image')
    def test_delete_property_image(self, mock_delete, mock_get_user):
        """Test deleting a property image"""
        
        mock_get_user.return_value = {"id": TEST_USER_ID, "email": "test@example.com"}
        mock_delete.return_value = {"success": True, "message": "Image deleted successfully"}
        
        image_path = f"users/{TEST_USER_ID}/properties/{TEST_PROPERTY_ID}/exterior/test.jpg"
        
        response = client.delete(
            f"/api/v1/properties/{TEST_PROPERTY_ID}/images/{image_path}",
            headers={"Authorization": f"Bearer mock-token-{TEST_USER_ID}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


class TestAuthenticationAndAuthorization:
    """Test authentication and authorization for storage endpoints"""
    
    def test_upload_without_authentication(self):
        """Test that uploads require authentication"""
        
        test_image = ("test.jpg", BytesIO(b"fake image"), "image/jpeg")
        
        response = client.post(
            "/api/v1/uploads/unified",
            files={"files": test_image},
            data={"context": "property_images"}
        )
        
        assert response.status_code == 401
    
    @patch('app.config.auth.get_current_user')
    def test_upload_with_invalid_token(self, mock_get_user):
        """Test upload with invalid authentication token"""
        
        mock_get_user.side_effect = Exception("Invalid token")
        
        test_image = ("test.jpg", BytesIO(b"fake image"), "image/jpeg")
        
        response = client.post(
            "/api/v1/uploads/unified",
            files={"files": test_image},
            data={"context": "property_images"},
            headers={"Authorization": "Bearer invalid-token"}
        )
        
        assert response.status_code == 401
    
    @patch('app.config.auth.get_current_user')
    def test_user_cannot_upload_for_other_users(self, mock_get_user):
        """Test that users cannot upload files for other users"""
        
        # User A is authenticated
        mock_get_user.return_value = {"id": "user-a", "email": "usera@example.com"}
        
        test_image = ("test.jpg", BytesIO(b"fake image"), "image/jpeg")
        
        # But tries to upload for User B
        response = client.post(
            "/api/v1/uploads/unified",
            files={"files": test_image},
            data={
                "context": "property_images",
                "user_id": "user-b",  # Different user!
                "property_id": TEST_PROPERTY_ID
            },
            headers={"Authorization": "Bearer token-user-a"}
        )
        
        assert response.status_code == 403  # Forbidden


class TestValidationAndErrorHandling:
    """Test validation and error handling"""
    
    def test_upload_without_files(self):
        """Test upload endpoint without any files"""
        
        response = client.post(
            "/api/v1/uploads/unified",
            data={"context": "property_images"}
        )
        
        assert response.status_code == 400
    
    def test_upload_empty_file(self):
        """Test upload with empty file"""
        
        empty_file = ("empty.jpg", BytesIO(b""), "image/jpeg")
        
        response = client.post(
            "/api/v1/uploads/unified",
            files={"files": empty_file},
            data={"context": "property_images"}
        )
        
        assert response.status_code == 400
    
    def test_upload_malformed_data(self):
        """Test upload with malformed request data"""
        
        # Send JSON instead of form data
        response = client.post(
            "/api/v1/uploads/unified",
            json={"context": "property_images"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422  # Unprocessable Entity


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"]) 