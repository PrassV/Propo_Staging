from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, Path, status
from app.config.auth import get_current_user
from app.models.user import UserUpdate
from app.services import user_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.get("/me")
async def get_current_user_info(current_user: Dict = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.put("/me")
async def update_current_user_profile(
    update_data: UserUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update the profile for the currently authenticated user."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    
    try:
        updated_user = await user_service.update_user_profile(user_id, update_data)
        if not updated_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found or update failed")
        
        return updated_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update profile")

@router.get("/{user_id}")
async def get_user_info(
    user_id: str = Path(..., description="The user ID"),
    current_user: Dict = Depends(get_current_user)
):
    """Get information for a specific user (for admin use)"""
    if current_user.get("id") != user_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this user's information")
    
    return {"id": user_id, "email": f"user{user_id}@example.com", "name": f"User {user_id}"} 