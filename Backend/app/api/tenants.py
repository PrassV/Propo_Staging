from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, Path, Query, Body
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, UUID4, Field
import uuid
import logging
from datetime import datetime
from supabase import Client
from app.config.database import get_supabase_client_authenticated

logger = logging.getLogger(__name__)

from app.models.tenant import (
    Tenant, TenantCreate, TenantUpdate,
    PropertyTenantLink, PropertyTenantLinkCreate, PropertyTenantLinkUpdate,
    TenantInvitationCreate, TenantInvitation
)
from app.models.user import User # Assuming User model exists for auth response

# Importing placeholder models until properly defined
from app.models.property import Property  # Assuming Property model exists
from app.models.payment import Payment  # Placeholder, replace with actual model
from app.models.maintenance import MaintenanceRequest  # Placeholder, replace with actual model

from ..services import tenant_service
from ..db import tenants as tenants_db
from ..db import properties as properties_db
from ..config.auth import get_current_user

# For pagination
from app.utils.common import PaginationParams  # Assuming this exists or define below

router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"],
    responses={404: {"description": "Not found"}}
)

# --- Response Models ---

class TenantResponse(BaseModel):
    """Standard response wrapper for a single tenant"""
    tenant: Tenant
    message: str = "Success"

class TenantsListResponse(BaseModel):
    """Response model for paginated tenant list"""
    items: List[Tenant]
    total: int
    message: str = "Success"

class TenantInvitationResponse(BaseModel):
    """Response wrapper for tenant invitation"""
    invitation: TenantInvitation
    message: str = "Success"

# --- Payment Status Response Model ---
class PaymentStatusResponse(BaseModel):
    """Response model for tenant payment status"""
    nextDueDate: Optional[str] = None
    nextDueAmount: Optional[float] = None
    lastPaymentDate: Optional[str] = None
    lastPaymentAmount: Optional[float] = None
    isOverdue: bool = False
    message: str = "Success"

# --- Request Body Model for Verification ---
class TenantVerifyLinkRequest(BaseModel):
    property_id: UUID4 = Field(..., description="The ID of the property to verify association with.")

# --- Tenant CRUD Endpoints ---

