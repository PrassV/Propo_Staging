from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File, Path, Query
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging

from ..models.property import PropertyCreate, PropertyUpdate, Property
from ..services import property_service
from ..config.auth import get_current_user

router = APIRouter(
    prefix="/properties",
    tags=["properties"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

# Mock data for quick testing
MOCK_PROPERTIES = [
    {
        "id": "1",
        "title": "Luxury Apartment in Downtown",
        "description": "Beautiful apartment with city views",
        "property_type": "apartment",
        "status": "available",
        "address": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zip_code": "94105",
        "country": "USA",
        "bedrooms": 2,
        "bathrooms": 2.0,
        "square_feet": 1200.0,
        "rent_amount": 3500.0,
        "deposit_amount": 3500.0,
        "owner_id": "user123",
        "created_at": "2023-01-01T00:00:00",
        "updated_at": "2023-01-01T00:00:00"
    },
    {
        "id": "2",
        "title": "Cozy Studio in Mission District",
        "description": "Renovated studio with modern amenities",
        "property_type": "apartment",
        "status": "available",
        "address": "456 Valencia St",
        "city": "San Francisco",
        "state": "CA",
        "zip_code": "94110",
        "country": "USA",
        "bedrooms": 0,
        "bathrooms": 1.0,
        "square_feet": 500.0,
        "rent_amount": 2200.0,
        "deposit_amount": 2200.0,
        "owner_id": "user123",
        "created_at": "2023-01-02T00:00:00",
        "updated_at": "2023-01-02T00:00:00"
    }
]

# Response models
class PropertyResponse(BaseModel):
    property: Dict[str, Any]
    message: str = "Success"

class PropertiesResponse(BaseModel):
    properties: List[Dict[str, Any]]
    count: int
    message: str = "Success"

@router.get("/", response_model=List[Dict[str, Any]])
async def get_properties(current_user = Depends(get_current_user)):
    """Get all properties for the current user (using mock data for now)"""
    try:
        logger.info(f"Returning mock properties for user")
        return MOCK_PROPERTIES
    except Exception as e:
        logger.error(f"Error getting properties: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve properties")

@router.get("/{property_id}", response_model=Dict[str, Any])
async def get_property(
    property_id: str = Path(..., description="The property ID"),
    current_user = Depends(get_current_user)
):
    """Get a specific property by ID (using mock data for now)"""
    try:
        # Find property in mock data
        for prop in MOCK_PROPERTIES:
            if prop["id"] == property_id:
                return prop
                
        raise HTTPException(status_code=404, detail="Property not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting property: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve property")

@router.post("/", response_model=Dict[str, Any])
async def create_property(
    property_data: PropertyCreate,
    current_user = Depends(get_current_user)
):
    """Create a new property"""
    try:
        # In a real app, we would call property_service here
        # Just return mock data for now
        return MOCK_PROPERTIES[0]
    except Exception as e:
        logger.error(f"Error creating property: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create property")

@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: str,
    property_data: PropertyUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a property.
    
    Args:
        property_id: The property ID to update
        property_data: The updated property data
        current_user: The current authenticated user
        
    Returns:
        JSON with updated property data
    """
    # Check if property exists and user is the owner
    existing_property = await property_service.get_property_by_id(property_id)
    
    if not existing_property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    if existing_property.get("owner_id") != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this property"
        )
    
    updated_property = await property_service.update_property(property_id, property_data)
    
    if not updated_property:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update property"
        )
    
    return {
        "property": updated_property,
        "message": "Property updated successfully"
    }

@router.delete("/{property_id}")
async def delete_property(
    property_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a property.
    
    Args:
        property_id: The property ID to delete
        current_user: The current authenticated user
        
    Returns:
        JSON with success message
    """
    # Check if property exists and user is the owner
    existing_property = await property_service.get_property_by_id(property_id)
    
    if not existing_property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    if existing_property.get("owner_id") != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this property"
        )
    
    success = await property_service.delete_property(property_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete property"
        )
    
    return {
        "message": "Property deleted successfully"
    }

@router.post("/{property_id}/images", response_model=PropertyResponse)
async def upload_property_image(
    property_id: str,
    image_url: str = Form(...),
    is_primary: bool = Form(False),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upload a property image.
    
    Args:
        property_id: The property ID
        image_url: The image URL
        is_primary: Whether this is the primary image
        current_user: The current authenticated user
        
    Returns:
        JSON with updated property data
    """
    # Check if property exists and user is the owner
    existing_property = await property_service.get_property_by_id(property_id)
    
    if not existing_property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    if existing_property.get("owner_id") != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload images for this property"
        )
    
    updated_property = await property_service.upload_property_image(property_id, image_url, is_primary)
    
    if not updated_property:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload property image"
        )
    
    return {
        "property": updated_property,
        "message": "Image uploaded successfully"
    } 