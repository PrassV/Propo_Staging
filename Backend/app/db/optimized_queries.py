"""
Optimized database queries to solve N+1 problems and improve performance
"""
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from supabase import Client
from ..config.cache import cache_result, cache_service

logger = logging.getLogger(__name__)

@cache_result(ttl=600, key_prefix="batch_properties_with_units")  # Cache for 10 minutes
async def get_properties_with_units_batch(db_client: Client, owner_id: str) -> List[Dict[str, Any]]:
    """
    Optimized batch query to get all properties with their units in a single request
    Solves N+1 problem of querying each property separately for units
    """
    try:
        # Single query with join to get all properties and their units
        response = db_client.table('properties')\
            .select('''
                *,
                units:units(
                    *,
                    tenant:tenants!units_tenant_id_fkey(*)
                )
            ''')\
            .eq('owner_id', owner_id)\
            .order('created_at', desc=True)\
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error in batch properties query: {response.error.message}")
            return []
        
        properties = response.data or []
        
        # Process units to ensure empty list instead of null
        for property_data in properties:
            if 'units' not in property_data or property_data['units'] is None:
                property_data['units'] = []
                
        logger.info(f"Fetched {len(properties)} properties with units in batch")
        return properties
        
    except Exception as e:
        logger.error(f"Error in batch properties query: {str(e)}", exc_info=True)
        return []

