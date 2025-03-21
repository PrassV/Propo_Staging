from typing import List, Dict, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Form, status
from ..models.property import Property, PropertyCreate, PropertyUpdate
from ..services import property_service
from ..config.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(
    prefix="/properties",
    tags=["properties"],
    responses={404: {"description": "Not found"}},
)

# Response model for property operations that need custom responses
class PropertyResponse(BaseModel):
    property: Dict[str, Any]
    message: str = "Success"

@router.get("/", response_model=List[Property])
async def get_properties(
    current_user: Dict = Depends(get_current_user)
):
    """Get all properties for the current user"""
    try:
        properties = await property_service.get_properties(current_user.get("id"))
        return properties
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{property_id}", response_model=Property)
async def get_property(
    property_id: str = Path(..., description="The property ID"),
    current_user: Dict = Depends(get_current_user)
):
    """Get a specific property by ID"""
    property_data = await property_service.get_property(property_id)
    if not property_data:
        raise HTTPException(status_code=404, detail="Property not found")
    return property_data

@router.post("/", response_model=Property)
async def create_property(
    property_data: PropertyCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new property"""
    try:
        created_property = await property_service.create_property(
            property_data, 
            owner_id=current_user.get("id")
        )
        return created_property
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{property_id}", response_model=Property)
async def update_property(
    property_data: PropertyUpdate,
    property_id: str = Path(..., description="The property ID"),
    current_user: Dict = Depends(get_current_user)
):
    """Update a property"""
    try:
        updated_property = await property_service.update_property(
            property_id,
            property_data,
            owner_id=current_user.get("id")
        )
        if not updated_property:
            raise HTTPException(status_code=404, detail="Property not found")
        return updated_property
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{property_id}")
async def delete_property(
    property_id: str = Path(..., description="The property ID"),
    current_user: Dict = Depends(get_current_user)
):
    """Delete a property"""
    try:
        success = await property_service.delete_property(
            property_id,
            owner_id=current_user.get("id")
        )
        if not success:
            raise HTTPException(status_code=404, detail="Property not found")
        return {"message": "Property deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{property_id}/images", response_model=PropertyResponse)
async def upload_property_image(
    property_id: str,
    image_url: str = Form(...),
    is_primary: bool = Form(False),
    current_user: Dict = Depends(get_current_user)
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
    existing_property = await property_service.get_property(property_id)
    
    if not existing_property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    if existing_property.get("owner_id") != current_user.get("id"):
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