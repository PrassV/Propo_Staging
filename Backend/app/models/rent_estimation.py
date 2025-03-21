from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class PropertyType(str, Enum):
    APARTMENT = "apartment"
    HOUSE = "house"
    VILLA = "villa"
    COMMERCIAL = "commercial"
    LAND = "land"
    OTHER = "other"

class RentEstimationRequest(BaseModel):
    property_type: PropertyType
    city: str
    locality: str
    bedrooms: int = Field(..., ge=0)
    bathrooms: float = Field(..., ge=0)
    area_sqft: float = Field(..., gt=0)
    year_built: Optional[int] = None
    has_parking: bool = False
    has_furnishing: bool = False
    has_gym: bool = False
    has_swimming_pool: bool = False
    floor_number: Optional[int] = None
    total_floors: Optional[int] = None
    
class RentEstimationResponse(BaseModel):
    estimated_rent: float
    rent_range_min: float
    rent_range_max: float
    confidence_score: float = Field(..., ge=0, le=1)
    comparable_properties: Optional[List[dict]] = None
    factors_considered: List[str]
    message: str 