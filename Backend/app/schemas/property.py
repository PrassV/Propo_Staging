from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date
import uuid

# Phase 2: New Schemas for the Lease-Centric Endpoint

# Represents the tenant details as part of a lease.
# We only expose non-sensitive information.
class TenantLeaseDetail(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr

    class Config:
        from_attributes = True

# Represents the core details of an active lease agreement.
class LeaseDetail(BaseModel):
    id: uuid.UUID
    start_date: date
    end_date: date
    rent_amount: float
    status: str
    tenant: TenantLeaseDetail

    class Config:
        from_attributes = True

# Represents a single unit within a property, including its active lease if one exists.
class UnitDetail(BaseModel):
    id: uuid.UUID
    unit_number: str
    is_occupied: bool
    status: Optional[str] = None
    lease: Optional[LeaseDetail] = None

    class Config:
        from_attributes = True

# This is the main response model for the new /properties/{property_id}/details endpoint.
# It provides a comprehensive, lease-centric overview of a single property.
class PropertyDetailResponse(BaseModel):
    id: uuid.UUID
    name: str
    address: str
    amenities: Optional[List[str]] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    size_sqft: Optional[int] = None
    year_built: Optional[int] = None
    floors: Optional[int] = None
    property_type: Optional[str] = None
    description: Optional[str] = None
    units: List[UnitDetail] = []

    class Config:
        from_attributes = True 