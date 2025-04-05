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
        Dashboard summary data in the format expected by the frontend
    """
    try:
        # Get property statistics
        property_stats = await dashboard_db.get_property_stats(owner_id)
        
        # Get revenue statistics
        revenue_stats = await dashboard_db.get_revenue_stats(owner_id)
        
        # Get tenant statistics
        tenant_stats = await dashboard_db.get_tenant_stats(owner_id)
        
        # Format data according to frontend DashboardSummary interface
        return {
            # Owner Dashboard Fields (required by frontend)
            'total_properties': property_stats.get('total_properties', 0),
            'total_tenants': tenant_stats.get('total_tenants', 0),
            'occupied_units': property_stats.get('total_rented', 0),
            'vacant_units': property_stats.get('total_vacant', 0),
            'total_revenue': revenue_stats.get('monthly_rental_income', 0),
            'pending_rent': revenue_stats.get('monthly_rental_income', 0) * 0.1,  # 10% pending (placeholder)
            'maintenance_requests': 0,  # Placeholder, to be replaced with actual count
            
            # Additional fields that might be useful
            'occupancy_rate': property_stats.get('occupancy_rate', 0),
            'upcoming_lease_expiries': tenant_stats.get('upcoming_lease_expiries', 0),
            'average_lease_duration': tenant_stats.get('average_lease_duration', 0),
            'yearly_revenue': revenue_stats.get('yearly_rental_income', 0),
            'average_rent': revenue_stats.get('average_rent_per_property', 0)
        }
    except Exception as e:
        logger.error(f"Error in get_dashboard_summary service: {str(e)}")
        # Return a minimal valid structure even in case of error
        return {
            'total_properties': 0,
            'total_tenants': 0,
            'occupied_units': 0,
            'vacant_units': 0,
            'total_revenue': 0,
            'pending_rent': 0,
            'maintenance_requests': 0
        }

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
        
        # Mock some recent payments data for the frontend
        recent_payments = [
            {
                'id': f'pmt-{i}',
                'amount': 1000 + (i * 50),
                'payment_date': (datetime.utcnow().isoformat()),
                'status': 'paid',
                'tenant_name': f'Tenant {i}',
                'property_name': f'Property {i}'
            } for i in range(1, 6)
        ]
        
        # Mock some maintenance issues data for the frontend
        maintenance_issues = [
            {
                'id': f'maint-{i}',
                'title': f'Maintenance Issue {i}',
                'status': 'pending' if i % 2 == 0 else 'in_progress',
                'priority': 'high' if i == 1 else 'medium' if i == 2 else 'low',
                'created_at': (datetime.utcnow().isoformat()),
                'property_name': f'Property {i}'
            } for i in range(1, 4)
        ]
        
        # Format revenue_by_month for the frontend
        revenue_by_month = [
            {'month': item.get('month_label', ''), 'amount': item.get('revenue', 0)}
            for item in monthly_revenue
        ]
        
        # Combine all data into a full dashboard response
        return {
            'summary': summary,
            'recent_payments': recent_payments,
            'maintenance_issues': maintenance_issues,
            'revenue_by_month': revenue_by_month
        }
    except Exception as e:
        logger.error(f"Error in get_dashboard_data service: {str(e)}")
        return {
            'summary': await get_dashboard_summary(owner_id),
            'recent_payments': [],
            'maintenance_issues': [],
            'revenue_by_month': []
        }

async def get_recent_activities(owner_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Get recent activities for the dashboard
    
    Args:
        owner_id: The ID of the property owner
        limit: Maximum number of activities to return
        
    Returns:
        List of recent activities
    """
    # This is a placeholder implementation
    # TODO: Implement actual recent activities from database
    recent_activities = [
        {
            'id': f'act-{i}',
            'type': 'payment' if i % 3 == 0 else 'maintenance' if i % 3 == 1 else 'lease',
            'description': f'Activity {i} description',
            'timestamp': datetime.utcnow().isoformat(),
            'amount': 1000 + (i * 25) if i % 3 == 0 else None,
            'property_name': f'Property {i % 5 + 1}'
        } for i in range(1, limit + 1)
    ]
    
    return recent_activities

async def get_revenue_data(owner_id: str, months: int = 6) -> List[Dict[str, Any]]:
    """
    Get revenue data for the dashboard charts
    
    Args:
        owner_id: The ID of the property owner
        months: Number of months to include
        
    Returns:
        List of monthly revenue data for charts
    """
    try:
        # Get monthly revenue data
        monthly_revenue = await dashboard_db.get_monthly_revenue(owner_id, months)
        
        # Format revenue_by_month for the frontend charts
        revenue_by_month = [
            {'month': item.get('month_label', ''), 'amount': item.get('revenue', 0)}
            for item in monthly_revenue
        ]
        
        return revenue_by_month
    except Exception as e:
        logger.error(f"Error in get_revenue_data service: {str(e)}")
        # Return placeholder data in case of error
        return [
            {'month': 'Jan', 'amount': 1000},
            {'month': 'Feb', 'amount': 1200},
            {'month': 'Mar', 'amount': 1100},
            {'month': 'Apr', 'amount': 1300},
            {'month': 'May', 'amount': 1250},
            {'month': 'Jun', 'amount': 1500}
        ] 