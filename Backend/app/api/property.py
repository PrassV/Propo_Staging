from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from ..models.property import Property, PropertyCreate, PropertyUpdate
from ..services import property_service
from ..config.auth import get_current_user

router = APIRouter(
    prefix="/properties",
    tags=["properties"],
    responses={404: {"description": "Not found"}},
)

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