import uuid
from pydantic import BaseModel, validator
from typing import Optional
from datetime import date, datetime

class LeaseCreate(BaseModel):
    unit_id: uuid.UUID
    tenant_id: uuid.UUID
    start_date: date
    end_date: date
    rent_amount: float
    deposit_amount: Optional[float] = None
    rental_type: Optional[str] = "lease"  # "rent" or "lease"
    rental_frequency: Optional[str] = "monthly"  # "monthly", "weekly", "yearly"
    maintenance_fee: Optional[float] = 0.0
    advance_amount: Optional[float] = 0.0
    notes: Optional[str] = None

    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v

    @validator('rental_type')
    def validate_rental_type(cls, v):
        if v and v not in ['rent', 'lease']:
            raise ValueError('rental_type must be either "rent" or "lease"')
        return v

    @validator('rental_frequency')
    def validate_rental_frequency(cls, v):
        if v and v not in ['monthly', 'weekly', 'yearly']:
            raise ValueError('rental_frequency must be "monthly", "weekly", or "yearly"')
        return v

class LeaseUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    rent_amount: Optional[float] = None
    deposit_amount: Optional[float] = None
    rental_type: Optional[str] = None
    rental_frequency: Optional[str] = None
    maintenance_fee: Optional[float] = None
    advance_amount: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None # To manage activating/terminating

    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if 'start_date' in values and values['start_date'] and v <= values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v

    @validator('rental_type')
    def validate_rental_type(cls, v):
        if v and v not in ['rent', 'lease']:
            raise ValueError('rental_type must be either "rent" or "lease"')
        return v

    @validator('rental_frequency')
    def validate_rental_frequency(cls, v):
        if v and v not in ['monthly', 'weekly', 'yearly']:
            raise ValueError('rental_frequency must be "monthly", "weekly", or "yearly"')
        return v

class Lease(BaseModel):
    id: uuid.UUID
    property_id: uuid.UUID
    unit_id: uuid.UUID
    tenant_id: uuid.UUID
    start_date: date
    end_date: date
    rent_amount: float
    deposit_amount: Optional[float]
    rental_type: str
    rental_frequency: str
    maintenance_fee: float
    advance_amount: float
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 