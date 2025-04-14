from typing import Dict, List, Any, Optional
import logging
import uuid
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from supabase import Client
import json
from ..models.property import PropertyCreate, PropertyUpdate, Property, PropertyDocument, PropertyDocumentCreate, UnitCreate # Import UnitCreate

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

async def get_property_by_id(db_client: Client, property_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a property by ID from Supabase, including its related units.
    Uses the provided authenticated client instance.
    """
    try:
        # Select property columns and all columns from the related 'units' table
        response = db_client.table('properties')\
            .select('*, units(*)')\
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

async def get_units_for_property(db_client: Client, property_id: str) -> List[str]:
    """Get distinct unit numbers associated with a property from the property_tenants table."""
    try:
        response = await db_client.table('property_tenants').select('unit_number').eq('property_id', property_id).execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching units for property {property_id}: {response.error.message}")
            return []
        
        if not hasattr(response, 'data') or not response.data:
            return []
        
        distinct_units = list(set(item['unit_number'] for item in response.data if item.get('unit_number')))
        return distinct_units
        
    except Exception as e:
        logger.error(f"Failed to get units for property {property_id}: {str(e)}", exc_info=True)
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
        response = await db_client.table('properties').select('owner_id').eq('id', property_id).maybe_single().execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching owner for property {property_id}: {response.error.message}")
            return None
        
        if response.data:
            return response.data.get('owner_id')
        else:
            logger.warning(f"Property {property_id} not found when fetching owner.")
            return None
            
    except Exception as e:
        logger.error(f"Failed to get owner for property {property_id}: {str(e)}", exc_info=True)
        return None 

async def create_unit(db_client: Client, unit_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Insert a new unit record into the public.units table."""
    try:
        logger.info(f"[db.create_unit] Attempting to insert unit: {unit_data}")
        response = await db_client.table('units').insert(unit_data).execute()
        
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
async def get_property_taxes(property_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get tax records for a property.
    
    Args:
        property_id: The property ID
        
    Returns:
        List of tax records
    """
    try:
        query = """
            SELECT * FROM property_taxes
            WHERE property_id = :property_id
            ORDER BY due_date DESC
        """
        response = await db.execute(query, {"property_id": str(property_id)})
        tax_records = await response.fetchall()
        return [dict(record) for record in tax_records]
    except Exception as e:
        logger.error(f"Error getting taxes for property {property_id}: {str(e)}")
        return []

async def get_property_tax(tax_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get a specific tax record.
    
    Args:
        tax_id: The tax record ID
        
    Returns:
        Tax record or None if not found
    """
    try:
        query = """
            SELECT * FROM property_taxes
            WHERE id = :tax_id
        """
        response = await db.execute(query, {"tax_id": str(tax_id)})
        tax_record = await response.fetchone()
        return dict(tax_record) if tax_record else None
    except Exception as e:
        logger.error(f"Error getting tax record {tax_id}: {str(e)}")
        return None

async def create_property_tax(tax_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a new tax record.
    
    Args:
        tax_data: Tax record data
        
    Returns:
        Created tax record
    """
    try:
        columns = ", ".join(tax_data.keys())
        placeholders = ", ".join([f":{k}" for k in tax_data.keys()])
        
        query = f"""
            INSERT INTO property_taxes ({columns})
            VALUES ({placeholders})
            RETURNING *
        """
        
        # Convert UUIDs to strings
        params = {k: str(v) if isinstance(v, uuid.UUID) else v for k, v in tax_data.items()}
        
        response = await db.execute(query, params)
        created_tax = await response.fetchone()
        return dict(created_tax)
    except Exception as e:
        logger.error(f"Error creating tax record: {str(e)}")
        raise

async def update_property_tax(tax_id: uuid.UUID, tax_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a tax record.
    
    Args:
        tax_id: The tax record ID
        tax_data: The updated tax record data
        
    Returns:
        Updated tax record or None if not found
    """
    try:
        # Prepare SET clause
        set_clause = ", ".join([f"{k} = :{k}" for k in tax_data.keys()])
        
        query = f"""
            UPDATE property_taxes
            SET {set_clause}
            WHERE id = :tax_id
            RETURNING *
        """
        
        # Convert UUIDs to strings
        params = {k: str(v) if isinstance(v, uuid.UUID) else v for k, v in tax_data.items()}
        params["tax_id"] = str(tax_id)
        
        response = await db.execute(query, params)
        updated_tax = await response.fetchone()
        return dict(updated_tax) if updated_tax else None
    except Exception as e:
        logger.error(f"Error updating tax record {tax_id}: {str(e)}")
        raise

async def delete_property_tax(tax_id: uuid.UUID) -> bool:
    """
    Delete a tax record.
    
    Args:
        tax_id: The tax record ID
        
    Returns:
        True if deleted, False otherwise
    """
    try:
        query = """
            DELETE FROM property_taxes
            WHERE id = :tax_id
        """
        
        result = await db.execute(query, {"tax_id": str(tax_id)})
        return result.rowcount > 0
    except Exception as e:
        logger.error(f"Error deleting tax record {tax_id}: {str(e)}")
        raise

# Unit Images Functions
async def get_unit_images(unit_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get images for a unit.
    
    Args:
        unit_id: The unit ID
        
    Returns:
        List of image records
    """
    try:
        query = """
            SELECT * FROM unit_images
            WHERE unit_id = :unit_id
            ORDER BY created_at DESC
        """
        response = await db.execute(query, {"unit_id": str(unit_id)})
        images = await response.fetchall()
        return [dict(image) for image in images]
    except Exception as e:
        logger.error(f"Error getting images for unit {unit_id}: {str(e)}")
        return []

async def add_unit_image(image_data: Dict[str, Any]) -> bool:
    """
    Add an image to a unit.
    
    Args:
        image_data: Image record data
        
    Returns:
        True if added, False otherwise
    """
    try:
        columns = ", ".join(image_data.keys())
        placeholders = ", ".join([f":{k}" for k in image_data.keys()])
        
        query = f"""
            INSERT INTO unit_images ({columns})
            VALUES ({placeholders})
        """
        
        # Convert UUIDs to strings
        params = {k: str(v) if isinstance(v, uuid.UUID) else v for k, v in image_data.items()}
        
        result = await db.execute(query, params)
        return result.rowcount > 0
    except Exception as e:
        logger.error(f"Error adding image to unit {image_data.get('unit_id')}: {str(e)}")
        raise

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
        query = """
            DELETE FROM unit_images
            WHERE unit_id = :unit_id AND url = :image_url
        """
        
        result = await db.execute(query, {"unit_id": str(unit_id), "image_url": image_url})
        return result.rowcount > 0
    except Exception as e:
        logger.error(f"Error deleting image from unit {unit_id}: {str(e)}")
        raise

# Financial Summary Functions
async def get_property_income(property_id: uuid.UUID, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
    """
    Get income data for a property within a date range.
    
    Args:
        property_id: The property ID
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        List of income records
    """
    try:
        query = """
            SELECT p.id, p.amount, p.payment_date, p.category, p.description
            FROM payments p
            WHERE p.property_id = :property_id
            AND p.payment_date BETWEEN :start_date AND :end_date
            AND p.status = 'completed'
            AND p.type = 'income'
            ORDER BY p.payment_date DESC
        """
        
        response = await db.execute(query, {
            "property_id": str(property_id),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        })
        
        income_data = await response.fetchall()
        return [dict(record) for record in income_data]
    except Exception as e:
        logger.error(f"Error getting income for property {property_id}: {str(e)}")
        return []

async def get_property_expenses(property_id: uuid.UUID, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
    """
    Get expense data for a property within a date range.
    
    Args:
        property_id: The property ID
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        List of expense records
    """
    try:
        query = """
            SELECT p.id, p.amount, p.payment_date, p.category, p.description
            FROM payments p
            WHERE p.property_id = :property_id
            AND p.payment_date BETWEEN :start_date AND :end_date
            AND p.status = 'completed'
            AND p.type = 'expense'
            ORDER BY p.payment_date DESC
        """
        
        response = await db.execute(query, {
            "property_id": str(property_id),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        })
        
        expense_data = await response.fetchall()
        return [dict(record) for record in expense_data]
    except Exception as e:
        logger.error(f"Error getting expenses for property {property_id}: {str(e)}")
        return []

async def get_property_income_total(property_id: uuid.UUID, start_date: datetime, end_date: datetime) -> float:
    """
    Get total income for a property within a date range.
    
    Args:
        property_id: The property ID
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        Total income amount
    """
    try:
        query = """
            SELECT COALESCE(SUM(p.amount), 0) as total
            FROM payments p
            WHERE p.property_id = :property_id
            AND p.payment_date BETWEEN :start_date AND :end_date
            AND p.status = 'completed'
            AND p.type = 'income'
        """
        
        response = await db.execute(query, {
            "property_id": str(property_id),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        })
        
        result = await response.fetchone()
        return float(result['total']) if result and 'total' in result else 0.0
    except Exception as e:
        logger.error(f"Error getting income total for property {property_id}: {str(e)}")
        return 0.0

async def get_property_expenses_total(property_id: uuid.UUID, start_date: datetime, end_date: datetime) -> float:
    """
    Get total expenses for a property within a date range.
    
    Args:
        property_id: The property ID
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        Total expense amount
    """
    try:
        query = """
            SELECT COALESCE(SUM(p.amount), 0) as total
            FROM payments p
            WHERE p.property_id = :property_id
            AND p.payment_date BETWEEN :start_date AND :end_date
            AND p.status = 'completed'
            AND p.type = 'expense'
        """
        
        response = await db.execute(query, {
            "property_id": str(property_id),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        })
        
        result = await response.fetchone()
        return float(result['total']) if result and 'total' in result else 0.0
    except Exception as e:
        logger.error(f"Error getting expense total for property {property_id}: {str(e)}")
        return 0.0

async def get_property_occupancy_rate(property_id: uuid.UUID, start_date: datetime, end_date: datetime) -> float:
    """
    Calculate occupancy rate for a property within a date range.
    
    Args:
        property_id: The property ID
        start_date: Start date of the range
        end_date: End date of the range
        
    Returns:
        Occupancy rate percentage (0-100)
    """
    try:
        # Get total units for property
        total_units_query = """
            SELECT COUNT(*) as total
            FROM units
            WHERE property_id = :property_id
        """
        
        total_units_response = await db.execute(total_units_query, {"property_id": str(property_id)})
        total_units_result = await total_units_response.fetchone()
        total_units = int(total_units_result['total']) if total_units_result and 'total' in total_units_result else 0
        
        if total_units == 0:
            return 0.0  # No units, so occupancy rate is 0%
        
        # Get occupied units in the date range
        occupied_units_query = """
            SELECT COUNT(DISTINCT unit_id) as occupied
            FROM property_tenant_link
            WHERE property_id = :property_id
            AND (
                (start_date <= :end_date AND (end_date IS NULL OR end_date >= :start_date))
            )
        """
        
        occupied_units_response = await db.execute(occupied_units_query, {
            "property_id": str(property_id),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        })
        
        occupied_units_result = await occupied_units_response.fetchone()
        occupied_units = int(occupied_units_result['occupied']) if occupied_units_result and 'occupied' in occupied_units_result else 0
        
        # Calculate occupancy rate
        occupancy_rate = (occupied_units / total_units) * 100
        return round(occupancy_rate, 2)
    except Exception as e:
        logger.error(f"Error calculating occupancy rate for property {property_id}: {str(e)}")
        return 0.0