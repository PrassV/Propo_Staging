from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timedelta
import uuid
from supabase import Client # Import Client type
from dateutil.relativedelta import relativedelta
from postgrest.exceptions import APIError # Import APIError
from fastapi import HTTPException, status

from ..models.property import PropertyCreate, PropertyUpdate, Property, PropertyDocument, PropertyDocumentCreate, UnitCreate, UnitDetails # Import new model
from ..db import properties as property_db
from ..config.settings import settings # Import settings for bucket name
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

async def get_property(db_client: Client, property_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific property by ID, generating signed URLs for images."""
    property_data = await property_db.get_property_by_id(db_client, property_id)

    if property_data:
        image_paths = property_data.get('image_urls') # Assuming DB returns paths in 'image_urls' field
        if image_paths and isinstance(image_paths, list):
            signed_urls = []
            bucket_name = settings.PROPERTY_IMAGE_BUCKET
            expires_in = 60 # Signed URL expiry time in seconds

            for path in image_paths:
                if not path or not isinstance(path, str):
                    logger.warning(f"Skipping invalid image path found for property {property_id}: {path}")
                    continue
                try:
                    # Remove leading slash if present, as Supabase paths are relative to bucket root
                    clean_path = path.lstrip('/') 
                    signed_url_data = db_client.storage.from_(bucket_name).create_signed_url(clean_path, expires_in)
                    # Check if 'signedURL' key exists and is not None
                    if signed_url_data and signed_url_data.get('signedURL'):
                        signed_urls.append(signed_url_data['signedURL'])
                    else:
                        logger.warning(f"Failed to generate signed URL for path: {path} in bucket {bucket_name}. Result: {signed_url_data}")
                except Exception as e:
                    # Catch potential errors like file not found from Supabase storage
                    logger.error(f"Error generating signed URL for path {path} in bucket {bucket_name}: {e}")
                    # Optionally append None or a placeholder, or just skip

            # Replace the original paths with the generated signed URLs
            property_data['image_urls'] = signed_urls
        else:
            # Ensure image_urls is at least an empty list if no paths were found or field is missing/invalid
            property_data['image_urls'] = [] 

    return property_data

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
    """Create a new unit for a property after verifying ownership.
    Raises HTTPException(409) if unit number already exists.
    Returns None if property not found or user not authorized.
    """
    try:
        # Verify property ownership first
        existing_property = await property_db.get_property_by_id(db_client, property_id)
        if not existing_property or existing_property.get("owner_id") != owner_id:
            logger.warning(f"User {owner_id} unauthorized or property {property_id} not found for creating unit.")
            return None # Indicate failure due to auth/not found

        # Prepare data for insertion
        insert_data = unit_data.dict()
        insert_data["id"] = str(uuid.uuid4())
        insert_data["property_id"] = property_id
        # Ensure correct types if needed, e.g., insert_data['bedrooms'] = int(insert_data['bedrooms'])

        # Call the database function to insert the unit
        try:
            created_unit_data = await property_db.create_unit(db_client, insert_data)
        except APIError as db_error:
            # Check if it's a unique constraint violation (code 23505)
            if db_error.code == '23505':
                logger.warning(f"Duplicate unit number conflict for property {property_id}. Unit data: {insert_data}")
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, 
                                    detail="A unit with this number already exists for this property.")
            else:
                # Re-raise other database errors
                logger.error(f"Database APIError creating unit for property {property_id}: {db_error}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                                    detail=f"Database error creating unit: {db_error.message}")
        except Exception as db_exc: # Catch other potential DB layer errors
            logger.error(f"Non-APIError in DB layer creating unit for property {property_id}: {db_exc}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                                    detail="An unexpected database error occurred while creating the unit.")

        if created_unit_data:
            return UnitDetails(**created_unit_data)
        else:
            # This case might indicate the DB function returned None without an exception
            logger.error(f"DB layer returned None without exception for unit creation, property {property_id}.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                                detail="Unit creation failed unexpectedly after database operation.")

    except HTTPException as http_exc: # Re-raise specific HTTP exceptions (like the 409)
        raise http_exc 
    except Exception as e:
        # Catch truly unexpected errors in the service logic itself
        logger.error(f"Unexpected error in create_unit service for property {property_id}: {e}", exc_info=True)
        # Raise a generic 500, as the endpoint handler will catch it.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                            detail="An unexpected error occurred in the unit creation service.")

# Check if a user has access to a property
async def check_property_access(property_id: uuid.UUID, user_id: str) -> bool:
    """
    Check if a user has access to a property.
    
    Args:
        property_id: The property ID
        user_id: The user ID
        
    Returns:
        True if the user has access, False otherwise
    """
    try:
        from ..config.database import supabase_client as db_client
        # Get the property owner
        property_owner = await property_db.get_property_owner(db_client, property_id)
        
        # Check if the user is the property owner
        return property_owner == user_id
    except Exception as e:
        logger.error(f"Error checking property access: {str(e)}")
        return False

# Financial Summary Functions
async def get_financial_summary(property_id: uuid.UUID, period: str = "month") -> Dict[str, Any]:
    """
    Get financial summary for a property for the specified period.
    
    Args:
        property_id: The property ID to get summary for
        period: The time period (month, quarter, year)
        
    Returns:
        Financial summary data including income, expenses, net, and various breakdowns
    """
    try:
        from ..config.database import supabase_client as db_client
        
        if period not in ["month", "quarter", "year"]:
            period = "month"  # Default to month if invalid period
        
        # Get the current date and determine date range based on period
        now = datetime.now()
        if period == "month":
            start_date = datetime(now.year, now.month, 1)
            # Calculate end of month
            if now.month == 12:
                end_date = datetime(now.year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = datetime(now.year, now.month + 1, 1) - timedelta(days=1)
        elif period == "quarter":
            # Determine current quarter
            quarter = (now.month - 1) // 3 + 1
            start_date = datetime(now.year, (quarter - 1) * 3 + 1, 1)
            if quarter == 4:
                end_date = datetime(now.year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = datetime(now.year, quarter * 3 + 1, 1) - timedelta(days=1)
        else:  # year
            start_date = datetime(now.year, 1, 1)
            end_date = datetime(now.year, 12, 31)
        
        # Query database for financial data
        # For income, query rent payments, other income sources
        income_data = await property_db.get_property_income(db_client, property_id, start_date, end_date)
        
        # For expenses, query maintenance costs, property taxes, insurance, etc.
        expense_data = await property_db.get_property_expenses(db_client, property_id, start_date, end_date)
        
        # Process data to create summary
        total_income = sum(item.get("amount", 0) for item in income_data)
        total_expenses = sum(item.get("amount", 0) for item in expense_data)
        net_income = total_income - total_expenses
        
        # Create income breakdown by category
        income_breakdown = []
        income_categories = {}
        for item in income_data:
            category = item.get("category", "Other")
            if category not in income_categories:
                income_categories[category] = 0
            income_categories[category] += item.get("amount", 0)
        
        for category, amount in income_categories.items():
            income_breakdown.append({
                "name": category,
                "value": amount,
                "percentage": round((amount / total_income) * 100, 2) if total_income > 0 else 0
            })
        
        # Create expense breakdown by category
        expense_breakdown = []
        expense_categories = {}
        for item in expense_data:
            category = item.get("category", "Other")
            if category not in expense_categories:
                expense_categories[category] = 0
            expense_categories[category] += item.get("amount", 0)
        
        for category, amount in expense_categories.items():
            expense_breakdown.append({
                "name": category,
                "value": amount,
                "percentage": round((amount / total_expenses) * 100, 2) if total_expenses > 0 else 0
            })
        
        # Get monthly trend data for the past 12 months
        trend_data = []
        for i in range(12, 0, -1):
            month_date = now - relativedelta(months=i)
            month_start = datetime(month_date.year, month_date.month, 1)
            if month_date.month == 12:
                month_end = datetime(month_date.year + 1, 1, 1) - timedelta(days=1)
            else:
                month_end = datetime(month_date.year, month_date.month + 1, 1) - timedelta(days=1)
            
            month_income = await property_db.get_property_income_total(db_client, property_id, month_start, month_end)
            month_expenses = await property_db.get_property_expenses_total(db_client, property_id, month_start, month_end)
            
            trend_data.append({
                "month": month_date.strftime("%b %Y"),
                "income": month_income,
                "expenses": month_expenses,
                "net": month_income - month_expenses
            })
        
        # Calculate financial indicators
        occupancy_rate = await property_db.get_property_occupancy_rate(db_client, property_id, start_date, end_date)
        
        # Return complete financial summary
        return {
            "period": period,
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "summary": {
                "total_income": total_income,
                "total_expenses": total_expenses,
                "net_income": net_income,
                "profit_margin": round((net_income / total_income) * 100, 2) if total_income > 0 else 0
            },
            "occupancy_rate": occupancy_rate,
            "income_breakdown": income_breakdown,
            "expense_breakdown": expense_breakdown,
            "trend_data": trend_data
        }
    except Exception as e:
        logger.error(f"Error getting financial summary for property {property_id}: {str(e)}", exc_info=True)
        # Return a simplified empty summary on error
        return {
            "period": period,
            "date_range": {"start_date": "", "end_date": ""},
            "summary": {"total_income": 0, "total_expenses": 0, "net_income": 0, "profit_margin": 0},
            "occupancy_rate": 0,
            "income_breakdown": [],
            "expense_breakdown": [],
            "trend_data": []
        }

# Property Tax Functions
async def get_property_taxes(property_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get tax records for a property.
    
    Args:
        property_id: The property ID
        
    Returns:
        List of tax records
    """
    try:
        from ..config.database import supabase_client as db_client
        return await property_db.get_property_taxes(db_client, property_id)
    except Exception as e:
        logger.error(f"Error getting taxes for property {property_id}: {str(e)}", exc_info=True)
        return []

async def create_property_tax(property_id: uuid.UUID, tax_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new tax record for a property.
    
    Args:
        property_id: The property ID
        tax_data: The tax record data
        
    Returns:
        Created tax record
    """
    try:
        from ..config.database import supabase_client as db_client
        
        # Add required fields to tax data
        tax_record = {
            "id": uuid.uuid4(),
            "property_id": property_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            **tax_data
        }
        
        return await property_db.create_property_tax(db_client, tax_record)
    except Exception as e:
        logger.error(f"Error creating tax record for property {property_id}: {str(e)}", exc_info=True)
        return None

async def update_property_tax(property_id: uuid.UUID, tax_id: uuid.UUID, tax_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a tax record.
    
    Args:
        property_id: The property ID
        tax_id: The tax record ID
        tax_data: The updated tax record data
        
    Returns:
        Updated tax record or None if not found
    """
    try:
        from ..config.database import supabase_client as db_client
        
        # Check if tax record exists and belongs to the property
        tax_record = await property_db.get_property_tax(db_client, tax_id)
        if not tax_record or str(tax_record.get("property_id")) != str(property_id):
            logger.error(f"Tax record {tax_id} not found or does not belong to property {property_id}")
            return None
        
        # Update tax record
        update_data = {
            "updated_at": datetime.utcnow().isoformat(),
            **tax_data
        }
        
        return await property_db.update_property_tax(db_client, tax_id, update_data)
    except Exception as e:
        logger.error(f"Error updating tax record {tax_id} for property {property_id}: {str(e)}", exc_info=True)
        return None

async def delete_property_tax(property_id: uuid.UUID, tax_id: uuid.UUID) -> bool:
    """
    Delete a tax record.
    
    Args:
        property_id: The property ID
        tax_id: The tax record ID
        
    Returns:
        True if deleted, False otherwise
    """
    try:
        from ..config.database import supabase_client as db_client
        
        # Check if tax record exists and belongs to the property
        tax_record = await property_db.get_property_tax(db_client, tax_id)
        if not tax_record or str(tax_record.get("property_id")) != str(property_id):
            logger.error(f"Tax record {tax_id} not found or does not belong to property {property_id}")
            return False
        
        return await property_db.delete_property_tax(db_client, tax_id)
    except Exception as e:
        logger.error(f"Error deleting tax record {tax_id} for property {property_id}: {str(e)}", exc_info=True)
        return False

# Unit Images Functions
async def get_property_id_for_unit(unit_id: uuid.UUID) -> Optional[uuid.UUID]:
    """
    Get the property ID that a unit belongs to.
    
    Args:
        unit_id: The unit ID
        
    Returns:
        Property ID or None if unit not found
    """
    try:
        from ..config.database import supabase_client as db_client
        unit = await property_db.get_unit(db_client, unit_id)
        if not unit:
            return None
        return uuid.UUID(unit.get("property_id")) if unit.get("property_id") else None
    except Exception as e:
        logger.error(f"Error getting property ID for unit {unit_id}: {str(e)}", exc_info=True)
        return None

async def get_unit_images(unit_id: uuid.UUID) -> List[str]:
    """
    Get images for a unit.
    
    Args:
        unit_id: The unit ID
        
    Returns:
        List of image URLs
    """
    try:
        from ..config.database import supabase_client as db_client
        images = await property_db.get_unit_images(db_client, unit_id)
        return [image.get("url") for image in images if image.get("url")]
    except Exception as e:
        logger.error(f"Error getting images for unit {unit_id}: {str(e)}", exc_info=True)
        return []

async def add_unit_image(unit_id: uuid.UUID, image_url: str) -> bool:
    """
    Add an image to a unit.
    
    Args:
        unit_id: The unit ID
        image_url: The image URL
        
    Returns:
        True if added, False otherwise
    """
    try:
        from ..config.database import supabase_client as db_client
        
        # Check if unit exists
        unit = await property_db.get_unit(db_client, unit_id)
        if not unit:
            logger.error(f"Unit {unit_id} not found when adding image")
            return False
        
        # Create image record
        image_record = {
            "id": uuid.uuid4(),
            "unit_id": unit_id,
            "url": image_url,
            "created_at": datetime.utcnow().isoformat()
        }
        
        return await property_db.add_unit_image(db_client, image_record)
    except Exception as e:
        logger.error(f"Error adding image to unit {unit_id}: {str(e)}", exc_info=True)
        return False

async def delete_unit_image(unit_id: uuid.UUID, image_url: str) -> bool:
    """
    Delete an image from a unit.
    
    Args:
        unit_id: The unit ID
        image_url: The image URL to delete
        
    Returns:
        True if deleted, False otherwise
    """
    try:
        from ..config.database import supabase_client as db_client
        return await property_db.delete_unit_image(db_client, unit_id, image_url)
    except Exception as e:
        logger.error(f"Error deleting image from unit {unit_id}: {str(e)}", exc_info=True)
        return False 