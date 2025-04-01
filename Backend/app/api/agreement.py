from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Form
import logging

from app.models.agreement import (
    Agreement,
    AgreementCreate,
    AgreementUpdate,
    AgreementTemplate,
    AgreementTemplateCreate
)
from app.services import agreement_service
from app.config.auth import get_current_user

router = APIRouter(
    prefix="/agreements",
    tags=["agreements"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

# Get all agreements (with optional filters)
@router.get("/", response_model=List[Agreement])
async def get_agreements(
    property_id: Optional[str] = Query(None, description="Filter by property ID"),
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    agreement_type: Optional[str] = Query(None, description="Filter by agreement type"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get all agreements for the current user (optionally filtered).
    
    If the user is a landlord, returns agreements for their properties.
    If the user is a tenant, returns only their agreements.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        if user_type == "tenant":
            # Tenants can only see their own agreements
            agreements = await agreement_service.get_agreements(
                tenant_id=user_id,
                property_id=property_id,
                status=status,
                agreement_type=agreement_type
            )
        else:
            # Owners see all agreements for their properties
            agreements = await agreement_service.get_agreements(
                owner_id=user_id,
                property_id=property_id,
                tenant_id=tenant_id,
                status=status,
                agreement_type=agreement_type
            )
            
        return agreements
    except Exception as e:
        logger.error(f"Error getting agreements: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve agreements")

# Get a specific agreement by ID
@router.get("/{agreement_id}", response_model=Agreement)
async def get_agreement(
    agreement_id: str = Path(..., description="The agreement ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get a specific agreement by ID.
    
    Users can only access their own agreements or agreements for their properties.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        agreement = await agreement_service.get_agreement(agreement_id)
        
        if not agreement:
            raise HTTPException(status_code=404, detail="Agreement not found")
            
        # Check authorization
        if user_type == "tenant" and agreement.get("tenant_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this agreement")
        elif user_type == "owner" and agreement.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this agreement")
            
        return agreement
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agreement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve agreement")

# Create a new agreement
@router.post("/", response_model=Agreement)
async def create_agreement(
    agreement_data: AgreementCreate,
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a new agreement.
    
    Only owners can create agreements.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to create agreements")
            
        created_agreement = await agreement_service.create_agreement(
            agreement_data=agreement_data,
            owner_id=user_id
        )
        
        if not created_agreement:
            raise HTTPException(status_code=500, detail="Failed to create agreement")
            
        return created_agreement
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating agreement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create agreement")

# Update an agreement
@router.put("/{agreement_id}", response_model=Agreement)
async def update_agreement(
    agreement_data: AgreementUpdate,
    agreement_id: str = Path(..., description="The agreement ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Update an agreement.
    
    Only owners can update most fields of agreements.
    Tenants can update only certain fields (e.g., status for signing).
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Get the existing agreement
        existing_agreement = await agreement_service.get_agreement(agreement_id)
        
        if not existing_agreement:
            raise HTTPException(status_code=404, detail="Agreement not found")
            
        # Check authorization
        if user_type == "tenant":
            if existing_agreement.get("tenant_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to update this agreement")
                
            # Tenants can only update status to signed_tenant
            if agreement_data.status is not None and agreement_data.status != "signed_tenant":
                raise HTTPException(status_code=403, detail="Tenants can only update status to 'signed_tenant'")
                
            # Tenants can't update other fields
            for field in agreement_data.__dict__:
                if field != "status" and field != "signed_url" and getattr(agreement_data, field) is not None:
                    raise HTTPException(
                        status_code=403, 
                        detail=f"Tenants are not allowed to update the {field} field"
                    )
        elif user_type == "owner" and existing_agreement.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this agreement")
            
        updated_agreement = await agreement_service.update_agreement(
            agreement_id=agreement_id,
            agreement_data=agreement_data
        )
        
        if not updated_agreement:
            raise HTTPException(status_code=500, detail="Failed to update agreement")
            
        return updated_agreement
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agreement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update agreement")

# Delete an agreement
@router.delete("/{agreement_id}", response_model=dict)
async def delete_agreement(
    agreement_id: str = Path(..., description="The agreement ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Delete an agreement.
    
    Only owners can delete agreements that are not yet signed.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to delete agreements")
            
        # Get the existing agreement
        existing_agreement = await agreement_service.get_agreement(agreement_id)
        
        if not existing_agreement:
            raise HTTPException(status_code=404, detail="Agreement not found")
            
        # Verify ownership
        if existing_agreement.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this agreement")
            
        # Check if agreement is already signed
        if existing_agreement.get("status") in ["signed_tenant", "signed_landlord", "signed"]:
            raise HTTPException(status_code=400, detail="Cannot delete a signed agreement")
            
        success = await agreement_service.delete_agreement(agreement_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete agreement")
            
        return {"message": "Agreement deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting agreement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete agreement")

# Generate an agreement document
@router.post("/{agreement_id}/generate", response_model=Agreement)
async def generate_document(
    agreement_id: str = Path(..., description="The agreement ID"),
    template_id: Optional[str] = Query(None, description="Optional template ID to use"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Generate a document from an agreement and template.
    
    Only owners can generate agreement documents.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to generate agreement documents")
            
        # Get the existing agreement
        existing_agreement = await agreement_service.get_agreement(agreement_id)
        
        if not existing_agreement:
            raise HTTPException(status_code=404, detail="Agreement not found")
            
        # Verify ownership
        if existing_agreement.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to generate document for this agreement")
            
        generated_agreement = await agreement_service.generate_agreement_document(
            agreement_id=agreement_id,
            template_id=template_id
        )
        
        if not generated_agreement:
            raise HTTPException(status_code=500, detail="Failed to generate agreement document")
            
        return generated_agreement
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating agreement document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate agreement document")

# Update agreement status
@router.put("/{agreement_id}/status", response_model=Agreement)
async def update_status(
    agreement_id: str = Path(..., description="The agreement ID"),
    status: str = Query(..., description="The new status"),
    signed_url: Optional[str] = Query(None, description="Optional URL to the signed document"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Update the status of an agreement (e.g., when signed).
    
    Tenants can only update status to signed_tenant.
    Owners can update to any status.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Get the existing agreement
        existing_agreement = await agreement_service.get_agreement(agreement_id)
        
        if not existing_agreement:
            raise HTTPException(status_code=404, detail="Agreement not found")
            
        # Check authorization
        if user_type == "tenant":
            if existing_agreement.get("tenant_id") != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to update this agreement")
                
            # Tenants can only set status to signed_tenant
            if status != "signed_tenant":
                raise HTTPException(status_code=403, detail="Tenants can only update status to 'signed_tenant'")
        elif user_type == "owner" and existing_agreement.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this agreement")
            
        updated_agreement = await agreement_service.update_agreement_status(
            agreement_id=agreement_id,
            status=status,
            signed_url=signed_url
        )
        
        if not updated_agreement:
            raise HTTPException(status_code=500, detail="Failed to update agreement status")
            
        return updated_agreement
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agreement status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update agreement status")

# Get current agreement for a property and tenant
@router.get("/current", response_model=Optional[Agreement])
async def get_current_agreement(
    property_id: str = Query(..., description="The property ID"),
    tenant_id: str = Query(..., description="The tenant ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get the current active agreement for a property and tenant.
    
    Both tenants and owners can view current agreements if they are authorized.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization for tenants
        if user_type == "tenant" and tenant_id != user_id:
            raise HTTPException(status_code=403, detail="Tenants can only access their own agreements")
            
        current_agreement = await agreement_service.get_current_agreement(
            property_id=property_id,
            tenant_id=tenant_id
        )
        
        if current_agreement and user_type == "owner" and current_agreement.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this agreement")
            
        # If no current agreement, return None (which will be converted to null in JSON)
        return current_agreement
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current agreement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get current agreement")

# --- Agreement Template Endpoints ---

# Get all agreement templates
@router.get("/templates", response_model=List[AgreementTemplate])
async def get_agreement_templates(
    agreement_type: Optional[str] = Query(None, description="Filter by agreement type"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get all agreement templates for the current owner (optionally filtered).
    
    Only owners can view their templates.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to view agreement templates")
            
        templates = await agreement_service.get_agreement_templates(
            owner_id=user_id,
            agreement_type=agreement_type
        )
        
        return templates
    except Exception as e:
        logger.error(f"Error getting agreement templates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve agreement templates")

# Get a specific agreement template by ID
@router.get("/templates/{template_id}", response_model=AgreementTemplate)
async def get_agreement_template(
    template_id: str = Path(..., description="The template ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get a specific agreement template by ID.
    
    Only owners can view their templates.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to view agreement templates")
            
        template = await agreement_service.get_agreement_template(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Agreement template not found")
            
        # Verify ownership
        if template.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this template")
            
        return template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agreement template: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve agreement template")

# Create a new agreement template
@router.post("/templates", response_model=AgreementTemplate)
async def create_agreement_template(
    template_data: AgreementTemplateCreate,
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a new agreement template.
    
    Only owners can create agreement templates.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to create agreement templates")
            
        created_template = await agreement_service.create_agreement_template(
            template_data=template_data,
            owner_id=user_id
        )
        
        if not created_template:
            raise HTTPException(status_code=500, detail="Failed to create agreement template")
            
        return created_template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating agreement template: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create agreement template")

# Update an agreement template
@router.put("/templates/{template_id}", response_model=AgreementTemplate)
async def update_agreement_template(
    template_id: str = Path(..., description="The template ID"),
    template_data: Dict = Depends(),
    current_user: Dict = Depends(get_current_user)
):
    """
    Update an agreement template.
    
    Only owners can update their templates.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to update agreement templates")
            
        # Get the existing template
        existing_template = await agreement_service.get_agreement_template(template_id)
        
        if not existing_template:
            raise HTTPException(status_code=404, detail="Agreement template not found")
            
        # Verify ownership
        if existing_template.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this template")
            
        updated_template = await agreement_service.update_agreement_template(
            template_id=template_id,
            template_data=template_data
        )
        
        if not updated_template:
            raise HTTPException(status_code=500, detail="Failed to update agreement template")
            
        return updated_template
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agreement template: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update agreement template")

# Delete an agreement template
@router.delete("/templates/{template_id}", response_model=dict)
async def delete_agreement_template(
    template_id: str = Path(..., description="The template ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Delete an agreement template.
    
    Only owners can delete their templates.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to delete agreement templates")
            
        # Get the existing template
        existing_template = await agreement_service.get_agreement_template(template_id)
        
        if not existing_template:
            raise HTTPException(status_code=404, detail="Agreement template not found")
            
        # Verify ownership
        if existing_template.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this template")
            
        success = await agreement_service.delete_agreement_template(template_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete agreement template")
            
        return {"message": "Agreement template deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting agreement template: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete agreement template") 