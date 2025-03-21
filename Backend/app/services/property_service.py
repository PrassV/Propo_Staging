from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import uuid

from ..models.property import PropertyCreate, PropertyUpdate, Property
from ..db import properties as property_db

logger = logging.getLogger(__name__)

async def get_properties(user_id: str = None) -> List[Dict[str, Any]]:
    """Get all properties, optionally filtered by owner ID"""
    return await property_db.get_properties(user_id)

async def get_property(property_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific property by ID"""
    return await property_db.get_property_by_id(property_id)

async def create_property(property_data: PropertyCreate, owner_id: str) -> Optional[Dict[str, Any]]:
    """Create a new property"""
    try:
        # Prepare property data
        insert_data = property_data.dict()
        insert_data["id"] = str(uuid.uuid4())
        insert_data["owner_id"] = owner_id
        insert_data["created_at"] = datetime.utcnow().isoformat()
        insert_data["updated_at"] = insert_data["created_at"]
        
        return await property_db.create_property(insert_data)
    except Exception as e:
        logger.error(f"Error creating property: {str(e)}")
        return None

async def update_property(
    property_id: str,
    property_data: PropertyUpdate,
    owner_id: str
) -> Optional[Dict[str, Any]]:
    """Update a property"""
    try:
        # Get existing property
        existing_property = await property_db.get_property_by_id(property_id)
        if not existing_property:
            return None
            
        # Check ownership
        if existing_property.get("owner_id") != owner_id:
            logger.error(f"User {owner_id} does not own property {property_id}")
            return None
            
        # Prepare update data
        update_data = {
            k: v for k, v in property_data.dict(exclude_unset=True).items()
            if v is not None
        }
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        return await property_db.update_property(property_id, update_data)
    except Exception as e:
        logger.error(f"Error updating property: {str(e)}")
        return None

async def delete_property(property_id: str, owner_id: str) -> bool:
    """Delete a property"""
    try:
        # Get existing property
        existing_property = await property_db.get_property_by_id(property_id)
        if not existing_property:
            return False
            
        # Check ownership
        if existing_property.get("owner_id") != owner_id:
            logger.error(f"User {owner_id} does not own property {property_id}")
            return False
            
        return await property_db.delete_property(property_id)
    except Exception as e:
        logger.error(f"Error deleting property: {str(e)}")
        return False

async def upload_property_image(property_id: str, image_url: str, is_primary: bool = False) -> Optional[Dict[str, Any]]:
    """
    Upload a property image.
    
    Args:
        property_id: The property ID
        image_url: The image URL
        is_primary: Whether this is the primary image
        
    Returns:
        Updated property data or None if update failed
    """
    try:
        # Get existing property
        existing_property = await property_db.get_property_by_id(property_id)
        if not existing_property:
            logger.error(f"Property not found: {property_id}")
            return None
        
        # Get existing images or initialize empty list
        images = existing_property.get("images", []) or []
        
        # If this is a primary image, set all others to non-primary
        if is_primary:
            for image in images:
                image["is_primary"] = False
        
        # Add new image
        images.append({
            "url": image_url,
            "is_primary": is_primary,
            "uploaded_at": datetime.utcnow().isoformat()
        })
        
        # Update property with new images
        update_dict = {
            "images": images,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        return await property_db.update_property(property_id, update_dict)
    except Exception as e:
        logger.error(f"Error in upload_property_image service: {str(e)}")
        return None 