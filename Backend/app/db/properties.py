from typing import Dict, List, Any, Optional
import logging
import uuid
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from supabase import Client
import json
from ..models.property import PropertyCreate, PropertyUpdate, Property, PropertyDocument, PropertyDocumentCreate, UnitCreate # Import UnitCreate
from ..config.database import supabase_client # Import the global client
from ..config.cache import cache_result, invalidate_cache, cache_service

logger = logging.getLogger(__name__)

async def get_properties(
    db_client: Client,
    user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    sort_by: Optional[str] = 'created_at',
    sort_order: Optional[str] = 'desc',
    property_type: Optional[str] = None,
    city: Optional[str] = None,
    pincode: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get properties from Supabase with pagination, filtering, and sorting.
    Uses the provided authenticated client instance.
    """
    try:
        # Log the received user_id and its type
        logger.info(f"[db.get_properties] Received user_id: {user_id} (Type: {type(user_id)})")
        
        query = db_client.table('properties').select('*')
        
        if user_id:
            # Ensure user_id is a string before querying
            if not isinstance(user_id, str):
                 logger.error(f"[db.get_properties] Incorrect type for user_id: {type(user_id)}. Attempting to extract 'id'.")
                 # Attempt to gracefully handle if dict was passed, but log error
                 user_id_str = user_id.get("id") if isinstance(user_id, dict) else str(user_id)
                 if not isinstance(user_id_str, str):
                      logger.error("[db.get_properties] Could not extract valid string ID. Aborting query.")
                      return [] # Or raise error
                 user_id = user_id_str # Use the extracted string
            
            logger.info(f"[db.get_properties] Querying with owner_id: {user_id}")
            query = query.eq('owner_id', user_id)
            
        if property_type:
            query = query.eq('property_type', property_type)
        if city:
            query = query.ilike('city', f'%{city}%')
        if pincode:
            query = query.eq('pincode', pincode)
        
        if sort_by:
            is_desc = sort_order.lower() == 'desc'
            query = query.order(sort_by, desc=is_desc)
        
        query = query.range(skip, skip + limit - 1)
        
        logger.info(f"[db.get_properties] Executing query...") # Log before execution
        response = query.execute()
        logger.info(f"[db.get_properties] Query execution complete.") # Log after execution

        # --- Start Enhanced Response Logging --- 
        logger.info(f"[db.get_properties] Raw Response Type: {type(response)}") 
        logger.info(f"[db.get_properties] Raw Response __dict__: {getattr(response, '__dict__', 'N/A')}") # Log internal dict if available
        status_code = getattr(response, 'status_code', 'N/A')
        logger.info(f"[db.get_properties] Raw Response Status Code: {status_code}")
        has_error_attr = hasattr(response, 'error')
        logger.info(f"[db.get_properties] Has 'error' attribute: {has_error_attr}")
        if has_error_attr:
             error_obj = getattr(response, 'error')
             logger.info(f"[db.get_properties] Error object type: {type(error_obj)}")
             logger.info(f"[db.get_properties] Error object value: {error_obj}")
             if error_obj:
                  logger.info(f"[db.get_properties] Error object __dict__: {getattr(error_obj, '__dict__', 'N/A')}")
        has_data_attr = hasattr(response, 'data')
        logger.info(f"[db.get_properties] Has 'data' attribute: {has_data_attr}")
        if has_data_attr:
             data_obj = getattr(response, 'data')
             logger.info(f"[db.get_properties] Data object type: {type(data_obj)}")
             logger.info(f"[db.get_properties] Data object value (repr): {repr(data_obj)}") # Use repr for potentially large data
             if isinstance(data_obj, list):
                 logger.info(f"[db.get_properties] Data list length: {len(data_obj)}")
        has_count_attr = hasattr(response, 'count')
        logger.info(f"[db.get_properties] Has 'count' attribute: {has_count_attr}")
        if has_count_attr:
             logger.info(f"[db.get_properties] Count attribute value: {getattr(response, 'count')}")
        # --- End Enhanced Response Logging ---
        
        # Original checks remain
        if hasattr(response, 'error') and response.error:
            logger.error(f"[db.get_properties] Error identified in response (post-logging): {response.error.message}") # More specific log
            return []
        if not hasattr(response, 'data'):
             logger.error(f"[db.get_properties] No 'data' attribute in response object (post-logging).")
             return []
            
        # Original return
        logger.info(f"[db.get_properties] Returning data. Count: {len(response.data)}")
        return response.data or []
    except Exception as e:
        logger.error(f"[db.get_properties] Failed to get properties: {str(e)}", exc_info=True)
        return []

async def get_properties_count(
    db_client: Client,
    user_id: Optional[str] = None,
    property_type: Optional[str] = None,
    city: Optional[str] = None,
    pincode: Optional[str] = None
) -> int:
    """Get the count of properties matching filters."""
    try:
        query = db_client.table('properties').select('id', count='exact')
        if user_id:
            query = query.eq('owner_id', user_id)
        if property_type:
            query = query.eq('property_type', property_type)
        if city:
            query = query.ilike('city', f'%{city}%')
        if pincode:
            query = query.eq('pincode', pincode)

        # When using count='exact', execute() might return the response directly
        # instead of an awaitable. Removing await based on TypeError.
        response = query.execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"Error counting properties: {response.error.message}")
            return 0
        if not hasattr(response, 'count') or response.count is None:
             logger.error(f"Error counting properties: No count attribute in response")
             return 0
             
        return response.count
    except Exception as e:
        logger.error(f"Failed to count properties: {str(e)}", exc_info=True)
        return 0

@cache_result(ttl=300, key_prefix="property_by_id")  # Cache for 5 minutes
async def get_property_by_id(db_client: Client, property_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a property by ID from Supabase, including its related units.
    Uses the provided authenticated client instance.
    """
    try:
        # Select property columns and all columns from the related 'units' table
        response = db_client.table('properties')\
            .select('*, units:units(*, tenant:tenants!units_tenant_id_fkey(*))')\
            .eq('id', property_id)\
            .single()\
            .execute()
        
        if hasattr(response, 'error') and response.error:
             if response.error.code == 'PGRST116':
                 logger.info(f"Property {property_id} not found (single query).")
                 return None
             else:
                 logger.error(f"Error fetching property {property_id} with units: {response.error.message}")
                 return None
        
        if not hasattr(response, 'data'):
            logger.error(f"Error fetching property {property_id} with units: Response has no data attribute.")
            return None
            
        # Ensure 'units' key exists, defaulting to empty list if null/missing
        if 'units' not in response.data or response.data['units'] is None:
            response.data['units'] = []
            
        return response.data
    except Exception as e:
        logger.error(f"Failed to get property {property_id} with units: {str(e)}", exc_info=True)
        return None

# Phase 2: New DB function to get lease-centric property details
async def get_property_details(db_client: Client, property_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a property and its full lease-centric details by calling the
    get_property_lease_details RPC function.
    """
    try:
        rpc_params = {'p_property_id': property_id}
        response = db_client.rpc('get_property_lease_details', rpc_params).execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"Error calling RPC for property details {property_id}: {response.error.message}")
            return None
        
        if not hasattr(response, 'data') or not response.data:
            logger.warning(f"No data returned from RPC for property details {property_id}.")
            return None
            
        return response.data
    except Exception as e:
        logger.error(f"Failed to get property details for {property_id}: {str(e)}", exc_info=True)
        return None

async def get_property_owner_for_unit(db_client: Client, unit_id: uuid.UUID) -> Optional[str]:
    """
    Given a unit_id, finds the owner_id of the parent property.
    """
    try:
        # This RPC call is simpler than a multi-level join in Python client code.
        response = db_client.rpc('get_owner_for_unit', {'p_unit_id': str(unit_id)}).execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"Error calling RPC for unit owner {unit_id}: {response.error.message}")
            return None
        
        # The RPC is expected to return the owner_id directly or null.
        if not hasattr(response, 'data') or not response.data:
            return None
            
        return response.data
    except Exception as e:
        logger.error(f"Failed to get property owner for unit {unit_id}: {str(e)}", exc_info=True)
        return None

@invalidate_cache("property_*")  # Invalidate all property caches
async def create_property(db_client: Client, property_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new property in Supabase by calling the 'create_my_property' RPC function.
    Uses the provided authenticated client instance.
    """
    try:
        # Prepare the data, excluding server-set fields
        rpc_data = property_data.copy()
        rpc_data.pop('id', None)
        rpc_data.pop('owner_id', None)
        rpc_data.pop('created_at', None)
        rpc_data.pop('updated_at', None)
        
        # Call the RPC function with the correct parameter name
        # Note: rpc() returns a builder, only execute() should be awaited
        rpc_query = db_client.rpc(
            'create_my_property',
            {'propert_data_arg': rpc_data}
        )
        response = rpc_query.execute() # Execute the query first (Removed await)
        
        # --- Detailed Response Logging (Now correctly placed) --- 
        logger.info(f"[DEBUG] RPC Call Successful. Response Type: {type(response)}") 
        logger.info(f"[DEBUG] RPC Response Attributes: {dir(response)}") 
        if hasattr(response, 'data'): 
            logger.info(f"[DEBUG] RPC Response Data Type: {type(response.data)}") 
            logger.info(f"[DEBUG] RPC Response Data Value: {repr(response.data)}") # Use repr for more detail
        else: 
            logger.info("[DEBUG] RPC Response has no 'data' attribute.") 
        if hasattr(response, 'error') and response.error:
            # Log error even if execute() didn't raise exception (e.g., DB-level error)
            logger.warning(f"[DEBUG] RPC Response Error attribute present: {response.error}")
        # --- End Detailed Response Logging ---

        # Check for Supabase-level error *after* logging
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error calling RPC create_my_property: {response.error.message} (Code: {response.error.code}, Details: {response.error.details})") 
            return None
        
        # Check for data *after* logging
        if not hasattr(response, 'data') or not response.data:
             logger.error(f"RPC create_my_property returned no data (Post-logging check)")
             # Log the raw response again if data is missing unexpectedly
             logger.error(f"[DEBUG] Raw response object when data missing: {response}")
             return None
             
        # Access data *after* logging and checks
        logger.info("[DEBUG] Returning response.data directly (it's a dict)")
        return response.data # Data is the dictionary itself

    except Exception as e:
        # This block catches errors during the 'await rpc_query.execute()' call OR data processing
        logger.error(f"Exception during/after RPC execute() call: {str(e)}", exc_info=True)
        return None

@invalidate_cache("property_*")  # Invalidate all property caches
async def update_property(db_client: Client, property_id: str, property_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a property in Supabase.
    Uses the provided authenticated client instance.
    """
    try:
        # NOTE: This still uses direct table access and relies on RLS UPDATE policy
        response = await db_client.table('properties').update(property_data).eq('id', property_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error updating property DB: {response.error.message}")
            return None
        if not hasattr(response, 'data'):
             logger.error(f"Error updating property: No data attribute in response")
             return None
             
        return response.data[0] if response.data else None 
    except Exception as e:
        logger.error(f"Failed to update property {property_id}: {str(e)}", exc_info=True)
        return None

async def delete_property(db_client: Client, property_id: str) -> bool:
    """
    Delete a property from Supabase.
    Uses the provided authenticated client instance.
    """
    try:
        # NOTE: This still uses direct table access and relies on RLS DELETE policy
        response = await db_client.table('properties').delete().eq('id', property_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error deleting property DB: {response.error.message}")
            return False
            
        if hasattr(response, 'data') and response.data:
            return True
        else:
            logger.warning(f"Delete operation for property {property_id} did not return data. May not have existed or RLS prevented.")
            return False 
            
    except Exception as e:
        logger.error(f"Failed to delete property {property_id}: {str(e)}", exc_info=True)
        return False

# --- Update New Functions ---

async def get_units_for_property(db_client: Client, property_id: str) -> List[Dict[str, Any]]:
    """Get a list of all units (full details) associated with this property."""
    try:
        # Remove await from execute() based on TypeError
        response = db_client.table('units')\
                          .select('*, tenants(*)')\
                          .eq('property_id', property_id)\
                          .execute()
        if response.data:
            return response.data # Returns list of dictionaries
        else:
            logger.warning(f"[db.get_units_for_property] No units found for property {property_id}")
            return []
    except Exception as e:
        logger.error(f"[db.get_units_for_property] Failed: {e}", exc_info=True)
        return []

async def get_documents_for_property(db_client: Client, property_id: str) -> List[Dict[str, Any]]:
    """Get documents associated with a property."""
    try:
        response = await db_client.table('property_documents').select('*').eq('property_id', property_id).order('uploaded_at', ascending=False).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching documents for property {property_id}: {response.error.message}")
            return []
        if not hasattr(response, 'data'):
             logger.error(f"Error fetching documents: No data attribute in response")
             return []
             
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get documents for property {property_id}: {str(e)}", exc_info=True)
        return []

async def add_document_to_property(db_client: Client, document_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Add a document record to the property_documents table."""
    try:
        response = await db_client.table('property_documents').insert(document_data).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error adding document DB: {response.error.message}")
            return None
        if not hasattr(response, 'data'):
             logger.error(f"Error adding document: No data attribute in response")
             return None
             
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to add document: {str(e)}", exc_info=True)
        return None 

async def get_property_owner(db_client: Client, property_id: str) -> Optional[str]:
    """Get the owner_id for a specific property."""
    try:
        # Ensure property_id is a string
        if isinstance(property_id, uuid.UUID):
            property_id = str(property_id)
            
        logger.info(f"Fetching owner for property ID: {property_id}")
        
        # First run a diagnostic query to check if properties table is accessible
        diag_response = db_client.table('properties').select('id').limit(5).execute()
        if diag_response and hasattr(diag_response, 'data'):
            logger.info(f"Diagnostic: Properties table is accessible, found {len(diag_response.data)} properties")
            if diag_response.data:
                property_ids = [p.get('id') for p in diag_response.data]
                logger.info(f"Sample property IDs: {property_ids}")
        else:
            logger.warning("Diagnostic: Cannot access properties table")
        
        # Try a more direct query approach
        response = db_client.table('properties').select('owner_id').filter('id', 'eq', property_id).execute()
        
        # Guard against None response
        if response is None:
            logger.warning(f"Null response when fetching owner for property {property_id}, trying raw SQL...")
            # Try with raw SQL as fallback
            sql_response = db_client.rpc(
                'get_property_owner_by_id', 
                {'property_id_param': property_id}
            ).execute()
            
            if sql_response is None:
                logger.error("SQL fallback also returned null response")
                return None
            
            if hasattr(sql_response, 'data') and sql_response.data:
                logger.info(f"Found owner via SQL: {sql_response.data}")
                return sql_response.data
            
            logger.error("SQL fallback found no data")
            return None
            
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching owner for property {property_id}: {response.error.message}")
            return None
        
        if hasattr(response, 'data') and response.data:
            if len(response.data) > 0:
                logger.info(f"Found owner {response.data[0].get('owner_id')} for property {property_id}")
                return response.data[0].get('owner_id')
            else:
                logger.warning(f"Property {property_id} not found when fetching owner (empty data array).")
                return None
        else:
            logger.warning(f"Property {property_id} not found when fetching owner (no data attribute).")
            return None
            
    except Exception as e:
        logger.error(f"Failed to get owner for property {property_id}: {str(e)}", exc_info=True)
        return None

async def create_unit(db_client: Client, unit_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Insert a new unit record into the public.units table."""
    try:
        logger.info(f"[db.create_unit] Attempting to insert unit: {unit_data}")
        response = db_client.table('units').insert(unit_data).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"[db.create_unit] Error inserting unit: {response.error.message}")
            return None
        if not hasattr(response, 'data') or not response.data:
            logger.error(f"[db.create_unit] Insert unit returned no data.")
            return None
            
        logger.info(f"[db.create_unit] Successfully inserted unit: {response.data[0]}")
        return response.data[0]
    except Exception as e:
        logger.error(f"[db.create_unit] Exception inserting unit: {str(e)}", exc_info=True)
        return None

# Property Tax Functions
async def get_property_taxes(db_client: Client, property_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get tax records for a property.
    
    Args:
        db_client: Supabase client
        property_id: The property ID
        
    Returns:
        List of tax records
    """
    try:
        response = db_client.table('property_taxes').select('*').eq('property_id', str(property_id)).order('due_date', desc=True).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error getting taxes for property {property_id}: {response.error.message}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Error getting taxes for property {property_id}: {str(e)}")
        return []

async def get_property_tax(db_client: Client, tax_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get a specific tax record.
    
    Args:
        db_client: Supabase client
        tax_id: The tax record ID
        
    Returns:
        Tax record or None if not found
    """
    try:
        response = db_client.table('property_taxes').select('*').eq('id', str(tax_id)).maybe_single().execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error getting tax record {tax_id}: {response.error.message}")
            return None
        
        return response.data or None
    except Exception as e:
        logger.error(f"Error getting tax record {tax_id}: {str(e)}")
        return None

async def create_property_tax(db_client: Client, tax_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new tax record.
    
    Args:
        db_client: Supabase client
        tax_data: Tax record data
        
    Returns:
        Created tax record
    """
    try:
        # Convert UUIDs to strings
        data = {k: str(v) if isinstance(v, uuid.UUID) else v for k, v in tax_data.items()}
        
        response = db_client.table('property_taxes').insert(data).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error creating tax record: {response.error.message}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error creating tax record: {str(e)}")
        return None

async def update_property_tax(db_client: Client, tax_id: uuid.UUID, tax_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a tax record.
    
    Args:
        db_client: Supabase client
        tax_id: The tax record ID
        tax_data: The updated tax record data
        
    Returns:
        Updated tax record or None if not found
    """
    try:
        # Convert UUIDs to strings
        data = {k: str(v) if isinstance(v, uuid.UUID) else v for k, v in tax_data.items()}
        
        response = db_client.table('property_taxes').update(data).eq('id', str(tax_id)).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error updating tax record {tax_id}: {response.error.message}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error updating tax record {tax_id}: {str(e)}")
        return None

async def delete_property_tax(db_client: Client, tax_id: uuid.UUID) -> bool:
    """
    Delete a tax record.
    
    Args:
        db_client: Supabase client
        tax_id: The tax record ID
        
    Returns:
        True if deleted, False otherwise
    """
    try:
        response = db_client.table('property_taxes').delete().eq('id', str(tax_id)).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error deleting tax record {tax_id}: {response.error.message}")
            return False
        
        return True if response.data else False
    except Exception as e:
        logger.error(f"Error deleting tax record {tax_id}: {str(e)}")
        return False

# Unit Images Functions
async def get_unit_images(db_client: Client, unit_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get images for a unit.
    
    Args:
        db_client: Supabase client
        unit_id: The unit ID
        
    Returns:
        List of image records
    """
    try:
        response = db_client.table('unit_images').select('*').eq('unit_id', str(unit_id)).order('created_at', desc=True).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error getting images for unit {unit_id}: {response.error.message}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Error getting images for unit {unit_id}: {str(e)}")
        return []

async def add_unit_image(db_client: Client, image_data: Dict[str, Any]) -> bool:
    """
    Add an image to a unit.
    
    Args:
        db_client: Supabase client
        image_data: Image record data
        
    Returns:
        True if added, False otherwise
    """
    try:
        # Convert UUIDs to strings
        data = {k: str(v) if isinstance(v, uuid.UUID) else v for k, v in image_data.items()}
        
        response = db_client.table('unit_images').insert(data).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error adding image to unit {image_data.get('unit_id')}: {response.error.message}")
            return False
        
        return True if response.data else False
    except Exception as e:
        logger.error(f"Error adding image to unit {image_data.get('unit_id')}: {str(e)}")
        return False

async def delete_unit_image(db_client: Client, unit_id: uuid.UUID, image_url: str) -> bool:
    """
    Delete an image from a unit.
    
    Args:
        db_client: Supabase client
        unit_id: The unit ID
        image_url: The image URL to delete
        
    Returns:
        True if deleted, False otherwise
    """
    try:
        response = db_client.table('unit_images').delete().eq('unit_id', str(unit_id)).eq('url', image_url).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error deleting image from unit {unit_id}: {response.error.message}")
            return False
        
        return True if response.data else False
    except Exception as e:
        logger.error(f"Error deleting image from unit {unit_id}: {str(e)}")
        return False

# Financial Summary Functions
async def get_property_income(db_client: Client, property_id: uuid.UUID, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
    """
    Get income data for a property within a date range.
    
    Args:
        db_client: Supabase client
        property_id: The property ID
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        List of income records
    """
    try:
        response = db_client.table('payments')\
            .select('id, amount, payment_date, description')\
            .eq('property_id', str(property_id))\
            .gte('payment_date', start_date.isoformat())\
            .lte('payment_date', end_date.isoformat())\
            .eq('status', 'completed')\
            .eq('type', 'income')\
            .order('payment_date', desc=True)\
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error getting income for property {property_id}: {response.error.message}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Error getting income for property {property_id}: {str(e)}")
        return []

async def get_property_expenses(db_client: Client, property_id: uuid.UUID, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
    """
    Get expense data for a property within a date range.
    
    Args:
        db_client: Supabase client
        property_id: The property ID
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        List of expense records
    """
    try:
        response = db_client.table('payments')\
            .select('id, amount, payment_date, description')\
            .eq('property_id', str(property_id))\
            .gte('payment_date', start_date.isoformat())\
            .lte('payment_date', end_date.isoformat())\
            .eq('status', 'completed')\
            .eq('type', 'expense')\
            .order('payment_date', desc=True)\
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error getting expenses for property {property_id}: {response.error.message}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Error getting expenses for property {property_id}: {str(e)}")
        return []

async def get_property_income_total(db_client: Client, property_id: uuid.UUID, start_date: datetime, end_date: datetime) -> float:
    """
    Get total income for a property within a date range.
    
    Args:
        db_client: Supabase client
        property_id: The property ID
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        Total income amount
    """
    try:
        # Using SQL function for sum calculation
        response = db_client.rpc(
            'get_property_income_total',
            {
                'p_property_id': str(property_id),
                'p_start_date': start_date.isoformat(),
                'p_end_date': end_date.isoformat()
            }
        ).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error getting income total for property {property_id}: {response.error.message}")
            return 0.0
        
        # Fallback to manual calculation if RPC fails
        if not response.data:
            income_data = await get_property_income(db_client, property_id, start_date, end_date)
            return sum(item.get('amount', 0) for item in income_data)
        
        return float(response.data) if response.data else 0.0
    except Exception as e:
        logger.error(f"Error getting income total for property {property_id}: {str(e)}")
        return 0.0

async def get_property_expenses_total(db_client: Client, property_id: uuid.UUID, start_date: datetime, end_date: datetime) -> float:
    """
    Get total expenses for a property within a date range.
    
    Args:
        db_client: Supabase client
        property_id: The property ID
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        Total expense amount
    """
    try:
        # Using SQL function for sum calculation
        response = db_client.rpc(
            'get_property_expenses_total',
            {
                'p_property_id': str(property_id),
                'p_start_date': start_date.isoformat(),
                'p_end_date': end_date.isoformat()
            }
        ).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error getting expense total for property {property_id}: {response.error.message}")
            return 0.0
        
        # Fallback to manual calculation if RPC fails
        if not response.data:
            expense_data = await get_property_expenses(db_client, property_id, start_date, end_date)
            return sum(item.get('amount', 0) for item in expense_data)
        
        return float(response.data) if response.data else 0.0
    except Exception as e:
        logger.error(f"Error getting expense total for property {property_id}: {str(e)}")
        return 0.0

async def get_property_occupancy_rate(db_client: Client, property_id: uuid.UUID, start_date: datetime, end_date: datetime) -> float:
    """
    Calculate occupancy rate for a property within a date range.
    
    Args:
        db_client: Supabase client
        property_id: The property ID
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        Occupancy rate percentage (0-100)
    """
    try:
        # Get total units for property
        total_units_response = db_client.table('units')\
            .select('id', count='exact')\
            .eq('property_id', str(property_id))\
            .execute()
        
        if hasattr(total_units_response, 'error') and total_units_response.error:
            logger.error(f"Error getting total units for property {property_id}: {total_units_response.error.message}")
            return 0.0
        
        total_units = total_units_response.count or 0
        
        if total_units == 0:
            return 0.0  # No units, so occupancy rate is 0%
        
        # Get occupied units in the date range - use simpler approach
        # First, get units with null end_date
        null_end_date_query = db_client.table('property_tenant_link')\
            .select('unit_id')\
            .eq('property_id', str(property_id))\
            .lte('start_date', end_date.isoformat())\
            .is_('end_date', 'null')\
            .execute()
            
        # Then get units with end_date >= start_date
        valid_end_date_query = db_client.table('property_tenant_link')\
            .select('unit_id')\
            .eq('property_id', str(property_id))\
            .lte('start_date', end_date.isoformat())\
            .gte('end_date', start_date.isoformat())\
            .execute()
            
        # Handle any errors
        if (hasattr(null_end_date_query, 'error') and null_end_date_query.error) or \
           (hasattr(valid_end_date_query, 'error') and valid_end_date_query.error):
            logger.error("Error getting occupied units for property")
            return 0.0
            
        # Combine results and count unique unit_ids
        null_end_units = null_end_date_query.data or []
        valid_end_units = valid_end_date_query.data or []
        all_units = null_end_units + valid_end_units
        
        # Use set to get unique unit IDs
        unique_unit_ids = set(unit['unit_id'] for unit in all_units if 'unit_id' in unit)
        occupied_units = len(unique_unit_ids)
        
        # Calculate occupancy rate
        occupancy_rate = (occupied_units / total_units) * 100
        return round(occupancy_rate, 2)
    except Exception as e:
        logger.error(f"Error calculating occupancy rate for property {property_id}: {str(e)}")
        return 0.0

# --- DB Functions for Unit Listing --- #

async def get_filtered_units_db(
    db_client: Client,
    owner_id: str,
    property_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Fetch units from DB, joining with properties to filter by owner_id."""
    try:
        # Start query on units table, select all unit columns
        query = db_client.table('units').select('*, properties!inner(owner_id)')
        
        # Filter by property owner by joining properties table
        query = query.eq('properties.owner_id', owner_id)
        
        # Apply optional filters
        if property_id:
            query = query.eq('property_id', property_id)
        if status:
            query = query.eq('status', status)
            
        # Apply pagination
        query = query.range(skip, skip + limit - 1)
        
        response = query.execute()
        
        if response.data:
            # The join adds the nested properties structure, remove it for clean unit data
            for unit in response.data:
                unit.pop('properties', None) 
            return response.data
        else:
            logger.info(f"[db.get_filtered_units_db] No units found matching criteria for owner {owner_id}")
            return []
    except Exception as e:
        logger.error(f"[db.get_filtered_units_db] Failed: {e}", exc_info=True)
        return []

async def get_filtered_units_count_db(
    db_client: Client,
    owner_id: str,
    property_id: Optional[str] = None,
    status: Optional[str] = None
) -> int:
    """Count units matching filters and owner_id."""
    try:
        # Select with count, joining properties for owner filter
        query = db_client.table('units')\
                       .select('id', count='exact', head=True)\
                       .join('properties', 'properties.id=units.property_id', join_type='inner') # Use explicit join
                       
        # Filter by property owner
        query = query.eq('properties.owner_id', owner_id)

        # Apply optional filters
        if property_id:
            query = query.eq('property_id', property_id)
        if status:
            query = query.eq('status', status)
            
        response = query.execute()
        
        # Check response structure - count is usually directly on response for head=True
        if hasattr(response, 'count') and response.count is not None:
            return response.count
        elif hasattr(response, 'error') and response.error:
            logger.error(f"[db.get_filtered_units_count_db] Error counting: {response.error.message}")
            return 0
        else:
            logger.warning(f"[db.get_filtered_units_count_db] Count not found in response for owner {owner_id}. Response: {response}")
            return 0 # Should ideally not happen if query is correct
    except Exception as e:
        logger.error(f"[db.get_filtered_units_count_db] Failed: {e}", exc_info=True)
        return 0

# --- DB Functions for Specific Unit --- #

async def get_unit_by_id_db(
    db_client: Client,
    unit_id: str
) -> Optional[Dict[str, Any]]:
    """Fetch a single unit by its ID."""
    try:
        response = db_client.table('units')\
                          .select('*, tenants(*)')\
                          .eq('id', unit_id)\
                          .maybe_single()\
                          .execute()
                          
        if response.data:
            return response.data
        elif hasattr(response, 'error') and response.error:
            logger.error(f"[db.get_unit_by_id_db] Error fetching unit {unit_id}: {response.error.message}")
            return None
        else:
            logger.warning(f"[db.get_unit_by_id_db] Unit {unit_id} not found.")
            return None
    except Exception as e:
        logger.error(f"[db.get_unit_by_id_db] Failed: {e}", exc_info=True)
        return None

async def delete_unit_db(
    db_client: Client,
    unit_id: str
) -> bool:
    """Deletes a unit from the database."""
    try:
        response = await db_client.table('units').delete().eq('id', unit_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"[db.delete_unit_db] Error deleting unit {unit_id}: {response.error.message}")
            return False
            
        if not response.data:
            logger.warning(f"[db.delete_unit_db] Unit {unit_id} not found or already deleted.")
            return False # Or True depending on desired behavior for not-found cases
            
        return True
    except Exception as e:
        logger.error(f"[db.delete_unit_db] Failed to delete unit {unit_id}: {e}", exc_info=True)
        return False

async def update_unit_db(
    db_client: Client,
    unit_id: str,
    unit_data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Update a specific unit by its ID. Returns the updated unit data if successful."""
    try:
        logger.info(f"[db.update_unit_db] Updating unit {unit_id} with data: {unit_data}")
        response = db_client.table('units')\
                          .update(unit_data)\
                          .eq('id', unit_id)\
                          .execute()
                          
        if hasattr(response, 'error') and response.error:
            logger.error(f"[db.update_unit_db] Error updating unit {unit_id}: {response.error.message}")
            return None
        
        if not hasattr(response, 'data') or not response.data:
            logger.error(f"[db.update_unit_db] Update for unit {unit_id} returned no data.")
            return None
            
        logger.info(f"[db.update_unit_db] Unit {unit_id} updated successfully")
        return response.data[0]
    except Exception as e:
        logger.error(f"[db.update_unit_db] Failed to update unit {unit_id}: {e}", exc_info=True)
        return None

async def get_parent_property_id_for_unit(unit_id: uuid.UUID) -> Optional[uuid.UUID]:
    """
    Finds the parent property ID for a given unit ID.

    Args:
        unit_id: The UUID of the unit.

    Returns:
        The UUID of the parent property, or None if not found or error.
    """
    try:
        # Use the imported global client (synchronous execute)
        response = supabase_client.table('units')\
            .select('property_id')\
            .eq('id', str(unit_id))\
            .maybe_single()\
            .execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching parent property for unit {unit_id}: {response.error.message}")
            return None

        if not hasattr(response, 'data') or not response.data or not response.data.get('property_id'):
            logger.warning(f"Could not find parent property_id for unit {unit_id}.")
            return None

        return uuid.UUID(response.data['property_id'])
    except Exception as e:
        logger.exception(f"Exception getting parent property ID for unit {unit_id}: {e}")
        return None

# --- Unit Amenity DB Functions --- #

async def db_get_amenities_for_unit(db_client: Client, unit_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get all amenities associated with a specific unit.
    """
    try:
        response = await db_client.table('unit_amenities')\
            .select('*')\
            .eq('unit_id', str(unit_id))\
            .order('created_at', desc=False)\
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error getting amenities for unit {unit_id}: {response.error.message}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.exception(f"Error getting amenities for unit {unit_id}: {e}")
        return []

async def db_create_amenity_for_unit(db_client: Client, amenity_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new amenity record linked to a unit.
    Assumes amenity_data contains 'unit_id', 'name', etc.
    """
    try:
        response = await db_client.table('unit_amenities').insert(amenity_data).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error creating amenity: {response.error.message}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.exception(f"Error creating amenity: {e}")
        return None

async def db_get_amenity_by_id(db_client: Client, amenity_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get a specific amenity by its ID.
    """
    try:
        response = await db_client.table('unit_amenities')\
            .select('*')\
            .eq('id', str(amenity_id))\
            .maybe_single()\
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching amenity {amenity_id}: {response.error.message}")
            return None
        
        return response.data or None
    except Exception as e:
        logger.exception(f"Error fetching amenity {amenity_id}: {e}")
        return None

async def db_update_amenity(db_client: Client, amenity_id: uuid.UUID, amenity_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update an existing amenity record.
    """
    try:
        response = await db_client.table('unit_amenities')\
            .update(amenity_data)\
            .eq('id', str(amenity_id))\
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error updating amenity {amenity_id}: {response.error.message}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.exception(f"Error updating amenity {amenity_id}: {e}")
        return None

async def db_delete_amenity(db_client: Client, amenity_id: uuid.UUID) -> bool:
    """
    Delete an amenity record.
    """
    try:
        response = await db_client.table('unit_amenities')\
            .delete()\
            .eq('id', str(amenity_id))\
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error deleting amenity {amenity_id}: {response.error.message}")
            return False
        
        # Delete returns empty list on success, check if data is present (means error/unexpected)
        return not response.data
    except Exception as e:
        logger.exception(f"Error deleting amenity {amenity_id}: {e}")
        return False

# --- End Unit Amenity DB Functions --- #

# --- Unit Tax DB Functions --- #

async def db_get_taxes_for_unit(db_client: Client, unit_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get all tax records associated with a specific unit.
    """
    try:
        response = await db_client.table('unit_taxes') \
            .select('*') \
            .eq('unit_id', str(unit_id)) \
            .order('year', desc=True).order('created_at', desc=True) \
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error getting taxes for unit {unit_id}: {response.error.message}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.exception(f"Error getting taxes for unit {unit_id}: {e}")
        return []

async def db_create_unit_tax(db_client: Client, tax_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new tax record linked to a unit.
    Assumes tax_data contains 'unit_id', 'tax_type', 'amount', 'year' etc.
    """
    try:
        response = await db_client.table('unit_taxes').insert(tax_data).execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"Error creating unit tax: {response.error.message}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.exception(f"Error creating unit tax: {e}")
        return None

async def db_get_unit_tax_by_id(db_client: Client, tax_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get a specific unit tax record by its ID.
    """
    try:
        response = await db_client.table('unit_taxes') \
            .select('*') \
            .eq('id', str(tax_id)) \
            .maybe_single() \
            .execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching unit tax {tax_id}: {response.error.message}")
            return None
        
        return response.data or None
    except Exception as e:
        logger.exception(f"Error fetching unit tax {tax_id}: {e}")
        return None

async def db_update_unit_tax(db_client: Client, tax_id: uuid.UUID, tax_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update an existing unit tax record.
    """
    try:
        response = await db_client.table('unit_taxes') \
            .update(tax_data) \
            .eq('id', str(tax_id)) \
            .execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"Error updating unit tax {tax_id}: {response.error.message}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.exception(f"Error updating unit tax {tax_id}: {e}")
        return None

async def db_delete_unit_tax(db_client: Client, tax_id: uuid.UUID) -> bool:
    """
    Delete a unit tax record.
    """
    try:
        response = await db_client.table('unit_taxes') \
            .delete() \
            .eq('id', str(tax_id)) \
            .execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"Error deleting unit tax {tax_id}: {response.error.message}")
            return False
        
        # Delete returns empty list on success
        return not response.data
    except Exception as e:
        logger.exception(f"Error deleting unit tax {tax_id}: {e}")
        return False

# --- End Unit Tax DB Functions --- #

async def get_unit(db_client: Client, unit_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a single unit by its ID.
    """
    try:
        response = db_client.table('units').select('*').eq('id', unit_id).single().execute()
        
        if hasattr(response, 'error') and response.error:
            if "PGRST116" in str(response.error): # Not found
                logger.info(f"Unit {unit_id} not found.")
            else:
                logger.error(f"Error fetching unit {unit_id}: {response.error.message}")
            return None
            
        return response.data
    except Exception as e:
        logger.error(f"Failed to get unit {unit_id}: {str(e)}", exc_info=True)
        return None