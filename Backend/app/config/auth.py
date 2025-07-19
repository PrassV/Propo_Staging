from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from .settings import settings
from ..services import user_service
from .database import get_supabase_client_authenticated
import logging
import jwt
import requests

security = HTTPBearer()
logger = logging.getLogger(__name__)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict[str, Any]]:
    """
    Validate Supabase JWT token and return current user object.
    This ensures proper RLS policy enforcement by using actual Supabase tokens.
    """
    try:
        token = credentials.credentials
        logger.info(f"Processing authentication for token: {token[:20]}...")
        
        # Create authenticated Supabase client with the token
        supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        
        # Set the auth token for RLS
        supabase_client.postgrest.auth(token)
        
        # Try to get the user from Supabase to validate the token
        try:
            # Use the token to get user info from Supabase
            user_response = supabase_client.auth.get_user(token)
            
            if not user_response.user:
                logger.error("Supabase user not found in token response")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token: User not found",
                )
            
            supabase_user = user_response.user
            user_id = supabase_user.id
            email = supabase_user.email
            
            logger.info(f"Successfully validated Supabase user: {user_id} ({email})")
            
        except Exception as e:
            logger.error(f"Failed to validate Supabase token: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )
        
        # Get additional profile data from our database
        logger.info(f"Fetching profile data for user {user_id}")
        profile_data = user_service.get_user_profile(supabase_client, user_id)
        logger.info(f"Profile data result: {profile_data is not None}")
        
        # Start with base Supabase user data
        user_dict = {
            "id": user_id,
            "email": email,
            "is_active": True,
            # Initialize expected profile fields to None
            "first_name": None,
            "last_name": None,
            "full_name": None,
            "phone": None,
            "user_type": None,
            "role": None, # Frontend expects role
            "created_at": supabase_user.created_at,
            "updated_at": supabase_user.updated_at,
            "address_line1": None,
            "address_line2": None,
            "city": None,
            "state": None,
            "pincode": None,
        }
        
        # Add metadata from Supabase user
        if supabase_user.user_metadata:
            user_dict.update({
                "first_name": supabase_user.user_metadata.get("first_name"),
                "last_name": supabase_user.user_metadata.get("last_name"),
                "full_name": supabase_user.user_metadata.get("full_name") or supabase_user.user_metadata.get("name"),
                "phone": supabase_user.user_metadata.get("phone"),
                "user_type": supabase_user.user_metadata.get("user_type"),
                "role": supabase_user.user_metadata.get("role") or supabase_user.user_metadata.get("user_type"),
            })
        
        # Populate with profile data if found
        if profile_data:
            logger.info(f"Profile found for user {user_id}: {profile_data}")
            user_dict.update({
                "first_name": profile_data.get("first_name") or user_dict["first_name"],
                "last_name": profile_data.get("last_name") or user_dict["last_name"],
                "phone": profile_data.get("phone") or user_dict["phone"],
                "user_type": profile_data.get("user_type") or user_dict["user_type"],
                "address_line1": profile_data.get("address_line1"),
                "address_line2": profile_data.get("address_line2"),
                "city": profile_data.get("city"),
                "state": profile_data.get("state"),
                "pincode": profile_data.get("pincode"),
            })
            
            # Construct full_name if not already set
            if not user_dict["full_name"] and user_dict["first_name"] and user_dict["last_name"]:
                user_dict["full_name"] = f"{user_dict['first_name']} {user_dict['last_name']}"
            elif not user_dict["full_name"] and user_dict["first_name"]:
                user_dict["full_name"] = user_dict["first_name"]

            # Map user_type to role for frontend compatibility
            if user_dict["user_type"] and not user_dict["role"]:
                user_dict["role"] = user_dict["user_type"]
                
        else:
            logger.warning(f"Profile not found for user {user_id}. Returning Supabase data with null profile fields.")
        
        logger.info(f"Returning user dict: {user_dict}")
        return user_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_current_user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not process authentication: {str(e)}",
        ) 