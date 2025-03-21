from typing import Dict, List, Any, Optional
import logging
from datetime import datetime

from ..db import dashboard as dashboard_db

logger = logging.getLogger(__name__)

async def get_dashboard_summary(owner_id: str) -> Dict[str, Any]:
    """
    Get dashboard summary data for a property owner.
    
    Args:
        owner_id: The ID of the property owner
        
    Returns:
        Dashboard summary data
    """
    try:
        # Get property statistics
        property_stats = await dashboard_db.get_property_stats(owner_id)
        
        # Get revenue statistics
        revenue_stats = await dashboard_db.get_revenue_stats(owner_id)
        
        # Get tenant statistics
        tenant_stats = await dashboard_db.get_tenant_stats(owner_id)
        
        # Get rent collection data (for demonstration, using sample data)
        rent_collection = {
            'collected_current_month': revenue_stats.get('monthly_rental_income', 0) * 0.9,  # 90% collected
            'pending_current_month': revenue_stats.get('monthly_rental_income', 0) * 0.1,    # 10% pending
            'overdue_amount': revenue_stats.get('monthly_rental_income', 0) * 0.05,          # 5% overdue
            'collection_rate': 90.0                                                         # 90% collection rate
        }
        
        # Combine all data into a dashboard summary
        return {
            'property_stats': property_stats,
            'revenue': revenue_stats,
            'tenant_stats': tenant_stats,
            'rent_collection': rent_collection
        }
    except Exception as e:
        logger.error(f"Error in get_dashboard_summary service: {str(e)}")
        return {}

async def get_dashboard_data(owner_id: str, months: int = 6) -> Dict[str, Any]:
    """
    Get full dashboard data for a property owner.
    
    Args:
        owner_id: The ID of the property owner
        months: Number of months of historical data to retrieve
        
    Returns:
        Complete dashboard data
    """
    try:
        # Get dashboard summary
        summary = await get_dashboard_summary(owner_id)
        
        # Get monthly revenue data
        monthly_revenue = await dashboard_db.get_monthly_revenue(owner_id, months)
        
        # Get occupancy history
        occupancy_history = await dashboard_db.get_occupancy_history(owner_id, months)
        
        # Combine all data into a full dashboard response
        return {
            'summary': summary,
            'monthly_revenue': monthly_revenue,
            'occupancy_history': occupancy_history
        }
    except Exception as e:
        logger.error(f"Error in get_dashboard_data service: {str(e)}")
        return {} 