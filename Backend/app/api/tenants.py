# Enhanced Tenant API with comprehensive document and verification support
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
    Tenant, TenantCreate, TenantUpdate, TenantDocument, TenantHistory, UnitHistory,
    PropertyTenantLink, PropertyTenantLinkCreate, PropertyTenantLinkUpdate,
    TenantInvitationCreate, TenantInvitation, TenantWithHistory, 
    TenantVerificationRequest, TenantVerificationResponse,
    DocumentUploadRequest, DocumentUploadResponse
)
from app.models.user import User

from app.models.property import Property
from app.models.payment import Payment
from app.models.maintenance import MaintenanceRequest

from ..services import tenant_service
from ..db import tenants as tenants_db
from ..db import properties as properties_db
from ..config.auth import get_current_user
from app.utils.common import PaginationParams

router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"],
    responses={404: {"description": "Not found"}}
)

# Enhanced Response Models
class TenantResponse(BaseModel):
    tenant: Tenant
    message: str = "Success"

class TenantWithHistoryResponse(BaseModel):
    tenant: TenantWithHistory
    message: str = "Success"

class TenantsListResponse(BaseModel):
    items: List[Tenant]
    total: int
    message: str = "Success"

class TenantDocumentResponse(BaseModel):
    document: TenantDocument
    message: str = "Success"

class TenantDocumentsResponse(BaseModel):
    documents: List[TenantDocument]
    total: int
    message: str = "Success"

class TenantHistoryResponse(BaseModel):
    history: List[TenantHistory]
    total: int
    message: str = "Success"

class TenantInvitationResponse(BaseModel):
    invitation: TenantInvitation
    message: str = "Success"

class TenantVerifyLinkRequest(BaseModel):
    invitation_code: str
    tenant_id: UUID4



# --- Enhanced Tenant CRUD Endpoints ---

@router.get("/me", response_model=TenantWithHistoryResponse)
async def get_current_user_tenant(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get the tenant profile with history for the currently authenticated user."""
    try:
        user_id_str = current_user.get("id")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token invalid or missing user ID."
            )

        user_id = uuid.UUID(user_id_str)
        tenant_data = await tenant_service.get_tenant_with_history_by_user_id(user_id)

        if not tenant_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No tenant profile found linked to the current user."
            )

        return {
            "tenant": tenant_data,
            "message": "Current tenant profile with history retrieved successfully"
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
    status: Optional[str] = Query(None, description="Filter tenants by status"),
    verification_status: Optional[str] = Query(None, description="Filter by verification status"),
    occupation_category: Optional[str] = Query(None, description="Filter by occupation category"),
    sort_by: Optional[str] = Query("created_at", description="Field to sort by"),
    sort_order: Optional[str] = Query("desc", description="Sort order ('asc' or 'desc')"),
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all tenants with enhanced filtering and search capabilities."""
    try:
        user_id = uuid.UUID(current_user["id"])
        property_id_obj = uuid.UUID(str(property_id)) if property_id else None

        tenants, total_count = await tenant_service.get_tenants_enhanced(
            owner_id=user_id,
            property_id=property_id_obj,
            status=status,
            verification_status=verification_status,
            occupation_category=occupation_category,
            search=search,
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

@router.get("/{tenant_id}", response_model=TenantWithHistoryResponse)
async def get_tenant(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant to retrieve"),
    include_history: bool = Query(True, description="Include tenant history"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a tenant by ID with comprehensive history and document information."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        if include_history:
            tenant_data = await tenant_service.get_tenant_with_history_by_id(tenant_id_obj, user_id)
        else:
            tenant_data = await tenant_service.get_tenant_by_id(tenant_id_obj, user_id)

        if not tenant_data:
            raw_tenant = await tenants_db.get_tenant_by_id(tenant_id_obj)
            if raw_tenant:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to access this tenant's information."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Tenant not found."
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
    """Create a new tenant with comprehensive validation and history tracking."""
    try:
        user_id = uuid.UUID(current_user["id"])
        
        created_tenant = await tenant_service.create_tenant_comprehensive(tenant_data, user_id)

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
    """Update a tenant's information with comprehensive validation and history tracking."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        updated_tenant = await tenant_service.update_tenant_comprehensive(tenant_id_obj, tenant_data, user_id)

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

# --- Document Management Endpoints ---

@router.get("/{tenant_id}/documents", response_model=TenantDocumentsResponse)
async def get_tenant_documents(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all documents for a tenant."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        documents, total_count = await tenant_service.get_tenant_documents(
            tenant_id_obj, user_id, document_type
        )

        return {
            "documents": documents,
            "total": total_count,
            "message": "Documents retrieved successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving documents: {str(e)}"
        )

@router.post("/{tenant_id}/documents", response_model=TenantDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_tenant_document(
    document_data: DocumentUploadRequest,
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Upload a document for a tenant."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        document = await tenant_service.upload_tenant_document(
            tenant_id_obj, document_data, user_id
        )

        if not document:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to upload document"
            )

        return {
            "document": document,
            "message": "Document uploaded successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading document: {str(e)}"
        )

@router.delete("/{tenant_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant_document(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    document_id: UUID4 = Path(..., description="The ID of the document"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a tenant document."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))
        document_id_obj = uuid.UUID(str(document_id))

        success = await tenant_service.delete_tenant_document(
            tenant_id_obj, document_id_obj, user_id
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or you don't have permission to delete it"
            )

        return None
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting document: {str(e)}"
        )

# --- Verification Endpoints ---

@router.post("/{tenant_id}/verification", response_model=TenantVerificationResponse)
async def verify_tenant(
    verification_data: TenantVerificationRequest,
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Verify a tenant's documents and information."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        result = await tenant_service.verify_tenant(
            tenant_id_obj, verification_data, user_id
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to verify tenant"
            )

        return result
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying tenant: {str(e)}"
        )

@router.put("/{tenant_id}/verification-status", response_model=TenantResponse)
async def update_verification_status(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    verification_status: str = Body(..., description="New verification status"),
    notes: Optional[str] = Body(None, description="Verification notes")
):
    """Update a tenant's verification status."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        updated_tenant = await tenant_service.update_verification_status(
            tenant_id_obj, verification_status, notes, user_id
        )

        if not updated_tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or you don't have permission to update verification status"
            )

        return {
            "tenant": updated_tenant,
            "message": "Verification status updated successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating verification status: {str(e)}"
        )

# --- History Endpoints ---

@router.get("/{tenant_id}/history", response_model=TenantHistoryResponse)
async def get_tenant_history(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get tenant history with filtering and pagination."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        history, total_count = await tenant_service.get_tenant_history(
            tenant_id_obj, user_id, skip, limit, action_type
        )

        return {
            "history": history,
            "total": total_count,
            "message": "History retrieved successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving history: {str(e)}"
        )

@router.get("/{tenant_id}/lease-history", response_model=Dict[str, Any])
async def get_tenant_lease_history(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get comprehensive lease history for a tenant."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        lease_history = await tenant_service.get_tenant_lease_history(
            tenant_id_obj, user_id
        )

        return {
            "lease_history": lease_history,
            "total": len(lease_history),
            "message": "Lease history retrieved successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving lease history: {str(e)}"
        )

# --- Status Management Endpoints ---

@router.put("/{tenant_id}/status", response_model=TenantResponse)
async def update_tenant_status(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    new_status: str = Body(..., description="New status (active, inactive, unassigned)"),
    reason: Optional[str] = Body(None, description="Reason for status change")
):
    """Update tenant status with automatic workflow management."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        updated_tenant = await tenant_service.update_tenant_status(
            tenant_id_obj, new_status, reason, user_id
        )

        if not updated_tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or you don't have permission to update status"
            )

        return {
            "tenant": updated_tenant,
            "message": f"Tenant status updated to {new_status} successfully"
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating status: {str(e)}"
        )

# --- Existing endpoints with minimal changes ---

@router.post("/{tenant_id}/invite", response_model=TenantInvitationResponse)
async def invite_tenant(
    invitation_data: TenantInvitationCreate,
    tenant_id: UUID4 = Path(..., description="The ID of the tenant to invite"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """Create an invitation for a tenant to join the platform."""
    try:
        user_id = uuid.UUID(current_user["id"])
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

@router.post("/verify-link", status_code=status.HTTP_200_OK)
async def verify_and_link_tenant(
    request_body: TenantVerifyLinkRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Verify and link a tenant using invitation code."""
    try:
        user_id = uuid.UUID(current_user["id"])
        result = await tenant_service.verify_and_link_tenant(request_body, user_id)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid invitation code or tenant link failed"
            )

        return {"message": "Tenant verified and linked successfully"}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying tenant link: {str(e)}"
        )

