from typing import List, Optional, Any
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime, date
from enum import Enum
import uuid
from .tenant import Tenant # Make sure Tenant is imported if used

# --- Enums based on potential usage, adjust if needed ---
class PropertyCategory(str, Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"

class PropertyType(str, Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    LAND = "vacant_land"
    OTHER = "other"
    HOSTEL = "hostel_pg"

# --- Document Model --- Based on property_documents table
class PropertyDocumentBase(BaseModel):
    document_type: str
    document_url: HttpUrl # Assuming it's a URL

class PropertyDocumentCreate(PropertyDocumentBase):
    pass

class PropertyDocument(PropertyDocumentBase):
    id: uuid.UUID
    property_id: uuid.UUID
    uploaded_at: datetime

    class Config:
        from_attributes = True

# --- Property Model --- Based on properties table
class PropertyBase(BaseModel):
    property_name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: Optional[str] = None
    property_type: PropertyType
    category: Optional[PropertyCategory] = None # Added based on schema
    number_of_units: Optional[int] = Field(None, ge=0)
    size_sqft: Optional[int] = Field(None, ge=0)
    bedrooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[float] = Field(None, ge=0) # Using float for potential 0.5 baths
    kitchens: Optional[int] = Field(None, ge=0)
    garages: Optional[int] = Field(None, ge=0)
    garage_size: Optional[int] = Field(None, ge=0)
    year_built: Optional[int] = Field(None, ge=1900) # Reasonable lower bound
    floors: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    amenities: Optional[List[str]] = None
    image_urls: Optional[List[str]] = None # Changed from HttpUrl to str
    # image_paths: Optional[List[str]] = None # Decide if needed alongside URLs
    listed_in: Optional[str] = None # E.g., Zillow, Realtor.com
    price: Optional[float] = Field(None, ge=0) # Purchase price or market value?
    yearly_tax_rate: Optional[float] = Field(None, ge=0)
    survey_number: str # Make required
    door_number: Optional[str] = None

class PropertyCreate(PropertyBase):
    # owner_id will be added in the service layer from the authenticated user
    pass

class PropertyUpdate(BaseModel):
    # Make all fields optional for partial updates
    property_name: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: Optional[str] = None
    property_type: Optional[PropertyType] = None
    category: Optional[PropertyCategory] = None
    number_of_units: Optional[int] = Field(None, ge=0)
    size_sqft: Optional[int] = Field(None, ge=0)
    bedrooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[float] = Field(None, ge=0)
    kitchens: Optional[int] = Field(None, ge=0)
    garages: Optional[int] = Field(None, ge=0)
    garage_size: Optional[int] = Field(None, ge=0)
    year_built: Optional[int] = Field(None, ge=1900)
    floors: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    amenities: Optional[List[str]] = None
    image_urls: Optional[List[str]] = None # Changed from HttpUrl to str
    listed_in: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    yearly_tax_rate: Optional[float] = Field(None, ge=0)
    survey_number: Optional[str] = None
    door_number: Optional[str] = None

class Property(PropertyBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    # image_urls type is inherited from PropertyBase, now List[str]

    class Config:
        from_attributes = True # Enable ORM mode 

# --- Unit Models --- Based on units table and frontend types

class UnitBase(BaseModel):
    unit_number: str
    status: Optional[str] = 'Vacant' # Default status?
    bedrooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[float] = Field(None, ge=0)
    area_sqft: Optional[int] = Field(None, ge=0)
    rent: Optional[float] = Field(None, ge=0)
    deposit: Optional[float] = Field(None, ge=0)

class UnitCreate(UnitBase):
    # property_id will be added by the endpoint/service
    pass

class UnitDetails(UnitBase):
    id: uuid.UUID
    property_id: uuid.UUID
    # Potentially add tenant info if joining later
    # current_tenant: Optional[Tenant] = None 
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UnitUpdate(UnitBase):
    # All fields optional for update
    unit_number: Optional[str] = None
    status: Optional[str] = None
    bedrooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[float] = Field(None, ge=0)
    area_sqft: Optional[int] = Field(None, ge=0)
    rent: Optional[float] = Field(None, ge=0)
    deposit: Optional[float] = Field(None, ge=0)

# --- Amenity Models --- #

class AmenityBase(BaseModel):
    name: str
    description: Optional[str] = None

class AmenityCreate(AmenityBase):
    # unit_id will be supplied by the path parameter
    pass

class AmenityUpdate(BaseModel):
    # All fields optional for update
    name: Optional[str] = None
    description: Optional[str] = None

class Amenity(AmenityBase):
    id: uuid.UUID
    unit_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- End Amenity Models --- #

# --- Unit Tax Models --- #

class UnitTaxBase(BaseModel):
    tax_type: str = Field(..., description="Type of tax (e.g., local, municipal)")
    amount: float = Field(..., gt=0, description="Amount of the tax")
    year: int = Field(..., description="The year the tax applies to")
    payment_date: Optional[date] = None
    status: str = Field("due", description="Status of the tax payment (e.g., due, paid, overdue)")
    description: Optional[str] = None

class UnitTaxCreate(UnitTaxBase):
    # unit_id will be supplied by the path parameter
    pass

class UnitTaxUpdate(BaseModel):
    # All fields optional for update
    tax_type: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    year: Optional[int] = None
    payment_date: Optional[date] = None
    status: Optional[str] = None
    description: Optional[str] = None

class UnitTax(UnitTaxBase):
    id: uuid.UUID
    unit_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- End Unit Tax Models --- #

# --- Update PropertyDetails ---

class PropertyDetails(Property): # New/Updated PropertyDetails model
    # Inherits fields from Property
    # image_urls type is inherited from Property, now List[str]
    units: List[UnitDetails] = [] # Add the units list
    # Add other related details if needed, e.g., documents
    # documents: List[PropertyDocument] = []

    class Config:
        from_attributes = True 

# Model for creating a new unit via POST /units
class UnitCreatePayload(UnitCreate):
    property_id: uuid.UUID # Add property_id needed for creation via this route

# Define response model for list operations, potentially with pagination metadata 