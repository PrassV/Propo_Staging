from typing import Optional, Dict
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from .settings import settings
from ..models.user import User
from ..services import user_service
import logging

security = HTTPBearer()
logger = logging.getLogger(__name__)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[User]:
    """
    Validate JWT token, fetch the user's profile from the DB, and return current user object.
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
        
        if profile_data:
            logger.debug(f"Profile found for user {user_id}: {profile_data}")
            # Combine token data and profile data
            # Construct full_name if first_name and last_name exist
            full_name = None
            if profile_data.get("first_name") and profile_data.get("last_name"):
                full_name = f"{profile_data['first_name']} {profile_data['last_name']}"
            elif profile_data.get("first_name"):
                 full_name = profile_data['first_name'] # Fallback if only first name exists

            # No longer mapping user_type to role
            user_type = profile_data.get("user_type")
            if user_type:
                logger.debug(f"Found user_type '{user_type}' for user {user_id}")

            return User(
                id=user_id,
                email=email or profile_data.get("email"), # Prefer email from token, fallback to profile
                is_active=profile_data.get("is_active", True), # Get from profile if available, default True
                full_name=full_name, # Use constructed full_name
                # Include other fields from profile directly
                first_name=profile_data.get("first_name"),
                last_name=profile_data.get("last_name"),
                phone=profile_data.get("phone"),
                user_type=user_type, # Use user_type directly
                created_at=profile_data.get("created_at"),
                updated_at=profile_data.get("updated_at"),
                address_line1=profile_data.get("address_line1"),
                address_line2=profile_data.get("address_line2"),
                city=profile_data.get("city"),
                state=profile_data.get("state"),
                pincode=profile_data.get("pincode"),
            )
        else:
            # Profile not found, log and return basic user info from token
            logger.warning(f"Profile not found in DB for user {user_id}. Returning basic info from token.")
            return User(
                id=user_id,
                email=email,
                is_active=True # Assume active if profile is missing but token is valid
            )
        
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