from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
import uuid
import os
import mimetypes

from ..db import documents as documents_db
from ..models.document import (
    DocumentCreate, 
    DocumentUpdate, 
    DocumentStatus,
    DocumentAccess,
    DocumentType
)

logger = logging.getLogger(__name__)

async def get_documents(
    owner_id: str = None,
    property_id: str = None,
    tenant_id: str = None,
    document_type: str = None,
    status: str = None
) -> List[Dict[str, Any]]:
    """
    Get documents, optionally filtered.
    
    Args:
        owner_id: Optional owner ID to filter by
        property_id: Optional property ID to filter by
        tenant_id: Optional tenant ID to filter by
        document_type: Optional document type to filter by
        status: Optional status to filter by
        
    Returns:
        List of documents
    """
    return await documents_db.get_documents(owner_id, property_id, tenant_id, document_type, status)

async def get_document(document_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a document by ID.
    
    Args:
        document_id: The document ID
        
    Returns:
        Document data or None if not found
    """
    return await documents_db.get_document_by_id(document_id)

async def create_document(document_data: DocumentCreate, owner_id: str) -> Optional[Dict[str, Any]]:
    """
    Create a new document.
    
    Args:
        document_data: The document data
        owner_id: The owner ID
        
    Returns:
        Created document data or None if creation failed
    """
    try:
        # Convert Pydantic model to dict and add required fields
        document_dict = document_data.model_dump()
        document_dict['owner_id'] = owner_id
        document_dict['id'] = str(uuid.uuid4())
        document_dict['status'] = DocumentStatus.ACTIVE.value
        document_dict['created_at'] = datetime.utcnow().isoformat()
        document_dict['version'] = 1
        
        # Extract file extension and mime type if not provided
        if not document_dict.get('file_extension') or not document_dict.get('mime_type'):
            url = document_dict['file_url']
            
            if not document_dict.get('file_extension'):
                _, file_extension = os.path.splitext(url)
                document_dict['file_extension'] = file_extension.lstrip('.')
                
            if not document_dict.get('mime_type'):
                mime_type, _ = mimetypes.guess_type(url)
                if mime_type:
                    document_dict['mime_type'] = mime_type
        
        # Create the document in the database
        return await documents_db.create_document(document_dict)
    except Exception as e:
        logger.error(f"Failed to create document: {str(e)}")
        return None

async def update_document(document_id: str, document_data: DocumentUpdate) -> Optional[Dict[str, Any]]:
    """
    Update a document.
    
    Args:
        document_id: The document ID to update
        document_data: The updated document data
        
    Returns:
        Updated document data or None if update failed
    """
    try:
        # Convert Pydantic model to dict, filtering out None values
        update_dict = {k: v for k, v in document_data.model_dump().items() if v is not None}
        
        # Update the document
        return await documents_db.update_document(document_id, update_dict)
    except Exception as e:
        logger.error(f"Failed to update document {document_id}: {str(e)}")
        return None

async def delete_document(document_id: str) -> bool:
    """
    Delete a document.
    
    Args:
        document_id: The document ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    return await documents_db.delete_document(document_id)

async def archive_document(document_id: str) -> Optional[Dict[str, Any]]:
    """
    Archive a document (update status to ARCHIVED).
    
    Args:
        document_id: The document ID to archive
        
    Returns:
        Updated document data or None if update failed
    """
    try:
        update_dict = {
            'status': DocumentStatus.ARCHIVED.value,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        return await documents_db.update_document(document_id, update_dict)
    except Exception as e:
        logger.error(f"Failed to archive document {document_id}: {str(e)}")
        return None

async def create_document_version(
    document_id: str,
    file_url: str,
    created_by: str,
    change_notes: Optional[str] = None,
    file_size: Optional[int] = None
) -> Optional[Dict[str, Any]]:
    """
    Create a new version of a document.
    
    Args:
        document_id: The document ID to create a version for
        file_url: The URL to the new file version
        created_by: The user ID who created this version
        change_notes: Optional notes about the changes
        file_size: Optional file size in bytes
        
    Returns:
        Created version data or None if creation failed
    """
    try:
        # Get the current document to determine the next version number
        document = await documents_db.get_document_by_id(document_id)
        if not document:
            logger.error(f"Document {document_id} not found for creating version")
            return None
            
        current_version = document.get('version', 1)
        next_version = current_version + 1
        
        # Create the version
        version_data = {
            'id': str(uuid.uuid4()),
            'document_id': document_id,
            'file_url': file_url,
            'file_size': file_size,
            'version': next_version,
            'created_at': datetime.utcnow().isoformat(),
            'created_by': created_by,
            'change_notes': change_notes
        }
        
        return await documents_db.create_document_version(version_data)
    except Exception as e:
        logger.error(f"Failed to create document version for document {document_id}: {str(e)}")
        return None

async def get_document_versions(document_id: str) -> List[Dict[str, Any]]:
    """
    Get versions of a document.
    
    Args:
        document_id: The document ID to get versions for
        
    Returns:
        List of document versions
    """
    return await documents_db.get_document_versions(document_id)

async def share_document(
    document_id: str,
    shared_by: str,
    shared_with: Optional[str] = None,
    access_code: Optional[str] = None,
    expiry_date: Optional[datetime] = None
) -> Optional[Dict[str, Any]]:
    """
    Share a document with a user or generate a public access code.
    
    Args:
        document_id: The document ID to share
        shared_by: The user ID who is sharing the document
        shared_with: Optional user ID or email to share with
        access_code: Optional access code for public sharing
        expiry_date: Optional expiry date for the share
        
    Returns:
        Created share data or None if creation failed
    """
    try:
        # Create the share
        share_data = {
            'id': str(uuid.uuid4()),
            'document_id': document_id,
            'shared_by': shared_by,
            'shared_with': shared_with,
            'access_code': access_code,
            'expiry_date': expiry_date.isoformat() if expiry_date else None,
            'created_at': datetime.utcnow().isoformat(),
            'is_active': True
        }
        
        return await documents_db.create_document_share(share_data)
    except Exception as e:
        logger.error(f"Failed to share document {document_id}: {str(e)}")
        return None

async def get_document_shares(document_id: str) -> List[Dict[str, Any]]:
    """
    Get shares of a document.
    
    Args:
        document_id: The document ID to get shares for
        
    Returns:
        List of document shares
    """
    return await documents_db.get_document_shares(document_id)

async def revoke_document_share(share_id: str) -> bool:
    """
    Revoke a document share.
    
    Args:
        share_id: The share ID to revoke
        
    Returns:
        True if revocation succeeded, False otherwise
    """
    return await documents_db.deactivate_document_share(share_id)

async def get_document_categories(owner_id: str = None) -> List[Dict[str, Any]]:
    """
    Get document categories.
    
    Args:
        owner_id: Optional owner ID to filter by
        
    Returns:
        List of document categories
    """
    return await documents_db.get_document_categories(owner_id)

async def create_document_category(
    name: str,
    owner_id: str,
    description: Optional[str] = None,
    parent_category_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Create a new document category.
    
    Args:
        name: The category name
        owner_id: The owner ID
        description: Optional category description
        parent_category_id: Optional parent category ID
        
    Returns:
        Created category data or None if creation failed
    """
    try:
        # Create the category
        category_data = {
            'id': str(uuid.uuid4()),
            'owner_id': owner_id,
            'name': name,
            'description': description,
            'parent_category_id': parent_category_id,
            'created_at': datetime.utcnow().isoformat()
        }
        
        return await documents_db.create_document_category(category_data)
    except Exception as e:
        logger.error(f"Failed to create document category: {str(e)}")
        return None

async def update_document_category(
    category_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    parent_category_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Update a document category.
    
    Args:
        category_id: The category ID to update
        name: Optional new category name
        description: Optional new category description
        parent_category_id: Optional new parent category ID
        
    Returns:
        Updated category data or None if update failed
    """
    try:
        # Build update data
        update_data = {}
        if name is not None:
            update_data['name'] = name
        if description is not None:
            update_data['description'] = description
        if parent_category_id is not None:
            update_data['parent_category_id'] = parent_category_id
            
        if not update_data:
            logger.warning(f"No data provided to update document category {category_id}")
            return None
            
        return await documents_db.update_document_category(category_id, update_data)
    except Exception as e:
        logger.error(f"Failed to update document category {category_id}: {str(e)}")
        return None

async def delete_document_category(category_id: str) -> bool:
    """
    Delete a document category.
    
    Args:
        category_id: The category ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    return await documents_db.delete_document_category(category_id)

async def assign_document_to_category(document_id: str, category_id: str) -> Optional[Dict[str, Any]]:
    """
    Assign a document to a category.
    
    Args:
        document_id: The document ID to assign
        category_id: The category ID to assign to
        
    Returns:
        Assignment data or None if assignment failed
    """
    return await documents_db.assign_document_to_category(document_id, category_id)

async def remove_document_from_category(document_id: str, category_id: str) -> bool:
    """
    Remove a document from a category.
    
    Args:
        document_id: The document ID to remove
        category_id: The category ID to remove from
        
    Returns:
        True if removal succeeded, False otherwise
    """
    return await documents_db.remove_document_from_category(document_id, category_id)

async def check_document_access(document_id: str, user_id: str) -> bool:
    """
    Check if a user has access to a document.
    
    Args:
        document_id: The document ID to check access for
        user_id: The user ID to check access for
        
    Returns:
        True if the user has access, False otherwise
    """
    try:
        # Get the document
        document = await documents_db.get_document_by_id(document_id)
        if not document:
            logger.error(f"Document {document_id} not found for access check")
            return False
            
        # Check access based on document access level
        access_level = document.get('access_level', DocumentAccess.PRIVATE.value)
        
        # Owner always has access
        if document.get('owner_id') == user_id:
            return True
            
        # Public documents are accessible to all
        if access_level == DocumentAccess.PUBLIC.value:
            return True
            
        # Tenant-specific documents are accessible to the specific tenant
        if access_level == DocumentAccess.TENANT_SPECIFIC.value:
            return document.get('tenant_id') == user_id
            
        # All-tenants documents are accessible to any tenant of the property
        if access_level == DocumentAccess.ALL_TENANTS.value:
            # This would require checking if the user is a tenant of the property
            # For simplification, we'll just check if tenant_id matches or is None
            return document.get('tenant_id') == user_id or document.get('tenant_id') is None
            
        # By default, no access
        return False
    except Exception as e:
        logger.error(f"Failed to check document access for document {document_id}, user {user_id}: {str(e)}")
        return False 