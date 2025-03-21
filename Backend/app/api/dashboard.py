from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import logging
from ..config.auth import get_current_user

from ..services import dashboard_service

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

# Mock dashboard data
MOCK_DASHBOARD = {
    "summary": {
        "total_properties": 5,
        "vacant_properties": 2,
        "occupied_properties": 3,
        "total_tenants": 4,
        "total_maintenance_requests": 12,
        "open_maintenance_requests": 3,
        "total_revenue_current_month": 12500,
        "total_expenses_current_month": 3200
    },
    "recent_activities": [
        {
            "id": "act1",
            "type": "payment_received",
            "description": "Rent payment received from John Doe",
            "amount": 2500,
            "date": "2023-07-15T14:30:00"
        },
        {
            "id": "act2",
            "type": "maintenance_created",
            "description": "New maintenance request created",
            "property_id": "prop1",
            "date": "2023-07-14T09:15:00"
        }
    ],
    "revenue_by_month": [
        {"month": "Jan", "amount": 10000},
        {"month": "Feb", "amount": 10500},
        {"month": "Mar", "amount": 10200},
        {"month": "Apr", "amount": 11000},
        {"month": "May", "amount": 11500},
        {"month": "Jun", "amount": 12000},
        {"month": "Jul", "amount": 12500}
    ]
}

@router.get("/summary")
async def get_dashboard_summary(current_user = Depends(get_current_user)):
    """Get dashboard summary data (using mock data for now)"""
    try:
        logger.info(f"Returning mock dashboard summary")
        return MOCK_DASHBOARD["summary"]
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard summary")

@router.get("/recent-activities")
async def get_recent_activities(current_user = Depends(get_current_user)):
    """Get recent activities for the dashboard (using mock data for now)"""
    try:
        return MOCK_DASHBOARD["recent_activities"]
    except Exception as e:
        logger.error(f"Error getting recent activities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve recent activities")

@router.get("/revenue")
async def get_revenue_data(current_user = Depends(get_current_user)):
    """Get revenue data for the dashboard charts (using mock data for now)"""
    try:
        return MOCK_DASHBOARD["revenue_by_month"]
    except Exception as e:
        logger.error(f"Error getting revenue data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve revenue data")

@router.get("/data", response_model=DashboardDataResponse)
async def get_dashboard_data(
    months: int = Query(6, ge=1, le=24, description="Number of months of historical data to retrieve"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get complete dashboard data for the current user.
    
    Args:
        months: Number of months of historical data to retrieve
        current_user: The current authenticated user
        
    Returns:
        JSON with complete dashboard data
    """
    data = await dashboard_service.get_dashboard_data(current_user["id"], months)
    
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard data not found"
        )
    
    return {
        "data": data,
        "message": "Dashboard data retrieved successfully"
    } 