@router.get("/me", response_model=TenantResponse)
async def get_current_user_tenant(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get the tenant profile associated with the currently authenticated user.
    """
    try:
        user_id_str = current_user.get("id")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token invalid or missing user ID."
            )

        user_id = uuid.UUID(user_id_str)

        tenant_data = await tenant_service.get_tenant_by_user_id(user_id)

        if not tenant_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No tenant profile found linked to the current user."
            )

        return {
            "tenant": tenant_data,
            "message": "Current tenant profile retrieved successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Error retrieving tenant profile for user {user_id_str}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred retrieving tenant profile: {str(e)}"
        )

@router.get("/", response_model=TenantsListResponse)
async def get_tenants(
    pagination: PaginationParams = Depends(),
    property_id: Optional[UUID4] = Query(None, description="Filter tenants by property ID"),
    status: Optional[str] = Query(None, description="Filter tenants by status (active, unassigned, inactive)"),
    sort_by: Optional[str] = Query("created_at", description="Field to sort by"),
    sort_order: Optional[str] = Query("desc", description="Sort order ('asc' or 'desc')"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all tenants for the current user, optionally filtered by property and status.
    Includes pagination and sorting.
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        property_id_obj = uuid.UUID(str(property_id)) if property_id else None

        tenants, total_count = await tenant_service.get_tenants(
            owner_id=user_id,  # Pass the current user's ID as the owner_id
            property_id=property_id_obj,
            status=status,  # Pass status to filter
            skip=pagination.skip,
            limit=pagination.limit,
            sort_by=sort_by,
            sort_order=sort_order
        )

        return {
            "items": tenants,
            "total": total_count,
            "message": "Tenants retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenants: {str(e)}"
        )

@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant to retrieve"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a tenant by ID. Access is restricted to:
    - The tenant accessing their own profile
    - Property owners/managers for properties the tenant is linked to
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        tenant_data = await tenant_service.get_tenant_by_id(tenant_id_obj, user_id)

        if not tenant_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or you don't have permission to access this tenant"
            )

        return {
            "tenant": tenant_data,
            "message": "Tenant retrieved successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenant: {str(e)}"
        )

@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new tenant with default status "unassigned".
    Property and unit association will be done separately via lease creation.
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        
        # Ensure status is set to unassigned for new tenants
        # Instead of converting to dict, pass the TenantCreate object directly
        # and let the service handle the conversion if needed
        created_tenant = await tenant_service.create_tenant(tenant_data, user_id)

        if not created_tenant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create tenant."
            )

        return {
            "tenant": created_tenant,
            "message": "Tenant created successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error creating tenant: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating tenant: {str(e)}"
        )

@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_data: TenantUpdate,
    tenant_id: UUID4 = Path(..., description="The ID of the tenant to update"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a tenant's information.
    Access is restricted to:
    - The tenant updating their own profile
    - Property owners/managers for properties the tenant is linked to
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        updated_tenant = await tenant_service.update_tenant(tenant_id_obj, tenant_data, user_id)

        if not updated_tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or you don't have permission to update this tenant"
            )

        return {
            "tenant": updated_tenant,
            "message": "Tenant updated successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating tenant: {str(e)}"
        )

@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a tenant.
    WARNING: This permanently deletes the tenant record and all property associations.
    Requires the user to own at least one property the tenant is linked to.
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        success = await tenant_service.delete_tenant(tenant_id_obj, user_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or you don't have permission to delete this tenant"
            )

        # Return None for 204 No Content response
        return None
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting tenant: {str(e)}"
        )

# --- Tenant Invitation ---

@router.post("/{tenant_id}/invite", response_model=TenantInvitationResponse)
async def invite_tenant(
    invitation_data: TenantInvitationCreate,
    tenant_id: UUID4 = Path(..., description="The ID of the tenant to invite (optional, can be None for new tenants)"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Create an invitation for a tenant to join the platform.
    Requires the user to be the owner of the specified property.
    The tenant_id is optional - it can be specified if the tenant already exists.
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])

        # Could add tenant_id to the invitation data here if needed

        created_invitation = await tenant_service.create_tenant_invitation(invitation_data, user_id, db_client)

        if not created_invitation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create invitation. Ensure the property exists and you are the owner."
            )

        return {
            "invitation": created_invitation,
            "message": "Invitation sent successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating invitation: {str(e)}"
        )

# --- Tenant Linking/Verification ---

@router.post("/verify-link", status_code=status.HTTP_200_OK)
async def verify_and_link_tenant(
    request_body: TenantVerifyLinkRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Verifies if the current authenticated user matches the tenant details
    associated with the given property ID and links the tenant record to the user ID.
    """
    try:
        user_id_str = current_user.get("id")
        user_email = current_user.get("email") # Assuming email is in the token payload

        if not user_id_str or not user_email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token invalid or missing required user info (ID, email)."
            )

        user_id = uuid.UUID(user_id_str)
        property_id = request_body.property_id

        success = await tenant_service.verify_and_link_tenant_by_property(
            property_id=property_id,
            user_id=user_id,
            user_email=user_email,
            # Pass other user details if needed for verification (e.g., name, phone)
            # user_details=current_user
        )

        if success:
            return {"message": "Tenant verified and linked successfully."}
        else:
            # The service layer should raise specific HTTPExceptions for not found or mismatch
            # This path might not be reached if service layer raises correctly.
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to verify or link tenant. Property ID might be invalid or tenant details do not match."
            )

    except HTTPException as http_exc:
        # Re-raise exceptions raised from the service layer or auth
        raise http_exc
    except Exception as e:
        logger.exception(f"Error during tenant verification/linking for user {user_id_str} and property {request_body.property_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during tenant verification: {str(e)}"
        )

# --- Related Data Endpoints ---

@router.get("/{tenant_id}/properties", response_model=List[Property])
async def get_tenant_properties(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get properties associated with a tenant.
    Access is restricted to:
    - The tenant accessing their own properties
    - Property owners/managers for properties the tenant is linked to
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        properties = await tenant_service.get_properties_for_tenant(tenant_id_obj, user_id)

        return properties
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenant properties: {str(e)}"
        )

@router.get("/{tenant_id}/leases", response_model=List[PropertyTenantLink])
async def get_tenant_leases(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get lease/tenancy details for a tenant.
    Access is restricted to:
    - The tenant accessing their own leases
    - Property owners/managers for properties the tenant is linked to
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        leases = await tenant_service.get_leases_for_tenant(tenant_id_obj, user_id)

        return leases
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenant leases: {str(e)}"
        )

