from typing import Dict, List, Any, Optional
import logging
from ..config.database import supabase_client

logger = logging.getLogger(__name__)

async def get_tenants(property_id: str = None, owner_id: str = None) -> List[Dict[str, Any]]:
    """
    Get tenants from Supabase, optionally filtered by property or owner.
    
    Args:
        property_id: Optional property ID to filter by
        owner_id: Optional owner ID to filter by
        
    Returns:
        List of tenants
    """
    try:
        query = supabase_client.table('tenants').select('*')
        
        if property_id:
            query = query.eq('property_id', property_id)
        
        if owner_id:
            query = query.eq('owner_id', owner_id)
        
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching tenants: {response['error']}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get tenants: {str(e)}")
        return []

async def get_tenant_by_id(tenant_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a tenant by ID from Supabase.
    
    Args:
        tenant_id: The tenant ID
        
    Returns:
        Tenant data or None if not found
    """
    try:
        response = supabase_client.table('tenants').select('*').eq('id', tenant_id).single().execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching tenant: {response['error']}")
            return None
        
        return response.data
    except Exception as e:
        logger.error(f"Failed to get tenant {tenant_id}: {str(e)}")
        return None

async def create_tenant(tenant_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new tenant in Supabase.
    
    Args:
        tenant_data: The tenant data to insert
        
    Returns:
        Created tenant data or None if creation failed
    """
    try:
        response = supabase_client.table('tenants').insert(tenant_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating tenant: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create tenant: {str(e)}")
        return None

async def update_tenant(tenant_id: str, tenant_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a tenant in Supabase.
    
    Args:
        tenant_id: The tenant ID to update
        tenant_data: The updated tenant data
        
    Returns:
        Updated tenant data or None if update failed
    """
    try:
        response = supabase_client.table('tenants').update(tenant_data).eq('id', tenant_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating tenant: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update tenant {tenant_id}: {str(e)}")
        return None

async def delete_tenant(tenant_id: str) -> bool:
    """
    Delete a tenant from Supabase.
    
    Args:
        tenant_id: The tenant ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('tenants').delete().eq('id', tenant_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deleting tenant: {response['error']}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to delete tenant {tenant_id}: {str(e)}")
        return False 