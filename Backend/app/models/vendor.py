from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from .maintenance import MaintenanceCategory

class VendorStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING_VERIFICATION = "pending_verification"

class VendorBase(BaseModel):
    name: str
    company: Optional[str] = None
    categories: List[MaintenanceCategory]
    phone: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    description: Optional[str] = None
    hourly_rate: Optional[float] = None
    rating: Optional[float] = Field(None, ge=0, le=5)
    
class VendorCreate(VendorBase):
    pass

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    categories: Optional[List[MaintenanceCategory]] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    description: Optional[str] = None
    hourly_rate: Optional[float] = None
    rating: Optional[float] = Field(None, ge=0, le=5)
    status: Optional[VendorStatus] = None

class Vendor(VendorBase):
    id: str
    owner_id: str
    status: VendorStatus = VendorStatus.ACTIVE
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_jobs: Optional[int] = 0
    
    class Config:
        from_attributes = True 