@router.get("/{tenant_id}/payments", response_model=List[Payment])
async def get_tenant_payments(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get payment history for a tenant.
    Access is restricted to:
    - The tenant accessing their own payments
    - Property owners/managers for properties the tenant is linked to
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        payments = await tenant_service.get_payments_for_tenant(tenant_id_obj, user_id)

        return payments
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenant payments: {str(e)}"
        )

@router.get("/{tenant_id}/maintenance", response_model=List[MaintenanceRequest])
async def get_tenant_maintenance(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get maintenance requests associated with a tenant.
    Access is restricted to:
    - The tenant accessing their own maintenance requests
    - Property owners/managers for properties the tenant is linked to
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        maintenance_requests = await tenant_service.get_maintenance_for_tenant(tenant_id_obj, user_id)

        return maintenance_requests
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenant maintenance requests: {str(e)}"
        )

@router.get("/{tenant_id}/payment-status", response_model=Dict[str, Any])
async def get_tenant_payment_status(
    tenant_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """Get payment status for a specific tenant"""
    try:
        # Verify access - tenant can view their own, owner can view their tenants
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        if user_type == "tenant" and str(tenant_id) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenants can only view their own payment status"
            )
        
        # Get tenant's current payments
        from app.services import payment_service
        
        # Get recent payment status
        payments, _ = await payment_service.get_payments(
            user_id=user_id,
            user_type=user_type,
            tenant_id=str(tenant_id),
            skip=0,
            limit=5,
            sort_by="due_date",
            sort_order="desc"
        )
        
        if not payments:
            return {
                "nextDueDate": None,
                "nextDueAmount": None,
                "lastPaymentDate": None,
                "lastPaymentAmount": None,
                "isOverdue": False
            }
        
        # Find next due payment
        from datetime import date
        today = date.today()
        
        next_due = None
        last_payment = None
        is_overdue = False
        
        for payment in payments:
            if payment.status == "pending" and payment.due_date >= today:
                if not next_due or payment.due_date < next_due.due_date:
                    next_due = payment
            elif payment.status == "paid":
                if not last_payment or (payment.payment_date and payment.payment_date > last_payment.payment_date):
                    last_payment = payment
            elif payment.status == "overdue":
                is_overdue = True
        
        return {
            "nextDueDate": next_due.due_date.isoformat() if next_due else None,
            "nextDueAmount": float(next_due.amount_due) if next_due else None,
            "lastPaymentDate": last_payment.payment_date.isoformat() if last_payment and last_payment.payment_date else None,
            "lastPaymentAmount": float(last_payment.amount_paid or 0) if last_payment else None,
            "isOverdue": is_overdue
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tenant payment status: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get payment status: {str(e)}"
        )

# Note: The tenant document upload endpoint (POST /{tenant_id}/documents) has been removed
# ID documents are now handled directly as part of the tenant profile (id_proof_url field)
# Other documents are managed through the property document endpoints: /api/properties/{property_id}/documents

@router.put("/{tenant_id}/reactivate", response_model=TenantResponse)
async def reactivate_tenant(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant to reactivate"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Reactivate an inactive tenant.
    Changes tenant status from "inactive" to "unassigned".
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        # Get current tenant data
        current_tenant = await tenant_service.get_tenant_by_id(tenant_id_obj, user_id)
        
        if not current_tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or you don't have permission to access this tenant"
            )
            
        # Verify tenant is inactive
        if current_tenant.get("status") != "inactive":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only inactive tenants can be reactivated"
            )
            
        # Update status to unassigned
        update_data = {"status": "unassigned"}
        updated_tenant = await tenant_service.update_tenant(tenant_id_obj, update_data, user_id)

        if not updated_tenant:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reactivate tenant"
            )

        return {
            "tenant": updated_tenant,
            "message": "Tenant successfully reactivated"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reactivating tenant: {str(e)}"
        )

