from typing import Dict, List, Any, Optional
import logging
from ..config.database import supabase_client

logger = logging.getLogger(__name__)

async def get_properties(user_id: str = None) -> List[Dict[str, Any]]:
    """
    Get properties from Supabase.
    
    Args:
        user_id: Optional user ID to filter properties by owner
        
    Returns:
        List of properties
    """
    try:
        query = supabase_client.table('properties').select('*')
        
        if user_id:
            query = query.eq('owner_id', user_id)
        
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching properties: {response['error']}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get properties: {str(e)}")
        return []

async def get_property_by_id(property_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a property by ID from Supabase.
    
    Args:
        property_id: The property ID
        
    Returns:
        Property data or None if not found
    """
    try:
        response = supabase_client.table('properties').select('*').eq('id', property_id).single().execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching property: {response['error']}")
            return None
        
        return response.data
    except Exception as e:
        logger.error(f"Failed to get property {property_id}: {str(e)}")
        return None

async def create_property(property_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new property in Supabase.
    
    Args:
        property_data: The property data to insert
        
    Returns:
        Created property data or None if creation failed
    """
    try:
        response = supabase_client.table('properties').insert(property_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating property: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create property: {str(e)}")
        return None

async def update_property(property_id: str, property_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a property in Supabase.
    
    Args:
        property_id: The property ID to update
        property_data: The updated property data
        
    Returns:
        Updated property data or None if update failed
    """
    try:
        response = supabase_client.table('properties').update(property_data).eq('id', property_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating property: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update property {property_id}: {str(e)}")
        return None

async def delete_property(property_id: str) -> bool:
    """
    Delete a property from Supabase.
    
    Args:
        property_id: The property ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('properties').delete().eq('id', property_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deleting property: {response['error']}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to delete property {property_id}: {str(e)}")
        return False 