@cache_result(ttl=300, key_prefix="batch_maintenance_with_vendors")  # Cache for 5 minutes
async def get_maintenance_requests_with_vendors_batch(
    db_client: Client, 
    owner_id: str,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Optimized batch query to get maintenance requests with vendor details
    Solves N+1 problem of querying vendor details separately
    """
    try:
        # Single query with joins to get maintenance requests with vendor and property details
        response = db_client.table('maintenance_requests')\
            .select('''
                *,
                vendor:maintenance_vendors(*),
                property:properties!inner(
                    id,
                    property_name,
                    owner_id
                ),
                unit:units(
                    id,
                    unit_number
                )
            ''')\
            .eq('property.owner_id', owner_id)\
            .order('created_at', desc=True)\
            .limit(limit)\
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error in batch maintenance query: {response.error.message}")
            return []
        
        requests = response.data or []
        
        # Process the joined data
        for request in requests:
            if request.get('vendor'):
                request['vendor_details'] = request.pop('vendor')
            if request.get('property'):
                request['property_details'] = request.pop('property')
            if request.get('unit'):
                request['unit_details'] = request.pop('unit')
                
        logger.info(f"Fetched {len(requests)} maintenance requests with vendors in batch")
        return requests
        
    except Exception as e:
        logger.error(f"Error in batch maintenance query: {str(e)}", exc_info=True)
        return []

@cache_result(ttl=300, key_prefix="batch_tenants_with_properties")  # Cache for 5 minutes
async def get_tenants_with_properties_batch(
    db_client: Client, 
    owner_id: str
) -> List[Dict[str, Any]]:
    """
    Optimized batch query to get tenants with their property relationships
    Solves N+1 problem of querying tenant properties separately
    """
    try:
        # Single query with joins to get tenants with their property relationships
        response = db_client.table('property_tenants')\
            .select('''
                *,
                tenant:tenants(*),
                property:properties!inner(
                    *,
                    owner_id
                ),
                unit:units(*)
            ''')\
            .eq('property.owner_id', owner_id)\
            .order('start_date', desc=True)\
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error in batch tenants query: {response.error.message}")
            return []
        
        relationships = response.data or []
        
        # Group by tenant to avoid duplicates
        tenants_dict = {}
        for rel in relationships:
            if rel.get('tenant'):
                tenant_id = rel['tenant']['id']
                if tenant_id not in tenants_dict:
                    tenant = rel['tenant'].copy()
                    tenant['properties'] = []
                    tenant['current_property'] = None
                    tenants_dict[tenant_id] = tenant
                
                # Add property details
                if rel.get('property'):
                    property_info = {
                        'property_id': rel['property']['id'],
                        'property_name': rel['property']['property_name'],
                        'start_date': rel.get('start_date'),
                        'end_date': rel.get('end_date'),
                        'rent_amount': rel.get('rent_amount'),
                        'unit': rel.get('unit')
                    }
                    tenants_dict[tenant_id]['properties'].append(property_info)
                    
                    # Set current property (latest start date with no end date or future end date)
                    if not rel.get('end_date') or rel.get('end_date') >= str(datetime.now().date()):
                        tenants_dict[tenant_id]['current_property'] = property_info
        
        tenants_list = list(tenants_dict.values())
        logger.info(f"Fetched {len(tenants_list)} tenants with properties in batch")
        return tenants_list
        
    except Exception as e:
        logger.error(f"Error in batch tenants query: {str(e)}", exc_info=True)
        return []

@cache_result(ttl=600, key_prefix="batch_payments_summary")  # Cache for 10 minutes
async def get_payments_summary_batch(
    db_client: Client,
    owner_id: str,
    months: int = 12
) -> Dict[str, Any]:
    """
    Optimized batch query to get payment summaries
    Avoids multiple queries for different payment statistics
    """
    try:
        from datetime import datetime, timedelta
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30 * months)
        
        # Single query to get all payment data for the owner's properties
        response = db_client.table('payments')\
            .select('''
                *,
                property:properties!inner(
                    owner_id,
                    property_name
                ),
                tenant:tenants(
                    id,
                    first_name,
                    last_name
                )
            ''')\
            .eq('property.owner_id', owner_id)\
            .gte('due_date', start_date.strftime('%Y-%m-%d'))\
            .order('due_date', desc=True)\
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error in batch payments query: {response.error.message}")
            return {}
        
        payments = response.data or []
        
        # Calculate summary statistics
        total_amount = sum(float(p.get('amount', 0)) for p in payments)
        paid_amount = sum(float(p.get('amount', 0)) for p in payments if p.get('status') == 'paid')
        pending_amount = sum(float(p.get('amount', 0)) for p in payments if p.get('status') == 'pending')
        overdue_amount = sum(
            float(p.get('amount', 0)) for p in payments 
            if p.get('status') == 'overdue' or (
                p.get('status') == 'pending' and 
                p.get('due_date', '') < datetime.now().strftime('%Y-%m-%d')
            )
        )
        
        # Group by month for trend analysis
        monthly_stats = {}
        for payment in payments:
            month_key = payment.get('due_date', '')[:7]  # YYYY-MM format
            if month_key not in monthly_stats:
                monthly_stats[month_key] = {
                    'total': 0,
                    'paid': 0,
                    'pending': 0,
                    'overdue': 0
                }
            
            amount = float(payment.get('amount', 0))
            monthly_stats[month_key]['total'] += amount
            
            status = payment.get('status', '')
            if status == 'paid':
                monthly_stats[month_key]['paid'] += amount
            elif status == 'pending':
                monthly_stats[month_key]['pending'] += amount
            elif status == 'overdue':
                monthly_stats[month_key]['overdue'] += amount
        
        summary = {
            'total_payments': len(payments),
            'total_amount': total_amount,
            'paid_amount': paid_amount,
            'pending_amount': pending_amount,
            'overdue_amount': overdue_amount,
            'collection_rate': (paid_amount / total_amount * 100) if total_amount > 0 else 0,
            'monthly_trends': monthly_stats,
            'recent_payments': payments[:10]  # Last 10 payments
        }
        
        logger.info(f"Generated payment summary for {len(payments)} payments")
        return summary
        
    except Exception as e:
        logger.error(f"Error in batch payments summary: {str(e)}", exc_info=True)
        return {}

async def invalidate_owner_cache(owner_id: str):
    """Invalidate all cache entries for a specific owner"""
    patterns = [
        f"*{owner_id}*",
        f"batch_properties_with_units*{owner_id}*",
        f"batch_maintenance_with_vendors*{owner_id}*", 
        f"batch_tenants_with_properties*{owner_id}*",
        f"batch_payments_summary*{owner_id}*",
        f"property_stats*{owner_id}*",
        f"revenue_stats*{owner_id}*",
        f"tenant_stats*{owner_id}*"
    ]
    
    for pattern in patterns:
        await cache_service.delete_pattern(pattern)
    
    logger.info(f"Invalidated cache for owner: {owner_id}")

# Database query optimization utilities
async def get_multiple_properties_optimized(
    db_client: Client,
    property_ids: List[str]
) -> Dict[str, Dict[str, Any]]:
    """
    Get multiple properties by IDs in a single query instead of N queries
    """
    if not property_ids:
        return {}
    
    try:
        response = db_client.table('properties')\
            .select('*')\
            .in_('id', property_ids)\
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error in batch properties fetch: {response.error.message}")
            return {}
        
        properties = response.data or []
        return {prop['id']: prop for prop in properties}
        
    except Exception as e:
        logger.error(f"Error fetching multiple properties: {str(e)}", exc_info=True)
        return {}

async def get_multiple_tenants_optimized(
    db_client: Client,
    tenant_ids: List[str]
) -> Dict[str, Dict[str, Any]]:
    """
    Get multiple tenants by IDs in a single query instead of N queries
    """
    if not tenant_ids:
        return {}
    
    try:
        response = db_client.table('tenants')\
            .select('*')\
            .in_('id', tenant_ids)\
            .execute()
        
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error in batch tenants fetch: {response.error.message}")
            return {}
        
        tenants = response.data or []
        return {tenant['id']: tenant for tenant in tenants}
        
    except Exception as e:
        logger.error(f"Error fetching multiple tenants: {str(e)}", exc_info=True)
        return {}