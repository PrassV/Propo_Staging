from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import uuid
import logging

from app.models.tenant import Tenant, TenantCreate, TenantUpdate, InvitationStatus
from app.services import tenant_service
from app.config.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/tenants", # Added prefix here for consistency
    tags=["Tenants"] # Added tags
)

# Response Models
class TenantResponse(BaseModel):
    tenant: Dict[str, Any]
    message: str = "Success"

class TenantsListResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int

class InvitationResponse(BaseModel):
    invitation: Dict[str, Any]
    message: str = "Success"

class InvitationsListResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int

# --- Tenant CRUD Endpoints ---

@router.get("/me", response_model=TenantResponse)
async def get_current_user_tenant(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get the tenant profile associated with the currently authenticated user."""
    try:
        user_id_str = current_user.get("id")
        if not user_id_str:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token invalid or missing user ID.")
        
        user_id = uuid.UUID(user_id_str)
        tenant_data = await tenant_service.get_tenant_by_user_id(user_id)
        
        if not tenant_data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No tenant profile found linked to the current user.")
        
        return TenantResponse(tenant=tenant_data, message="Current tenant profile retrieved successfully")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Error retrieving tenant profile for user {user_id_str}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred retrieving tenant profile: {str(e)}")

@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new tenant (typically by property owner/admin)."""
    try:
        tenant = await tenant_service.create_tenant(tenant_data)
        if not tenant:
            raise HTTPException(status_code=400, detail="Tenant creation failed")
        return TenantResponse(tenant=tenant, message="Tenant created successfully")
    except Exception as e:
        logger.error(f"Error creating tenant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create tenant: {str(e)}")

@router.get("/", response_model=TenantsListResponse)
async def get_tenants(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    property_id: Optional[uuid.UUID] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a list of tenants (filtered for the current owner/admin)."""
    try:
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        tenants, total = await tenant_service.get_tenants(
            owner_id=owner_id,
            property_id=property_id,
            skip=skip,
            limit=limit
        )
        return TenantsListResponse(items=tenants, total=total)
    except Exception as e:
        logger.error(f"Error getting tenants: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tenants: {str(e)}")

@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get details for a specific tenant."""
    try:
        requesting_user_id = current_user.get("id")
        if not requesting_user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        tenant = await tenant_service.get_tenant_by_id(tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        # TODO: Add authorization check
        return TenantResponse(tenant=tenant)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error getting tenant {tenant_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tenant: {str(e)}")

@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: uuid.UUID,
    tenant_data: TenantUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update a tenant's details."""
    try:
        # TODO: Add authorization check
        updated_tenant = await tenant_service.update_tenant(tenant_id, tenant_data)
        if not updated_tenant:
            raise HTTPException(status_code=404, detail="Tenant not found or update failed")
        return TenantResponse(tenant=updated_tenant, message="Tenant updated successfully")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error updating tenant {tenant_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update tenant: {str(e)}")

@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a tenant."""
    try:
        # TODO: Add authorization check
        deleted = await tenant_service.delete_tenant(tenant_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Tenant not found or deletion failed")
        return None
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error deleting tenant {tenant_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete tenant: {str(e)}")

# --- Tenant Invitation Endpoints ---

@router.post("/invitations", response_model=InvitationResponse)
async def invite_tenant(
    property_id: uuid.UUID = Body(...),
    email: str = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Invite a tenant to a property."""
    try:
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # TODO: Add check to ensure property_id belongs to owner_id
        invitation = await tenant_service.create_tenant_invitation(property_id=property_id, owner_id=owner_id, email=email)
        if not invitation:
            raise HTTPException(status_code=400, detail="Failed to create invitation")
        return InvitationResponse(invitation=invitation, message="Tenant invited successfully")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error inviting tenant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to invite tenant: {str(e)}")

@router.get("/invitations", response_model=InvitationsListResponse)
async def get_tenant_invitations(
    property_id: Optional[uuid.UUID] = Query(None),
    status: Optional[InvitationStatus] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get tenant invitations sent by the current owner."""
    try:
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        invitations, total = await tenant_service.get_tenant_invitations(
            owner_id=owner_id,
            property_id=property_id,
            status=status.value if status else None,
            skip=skip,
            limit=limit
        )
        return InvitationsListResponse(items=invitations, total=total)
    except Exception as e:
        logger.error(f"Error getting invitations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve invitations: {str(e)}")

@router.get("/invitations/accept/{token}")
async def accept_invitation(token: str):
    """Endpoint for tenant to accept invitation via link (placeholder)."""
    logger.info(f"Invitation token received for acceptance: {token}")
    return {"message": "Token received. Please complete sign up or log in to accept.", "token": token}

@router.put("/invitations/{invitation_id}/accept", response_model=TenantResponse)
async def accept_invitation_action(
    invitation_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Action endpoint for the logged-in tenant to accept an invitation."""
    try:
        tenant_user_id = current_user.get("id")
        if not tenant_user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
            
        accepted_tenant = await tenant_service.accept_tenant_invitation(invitation_id, tenant_user_id)
        if not accepted_tenant:
            raise HTTPException(status_code=400, detail="Failed to accept invitation.")
        return TenantResponse(tenant=accepted_tenant, message="Invitation accepted successfully.")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error accepting invitation {invitation_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to accept invitation: {str(e)}")

@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invitation(
    invitation_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Cancel a pending tenant invitation (by owner)."""
    try:
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        invitation = await tenant_service.get_invitation_by_id(invitation_id)
        if not invitation:
             raise HTTPException(status_code=404, detail="Invitation not found")
        if str(invitation.get('owner_id')) != owner_id:
             raise HTTPException(status_code=403, detail="Not authorized to cancel this invitation")

        deleted = await tenant_service.delete_tenant_invitation(invitation_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Invitation not found or deletion failed")
        return None
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error cancelling invitation {invitation_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to cancel invitation: {str(e)}") 