from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json
import uuid

# Import the database operations from shared module
from shared.database import get_by_id, create, update, delete_by_id

router = APIRouter()

class PropertyFeatures(BaseModel):
    location: str  # City or area name
    property_type: str  # "apartment", "house", "villa", "pg"
    bedrooms: int
    bathrooms: int
    area_sqft: float
    floor_number: Optional[int] = None
    total_floors: Optional[int] = None
    furnished: Optional[bool] = False
    amenities: Optional[List[str]] = None
    parking: Optional[bool] = False
    building_age: Optional[int] = None
    distance_to_metro: Optional[float] = None

@router.post("/estimate-rent")
async def estimate_rent(features: PropertyFeatures):
    """Estimate rental amount based on property features"""
    try:
        # In a real app, this would use a machine learning model or algorithm
        # For demonstration, we'll use a simple calculation
        
        # Base rent calculation based on property type and size
        base_rates = {
            "apartment": 25,  # ₹ per sq ft
            "house": 30,
            "villa": 45,
            "pg": 35
        }
        
        # Set default to apartment rate if type not recognized
        base_rate = base_rates.get(features.property_type.lower(), 25)
        base_rent = features.area_sqft * base_rate
        
        # Location multiplier (would be more sophisticated in real app)
        premium_locations = ["delhi", "mumbai", "bangalore", "pune", "hyderabad", "chennai"]
        location_multiplier = 1.5 if any(loc in features.location.lower() for loc in premium_locations) else 1.0
        
        # Bedroom and bathroom adjustment
        bedroom_factor = 1.0 + (features.bedrooms * 0.15)
        bathroom_factor = 1.0 + (features.bathrooms * 0.05)
        
        # Furnished factor
        furnished_factor = 1.2 if features.furnished else 1.0
        
        # Amenities factor
        amenities_count = len(features.amenities or [])
        amenities_factor = 1.0 + (amenities_count * 0.02)
        
        # Parking factor
        parking_factor = 1.05 if features.parking else 1.0
        
        # Building age factor (newer buildings command higher rent)
        age_factor = 1.0
        if features.building_age is not None:
            if features.building_age <= 2:
                age_factor = 1.1
            elif features.building_age <= 5:
                age_factor = 1.05
            elif features.building_age >= 15:
                age_factor = 0.9
                
        # Distance to metro factor
        metro_factor = 1.0
        if features.distance_to_metro is not None:
            if features.distance_to_metro <= 0.5:
                metro_factor = 1.15
            elif features.distance_to_metro <= 1:
                metro_factor = 1.1
            elif features.distance_to_metro <= 2:
                metro_factor = 1.05
                
        # Calculate estimated rent
        estimated_rent = (
            base_rent *
            location_multiplier *
            bedroom_factor *
            bathroom_factor *
            furnished_factor *
            amenities_factor *
            parking_factor *
            age_factor *
            metro_factor
        )
        
        # Round to nearest 100
        rounded_rent = round(estimated_rent / 100) * 100
        
        # Calculate rent range (±10%)
        min_rent = round((rounded_rent * 0.9) / 100) * 100
        max_rent = round((rounded_rent * 1.1) / 100) * 100
        
        return {
            "estimated_rent": rounded_rent,
            "rent_range": {
                "min": min_rent,
                "max": max_rent
            },
            "factors": {
                "base_rent": base_rent,
                "location_multiplier": location_multiplier,
                "bedroom_factor": bedroom_factor,
                "bathroom_factor": bathroom_factor,
                "furnished_factor": furnished_factor,
                "amenities_factor": amenities_factor,
                "parking_factor": parking_factor,
                "age_factor": age_factor,
                "metro_factor": metro_factor
            },
            "comparable_properties": generate_comparable_properties(features, rounded_rent),
            "estimated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to estimate rent: {str(e)}")

def generate_comparable_properties(features: PropertyFeatures, estimated_rent: float):
    """Generate sample comparable properties"""
    # In a real app, this would query the database for similar properties
    # For demonstration, we'll create sample data
    
    comparables = []
    for i in range(3):
        # Vary the features slightly for each comparable
        area_variation = features.area_sqft * (0.9 + (i * 0.1))  # -10%, +0%, +10%
        bedroom_variation = max(1, features.bedrooms + (i - 1))  # -1, +0, +1 bedroom
        rent_variation = estimated_rent * (0.95 + (i * 0.05))  # -5%, +0%, +5%
        
        comparables.append({
            "id": f"comp-{i}-{uuid.uuid4().hex[:8]}",
            "location": features.location,
            "property_type": features.property_type,
            "bedrooms": bedroom_variation,
            "bathrooms": features.bathrooms,
            "area_sqft": area_variation,
            "furnished": features.furnished,
            "rent": rent_variation,
            "distance_km": 0.5 * (i + 1)  # 0.5km, 1km, 1.5km away
        })
    
    return comparables