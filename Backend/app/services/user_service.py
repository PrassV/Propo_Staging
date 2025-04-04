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
    """
    try:
        # Use the imported client
        supabase = supabase_client
        
        # Use .dict() for Pydantic V1 compatibility or .model_dump() for V2
        # Check which method is available
        if hasattr(update_data, 'model_dump'):
            update_dict = update_data.model_dump(exclude_unset=True)
        else:
            update_dict = update_data.dict(exclude_unset=True)
        
        if not update_dict:
            logger.info(f"No update data provided for user {user_id}.")
            # Return current data or raise an error? Let's return current for now.
            # Using V2 API: no .execute() method, and data is returned directly
            response = supabase.table("profiles").select("*").eq("id", user_id).single()
            return response

        logger.info(f"Attempting to update profile for user {user_id} with data: {update_dict}")
        
        # Execute the update using V2 API (no .execute() needed)
        response = supabase.table("profiles")\
                          .update(update_dict)\
                          .eq("id", user_id)
        
        # V2 API: response format might be different
        logger.debug(f"Supabase update response for user {user_id}: {response}")
        
        # Check if data was returned
        if response and hasattr(response, 'data') and response.data:
            logger.info(f"Successfully updated profile for user {user_id}.")
            return response.data[0] if isinstance(response.data, list) else response.data
        else:
            # Check if the user exists but wasn't updated 
            try:
                # Using V2 API
                check_user = supabase.table("profiles").select("id").eq("id", user_id).single()
                if check_user:  # In V2, this should return the data directly or None
                    logger.warning(f"Update attempted for user {user_id}, but no data returned. Data might be unchanged.")
                    # Return current data as it likely wasn't changed
                    try:
                        # Using V2 API
                        current_data = supabase.table("profiles").select("*").eq("id", user_id).single()
                        return current_data  # Should be the data itself in V2
                    except Exception as fetch_err:
                        logger.error(f"Error fetching current profile for user {user_id}: {fetch_err}")
                        return None
                else:
                    logger.error(f"Profile not found for user {user_id} during update attempt.")
                    return None # Indicate user not found
            except Exception as check_err:
                logger.error(f"Error checking if profile exists for user {user_id}: {check_err}")
                return None

    except Exception as e:
        logger.error(f"Database error updating profile for user {user_id}: {e}", exc_info=True)
        # Re-raise the exception or handle it as needed
        raise  # Re-raising allows the API layer to catch it and return 500

def get_user_profile(user_id: str) -> Optional[Dict]:
    """Fetch user profile data by user ID."""
    try:
        supabase = supabase_client
        # Using V2 API (no .execute() needed)
        response = supabase.table("profiles").select("*").eq("id", user_id).single()
        logger.debug(f"Supabase get_user_profile response for {user_id}: {response}")
        return response  # In V2, this should return the data directly
    except Exception as e:
        logger.error(f"Error fetching profile for user {user_id}: {e}", exc_info=True)
        return None

# You might need other user-related functions here, e.g., get_user_by_id, etc. 

# TODO: Add get_user_profile function here later 