from typing import List, Dict, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Form, status, Body, UploadFile, File
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
    PropertyCategory,
    UnitCreate,
    UnitDetails,
    PropertyDetails,
    PropertyWithUnits,  # Add this for detailed property response
    PropertyTax,
    PropertyTaxCreate,
    PropertyTaxUpdate
)
# Phase 2: Import the new response schema
from app.schemas.property import PropertyDetailResponse
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

# Create a separate router for units endpoints
units_router = APIRouter(
    prefix="/units",
    tags=["Units"]
)

logger = logging.getLogger(__name__)

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

@router.get("/{property_id}", response_model=PropertyWithUnits)
async def get_property(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    include_units: bool = Query(True, description="Include units in response"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated),
):
    """Get a specific property by ID, including its units."""
    try:
        property_data = await property_service.get_property_with_units(
            db_client=db_client, 
            property_id=str(property_id),
            owner_id=current_user.get("id"),
            include_units=include_units
        )
        if not property_data:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Transform the data to match frontend expectations
        # Convert pincode to zip_code, image_urls to image_url (first one), etc.
        frontend_property = {
            **property_data,
            "zip_code": property_data.get("pincode"),  # Frontend expects zip_code
            "image_url": property_data.get("image_urls", [""])[0] if property_data.get("image_urls") else "",  # Frontend expects single image_url
            "description": property_data.get("property_name", "") + " - " + property_data.get("property_type", ""),  # Generate description
            "price": property_data.get("purchase_price", 0) or property_data.get("market_value", 0)  # Frontend expects price field
        }
        
        return frontend_property
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logging.error(f"Error getting property {property_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve property: {str(e)}")

@router.post("/", response_model=Property, status_code=status.HTTP_201_CREATED)
async def create_property(
    property_data: PropertyCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated),
):
    """Create a new property."""
    user_id = current_user.get("id") if current_user else None
    if not user_id:
        # Handle case where user_id might be missing or current_user is None
        logging.error("User ID not found in current_user for create_property")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user data")

    try:
        created_property = await property_service.create_property(
            db_client=db_client,
            property_data=property_data, 
            owner_id=user_id
        )
        if not created_property:
            # It might be useful to log why creation failed if None was returned
            logging.warning(f"property_service.create_property returned None for owner {user_id}")
            raise HTTPException(status_code=500, detail="Failed to create property")
        return created_property
    except Exception as e:
        # Log the exception details with traceback
        logging.error(f"Error in create_property for owner {user_id}: {str(e)}", exc_info=True)
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

# --- REMOVED OLD UNIT ENDPOINTS - Now handled by /units router --- #

# @router.get("/{property_id}/units", ...)
# async def get_property_units(...):
#     ...

# @router.post("/{property_id}/units", ...)
# async def create_property_unit(...):
#    ...

# --- Property Documents Endpoints --- #

