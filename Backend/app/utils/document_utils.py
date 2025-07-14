"""
Utility functions for tenant document traceability and path management
"""
import re
from typing import Dict, Optional, List
import uuid
import logging

logger = logging.getLogger(__name__)

def extract_ids_from_path(file_path: str) -> Dict[str, str]:
    """
    Extract user_id and tenant_id from standardized file path
    Path format: users/{user_id}/tenants/{tenant_id}/documents/{document_type}/{filename}
    
    Args:
        file_path: The storage file path
        
    Returns:
        Dictionary containing extracted IDs or empty dict if parsing fails
    """
    if not file_path:
        return {}
    
    # Remove any leading/trailing slashes
    path = file_path.strip('/')
    parts = path.split('/')
    
    # Expected structure: users/{user_id}/tenants/{tenant_id}/documents/{document_type}/{filename}
    if len(parts) >= 6 and parts[0] == 'users' and parts[2] == 'tenants' and parts[4] == 'documents':
        try:
            # Validate that user_id and tenant_id are valid UUIDs
            user_id = parts[1]
            tenant_id = parts[3]
            uuid.UUID(user_id)  # This will raise ValueError if invalid
            uuid.UUID(tenant_id)  # This will raise ValueError if invalid
            
            return {
                'user_id': user_id,
                'tenant_id': tenant_id,
                'document_type': parts[5] if len(parts) > 5 else 'unknown',
                'filename': parts[-1]
            }
        except (ValueError, IndexError) as e:
            logger.warning(f"Invalid UUID in path {file_path}: {e}")
            return {}
    
    logger.warning(f"Invalid path format: {file_path}")
    return {}

def validate_path_structure(file_path: str) -> bool:
    """
    Validate that a file path follows the expected structure
    
    Args:
        file_path: The storage file path to validate
        
    Returns:
        True if path structure is valid, False otherwise
    """
    extracted = extract_ids_from_path(file_path)
    return bool(extracted and all(key in extracted for key in ['user_id', 'tenant_id', 'document_type', 'filename']))

def generate_tenant_document_path(
    user_id: str, 
    tenant_id: str, 
    document_type: str, 
    filename: str
) -> str:
    """
    Generate a standardized path for tenant documents
    
    Args:
        user_id: The owner user ID
        tenant_id: The tenant ID
        document_type: The document type/category
        filename: The filename (should be unique)
        
    Returns:
        Standardized file path
    """
    # Validate inputs
    try:
        uuid.UUID(user_id)
        uuid.UUID(tenant_id)
    except ValueError as e:
        raise ValueError(f"Invalid UUID format: {e}")
    
    # Clean filename
    clean_filename = re.sub(r'[^a-zA-Z0-9.-]', '_', filename)
    
    return f"users/{user_id}/tenants/{tenant_id}/documents/{document_type}/{clean_filename}"

def get_tenant_document_prefix(user_id: str, tenant_id: str) -> str:
    """
    Get the prefix path for all documents belonging to a specific tenant
    
    Args:
        user_id: The owner user ID
        tenant_id: The tenant ID
        
    Returns:
        Path prefix for the tenant's documents
    """
    return f"users/{user_id}/tenants/{tenant_id}/documents/"

def get_user_documents_prefix(user_id: str) -> str:
    """
    Get the prefix path for all documents belonging to a specific user
    
    Args:
        user_id: The owner user ID
        
    Returns:
        Path prefix for the user's documents
    """
    return f"users/{user_id}/"

def extract_document_type_from_path(file_path: str) -> str:
    """
    Extract document type from file path
    
    Args:
        file_path: The storage file path
        
    Returns:
        Document type or 'unknown' if not found
    """
    extracted = extract_ids_from_path(file_path)
    return extracted.get('document_type', 'unknown')

def migrate_legacy_path_to_new_format(
    old_path: str, 
    user_id: str, 
    tenant_id: str, 
    document_type: str = 'general'
) -> str:
    """
    Convert legacy path format to new standardized format
    
    Args:
        old_path: The old file path
        user_id: The owner user ID
        tenant_id: The tenant ID
        document_type: The document type/category
        
    Returns:
        New standardized file path
    """
    # Extract filename from old path
    filename = old_path.split('/')[-1]
    
    # Generate new path
    return generate_tenant_document_path(user_id, tenant_id, document_type, filename)

def validate_document_access_by_path(file_path: str, requesting_user_id: str) -> bool:
    """
    Quick validation of document access based on file path
    Note: This should be used in conjunction with database validation
    
    Args:
        file_path: The storage file path
        requesting_user_id: The user requesting access
        
    Returns:
        True if path indicates user should have access, False otherwise
    """
    extracted = extract_ids_from_path(file_path)
    if not extracted:
        return False
    
    # Check if the requesting user is the owner in the path
    return extracted.get('user_id') == requesting_user_id

def batch_extract_ids_from_paths(file_paths: List[str]) -> List[Dict[str, str]]:
    """
    Extract IDs from multiple file paths
    
    Args:
        file_paths: List of file paths to process
        
    Returns:
        List of dictionaries containing extracted IDs
    """
    results = []
    for path in file_paths:
        results.append(extract_ids_from_path(path))
    return results

def get_document_organization_stats(file_paths: List[str]) -> Dict[str, int]:
    """
    Get statistics about document organization from file paths
    
    Args:
        file_paths: List of file paths to analyze
        
    Returns:
        Dictionary with organization statistics
    """
    stats = {
        'total_documents': len(file_paths),
        'valid_paths': 0,
        'invalid_paths': 0,
        'users': set(),
        'tenants': set(),
        'document_types': {}
    }
    
    for path in file_paths:
        extracted = extract_ids_from_path(path)
        if extracted:
            stats['valid_paths'] += 1
            stats['users'].add(extracted['user_id'])
            stats['tenants'].add(extracted['tenant_id'])
            doc_type = extracted['document_type']
            stats['document_types'][doc_type] = stats['document_types'].get(doc_type, 0) + 1
        else:
            stats['invalid_paths'] += 1
    
    # Convert sets to counts
    stats['unique_users'] = len(stats['users'])
    stats['unique_tenants'] = len(stats['tenants'])
    del stats['users']
    del stats['tenants']
    
    return stats

# Document type validation
VALID_DOCUMENT_TYPES = {
    'identity', 'income', 'employment', 'rental_history', 'references',
    'emergency_contact', 'agreement', 'photos', 'verification', 'general', 'other'
}

def validate_document_type(document_type: str) -> bool:
    """
    Validate document type against allowed types
    
    Args:
        document_type: The document type to validate
        
    Returns:
        True if valid, False otherwise
    """
    return document_type.lower() in VALID_DOCUMENT_TYPES

def sanitize_document_type(document_type: str) -> str:
    """
    Sanitize and validate document type
    
    Args:
        document_type: The document type to sanitize
        
    Returns:
        Sanitized document type or 'general' if invalid
    """
    if not document_type:
        return 'general'
    
    sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', document_type.lower())
    
    return sanitized if validate_document_type(sanitized) else 'general' 