from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from .settings import settings
from ..models.user import User
from ..services import user_service
import logging

security = HTTPBearer()
logger = logging.getLogger(__name__)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict[str, Any]]:
    """
    Validate JWT token, fetch the user's profile from the DB, and return current user object.
    
    Changed return type from User model to Dict for better serialization control.
    """
    try:
        token = credentials.credentials
        # Verify the JWT token using the Supabase JWT secret
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            audience="authenticated"
        )
        
        # Extract user information from the token
        user_id = payload.get("sub")
        email = payload.get("email")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token: User ID (sub) missing",
            )
            
        # Fetch profile data from the database using user_service
        profile_data = user_service.get_user_profile(user_id)
        
        # Create a minimal base user dict with JWT data
        user_dict = {
            "id": user_id,
            "email": email,
            "is_active": True
        }
        
        # Add profile data if available
        if profile_data:
            logger.debug(f"Profile found for user {user_id}")
            
            # Add all profile fields to the user dict
            for key, value in profile_data.items():
                if value is not None:  # Only add non-null values
                    user_dict[key] = value
            
            # Add derived fields
            if profile_data.get("first_name") and profile_data.get("last_name"):
                user_dict["full_name"] = f"{profile_data['first_name']} {profile_data['last_name']}"
        else:
            logger.warning(f"Profile not found for user {user_id}")
        
        return user_dict
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        ) 