@router.get("/{property_id}/documents", response_model=List[PropertyDocument])
async def get_property_documents(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """Get documents associated with this property."""
    try:
        # Corrected user_id access
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
            
        documents = await property_service.get_documents_for_property(
            db_client=db_client,
            property_id=str(property_id),
            owner_id=user_id # Pass corrected user_id
        )
        return documents
    except HTTPException as http_exc:
        logger.warning(f"HTTP exception fetching documents for {property_id}: {http_exc.detail}")
        raise http_exc # Re-raise specific HTTP exceptions
    except Exception as e:
        logger.error(f"Error getting documents for {property_id}: {e}", exc_info=True)
        # Ensure a generic message for unexpected errors
        raise HTTPException(status_code=500, detail="Error retrieving documents") # Removed str(e)

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
        logger.error(f"Error adding document for {property_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error adding document: {str(e)}")

# --- REMOVED OLD TENANTS ENDPOINT --- #
# @router.get("/{property_id}/tenants", ...)
# async def get_property_tenants(...):
#    ...

# --- REMOVED OLD MAINTENANCE ENDPOINT --- #
# @router.get("/{property_id}/maintenance", ...)
# async def get_property_maintenance(...):
# ... rest of file ...

# --- Property Revenue Endpoint (Placeholder) --- #
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


# Financial Summary API Endpoints
@router.get("/{property_id}/financial-summary", response_model=Dict[str, Any])
async def get_property_financial_summary(
    property_id: uuid.UUID,
    period: str = Query("month", description="Time period - month, quarter, or year"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get financial summary for a property.
    
    Args:
        property_id: The property ID
        period: Time period (month, quarter, year)
        current_user: The current authenticated user
        
    Returns:
        Financial summary data
    """
    try:
        # Check if user has access to the property
        has_access = await property_service.check_property_access(property_id, current_user["id"])
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this property"
            )
        
        summary = await property_service.get_financial_summary(property_id, period)
        return summary
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error getting financial summary for property {property_id}: {str(e)}", exc_info=True)
        # Return a simplified empty response rather than a 500 error
        return {
            "period": period,
            "date_range": {"start_date": "", "end_date": ""},
            "summary": {"total_income": 0, "total_expenses": 0, "net_income": 0, "profit_margin": 0},
            "occupancy_rate": 0,
            "income_breakdown": [],
            "expense_breakdown": [],
            "trend_data": []
        }

# Property Tax Endpoints
@router.get("/{property_id}/taxes", response_model=List[Dict[str, Any]])
async def get_property_taxes(
    property_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get tax records for a property.
    
    Args:
        property_id: The property ID
        current_user: The current authenticated user
        
    Returns:
        List of tax records
    """
    # Check if user has access to the property
    if not await property_service.check_property_access(property_id, current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this property"
        )
    
    try:
        taxes = await property_service.get_property_taxes(property_id)
        return taxes
    except Exception as e:
        logger.error(f"Error getting taxes for property {property_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tax records: {str(e)}"
        )

@router.post("/{property_id}/taxes", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
async def create_property_tax(
    property_id: uuid.UUID,
    tax_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new tax record for a property.
    
    Args:
        property_id: The property ID
        tax_data: The tax record data
        current_user: The current authenticated user
        
    Returns:
        Created tax record
    """
    # Check if user has access to the property
    if not await property_service.check_property_access(property_id, current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this property"
        )
    
    try:
        tax_record = await property_service.create_property_tax(property_id, tax_data)
        return tax_record
    except Exception as e:
        logger.error(f"Error creating tax record for property {property_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tax record: {str(e)}"
        )

@router.put("/{property_id}/taxes/{tax_id}", response_model=Dict[str, Any])
async def update_property_tax(
    property_id: uuid.UUID,
    tax_id: uuid.UUID,
    tax_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a tax record.
    
    Args:
        property_id: The property ID
        tax_id: The tax record ID
        tax_data: The updated tax record data
        current_user: The current authenticated user
        
    Returns:
        Updated tax record
    """
    # Check if user has access to the property
    if not await property_service.check_property_access(property_id, current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this property"
        )
    
    try:
        tax_record = await property_service.update_property_tax(property_id, tax_id, tax_data)
        if not tax_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tax record not found"
            )
        return tax_record
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error updating tax record {tax_id} for property {property_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tax record: {str(e)}"
        )

@router.delete("/{property_id}/taxes/{tax_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property_tax(
    property_id: uuid.UUID,
    tax_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a tax record.
    
    Args:
        property_id: The property ID
        tax_id: The tax record ID
        current_user: The current authenticated user
    """
    # Check if user has access to the property
    if not await property_service.check_property_access(property_id, current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this property"
        )
    
    try:
        success = await property_service.delete_property_tax(property_id, tax_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tax record not found"
            )
        return None
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error deleting tax record {tax_id} for property {property_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tax record: {str(e)}"
        )

# Units Images API Endpoints
@units_router.get("/{unit_id}/images", response_model=List[str])
async def get_unit_images(
    unit_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get images for a unit.
    
    Args:
        unit_id: The unit ID
        current_user: The current authenticated user
        
    Returns:
        List of image URLs
    """
    try:
        # Check if unit exists and user has access
        property_id = await property_service.get_property_id_for_unit(unit_id)
        if not property_id or not await property_service.check_property_access(property_id, current_user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this unit"
            )
        
        image_urls = await property_service.get_unit_images(unit_id)
        return image_urls
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error getting images for unit {unit_id}: {str(e)}", exc_info=True)
        # Return an empty list instead of 500 error
        return []

@units_router.post("/{unit_id}/images", status_code=status.HTTP_201_CREATED)
async def add_unit_image(
    unit_id: uuid.UUID,
    image_url: str = Body(..., embed=True),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Add an image to a unit.
    
    Args:
        unit_id: The unit ID
        image_url: The image URL
        current_user: The current authenticated user
        
    Returns:
        Success message
    """
    try:
        # Check if unit exists and user has access
        property_id = await property_service.get_property_id_for_unit(unit_id)
        if not property_id or not await property_service.check_property_access(property_id, current_user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to modify this unit"
            )
        
        success = await property_service.add_unit_image(unit_id, image_url)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add image to unit"
            )
        
        return {"message": "Image added to unit successfully"}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error adding image to unit {unit_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while adding the image"
        )

@units_router.delete("/{unit_id}/images", status_code=status.HTTP_200_OK)
async def delete_unit_image(
    unit_id: uuid.UUID,
    image_url: str = Query(..., description="URL of the image to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete an image from a unit.
    
    Args:
        unit_id: The unit ID
        image_url: The image URL to delete
        current_user: The current authenticated user
        
    Returns:
        Success message
    """
    try:
        # Check if unit exists and user has access
        property_id = await property_service.get_property_id_for_unit(unit_id)
        if not property_id or not await property_service.check_property_access(property_id, current_user["id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to modify this unit"
            )
        
        success = await property_service.delete_unit_image(unit_id, image_url)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found for unit"
            )
        
        return {"message": "Image deleted from unit successfully"}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error deleting image from unit {unit_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting the image"
        )

# Phase 2: New endpoint for lease-centric property details
@router.get("/{property_id}/details", response_model=PropertyDetailResponse)
async def get_property_details_by_lease(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated),
):
    """
    Get comprehensive, lease-centric details for a specific property.
    This new endpoint provides a structured view of a property, its units,
    and their active leases with tenant information.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token")

    details = await property_service.fetch_property_details_by_lease(
        db_client=db_client,
        property_id=str(property_id),
        owner_id=user_id
    )

    if not details:
        raise HTTPException(status_code=404, detail="Property not found or you do not have access.")
    
    return details