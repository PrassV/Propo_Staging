from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class MaintenanceCategory(str, Enum):
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    HVAC = "hvac"
    APPLIANCE = "appliance"
    STRUCTURAL = "structural"
    PEST_CONTROL = "pest_control"
    LANDSCAPING = "landscaping"
    CLEANING = "cleaning"
    OTHER = "other"

class MaintenanceStatus(str, Enum):
    NEW = "new"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class MaintenancePriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class MaintenanceImage(BaseModel):
    url: str
    caption: Optional[str] = None
    uploaded_at: datetime

class VendorDetails(BaseModel):
    id: Optional[str] = None
    name: str
    phone: str
    email: Optional[str] = None
    company: Optional[str] = None
    category: MaintenanceCategory

class MaintenanceBase(BaseModel):
    property_id: str
    title: str
    description: str
    category: MaintenanceCategory
    priority: MaintenancePriority = MaintenancePriority.MEDIUM
    access_instructions: Optional[str] = None

class MaintenanceCreate(MaintenanceBase):
    tenant_id: Optional[str] = None
    status: Optional[MaintenanceStatus] = MaintenanceStatus.NEW

class MaintenanceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[MaintenanceCategory] = None
    priority: Optional[MaintenancePriority] = None
    status: Optional[MaintenanceStatus] = None
    vendor_id: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    notes: Optional[str] = None
    access_instructions: Optional[str] = None

class MaintenanceRequest(MaintenanceBase):
    id: str
    owner_id: str
    tenant_id: Optional[str] = None
    vendor_id: Optional[str] = None
    status: MaintenanceStatus = MaintenanceStatus.NEW
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    notes: Optional[str] = None
    images: Optional[List[MaintenanceImage]] = None

    class Config:
        from_attributes = True

class MaintenanceComment(BaseModel):
    request_id: str
    user_id: str
    comment: str
    user_type: Optional[str] = "owner"  # owner, tenant, vendor
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True 