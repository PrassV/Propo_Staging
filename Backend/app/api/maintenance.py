from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Path, Query, UploadFile, File, Form, status
from pydantic import BaseModel, Field
import logging
import uuid
from datetime import datetime

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
from app.services import property_service
from app.config.database import supabase_client
from app.services import tenant_service

router = APIRouter(
    prefix="/maintenance",
    tags=["maintenance"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

# Response Models
class MaintenanceRequestResponse(BaseModel):
    request: Dict[str, Any]
    message: str = "Success"

class MaintenanceRequestsListResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int

class MaintenanceSummaryResponse(BaseModel):
    summary: Dict[str, Any]
    message: str = "Success"

# Get all maintenance requests (with optional filters)
@router.get("/", response_model=MaintenanceRequestsListResponse)
async def get_maintenance_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    property_id: Optional[uuid.UUID] = Query(None),
    unit_id: Optional[uuid.UUID] = Query(None),
    status: Optional[MaintenanceStatus] = Query(None),
    priority: Optional[MaintenancePriority] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all maintenance requests for the current user.

    If the user is a landlord, returns requests for their properties.
    If the user is a tenant, returns only their requests.
    """
    try:
        # Extract user ID
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Get user type/role
        user_type = current_user.get("user_type") or current_user.get("role")

        # Get requests based on user type
        if user_type == "owner":
            # Owners see requests for their properties
            requests = await maintenance_service.get_maintenance_requests(
                owner_id=user_id,
                property_id=str(property_id) if property_id else None,
                unit_id=str(unit_id) if unit_id else None,
                status=status.value if status else None
            )
        else:
            # Tenants see only their requests
            requests = await maintenance_service.get_maintenance_requests(
                tenant_id=user_id,
                property_id=str(property_id) if property_id else None,
                unit_id=str(unit_id) if unit_id else None,
                status=status.value if status else None
            )

        # Apply additional filters if needed
        if priority:
            requests = [r for r in requests if r.get("priority") == priority.value]

        # Apply pagination
        total = len(requests)
        paginated_requests = requests[skip:skip + limit]

        return MaintenanceRequestsListResponse(items=paginated_requests, total=total)
    except Exception as e:
        logger.error(f"Error getting maintenance requests: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve maintenance requests: {str(e)}")

# Get a specific maintenance request by ID
@router.get("/{request_id}", response_model=MaintenanceRequestResponse)
async def get_maintenance_request(
    request_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific maintenance request.

    Users can only access their own requests or requests for their properties.
    """
    try:
        # Extract user ID
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Get the maintenance request
        request = await maintenance_service.get_maintenance_request(str(request_id))

        if not request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")

        # Check authorization
        user_type = current_user.get("user_type") or current_user.get("role")
        if user_type == "owner":
            # Owners can access requests for their properties
            if request.get("owner_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to access this maintenance request")
        else:
            # Tenants can only access their own requests
            if request.get("tenant_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to access this maintenance request")

        return MaintenanceRequestResponse(request=request, message="Success")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting maintenance request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve maintenance request: {str(e)}")

# Create a new maintenance request
@router.post("/", response_model=MaintenanceRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_maintenance_request(
    request_data: MaintenanceCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new maintenance request.
    
    Required fields: unit_id, title, description, category, priority
    Property_id is optional (will be derived from unit_id if not provided)
    """
    try:
        # Correctly extract user_id from the dictionary
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Validate required fields
        if not request_data.unit_id:
            raise HTTPException(status_code=400, detail="unit_id is required")
            
        # If property_id not provided, derive it from unit
        if not request_data.property_id:
            unit_details = await property_service.get_unit_details(supabase_client, request_data.unit_id, user_id)
            if not unit_details:
                raise HTTPException(status_code=404, detail="Unit not found")
            request_data.property_id = unit_details.get("property_id")

        # Set the tenant_id if the user is a tenant
        user_type = current_user.get("user_type") or "owner"  # Default to owner if not specified
        if user_type == "tenant":
            request_data.tenant_id = user_id
            
            # Check if tenant is associated with this unit
            tenant_info = await tenant_service.get_current_tenant_for_unit(request_data.unit_id)
            can_access = tenant_info is not None and str(tenant_info.get('user_id')) == user_id
        else:
            # Owner authorization check - get property ID for the unit, then check access
            property_id = await property_service.get_property_id_for_unit(request_data.unit_id)
            if property_id:
                can_access = await property_service.check_property_access(property_id, user_id)
            
        if not can_access:
            raise HTTPException(status_code=403, detail="Not authorized to create maintenance request for this unit")

        # Add created_by field
        request_data.created_by = user_id

        # Create the request
        created_request = await maintenance_service.create_maintenance_request(
            db_client=supabase_client,
            request_data=request_data,
            user_id=user_id,
            user_type=user_type
        )

        if not created_request:
            raise HTTPException(status_code=500, detail="Failed to create maintenance request")

        return MaintenanceRequestResponse(request=created_request, message="Maintenance request created successfully")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating maintenance request: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create maintenance request")

# Update a maintenance request
@router.put("/{request_id}", response_model=MaintenanceRequestResponse)
async def update_maintenance_request(
    request_id: uuid.UUID,
    update_data: MaintenanceUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a maintenance request.

    Tenants can update only certain fields of their own requests.
    Owners can update any field of requests for their properties.
    """
    try:
        # Correctly extract user_id from the dictionary
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)

        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")

        # Check authorization
        user_type = current_user.get("user_type") or current_user.get("role")
        if user_type == "tenant":
            # Tenants can only update their own requests
            if existing_request.get("tenant_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to update this maintenance request")
        else:
            # Owners can update requests for their properties
            if existing_request.get("owner_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to update this maintenance request")

        # Update the request
        updated_request = await maintenance_service.update_maintenance_request(
            request_id=request_id,
            request_data=update_data
        )

        if not updated_request:
            raise HTTPException(status_code=500, detail="Failed to update maintenance request")

        return MaintenanceRequestResponse(request=updated_request, message="Request updated successfully")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating maintenance request: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update maintenance request")

# Delete a maintenance request
@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_maintenance_request(
    request_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a maintenance request.

    Only owners can delete maintenance requests for their properties.
    """
    try:
        # Correctly extract user_id from the dictionary
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)

        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")

        # Check authorization
        user_type = current_user.get("user_type") or current_user.get("role")
        if user_type == "tenant":
            # Tenants can only delete their own requests
            if existing_request.get("tenant_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to delete this maintenance request")
        else:
            # Owners can delete requests for their properties
            if existing_request.get("owner_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to delete this maintenance request")

        # Delete the request
        success = await maintenance_service.delete_maintenance_request(request_id)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete maintenance request")

        return None # No content
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting maintenance request: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete maintenance request")

# Assign a vendor to a maintenance request
@router.post("/{request_id}/assign", response_model=MaintenanceRequestResponse)
async def assign_vendor(
    request_id: uuid.UUID,
    vendor_id: str = Query(..., description="The vendor ID to assign"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Assign a vendor to a maintenance request.

    Only owners can assign vendors to maintenance requests for their properties.
    """
    try:
        # Correctly extract user_id from the dictionary
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)

        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")

        # Check authorization
        if existing_request.get("tenant_id") == user_id:
            raise HTTPException(status_code=403, detail="Tenants are not authorized to assign vendors")
        elif existing_request.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this maintenance request")

        # Assign the vendor
        updated_request = await maintenance_service.assign_vendor(
            request_id=request_id,
            vendor_id=vendor_id
        )

        if not updated_request:
            raise HTTPException(status_code=500, detail="Failed to assign vendor")

        return MaintenanceRequestResponse(request=updated_request, message="Vendor assigned successfully")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning vendor: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to assign vendor")

# Update the status of a maintenance request
@router.put("/{request_id}/status", response_model=MaintenanceRequestResponse)
async def update_status(
    request_id: uuid.UUID,
    status: str = Query(..., description="The new status"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update the status of a maintenance request.

    Tenants can only mark requests as completed or cancelled.
    Owners can update to any status.
    """
    try:
        # Correctly extract user_id from the dictionary
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)

        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")

        # Check authorization
        user_type = current_user.get("user_type") or current_user.get("role")
        if user_type == "tenant":
            # Tenants can only update status of their own requests
            if existing_request.get("tenant_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to update this maintenance request")
                
            # Tenants can only mark as completed or cancelled
            allowed_statuses = [MaintenanceStatus.COMPLETED.value, MaintenanceStatus.CANCELLED.value]
            if status not in allowed_statuses:
                raise HTTPException(
                    status_code=403,
                    detail=f"Tenants can only update status to {', '.join(allowed_statuses)}"
                )
        else:
            # Owners can update to any status for their properties
            if existing_request.get("owner_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to update this maintenance request")

        # Update the status
        updated_request = await maintenance_service.update_request_status(
            request_id=request_id,
            status=status
        )

        if not updated_request:
            raise HTTPException(status_code=500, detail="Failed to update status")

        return MaintenanceRequestResponse(request=updated_request, message="Status updated successfully")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update status")

# Add an image to a maintenance request
@router.post("/{request_id}/images", response_model=MaintenanceRequestResponse)
async def add_image(
    request_id: uuid.UUID,
    image_url: str = Form(..., description="The URL of the uploaded image"),
    description: Optional[str] = Form(None, description="Description of the image"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Add an image to a maintenance request.

    Both tenants and owners can add images to their respective maintenance requests.
    """
    try:
        # Correctly extract user_id from the dictionary
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)

        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")

        # Check authorization
        user_type = current_user.get("user_type") or current_user.get("role")
        if user_type == "tenant":
            # Tenants can only add images to their own requests
            if existing_request.get("tenant_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to add images to this maintenance request")
        else:
            # Owners can add images to requests for their properties
            if existing_request.get("owner_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to add images to this maintenance request")

        # Add the image
        updated_request = await maintenance_service.add_maintenance_image(
            request_id=request_id,
            image_url=image_url,
            description=description
        )

        if not updated_request:
            raise HTTPException(status_code=500, detail="Failed to add image")

        return MaintenanceRequestResponse(request=updated_request, message="Image added successfully")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding image: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add image")

# Add a comment to a maintenance request
@router.post("/{request_id}/comments", response_model=dict)
async def add_comment(
    comment_data: MaintenanceComment,
    request_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Add a comment to a maintenance request.

    Both tenants and owners can add comments to their respective maintenance requests.
    """
    try:
        # Correctly extract user_id from the dictionary
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)

        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")

        # Check authorization
        user_type = current_user.get("user_type") or current_user.get("role")
        if user_type == "tenant":
            # Tenants can only comment on their own requests
            if existing_request.get("tenant_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to comment on this maintenance request")
        else:
            # Owners can comment on requests for their properties
            if existing_request.get("owner_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to comment on this maintenance request")

        # Set the request_id and user_id in the comment data
        comment_data.request_id = request_id
        comment_data.user_id = user_id
        comment_data.user_type = current_user.get("user_type") or current_user.get("role")

        # Log comment and attachments (if any)
        logger.info(f"Mock adding comment for request {request_id}: {comment_data.comment} Attachments: {comment_data.attachments}")

        # Need to update the actual service to handle comment_data
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
    request_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get comments for a maintenance request.

    Both tenants and owners can view comments for their respective maintenance requests.
    """
    try:
        # Correctly extract user_id from the dictionary
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)

        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")

        # Check authorization
        user_type = current_user.get("user_type") or current_user.get("role")
        if user_type == "tenant":
            # Tenants can only view comments on their own requests
            if existing_request.get("tenant_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to view comments for this maintenance request")
        else:
            # Owners can view comments on requests for their properties
            if existing_request.get("owner_id") != user_id:
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
    request_id: uuid.UUID,
    limit: int = Query(3, description="Maximum number of vendors to return"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get recommended vendors for a maintenance request based on category and rating.

    Only owners can view recommended vendors.
    """
    try:
        # Correctly extract user_id from the dictionary
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Get the existing request
        existing_request = await maintenance_service.get_maintenance_request(request_id)

        if not existing_request:
            raise HTTPException(status_code=404, detail="Maintenance request not found")

        # Check authorization
        if existing_request.get("tenant_id") == user_id:
            raise HTTPException(status_code=403, detail="Tenants are not authorized to view recommended vendors")
        elif existing_request.get("owner_id") != user_id:
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
@router.get("/summary", response_model=MaintenanceSummaryResponse)
async def get_maintenance_summary(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a summary of maintenance requests for the current owner.

    Only owners can view the maintenance summary.
    """
    try:
        # Correctly extract owner_id from the dictionary
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Assuming only owners see the summary for now
        if current_user.get("user_type") != 'owner':
             raise HTTPException(status_code=403, detail="Only property owners can view the maintenance summary")

        summary = await maintenance_service.get_maintenance_summary(owner_id)
        return MaintenanceSummaryResponse(summary=summary)
    except Exception as e:
        logger.error(f"Error getting maintenance summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve maintenance summary: {str(e)}")

@router.get("/requests/count", response_model=Dict[str, int])
async def get_maintenance_requests_count(
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
    status: Optional[str] = Query('new', description="Status to filter by (default: new)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
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

        # Correctly and safely extract user_id from the dictionary
        user_id_str = current_user.get("id")
        if not user_id_str:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
        user_id = uuid.UUID(user_id_str)

        # Get count from service
        count = await maintenance_service.count_maintenance_requests(
            user_id=user_id,
            tenant_id=tenant_id_obj,
            status=status
        )

        return {"count": count}
    except ValueError as ve:
        # Catch potential UUID conversion errors specifically
        logger.error(f"Invalid UUID format provided: {str(ve)}")
        raise HTTPException(status_code=400, detail=f"Invalid UUID format: {str(ve)}")
    except HTTPException as http_exc:
        # Re-raise HTTPExceptions directly
        raise http_exc
    except Exception as e:
        logger.error(f"Error counting maintenance requests: {e}", exc_info=True) # Added exc_info
        raise HTTPException(status_code=500, detail="Failed to count maintenance requests")