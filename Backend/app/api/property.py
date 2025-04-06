from typing import List, Dict, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Form, status, Body
from pydantic import BaseModel, HttpUrl
import uuid
import logging
from supabase import Client

# Updated model imports
from app.models.user import User
from app.models.property import (
    Property,
    PropertyCreate,
    PropertyUpdate,
    PropertyDocument,
    PropertyDocumentCreate,
    PropertyType,
    PropertyCategory
)
# Assuming tenant, maintenance, payment models exist elsewhere
from app.models.tenant import Tenant # Placeholder
from app.models.maintenance import MaintenanceRequest # Placeholder
from app.models.payment import Payment # Placeholder

from app.services import property_service
from app.config.auth import get_current_user
from app.config.database import get_supabase_client_authenticated
from app.utils.common import PaginationParams # Use absolute import from app
from app.crud.property import CRUDProperty

router = APIRouter(
    prefix="/properties",
    tags=["Properties"], # Capitalized Tag
    responses={404: {"description": "Not found"}},
)

# Define response model for list operations, potentially with pagination metadata
class PropertiesListResponse(BaseModel):
    items: List[Property]
    total: int
    # Add page, size, etc. if needed based on PaginationParams

# Response model for property operations that need custom responses
class PropertyResponse(BaseModel):
    property: Dict[str, Any]
    message: str = "Success"

@router.get("/", response_model=PropertiesListResponse)
async def get_properties(
    pagination: PaginationParams = Depends(), # Use common pagination dependency
    sort_by: Optional[str] = Query('created_at', description="Field to sort by"),
    sort_order: Optional[str] = Query('desc', description="Sort order: 'asc' or 'desc'"),
    property_type: Optional[PropertyType] = Query(None, description="Filter by property type"),
    city: Optional[str] = Query(None, description="Filter by city (case-insensitive)"),
    pincode: Optional[str] = Query(None, description="Filter by pincode"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated),
):
    """Get all properties for the current user with pagination, filtering, and sorting."""
    try:
        # Correctly extract user_id from the dictionary provided by get_current_user
        user_id = current_user.get("id")
        if not user_id:
             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token/session")
             
        logger.info(f"Fetching properties for user_id: {user_id}")
        
        properties = await property_service.get_properties(
            db_client=db_client,
            user_id=user_id,
            skip=pagination.skip,
            limit=pagination.limit,
            sort_by=sort_by,
            sort_order=sort_order,
            property_type=property_type.value if property_type else None,
            city=city,
            pincode=pincode
        )
        
        logger.info(f"Fetched {len(properties)} properties for user {user_id}")
        
        # Get total count for pagination metadata
        total_count = await property_service.get_properties_count(
            db_client=db_client,
            user_id=user_id,
            property_type=property_type.value if property_type else None,
            city=city,
            pincode=pincode
        )
        logger.info(f"Total properties count for user {user_id}: {total_count}")
        
        return PropertiesListResponse(items=properties, total=total_count)
    except Exception as e:
        logging.error(f"Error getting properties: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve properties: {str(e)}")

@router.get("/{property_id}", response_model=Property)
async def get_property(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    current_user: User = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated),
):
    """Get a specific property by ID."""
    property_data = await property_service.get_property(db_client, str(property_id))
    if not property_data:
        raise HTTPException(status_code=404, detail="Property not found")
    # Verify ownership
    if property_data.get("owner_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this property")
    return property_data

@router.post("/", response_model=Property, status_code=status.HTTP_201_CREATED)
async def create_property(
    property_data: PropertyCreate,
    current_user: User = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated),
):
    """Create a new property."""
    try:
        created_property = await property_service.create_property(
            db_client=db_client,
            property_data=property_data, 
            owner_id=current_user.id
        )
        if not created_property:
            # It might be useful to log why creation failed if None was returned
            logging.warning(f"property_service.create_property returned None for owner {current_user.id}")
            raise HTTPException(status_code=500, detail="Failed to create property")
        return created_property
    except Exception as e:
        # Log the exception details with traceback
        logging.error(f"Error in create_property for owner {current_user.id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating property: {str(e)}")

@router.put("/{property_id}", response_model=Property)
async def update_property(
    property_data: PropertyUpdate,
    property_id: uuid.UUID = Path(..., description="The property ID"),
    current_user: User = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated),
):
    """Update a property."""
    try:
        updated_property = await property_service.update_property(
            db_client=db_client,
            property_id=str(property_id),
            property_data=property_data,
            owner_id=current_user.id
        )
        if updated_property is None:
            # Service layer returns None if not found or not authorized
            raise HTTPException(status_code=404, detail="Property not found or not authorized")
        return updated_property
    except HTTPException as http_exc: # Re-raise validation errors etc.
        raise http_exc
    except Exception as e:
        logging.error(f"Error updating property {property_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating property: {str(e)}")

