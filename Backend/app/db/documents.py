from typing import Dict, List, Any, Optional
import logging
# Import the actual client from config
from app.config.database import supabase_client 
from datetime import datetime

logger = logging.getLogger(__name__)
TABLE = "documents" # Assuming your table is named 'documents'

async def get_documents(
    owner_id: Optional[str] = None,
    property_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    unit_id: Optional[str] = None,
    document_type: Optional[str] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get documents, optionally filtered.
    
    Args:
        owner_id: Optional owner ID to filter by
        property_id: Optional property ID to filter by
        tenant_id: Optional tenant ID to filter by
        unit_id: Optional unit ID to filter by
        document_type: Optional document type to filter by
        status: Optional status to filter by
        
    Returns:
        List of documents
    """
    try:
        supabase = supabase_client
        query = supabase.table(TABLE).select("*")
        
        if owner_id:
            query = query.eq("owner_id", owner_id)
        if property_id:
            query = query.eq("property_id", property_id)
        if tenant_id:
            query = query.eq("tenant_id", tenant_id)
        if unit_id:
            query = query.eq("unit_id", unit_id)
        if document_type:
            query = query.eq("document_type", document_type)
        if status:
            query = query.eq("status", status)
        else:
            # By default, only return active documents
            query = query.eq("status", "ACTIVE")

        # Execute the query
        response = query.order("created_at", desc=True).execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching documents DB: {response.error.message}")
            return []

        logger.debug(f"Supabase get_documents response: {response}")
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error getting documents: {str(e)}")
        return []

async def get_document_by_id(document_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single document by its ID."""
    try:
        supabase = supabase_client
        response = await supabase.table(TABLE).select("*").eq("id", document_id).maybe_single().execute()
        logger.debug(f"Supabase get_document_by_id response: {response}")
        return response.data
    except Exception as e:
        logger.error(f"Error fetching document {document_id} from DB: {e}", exc_info=True)
        return None

async def create_document(document_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Insert a new document record."""
    try:
        supabase = supabase_client
        response = await supabase.table(TABLE).insert(document_dict).execute()
        logger.debug(f"Supabase create_document response: {response}")
        # Return the first item in the data list upon successful insert
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating document in DB: {e}", exc_info=True)
        return None

async def update_document(document_id: str, update_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update an existing document record."""
    try:
        supabase = supabase_client
        # Ensure updated_at is set
        update_dict['updated_at'] = datetime.utcnow().isoformat()
        response = await supabase.table(TABLE).update(update_dict).eq("id", document_id).execute()
        logger.debug(f"Supabase update_document response: {response}")
        # Return the first item in the data list upon successful update
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error updating document {document_id} in DB: {e}", exc_info=True)
        return None

async def delete_document(document_id: str) -> bool:
    """Delete a document record by its ID."""
    try:
        supabase = supabase_client
        response = await supabase.table(TABLE).delete().eq("id", document_id).execute()
        logger.debug(f"Supabase delete_document response: {response}")
        # Check if deletion was successful. A successful delete might return an empty data list.
        # Check for errors or specific success indicators if the client library provides them.
        # For now, assume success if no exception occurs and response is received.
        return True # Simplified check, might need refinement based on actual Supabase client behavior
    except Exception as e:
        logger.error(f"Error deleting document {document_id} from DB: {e}", exc_info=True)
        return False

# --- Implemented Missing Functions (Basic) --- 

async def check_document_access(document_id: str, user_id: str) -> bool:
    """Check if a user has permission to access a document.
    NOTE: This is a basic implementation. Real implementation needs careful
    consideration of ownership, shares, property/tenant links, and RLS policies.
    """
    try:
        supabase = supabase_client
        # 1. Check direct ownership
        response = await supabase.table(TABLE).select('owner_id').eq('id', document_id).maybe_single().execute()
        if response.data and response.data.get('owner_id') == user_id:
            logger.debug(f"Access check: User {user_id} owns document {document_id}.")
            return True

        # 2. TODO: Check if user is an admin (requires fetching user profile/role)
        # user_profile = await user_service.get_user_profile(user_id)
        # if user_profile and user_profile.get('role') == 'admin':
        #     return True

        # 3. TODO: Check document_shares table for explicit shares with this user_id
        # share_response = await supabase.table('document_shares').select('id').eq('document_id', document_id).eq('shared_with', user_id).eq('is_active', True).limit(1).execute()
        # if share_response.data:
        #     return True
        
        # 4. TODO: Check if user is a tenant linked to the document's property/tenant ID (complex join/check)
        
        logger.warning(f"Access check failed or not fully implemented for user {user_id} on document {document_id}. Denying access.")
        return False # Default deny
    except Exception as e:
        logger.error(f"Error checking document access for doc {document_id}, user {user_id}: {e}", exc_info=True)
        return False

async def create_document_version(version_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Insert a new document version record.
    Assumes a 'document_versions' table exists.
    """
    logger.info(f"Creating document version for doc: {version_data.get('document_id')}")
    # TODO: Ensure 'document_versions' table exists in Supabase.
    try:
        supabase = supabase_client
        response = await supabase.table('document_versions').insert(version_data).execute()
        logger.debug(f"Supabase create_document_version response: {response}")
        # Also update the main document's version number?
        # This might be better handled in the service layer.
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating document version in DB: {e}", exc_info=True)
        return None

async def get_document_versions(document_id: str) -> List[Dict[str, Any]]:
    """Fetch document versions ordered by version number descending.
    Assumes a 'document_versions' table exists.
    """
    logger.info(f"Fetching document versions for doc: {document_id}")
    # TODO: Ensure 'document_versions' table exists in Supabase.
    try:
        supabase = supabase_client
        response = await supabase.table('document_versions')\
                           .select('*')\
                           .eq('document_id', document_id)\
                           .order('version', desc=True)\
                           .execute()
        logger.debug(f"Supabase get_document_versions response: {response}")
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching document versions from DB: {e}", exc_info=True)
        return []

async def create_document_share(share_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Insert a new document share record.
    Assumes a 'document_shares' table exists.
    """
    logger.info(f"Creating document share for doc: {share_data.get('document_id')}")
    # TODO: Ensure 'document_shares' table exists in Supabase.
    try:
        supabase = supabase_client
        response = await supabase.table('document_shares').insert(share_data).execute()
        logger.debug(f"Supabase create_document_share response: {response}")
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating document share in DB: {e}", exc_info=True)
        return None

async def get_document_shares(document_id: str) -> List[Dict[str, Any]]:
    """Fetch active document shares for a document.
    Assumes a 'document_shares' table exists.
    """
    logger.info(f"Fetching document shares for doc: {document_id}")
    # TODO: Ensure 'document_shares' table exists in Supabase.
    try:
        supabase = supabase_client
        response = await supabase.table('document_shares')\
                           .select('*')\
                           .eq('document_id', document_id)\
                           .eq('is_active', True)\
                           .execute()
        logger.debug(f"Supabase get_document_shares response: {response}")
        return response.data or []
    except Exception as e:
        logger.error(f"Error fetching document shares from DB: {e}", exc_info=True)
        return []

# Add stubs for category functions if needed by the service layer
# async def get_document_categories(...)
# async def create_document_category(...)
# etc. 