from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import uuid

from ..db import vendor as vendor_db
from ..models.vendor import VendorCreate, VendorUpdate

logger = logging.getLogger(__name__)

async def get_vendors(
    owner_id: str = None,
    status: str = None,
    category: str = None
) -> List[Dict[str, Any]]:
    """
    Get vendors, optionally filtered.
    
    Args:
        owner_id: Optional owner ID to filter by
        status: Optional status to filter by
        category: Optional category to filter by
        
    Returns:
        List of vendors
    """
    return await vendor_db.get_vendors(
        owner_id=owner_id,
        status=status,
        category=category
    )

async def get_vendor(vendor_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a specific vendor by ID.
    
    Args:
        vendor_id: The vendor ID
        
    Returns:
        Vendor data or None if not found
    """
    return await vendor_db.get_vendor_by_id(vendor_id)

async def create_vendor(vendor_data: VendorCreate, owner_id: str) -> Optional[Dict[str, Any]]:
    """
    Create a new vendor.
    
    Args:
        vendor_data: The vendor data
        owner_id: The owner ID
        
    Returns:
        Created vendor data or None if creation failed
    """
    try:
        # Prepare vendor data
        insert_data = vendor_data.dict()
        
        # Add owner ID
        insert_data['owner_id'] = owner_id
        
        # Set created_at and updated_at timestamps
        insert_data['created_at'] = datetime.utcnow().isoformat()
        insert_data['updated_at'] = insert_data['created_at']
        
        # Generate unique ID
        insert_data['id'] = str(uuid.uuid4())
        
        # Set initial status to pending_verification if not provided
        if 'status' not in insert_data or not insert_data['status']:
            insert_data['status'] = 'pending_verification'
            
        # Initialize completed_jobs to 0
        insert_data['completed_jobs'] = 0
        
        # Create the vendor
        return await vendor_db.create_vendor(insert_data)
    except Exception as e:
        logger.error(f"Error creating vendor: {str(e)}")
        return None

async def update_vendor(vendor_id: str, vendor_data: VendorUpdate) -> Optional[Dict[str, Any]]:
    """
    Update a vendor.
    
    Args:
        vendor_id: The vendor ID to update
        vendor_data: The updated vendor data
        
    Returns:
        Updated vendor data or None if update failed
    """
    try:
        # Get existing vendor
        existing_vendor = await vendor_db.get_vendor_by_id(vendor_id)
        if not existing_vendor:
            logger.error(f"Vendor not found: {vendor_id}")
            return None
            
        # Prepare update data
        update_data = {k: v for k, v in vendor_data.dict(exclude_unset=True).items() if v is not None}
        
        # Update the vendor
        return await vendor_db.update_vendor(vendor_id, update_data)
    except Exception as e:
        logger.error(f"Error updating vendor: {str(e)}")
        return None

async def delete_vendor(vendor_id: str) -> bool:
    """
    Delete a vendor.
    
    Args:
        vendor_id: The vendor ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    return await vendor_db.delete_vendor(vendor_id)

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
    return await vendor_db.search_vendors(
        query=query,
        owner_id=owner_id,
        category=category
    )

async def update_vendor_rating(vendor_id: str, new_rating: float) -> Optional[Dict[str, Any]]:
    """
    Update a vendor's rating.
    
    Args:
        vendor_id: The vendor ID
        new_rating: The new rating value (1-5)
        
    Returns:
        Updated vendor data or None if update failed
    """
    try:
        # Validate rating
        if new_rating < 1 or new_rating > 5:
            logger.error(f"Invalid rating value: {new_rating}")
            return None
            
        # Update the vendor rating
        return await vendor_db.update_vendor_rating(vendor_id, new_rating)
    except Exception as e:
        logger.error(f"Error updating vendor rating: {str(e)}")
        return None

async def get_vendor_jobs(vendor_id: str) -> List[Dict[str, Any]]:
    """
    Get maintenance jobs assigned to a vendor.
    
    Args:
        vendor_id: The vendor ID
        
    Returns:
        List of maintenance jobs
    """
    return await vendor_db.get_vendor_jobs(vendor_id)

async def increment_completed_jobs(vendor_id: str) -> Optional[Dict[str, Any]]:
    """
    Increment the completed jobs count for a vendor.
    
    Args:
        vendor_id: The vendor ID
        
    Returns:
        Updated vendor data or None if update failed
    """
    try:
        # Get existing vendor
        vendor = await vendor_db.get_vendor_by_id(vendor_id)
        if not vendor:
            logger.error(f"Vendor not found: {vendor_id}")
            return None
            
        # Calculate new completed_jobs count
        current_count = vendor.get('completed_jobs', 0) or 0
        new_count = current_count + 1
        
        # Update vendor
        update_data = {
            'completed_jobs': new_count,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        return await vendor_db.update_vendor(vendor_id, update_data)
    except Exception as e:
        logger.error(f"Error incrementing completed jobs: {str(e)}")
        return None

async def get_vendor_statistics(owner_id: str) -> Dict[str, Any]:
    """
    Get statistics about vendors for an owner.
    
    Args:
        owner_id: The owner ID
        
    Returns:
        Vendor statistics
    """
    try:
        # Get all vendors for the owner
        vendors = await vendor_db.get_vendors(owner_id=owner_id)
        
        # Count by status
        status_counts = {
            'active': 0,
            'inactive': 0,
            'pending_verification': 0
        }
        
        for vendor in vendors:
            status = vendor.get('status')
            if status in status_counts:
                status_counts[status] += 1
                
        # Count by category
        category_counts = {}
        for vendor in vendors:
            categories = vendor.get('categories', []) or []
            for category in categories:
                if category in category_counts:
                    category_counts[category] += 1
                else:
                    category_counts[category] = 1
                    
        # Calculate average rating
        total_rating = 0
        rated_vendors = 0
        for vendor in vendors:
            rating = vendor.get('rating')
            if rating is not None:
                total_rating += rating
                rated_vendors += 1
                
        avg_rating = total_rating / rated_vendors if rated_vendors > 0 else 0
        
        # Calculate total jobs completed
        total_jobs = sum(vendor.get('completed_jobs', 0) or 0 for vendor in vendors)
        
        return {
            'total_vendors': len(vendors),
            'active_vendors': status_counts['active'],
            'status_counts': status_counts,
            'category_counts': category_counts,
            'average_rating': avg_rating,
            'total_jobs_completed': total_jobs
        }
    except Exception as e:
        logger.error(f"Error getting vendor statistics: {str(e)}")
        return {
            'total_vendors': 0,
            'active_vendors': 0,
            'status_counts': {},
            'category_counts': {},
            'average_rating': 0,
            'total_jobs_completed': 0
        } 