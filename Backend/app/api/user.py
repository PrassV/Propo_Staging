from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, Path
from ..config.auth import get_current_user

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.get("/me")
async def get_current_user_info(current_user: Dict = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.get("/{user_id}")
async def get_user_info(
    user_id: str = Path(..., description="The user ID"),
    current_user: Dict = Depends(get_current_user)
):
    """Get information for a specific user (for admin use)"""
    # Check if current user is admin or getting their own profile
    if current_user.get("id") != user_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access this user's information")
    
    # In a real application, you'd fetch user data from a database
    # For now, we'll just return a placeholder
    return {"id": user_id, "email": f"user{user_id}@example.com", "name": f"User {user_id}"} 