from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class PropertyType(str, Enum):
    HOUSE = "house"
    APARTMENT = "apartment"
    CONDO = "condo"
    TOWNHOUSE = "townhouse"
    COMMERCIAL = "commercial"
    OTHER = "other"

class PropertyStatus(str, Enum):
    AVAILABLE = "available"
    RENTED = "rented"
    MAINTENANCE = "maintenance"
    UNAVAILABLE = "unavailable"

class PropertyImage(BaseModel):
    url: str
    alt: Optional[str] = None
    is_primary: bool = False

class PropertyDocument(BaseModel):
    url: str
    name: str
    type: str
    uploaded_at: datetime

class PropertyBase(BaseModel):
    title: str
    description: str
    property_type: PropertyType
    status: PropertyStatus = PropertyStatus.AVAILABLE
    address: str
    city: str
    state: str
    zip_code: str
    country: str = "USA"
    bedrooms: int
    bathrooms: float
    square_feet: float
    rent_amount: float
    deposit_amount: float
    amenities: Optional[List[str]] = None
    features: Optional[List[str]] = None
    images: Optional[List[str]] = None

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    property_type: Optional[PropertyType] = None
    status: Optional[PropertyStatus] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    square_feet: Optional[float] = None
    rent_amount: Optional[float] = None
    deposit_amount: Optional[float] = None
    amenities: Optional[List[str]] = None
    features: Optional[List[str]] = None
    images: Optional[List[str]] = None

class Property(PropertyBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True 