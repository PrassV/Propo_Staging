from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any

from ..models.rent_estimation import RentEstimationRequest, RentEstimationResponse
from ..services import rent_estimation_service
from ..utils.security import get_current_user

router = APIRouter()

@router.post("/", response_model=RentEstimationResponse)
async def estimate_rent(
    request: RentEstimationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Estimate rent for a property based on its features.
    
    Args:
        request: The rent estimation request with property details
        current_user: The current authenticated user
        
    Returns:
        Rent estimation response with estimated rent and related data
    """
    response = await rent_estimation_service.estimate_rent(request)
    
    if response.estimated_rent == 0 and "Failed" in response.message:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=response.message
        )
    
    return response 