from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
import uuid
import os # For getting environment variables

# Resend imports
import resend

# Twilio imports
# from twilio.rest import Client # Removed

from ..db import notifications as notifications_db
from ..models.notification import (
    NotificationCreate, 
    NotificationUpdate, 
    NotificationType,
    NotificationMethod,
    NotificationStatus,
    NotificationPriority
)

# Import user service to get profile data
from ..services import user_service

# Get Resend API Key from environment variables
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
# Define a default sender email (Format: Name <email@domain.com>)
FROM_EMAIL = os.environ.get("DEFAULT_SENDER_EMAIL", "Propify <noreply@propify.app>")

# Get Twilio credentials from environment variables - Removed
# TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
# TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
# TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")

logger = logging.getLogger(__name__)

# Initialize Resend client globally if key exists
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
else:
    logger.warning("RESEND_API_KEY not found in environment. Email notifications will be disabled.")

# Initialize Twilio client globally if credentials exist - Removed
# twilio_client = None
# if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER:
#     try:
#         twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
#         logger.info("Twilio client initialized successfully.")
#     except Exception as e:
#         logger.error(f"Failed to initialize Twilio client: {e}", exc_info=True)
#         twilio_client = None # Ensure client is None if init fails
# else:
#     logger.warning("Twilio credentials not fully configured. SMS notifications will be disabled.")

async def get_user_notifications(
    user_id: str,
    is_read: bool = None,
    limit: int = 50,
    offset: int = 0,
    db_client = None
) -> List[Dict[str, Any]]:
    """
    Get notifications for a user.
    
    Args:
        user_id: The user ID to get notifications for
        is_read: Optional filter for read/unread notifications
        limit: Maximum number of notifications to return
        offset: Offset for pagination
        db_client: Authenticated Supabase client (required for RLS)
        
    Returns:
        List of notifications
    """
    return await notifications_db.get_user_notifications(user_id, is_read, limit, offset, db_client)

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
    """Orchestrates sending a notification via configured methods."""
    success = True # Assume success initially for IN_APP
    try:
        notification = await notifications_db.get_notification_by_id(notification_id)
        if not notification:
            logger.error(f"Notification {notification_id} not found for sending")
            return False

        # TODO: Implement user notification settings fetching & application
        # settings = await notifications_db.get_notification_settings(notification['user_id'])
        # Check if type disabled, override methods based on settings, etc.

        methods = notification.get('methods', [NotificationMethod.IN_APP.value])

        for method in methods:
            if method == NotificationMethod.EMAIL.value:
                if not RESEND_API_KEY:
                     logger.warning(f"Skipping email for notification {notification_id} as RESEND_API_KEY is not set.")
                     success = False # Consider this a failure if email was requested but couldn't be sent
                     continue

                # Fetch user profile using the user_service function
                user_profile = await user_service.get_user_profile(notification.get('user_id'))
                if user_profile and user_profile.get('email'):
                    email_sent = await send_email_notification(notification, user_profile['email'])
                    success = success and email_sent # Overall success depends on all requested methods succeeding
                else:
                    logger.error(f"Could not find email for user {notification.get('user_id')} to send notification {notification_id}")
                    success = False

            elif method == NotificationMethod.PUSH.value:
                 # Placeholder - needs implementation
                 logger.warning(f"Push notification sending not implemented for notification {notification_id}")
                 # success = success and await send_push_notification(notification)
                 success = False # Mark as fail if requested but not implemented

        # Update notification status based on overall success
        new_status = NotificationStatus.SENT.value if success else NotificationStatus.FAILED.value
        sent_at = datetime.utcnow().isoformat() if success else None
        await notifications_db.update_notification(notification_id, {
            'status': new_status,
            'sent_at': sent_at,
            'updated_at': datetime.utcnow().isoformat()
        })
        return success

    except Exception as e:
        logger.error(f"Failed to send notification {notification_id}: {str(e)}", exc_info=True)
        try:
            # Attempt to mark as failed in DB
            await notifications_db.update_notification(notification_id, {
                'status': NotificationStatus.FAILED.value,
                'updated_at': datetime.utcnow().isoformat()
            })
        except Exception as db_err:
            logger.error(f"CRITICAL: Failed to update notification {notification_id} status to FAILED after error: {db_err}")
        return False

async def send_email_notification(notification: Dict[str, Any], recipient_email: str) -> bool:
    """Send a notification via email using Resend."""
    if not RESEND_API_KEY:
        # This check is technically redundant due to the check in send_notification, but good practice
        logger.error("RESEND_API_KEY not configured. Cannot send email.")
        return False

    params = {
        "from": FROM_EMAIL,
        "to": [recipient_email],
        "subject": notification.get('title', 'New Notification from Propify'),
        "html": notification.get('message', 'You have a new notification.'), # Resend prefers HTML
        # "text": notification.get('message', 'You have a new notification.') # Optional text version
    }

    try:
        # Use the resend library (synchronous by default)
        # To make this truly async, you'd typically run sync code in an executor
        # For simplicity here, we call it directly. This will block the event loop.
        # Consider using something like anyio.to_thread.run_sync in a real async app
        email = resend.Emails.send(params)
        logger.info(f"Resend email initiated for notification {notification.get('id')}. Email ID: {email.get('id')}")
        # Resend's send doesn't directly confirm delivery, just acceptance.
        # We'll assume success if no exception is thrown.
        return True
    except Exception as e:
        logger.error(f"Failed to send Resend email for notification {notification.get('id')}: {e}", exc_info=True)
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

# --- Event-Based Notification Triggers --- 

async def notify_new_maintenance_request(request: Dict[str, Any]):
    """Creates notifications when a new maintenance request is submitted."""
    logger.info(f"Creating notification for new maintenance request {request.get('id')}")
    property_id = request.get('property_id')
    tenant_id = request.get('tenant_id') # User who submitted
    title = request.get('title', 'New Request')
    request_id = request.get('id')

    # TODO: Need logic to find the property owner(s)
    # owner_id = await property_db.get_property_owner(property_id)
    owner_id = "owner_placeholder_id" # Placeholder

    if not owner_id:
        logger.error(f"Cannot find owner for property {property_id} to notify about request {request_id}")
        return

    # 1. Notify the Property Owner
    owner_message = f"New maintenance request '{title}' submitted for property {property_id}."
    owner_notification_data = NotificationCreate(
        user_id=owner_id,
        title="New Maintenance Request",
        message=owner_message,
        notification_type=NotificationType.MAINTENANCE.value,
        priority=NotificationPriority.MEDIUM.value,
        methods=[NotificationMethod.IN_APP, NotificationMethod.EMAIL], # Example methods
        related_entity_id=request_id,
        related_entity_type="maintenance_request"
    )
    await create_notification(owner_notification_data)
    logger.info(f"Created notification for owner {owner_id} about request {request_id}")

    # 2. Notify the Tenant (Confirmation) - Optional
    if tenant_id:
        tenant_message = f"Your maintenance request '{title}' has been submitted successfully."
        tenant_notification_data = NotificationCreate(
            user_id=tenant_id,
            title="Maintenance Request Submitted",
            message=tenant_message,
            notification_type=NotificationType.MAINTENANCE.value,
            priority=NotificationPriority.LOW.value,
            methods=[NotificationMethod.IN_APP], # Just in-app confirmation
            related_entity_id=request_id,
            related_entity_type="maintenance_request"
        )
        await create_notification(tenant_notification_data)
        logger.info(f"Created confirmation notification for tenant {tenant_id} about request {request_id}")

# TODO: Add other trigger functions (e.g., notify_payment_due, notify_lease_ending, etc.) 