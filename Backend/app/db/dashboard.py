from typing import Dict, List, Any, Optional
import logging
from datetime import datetime, timedelta
from collections import defaultdict
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
    Get monthly revenue and expense data from the database for the owner.
    
    Args:
        owner_id: The owner ID to filter by
        months: Number of months to retrieve
        
    Returns:
        List of monthly revenue data
    """
    try:
        now = datetime.utcnow()
        start_date = (now - timedelta(days=30 * months)).replace(day=1)
        
        # First get all properties for this owner to get their IDs
        properties_response = supabase_client.table('properties')\
            .select('id')\
            .eq('owner_id', owner_id)\
            .execute()
            
        if properties_response.error:
            logger.error(f"Error fetching properties for monthly revenue: {properties_response.error}")
            return []
            
        property_ids = [p['id'] for p in properties_response.data or []]
        
        if not property_ids:
            logger.warning(f"No properties found for owner {owner_id}")
            return []
            
        # Get payment history for these properties via property-tenant relationship
        # First get tenant_ids for these properties
        property_tenants_response = supabase_client.table('property_tenants')\
            .select('tenant_id, property_id')\
            .in_('property_id', property_ids)\
            .execute()
            
        if property_tenants_response.error:
            logger.error(f"Error fetching property-tenant relationships: {property_tenants_response.error}")
            return []
            
        tenant_ids = [pt['tenant_id'] for pt in property_tenants_response.data or []]
        
        if not tenant_ids:
            logger.warning(f"No tenants found for properties of owner {owner_id}")
            return []
            
        # Now get payment history for these tenants
        payments_response = supabase_client.table('payment_history')\
            .select('*')\
            .in_('tenant_id', tenant_ids)\
            .gte('payment_date', start_date.isoformat())\
            .eq('payment_status', 'paid')\
            .execute()
            
        if payments_response.error:
            logger.error(f"Error fetching payment history: {payments_response.error}")
            return []
            
        payments = payments_response.data or []
        
        # Also check payment_tracking table for additional payments
        tracking_response = supabase_client.table('payment_tracking')\
            .select('*')\
            .in_('tenant_id', tenant_ids)\
            .gte('payment_date', start_date.isoformat())\
            .eq('payment_status', 'paid')\
            .execute()
            
        if tracking_response.error:
            logger.error(f"Error fetching payment tracking: {tracking_response.error}")
            return []
            
        # Combine both payment sources
        all_payments = payments + (tracking_response.data or [])
        
        # Group revenue by month
        revenue_by_month = defaultdict(float)
        for payment in all_payments:
            try:
                payment_date = payment.get('payment_date')
                if not payment_date:
                    continue
                    
                payment_dt = datetime.fromisoformat(payment_date) if isinstance(payment_date, str) else payment_date
                month_key = payment_dt.strftime('%Y-%m')
                
                # Sum rent and maintenance amounts if available
                amount = 0
                if 'rent_amount' in payment:
                    amount += float(payment.get('rent_amount', 0))
                if 'maintenance_amount' in payment:
                    amount += float(payment.get('maintenance_amount', 0))
                if 'maintenance_fee' in payment:
                    amount += float(payment.get('maintenance_fee', 0))
                if 'total_amount' in payment:
                    amount = float(payment.get('total_amount', 0))  # Override if total is available
                    
                revenue_by_month[month_key] += amount
            except (ValueError, TypeError) as e:
                logger.warning(f"Error processing payment date {payment.get('payment_date')}: {e}")
                continue
        
        # Get expenses - Currently we don't have expense tracking, so use placeholder
        # TODO: Implement expense tracking in the future
        expenses_by_month = defaultdict(float)
        
        # TODO: For now, we use a simple placeholder calculation for expenses
        # This should be replaced with actual expense data when available
        for month_key, revenue in revenue_by_month.items():
            # Placeholder: estimate expenses as 30% of revenue 
            expenses_by_month[month_key] = revenue * 0.3
        
        # Generate result list for the specified number of months
        result = []
        for i in range(months):
            month_start = (now - timedelta(days=30 * i)).replace(day=1)
            month_key = month_start.strftime('%Y-%m')
            monthly_revenue_val = round(revenue_by_month.get(month_key, 0), 2)
            monthly_expenses = round(expenses_by_month.get(month_key, 0), 2)
            
            result.append({
                'month': month_start.date().isoformat(),
                'revenue': monthly_revenue_val,
                'expenses': monthly_expenses,
                'net_income': round(monthly_revenue_val - monthly_expenses, 2)
            })
        
        # Return sorted by month ascending
        return sorted(result, key=lambda x: x['month'])

    except Exception as e:
        logger.error(f"Failed to get monthly revenue: {str(e)}")
        return []

async def get_occupancy_history(owner_id: str, months: int = 6) -> List[Dict[str, Any]]:
    """
    Get monthly occupancy history from the database.
    
    Args:
        owner_id: The owner ID to filter by
        months: Number of months to retrieve
        
    Returns:
        List of occupancy history data
    """
    try:
        now = datetime.utcnow()
        result = []

        # Set up month boundaries for the historical data we need
        oldest_date = (now - timedelta(days=30 * months)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Get all properties for this owner
        properties_response = supabase_client.table('properties')\
            .select('id, property_name, number_of_units')\
            .eq('owner_id', owner_id)\
            .execute()

        if properties_response.error:
            logger.error(f"Error fetching properties for occupancy: {properties_response.error}")
            return []
            
        properties = properties_response.data or []
        if not properties:
            return []
            
        # Calculate total capacity across all properties
        # If number_of_units is not specified, assume it's 1
        total_units = sum(p.get('number_of_units', 1) for p in properties)
        if total_units == 0:
            return []
            
        # Get property-tenant relationships to determine occupancy
        property_ids = [p['id'] for p in properties]
        
        # Get all property-tenant relationships that overlap with our time period
        pt_response = supabase_client.table('property_tenants')\
            .select('property_id, tenant_id, start_date, end_date')\
            .in_('property_id', property_ids)\
            .or_(f'end_date.gt.{oldest_date.isoformat()},end_date.is.null')\
            .execute()
            
        if pt_response.error:
            logger.error(f"Error fetching property-tenant relationships: {pt_response.error}")
            return []
            
        property_tenants = pt_response.data or []
        
        # For each month, calculate occupancy rate
        for i in range(months):
            # Define the period for the current month in the loop
            month_start_dt = (now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            next_month_start_dt = (month_start_dt + timedelta(days=32)).replace(day=1)
            month_end_dt = next_month_start_dt - timedelta(seconds=1)
            month_key = month_start_dt.date().isoformat()
            
            # Count units occupied during this month
            occupied_units = 0
            for pt in property_tenants:
                # Convert dates to datetime objects
                start_date = datetime.fromisoformat(pt['start_date']) if isinstance(pt['start_date'], str) else pt['start_date']
                
                # If end_date is None, tenant is still active
                end_date = None
                if pt['end_date'] is not None:
                    end_date = datetime.fromisoformat(pt['end_date']) if isinstance(pt['end_date'], str) else pt['end_date']
                
                # Check if tenant occupied the unit during this month
                if start_date <= month_end_dt and (end_date is None or end_date >= month_start_dt):
                    occupied_units += 1
            
            # Calculate occupancy rate for this month
            occupancy_rate = (occupied_units / total_units) * 100 if total_units > 0 else 0
            
            result.append({
                'month': month_key,
                'occupancy_rate': round(occupancy_rate, 2),
                'units_occupied': occupied_units,
                'total_units': total_units
            })
        
        # Sort by month in ascending order
        return sorted(result, key=lambda x: x['month'])
        
    except Exception as e:
        logger.error(f"Failed to get occupancy history: {str(e)}")
        return [] 