from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

from ..config.settings import settings

logger = logging.getLogger(__name__)
security = HTTPBearer()

def decode_jwt_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: The JWT token to decode
        
    Returns:
        Dict containing the decoded token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        # For Supabase JWT tokens, we'll use their JWT secret for validation
        # In a real scenario, you would need to get this from your Supabase instance
        payload = jwt.decode(
            token, 
            settings.SUPABASE_JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Check if token has expired
        if payload.get('exp') and datetime.utcnow() > datetime.utcfromtimestamp(payload['exp']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return payload
        
    except JWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication error",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Get the current authenticated user from the JWT token.
    
    Args:
        credentials: The HTTP Authorization credentials
        
    Returns:
        Dict containing the user information from the token
        
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    payload = decode_jwt_token(token)
    
    # Extract user information from token payload
    # For Supabase, user info is typically in the 'user' claim
    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Return user information from token
    # In a real application, you might want to fetch additional user details from the database
    return {
        "id": user_id,
        "email": payload.get('email', ''),
        "role": payload.get('role', 'user'),
    }

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token for authentication"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.JWT_SECRET_KEY, 
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token"""
    return jwt.decode(
        token, 
        settings.JWT_SECRET_KEY, 
        algorithms=[settings.JWT_ALGORITHM]
    ) 