@router.post("/{tenant_id}/properties", response_model=Dict[str, Any])
async def link_tenant_to_property(
    link_data: PropertyTenantLinkCreate,
    tenant_id: UUID4 = Path(..., description="The ID of the tenant to link"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Links a tenant to a property.
    Requires the user to be the owner of the specified property.
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))
        
        # Extract data from the request
        property_id = link_data.property_id
        unit_number = getattr(link_data, "unit_number", None)
        start_date = link_data.start_date 
        end_date = getattr(link_data, "end_date", None)
        
        # Link the tenant to the property
        link = await tenant_service.link_tenant_to_property(
            tenant_id=tenant_id_obj,
            property_id=property_id,
            unit_number=unit_number,
            start_date=start_date,
            end_date=end_date,
            creator_user_id=user_id
        )
        
        if not link:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to link tenant to property. Ensure the property exists and you are the owner."
            )
            
        return {
            "link": link,
            "message": "Tenant linked to property successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error linking tenant to property: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error linking tenant to property: {str(e)}"
        )

@router.post("/{tenant_id}/terminate-lease", response_model=Dict[str, Any])
async def terminate_tenant_lease(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    termination_data: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Terminate a tenant's lease with proper business logic for advance payment refunds.
    
    Required fields in termination_data:
    - link_id: The property_tenant link ID to terminate
    - termination_date: The date the lease terminates (YYYY-MM-DD)
    - refund_advance: Whether to refund the advance payment (default: true)
    - termination_reason: Reason for termination (default: "owner_termination")
    """
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))
        
        # Validate required fields
        link_id = termination_data.get('link_id')
        termination_date_str = termination_data.get('termination_date')
        
        if not link_id or not termination_date_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="link_id and termination_date are required"
            )
        
        # Parse termination date
        try:
            termination_date = date.fromisoformat(termination_date_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="termination_date must be in YYYY-MM-DD format"
            )
        
        # Verify user has permission to terminate this lease
        lease_details = await tenant_service.get_property_tenant_link_by_id(uuid.UUID(link_id))
        if not lease_details:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lease not found"
            )
        
        # Check if user owns the property
        property_id = lease_details.get('property_id')
        if property_id:
            from ..config.database import supabase_client as db_client
            property_owner = await properties_db.get_property_owner(db_client, uuid.UUID(property_id))
            if property_owner != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to terminate this lease"
                )
        
        # Perform the termination
        result = await tenant_service.terminate_tenant_lease(
            link_id=uuid.UUID(link_id),
            termination_date=termination_date,
            refund_advance=termination_data.get('refund_advance', True),
            termination_reason=termination_data.get('termination_reason', 'owner_termination')
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to terminate lease')
            )
        
        return {
            "message": "Lease terminated successfully",
            "termination_details": result
        }
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error terminating tenant lease: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error terminating lease: {str(e)}"
        )

@router.get("/unit/{unit_id}/availability", response_model=Dict[str, Any])
async def check_unit_availability(
    unit_id: UUID4 = Path(..., description="The ID of the unit to check"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Check if a unit is available for tenant assignment.
    Returns availability status and active tenant information if occupied.
    """
    try:
        user_id = uuid.UUID(current_user["id"])
        unit_id_obj = uuid.UUID(str(unit_id))
        
        # Verify user has access to this unit (owns the property)
        from ..services import properties_service
        from ..config.database import supabase_client as db_client
        
        unit = await properties_service.get_unit_by_id(db_client, unit_id_obj)
        if not unit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unit not found"
            )
        
        property_id = unit.get('property_id')
        if property_id:
            property_owner = await properties_db.get_property_owner(db_client, uuid.UUID(property_id))
            if property_owner != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to check this unit"
                )
        
        # Get availability status
        availability_status = await tenants_db.get_unit_availability_status(unit_id_obj)
        
        return availability_status
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error checking unit availability: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking unit availability: {str(e)}"
        )

@router.get("/owner/{owner_id}/expiring-leases", response_model=List[Dict[str, Any]])
async def get_expiring_leases(
    owner_id: UUID4 = Path(..., description="The ID of the property owner"),
    days_ahead: int = Query(30, description="Number of days to look ahead for expiring leases"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get leases that are expiring within the specified number of days.
    Useful for advance payment refund planning and unit turnover management.
    """
    try:
        user_id = uuid.UUID(current_user["id"])
        owner_id_obj = uuid.UUID(str(owner_id))
        
        # Verify user is requesting their own data or has admin privileges
        if user_id != owner_id_obj:
            # Could add admin role check here in the future
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view these lease expirations"
            )
        
        # Get expiring leases
        expiring_leases = await tenants_db.get_upcoming_lease_expirations(
            owner_id=owner_id_obj,
            days_ahead=days_ahead
        )
        
        return expiring_leases
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error getting expiring leases: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting expiring leases: {str(e)}"
        )