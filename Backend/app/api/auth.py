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
    full_name: str
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
        # Use Supabase authentication directly
        response = supabase_client.auth.sign_up({
            "email": signup_data.email,
            "password": signup_data.password,
            "options": {
                "data": {
                    "full_name": signup_data.full_name,
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
                "full_name": user.user_metadata.get("full_name", ""),
                "phone": user.user_metadata.get("phone", ""),
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

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
    return current_user 