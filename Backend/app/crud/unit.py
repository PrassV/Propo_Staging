from typing import Dict, List, Any, Optional
import logging
import uuid
from ..config.database import supabase_client

logger = logging.getLogger(__name__)

async def get_unit_by_id(unit_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get unit details from Supabase by ID.

    Args:
        unit_id: The unit ID (UUID)

    Returns:
        Unit data or None if not found
    """
    try:
        response = supabase_client.table('units').select('*').eq('id', str(unit_id)).single().execute()

        if response.error:
            logger.error(f"Error fetching unit: {response.error.message}")
            return None

        return response.data
    except Exception as e:
        logger.error(f"Failed to get unit {unit_id}: {str(e)}")
        return None

async def get_unit_history(unit_id: uuid.UUID) -> Dict[str, Any]:
    """
    Get the complete history for a unit including tenants, leases, and payments.

    Args:
        unit_id: The unit ID (UUID)

    Returns:
        Dictionary with unit history data including:
        - tenants: List of all tenants who have ever occupied the unit
        - leases: List of all leases associated with the unit
        - payments: List of all payments associated with the unit
    """
    try:
        # Get unit details
        unit_details = await get_unit_by_id(unit_id)
        if not unit_details:
            logger.error(f"Unit {unit_id} not found when retrieving history")
            return {"error": "Unit not found"}

        # Get all property_tenant links (leases) for this unit
        leases_response = supabase_client.table('property_tenants') \
            .select('*') \
            .eq('property_id', unit_details['property_id']) \
            .eq('unit_number', unit_details['unit_number']) \
            .order('start_date', desc=True) \
            .execute()

        leases = leases_response.data or []

        # Get all tenants associated with these leases
        tenant_ids = set([lease['tenant_id'] for lease in leases])
        tenants = []
        
        for tenant_id in tenant_ids:
            tenant_response = supabase_client.table('tenants') \
                .select('*') \
                .eq('id', tenant_id) \
                .execute()
                
            if tenant_response.data:
                tenants.append(tenant_response.data[0])

        # Get all payments associated with this unit
        payments_response = supabase_client.table('payments') \
            .select('*') \
            .eq('unit_id', str(unit_id)) \
            .order('due_date', desc=True) \
            .execute()
            
        payments = payments_response.data or []

        # Get all maintenance requests for this unit
        maintenance_response = supabase_client.table('maintenance_requests') \
            .select('*') \
            .eq('unit_id', str(unit_id)) \
            .order('created_at', desc=True) \
            .execute()
            
        maintenance_requests = maintenance_response.data or []

        # Compile everything into a history object
        history = {
            "unit_id": str(unit_id),
            "unit_number": unit_details.get('unit_number'),
            "property_id": unit_details.get('property_id'),
            "tenants": tenants,
            "leases": leases,
            "payments": payments,
            "maintenance_requests": maintenance_requests
        }

        return history
    except Exception as e:
        logger.error(f"Failed to get unit history for {unit_id}: {str(e)}")
        return {"error": f"Failed to retrieve unit history: {str(e)}"} 