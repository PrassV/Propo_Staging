from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class TenantStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"

class TenantDocument(BaseModel):
    url: str
    name: str
    type: str
    uploaded_at: datetime

class TenantBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    status: TenantStatus = TenantStatus.ACTIVE

class TenantCreate(TenantBase):
    property_id: str
    monthly_rent: float
    security_deposit: float
    lease_start_date: datetime
    lease_end_date: datetime
    rent_payment_day: int = Field(1, ge=1, le=31)
    
class TenantUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    status: Optional[TenantStatus] = None
    monthly_rent: Optional[float] = None
    security_deposit: Optional[float] = None
    lease_start_date: Optional[datetime] = None
    lease_end_date: Optional[datetime] = None
    rent_payment_day: Optional[int] = Field(None, ge=1, le=31)

class Tenant(TenantBase):
    id: str
    property_id: str
    owner_id: str
    monthly_rent: float
    security_deposit: float
    lease_start_date: datetime
    lease_end_date: datetime
    rent_payment_day: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    documents: Optional[List[TenantDocument]] = None
    
    class Config:
        from_attributes = True 