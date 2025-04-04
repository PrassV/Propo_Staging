# Backend/app/services/user_service.py
from typing import Dict, Optional
# Import the actual client from config
from app.config.database import supabase_client 
from app.models.user import UserUpdate
import logging

logger = logging.getLogger(__name__)

def update_user_profile(user_id: str, update_data: UserUpdate) -> Optional[Dict]:
    """
    Updates a user's profile information in the database.
    If profile doesn't exist, creates a new one using upsert.
    """
    try:
        # Use the imported client
        supabase = supabase_client
        
        # Use .dict() for Pydantic V1 compatibility or .model_dump() for V2
        # Check which method is available
        update_dict = {}
        try:
            if hasattr(update_data, 'model_dump'):
                update_dict = update_data.model_dump(exclude_unset=True)
            elif hasattr(update_data, 'dict'):
                update_dict = update_data.dict(exclude_unset=True)
            else:
                # Fallback for when Pydantic model methods aren't available
                update_dict = vars(update_data)
                # Remove private attributes and None values
                update_dict = {k: v for k, v in update_dict.items() 
                             if not k.startswith('_') and v is not None}
        except Exception as dict_error:
            logger.error(f"Error converting update_data to dict: {dict_error}")
            # Last resort fallback
            if isinstance(update_data, dict):
                update_dict = update_data
            else:
                # Try to extract attributes as a last resort
                for attr in ['first_name', 'last_name', 'phone', 'address_line1', 
                           'address_line2', 'city', 'state', 'pincode', 'role']:
                    if hasattr(update_data, attr):
                        val = getattr(update_data, attr)
                        if val is not None:
                            update_dict[attr] = val
        
        if not update_dict:
            logger.info(f"No update data provided for user {user_id}.")
            # Using V2 API to get current profile
            response = supabase.table("profiles").select("*").eq("id", user_id).single()
            # Extract just the data, don't return the response object
            return response.data if hasattr(response, 'data') else response

        logger.info(f"Attempting to update profile for user {user_id} with data: {update_dict}")
        
        # First check if the profile exists
        try:
            check_user = supabase.table("profiles").select("id").eq("id", user_id).single()
            profile_exists = check_user and hasattr(check_user, 'data') and check_user.data
        except Exception as check_error:
            logger.error(f"Error checking if profile exists: {check_error}")
            profile_exists = False
        
        if profile_exists:
            # Profile exists, perform update
            logger.info(f"Profile found for user {user_id}, updating...")
            try:
                response = supabase.table("profiles").update(update_dict).eq("id", user_id)
            except Exception as update_error:
                logger.error(f"Update error: {update_error}, falling back to upsert")
                # If update fails, try upsert
                insert_data = {"id": user_id, **update_dict}
                response = supabase.table("profiles").upsert(insert_data).execute()
        else:
            # Profile doesn't exist, perform upsert which is more reliable than insert
            logger.info(f"Profile not found for user {user_id}, creating via upsert...")
            
            # Prepare insert data with required fields
            insert_data = {
                "id": user_id,
                **update_dict
            }
            
            logger.info(f"Upserting data: {insert_data}")
            
            # Use upsert which will insert if not exists or update if exists
            response = supabase.table("profiles").upsert(insert_data).execute()
            logger.info(f"Upsert response type: {type(response)}")
            
            # Check if we have a response
            if not response:
                logger.error("Upsert returned None response")
                return None
        
        # Extract data properly with enhanced logging
        if hasattr(response, 'data'):
            logger.info(f"Response has data attribute. Data: {response.data}")
            
            if response.data:
                logger.info(f"Successfully processed profile for user {user_id}.")
                # Return just the data, not the entire response object
                return response.data[0] if isinstance(response.data, list) and response.data else response.data
            else:
                logger.error(f"Response data is empty for user {user_id}")
        else:
            logger.error(f"Response has no data attribute: {response}")
        
        # If we got here, something went wrong but the operation might have succeeded
        # Try to fetch the profile directly as a last resort
        try:
            logger.info(f"Attempting to fetch profile directly after operation")
            fallback_response = supabase.table("profiles").select("*").eq("id", user_id).single()
            if fallback_response and hasattr(fallback_response, 'data') and fallback_response.data:
                logger.info(f"Found profile via direct fetch after operation")
                return fallback_response.data
        except Exception as fetch_error:
            logger.error(f"Failed to fetch profile after operation: {fetch_error}")
        
        # If we reach here, the profile operation truly failed
        return None

    except Exception as e:
        logger.error(f"Database error processing profile for user {user_id}: {e}", exc_info=True)
        # Re-raise the exception or handle it as needed
        raise  # Re-raising allows the API layer to catch it and return 500

def get_user_profile(user_id: str) -> Optional[Dict]:
    """Fetch user profile data by user ID."""
    try:
        supabase = supabase_client
        # Using V2 API
        response = supabase.table("profiles").select("*").eq("id", user_id).single()
        logger.debug(f"Supabase get_user_profile response received for {user_id}")
        # Extract just the data, don't return the response object
        return response.data if hasattr(response, 'data') else None
    except Exception as e:
        logger.error(f"Error fetching profile for user {user_id}: {e}", exc_info=True)
        return None

# You might need other user-related functions here, e.g., get_user_by_id, etc. 

# TODO: Add get_user_profile function here later 