# Backend/app/services/user_service.py
from typing import Dict, Optional
# Import the actual client from config
from app.config.database import supabase_client 
from app.models.user import UserUpdate
import logging
from supabase import create_client, Client # Import Client

logger = logging.getLogger(__name__)

def update_user_profile(user_id: str, update_data: UserUpdate, email: Optional[str] = None) -> Optional[Dict]:
    """
    Updates a user's profile information in the database.
    If profile doesn't exist, creates a new one using upsert.
    Requires user's email for initial insert due to NOT NULL constraint.
    """
    try:
        # Use the imported client with service role key
        from app.config.database import supabase_service_role_client
        supabase = supabase_service_role_client  # Use service role client to bypass RLS
        
        # Convert update_data to dictionary
        update_dict = {}
        if hasattr(update_data, 'model_dump'):
            update_dict = update_data.model_dump(exclude_unset=True)
        elif hasattr(update_data, 'dict'):
            update_dict = update_data.dict(exclude_unset=True)
        elif isinstance(update_data, dict):
            update_dict = update_data
        
        logger.info(f"Updating profile for user {user_id} with data: {update_dict}")
        
        # Prepare data with user ID
        insert_data = {
            "id": user_id,
            **update_dict
        }
        
        # Ensure email is included, especially for the initial insert
        if email and "email" not in insert_data:
            insert_data["email"] = email
        elif "email" not in insert_data:
            # If email wasn't passed and isn't in update_dict, we have a problem for INSERT
            # Log a warning, the upsert might fail if it's an insert.
            logger.warning(f"Email is missing for user {user_id} profile upsert. This may fail if the profile doesn't exist.")

        
        # Simple upsert operation (service role bypasses RLS)
        response = supabase.table("user_profiles").upsert(insert_data).execute()
        
        if response and hasattr(response, 'data') and response.data:
            logger.info(f"Successfully processed profile for user {user_id}.")
            return response.data[0] if isinstance(response.data, list) and response.data else response.data
        
        # If response empty, log error and return None (or raise)
        logger.error(f"Upsert response for user {user_id} did not contain expected data.")
        return None # Removed potentially incorrect recursive call

    except Exception as e:
        logger.error(f"Database error processing profile for user {user_id}: {e}", exc_info=True)
        raise

def get_user_profile(db_client: Client, user_id: str) -> Optional[Dict]:
    """Fetch user profile data by user ID using the provided client."""
    logger.info(f"Attempting to fetch profile for user_id: {user_id}")
    try:
        # supabase = supabase_client # Use the passed-in client
        logger.debug(f"Using supabase client: {type(db_client)}")
        
        # Execute the query against the correct table using the provided client
        response = db_client.table("user_profiles").select("*", count='exact').eq("id", user_id).execute()
        
        # Log the raw response
        logger.info(f"Raw Supabase response for user {user_id}: {response}")
        
        # Check for data and count
        data = None
        count = 0
        if hasattr(response, 'data'):
            data = response.data
            logger.info(f"Response data type: {type(data)}, content: {data}")
        if hasattr(response, 'count'):
            count = response.count
            logger.info(f"Response count: {count}")

        # Determine result based on data and count
        if data and isinstance(data, list) and len(data) > 0:
            profile = data[0]
            logger.info(f"Profile found for user {user_id}: {profile}")
            return profile
        elif count == 0:
            logger.warning(f"No profile found in DB for user {user_id} (count is 0).")
            return None
        else:
            # This case might indicate an issue with the response structure
            logger.warning(f"Profile data for user {user_id} is empty or not in expected list format, but count is {count}. Raw data: {data}")
            return None
            
    except Exception as e:
        logger.error(f"Error fetching profile for user {user_id}: {e}", exc_info=True)
        return None

# You might need other user-related functions here, e.g., get_user_by_id, etc. 

# TODO: Add get_user_profile function here later 