from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from ..config.database import supabase_client
from supabase import create_client

logger = logging.getLogger(__name__)

# --- DB Functions for Maintenance Requests --- #

async def create_request_db(db_client: create_client, request_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Insert a new maintenance request record."""
    try:
        response = db_client.table('maintenance_requests').insert(request_data).execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"[db.create_request_db] DB error: {response.error.message}")
            # Consider raising for specific codes like foreign key violations if needed
            return None

        if response.data:
            logger.info(f"[db.create_request_db] Inserted maintenance request: {response.data[0].get('id')}")
            return response.data[0]
        else:
            logger.error(f"[db.create_request_db] Insert returned no data.")
            return None
    except Exception as e:
        logger.error(f"[db.create_request_db] Exception: {e}", exc_info=True)
        return None

async def get_requests_for_unit_db(
    db_client: create_client, 
    unit_id: str, 
    skip: int = 0, 
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Get maintenance requests filtered by unit_id."""
    try:
        query = db_client.table('maintenance_requests')\
                       .select('*, vendor:maintenance_vendors(*)')\
                       .eq('unit_id', unit_id)\
                       .order('created_at', desc=True)\
                       .range(skip, skip + limit - 1)
                       
        response = query.execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"[db.get_requests_for_unit_db] DB error: {response.error.message}")
            return []
        
        requests = response.data or []
        # Process vendor details if needed (copied from get_maintenance_requests)
        for request in requests:
            if request.get('vendor'):
                request['vendor_details'] = request.pop('vendor')
        return requests

    except Exception as e:
        logger.error(f"[db.get_requests_for_unit_db] Exception: {e}", exc_info=True)
        return []

# --- Existing Functions below --- #

