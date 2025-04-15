from typing import Dict, List, Any
from fastapi import APIRouter, Depends, HTTPException, Path, status, Body
from app.config.auth import get_current_user
from app.models.user import UserUpdate, User
from app.services import user_service
import logging
from app.config.database import get_supabase_client_authenticated
from app.config.database import Client

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

@router.get("/me")
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.put("/me", response_model=Any)
async def update_current_user_profile(update_data: Dict[str, Any] = Body(...), current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Update current authenticated user's profile.
    
    Args:
        update_data: The profile data to update
        current_user: The current authenticated user
        
    Returns:
        Updated user profile
    """
    # Get user ID from the token payload
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user_id = None
    # Safely extract user_id to avoid serialization issues
    if isinstance(current_user, dict):
        user_id = current_user.get("id")
    elif hasattr(current_user, "id"):
        user_id = current_user.id
    
    if not user_id:
        logger.error(f"User ID missing in auth token payload")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials - user ID missing"
        )
    
    # --- Get Email --- 
    user_email = None
    if isinstance(current_user, dict):
        user_email = current_user.get("email")
    elif hasattr(current_user, "email"):
        user_email = current_user.email
    
    if not user_email:
         logger.warning(f"User email missing in auth token payload for user {user_id}. Update might fail if profile needs creation.")
    # --- End Get Email ---
    
    # Use dict method if available, otherwise manually handle fields
    update_dict = {}
    if hasattr(update_data, "dict"):
        try:
            update_dict = update_data.dict(exclude_unset=True)
            logger.info(f"Created update dict using dict() method: {update_dict}")
        except Exception as e:
            logger.error(f"Error using dict() method: {e}")
            update_dict = {}  # Reset and try fallback
    
    # Fallback if dict method doesn't work or is not available
    if not update_dict:
        fields = ["first_name", "last_name", "phone", "address_line1", "address_line2", 
                 "city", "state", "pincode", "user_type"]
        
        for field in fields:
            if field in update_data and update_data[field] is not None:
                update_dict[field] = update_data[field]
        
        # If role is passed from frontend, use it for user_type
        if update_data.get("role") and not update_dict.get("user_type"):
            update_dict["user_type"] = update_data.get("role")
            logger.info(f"Converting role to user_type: {update_dict['user_type']}")
        
        logger.info(f"Created update dict manually: {update_dict}")
    
    # Remove None values
    update_dict = {k: v for k, v in update_dict.items() if v is not None}
    
    try:
        logger.info(f"Attempting to update user profile for user {user_id}")
        
        # Use the user service to update the profile, passing email
        updated_user = user_service.update_user_profile(user_id, UserUpdate(**update_dict), email=user_email)
        
        if not updated_user:
            logger.warning(f"Profile update through service failed for user {user_id}, trying direct DB access")
            # Try direct DB access
            from app.config.database import supabase_client
            insert_data = {"id": user_id, **update_dict}
            upsert_response = supabase_client.table("profiles").upsert(insert_data).execute()
            
            if upsert_response and hasattr(upsert_response, 'data') and upsert_response.data:
                logger.info(f"Direct upsert successful: {upsert_response.data}")
                updated_user = upsert_response.data[0] if isinstance(upsert_response.data, list) else upsert_response.data
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update user profile"
                )
        
        # Clean the response to avoid serialization issues
        clean_response = {
            "id": user_id,
            **{k: v for k, v in update_dict.items() if v is not None}
        }
        
        return clean_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile in user router: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )

@router.get("/{user_id}")
async def get_user_info(
    user_id: str = Path(..., description="The user ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """Get information for a specific user (for admin use)"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    # Safe extraction of user_type and current_user_id
    user_type = current_user.get("user_type") if isinstance(current_user, dict) else getattr(current_user, "user_type", None)
    current_user_id = current_user.get("id") if isinstance(current_user, dict) else getattr(current_user, "id", None)
    
    if current_user_id != user_id and user_type != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this user's information")
    
    # Call service with db_client
    try:
        requested_user = user_service.get_user_profile(db_client, user_id)
        if not requested_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requested user profile not found")
        return requested_user
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Unexpected error fetching profile for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred while fetching user profile.") 