import logging
import uuid
from typing import Dict, Any, Optional
from supabase import Client
from fastapi import HTTPException, status

from ..schemas.lease import Lease, LeaseCreate
from ..db import leases as lease_db
from ..db import properties as property_db # To verify ownership

logger = logging.getLogger(__name__)

async def create_lease(db_client: Client, lease_data: LeaseCreate, owner_id: str) -> Optional[Lease]:
    """
    Service function to create a new lease.
    It performs ownership verification before calling the database layer.
    """
    try:
        # Step 1: Verify the user owns the property associated with the unit.
        unit_property_owner = await property_db.get_property_owner_for_unit(db_client, lease_data.unit_id)
        if not unit_property_owner or unit_property_owner != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to create a lease for this unit."
            )

        # Step 2: Call the database layer to execute the atomic creation.
        new_lease_data = await lease_db.create_lease(db_client, lease_data)

        if not new_lease_data:
            # This can happen if a non-specific DB error occurred in the db layer
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create lease in the database."
            )
        
        return Lease.parse_obj(new_lease_data)

    except ValueError as e:
        # This catches the specific "Unit is already occupied" error
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except HTTPException as e:
        # Re-raise HTTP exceptions from this function or called functions
        raise e
    except Exception as e:
        logger.error(f"Unexpected error in create_lease service: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating the lease."
        )

async def terminate_lease(db_client: Client, lease_id: uuid.UUID, owner_id: str) -> None:
    """
    Service function to terminate a lease.
    It verifies ownership of the associated property before proceeding.
    """
    try:
        # Step 1: Get the unit_id from the lease, then find the property owner.
        # This is a critical authorization step.
        lease_response = await db_client.table('leases').select('unit_id').eq('id', lease_id).single().execute()
        if not hasattr(lease_response, 'data') or not lease_response.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lease not found.")
        
        unit_id = lease_response.data.get('unit_id')
        if not unit_id:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not find unit associated with the lease.")

        unit_property_owner = await property_db.get_property_owner_for_unit(db_client, unit_id)
        if not unit_property_owner or unit_property_owner != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to terminate this lease."
            )

        # Step 2: If authorized, call the atomic DB function.
        success = await lease_db.terminate_lease(db_client, lease_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to terminate lease in the database."
            )
        
        # On success, there is nothing to return.
        return

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Unexpected error in terminate_lease service: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while terminating the lease."
        ) 