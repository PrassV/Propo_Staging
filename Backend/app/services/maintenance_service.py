from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import uuid

from ..db import maintenance as maintenance_db
from ..db import vendor as vendor_db
from ..db import properties as property_db
from ..models.maintenance import (
    MaintenanceRequest, 
    MaintenanceCreate, 
    MaintenanceUpdate, 
    MaintenanceComment,
    MaintenanceStatus
)

logger = logging.getLogger(__name__)

async def get_maintenance_requests(
    owner_id: str = None,
    property_id: str = None,
    tenant_id: str = None,
    status: str = None
) -> List[Dict[str, Any]]:
    """
    Get maintenance requests, optionally filtered.
    
    Args:
        owner_id: Optional owner ID to filter by
        property_id: Optional property ID to filter by
        tenant_id: Optional tenant ID to filter by
        status: Optional status to filter by
        
    Returns:
        List of maintenance requests
    """
    return await maintenance_db.get_maintenance_requests(
        owner_id=owner_id,
        property_id=property_id,
        tenant_id=tenant_id,
        status=status
    )

async def get_maintenance_request(request_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a specific maintenance request by ID.
    
    Args:
        request_id: The maintenance request ID
        
    Returns:
        Maintenance request data or None if not found
    """
    return await maintenance_db.get_maintenance_request_by_id(request_id)

async def create_maintenance_request(request_data: MaintenanceCreate, tenant_id: str = None) -> Optional[Dict[str, Any]]:
    """
    Create a new maintenance request.
    
    Args:
        request_data: The maintenance request data
        tenant_id: Optional tenant ID if request is created by tenant
        
    Returns:
        Created maintenance request data or None if creation failed
    """
    try:
        # Prepare request data
        insert_data = request_data.dict()
        
        # Set created_at timestamp
        insert_data['created_at'] = datetime.utcnow().isoformat()
        insert_data['updated_at'] = insert_data['created_at']
        
        # Generate unique ID
        insert_data['id'] = str(uuid.uuid4())
        
        # Set status to new if not provided
        if 'status' not in insert_data or not insert_data['status']:
            insert_data['status'] = MaintenanceStatus.NEW.value
        
        # Set tenant_id if provided
        if tenant_id:
            insert_data['tenant_id'] = tenant_id
            
        # Get property owner if property_id is provided
        if 'property_id' in insert_data and insert_data['property_id']:
            property_data = await property_db.get_property_by_id(insert_data['property_id'])
            if property_data:
                insert_data['owner_id'] = property_data.get('owner_id')
        
        # Create the maintenance request
        created_request = await maintenance_db.create_maintenance_request(insert_data)
        return created_request
    except Exception as e:
        logger.error(f"Error creating maintenance request: {str(e)}")
        return None

async def update_maintenance_request(request_id: str, request_data: MaintenanceUpdate) -> Optional[Dict[str, Any]]:
    """
    Update a maintenance request.
    
    Args:
        request_id: The maintenance request ID to update
        request_data: The updated maintenance request data
        
    Returns:
        Updated maintenance request data or None if update failed
    """
    try:
        # Get existing request
        existing_request = await maintenance_db.get_maintenance_request_by_id(request_id)
        if not existing_request:
            logger.error(f"Maintenance request not found: {request_id}")
            return None
            
        # Prepare update data
        update_data = {k: v for k, v in request_data.dict(exclude_unset=True).items() if v is not None}
        
        # Set updated_at timestamp
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        # Update the maintenance request
        updated_request = await maintenance_db.update_maintenance_request(request_id, update_data)
        return updated_request
    except Exception as e:
        logger.error(f"Error updating maintenance request: {str(e)}")
        return None

async def delete_maintenance_request(request_id: str) -> bool:
    """
    Delete a maintenance request.
    
    Args:
        request_id: The maintenance request ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    return await maintenance_db.delete_maintenance_request(request_id)

async def assign_vendor(request_id: str, vendor_id: str) -> Optional[Dict[str, Any]]:
    """
    Assign a vendor to a maintenance request.
    
    Args:
        request_id: The maintenance request ID
        vendor_id: The vendor ID to assign
        
    Returns:
        Updated maintenance request data or None if update failed
    """
    try:
        # Get existing request
        existing_request = await maintenance_db.get_maintenance_request_by_id(request_id)
        if not existing_request:
            logger.error(f"Maintenance request not found: {request_id}")
            return None
            
        # Get vendor
        vendor = await vendor_db.get_vendor_by_id(vendor_id)
        if not vendor:
            logger.error(f"Vendor not found: {vendor_id}")
            return None
            
        # Update request with vendor
        update_data = {
            'vendor_id': vendor_id,
            'status': MaintenanceStatus.ASSIGNED.value,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        return await maintenance_db.update_maintenance_request(request_id, update_data)
    except Exception as e:
        logger.error(f"Error assigning vendor: {str(e)}")
        return None

async def update_request_status(request_id: str, status: str) -> Optional[Dict[str, Any]]:
    """
    Update the status of a maintenance request.
    
    Args:
        request_id: The maintenance request ID
        status: The new status value
        
    Returns:
        Updated maintenance request data or None if update failed
    """
    try:
        # Get existing request
        existing_request = await maintenance_db.get_maintenance_request_by_id(request_id)
        if not existing_request:
            logger.error(f"Maintenance request not found: {request_id}")
            return None
            
        # Update status
        update_data = {
            'status': status,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # If status is completed, add completed_at timestamp
        if status == MaintenanceStatus.COMPLETED.value:
            update_data['completed_at'] = datetime.utcnow().isoformat()
            
        return await maintenance_db.update_maintenance_request(request_id, update_data)
    except Exception as e:
        logger.error(f"Error updating request status: {str(e)}")
        return None

async def add_maintenance_image(request_id: str, image_url: str, description: str = None) -> Optional[Dict[str, Any]]:
    """
    Add an image to a maintenance request.
    
    Args:
        request_id: The maintenance request ID
        image_url: The URL of the uploaded image
        description: Optional description of the image
        
    Returns:
        Updated maintenance request data or None if update failed
    """
    try:
        # Prepare image data
        image_data = {
            'url': image_url,
            'uploaded_at': datetime.utcnow().isoformat(),
        }
        
        if description:
            image_data['description'] = description
            
        return await maintenance_db.add_maintenance_image(request_id, image_data)
    except Exception as e:
        logger.error(f"Error adding maintenance image: {str(e)}")
        return None

async def add_maintenance_comment(comment_data: MaintenanceComment) -> Optional[Dict[str, Any]]:
    """
    Add a comment to a maintenance request.
    
    Args:
        comment_data: The comment data
        
    Returns:
        Created comment data or None if creation failed
    """
    try:
        # Prepare comment data
        insert_data = comment_data.dict()
        
        # Set created_at timestamp
        insert_data['created_at'] = datetime.utcnow().isoformat()
        
        # Generate unique ID
        insert_data['id'] = str(uuid.uuid4())
        
        return await maintenance_db.add_maintenance_comment(insert_data)
    except Exception as e:
        logger.error(f"Error adding maintenance comment: {str(e)}")
        return None

async def get_maintenance_comments(request_id: str) -> List[Dict[str, Any]]:
    """
    Get comments for a maintenance request.
    
    Args:
        request_id: The maintenance request ID
        
    Returns:
        List of comments
    """
    return await maintenance_db.get_maintenance_comments(request_id)

async def get_recommended_vendors(request_id: str, limit: int = 3) -> List[Dict[str, Any]]:
    """
    Get recommended vendors for a maintenance request based on category and rating.
    
    Args:
        request_id: The maintenance request ID
        limit: Maximum number of vendors to return
        
    Returns:
        List of recommended vendors
    """
    try:
        # Get the maintenance request
        request_data = await maintenance_db.get_maintenance_request_by_id(request_id)
        if not request_data:
            logger.error(f"Maintenance request not found: {request_id}")
            return []
            
        # Get the category
        category = request_data.get('category')
        if not category:
            return []
            
        # Get the property
        property_id = request_data.get('property_id')
        property_data = None
        if property_id:
            property_data = await property_db.get_property_by_id(property_id)
            
        owner_id = None
        if property_data:
            owner_id = property_data.get('owner_id')
        elif request_data.get('owner_id'):
            owner_id = request_data.get('owner_id')
            
        # Get vendors in this category for this owner
        vendors = await vendor_db.get_vendors(owner_id=owner_id, category=category)
        
        # Sort by rating (highest first)
        vendors.sort(key=lambda v: v.get('rating', 0) or 0, reverse=True)
        
        # Return top vendors up to limit
        return vendors[:limit]
    except Exception as e:
        logger.error(f"Error getting recommended vendors: {str(e)}")
        return []

async def get_maintenance_summary(owner_id: str) -> Dict[str, Any]:
    """
    Get a summary of maintenance requests for an owner.
    
    Args:
        owner_id: The owner ID
        
    Returns:
        Summary data
    """
    try:
        # Get all maintenance requests for the owner
        requests = await maintenance_db.get_maintenance_requests(owner_id=owner_id)
        
        # Count by status
        status_counts = {}
        for status in MaintenanceStatus:
            status_counts[status.value] = 0
            
        for request in requests:
            status = request.get('status')
            if status in status_counts:
                status_counts[status] += 1
            
        # Count by priority
        priority_counts = {'low': 0, 'medium': 0, 'high': 0, 'emergency': 0}
        for request in requests:
            priority = request.get('priority', 'low').lower()
            if priority in priority_counts:
                priority_counts[priority] += 1
                
        # Count open requests (not completed or cancelled)
        open_statuses = [
            MaintenanceStatus.NEW.value, 
            MaintenanceStatus.ASSIGNED.value, 
            MaintenanceStatus.IN_PROGRESS.value
        ]
        open_requests = [r for r in requests if r.get('status') in open_statuses]
        
        return {
            'total_requests': len(requests),
            'open_requests': len(open_requests),
            'status_counts': status_counts,
            'priority_counts': priority_counts
        }
    except Exception as e:
        logger.error(f"Error getting maintenance summary: {str(e)}")
        return {
            'total_requests': 0,
            'open_requests': 0,
            'status_counts': {},
            'priority_counts': {}
        } 