# --- Relationship endpoints remain unchanged ---

@router.get("/{tenant_id}/properties", response_model=List[Property])
async def get_tenant_properties(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get properties associated with a tenant."""
    try:
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
    """Get lease/tenancy details for a tenant."""
    try:
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
    """Get payment history for a tenant."""
    try:
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
    """Get maintenance requests associated with a tenant."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))
        maintenance_requests = await tenant_service.get_maintenance_for_tenant(tenant_id_obj, user_id)
        return maintenance_requests
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tenant maintenance requests: {str(e)}"
        )

@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a tenant with comprehensive cleanup."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        success = await tenant_service.delete_tenant_comprehensive(tenant_id_obj, user_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or you don't have permission to delete this tenant"
            )

        return None
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting tenant: {str(e)}"
        )

@router.put("/{tenant_id}/reactivate", response_model=TenantResponse)
async def reactivate_tenant(
    tenant_id: UUID4 = Path(..., description="The ID of the tenant to reactivate"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Reactivate an inactive tenant."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))

        current_tenant = await tenant_service.get_tenant_by_id(tenant_id_obj, user_id)
        
        if not current_tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or you don't have permission to access this tenant"
            )
            
        if current_tenant.get("status") != "inactive":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only inactive tenants can be reactivated"
            )
            
        updated_tenant = await tenant_service.update_tenant_status(
            tenant_id_obj, "unassigned", "Reactivated by owner", user_id
        )

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
    """Links a tenant to a property."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))
        
        property_id = link_data.property_id
        unit_number = getattr(link_data, "unit_number", None)
        start_date = link_data.start_date 
        end_date = getattr(link_data, "end_date", None)
        
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
    """Terminate a tenant's lease with comprehensive business logic."""
    try:
        user_id = uuid.UUID(current_user["id"])
        tenant_id_obj = uuid.UUID(str(tenant_id))
        
        link_id = termination_data.get('link_id')
        termination_date_str = termination_data.get('termination_date')
        
        if not link_id or not termination_date_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="link_id and termination_date are required"
            )
        
        try:
            from datetime import date
            termination_date = date.fromisoformat(termination_date_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="termination_date must be in YYYY-MM-DD format"
            )
        
        result = await tenant_service.terminate_lease_comprehensive(
            tenant_id_obj, link_id, termination_date, termination_data, user_id
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lease not found or you don't have permission to terminate it"
            )
            
        return {
            "message": "Lease terminated successfully",
            "termination_details": result
        }
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error terminating lease: {e}", exc_info=True)
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