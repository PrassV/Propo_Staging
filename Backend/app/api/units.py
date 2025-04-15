from fastapi import APIRouter, Depends, HTTPException, status, Path, Query, Body
from typing import List, Dict, Any, Optional
import uuid
import logging
from supabase import Client
from pydantic import BaseModel

# Import models (adjust paths as needed)
# Assuming models are in app.models.property for now
from app.models.property import UnitCreate, UnitDetails, UnitUpdate, UnitCreatePayload # Import new payload model
# Import Maintenance models
from app.models.maintenance import MaintenanceRequest, MaintenanceRequestCreate # Placeholder path
# Import Tenant models
from app.models.tenant import Tenant, TenantCreate # Placeholder path
# Import Payment model
from app.models.payment import Payment # Placeholder path

# Import services (adjust paths as needed)
# Using property_service for now, might refactor later
from app.services import property_service
# Import Maintenance service
from app.services import maintenance_service # Placeholder path

# Import dependencies (adjust paths as needed)
from app.config.auth import get_current_user
from app.config.database import get_supabase_client_authenticated
from app.utils.common import PaginationParams # Assuming this exists

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/units",
    tags=["Units"],
    responses={404: {"description": "Unit not found"}},
)

# --- Endpoint Implementations Below --- #

@router.post("/", response_model=UnitDetails, status_code=status.HTTP_201_CREATED, summary="Create New Unit")
async def create_unit_endpoint(
    unit_payload: UnitCreatePayload = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Create a new unit associated with a specific property.
    The property must be owned by the authenticated user.
    Requires `property_id` in the request body.
    """
    logger.info(f"Attempting to create unit for property {unit_payload.property_id}")
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")

    # Extract unit data and property_id from the payload
    property_id_str = str(unit_payload.property_id)
    # Create UnitCreate model from payload, excluding property_id for the service call
    unit_data_dict = unit_payload.model_dump(exclude={'property_id'})
    unit_create_model = UnitCreate(**unit_data_dict)

    # Call the service function (assuming it's still named create_unit for now)
    # This service function needs to handle the auth check using property_id and owner_id
    try:
        new_unit = await property_service.create_unit(
            db_client=db_client,
            property_id=property_id_str,
            unit_data=unit_create_model,
            owner_id=user_id
        )
        # The service function will return None or raise HTTPException 409/500
        if new_unit is None:
             # This should only happen now if property not found / not authorized by service
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                 detail="Property not found or not authorized to add unit")
        return new_unit
    except HTTPException as http_exc:
        # Re-raise 409, 500 etc. from the service layer
        raise http_exc
    except Exception as e:
        logger.error(f"Unexpected error in POST /units endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="An unexpected error occurred while creating the unit.")

# Placeholder for GET /units/{unit_id}
@router.get("/{unit_id}", response_model=UnitDetails, summary="Get Unit Details")
async def get_unit_details_endpoint(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit to retrieve"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Retrieve the details for a specific unit by its ID.
    Requires authentication and authorization (user must own the parent property).
    """
    logger.info(f"Endpoint: Attempting to fetch unit {unit_id}")
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")

    try:
        unit_details = await property_service.get_unit_details(
            db_client=db_client, 
            unit_id=str(unit_id), 
            user_id=user_id
        )
        
        if unit_details is None:
            # Service returns None if unit not found OR user not authorized
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                detail="Unit not found or user not authorized to access it")
                                
        return unit_details
    except HTTPException as http_exc:
        # Re-raise 404 or other specific http errors from service
        raise http_exc
    except Exception as e:
        logger.error(f"Endpoint error getting unit details for {unit_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="An unexpected error occurred while retrieving unit details.")

# Add PUT /units/{unit_id} endpoint
@router.put("/{unit_id}", response_model=UnitDetails, summary="Update Unit Details")
async def update_unit_endpoint(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit to update"),
    update_payload: UnitUpdate = Body(...), # Use UnitUpdate model from models.property
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Update the details for a specific unit by its ID.
    Requires authentication and authorization (user must own the parent property).
    Only fields provided in the request body will be updated.
    """
    logger.info(f"Endpoint: Attempting to update unit {unit_id}")
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")

    try:
        updated_unit_details = await property_service.update_unit_details(
            db_client=db_client,
            unit_id=str(unit_id),
            user_id=user_id,
            update_data=update_payload
        )
        
        if updated_unit_details is None:
            # Service returns None if unit not found OR user not authorized
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Unit not found or user not authorized to update it")
                                
        return updated_unit_details
    except HTTPException as http_exc:
        # Re-raise 404, 500 or other specific http errors from service
        raise http_exc
    except Exception as e:
        logger.error(f"Endpoint error updating unit {unit_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="An unexpected error occurred while updating unit details.")

# Add GET /units endpoint
@router.get("/", response_model=List[UnitDetails], summary="List Units")
async def list_units_endpoint(
    property_id: Optional[uuid.UUID] = Query(None, description="Filter by Property ID"),
    status: Optional[str] = Query(None, description="Filter by unit status (e.g., Vacant, Occupied)"),
    pagination: PaginationParams = Depends(), # Assuming common pagination
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    List units, optionally filtering by property ID or status.
    Returns units associated with properties owned by the authenticated user.
    Supports pagination.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")

    logger.info(f"Listing units for user {user_id}, filters: property_id={property_id}, status={status}")

    try:
        # Call the service layer to get filtered units
        units_list = await property_service.get_filtered_units(
            db_client=db_client, 
            user_id=user_id, 
            property_id=str(property_id) if property_id else None, 
            status=status,
            skip=pagination.skip, 
            limit=pagination.limit
        )
        
        # Note: We are not getting/returning the total count for pagination headers here.
        # This could be added later if needed by modifying the response model or headers.
        
        return units_list
    except Exception as e:
        logger.error(f"Error listing units in endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="An error occurred while listing units.")

# Add DELETE /units/{unit_id} endpoint
@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Unit")
async def delete_unit_endpoint(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Delete a specific unit by its ID.
    Requires authentication and authorization (user must own the parent property).
    Returns 204 No Content on successful deletion.
    """
    logger.info(f"Endpoint: Attempting to delete unit {unit_id}")
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")

    try:
        deleted = await property_service.delete_unit(
            db_client=db_client,
            unit_id=str(unit_id),
            user_id=user_id
        )
        
        if not deleted:
            # Service returns False if unit not found OR user not authorized
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Unit not found or user not authorized to delete it")
                                
        # No content to return on success
        return None 
        
    except HTTPException as http_exc:
        # Re-raise 404, 500 or other specific http errors from service
        raise http_exc
    except Exception as e:
        logger.error(f"Endpoint error deleting unit {unit_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="An unexpected error occurred while deleting the unit.")

# --- Unit Maintenance Requests Endpoints --- #
@router.post("/{unit_id}/maintenance_requests", response_model=MaintenanceRequest, status_code=status.HTTP_201_CREATED, summary="Create Maintenance Request for Unit")
async def create_unit_maintenance_request(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit requiring maintenance"),
    request_data: MaintenanceRequestCreate = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Create a new maintenance request associated with a specific unit.
    Requires authentication and authorization (user must own parent property or be tenant of unit).
    """
    logger.info(f"Endpoint: Creating maintenance request for unit {unit_id}")
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")

    try:
        created_request = await maintenance_service.create_request_for_unit(
            db_client=db_client, 
            unit_id=str(unit_id), 
            user_id=user_id, 
            request_data=request_data
        )
        # Service layer raises HTTPException on error
        return created_request
    except HTTPException as http_exc:
        # Re-raise errors (403, 500) from service layer
        raise http_exc
    except Exception as e:
        logger.error(f"Endpoint error creating maintenance request for unit {unit_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="An unexpected error occurred.")

@router.get("/{unit_id}/maintenance_requests", response_model=List[MaintenanceRequest], summary="List Maintenance Requests for Unit")
async def list_unit_maintenance_requests(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    pagination: PaginationParams = Depends(),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    List maintenance requests associated with a specific unit.
    Requires authentication and authorization (user must own parent property or be tenant of unit).
    """
    logger.info(f"Endpoint: Listing maintenance requests for unit {unit_id}")
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")

    try:
        requests = await maintenance_service.get_requests_for_unit(
            db_client=db_client, 
            unit_id=str(unit_id), 
            user_id=user_id, 
            skip=pagination.skip, 
            limit=pagination.limit
        )
        # Service layer raises HTTPException on error
        return requests
    except HTTPException as http_exc:
        # Re-raise errors (403, 500) from service layer
        raise http_exc
    except Exception as e:
        logger.error(f"Endpoint error listing maintenance requests for unit {unit_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="An unexpected error occurred.")

# --- Unit Tenants Endpoints (Placeholders) --- #

@router.get("/{unit_id}/tenants", response_model=List[Tenant], summary="List Tenants for Unit")
async def list_unit_tenants(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    # Add filtering? e.g., ?status=current
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    List tenants currently or previously associated with a specific unit.
    Requires authentication and authorization (user must own parent property).
    """
    logger.info(f"Endpoint: Listing tenants for unit {unit_id}")
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")

    # TODO: Implement Service Call: tenant_service.get_tenants_for_unit(
    #          db_client, unit_id=str(unit_id), user_id=user_id)
    # TODO: Service needs to perform authorization check (user owns parent property?).
    # TODO: Service needs to query based on unit_id (likely via leases table).
    
    raise HTTPException(status_code=501, detail="List Unit Tenants Not Implemented")

@router.post("/{unit_id}/tenants", response_model=Tenant, status_code=status.HTTP_201_CREATED, summary="Assign Tenant to Unit")
async def assign_tenant_to_unit(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    tenant_assignment: Dict[str, Any] = Body(..., description="Data needed for assignment, e.g., {'tenant_id': '...', 'lease_start': '...', 'lease_end': '...'}"), # Define a proper Pydantic model for this
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Assign a tenant to a specific unit, potentially creating a lease.
    Requires authentication and authorization (user must own parent property).
    Requires tenant_id and potentially lease details in the request body.
    """
    logger.info(f"Endpoint: Assigning tenant to unit {unit_id}")
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")

    # TODO: Define Pydantic model for tenant_assignment payload
    # TODO: Implement Service Call: tenant_service.assign_tenant_to_unit(
    #          db_client, unit_id=str(unit_id), user_id=user_id, assignment_data=tenant_assignment)
    # TODO: Service needs to perform authorization check (user owns parent property?).
    # TODO: Service needs to handle potential lease creation/update and unit status update.
    
    raise HTTPException(status_code=501, detail="Assign Unit Tenant Not Implemented")

# --- Unit Payments Endpoint (Placeholder) --- #

@router.get("/{unit_id}/payments", response_model=List[Payment], summary="List Payments for Unit")
async def list_unit_payments(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    # Add filtering? e.g., ?status=paid, ?start_date=..., ?end_date=...
    pagination: PaginationParams = Depends(),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    List payments associated with a specific unit (likely via tenant/lease).
    Requires authentication and authorization (user must own parent property or be tenant of unit).
    """
    logger.info(f"Endpoint: Listing payments for unit {unit_id}")
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")

    # TODO: Implement Service Call: payment_service.get_payments_for_unit(
    #          db_client, unit_id=str(unit_id), user_id=user_id, 
    #          skip=pagination.skip, limit=pagination.limit)
    # TODO: Service needs to perform authorization check (user owns parent property OR is tenant?).
    # TODO: Service needs to query payments linked to the unit (e.g., via leases associated with the unit).
    
    raise HTTPException(status_code=501, detail="List Unit Payments Not Implemented")

# Add other endpoints here following the plan...
