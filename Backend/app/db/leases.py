import logging
import uuid
from typing import Dict, Any, Optional, List
from supabase import Client
from ..schemas.lease import LeaseCreate

logger = logging.getLogger(__name__)

async def create_lease(db_client: Client, lease_data: LeaseCreate) -> Optional[Dict[str, Any]]:
    """
    Creates a lease and marks the unit as occupied using direct SQL operations.
    This avoids RPC function complications.
    """
    try:
        # Ensure required fields are not None
        if not lease_data.unit_id or not lease_data.tenant_id:
            logger.error(f"Missing required fields: unit_id={lease_data.unit_id}, tenant_id={lease_data.tenant_id}")
            raise ValueError("unit_id and tenant_id are required")
        
        if not lease_data.start_date:
            logger.error("start_date is required")
            raise ValueError("start_date is required")
        
        # Step 1: Get unit details and verify it exists and is available
        unit_response = db_client.table('units').select('id, property_id, status').eq('id', str(lease_data.unit_id)).maybe_single().execute()
        
        if not unit_response.data:
            raise ValueError(f"Unit {lease_data.unit_id} does not exist")
        
        unit = unit_response.data
        
        # Check if unit is already occupied
        if unit.get('status') in ['Occupied', 'active']:
            raise ValueError(f"Unit {lease_data.unit_id} is already occupied")
        
        # Step 2: Create the lease record
        lease_id = str(uuid.uuid4())
        lease_insert_data = {
            'id': lease_id,
            'property_id': unit['property_id'],  # Get property_id from unit
            'unit_id': str(lease_data.unit_id),
            'tenant_id': str(lease_data.tenant_id),
            'start_date': lease_data.start_date.isoformat(),
            'end_date': lease_data.end_date.isoformat() if lease_data.end_date else None,
            'rent_amount': float(lease_data.rent_amount) if lease_data.rent_amount else 0.0,
            'deposit_amount': float(lease_data.deposit_amount) if lease_data.deposit_amount else 0.0,
            'rental_type': lease_data.rental_type or 'lease',
            'rental_frequency': lease_data.rental_frequency or 'monthly',
            'maintenance_fee': float(lease_data.maintenance_fee) if lease_data.maintenance_fee else 0.0,
            'advance_amount': float(lease_data.advance_amount) if lease_data.advance_amount else 0.0,
            'status': 'active'
        }
        
        logger.info(f"Creating lease with data: {lease_insert_data}")
        
        lease_response = db_client.table('leases').insert(lease_insert_data).execute()
        
        if not lease_response.data:
            logger.error("Failed to create lease record")
            return None
        
        # Step 3: Update the unit to mark it as occupied
        unit_update_data = {
            'status': 'Occupied',
            'tenant_id': str(lease_data.tenant_id)
        }
        
        logger.info(f"Updating unit {lease_data.unit_id} with data: {unit_update_data}")
        
        unit_update_response = db_client.table('units').update(unit_update_data).eq('id', str(lease_data.unit_id)).execute()
        
        if not unit_update_response.data:
            logger.error("Failed to update unit status")
            # Rollback - delete the lease we just created
            db_client.table('leases').delete().eq('id', lease_id).execute()
            return None
        
        # Return the created lease
        return lease_response.data[0]
        
    except ValueError as e:
        # Re-raise the specific error for the service layer to catch
        raise e
    except Exception as e:
        logger.error(f"Failed to create lease: {str(e)}", exc_info=True)
        return None

async def terminate_lease(db_client: Client, lease_id: uuid.UUID) -> bool:
    """
    Terminates a lease and vacates the unit by calling the
    'terminate_lease_and_vacate_unit' RPC function.
    Returns True on success.
    """
    try:
        rpc_params = {'p_lease_id': str(lease_id)}
        
        # This RPC returns VOID, so we don't expect data back, just a success/error
        response = db_client.rpc('terminate_lease_and_vacate_unit', rpc_params).execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"Error terminating lease via RPC: {response.error.message}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to execute terminate_lease RPC: {str(e)}", exc_info=True)
        return False 