import logging
import uuid
from typing import Dict, Any, Optional, List, Tuple
from supabase import Client
from fastapi import HTTPException, status

# Updated imports to use the new models
from app.models.property import Lease, LeaseCreate, LeaseUpdate
from ..db import leases as lease_db
from ..db import properties as property_db # To verify ownership

logger = logging.getLogger(__name__)

async def get_leases(
    db_client: Client,
    owner_id: str,
    property_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    active_only: bool = False,
    skip: int = 0,
    limit: int = 10
) -> Tuple[List[Lease], int]:
    """
    Get leases for the owner with optional filtering.
    """
    try:
        # Build query filters
        query = db_client.table('leases').select('*')
        
        # Filter by property ownership
        if property_id:
            # Verify owner has access to this property
            property_owner = await property_db.get_property_owner(db_client, property_id)
            if property_owner != owner_id:
                raise HTTPException(status_code=403, detail="Not authorized to access this property")
            query = query.eq('property_id', property_id)
        else:
            # Get all properties owned by this user and filter leases
            properties_response = await db_client.table('properties').select('id').eq('owner_id', owner_id).execute()
            if properties_response.data:
                property_ids = [p['id'] for p in properties_response.data]
                query = query.in_('property_id', property_ids)
            else:
                return [], 0  # No properties, no leases
        
        if tenant_id:
            query = query.eq('tenant_id', tenant_id)
            
        if active_only:
            query = query.eq('status', 'active')
        
        # Get total count
        count_response = await query.execute()
        total = len(count_response.data) if count_response.data else 0
        
        # Get paginated results
        response = await query.range(skip, skip + limit - 1).execute()
        
        leases = []
        if response.data:
            for lease_data in response.data:
                leases.append(Lease.model_validate(lease_data))
        
        return leases, total
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting leases: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve leases")

async def get_lease_by_id(db_client: Client, lease_id: uuid.UUID, owner_id: str) -> Optional[Lease]:
    """
    Get a specific lease by ID with ownership verification.
    """
    try:
        response = await db_client.table('leases').select('*').eq('id', str(lease_id)).single().execute()
        
        if not response.data:
            return None
            
        lease_data = response.data
        
        # Verify ownership through property
        property_owner = await property_db.get_property_owner(db_client, lease_data['property_id'])
        if property_owner != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this lease")
        
        return Lease.model_validate(lease_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lease {lease_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve lease")

async def get_lease_by_unit(db_client: Client, unit_id: uuid.UUID, owner_id: str) -> Optional[Lease]:
    """
    Get the current active lease for a unit.
    """
    try:
        # First verify the owner has access to this unit
        unit_property_owner = await property_db.get_property_owner_for_unit(db_client, str(unit_id))
        if not unit_property_owner or unit_property_owner != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this unit")
        
        # Get active lease for the unit
        response = await db_client.table('leases').select('*').eq('unit_id', str(unit_id)).eq('status', 'active').single().execute()
        
        if not response.data:
            return None
            
        return Lease.model_validate(response.data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lease for unit {unit_id}: {e}", exc_info=True)
        return None  # Return None instead of raising exception for this case

async def update_lease(db_client: Client, lease_id: uuid.UUID, lease_data: LeaseUpdate, owner_id: str) -> Optional[Lease]:
    """
    Update a lease with ownership verification.
    """
    try:
        # First verify ownership
        existing_lease = await get_lease_by_id(db_client, lease_id, owner_id)
        if not existing_lease:
            return None
        
        # Update the lease
        update_data = lease_data.model_dump(exclude_unset=True)
        if not update_data:
            return existing_lease  # No changes
        
        response = await db_client.table('leases').update(update_data).eq('id', str(lease_id)).execute()
        
        if not response.data:
            return None
            
        return Lease.model_validate(response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lease {lease_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update lease")

async def delete_lease(db_client: Client, lease_id: uuid.UUID, owner_id: str) -> bool:
    """
    Delete a lease with ownership verification.
    """
    try:
        # First verify ownership
        existing_lease = await get_lease_by_id(db_client, lease_id, owner_id)
        if not existing_lease:
            return False
        
        # Delete the lease
        response = await db_client.table('leases').delete().eq('id', str(lease_id)).execute()
        
        return len(response.data) > 0
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting lease {lease_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete lease")

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
        
        return Lease.model_validate(new_lease_data)

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