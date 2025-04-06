from typing import Dict, List, Any, Optional
import logging
import uuid
from supabase import Client
import json

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
    Get a property by ID from Supabase.
    Uses the provided authenticated client instance.
    """
    try:
        # Removed await based on previous TypeErrors
        response = db_client.table('properties').select('*').eq('id', property_id).single().execute()
        
        if hasattr(response, 'error') and response.error:
             if response.error.code == 'PGRST116':
                 logger.info(f"Property {property_id} not found (single query).")
                 return None
             else:
                 logger.error(f"Error fetching property {property_id}: {response.error.message}")
                 return None
        
        if not hasattr(response, 'data'):
            logger.error(f"Error fetching property {property_id}: Response has no data attribute.")
            return None
            
        return response.data
    except Exception as e:
        logger.error(f"Failed to get property {property_id}: {str(e)}", exc_info=True)
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