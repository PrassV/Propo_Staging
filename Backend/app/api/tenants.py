from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, Path, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from ..models.tenant import TenantCreate, TenantUpdate, Tenant
from ..services import tenant_service
from ..utils.security import get_current_user

router = APIRouter()

# Response models
class TenantResponse(BaseModel):
    tenant: Dict[str, Any]
    message: str = "Success"

class TenantsResponse(BaseModel):
    tenants: List[Dict[str, Any]]
    count: int
    message: str = "Success"

@router.get("/", response_model=TenantsResponse)
async def get_tenants(
    property_id: Optional[str] = Query(None, description="Filter tenants by property ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all tenants for the current user, optionally filtered by property.
    
    Args:
        property_id: Optional property ID to filter by
        current_user: The current authenticated user
        
    Returns:
        JSON with tenants list
    """
    tenants = await tenant_service.get_tenants(property_id, current_user["id"])
    return {
        "tenants": tenants,
        "count": len(tenants)
    }

@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: str = Path(..., description="The ID of the tenant to retrieve"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a tenant by ID.
    
    Args:
        tenant_id: The tenant ID
        current_user: The current authenticated user
        
    Returns:
        JSON with tenant data
    """
    tenant_data = await tenant_service.get_tenant_by_id(tenant_id)
    
    if not tenant_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check if the current user is the owner
    if tenant_data.get("owner_id") != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this tenant"
        )
    
    return {
        "tenant": tenant_data
    }

@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new tenant.
    
    Args:
        tenant_data: The tenant data
        current_user: The current authenticated user
        
    Returns:
        JSON with created tenant data
    """
    created_tenant = await tenant_service.create_tenant(tenant_data, current_user["id"])
    
    if not created_tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create tenant. Ensure the property exists and you are the owner."
        )
    
    return {
        "tenant": created_tenant,
        "message": "Tenant created successfully"
    }

@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    tenant_data: TenantUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a tenant.
    
    Args:
        tenant_id: The tenant ID to update
        tenant_data: The updated tenant data
        current_user: The current authenticated user
        
    Returns:
        JSON with updated tenant data
    """
    updated_tenant = await tenant_service.update_tenant(tenant_id, tenant_data, current_user["id"])
    
    if not updated_tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found or you don't have permission to update this tenant"
        )
    
    return {
        "tenant": updated_tenant,
        "message": "Tenant updated successfully"
    }

@router.delete("/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a tenant.
    
    Args:
        tenant_id: The tenant ID to delete
        current_user: The current authenticated user
        
    Returns:
        JSON with success message
    """
    success = await tenant_service.delete_tenant(tenant_id, current_user["id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found or you don't have permission to delete this tenant"
        )
    
    return {
        "message": "Tenant deleted successfully"
    }

@router.post("/{tenant_id}/documents", response_model=TenantResponse)
async def upload_tenant_document(
    tenant_id: str,
    document_name: str = Form(...),
    document_url: str = Form(...),
    document_type: str = Form(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upload a tenant document.
    
    Args:
        tenant_id: The tenant ID
        document_name: The document name
        document_url: The document URL
        document_type: The document type
        current_user: The current authenticated user
        
    Returns:
        JSON with updated tenant data
    """
    updated_tenant = await tenant_service.upload_tenant_document(
        tenant_id,
        document_name,
        document_url,
        document_type,
        current_user["id"]
    )
    
    if not updated_tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found or you don't have permission to upload documents for this tenant"
        )
    
    return {
        "tenant": updated_tenant,
        "message": "Document uploaded successfully"
    } 