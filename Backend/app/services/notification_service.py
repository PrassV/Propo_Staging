from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
import uuid

from ..db import notifications as notifications_db
from ..models.notification import (
    NotificationCreate, 
    NotificationUpdate, 
    NotificationType,
    NotificationMethod,
    NotificationStatus,
    NotificationPriority
)

logger = logging.getLogger(__name__)

async def get_user_notifications(
    user_id: str,
    is_read: bool = None,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Get notifications for a user.
    
    Args:
        user_id: The user ID to get notifications for
        is_read: Optional filter for read/unread notifications
        limit: Maximum number of notifications to return
        offset: Offset for pagination
        
    Returns:
        List of notifications
    """
    return await notifications_db.get_user_notifications(user_id, is_read, limit, offset)

async def get_notification(notification_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a notification by ID.
    
    Args:
        notification_id: The notification ID
        
    Returns:
        Notification data or None if not found
    """
    return await notifications_db.get_notification_by_id(notification_id)

async def create_notification(notification_data: NotificationCreate) -> Optional[Dict[str, Any]]:
    """
    Create a new notification.
    
    Args:
        notification_data: The notification data
        
    Returns:
        Created notification data or None if creation failed
    """
    try:
        # Convert Pydantic model to dict and add required fields
        notification_dict = notification_data.model_dump()
        notification_dict['id'] = str(uuid.uuid4())
        notification_dict['status'] = NotificationStatus.PENDING.value
        notification_dict['is_read'] = False
        notification_dict['created_at'] = datetime.utcnow().isoformat()
        
        # Create the notification in the database
        notification = await notifications_db.create_notification(notification_dict)
        
        if notification:
            # Send the notification (if not in-app only)
            methods = notification_data.methods
            if any(method != NotificationMethod.IN_APP for method in methods):
                await send_notification(notification['id'])
            
        return notification
    except Exception as e:
        logger.error(f"Failed to create notification: {str(e)}")
        return None

async def update_notification(notification_id: str, notification_data: NotificationUpdate) -> Optional[Dict[str, Any]]:
    """
    Update a notification.
    
    Args:
        notification_id: The notification ID to update
        notification_data: The updated notification data
        
    Returns:
        Updated notification data or None if update failed
    """
    try:
        # Convert Pydantic model to dict, filtering out None values
        update_dict = {k: v for k, v in notification_data.model_dump().items() if v is not None}
        
        # Update the notification
        return await notifications_db.update_notification(notification_id, update_dict)
    except Exception as e:
        logger.error(f"Failed to update notification {notification_id}: {str(e)}")
        return None

async def mark_notification_as_read(notification_id: str) -> Optional[Dict[str, Any]]:
    """
    Mark a notification as read.
    
    Args:
        notification_id: The notification ID to mark as read
        
    Returns:
        Updated notification data or None if update failed
    """
    return await notifications_db.mark_notification_as_read(notification_id)

async def mark_all_notifications_as_read(user_id: str) -> bool:
    """
    Mark all notifications as read for a user.
    
    Args:
        user_id: The user ID to mark all notifications as read for
        
    Returns:
        True if operation succeeded, False otherwise
    """
    return await notifications_db.mark_all_notifications_as_read(user_id)

async def delete_notification(notification_id: str) -> bool:
    """
    Delete a notification.
    
    Args:
        notification_id: The notification ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    return await notifications_db.delete_notification(notification_id)

async def send_notification(notification_id: str) -> bool:
    """
    Send a notification using its configured methods.
    
    Args:
        notification_id: The notification ID to send
        
    Returns:
        True if sending succeeded, False otherwise
    """
    try:
        # Get the notification
        notification = await notifications_db.get_notification_by_id(notification_id)
        if not notification:
            logger.error(f"Notification {notification_id} not found for sending")
            return False
            
        # Get user notification settings
        settings = await notifications_db.get_notification_settings(notification['user_id'])
        
        # Check if the user has disabled this notification type
        if settings and not settings.get('enabled_types', {}).get(notification['notification_type'], True):
            logger.info(f"Notification {notification_id} not sent as user has disabled this type")
            await notifications_db.update_notification(notification_id, {
                'status': NotificationStatus.FAILED.value,
                'updated_at': datetime.utcnow().isoformat()
            })
            return False
            
        # Get the methods to use
        methods = notification.get('methods', [NotificationMethod.IN_APP.value])
        
        # Override with user preferences if available
        if settings and notification['notification_type'] in settings.get('preferred_methods', {}):
            methods = settings['preferred_methods'][notification['notification_type']]
            
        success = True
        
        # Send the notification through each method
        for method in methods:
            if method == NotificationMethod.EMAIL.value:
                success = success and await send_email_notification(notification)
            elif method == NotificationMethod.SMS.value:
                success = success and await send_sms_notification(notification)
            elif method == NotificationMethod.PUSH.value:
                success = success and await send_push_notification(notification)
        
        # Update notification status
        new_status = NotificationStatus.SENT.value if success else NotificationStatus.FAILED.value
        sent_at = datetime.utcnow().isoformat() if success else None
        
        await notifications_db.update_notification(notification_id, {
            'status': new_status,
            'sent_at': sent_at,
            'updated_at': datetime.utcnow().isoformat()
        })
        
        return success
    except Exception as e:
        logger.error(f"Failed to send notification {notification_id}: {str(e)}")
        await notifications_db.update_notification(notification_id, {
            'status': NotificationStatus.FAILED.value,
            'updated_at': datetime.utcnow().isoformat()
        })
        return False

async def send_email_notification(notification: Dict[str, Any]) -> bool:
    """
    Send a notification via email.
    
    Args:
        notification: The notification data
        
    Returns:
        True if sending succeeded, False otherwise
    """
    try:
        # In a real implementation, this would send an email
        # For demonstration, just log it
        logger.info(f"Sending email notification: {notification['title']} to user {notification['user_id']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email notification: {str(e)}")
        return False

async def send_sms_notification(notification: Dict[str, Any]) -> bool:
    """
    Send a notification via SMS.
    
    Args:
        notification: The notification data
        
    Returns:
        True if sending succeeded, False otherwise
    """
    try:
        # In a real implementation, this would send an SMS
        # For demonstration, just log it
        logger.info(f"Sending SMS notification: {notification['title']} to user {notification['user_id']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS notification: {str(e)}")
        return False

async def send_push_notification(notification: Dict[str, Any]) -> bool:
    """
    Send a notification via push notification.
    
    Args:
        notification: The notification data
        
    Returns:
        True if sending succeeded, False otherwise
    """
    try:
        # In a real implementation, this would send a push notification
        # For demonstration, just log it
        logger.info(f"Sending push notification: {notification['title']} to user {notification['user_id']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send push notification: {str(e)}")
        return False

async def get_notification_settings(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get notification settings for a user.
    
    Args:
        user_id: The user ID to get settings for
        
    Returns:
        Notification settings or None if not found
    """
    return await notifications_db.get_notification_settings(user_id)

async def create_or_update_notification_settings(user_id: str, settings_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create or update notification settings for a user.
    
    Args:
        user_id: The user ID to create/update settings for
        settings_data: The settings data
        
    Returns:
        Created/updated settings data or None if operation failed
    """
    try:
        # Check if settings already exist
        existing_settings = await notifications_db.get_notification_settings(user_id)
        
        if existing_settings:
            # Update existing settings
            settings_data['updated_at'] = datetime.utcnow().isoformat()
            return await notifications_db.update_notification_settings(user_id, settings_data)
        else:
            # Create new settings
            settings_data['id'] = str(uuid.uuid4())
            settings_data['user_id'] = user_id
            settings_data['created_at'] = datetime.utcnow().isoformat()
            return await notifications_db.create_notification_settings(settings_data)
    except Exception as e:
        logger.error(f"Failed to create/update notification settings for user {user_id}: {str(e)}")
        return None

async def create_notification_from_template(
    template_id: str,
    user_id: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    additional_data: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """
    Create a notification from a template.
    
    Args:
        template_id: The template ID to use
        user_id: The user ID to create the notification for
        entity_type: Optional entity type (e.g., "payment", "maintenance")
        entity_id: Optional entity ID
        additional_data: Optional additional data for variable replacement
        
    Returns:
        Created notification data or None if creation failed
    """
    try:
        # Get the template
        templates = await notifications_db.get_notification_templates()
        template = next((t for t in templates if t['id'] == template_id), None)
        
        if not template:
            logger.error(f"Notification template {template_id} not found")
            return None
            
        # Process the template to replace variables
        title = process_template_text(template['subject_template'], additional_data or {})
        message = process_template_text(template['message_template'], additional_data or {})
        
        # Create the notification
        notification_data = NotificationCreate(
            user_id=user_id,
            notification_type=template['notification_type'],
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            additional_data=additional_data,
            methods=template['default_methods']
        )
        
        return await create_notification(notification_data)
    except Exception as e:
        logger.error(f"Failed to create notification from template {template_id}: {str(e)}")
        return None

def process_template_text(template_text: str, data: Dict[str, Any]) -> str:
    """
    Process a template text by replacing variables.
    
    Args:
        template_text: The template text with variables in {{variable}} format
        data: The data to use for variable replacement
        
    Returns:
        Processed text with variables replaced
    """
    result = template_text
    
    # Replace variables in the format {{variable}}
    for key, value in data.items():
        placeholder = f"{{{{{key}}}}}"
        if placeholder in result:
            result = result.replace(placeholder, str(value))
            
    return result 