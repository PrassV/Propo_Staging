from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import uuid
import logging
from datetime import date

from app.models.tenant import PropertyTenantLink, PropertyTenantLinkCreate, PropertyTenantLinkUpdate
from app.services import tenant_service
from app.config.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/leases",
    tags=["Leases"]
)

# Response Models
class LeaseResponse(BaseModel):
    lease: Dict[str, Any]
    message: str = "Success"

class LeasesListResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int

# Get all leases (with optional filters)
@router.get("/", response_model=LeasesListResponse)
async def get_leases(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    property_id: Optional[uuid.UUID] = Query(None),
    tenant_id: Optional[uuid.UUID] = Query(None),
    active_only: bool = Query(False),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a list of leases (filtered for the current owner/admin).
    """
    try:
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        leases, total = await tenant_service.get_leases(
            owner_id=owner_id,
            property_id=property_id,
            tenant_id=tenant_id,
            active_only=active_only,
            skip=skip,
            limit=limit
        )
        return LeasesListResponse(items=leases, total=total)
    except Exception as e:
        logger.error(f"Error getting leases: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve leases: {str(e)}")

# Get a specific lease by ID
@router.get("/{lease_id}", response_model=LeaseResponse)
async def get_lease(
    lease_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get details for a specific lease.
    """
    try:
        requesting_user_id = current_user.get("id")
        if not requesting_user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        lease = await tenant_service.get_lease_by_id(lease_id)
        if not lease:
            raise HTTPException(status_code=404, detail="Lease not found")

        # Check authorization
        can_access = await tenant_service.can_access_lease(lease_id, requesting_user_id)
        if not can_access:
            raise HTTPException(status_code=403, detail="Not authorized to view this lease")

        return LeaseResponse(lease=lease)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error getting lease {lease_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve lease: {str(e)}")

# Create a new lease
@router.post("/", response_model=LeaseResponse, status_code=status.HTTP_201_CREATED)
async def create_lease(
    lease_data: PropertyTenantLinkCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new lease (typically by property owner/admin).
    """
    try:
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Check if user is owner of the property
        property_owner = await tenant_service.get_property_owner(lease_data.property_id)
        if property_owner != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized to create lease for this property")

        lease = await tenant_service.create_lease(lease_data)
        if not lease:
            raise HTTPException(status_code=400, detail="Lease creation failed")
        return LeaseResponse(lease=lease, message="Lease created successfully")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error creating lease: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create lease: {str(e)}")

# Update a lease
@router.put("/{lease_id}", response_model=LeaseResponse)
async def update_lease(
    lease_id: uuid.UUID,
    lease_data: PropertyTenantLinkUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a lease's details.
    """
    try:
        requesting_user_id = current_user.get("id")
        if not requesting_user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Check authorization
        can_access = await tenant_service.can_access_lease(lease_id, requesting_user_id)
        if not can_access:
            raise HTTPException(status_code=403, detail="Not authorized to update this lease")

        updated_lease = await tenant_service.update_lease(lease_id, lease_data)
        if not updated_lease:
            raise HTTPException(status_code=404, detail="Lease not found or update failed")
        return LeaseResponse(lease=updated_lease, message="Lease updated successfully")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error updating lease {lease_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update lease: {str(e)}")

# Delete a lease
@router.delete("/{lease_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lease(
    lease_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a lease.
    """
    try:
        requesting_user_id = current_user.get("id")
        if not requesting_user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Check authorization
        can_access = await tenant_service.can_access_lease(lease_id, requesting_user_id)
        if not can_access:
            raise HTTPException(status_code=403, detail="Not authorized to delete this lease")

        deleted = await tenant_service.delete_lease(lease_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Lease not found or deletion failed")
        return None
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error deleting lease {lease_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete lease: {str(e)}")
