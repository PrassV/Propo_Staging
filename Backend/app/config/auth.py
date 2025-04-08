from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from .settings import settings
from ..models.user import User
from ..services import user_service
from .database import get_supabase_client_authenticated
from supabase import Client
import logging

security = HTTPBearer()
logger = logging.getLogger(__name__)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security),
                           db_client: Client = Depends(get_supabase_client_authenticated)
                          ) -> Optional[Dict[str, Any]]:
    """
    Validate JWT token, fetch the user's profile from the DB using an authenticated client,
    and return current user object.
    Ensures profile fields are present (even if null) and maps user_type to role.
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            audience="authenticated"
        )
        
        user_id = payload.get("sub")
        email = payload.get("email")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token: User ID (sub) missing",
            )
            
        profile_data = user_service.get_user_profile(db_client, user_id)
        
        # Start with base JWT data
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
            "created_at": None,
            "updated_at": None,
            "address_line1": None, # Add address fields, even if not in DB yet
            "address_line2": None,
            "city": None,
            "state": None,
            "pincode": None,
        }
        
        # Populate with profile data if found
        if profile_data:
            logger.debug(f"Profile found for user {user_id}")
            user_dict.update({
                "first_name": profile_data.get("first_name"),
                "last_name": profile_data.get("last_name"),
                "phone": profile_data.get("phone"),
                "user_type": profile_data.get("user_type"),
                "created_at": profile_data.get("created_at"),
                "updated_at": profile_data.get("updated_at"),
                # Explicitly get address fields if they exist in profile_data
                "address_line1": profile_data.get("address_line1"),
                "address_line2": profile_data.get("address_line2"),
                "city": profile_data.get("city"),
                "state": profile_data.get("state"),
                "pincode": profile_data.get("pincode"),
            })
            
            # Construct full_name
            if user_dict["first_name"] and user_dict["last_name"]:
                user_dict["full_name"] = f"{user_dict['first_name']} {user_dict['last_name']}"
            elif user_dict["first_name"]:
                 user_dict["full_name"] = user_dict["first_name"]

            # Map user_type to role for frontend compatibility
            if user_dict["user_type"]:
                user_dict["role"] = user_dict["user_type"]
                
        else:
            logger.warning(f"Profile not found for user {user_id}. Returning JWT data with null profile fields.")
        
        return user_dict
        
    except JWTError as e:
        logger.error(f"JWT Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
    except Exception as e:
        logger.error(f"Error in get_current_user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not process authentication: {str(e)}",
        ) 