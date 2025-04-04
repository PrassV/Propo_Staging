from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, Path, status
from app.config.auth import get_current_user
from app.models.user import UserUpdate, User
from app.services import user_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.put("/me")
async def update_current_user_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update the profile for the currently authenticated user."""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials - User not found")

    # Safely extract user_id
    user_id = None
    try:
        if isinstance(current_user, dict):
            user_id = current_user.get("id")
        elif hasattr(current_user, "id"):
            user_id = current_user.id
        else:
            logger.error(f"Couldn't extract ID from current_user type: {type(current_user)}")
    except Exception as e:
        logger.error(f"Error extracting user ID: {str(e)}")
    
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials - User ID missing")
    
    try:
        # Get only the fields that were actually provided
        update_dict = {}
        if hasattr(update_data, "model_dump"):
            update_dict = update_data.model_dump(exclude_unset=True)
        elif hasattr(update_data, "dict"):
            update_dict = update_data.dict(exclude_unset=True)
        else:
            # Fallback for when Pydantic model methods aren't available
            for field in ["first_name", "last_name", "phone", "address_line1", 
                         "address_line2", "city", "state", "pincode", "role"]:
                if hasattr(update_data, field) and getattr(update_data, field) is not None:
                    update_dict[field] = getattr(update_data, field)
        
        logger.info(f"Updating user {user_id} with data: {update_dict}")
        
        updated_user = user_service.update_user_profile(user_id, update_data)
        if not updated_user:
            logger.error(f"Failed to update profile through service, trying direct DB access")
            # Try direct upsert as last resort
            from app.config.database import supabase_client
            try:
                # Prepare insert data
                insert_data = {"id": user_id, **update_dict}
                # Try direct upsert
                upsert_response = supabase_client.table("profiles").upsert(insert_data).execute()
                
                if upsert_response and hasattr(upsert_response, 'data') and upsert_response.data:
                    logger.info(f"Direct upsert successful: {upsert_response.data}")
                    updated_user = upsert_response.data[0] if isinstance(upsert_response.data, list) else upsert_response.data
                else:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found or update failed")
            except Exception as direct_error:
                logger.error(f"Direct upsert failed: {direct_error}")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found or update failed after all attempts")
        
        # Clean response to avoid serialization issues
        clean_response = {
            "id": user_id,
            **{k: v for k, v in update_dict.items() if v is not None}
        }
        
        return clean_response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update profile")

@router.get("/{user_id}")
async def get_user_info(
    user_id: str = Path(..., description="The user ID"),
    current_user: User = Depends(get_current_user)
):
    """Get information for a specific user (for admin use)"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    if current_user.id != user_id and getattr(current_user, 'role', None) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this user's information")
    
    if current_user.id == user_id or getattr(current_user, 'role', None) == "admin":
        requested_user = user_service.get_user_profile(user_id)
        if not requested_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requested user profile not found")
        return requested_user

    return {"id": user_id, "email": f"user{user_id}@example.com", "name": f"User {user_id}"} 