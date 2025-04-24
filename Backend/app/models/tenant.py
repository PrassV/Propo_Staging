from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import List, Optional
from datetime import datetime, date
from enum import Enum
import uuid

# Potential Enums (adjust based on actual usage/validation needs)
class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"

class IdType(str, Enum):
    PASSPORT = "passport"
    DRIVING_LICENSE = "driving_license"
    NATIONAL_ID = "national_id"
    OTHER = "other"

class RentalType(str, Enum):
    RENT = "rent"
    LEASE = "lease"

class RentalFrequency(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"
    OTHER = "other"

class UtilityResponsibility(str, Enum):
    TENANT = "tenant"
    OWNER = "owner"
    SPLIT = "split"

class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"

# New enum for tenant status
class TenantStatus(str, Enum):
    ACTIVE = "active"
    UNASSIGNED = "unassigned"
    INACTIVE = "inactive"

# --- Tenant Model --- Based on tenants table
class TenantBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None # Required for invites/login?
    dob: Optional[date] = None
    gender: Optional[Gender] = None
    family_size: Optional[int] = Field(None, ge=1)
    permanent_address: Optional[str] = None
    id_type: Optional[IdType] = None
    id_number: Optional[str] = None
    id_proof_url: Optional[HttpUrl] = None
    status: Optional[TenantStatus] = TenantStatus.UNASSIGNED

    # Default/Current Rental/Lease Info (consider moving to a Lease model later)
    rental_type: Optional[RentalType] = None
    rental_frequency: Optional[RentalFrequency] = None
    rental_amount: Optional[float] = Field(None, ge=0)
    advance_amount: Optional[float] = Field(None, ge=0)
    rental_start_date: Optional[date] = None
    rental_end_date: Optional[date] = None # Optional for ongoing rentals
    lease_amount: Optional[float] = Field(None, ge=0)
    lease_start_date: Optional[date] = None
    lease_end_date: Optional[date] = None
    maintenance_fee: Optional[float] = Field(None, ge=0)
    notice_period_days: Optional[int] = Field(None, ge=0)

    # Responsibilities
    electricity_responsibility: Optional[UtilityResponsibility] = None
    water_responsibility: Optional[UtilityResponsibility] = None
    property_tax_responsibility: Optional[UtilityResponsibility] = None

    # Other fields from schema
    university: Optional[str] = None # If applicable

class TenantCreate(TenantBase):
    # Removed property_id and unit fields as per requirements
    # Status defaults to "unassigned"
    email: EmailStr # Make email mandatory for creation/invitation

class TenantUpdate(BaseModel):
    # Make all fields optional for partial updates
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    dob: Optional[date] = None
    gender: Optional[Gender] = None
    family_size: Optional[int] = Field(None, ge=1)
    permanent_address: Optional[str] = None
    id_type: Optional[IdType] = None
    id_number: Optional[str] = None
    id_proof_url: Optional[HttpUrl] = None
    status: Optional[TenantStatus] = None
    rental_type: Optional[RentalType] = None
    rental_frequency: Optional[RentalFrequency] = None
    rental_amount: Optional[float] = Field(None, ge=0)
    advance_amount: Optional[float] = Field(None, ge=0)
    rental_start_date: Optional[date] = None
    rental_end_date: Optional[date] = None
    lease_amount: Optional[float] = Field(None, ge=0)
    lease_start_date: Optional[date] = None
    lease_end_date: Optional[date] = None
    maintenance_fee: Optional[float] = Field(None, ge=0)
    notice_period_days: Optional[int] = Field(None, ge=0)
    electricity_responsibility: Optional[UtilityResponsibility] = None
    water_responsibility: Optional[UtilityResponsibility] = None
    property_tax_responsibility: Optional[UtilityResponsibility] = None
    university: Optional[str] = None

class Tenant(TenantBase):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None # Link to Supabase auth.users
    created_at: datetime
    updated_at: Optional[datetime] = None
    # We might add fields from property_tenants here if needed for specific views
    # e.g., current_property_id, current_unit_number, current_tenancy_start_date

    class Config:
        from_attributes = True # Enable ORM mode

# Model for the property_tenants relationship (Lease/Tenancy)
class PropertyTenantLinkBase(BaseModel):
    property_id: uuid.UUID
    tenant_id: uuid.UUID
    unit_number: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None

class PropertyTenantLinkCreate(PropertyTenantLinkBase):
    # Make unit_id and tenant_id required as per requirements
    unit_id: uuid.UUID  # Added unit_id field

class PropertyTenantLinkUpdate(BaseModel):
    unit_number: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class PropertyTenantLink(PropertyTenantLinkBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Model for Tenant Invitation (based on tenant_invitations table)
class TenantInvitationBase(BaseModel):
    email: EmailStr
    property_id: uuid.UUID
    # tenant_id is often set *after* creation when linking to an existing tenant record

class TenantInvitationCreate(TenantInvitationBase):
    pass # owner_id added by service

class TenantInvitation(TenantInvitationBase):
    id: uuid.UUID
    tenant_id: Optional[uuid.UUID] = None
    owner_id: uuid.UUID
    token: str
    status: str # e.g., pending, accepted, expired
    expires_at: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Model for tenant assignment to unit
class TenantAssignment(BaseModel):
    tenant_id: uuid.UUID
    lease_start: date
    lease_end: Optional[date] = None
    rent_amount: Optional[float] = None
    deposit_amount: Optional[float] = None
    notes: Optional[str] = None
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "tenant_id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
                "lease_start": "2024-01-01",
                "lease_end": "2024-12-31",
                "rent_amount": 1500.00,
                "deposit_amount": 1500.00,
                "notes": "Monthly rent due on the 1st"
            }
        }
    }

# New model for tenant reactivation
class TenantReactivation(BaseModel):
    pass  # Empty model as we just need the tenant_id from the URL