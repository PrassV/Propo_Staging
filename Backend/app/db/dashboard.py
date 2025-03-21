from typing import Dict, List, Any, Optional
import logging
from datetime import datetime, timedelta
from ..config.database import supabase_client

logger = logging.getLogger(__name__)

async def get_property_stats(owner_id: str) -> Dict[str, Any]:
    """
    Get property statistics from Supabase.
    
    Args:
        owner_id: The owner ID to filter by
        
    Returns:
        Dictionary with property statistics
    """
    try:
        # Get all properties for the owner
        properties_response = supabase_client.table('properties').select('*').eq('owner_id', owner_id).execute()
        
        if "error" in properties_response and properties_response["error"]:
            logger.error(f"Error fetching properties: {properties_response['error']}")
            return {}
        
        properties = properties_response.data or []
        
        # Count properties by status
        total_properties = len(properties)
        total_rented = sum(1 for p in properties if p.get('status') == 'rented')
        total_under_maintenance = sum(1 for p in properties if p.get('status') == 'under_maintenance')
        total_vacant = total_properties - total_rented - total_under_maintenance
        
        # Calculate occupancy rate
        occupancy_rate = (total_rented / total_properties) * 100 if total_properties > 0 else 0
        
        return {
            'total_properties': total_properties,
            'total_rented': total_rented,
            'total_vacant': total_vacant,
            'total_under_maintenance': total_under_maintenance,
            'occupancy_rate': round(occupancy_rate, 2)
        }
    except Exception as e:
        logger.error(f"Failed to get property stats: {str(e)}")
        return {}

async def get_revenue_stats(owner_id: str) -> Dict[str, Any]:
    """
    Get revenue statistics from Supabase.
    
    Args:
        owner_id: The owner ID to filter by
        
    Returns:
        Dictionary with revenue statistics
    """
    try:
        # Get all tenants for the owner
        tenants_response = supabase_client.table('tenants').select('*').eq('owner_id', owner_id).execute()
        
        if "error" in tenants_response and tenants_response["error"]:
            logger.error(f"Error fetching tenants: {tenants_response['error']}")
            return {}
        
        tenants = tenants_response.data or []
        
        # Calculate revenue metrics
        monthly_rental_income = sum(t.get('monthly_rent', 0) for t in tenants)
        yearly_rental_income = monthly_rental_income * 12
        average_rent_per_property = monthly_rental_income / len(tenants) if tenants else 0
        total_security_deposits = sum(t.get('security_deposit', 0) for t in tenants)
        
        return {
            'monthly_rental_income': round(monthly_rental_income, 2),
            'yearly_rental_income': round(yearly_rental_income, 2),
            'average_rent_per_property': round(average_rent_per_property, 2),
            'total_security_deposits': round(total_security_deposits, 2)
        }
    except Exception as e:
        logger.error(f"Failed to get revenue stats: {str(e)}")
        return {}

async def get_tenant_stats(owner_id: str) -> Dict[str, Any]:
    """
    Get tenant statistics from Supabase.
    
    Args:
        owner_id: The owner ID to filter by
        
    Returns:
        Dictionary with tenant statistics
    """
    try:
        # Get all tenants for the owner
        tenants_response = supabase_client.table('tenants').select('*').eq('owner_id', owner_id).execute()
        
        if "error" in tenants_response and tenants_response["error"]:
            logger.error(f"Error fetching tenants: {tenants_response['error']}")
            return {}
        
        tenants = tenants_response.data or []
        
        # Calculate tenant metrics
        total_tenants = len(tenants)
        
        # Calculate upcoming lease expiries (next 30 days)
        now = datetime.utcnow()
        thirty_days_from_now = now + timedelta(days=30)
        upcoming_lease_expiries = sum(1 for t in tenants 
                                     if datetime.fromisoformat(t.get('lease_end_date', '')) <= thirty_days_from_now
                                     and datetime.fromisoformat(t.get('lease_end_date', '')) >= now)
        
        # Calculate lease renewals in the last 90 days
        ninety_days_ago = now - timedelta(days=90)
        lease_renewals_last_90_days = sum(1 for t in tenants 
                                         if t.get('updated_at') and datetime.fromisoformat(t.get('updated_at', '')) >= ninety_days_ago)
        
        # Calculate average lease duration
        total_lease_months = sum((datetime.fromisoformat(t.get('lease_end_date', '')) - 
                                 datetime.fromisoformat(t.get('lease_start_date', ''))).days / 30 
                                for t in tenants if t.get('lease_end_date') and t.get('lease_start_date'))
        average_lease_duration = total_lease_months / total_tenants if total_tenants > 0 else 0
        
        return {
            'total_tenants': total_tenants,
            'upcoming_lease_expiries': upcoming_lease_expiries,
            'lease_renewals_last_90_days': lease_renewals_last_90_days,
            'average_lease_duration': round(average_lease_duration, 1)
        }
    except Exception as e:
        logger.error(f"Failed to get tenant stats: {str(e)}")
        return {}

async def get_monthly_revenue(owner_id: str, months: int = 6) -> List[Dict[str, Any]]:
    """
    Get monthly revenue data from Supabase.
    
    Args:
        owner_id: The owner ID to filter by
        months: Number of months to retrieve
        
    Returns:
        List of monthly revenue data
    """
    try:
        # For demonstration purposes, generate sample data
        # In a real application, this would query payment records from the database
        now = datetime.utcnow()
        result = []
        
        for i in range(months):
            month_date = (now - timedelta(days=30 * i)).replace(day=1)
            result.append({
                'month': month_date.date().isoformat(),
                'revenue': round(5000 + (i * 100), 2),  # Sample data
                'expenses': round(1500 + (i * 50), 2),  # Sample data
                'net_income': round(3500 + (i * 50), 2)  # Sample data
            })
        
        return result
    except Exception as e:
        logger.error(f"Failed to get monthly revenue: {str(e)}")
        return []

async def get_occupancy_history(owner_id: str, months: int = 6) -> List[Dict[str, Any]]:
    """
    Get occupancy history data from Supabase.
    
    Args:
        owner_id: The owner ID to filter by
        months: Number of months to retrieve
        
    Returns:
        List of occupancy history data
    """
    try:
        # For demonstration purposes, generate sample data
        # In a real application, this would query historical property status records
        now = datetime.utcnow()
        result = []
        
        for i in range(months):
            month_date = (now - timedelta(days=30 * i)).replace(day=1)
            result.append({
                'month': month_date.date().isoformat(),
                'occupancy_rate': round(85 - (i * 2), 2)  # Sample data, decreasing slightly over time
            })
        
        return result
    except Exception as e:
        logger.error(f"Failed to get occupancy history: {str(e)}")
        return [] 