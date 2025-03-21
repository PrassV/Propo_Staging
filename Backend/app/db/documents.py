from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from ..config.database import supabase_client

logger = logging.getLogger(__name__)

async def get_documents(
    owner_id: str = None,
    property_id: str = None,
    tenant_id: str = None,
    document_type: str = None,
    status: str = None
) -> List[Dict[str, Any]]:
    """
    Get documents from Supabase, optionally filtered.
    
    Args:
        owner_id: Optional owner ID to filter by
        property_id: Optional property ID to filter by
        tenant_id: Optional tenant ID to filter by
        document_type: Optional document type to filter by
        status: Optional status to filter by
        
    Returns:
        List of documents
    """
    try:
        query = supabase_client.table('documents').select('*')
        
        if owner_id:
            query = query.eq('owner_id', owner_id)
        
        if property_id:
            query = query.eq('property_id', property_id)
            
        if tenant_id:
            query = query.eq('tenant_id', tenant_id)
            
        if document_type:
            query = query.eq('document_type', document_type)
            
        if status:
            query = query.eq('status', status)
            
        # Order by most recent
        query = query.order('created_at', desc=True)
        
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching documents: {response['error']}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get documents: {str(e)}")
        return []

async def get_document_by_id(document_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a document by ID from Supabase.
    
    Args:
        document_id: The document ID
        
    Returns:
        Document data or None if not found
    """
    try:
        response = supabase_client.table('documents').select('*').eq('id', document_id).single().execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching document: {response['error']}")
            return None
        
        return response.data
    except Exception as e:
        logger.error(f"Failed to get document {document_id}: {str(e)}")
        return None

async def create_document(document_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new document in Supabase.
    
    Args:
        document_data: The document data to insert
        
    Returns:
        Created document data or None if creation failed
    """
    try:
        response = supabase_client.table('documents').insert(document_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating document: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create document: {str(e)}")
        return None

async def update_document(document_id: str, document_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a document in Supabase.
    
    Args:
        document_id: The document ID to update
        document_data: The updated document data
        
    Returns:
        Updated document data or None if update failed
    """
    try:
        # Add updated_at timestamp
        document_data['updated_at'] = datetime.utcnow().isoformat()
        
        response = supabase_client.table('documents').update(document_data).eq('id', document_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating document: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update document {document_id}: {str(e)}")
        return None

async def delete_document(document_id: str) -> bool:
    """
    Delete a document from Supabase.
    
    Args:
        document_id: The document ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('documents').delete().eq('id', document_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deleting document: {response['error']}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to delete document {document_id}: {str(e)}")
        return False

async def create_document_version(version_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new document version in Supabase.
    
    Args:
        version_data: The version data to insert
        
    Returns:
        Created version data or None if creation failed
    """
    try:
        response = supabase_client.table('document_versions').insert(version_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating document version: {response['error']}")
            return None
        
        # Update the document with the new version number
        document_id = version_data.get('document_id')
        version = version_data.get('version')
        
        if document_id and version:
            await update_document(document_id, {'version': version})
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create document version: {str(e)}")
        return None

async def get_document_versions(document_id: str) -> List[Dict[str, Any]]:
    """
    Get versions of a document from Supabase.
    
    Args:
        document_id: The document ID to get versions for
        
    Returns:
        List of document versions
    """
    try:
        response = supabase_client.table('document_versions').select('*').eq('document_id', document_id).order('version', desc=True).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching document versions: {response['error']}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get document versions for document {document_id}: {str(e)}")
        return []

async def create_document_share(share_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new document share in Supabase.
    
    Args:
        share_data: The share data to insert
        
    Returns:
        Created share data or None if creation failed
    """
    try:
        response = supabase_client.table('document_shares').insert(share_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating document share: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create document share: {str(e)}")
        return None

async def get_document_shares(document_id: str) -> List[Dict[str, Any]]:
    """
    Get shares of a document from Supabase.
    
    Args:
        document_id: The document ID to get shares for
        
    Returns:
        List of document shares
    """
    try:
        response = supabase_client.table('document_shares').select('*').eq('document_id', document_id).eq('is_active', True).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching document shares: {response['error']}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get document shares for document {document_id}: {str(e)}")
        return []

async def deactivate_document_share(share_id: str) -> bool:
    """
    Deactivate a document share in Supabase.
    
    Args:
        share_id: The share ID to deactivate
        
    Returns:
        True if deactivation succeeded, False otherwise
    """
    try:
        response = supabase_client.table('document_shares').update({'is_active': False}).eq('id', share_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deactivating document share: {response['error']}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to deactivate document share {share_id}: {str(e)}")
        return False

async def get_document_categories(owner_id: str = None) -> List[Dict[str, Any]]:
    """
    Get document categories from Supabase.
    
    Args:
        owner_id: Optional owner ID to filter by
        
    Returns:
        List of document categories
    """
    try:
        query = supabase_client.table('document_categories').select('*')
        
        if owner_id:
            query = query.eq('owner_id', owner_id)
        
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching document categories: {response['error']}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get document categories: {str(e)}")
        return []

async def create_document_category(category_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new document category in Supabase.
    
    Args:
        category_data: The category data to insert
        
    Returns:
        Created category data or None if creation failed
    """
    try:
        response = supabase_client.table('document_categories').insert(category_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating document category: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create document category: {str(e)}")
        return None

async def update_document_category(category_id: str, category_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a document category in Supabase.
    
    Args:
        category_id: The category ID to update
        category_data: The updated category data
        
    Returns:
        Updated category data or None if update failed
    """
    try:
        # Add updated_at timestamp
        category_data['updated_at'] = datetime.utcnow().isoformat()
        
        response = supabase_client.table('document_categories').update(category_data).eq('id', category_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating document category: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update document category {category_id}: {str(e)}")
        return None

async def delete_document_category(category_id: str) -> bool:
    """
    Delete a document category from Supabase.
    
    Args:
        category_id: The category ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('document_categories').delete().eq('id', category_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deleting document category: {response['error']}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to delete document category {category_id}: {str(e)}")
        return False

async def assign_document_to_category(document_id: str, category_id: str) -> Optional[Dict[str, Any]]:
    """
    Assign a document to a category in Supabase.
    
    Args:
        document_id: The document ID to assign
        category_id: The category ID to assign to
        
    Returns:
        Assignment data or None if assignment failed
    """
    try:
        assignment_data = {
            'document_id': document_id,
            'category_id': category_id
        }
        
        response = supabase_client.table('document_category_assignments').insert(assignment_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error assigning document to category: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to assign document {document_id} to category {category_id}: {str(e)}")
        return None

async def remove_document_from_category(document_id: str, category_id: str) -> bool:
    """
    Remove a document from a category in Supabase.
    
    Args:
        document_id: The document ID to remove
        category_id: The category ID to remove from
        
    Returns:
        True if removal succeeded, False otherwise
    """
    try:
        response = supabase_client.table('document_category_assignments').delete().eq('document_id', document_id).eq('category_id', category_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error removing document from category: {response['error']}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to remove document {document_id} from category {category_id}: {str(e)}")
        return False 