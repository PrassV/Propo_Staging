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
    If profile doesn't exist, creates a new one.
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
            # Using V2 API to get current profile
            response = supabase.table("profiles").select("*").eq("id", user_id).single()
            # Extract just the data, don't return the response object
            return response.data if hasattr(response, 'data') else response

        logger.info(f"Attempting to update profile for user {user_id} with data: {update_dict}")
        
        # First check if the profile exists
        check_user = supabase.table("profiles").select("id").eq("id", user_id).single()
        
        if check_user and hasattr(check_user, 'data') and check_user.data:
            # Profile exists, perform update
            logger.info(f"Profile found for user {user_id}, updating...")
            response = supabase.table("profiles").update(update_dict).eq("id", user_id)
        else:
            # Profile doesn't exist, perform insert
            logger.info(f"Profile not found for user {user_id}, creating new profile...")
            # Include user_id in the data to insert
            insert_data = {"id": user_id, **update_dict}
            response = supabase.table("profiles").insert(insert_data)
        
        logger.debug(f"Supabase response for user {user_id}")
        
        # Extract data properly
        if response and hasattr(response, 'data') and response.data:
            logger.info(f"Successfully processed profile for user {user_id}.")
            # Return just the data, not the entire response object
            return response.data[0] if isinstance(response.data, list) and response.data else response.data
        else:
            logger.error(f"Failed to process profile for user {user_id}.")
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