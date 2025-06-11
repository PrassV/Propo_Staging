from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import uuid
import logging
from datetime import date
from supabase import Client

from app.models.tenant import PropertyTenantLink, PropertyTenantLinkCreate, PropertyTenantLinkUpdate
from app.services import tenant_service, lease_service
from app.config.auth import get_current_user
from app.config.database import get_supabase_client_authenticated
from app.schemas.lease import Lease, LeaseCreate

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/leases",
    tags=["Leases"],
    responses={404: {"description": "Not found"}},
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
@router.post("/", response_model=Lease, status_code=status.HTTP_201_CREATED)
async def create_lease(
    lease_data: LeaseCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated),
):
    """
    Create a new lease for a unit.
    This process is atomic and will also mark the unit as occupied.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")

    try:
        new_lease = await lease_service.create_lease(
            db_client=db_client,
            lease_data=lease_data,
            owner_id=user_id
        )
        return new_lease
    except HTTPException as e:
        # The service layer raises specific HTTP exceptions for different errors
        # (e.g., 403 for auth, 409 for conflict), so we just re-raise them.
        raise e
    except Exception as e:
        logger.error(f"Unexpected error in create_lease endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An internal error occurred.")

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

# Add lease termination endpoint
@router.put("/{lease_id}/terminate", status_code=status.HTTP_204_NO_CONTENT)
async def terminate_lease(
    lease_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated),
):
    """
    Terminates a lease and vacates the associated unit.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")

    try:
        await lease_service.terminate_lease(
            db_client=db_client,
            lease_id=lease_id,
            owner_id=user_id
        )
        # On success, a 204 No Content response is automatically returned.
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error in terminate_lease endpoint for lease {lease_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred while terminating the lease.")
