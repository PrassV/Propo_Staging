from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    PAYMENT_DUE = "payment_due"
    PAYMENT_RECEIVED = "payment_received"
    PAYMENT_OVERDUE = "payment_overdue"
    MAINTENANCE_REQUEST = "maintenance_request"
    MAINTENANCE_UPDATE = "maintenance_update"
    LEASE_EXPIRY = "lease_expiry"
    DOCUMENT_UPLOADED = "document_uploaded"
    PROPERTY_UPDATE = "property_update"
    TENANT_UPDATE = "tenant_update"
    SYSTEM = "system"

class NotificationMethod(str, Enum):
    EMAIL = "email"
    IN_APP = "in_app"
    PUSH = "push"

class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    READ = "read"
    FAILED = "failed"

class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class NotificationBase(BaseModel):
    user_id: str
    notification_type: NotificationType
    title: str
    message: str
    priority: NotificationPriority = NotificationPriority.MEDIUM
    entity_type: Optional[str] = None  # e.g., "payment", "maintenance", "lease"
    entity_id: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None
    methods: List[NotificationMethod] = [NotificationMethod.IN_APP]

class NotificationCreate(NotificationBase):
    pass

class NotificationUpdate(BaseModel):
    status: Optional[NotificationStatus] = None
    is_read: Optional[bool] = None
    read_at: Optional[datetime] = None

class Notification(NotificationBase):
    id: str
    status: NotificationStatus = NotificationStatus.PENDING
    is_read: bool = False
    read_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class NotificationTemplate(BaseModel):
    id: str
    template_name: str
    notification_type: NotificationType
    subject_template: str
    message_template: str
    default_methods: List[NotificationMethod]
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class NotificationSettings(BaseModel):
    id: str
    user_id: str
    enabled_types: Dict[NotificationType, bool]  # Map of notification type to enabled status
    preferred_methods: Dict[NotificationType, List[NotificationMethod]]  # Map of notification type to preferred methods
    quiet_hours_start: Optional[int] = None  # Hour of day (0-23)
    quiet_hours_end: Optional[int] = None  # Hour of day (0-23)
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True 