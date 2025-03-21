from typing import Dict, Any, List
import logging
import random  # For demonstration purposes
from datetime import datetime

from ..models.rent_estimation import RentEstimationRequest, RentEstimationResponse
from ..db import properties as properties_db

logger = logging.getLogger(__name__)

# Base rent rates by property type (sample data)
BASE_RATES = {
    "apartment": 15,  # $/sqft
    "house": 12,
    "villa": 20,
    "commercial": 25,
    "land": 5,
    "other": 10
}

# City multipliers (sample data)
CITY_MULTIPLIERS = {
    "mumbai": 2.0,
    "delhi": 1.8,
    "bangalore": 1.7,
    "hyderabad": 1.4,
    "pune": 1.3,
    "chennai": 1.3,
    "kolkata": 1.2,
    "ahmedabad": 1.1,
    "other": 1.0
}

# Premium feature adjustments
PREMIUM_ADJUSTMENTS = {
    "has_parking": 0.05,  # 5% increase
    "has_furnishing": 0.15,  # 15% increase
    "has_gym": 0.08,  # 8% increase
    "has_swimming_pool": 0.1,  # 10% increase
}

async def estimate_rent(request: RentEstimationRequest) -> RentEstimationResponse:
    """
    Estimate rent for a property based on its features.
    
    Args:
        request: The rent estimation request with property details
        
    Returns:
        Rent estimation response with estimated rent and related data
    """
    try:
        # This is a simplified model for demonstration purposes
        # In a real application, you would use a trained machine learning model
        
        # Start with base rate based on property type
        base_rate = BASE_RATES.get(request.property_type.value, BASE_RATES["other"])
        
        # Apply city multiplier
        city = request.city.lower()
        city_multiplier = CITY_MULTIPLIERS.get(city, CITY_MULTIPLIERS["other"])
        
        # Calculate base rent from area
        base_rent = request.area_sqft * base_rate * city_multiplier
        
        # Adjust for number of bedrooms and bathrooms
        bedroom_adjustment = 1.0 + (request.bedrooms * 0.05)  # 5% increase per bedroom
        bathroom_adjustment = 1.0 + (request.bathrooms * 0.03)  # 3% increase per bathroom
        
        # Adjust for premium features
        premium_adjustment = 1.0
        factors_considered = [
            f"Base rate for {request.property_type.value}: ${base_rate}/sqft",
            f"Location multiplier for {request.city}: {city_multiplier}",
            f"Area: {request.area_sqft} sqft",
            f"Bedrooms: {request.bedrooms}",
            f"Bathrooms: {request.bathrooms}"
        ]
        
        for feature, adjustment in PREMIUM_ADJUSTMENTS.items():
            if getattr(request, feature, False):
                premium_adjustment += adjustment
                factors_considered.append(f"{feature.replace('has_', '').replace('_', ' ').title()}: +{adjustment*100}%")
        
        # Calculate estimated rent
        estimated_rent = base_rent * bedroom_adjustment * bathroom_adjustment * premium_adjustment
        
        # Create a range (±10%)
        rent_range_min = estimated_rent * 0.9
        rent_range_max = estimated_rent * 1.1
        
        # For demonstration, sample confidence score
        confidence_score = 0.85
        
        # Create sample comparable properties
        comparable_properties = await get_comparable_properties(request)
        
        # Build response
        return RentEstimationResponse(
            estimated_rent=round(estimated_rent, 2),
            rent_range_min=round(rent_range_min, 2),
            rent_range_max=round(rent_range_max, 2),
            confidence_score=confidence_score,
            comparable_properties=comparable_properties,
            factors_considered=factors_considered,
            message="Rent estimation calculated successfully"
        )
    except Exception as e:
        logger.error(f"Error in estimate_rent service: {str(e)}")
        # Return a fallback response with error message
        return RentEstimationResponse(
            estimated_rent=0,
            rent_range_min=0,
            rent_range_max=0,
            confidence_score=0,
            factors_considered=["Error occurred during estimation"],
            message=f"Failed to estimate rent: {str(e)}"
        )

async def get_comparable_properties(request: RentEstimationRequest) -> List[Dict[str, Any]]:
    """
    Get comparable properties for the rent estimation.
    
    Args:
        request: The rent estimation request
        
    Returns:
        List of comparable properties
    """
    try:
        # In a real application, this would query the properties database
        # For demonstration, we'll generate some sample data
        comparables = []
        
        # Create sample comparable properties with slight variations
        for i in range(3):
            area_variation = random.uniform(0.9, 1.1)
            rent_variation = random.uniform(0.85, 1.15)
            
            comparables.append({
                "id": f"sample-property-{i+1}",
                "property_type": request.property_type.value,
                "city": request.city,
                "locality": request.locality,
                "bedrooms": request.bedrooms,
                "bathrooms": request.bathrooms,
                "area_sqft": round(request.area_sqft * area_variation, 2),
                "monthly_rent": round(request.area_sqft * BASE_RATES.get(request.property_type.value, 10) * rent_variation, 2),
                "distance_km": round(random.uniform(0.5, 5.0), 1)
            })
        
        return comparables
    except Exception as e:
        logger.error(f"Error getting comparable properties: {str(e)}")
        return [] 