@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    current_user: User = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated),
):
    """Delete a property."""
    try:
        success = await property_service.delete_property(
            db_client=db_client,
            property_id=str(property_id),
            owner_id=current_user.id
        )
        if not success:
            # Service layer returns False if not found or not authorized
            raise HTTPException(status_code=404, detail="Property not found or not authorized")
        # No content to return on successful delete
        return None
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logging.error(f"Error deleting property {property_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error deleting property: {str(e)}")

# --- New Endpoints for Related Data ---

@router.get("/{property_id}/units", response_model=List[str])
async def get_property_units(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    current_user: User = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """Get a list of distinct unit numbers associated with this property."""
    try:
        units = await property_service.get_units_for_property(
            db_client=db_client,
            property_id=str(property_id),
            owner_id=current_user.id
        )
        # Service layer handles ownership check and returns empty list if not authorized/found
        return units
    except Exception as e:
        logging.error(f"Error getting units for {property_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving units: {str(e)}")

@router.get("/{property_id}/documents", response_model=List[PropertyDocument])
async def get_property_documents(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    current_user: User = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """Get documents associated with this property."""
    try:
        documents = await property_service.get_documents_for_property(
            db_client=db_client,
            property_id=str(property_id),
            owner_id=current_user.id
        )
        return documents
    except Exception as e:
        logging.error(f"Error getting documents for {property_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving documents: {str(e)}")

@router.post("/{property_id}/documents", response_model=PropertyDocument, status_code=status.HTTP_201_CREATED)
async def add_property_document(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    document_data: PropertyDocumentCreate = Body(...),
    current_user: User = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """Add a new document record for the property (assumes file is already uploaded)."""
    try:
        # Consider adding logic here or in service to verify document_url access/existence if needed
        new_document = await property_service.add_document_to_property(
            db_client=db_client,
            property_id=str(property_id),
            document_data=document_data,
            owner_id=current_user.id
        )
        if not new_document:
             raise HTTPException(status_code=404, detail="Property not found or not authorized to add document")
        return new_document
    except Exception as e:
        logging.error(f"Error adding document for {property_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error adding document: {str(e)}")

# Example placeholder endpoint (replace with actual implementation)
@router.get("/{property_id}/tenants", response_model=List[Tenant]) # Use actual Tenant model
async def get_property_tenants(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    current_user: User = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """(Placeholder) Get tenants associated with this property."""
    try:
        # Replace with call to actual service function
        tenants = await property_service.get_tenants_for_property(
            db_client=db_client,
            property_id=str(property_id),
            owner_id=current_user.id
        )
        return tenants
    except Exception as e:
        logging.error(f"Error getting tenants for {property_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving tenants: {str(e)}")

# Example placeholder endpoint (replace with actual implementation)
@router.get("/{property_id}/maintenance", response_model=List[MaintenanceRequest]) # Use actual MaintenanceRequest model
async def get_property_maintenance(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    current_user: User = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """(Placeholder) Get maintenance requests for this property."""
    try:
        # Replace with call to actual service function
        requests = await property_service.get_maintenance_for_property(
            db_client=db_client,
            property_id=str(property_id),
            owner_id=current_user.id
        )
        return requests
    except Exception as e:
        logging.error(f"Error getting maintenance for {property_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving maintenance requests: {str(e)}")

# Example placeholder endpoint (replace with actual implementation)
@router.get("/{property_id}/payments", response_model=List[Payment]) # Use actual Payment model
async def get_property_payments(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    current_user: User = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """(Placeholder) Get payment history for this property."""
    try:
        # Replace with call to actual service function
        payments = await property_service.get_payments_for_property(
            db_client=db_client,
            property_id=str(property_id),
            owner_id=current_user.id
        )
        return payments
    except Exception as e:
        logging.error(f"Error getting payments for {property_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving payments: {str(e)}")

# Placeholder for revenue - requires definition of what revenue means
# Could be sum of payments, calculation based on leases, etc.
@router.get("/{property_id}/revenue", response_model=Dict[str, Any]) # Define a proper response model
async def get_property_revenue(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    # Add query params for time period (e.g., start_date, end_date)
    current_user: User = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """(Placeholder) Get revenue details for this property."""
    # 1. Verify ownership first using a direct DB call or rely on service layer check
    # Using service layer check is often cleaner
    # 2. Implement revenue calculation logic (likely in service layer)
    try:
        revenue_data = await property_service.get_revenue_for_property(
            db_client=db_client, 
            property_id=str(property_id), 
            owner_id=current_user.id
        )
        if revenue_data is None: # Service function might return None if not authorized
             raise HTTPException(status_code=404, detail="Property not found or not authorized")
        return revenue_data # Replace with actual calculation
    except Exception as e:
        logging.error(f"Error getting revenue for {property_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving property revenue: {str(e)}")

# Remove or adapt the old image upload endpoint if image_urls are now part of PropertyUpdate
# @router.post("/{property_id}/images", response_model=PropertyResponse) ... 