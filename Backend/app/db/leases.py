import logging
import uuid
from typing import Dict, Any, Optional, List
from supabase import Client
from ..schemas.lease import LeaseCreate

logger = logging.getLogger(__name__)

async def create_lease(db_client: Client, lease_data: LeaseCreate) -> Optional[Dict[str, Any]]:
    """
    Creates a lease and marks the unit as occupied by calling the
    'create_lease_and_occupy_unit' RPC function.
    """
    try:
        rpc_params = {
            'p_unit_id': str(lease_data.unit_id),
            'p_tenant_id': str(lease_data.tenant_id),
            'p_start_date': lease_data.start_date.isoformat(),
            'p_end_date': lease_data.end_date.isoformat(),
            'p_rent_amount': lease_data.rent_amount,
            'p_deposit_amount': lease_data.deposit_amount,
            'p_notes': lease_data.notes
        }
        
        response = db_client.rpc('create_lease_and_occupy_unit', rpc_params).execute()

        if hasattr(response, 'error') and response.error:
            logger.error(f"Error creating lease via RPC: {response.error.message}")
            # The RPC function raises an exception with a specific message for occupied units
            if 'Unit is already occupied' in response.error.message:
                raise ValueError("This unit is already occupied.")
            return None
        
        if not hasattr(response, 'data') or not response.data:
            logger.error("RPC for creating lease returned no data.")
            return None
            
        return response.data
    except ValueError as e:
        # Re-raise the specific error for the service layer to catch
        raise e
    except Exception as e:
        logger.error(f"Failed to execute create_lease RPC: {str(e)}", exc_info=True)
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