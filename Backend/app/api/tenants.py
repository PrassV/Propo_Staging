from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, Path, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, UUID4, Field
import uuid
import logging
from datetime import datetime

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

from app.services import tenant_service
from app.config.auth import get_current_user

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
    sort_by: Optional[str] = Query("created_at", description="Field to sort by"),
    sort_order: Optional[str] = Query("desc", description="Sort order ('asc' or 'desc')"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all tenants for the current user, optionally filtered by property.
    Includes pagination and sorting.
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        property_id_obj = uuid.UUID(str(property_id)) if property_id else None

        tenants = await tenant_service.get_tenants(
            requesting_user_id=user_id,
            property_id=property_id_obj,
            skip=pagination.skip,
            limit=pagination.limit,
            sort_by=sort_by,
            sort_order=sort_order
        )

        # TODO: Add actual count query if needed for accurate pagination
        total_count = len(tenants)

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
    Create a new tenant and link them to a property.
    Requires the user to be the owner of the specified property.
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])

        created_tenant = await tenant_service.create_tenant(tenant_data, user_id)

        if not created_tenant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create tenant. Ensure the property exists and you are the owner."
            )

        return {
            "tenant": created_tenant,
            "message": "Tenant created successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
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
    current_user: Dict[str, Any] = Depends(get_current_user)
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

        created_invitation = await tenant_service.create_tenant_invitation(invitation_data, user_id)

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

@router.get("/{tenant_id}/payment_status", response_model=PaymentStatusResponse)
async def get_tenant_payment_status(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get the current payment status for a tenant, including upcoming and past payments.
    This endpoint provides:
    - Next payment due date and amount
    - Most recent payment date and amount
    - Whether any payment is overdue

    Access is restricted to:
    - The tenant themselves
    - Property owners/managers for properties the tenant is linked to
    """
    try:
        # Convert string UUID from auth to UUID object for service layer
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        # Check if current user has permission to access this tenant
        tenant = await tenant_service.get_tenant_by_id(tenant_id_obj, user_id)
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or you don't have permission to access this tenant's payment information"
            )

        # Get payment history from database
        now = datetime.now()

        # Look for the most recent payment
        payment_history_response = await tenant_service.get_tenant_payments(
            tenant_id=tenant_id_obj,
            limit=1,
            sort_by="payment_date",
            sort_order="desc"
        )
        last_payment = payment_history_response[0] if payment_history_response else None

        # Look for upcoming or overdue payments
        payment_tracking_response = await tenant_service.get_tenant_payment_tracking(
            tenant_id=tenant_id_obj,
            sort_by="payment_date",
            sort_order="asc"
        )

        # Filter for unpaid payments
        unpaid_payments = [p for p in payment_tracking_response if p.get('payment_status', '').lower() != 'paid']

        # Find next due payment
        next_payment = None
        for payment in unpaid_payments:
            payment_date = payment.get('payment_date')
            if not payment_date:
                continue

            if isinstance(payment_date, str):
                payment_date = datetime.fromisoformat(payment_date)

            if payment_date >= now:
                next_payment = payment
                break

        # Find overdue payments
        overdue_payments = [p for p in unpaid_payments if p.get('payment_date') and
                            (isinstance(p.get('payment_date'), datetime) and p.get('payment_date') < now or
                            isinstance(p.get('payment_date'), str) and datetime.fromisoformat(p.get('payment_date')) < now)]

        # Format the response
        response = {
            "message": "Payment status retrieved successfully"
        }

        if next_payment:
            payment_date = next_payment.get('payment_date')
            if isinstance(payment_date, str):
                payment_date = datetime.fromisoformat(payment_date)

            response["nextDueDate"] = payment_date.isoformat() if payment_date else None

            # Try to get amount from different possible fields
            amount = 0
            if 'total_amount' in next_payment:
                amount = float(next_payment.get('total_amount', 0))
            elif 'rent_amount' in next_payment:
                amount = float(next_payment.get('rent_amount', 0))
                if 'maintenance_fee' in next_payment:
                    amount += float(next_payment.get('maintenance_fee', 0))

            response["nextDueAmount"] = amount

        if last_payment:
            payment_date = last_payment.get('payment_date')
            if isinstance(payment_date, str):
                payment_date = datetime.fromisoformat(payment_date)

            response["lastPaymentDate"] = payment_date.isoformat() if payment_date else None

            # Try to get amount from different possible fields
            amount = 0
            if 'total_amount' in last_payment:
                amount = float(last_payment.get('total_amount', 0))
            elif 'rent_amount' in last_payment:
                amount = float(last_payment.get('rent_amount', 0))
                if 'maintenance_fee' in last_payment:
                    amount += float(last_payment.get('maintenance_fee', 0))

            response["lastPaymentAmount"] = amount

        # Set overdue status
        response["isOverdue"] = len(overdue_payments) > 0

        return response

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenant payment status: {str(e)}"
        )

# Note: The tenant document upload endpoint (POST /{tenant_id}/documents) has been removed
# ID documents are now handled directly as part of the tenant profile (id_proof_url field)
# Other documents are managed through the property document endpoints: /api/properties/{property_id}/documents