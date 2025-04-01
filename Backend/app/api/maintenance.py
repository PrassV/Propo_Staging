from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query, UploadFile, File, Form
from pydantic import BaseModel, Field
import logging
import uuid

from app.models.maintenance import (
    MaintenanceRequest,
    MaintenanceCreate,
    MaintenanceUpdate,
    MaintenanceComment,
    MaintenanceStatus,
    MaintenancePriority
)
from app.services import maintenance_service
from app.config.auth import get_current_user

router = APIRouter(
    prefix="/maintenance",
    tags=["maintenance"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

# Mock maintenance data
MOCK_MAINTENANCE = [
    {
        "id": "m1",
        "property_id": "1",
        "title": "Leaking Faucet",
        "description": "The kitchen faucet is leaking and needs repair",
        "category": "plumbing",
        "priority": "medium",
        "status": "open",
        "tenant_id": "tenant1",
        "owner_id": "user123",
        "created_at": "2023-07-10T10:30:00",
        "updated_at": "2023-07-10T10:30:00"
    },
    {
        "id": "m2",
        "property_id": "1",
        "title": "Broken AC",
        "description": "The air conditioning isn't working",
        "category": "hvac",
        "priority": "high",
        "status": "in_progress",
        "tenant_id": "tenant1",
        "owner_id": "user123",
        "vendor_id": "vendor1",
        "created_at": "2023-07-05T14:20:00",
        "updated_at": "2023-07-06T09:15:00"
    },
    {
        "id": "m3",
        "property_id": "2",
        "title": "Light Fixture Broken",
        "description": "The ceiling light in the living room doesn't work",
        "category": "electrical",
        "priority": "low",
        "status": "completed",
        "tenant_id": "tenant2",
        "owner_id": "user123",
        "vendor_id": "vendor2",
        "created_at": "2023-06-28T16:45:00",
        "updated_at": "2023-07-01T11:30:00",
        "completed_date": "2023-07-01T11:30:00"
    }
]

# Get all maintenance requests (with optional filters)
@router.get("/", response_model=List[MaintenanceRequest])
async def get_maintenance_requests(
    property_id: Optional[str] = Query(None, description="Filter by property ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get all maintenance requests for the current user (using mock data for now).
    
    If the user is a landlord, returns requests for their properties.
    If the user is a tenant, returns only their requests.
    """
    try:
        logger.info(f"Returning mock maintenance requests")
        
        # Apply filters if provided
        result = MOCK_MAINTENANCE
        if property_id:
            result = [r for r in result if r["property_id"] == property_id]
        if status:
            result = [r for r in result if r["status"] == status]
            
        return result
    except Exception as e:
        logger.error(f"Error getting maintenance requests: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve maintenance requests")

# Get a specific maintenance request by ID
@router.get("/{request_id}", response_model=MaintenanceRequest)
async def get_maintenance_request(
    request_id: str = Path(..., description="The maintenance request ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get a specific maintenance request (using mock data for now).
    
    Users can only access their own requests or requests for their properties.
    """
    try:
        # Find request in mock data
        for request in MOCK_MAINTENANCE:
            if request["id"] == request_id:
                return request
                
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting maintenance request: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve maintenance request")

# Create a new maintenance request
@router.post("/", response_model=MaintenanceRequest)
async def create_maintenance_request(
    request_data: MaintenanceCreate,
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a new maintenance request (using mock data for now).
    
    Tenants can create requests for their rented properties.
    Owners can create requests for any of their properties.
    """
    try:
        # Just return a mock response
        return MOCK_MAINTENANCE[0]
    except Exception as e:
        logger.error(f"Error creating maintenance request: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create maintenance request")

# Update a maintenance request
@router.put("/{request_id}", response_model=MaintenanceRequest)
async def update_maintenance_request(
    request_data: MaintenanceUpdate,
    request_id: str = Path(..., description="The maintenance request ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Update a maintenance request.
    
    Tenants can update only certain fields of their own requests.
    Owners can update any field of requests for their properties.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)
        
        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")
            
        # Check authorization
        if user_type == "tenant":
            if existing_request.get("tenant_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to update this maintenance request")
                
            # Tenants can't update certain fields
            restricted_fields = ["vendor_id", "status", "owner_id", "property_id"]
            for field in restricted_fields:
                if getattr(request_data, field, None) is not None:
                    raise HTTPException(
                        status_code=403, 
                        detail=f"Tenants are not allowed to update the {field} field"
                    )
        elif user_type == "owner" and existing_request.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this maintenance request")
            
        # Update the request
        updated_request = await maintenance_service.update_maintenance_request(
            request_id=request_id,
            request_data=request_data
        )
        
        if not updated_request:
            raise HTTPException(status_code=500, detail="Failed to update maintenance request")
            
        return updated_request
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating maintenance request: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update maintenance request")

# Delete a maintenance request
@router.delete("/{request_id}", response_model=dict)
async def delete_maintenance_request(
    request_id: str = Path(..., description="The maintenance request ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Delete a maintenance request.
    
    Only owners can delete maintenance requests for their properties.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)
        
        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")
            
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to delete maintenance requests")
        elif user_type == "owner" and existing_request.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this maintenance request")
            
        # Delete the request
        success = await maintenance_service.delete_maintenance_request(request_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete maintenance request")
            
        return {"message": "Maintenance request deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting maintenance request: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete maintenance request")

# Assign a vendor to a maintenance request
@router.post("/{request_id}/assign", response_model=MaintenanceRequest)
async def assign_vendor(
    request_id: str = Path(..., description="The maintenance request ID"),
    vendor_id: str = Query(..., description="The vendor ID to assign"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Assign a vendor to a maintenance request.
    
    Only owners can assign vendors to maintenance requests for their properties.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)
        
        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")
            
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to assign vendors")
        elif user_type == "owner" and existing_request.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this maintenance request")
            
        # Assign the vendor
        updated_request = await maintenance_service.assign_vendor(
            request_id=request_id,
            vendor_id=vendor_id
        )
        
        if not updated_request:
            raise HTTPException(status_code=500, detail="Failed to assign vendor")
            
        return updated_request
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning vendor: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to assign vendor")

# Update the status of a maintenance request
@router.put("/{request_id}/status", response_model=MaintenanceRequest)
async def update_status(
    request_id: str = Path(..., description="The maintenance request ID"),
    status: str = Query(..., description="The new status"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Update the status of a maintenance request.
    
    Tenants can only mark requests as completed or cancelled.
    Owners can update to any status.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)
        
        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")
            
        # Check authorization
        if user_type == "tenant":
            if existing_request.get("tenant_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to update this maintenance request")
                
            # Tenants can only mark as completed or cancelled
            allowed_statuses = [MaintenanceStatus.COMPLETED.value, MaintenanceStatus.CANCELLED.value]
            if status not in allowed_statuses:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Tenants can only update status to {', '.join(allowed_statuses)}"
                )
        elif user_type == "owner" and existing_request.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this maintenance request")
            
        # Update the status
        updated_request = await maintenance_service.update_request_status(
            request_id=request_id,
            status=status
        )
        
        if not updated_request:
            raise HTTPException(status_code=500, detail="Failed to update status")
            
        return updated_request
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update status")

# Add an image to a maintenance request
@router.post("/{request_id}/images", response_model=MaintenanceRequest)
async def add_image(
    request_id: str = Path(..., description="The maintenance request ID"),
    image_url: str = Form(..., description="The URL of the uploaded image"),
    description: Optional[str] = Form(None, description="Description of the image"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Add an image to a maintenance request.
    
    Both tenants and owners can add images to their respective maintenance requests.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)
        
        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")
            
        # Check authorization
        if user_type == "tenant" and existing_request.get("tenant_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this maintenance request")
        elif user_type == "owner" and existing_request.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this maintenance request")
            
        # Add the image
        updated_request = await maintenance_service.add_maintenance_image(
            request_id=request_id,
            image_url=image_url,
            description=description
        )
        
        if not updated_request:
            raise HTTPException(status_code=500, detail="Failed to add image")
            
        return updated_request
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding image: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add image")

# Add a comment to a maintenance request
@router.post("/{request_id}/comments", response_model=dict)
async def add_comment(
    comment_data: MaintenanceComment,
    request_id: str = Path(..., description="The maintenance request ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Add a comment to a maintenance request.
    
    Both tenants and owners can add comments to their respective maintenance requests.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)
        
        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")
            
        # Check authorization
        if user_type == "tenant" and existing_request.get("tenant_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to comment on this maintenance request")
        elif user_type == "owner" and existing_request.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to comment on this maintenance request")
            
        # Set the request_id and user_id in the comment data
        comment_data.request_id = request_id
        comment_data.user_id = user_id
        comment_data.user_type = user_type
        
        # Add the comment
        created_comment = await maintenance_service.add_maintenance_comment(comment_data)
        
        if not created_comment:
            raise HTTPException(status_code=500, detail="Failed to add comment")
            
        return {"message": "Comment added successfully", "comment": created_comment}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding comment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add comment")

# Get comments for a maintenance request
@router.get("/{request_id}/comments", response_model=List[Dict])
async def get_comments(
    request_id: str = Path(..., description="The maintenance request ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get comments for a maintenance request.
    
    Both tenants and owners can view comments for their respective maintenance requests.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)
        
        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")
            
        # Check authorization
        if user_type == "tenant" and existing_request.get("tenant_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view comments for this maintenance request")
        elif user_type == "owner" and existing_request.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view comments for this maintenance request")
            
        # Get the comments
        comments = await maintenance_service.get_maintenance_comments(request_id)
        
        return comments
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting comments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get comments")

# Get recommended vendors for a maintenance request
@router.get("/{request_id}/vendors", response_model=List[Dict])
async def get_recommended_vendors(
    request_id: str = Path(..., description="The maintenance request ID"),
    limit: int = Query(3, description="Maximum number of vendors to return"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get recommended vendors for a maintenance request based on category and rating.
    
    Only owners can view recommended vendors.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)
        
        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")
            
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to view recommended vendors")
        elif user_type == "owner" and existing_request.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view vendors for this maintenance request")
            
        # Get the recommended vendors
        vendors = await maintenance_service.get_recommended_vendors(request_id, limit)
        
        return vendors
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting recommended vendors: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get recommended vendors")

# Get maintenance summary for an owner
@router.get("/summary", response_model=Dict)
async def get_maintenance_summary(
    current_user: Dict = Depends(get_current_user)
):
    """
    Get a summary of maintenance requests for the current owner.
    
    Only owners can view the maintenance summary.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to view maintenance summary")
            
        # Get the summary
        summary = await maintenance_service.get_maintenance_summary(user_id)
        
        return summary
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting maintenance summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get maintenance summary")

@router.get("/requests/count", response_model=Dict[str, int])
async def get_maintenance_requests_count(
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
    status: Optional[str] = Query('new', description="Status to filter by (default: new)"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get count of maintenance requests matching the specified filters.
    
    This is particularly useful for dashboard widgets that show pending request counts.
    Users can only access counts for their own requests or requests related to their properties.
    
    Args:
        tenant_id: Optional tenant ID to filter requests for a specific tenant
        status: Status to filter by (new, in_progress, completed, etc.) - defaults to 'new'
        current_user: The currently authenticated user
        
    Returns:
        Dictionary with count of matching requests
    """
    try:
        # Convert string UUID to UUID object if present
        tenant_id_obj = uuid.UUID(tenant_id) if tenant_id else None
        user_id = uuid.UUID(current_user["id"])
        
        # Get count from service
        count = await maintenance_service.count_maintenance_requests(
            user_id=user_id,
            tenant_id=tenant_id_obj,
            status=status
        )
        
        return {"count": count}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Invalid UUID format: {str(ve)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error counting maintenance requests: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to count maintenance requests") 