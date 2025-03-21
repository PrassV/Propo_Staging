from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from ..config.database import supabase_client

logger = logging.getLogger(__name__)

async def get_vendors(
    owner_id: str = None,
    status: str = None,
    category: str = None
) -> List[Dict[str, Any]]:
    """
    Get vendors from Supabase, optionally filtered.
    
    Args:
        owner_id: Optional owner ID to filter by
        status: Optional status to filter by
        category: Optional category to filter by
        
    Returns:
        List of vendors
    """
    try:
        query = supabase_client.table('vendors').select('*')
        
        if owner_id:
            query = query.eq('owner_id', owner_id)
            
        if status:
            query = query.eq('status', status)
            
        # Filter by category if provided
        if category:
            # This assumes categories are stored as an array in Supabase
            # and uses the contains operator to check if the category exists in the array
            query = query.contains('categories', [category])
            
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching vendors: {response['error']}")
            return []
            
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get vendors: {str(e)}")
        return []

async def get_vendor_by_id(vendor_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a vendor by ID from Supabase.
    
    Args:
        vendor_id: The vendor ID
        
    Returns:
        Vendor data or None if not found
    """
    try:
        response = supabase_client.table('vendors').select('*').eq('id', vendor_id).single().execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching vendor: {response['error']}")
            return None
            
        return response.data
    except Exception as e:
        logger.error(f"Failed to get vendor {vendor_id}: {str(e)}")
        return None

async def create_vendor(vendor_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new vendor in Supabase.
    
    Args:
        vendor_data: The vendor data to insert
        
    Returns:
        Created vendor data or None if creation failed
    """
    try:
        # Ensure categories is a list if provided
        if 'categories' in vendor_data and not isinstance(vendor_data['categories'], list):
            vendor_data['categories'] = [vendor_data['categories']]
            
        response = supabase_client.table('vendors').insert(vendor_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating vendor: {response['error']}")
            return None
            
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create vendor: {str(e)}")
        return None

async def update_vendor(vendor_id: str, vendor_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a vendor in Supabase.
    
    Args:
        vendor_id: The vendor ID to update
        vendor_data: The updated vendor data
        
    Returns:
        Updated vendor data or None if update failed
    """
    try:
        # Ensure categories is a list if provided
        if 'categories' in vendor_data and not isinstance(vendor_data['categories'], list):
            vendor_data['categories'] = [vendor_data['categories']]
            
        # Add updated_at timestamp
        vendor_data['updated_at'] = datetime.utcnow().isoformat()
        
        response = supabase_client.table('vendors').update(vendor_data).eq('id', vendor_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating vendor: {response['error']}")
            return None
            
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update vendor {vendor_id}: {str(e)}")
        return None

async def delete_vendor(vendor_id: str) -> bool:
    """
    Delete a vendor from Supabase.
    
    Args:
        vendor_id: The vendor ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('vendors').delete().eq('id', vendor_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deleting vendor: {response['error']}")
            return False
            
        return True
    except Exception as e:
        logger.error(f"Failed to delete vendor {vendor_id}: {str(e)}")
        return False

async def get_vendor_jobs(vendor_id: str) -> List[Dict[str, Any]]:
    """
    Get maintenance jobs assigned to a vendor.
    
    Args:
        vendor_id: The vendor ID
        
    Returns:
        List of maintenance jobs
    """
    try:
        response = supabase_client.table('maintenance_requests').select('*').eq('vendor_id', vendor_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching vendor jobs: {response['error']}")
            return []
            
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get jobs for vendor {vendor_id}: {str(e)}")
        return []

async def update_vendor_rating(vendor_id: str, new_rating: float) -> Optional[Dict[str, Any]]:
    """
    Update a vendor's rating based on completed jobs.
    
    Args:
        vendor_id: The vendor ID
        new_rating: The new rating value
        
    Returns:
        Updated vendor data or None if update failed
    """
    try:
        # Get current vendor data
        vendor = await get_vendor_by_id(vendor_id)
        if not vendor:
            logger.error(f"Vendor not found: {vendor_id}")
            return None
            
        # Update the rating
        update_data = {
            'rating': new_rating,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        return await update_vendor(vendor_id, update_data)
    except Exception as e:
        logger.error(f"Failed to update vendor rating: {str(e)}")
        return None

async def search_vendors(
    query: str,
    owner_id: str = None,
    category: str = None
) -> List[Dict[str, Any]]:
    """
    Search for vendors by name or company.
    
    Args:
        query: The search query
        owner_id: Optional owner ID to filter by
        category: Optional category to filter by
        
    Returns:
        List of matching vendors
    """
    try:
        # Split the query into words for better search
        search_terms = query.lower().split()
        
        # Get all vendors (potentially filtered by owner_id and category)
        vendors = await get_vendors(owner_id=owner_id, category=category)
        
        # Filter vendors manually by search terms
        # This is a simple approach; in a real application, you'd want to use
        # Supabase's full-text search capabilities if available
        filtered_vendors = []
        for vendor in vendors:
            vendor_name = vendor.get('name', '').lower()
            vendor_company = vendor.get('company', '').lower()
            vendor_description = vendor.get('description', '').lower()
            
            # Check if any search term is in the vendor fields
            if any(term in vendor_name or term in vendor_company or term in vendor_description 
                  for term in search_terms):
                filtered_vendors.append(vendor)
                
        return filtered_vendors
    except Exception as e:
        logger.error(f"Failed to search vendors: {str(e)}")
        return [] 