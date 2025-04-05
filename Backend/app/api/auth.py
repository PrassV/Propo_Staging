from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from typing import Dict, Any
from pydantic import BaseModel, EmailStr
import logging
import inspect

from app.config.auth import get_current_user
from app.config.database import supabase_client

router = APIRouter()

# Set up logging
logger = logging.getLogger(__name__)

# Pydantic models for request/response
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    """
    Login endpoint that uses Supabase authentication.
    
    Args:
        login_data: The login credentials
        
    Returns:
        JSON with access token and user info
        
    Raises:
        HTTPException: If login fails
    """
    try:
        # Add diagnostic logging
        logger.info(f"Supabase client type: {type(supabase_client)}")
        logger.info(f"Supabase auth module type: {type(supabase_client.auth)}")
        logger.info(f"Available auth methods: {dir(supabase_client.auth)}")
        
        # Try to get the Supabase version
        try:
            import supabase
            logger.info(f"Supabase SDK version: {supabase.__version__}")
        except (ImportError, AttributeError):
            logger.warning("Could not determine Supabase SDK version")
        
        # Try different authentication methods based on available methods
        auth_methods = dir(supabase_client.auth)
        
        # Attempt login based on available methods
        if 'sign_in_with_password' in auth_methods:
            # For newer versions of Supabase (>= 1.0.0)
            logger.info("Using sign_in_with_password method")
            response = supabase_client.auth.sign_in_with_password({
                "email": login_data.email,
                "password": login_data.password
            })
            user = response.user
            session = response.session
        elif 'sign_in' in auth_methods:
            # For Supabase version 0.7.1
            logger.info("Using sign_in method")
            response = supabase_client.auth.sign_in(
                email=login_data.email, 
                password=login_data.password
            )
            logger.info(f"Sign-in response type: {type(response)}")
            logger.info(f"Sign-in response attributes: {dir(response)}")
            
            # Extract user and session from response
            # Note: in version 0.7.1, the structure might differ
            user = response.user if hasattr(response, 'user') else None
            session = response.session if hasattr(response, 'session') else None
            
            # If user or session not found in expected attributes, check response directly
            if user is None and hasattr(response, 'data'):
                logger.info("Extracting user from response.data")
                data = response.data
                if isinstance(data, dict) and 'user' in data:
                    user = data['user']
                
            if session is None and hasattr(response, 'data'):
                logger.info("Extracting session from response.data")
                data = response.data
                if isinstance(data, dict) and 'session' in data:
                    # Create a simple session-like object
                    session = type('Session', (), {'access_token': data['access_token']})
        else:
            # No recognized authentication method available
            logger.error("No compatible authentication method found in Supabase client")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication not properly configured"
            )
        
        logger.info(f"User found: {user is not None}, Session found: {session is not None}")
        
        if not user or not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # For older versions, user might not have user_metadata attribute directly
        user_metadata = {}
        if hasattr(user, 'user_metadata'):
            user_metadata = user.user_metadata
        elif isinstance(user, dict):
            user_metadata = user.get('user_metadata', {})
        
        # Handle different response structures between versions
        user_id = getattr(user, 'id', None) if not isinstance(user, dict) else user.get('id')
        user_email = getattr(user, 'email', None) if not isinstance(user, dict) else user.get('email')
        access_token = getattr(session, 'access_token', None) if not isinstance(session, dict) else session.get('access_token')
        refresh_token = getattr(session, 'refresh_token', None) if not isinstance(session, dict) else session.get('refresh_token')
        
        if not user_id or not user_email or not access_token:
            logger.error(f"Missing critical user information. ID: {user_id}, Email: {user_email}, Token: {'present' if access_token else 'missing'}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Invalid authentication response structure"
            )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": user_email,
                "full_name": user_metadata.get("full_name", "") if isinstance(user_metadata, dict) else "",
                "phone": user_metadata.get("phone", "") if isinstance(user_metadata, dict) else "",
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.post("/signup", response_model=TokenResponse)
async def signup(signup_data: UserSignup):
    """
    Signup endpoint that uses Supabase authentication.
    
    Args:
        signup_data: The signup data
        
    Returns:
        JSON with access token and user info
        
    Raises:
        HTTPException: If signup fails
    """
    try:
        # Combine first name and last name
        full_name = f"{signup_data.first_name} {signup_data.last_name}".strip()
        
        # Use Supabase authentication directly
        response = supabase_client.auth.sign_up({
            "email": signup_data.email,
            "password": signup_data.password,
            "options": {
                "data": {
                    "first_name": signup_data.first_name,
                    "last_name": signup_data.last_name,
                    "full_name": full_name,
                    "phone": signup_data.phone,
                }
            }
        })
        
        # Extract user and session from response
        user = response.user
        session = response.session
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User registration failed"
            )
        
        return {
            "access_token": session.access_token if session else "",
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.user_metadata.get("first_name", ""),
                "last_name": user.user_metadata.get("last_name", ""),
                "full_name": user.user_metadata.get("full_name", ""),
                "phone": user.user_metadata.get("phone", ""),
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# Add an alias for the register endpoint with the same implementation
@router.post("/register", response_model=TokenResponse)
async def register(signup_data: UserSignup):
    """
    Register endpoint (alias for signup) that uses Supabase authentication.
    
    Args:
        signup_data: The signup data
        
    Returns:
        JSON with access token and user info
        
    Raises:
        HTTPException: If signup fails
    """
    # Reuse the signup implementation
    return await signup(signup_data)

@router.post("/logout")
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Logout endpoint.
    
    Args:
        current_user: The current authenticated user
        
    Returns:
        JSON with success message
    """
    try:
        # Use Supabase sign out
        supabase_client.auth.sign_out()
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me", response_model=Dict[str, Any])
async def get_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get current user information.
    
    Args:
        current_user: The current authenticated user
        
    Returns:
        JSON with user information
    """
    # Add explicit logging for debugging
    logger.debug(f"GET /me called, current_user data: {current_user}")
    
    # Extract user_id to fetch the full profile if user_type is missing
    user_id = None
    if isinstance(current_user, dict):
        user_id = current_user.get("id")
    elif hasattr(current_user, "id"):
        user_id = current_user.id
    
    # If user_type is missing but we have user_id, try to fetch the full profile explicitly
    if user_id and not (current_user.get("user_type") if isinstance(current_user, dict) else getattr(current_user, "user_type", None)):
        logger.info(f"User type missing in /me response, fetching full profile for user {user_id}")
        try:
            from app.services import user_service
            profile_data = user_service.get_user_profile(user_id)
            
            if profile_data:
                logger.info(f"Full profile fetched for user {user_id}: {profile_data}")
                
                # If current_user is a dict, update it directly
                if isinstance(current_user, dict):
                    # Add missing fields
                    for key, value in profile_data.items():
                        if key not in current_user or current_user[key] is None:
                            current_user[key] = value
                    
                    # Construct full_name if missing but first_name and last_name exist
                    if not current_user.get("full_name") and current_user.get("first_name") and current_user.get("last_name"):
                        current_user["full_name"] = f"{current_user['first_name']} {current_user['last_name']}"
                else:
                    # If current_user is an object, we need to handle it differently
                    # For simplicity, convert to dict
                    current_user_dict = {}
                    for key in dir(current_user):
                        if not key.startswith("_") and key not in ["model_config", "model_fields"]:
                            current_user_dict[key] = getattr(current_user, key)
                    
                    # Update with profile data
                    for key, value in profile_data.items():
                        if key not in current_user_dict or current_user_dict[key] is None:
                            current_user_dict[key] = value
                    
                    # Handle full_name and role mapping
                    if not current_user_dict.get("full_name") and current_user_dict.get("first_name") and current_user_dict.get("last_name"):
                        current_user_dict["full_name"] = f"{current_user_dict['first_name']} {current_user_dict['last_name']}"
                    
                    current_user = current_user_dict
        except Exception as e:
            logger.error(f"Error fetching full profile in /me endpoint: {e}")
    
    return current_user

@router.put("/profile", response_model=Dict[str, Any])
async def update_profile(update_data: Dict[str, Any] = Body(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Update user profile endpoint for compatibility with frontend.
    Forwards the request to the user service.
    
    Args:
        update_data: The profile data to update
        current_user: The current authenticated user
        
    Returns:
        Updated user profile wrapped in a data field
    """
    from app.services import user_service
    from app.models.user import UserUpdate
    from pydantic import BaseModel
    
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Handle different current_user structures (object vs dict)
    user_id = None
    
    # Safely extract user_id without serialization issues
    try:
        if isinstance(current_user, dict):
            user_id = current_user.get("id")
        elif hasattr(current_user, "id"):
            user_id = current_user.id
        
        # For debugging purposes
        logger.info(f"Current user type: {type(current_user)}")
        logger.info(f"Extracted user_id: {user_id}")
        logger.info(f"Update data received: {update_data}")
    except Exception as e:
        logger.error(f"Error extracting user_id: {str(e)}")
        user_id = None
    
    if not user_id:
        logger.error(f"User ID missing in current_user (type: {type(current_user)})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials - User ID missing"
        )
    
    # We'll skip the dynamic model creation which can cause issues
    # Instead, directly extract only the fields we need from update_data
    safe_update_data = {
        "first_name": update_data.get("first_name"),
        "last_name": update_data.get("last_name"),
        "phone": update_data.get("phone"),
        "address_line1": update_data.get("address_line1"),
        "address_line2": update_data.get("address_line2"),
        "city": update_data.get("city"),
        "state": update_data.get("state"),
        "pincode": update_data.get("pincode"),
        "user_type": update_data.get("user_type"),
    }
    
    # If role is passed from frontend, use it for user_type
    if update_data.get("role") and not safe_update_data.get("user_type"):
        safe_update_data["user_type"] = update_data.get("role")
        logger.info(f"Converting role to user_type: {safe_update_data['user_type']}")
    
    # Remove None values to avoid overwriting existing data with None
    safe_update_data = {k: v for k, v in safe_update_data.items() if v is not None}
    
    try:
        # Create a simple UserUpdate model manually to avoid dynamic model issues
        try:
            update_model = UserUpdate(**safe_update_data)
            logger.info(f"Created update model successfully: {update_model}")
        except Exception as model_error:
            logger.error(f"Error creating model: {model_error}")
            # Fallback: Pass the dict directly to the service function
            logger.info("Using direct dict approach as fallback")
            from types import SimpleNamespace
            update_model = SimpleNamespace(**safe_update_data)
            update_model.dict = lambda exclude_unset=False: safe_update_data
        
        # Now update the profile
        updated_user = user_service.update_user_profile(user_id, update_model)
        if not updated_user:
            logger.error(f"Profile update failed for user {user_id}")
            # Try direct DB access as a last resort
            from app.config.database import supabase_client
            try:
                # Try a direct upsert
                logger.info(f"Attempting direct upsert for user {user_id}")
                insert_data = {"id": user_id, **safe_update_data}
                upsert_response = supabase_client.table("profiles").upsert(insert_data).execute()
                
                if upsert_response and hasattr(upsert_response, 'data') and upsert_response.data:
                    logger.info(f"Direct upsert successful: {upsert_response.data}")
                    updated_user = upsert_response.data[0] if isinstance(upsert_response.data, list) else upsert_response.data
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User profile not found or update failed"
                    )
            except Exception as direct_error:
                logger.error(f"Direct upsert failed: {direct_error}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User profile not found or update failed after multiple attempts"
                )
        
        # Create a clean response to avoid serialization issues
        clean_response = {
            "id": user_id,
            **{k: v for k, v in safe_update_data.items() if v is not None}
        }
        
        # Return in the format expected by the frontend
        return {"data": clean_response, "message": "Profile updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile via auth router: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        ) 