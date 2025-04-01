from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import uuid

from app.models.notification import (
    NotificationCreate,
    NotificationUpdate,
    Notification,
    NotificationSettings
)
from app.services import notification_service
from app.config.auth import get_current_user

router = APIRouter()

# Response models
class NotificationResponse(BaseModel):
    notification: Dict[str, Any]
    message: str = "Success"

class NotificationsResponse(BaseModel):
    notifications: List[Dict[str, Any]]
    count: int
    unread_count: int
    message: str = "Success"

class NotificationSettingsResponse(BaseModel):
    settings: Dict[str, Any]
    message: str = "Success"

@router.get("/", response_model=NotificationsResponse)
async def get_notifications(
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    limit: int = Query(50, description="Maximum number of notifications to return"),
    offset: int = Query(0, description="Offset for pagination"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get notifications for the current user.
    
    Args:
        is_read: Optional filter by read status
        limit: Maximum number of notifications to return
        offset: Offset for pagination
        current_user: The current authenticated user
        
    Returns:
        List of notifications
    """
    # Get notifications
    notifications = await notification_service.get_user_notifications(
        current_user["id"],
        is_read,
        limit,
        offset
    )
    
    # Get unread count
    unread_notifications = await notification_service.get_user_notifications(
        current_user["id"],
        is_read=False
    )
    
    return {
        "notifications": notifications,
        "count": len(notifications),
        "unread_count": len(unread_notifications),
        "message": "Notifications retrieved successfully"
    }

@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: str = Path(..., description="The notification ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific notification by ID.
    
    Args:
        notification_id: The notification ID
        current_user: The current authenticated user
        
    Returns:
        Notification details
    """
    notification = await notification_service.get_notification(notification_id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Check if the notification belongs to the user
    if notification["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this notification"
        )
    
    return {
        "notification": notification,
        "message": "Notification retrieved successfully"
    }

@router.post("/", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new notification (admin only).
    
    Args:
        notification_data: The notification data
        current_user: The current authenticated user
        
    Returns:
        Created notification
    """
    # Only admins should be able to create notifications directly
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create notifications directly"
        )
    
    notification = await notification_service.create_notification(notification_data)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create notification"
        )
    
    return {
        "notification": notification,
        "message": "Notification created successfully"
    }

@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_as_read(
    notification_id: str = Path(..., description="The notification ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Mark a notification as read.
    
    Args:
        notification_id: The notification ID
        current_user: The current authenticated user
        
    Returns:
        Updated notification
    """
    # Check if the notification exists and belongs to the user
    notification = await notification_service.get_notification(notification_id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    if notification["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this notification"
        )
    
    updated_notification = await notification_service.mark_notification_as_read(notification_id)
    
    if not updated_notification:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read"
        )
    
    return {
        "notification": updated_notification,
        "message": "Notification marked as read successfully"
    }

@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_as_read(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Mark all notifications as read for the current user.
    
    Args:
        current_user: The current authenticated user
        
    Returns:
        Success message
    """
    success = await notification_service.mark_all_notifications_as_read(current_user["id"])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark all notifications as read"
        )
    
    return {
        "message": "All notifications marked as read successfully"
    }

@router.delete("/{notification_id}", status_code=status.HTTP_200_OK)
async def delete_notification(
    notification_id: str = Path(..., description="The notification ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a notification.
    
    Args:
        notification_id: The notification ID
        current_user: The current authenticated user
        
    Returns:
        Success message
    """
    # Check if the notification exists and belongs to the user
    notification = await notification_service.get_notification(notification_id)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    if notification["user_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this notification"
        )
    
    success = await notification_service.delete_notification(notification_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification"
        )
    
    return {
        "message": "Notification deleted successfully"
    }

@router.get("/settings", response_model=NotificationSettingsResponse)
async def get_notification_settings(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get notification settings for the current user.
    
    Args:
        current_user: The current authenticated user
        
    Returns:
        Notification settings
    """
    settings = await notification_service.get_notification_settings(current_user["id"])
    
    if not settings:
        # Return default settings if none exist
        settings = {
            "user_id": current_user["id"],
            "enabled_types": {},
            "preferred_methods": {},
            "quiet_hours_start": None,
            "quiet_hours_end": None
        }
    
    return {
        "settings": settings,
        "message": "Notification settings retrieved successfully"
    }

@router.put("/settings", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    settings_data: Dict[str, Any] = Body(..., description="The notification settings data"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update notification settings for the current user.
    
    Args:
        settings_data: The notification settings data
        current_user: The current authenticated user
        
    Returns:
        Updated notification settings
    """
    settings = await notification_service.create_or_update_notification_settings(
        current_user["id"],
        settings_data
    )
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification settings"
        )
    
    return {
        "settings": settings,
        "message": "Notification settings updated successfully"
    } 