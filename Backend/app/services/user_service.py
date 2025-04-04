# Backend/app/services/user_service.py
from typing import Dict, Optional
# Import the actual client from config
from app.config.database import supabase_client 
from app.models.user import UserUpdate
import logging

logger = logging.getLogger(__name__)

async def update_user_profile(user_id: str, update_data: UserUpdate) -> Optional[Dict]:
    """
    Updates a user's profile information in the database.
    """
    try:
        # Use the imported client
        supabase = supabase_client
        
        # Use .dict() for Pydantic V1 compatibility
        update_dict = update_data.dict(exclude_unset=True)
        
        if not update_dict:
            logger.info(f"No update data provided for user {user_id}.")
            # Return current data or raise an error? Let's return current for now.
            response = await supabase.table("profiles").select("*").eq("id", user_id).single().execute()
            return response.data

        logger.info(f"Attempting to update profile for user {user_id} with data: {update_dict}")
        
        # Execute the update
        response = await supabase.table("profiles")\
                           .update(update_dict)\
                           .eq("id", user_id)\
                           .execute()

        logger.debug(f"Supabase update response for user {user_id}: {response}")

        # Check if any row was updated (response.data should contain the updated record)
        if response.data:
            logger.info(f"Successfully updated profile for user {user_id}.")
            # Assuming the response.data contains a list with the updated profile
            return response.data[0] 
        else:
            # Check if the user exists but wasn't updated (e.g., no matching row)
            check_user = await supabase.table("profiles").select("id").eq("id", user_id).maybe_single().execute()
            if check_user.data:
                 logger.warning(f"Update attempted for user {user_id}, but no data returned. Data might be unchanged.")
                 # Return current data as it likely wasn't changed
                 current_data_response = await supabase.table("profiles").select("*").eq("id", user_id).single().execute()
                 return current_data_response.data
            else:
                 logger.error(f"Profile not found for user {user_id} during update attempt.")
                 return None # Indicate user not found

    except Exception as e:
        logger.error(f"Database error updating profile for user {user_id}: {e}", exc_info=True)
        # Re-raise the exception or handle it as needed
        raise  # Re-raising allows the API layer to catch it and return 500

async def get_user_profile(user_id: str) -> Optional[Dict]:
    """Fetch user profile data by user ID."""
    try:
        supabase = supabase_client
        response = await supabase.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
        logger.debug(f"Supabase get_user_profile response for {user_id}: {response}")
        return response.data
    except Exception as e:
        logger.error(f"Error fetching profile for user {user_id}: {e}", exc_info=True)
        return None

# You might need other user-related functions here, e.g., get_user_by_id, etc. 

# TODO: Add get_user_profile function here later 