async def get_maintenance_requests(
    property_id: str = None, 
    owner_id: str = None, 
    tenant_id: str = None,
    status: str = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get maintenance requests from Supabase, optionally filtered.
    
    Args:
        property_id: Optional property ID to filter by
        owner_id: Optional owner ID to filter by (filters via property ownership)
        tenant_id: Optional tenant ID to filter by
        status: Optional status to filter by
        start_date: Optional start date (YYYY-MM-DD) to filter by created_at
        end_date: Optional end date (YYYY-MM-DD) to filter by created_at
        
    Returns:
        List of maintenance requests
    """
    try:
        # When filtering by owner_id, we need to join with properties table
        if owner_id:
            query = supabase_client.table('maintenance_requests')\
                .select('*, vendor:maintenance_vendors(*), property:properties!inner(*)')\
                .eq('property.owner_id', owner_id)
        else:
            query = supabase_client.table('maintenance_requests')\
                .select('*, vendor:maintenance_vendors(*)')
        
        if property_id:
            query = query.eq('property_id', property_id)
        
        if tenant_id:
            query = query.eq('tenant_id', tenant_id)
            
        if status:
            query = query.eq('status', status)
        
        if start_date:
            query = query.gte('created_at', start_date)
        
        if end_date:
            query = query.lte('created_at', end_date + 'T23:59:59')
        
        query = query.order('created_at', desc=True)
        
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching maintenance requests: {response['error']}")
            return []
        
        requests = response.data or []
        
        # Process the joined vendor data
        for request in requests:
            if request.get('vendor'):
                request['vendor_details'] = request.pop('vendor')
            # Remove the property data as it's only needed for filtering
            if request.get('property'):
                request.pop('property')
                
        return requests
    except Exception as e:
        logger.error(f"Failed to get maintenance requests: {str(e)}")
        return []

async def get_maintenance_request_by_id(request_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a maintenance request by ID from Supabase.
    
    Args:
        request_id: The maintenance request ID
        
    Returns:
        Maintenance request data or None if not found
    """
    try:
        response = supabase_client.table('maintenance_requests').select('*, vendor:maintenance_vendors(*)').eq('id', request_id).single().execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching maintenance request: {response['error']}")
            return None
        
        request = response.data
        
        # Process the joined vendor data
        if request and request.get('vendor'):
            request['vendor_details'] = request.pop('vendor')
            
        return request
    except Exception as e:
        logger.error(f"Failed to get maintenance request {request_id}: {str(e)}")
        return None

async def create_maintenance_request(request_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new maintenance request in Supabase.
    
    Args:
        request_data: The maintenance request data to insert
        
    Returns:
        Created maintenance request data or None if creation failed
    """
    try:
        # Prepare data for insertion
        insert_data = {**request_data}
        if 'vendor_details' in insert_data:
            del insert_data['vendor_details']
            
        response = supabase_client.table('maintenance_requests').insert(insert_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating maintenance request: {response['error']}")
            return None
        
        created_request = response.data[0] if response.data else None
        
        # If successfully created, retrieve the full request with joins
        if created_request:
            return await get_maintenance_request_by_id(created_request['id'])
        
        return None
    except Exception as e:
        logger.error(f"Failed to create maintenance request: {str(e)}")
        return None

async def update_maintenance_request(request_id: str, request_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a maintenance request in Supabase.
    
    Args:
        request_id: The maintenance request ID to update
        request_data: The updated maintenance request data
        
    Returns:
        Updated maintenance request data or None if update failed
    """
    try:
        # Prepare data for update
        update_data = {**request_data}
        if 'vendor_details' in update_data:
            del update_data['vendor_details']
            
        response = supabase_client.table('maintenance_requests').update(update_data).eq('id', request_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating maintenance request: {response['error']}")
            return None
        
        updated_request = response.data[0] if response.data else None
        
        # If successfully updated, retrieve the full request with joins
        if updated_request:
            return await get_maintenance_request_by_id(updated_request['id'])
        
        return None
    except Exception as e:
        logger.error(f"Failed to update maintenance request {request_id}: {str(e)}")
        return None

async def delete_maintenance_request(request_id: str) -> bool:
    """
    Delete a maintenance request from Supabase.
    
    Args:
        request_id: The maintenance request ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('maintenance_requests').delete().eq('id', request_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deleting maintenance request: {response['error']}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to delete maintenance request {request_id}: {str(e)}")
        return False

async def add_maintenance_image(request_id: str, image_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Add an image to a maintenance request.
    
    Args:
        request_id: The maintenance request ID
        image_data: The image data to add
        
    Returns:
        Updated maintenance request data or None if update failed
    """
    try:
        # Get existing maintenance request
        existing_request = await get_maintenance_request_by_id(request_id)
        if not existing_request:
            logger.error(f"Maintenance request not found: {request_id}")
            return None
        
        # Get existing images or initialize empty list
        images = existing_request.get("images", []) or []
        
        # Add new image
        images.append(image_data)
        
        # Update maintenance request with new images
        update_dict = {
            "images": images,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        return await update_maintenance_request(request_id, update_dict)
    except Exception as e:
        logger.error(f"Failed to add maintenance image: {str(e)}")
        return None

async def add_maintenance_comment(comment_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Add a comment to a maintenance request.
    
    Args:
        comment_data: The comment data to add
        
    Returns:
        Created comment data or None if creation failed
    """
    try:
        response = supabase_client.table('maintenance_comments').insert(comment_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating maintenance comment: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to add maintenance comment: {str(e)}")
        return None

async def get_maintenance_comments(request_id: str) -> List[Dict[str, Any]]:
    """
    Get comments for a maintenance request.
    
    Args:
        request_id: The maintenance request ID
        
    Returns:
        List of comments
    """
    try:
        response = supabase_client.table('maintenance_comments').select('*').eq('request_id', request_id).order('created_at', desc=False).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching maintenance comments: {response['error']}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get maintenance comments: {str(e)}")
        return []

async def get_tenant_properties(tenant_id: str) -> List[Dict[str, Any]]:
    """
    Get properties associated with a tenant through property_tenants links.
    
    This is used for access control in the maintenance request count function.
    
    Args:
        tenant_id: The tenant ID to get properties for
        
    Returns:
        List of property data including owner_id
    """
    try:
        # First get property IDs from property_tenants table
        links_response = supabase_client.table('property_tenants').select('property_id').eq('tenant_id', tenant_id).execute()
        
        if "error" in links_response and links_response["error"]:
            logger.error(f"Error fetching property links for tenant: {links_response['error']}")
            return []
            
        if not links_response.data:
            # No properties linked to this tenant
            return []
            
        # Extract property IDs
        property_ids = [link['property_id'] for link in links_response.data]
        
        # Get property information (including owner_id)
        properties = []
        for property_id in property_ids:
            property_response = supabase_client.table('properties').select('id, owner_id, property_name').eq('id', property_id).execute()
            
            if not property_response.error and property_response.data:
                properties.append(property_response.data[0])
                
        return properties
    except Exception as e:
        logger.error(f"Failed to get properties for tenant {tenant_id}: {str(e)}")
        return [] 