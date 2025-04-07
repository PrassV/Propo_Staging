from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import uuid
from supabase import Client # Import Client type

from ..models.property import PropertyCreate, PropertyUpdate, Property, PropertyDocument, PropertyDocumentCreate, UnitCreate, UnitDetails # Import new model
from ..db import properties as property_db
# Import other necessary services if needed for cross-service calls
# from . import tenant_service, maintenance_service # Example

logger = logging.getLogger(__name__)

async def get_properties(
    db_client: Client, # Add client parameter
    user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    sort_by: Optional[str] = 'created_at',
    sort_order: Optional[str] = 'desc',
    property_type: Optional[str] = None,
    city: Optional[str] = None,
    pincode: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get all properties with filters, sorting, and pagination."""
    # Pass the client to the db function
    return await property_db.get_properties(
        db_client=db_client, 
        user_id=user_id,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        property_type=property_type,
        city=city,
        pincode=pincode
    )

async def get_properties_count( # Add count function
    db_client: Client,
    user_id: Optional[str] = None,
    property_type: Optional[str] = None,
    city: Optional[str] = None,
    pincode: Optional[str] = None
) -> int:
    """Get the total count of properties matching filters."""
    return await property_db.get_properties_count(
        db_client=db_client,
        user_id=user_id,
        property_type=property_type,
        city=city,
        pincode=pincode
    )

async def get_property(db_client: Client, property_id: str) -> Optional[Dict[str, Any]]: # REMOVE headers parameter
    """Get a specific property by ID"""
    return await property_db.get_property_by_id(db_client, property_id) # REMOVE

async def create_property(db_client: Client, property_data: PropertyCreate, owner_id: str) -> Optional[Dict[str, Any]]: # REMOVE headers parameter
    """Create a new property by calling the DB layer (which now uses RPC)."""
    try:
        # Prepare data dictionary from Pydantic model
        insert_data = property_data.dict(exclude_unset=True) # Use exclude_unset
        # No need to add owner_id, id, timestamps here - RPC function handles them
        # insert_data["id"] = str(uuid.uuid4())
        # insert_data["owner_id"] = owner_id 
        # insert_data["created_at"] = datetime.utcnow().isoformat()
        # insert_data["updated_at"] = insert_data["created_at"]
        
        # Call the DB layer function (which calls RPC)
        return await property_db.create_property(db_client, insert_data) 
    except Exception as e:
        logger.error(f"Error in property_service.create_property: {str(e)}", exc_info=True) 
        return None

async def update_property(
    db_client: Client, # Add client parameter
    property_id: str,
    property_data: PropertyUpdate,
    owner_id: str
) -> Optional[Dict[str, Any]]:
    """Update a property"""
    try:
        # Get existing property using the authenticated client
        existing_property = await property_db.get_property_by_id(db_client, property_id)
        if not existing_property or existing_property.get("owner_id") != owner_id:
            logger.error(f"User {owner_id} cannot update property {property_id}")
            return None
            
        update_data = {
            k: v for k, v in property_data.dict(exclude_unset=True).items()
            if v is not None
        }
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        # Pass the client to the db function
        return await property_db.update_property(db_client, property_id, update_data) 
    except Exception as e:
        logger.error(f"Error updating property: {str(e)}", exc_info=True)
        return None

async def delete_property(db_client: Client, property_id: str, owner_id: str) -> bool: # REMOVE headers parameter
    """Delete a property"""
    try:
        # Check ownership before deleting (or rely on RLS DELETE policy)
        existing_property = await property_db.get_property_by_id(db_client, property_id)
        if not existing_property or existing_property.get("owner_id") != owner_id:
            logger.error(f"User {owner_id} cannot delete property {property_id}")
            return False
            
        # Pass the client to the db function
        return await property_db.delete_property(db_client, property_id) 
    except Exception as e:
        logger.error(f"Error deleting property: {str(e)}", exc_info=True)
        return False

# Note: upload_property_image might need adjustments depending on how image URLs
# are stored (e.g., directly in properties table array or a separate table)
# The current implementation assumes an 'images' JSON/ARRAY field in the properties table
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

# --- New Service Functions ---

async def get_units_for_property(db_client: Client, property_id: str, owner_id: str) -> List[str]: # Add client
    """Get distinct unit numbers for a specific property after verifying ownership."""
    # Ownership check might be redundant if RLS SELECT policy is effective
    existing_property = await property_db.get_property_by_id(db_client, property_id)
    if not existing_property or existing_property.get("owner_id") != owner_id:
        logger.warning(f"User {owner_id} unauthorized or property {property_id} not found for units lookup.")
        return [] 

    return await property_db.get_units_for_property(db_client, property_id) # Pass client

async def get_documents_for_property(db_client: Client, property_id: str, owner_id: str) -> List[Dict[str, Any]]: # Add client
    """Get documents for a specific property after verifying ownership."""
    existing_property = await property_db.get_property_by_id(db_client, property_id)
    if not existing_property or existing_property.get("owner_id") != owner_id:
         logger.warning(f"User {owner_id} unauthorized or property {property_id} not found for documents lookup.")
         return []

    return await property_db.get_documents_for_property(db_client, property_id) # Pass client

async def add_document_to_property(db_client: Client, property_id: str, document_data: PropertyDocumentCreate, owner_id: str) -> Optional[Dict[str, Any]]: # Add client & change doc data type
    """Add a document to a specific property after verifying ownership."""
    existing_property = await property_db.get_property_by_id(db_client, property_id)
    if not existing_property or existing_property.get("owner_id") != owner_id:
        logger.warning(f"User {owner_id} unauthorized or property {property_id} not found for adding document.")
        return None 

    # Prepare document data for DB insertion (assuming property_documents table)
    doc_insert_data = document_data.dict()
    doc_insert_data["id"] = str(uuid.uuid4())
    doc_insert_data["property_id"] = property_id
    doc_insert_data["uploaded_at"] = datetime.utcnow().isoformat()
    # Assuming 'document_type' and 'document_url' are fields in PropertyDocumentCreate

    return await property_db.add_document_to_property(db_client, doc_insert_data) # Pass client & prepared data


# Placeholder functions for related data - Implementation will likely call other services
async def get_tenants_for_property(db_client: Client, property_id: str, owner_id: str) -> List[Dict[str, Any]]: # Add client
    # 1. Check property ownership (use db_client)
    existing_property = await property_db.get_property_by_id(db_client, property_id)
    if not existing_property or existing_property.get("owner_id") != owner_id:
         logger.warning(f"User {owner_id} unauthorized or property {property_id} not found for tenants lookup.")
         return []
    # 2. Call tenant_service (which itself needs to accept db_client)
    logger.info(f"Placeholder: Fetching tenants for property {property_id} by user {owner_id}")
    # Example: return await tenant_service.get_tenants(db_client, property_id=property_id)
    return [] 

async def get_maintenance_for_property(db_client: Client, property_id: str, owner_id: str) -> List[Dict[str, Any]]: # Add client
    existing_property = await property_db.get_property_by_id(db_client, property_id)
    if not existing_property or existing_property.get("owner_id") != owner_id:
         logger.warning(f"User {owner_id} unauthorized or property {property_id} not found for maintenance lookup.")
         return []
    logger.info(f"Placeholder: Fetching maintenance for property {property_id} by user {owner_id}")
    # Example: return await maintenance_service.get_maintenance_requests(db_client, property_id=property_id)
    return [] 

async def get_payments_for_property(db_client: Client, property_id: str, owner_id: str) -> List[Dict[str, Any]]: # Add client
    existing_property = await property_db.get_property_by_id(db_client, property_id)
    if not existing_property or existing_property.get("owner_id") != owner_id:
         logger.warning(f"User {owner_id} unauthorized or property {property_id} not found for payments lookup.")
         return []
    logger.info(f"Placeholder: Fetching payments for property {property_id} by user {owner_id}")
    # Example: return await payment_service.get_payments(db_client, property_id=property_id)
    return [] 

async def get_revenue_for_property(db_client: Client, property_id: str, owner_id: str) -> Optional[Dict[str, Any]]: # Add client
    """Calculate revenue for a specific property after verifying ownership."""
    existing_property = await property_db.get_property_by_id(db_client, property_id)
    if not existing_property or existing_property.get("owner_id") != owner_id:
         logger.warning(f"User {owner_id} unauthorized or property {property_id} not found for revenue lookup.")
         return None # Return None if unauthorized or not found

    # --- Actual revenue calculation logic goes here --- 
    # Example: Fetch payments using db_client, sum them up, etc.
    logger.info(f"Placeholder: Calculating revenue for property {property_id} by user {owner_id}")
    # Replace with actual implementation
    return {"calculated_revenue": 0.00} # Placeholder response 

async def create_unit(db_client: Client, property_id: str, unit_data: UnitCreate, owner_id: str) -> Optional[UnitDetails]:
    """Create a new unit for a property after verifying ownership."""
    try:
        # 1. Verify property ownership
        existing_property = await property_db.get_property_by_id(db_client, property_id)
        if not existing_property or existing_property.get("owner_id") != owner_id:
            logger.warning(f"User {owner_id} unauthorized or property {property_id} not found for creating unit.")
            return None

        # 2. Prepare data for insertion
        insert_data = unit_data.dict(exclude_unset=True)
        insert_data["property_id"] = property_id
        # ID, created_at, updated_at are handled by DB defaults/triggers

        # 3. Call DB function to insert
        created_unit_dict = await property_db.create_unit(db_client, insert_data)

        if not created_unit_dict:
            logger.error(f"Failed to create unit in DB for property {property_id}")
            return None

        # 4. Return as Pydantic model (optional, but good practice)
        # Assuming UnitDetails model exists and matches the structure
        return UnitDetails(**created_unit_dict)

    except Exception as e:
        logger.error(f"Error in property_service.create_unit: {str(e)}", exc_info=True)
        return None 