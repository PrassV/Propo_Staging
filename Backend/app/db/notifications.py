from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from supabase import Client

logger = logging.getLogger(__name__)

async def get_user_notifications(
    user_id: str, 
    is_read: bool = None, 
    limit: int = 50, 
    offset: int = 0,
    db_client: Client = None
) -> List[Dict[str, Any]]:
    """
    Get notifications for a user from Supabase.
    
    Args:
        user_id: The user ID to get notifications for
        is_read: Optional filter for read/unread notifications
        limit: Maximum number of notifications to return
        offset: Offset for pagination
        db_client: Authenticated Supabase client (required for RLS)
        
    Returns:
        List of notifications
    """
    try:
        if not db_client:
            logger.error("Database client is required for notifications access")
            return []
            
        query = db_client.table('notifications').select('*').eq('user_id', user_id)
        
        if is_read is not None:
            query = query.eq('is_read', is_read)
            
        # Order by most recent
        query = query.order('created_at', desc=True).limit(limit).offset(offset)
        
        response = query.execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching notifications: {response.error}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get notifications for user {user_id}: {str(e)}")
        return []

async def get_notification_by_id(notification_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a notification by ID from Supabase.
    
    Args:
        notification_id: The notification ID
        
    Returns:
        Notification data or None if not found
    """
    try:
        response = supabase_client.table('notifications').select('*').eq('id', notification_id).single().execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching notification: {response['error']}")
            return None
        
        return response.data
    except Exception as e:
        logger.error(f"Failed to get notification {notification_id}: {str(e)}")
        return None

async def create_notification(notification_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new notification in Supabase.
    
    Args:
        notification_data: The notification data to insert
        
    Returns:
        Created notification data or None if creation failed
    """
    try:
        response = supabase_client.table('notifications').insert(notification_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating notification: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create notification: {str(e)}")
        return None

async def update_notification(notification_id: str, notification_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a notification in Supabase.
    
    Args:
        notification_id: The notification ID to update
        notification_data: The updated notification data
        
    Returns:
        Updated notification data or None if update failed
    """
    try:
        # Add updated_at timestamp
        notification_data['updated_at'] = datetime.utcnow().isoformat()
        
        response = supabase_client.table('notifications').update(notification_data).eq('id', notification_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating notification: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update notification {notification_id}: {str(e)}")
        return None

async def mark_notification_as_read(notification_id: str) -> Optional[Dict[str, Any]]:
    """
    Mark a notification as read in Supabase.
    
    Args:
        notification_id: The notification ID to mark as read
        
    Returns:
        Updated notification data or None if update failed
    """
    try:
        update_data = {
            'is_read': True,
            'read_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
        }
        
        response = supabase_client.table('notifications').update(update_data).eq('id', notification_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error marking notification as read: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to mark notification as read {notification_id}: {str(e)}")
        return None

async def mark_all_notifications_as_read(user_id: str) -> bool:
    """
    Mark all notifications as read for a user in Supabase.
    
    Args:
        user_id: The user ID to mark all notifications as read for
        
    Returns:
        True if operation succeeded, False otherwise
    """
    try:
        update_data = {
            'is_read': True,
            'read_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
        }
        
        response = supabase_client.table('notifications').update(update_data).eq('user_id', user_id).eq('is_read', False).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error marking all notifications as read: {response['error']}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to mark all notifications as read for user {user_id}: {str(e)}")
        return False

async def delete_notification(notification_id: str) -> bool:
    """
    Delete a notification from Supabase.
    
    Args:
        notification_id: The notification ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('notifications').delete().eq('id', notification_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deleting notification: {response['error']}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to delete notification {notification_id}: {str(e)}")
        return False

async def get_notification_templates(notification_type: str = None) -> List[Dict[str, Any]]:
    """
    Get notification templates from Supabase.
    
    Args:
        notification_type: Optional notification type to filter by
        
    Returns:
        List of notification templates
    """
    try:
        query = supabase_client.table('notification_templates').select('*')
        
        if notification_type:
            query = query.eq('notification_type', notification_type)
        
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching notification templates: {response['error']}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get notification templates: {str(e)}")
        return []

async def get_notification_settings(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get notification settings for a user from Supabase.
    
    Args:
        user_id: The user ID to get settings for
        
    Returns:
        Notification settings or None if not found
    """
    try:
        response = supabase_client.table('notification_settings').select('*').eq('user_id', user_id).single().execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching notification settings: {response['error']}")
            return None
        
        return response.data
    except Exception as e:
        logger.error(f"Failed to get notification settings for user {user_id}: {str(e)}")
        return None

async def create_notification_settings(settings_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create notification settings for a user in Supabase.
    
    Args:
        settings_data: The settings data to insert
        
    Returns:
        Created settings data or None if creation failed
    """
    try:
        response = supabase_client.table('notification_settings').insert(settings_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating notification settings: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create notification settings: {str(e)}")
        return None

async def update_notification_settings(user_id: str, settings_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update notification settings for a user in Supabase.
    
    Args:
        user_id: The user ID to update settings for
        settings_data: The updated settings data
        
    Returns:
        Updated settings data or None if update failed
    """
    try:
        # Add updated_at timestamp
        settings_data['updated_at'] = datetime.utcnow().isoformat()
        
        response = supabase_client.table('notification_settings').update(settings_data).eq('user_id', user_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating notification settings: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update notification settings for user {user_id}: {str(e)}")
        return None 