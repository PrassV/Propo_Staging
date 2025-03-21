from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from pydantic import BaseModel, EmailStr

from ..config.auth import get_current_user
from ..config.database import supabase_client

router = APIRouter()

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
        # Use Supabase authentication directly
        response = supabase_client.auth.sign_in_with_password({
            "email": login_data.email,
            "password": login_data.password
        })
        
        # Extract user and session from response
        user = response.user
        session = response.session
        
        if not user or not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        return {
            "access_token": session.access_token,
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