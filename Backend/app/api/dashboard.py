from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import logging
from app.config.auth import get_current_user

from app.services import dashboard_service

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

# Response models
class DashboardSummaryResponse(BaseModel):
    summary: Dict[str, Any]
    message: str = "Success"

class DashboardDataResponse(BaseModel):
    data: Dict[str, Any]
    message: str = "Success"

@router.get("/summary")
async def get_dashboard_summary(current_user = Depends(get_current_user)):
    """Get dashboard summary data"""
    try:
        user_id = current_user.id if hasattr(current_user, 'id') else str(current_user)
        logger.info(f"Fetching dashboard summary for user {user_id}")
        
        # Call the dashboard service to get real data
        summary = await dashboard_service.get_dashboard_summary(user_id)
        return summary
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve dashboard summary: {str(e)}")

@router.get("/recent-activities")
async def get_recent_activities(
    limit: int = Query(10, ge=1, le=50, description="Maximum number of activities to retrieve"),
    current_user = Depends(get_current_user)
):
    """Get recent activities for the dashboard"""
    try:
        user_id = current_user.id if hasattr(current_user, 'id') else str(current_user)
        logger.info(f"Fetching recent activities for user {user_id}")
        
        activities = await dashboard_service.get_recent_activities(user_id, limit)
        return activities
    except Exception as e:
        logger.error(f"Error getting recent activities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve recent activities: {str(e)}")

@router.get("/revenue")
async def get_revenue_data(
    months: int = Query(6, ge=1, le=24, description="Number of months to include"),
    current_user = Depends(get_current_user)
):
    """Get revenue data for the dashboard charts"""
    try:
        user_id = current_user.id if hasattr(current_user, 'id') else str(current_user)
        logger.info(f"Fetching revenue data for user {user_id}")
        
        revenue_data = await dashboard_service.get_revenue_data(user_id, months)
        return revenue_data
    except Exception as e:
        logger.error(f"Error getting revenue data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve revenue data: {str(e)}")

@router.get("/data", response_model=DashboardDataResponse)
async def get_dashboard_data(
    months: int = Query(6, ge=1, le=24, description="Number of months of historical data to retrieve"),
    current_user = Depends(get_current_user)
):
    """
    Get complete dashboard data for the current user.
    
    Args:
        months: Number of months of historical data to retrieve
        current_user: The current authenticated user
        
    Returns:
        JSON with complete dashboard data
    """
    user_id = current_user.id if hasattr(current_user, 'id') else str(current_user)
    
    data = await dashboard_service.get_dashboard_data(user_id, months)
    
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard data not found"
        )
    
    return {
        "data": data,
        "message": "Dashboard data retrieved successfully"
    } 