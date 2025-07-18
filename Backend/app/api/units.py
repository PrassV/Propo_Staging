from fastapi import APIRouter, Depends, HTTPException, status, Path, Query, Body, Response
from typing import List, Dict, Any, Optional
import uuid
import logging
from supabase import Client
from pydantic import BaseModel
from datetime import date

# Import models (adjust paths as needed)
# Assuming models are in app.models.property for now
from app.models.property import UnitCreate, UnitDetails, UnitUpdate, UnitCreatePayload, Amenity, AmenityCreate, AmenityUpdate, UnitTax, UnitTaxCreate, UnitTaxUpdate, Lease  # Import new payload model - removed Unit base model
# Import Maintenance models
from app.models.maintenance import MaintenanceRequest, MaintenanceCreate # Changed from MaintenanceRequestCreate
# Import Tenant models
from app.models.tenant import Tenant, TenantCreate, TenantAssignment
# Import Payment model
from app.models.payment import Payment
# Import Amenity models

# Import services (adjust paths as needed)
# Using property_service for now, might refactor later
from app.services import property_service
# Import Maintenance service
from app.services import maintenance_service
# Import Tenant service
from app.services import tenant_service
# Import Payment service
from app.services import payment_service
# Import Lease service
from app.services import lease_service

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

class LeaseTerminationPayload(BaseModel):
    termination_date: date

# Response model for unit with lease info
class UnitWithLeaseResponse(BaseModel):
    unit: UnitDetails
    current_lease: Optional[Lease] = None

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
    unit_data_dict = unit_payload.dict(exclude={'property_id'})
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

@router.get("/{unit_id}", response_model=UnitDetails, summary="Get Unit Details")
async def get_unit_details_endpoint(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit to retrieve"),
    include_lease: bool = Query(False, description="Include current lease information"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Get details for a specific unit, including the current tenant information.
    Requires authentication and authorization (user must own parent property).
    """
    logger.info(f"Endpoint: Getting unit details for {unit_id}")
    user_id = current_user.get("id")
    
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
    
    try:
        # Get unit basic details and ensure the unit exists and user is authorized
        unit_details = await property_service.get_unit_details(db_client, unit_id, user_id)
        if unit_details is None:
            # Unit not found or user not authorized
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Unit not found or not authorized to view details")
        
        # Get current lease information if requested
        if include_lease:
            try:
                lease = await lease_service.get_lease_by_unit(
                    db_client=db_client,
                    unit_id=unit_id,
                    owner_id=user_id
                )
                if lease:
                    unit_details["current_lease"] = lease
            except Exception as lease_error:
                logger.warning(f"Could not fetch lease for unit {unit_id}: {lease_error}")
                # Don't fail the whole request if lease fetch fails
        
        # Additionally, attempt to get current tenant information
        try:
            tenant_info = await tenant_service.get_current_tenant_for_unit(unit_id)
            if tenant_info:
                unit_details["current_tenant"] = tenant_info
        except Exception as tenant_error:
            logger.warning(f"Could not fetch tenant for unit {unit_id}: {tenant_error}")
            # Don't fail the whole request if tenant fetch fails
        
        return unit_details
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions from service layer
        raise http_exc
    except Exception as e:
        logger.error(f"Error retrieving unit details for {unit_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail="Failed to retrieve unit details")

# New endpoint specifically for unit with lease information
@router.get("/{unit_id}/with-lease", response_model=UnitWithLeaseResponse, summary="Get Unit Details with Lease")
async def get_unit_with_lease_endpoint(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit to retrieve"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Get details for a specific unit with lease information.
    This endpoint always includes lease information if available.
    """
    logger.info(f"Endpoint: Getting unit with lease details for {unit_id}")
    user_id = current_user.get("id")
    
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
    
    try:
        # Get unit basic details
        unit_details = await property_service.get_unit_details(db_client, unit_id, user_id)
        if unit_details is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Unit not found or not authorized to view details")
        
        # Get current lease information
        current_lease = None
        try:
            current_lease = await lease_service.get_lease_by_unit(
                db_client=db_client,
                unit_id=unit_id,
                owner_id=user_id
            )
        except Exception as lease_error:
            logger.warning(f"Could not fetch lease for unit {unit_id}: {lease_error}")
        
        return UnitWithLeaseResponse(
            unit=unit_details,
            current_lease=current_lease
        )
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error retrieving unit with lease for {unit_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail="Failed to retrieve unit details")

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

@router.delete(
    "/{unit_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a unit",
    description="Deletes a specific unit by its ID after verifying ownership of the parent property.",
)
async def delete_unit(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated),
):
    """
    Delete a unit.
    - Verifies that the user requesting deletion is the owner of the property to which the unit belongs.
    - If successful, returns a 204 No Content response.
    """
    try:
        success = await property_service.delete_unit(
            db_client=db_client,
            unit_id=unit_id,
            owner_id=current_user["id"],
        )
        if not success:
            # The service layer handles logging and distinguishing between not found and not authorized
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unit not found or user does not have permission to delete it.",
            )
        # On success, return 204 No Content, so no response body is needed.
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"API error deleting unit {unit_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected server error occurred.",
        )

# --- Unit Maintenance Requests Endpoints --- #
@router.post("/{unit_id}/maintenance_requests", response_model=MaintenanceRequest, status_code=status.HTTP_201_CREATED, summary="Create Maintenance Request for Unit")
async def create_unit_maintenance_request(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit requiring maintenance"),
    request_data: MaintenanceCreate = Body(...), # Changed type hint
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
    user_id_str = current_user.get("id")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")

    try:
        # Note: Service function expects string IDs
        requests = await maintenance_service.get_requests_for_unit(
            db_client=db_client, 
            unit_id=str(unit_id), 
            user_id=user_id_str, 
            skip=pagination.skip, 
            limit=pagination.limit
        )
        # Service layer raises HTTPException on error/auth failure
        return requests
    except HTTPException as http_exc:
        # Re-raise errors (403, 500) from service layer
        raise http_exc
    except Exception as e:
        logger.exception(f"Endpoint error listing maintenance requests for unit {unit_id}: {e}")
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
    user_id_str = current_user.get("id")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
    
    try:
        user_id = uuid.UUID(user_id_str)
        tenants = await tenant_service.get_tenants_for_unit(
            unit_id=unit_id, 
            requesting_user_id=user_id
        )
        # Service layer handles exceptions and authorization
        return tenants
    except HTTPException as http_exc:
        # Re-raise exceptions from the service layer (403, 404, 500)
        raise http_exc
    except ValueError: # Catch UUID conversion error
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format in token")
    except Exception as e:
        # Catch-all for unexpected errors
        logger.exception(f"Unexpected error in list_unit_tenants endpoint for unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@router.post("/{unit_id}/tenants", response_model=Tenant, status_code=status.HTTP_201_CREATED, summary="Assign Tenant to Unit")
async def assign_tenant_to_unit(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    tenant_assignment: TenantAssignment = Body(..., description="Data needed for tenant assignment"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Assign a tenant to a unit. This creates a property_tenants link.
    If the tenant does not exist, they can be created first.
    If the unit is already occupied, the request will be rejected.
    """
    logger.info(f"Attempting to assign tenant to unit {unit_id}")
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authorized")

    # The service layer will handle the logic of checking for existing tenants,
    # creating the link, and updating statuses.
    try:
        # Pydantic v1
        assignment_data_dict = tenant_assignment.dict()
        
        assigned_tenant = await tenant_service.assign_tenant_to_unit(
            db_client=db_client,
            unit_id=unit_id,
            user_id=user_id,
            assignment_data=assignment_data_dict
        )
        if not assigned_tenant:
            # Service layer should raise specific HTTPException, but have a fallback
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Failed to assign tenant. The unit might be occupied or tenant data is invalid.")
        return assigned_tenant
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error assigning tenant to unit {unit_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="An unexpected error occurred during tenant assignment.")

@router.post("/{unit_id}/terminate_lease", status_code=status.HTTP_200_OK)
async def terminate_lease(
    unit_id: str,
    payload: LeaseTerminationPayload,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Terminates a tenant's lease for a unit.
    This action can only be performed by a property owner.
    """
    user_id = current_user.get("id")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="User not authorized"
        )

    success = await tenant_service.terminate_lease_for_unit(
        unit_id=unit_id,
        owner_id=user_id,
        termination_date=payload.termination_date
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to terminate lease. The unit may not be occupied or the lease is already terminated."
        )

    return {"message": "Lease terminated successfully"}

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
    user_id_str = current_user.get("id")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")

    try:
        user_id = uuid.UUID(user_id_str)
        # Note: Service function returns tuple (items, total_count), but endpoint model expects List[Payment]
        payments_list, _ = await payment_service.get_payments_for_unit(
            db_client=db_client, 
            unit_id=unit_id, 
            requesting_user_id=user_id,
            skip=pagination.skip,
            limit=pagination.limit
        )
        # Service layer handles exceptions and authorization
        return payments_list # Return only the list part
    except HTTPException as http_exc:
        # Re-raise errors (403, 404, 500) from service layer
        raise http_exc
    except ValueError: # Catch UUID conversion error
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID format in token")
    except Exception as e:
        # Catch-all for unexpected errors
        logger.exception(f"Unexpected error in list_unit_payments endpoint for unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

# --- Unit Amenities Endpoints --- #

@router.get("/{unit_id}/amenities", response_model=List[Amenity], summary="List Amenities for Unit")
async def list_unit_amenities(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    List amenities associated with a specific unit.
    Requires authentication and authorization (user must own parent property).
    """
    user_id_str = current_user.get("id")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
    try:
        amenities = await property_service.get_unit_amenities(db_client, unit_id, user_id_str)
        return amenities
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Endpoint error listing amenities for unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@router.post("/{unit_id}/amenities", response_model=Amenity, status_code=status.HTTP_201_CREATED, summary="Add Amenity to Unit")
async def add_unit_amenity(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    amenity_data: AmenityCreate = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Add a new amenity to a specific unit.
    Requires authentication and authorization (user must own parent property).
    """
    user_id_str = current_user.get("id")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
    try:
        created_amenity = await property_service.create_unit_amenity(db_client, unit_id, user_id_str, amenity_data)
        return created_amenity
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Endpoint error creating amenity for unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@router.put("/{unit_id}/amenities/{amenity_id}", response_model=Amenity, summary="Update Amenity for Unit")
async def update_unit_amenity_endpoint(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    amenity_id: uuid.UUID = Path(..., description="The ID of the amenity to update"),
    amenity_data: AmenityUpdate = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Update an existing amenity for a specific unit.
    Requires authentication and authorization (user must own parent property).
    """
    user_id_str = current_user.get("id")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
    try:
        updated_amenity = await property_service.update_unit_amenity(db_client, unit_id, amenity_id, user_id_str, amenity_data)
        return updated_amenity
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Endpoint error updating amenity {amenity_id} for unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@router.delete("/{unit_id}/amenities/{amenity_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Amenity from Unit")
async def delete_unit_amenity_endpoint(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    amenity_id: uuid.UUID = Path(..., description="The ID of the amenity to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Delete an amenity from a specific unit.
    Requires authentication and authorization (user must own parent property).
    """
    user_id_str = current_user.get("id")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
    try:
        await property_service.delete_unit_amenity(db_client, unit_id, amenity_id, user_id_str)
        return None # Return None for 204 No Content
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Endpoint error deleting amenity {amenity_id} for unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

# --- Unit Taxes Endpoints --- #

@router.get("/{unit_id}/taxes", response_model=List[UnitTax], summary="List Taxes for Unit")
async def list_unit_taxes(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    List tax records associated with a specific unit.
    Requires authentication and authorization (user must own parent property).
    """
    user_id_str = current_user.get("id")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
    try:
        taxes = await property_service.get_unit_taxes(db_client, unit_id, user_id_str)
        return taxes
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Endpoint error listing taxes for unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@router.post("/{unit_id}/taxes", response_model=UnitTax, status_code=status.HTTP_201_CREATED, summary="Add Tax Record to Unit")
async def add_unit_tax(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    tax_data: UnitTaxCreate = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Add a new tax record to a specific unit.
    Requires authentication and authorization (user must own parent property).
    """
    user_id_str = current_user.get("id")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
    try:
        created_tax = await property_service.create_unit_tax(db_client, unit_id, user_id_str, tax_data)
        return created_tax
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Endpoint error creating tax record for unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@router.put("/{unit_id}/taxes/{tax_id}", response_model=UnitTax, summary="Update Tax Record for Unit")
async def update_unit_tax_endpoint(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    tax_id: uuid.UUID = Path(..., description="The ID of the tax record to update"),
    tax_data: UnitTaxUpdate = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Update an existing tax record for a specific unit.
    Requires authentication and authorization (user must own parent property).
    """
    user_id_str = current_user.get("id")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
    try:
        updated_tax = await property_service.update_unit_tax(db_client, unit_id, tax_id, user_id_str, tax_data)
        return updated_tax
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Endpoint error updating tax record {tax_id} for unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@router.delete("/{unit_id}/taxes/{tax_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Tax Record from Unit")
async def delete_unit_tax_endpoint(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    tax_id: uuid.UUID = Path(..., description="The ID of the tax record to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Delete a tax record from a specific unit.
    Requires authentication and authorization (user must own parent property).
    """
    user_id_str = current_user.get("id")
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
    try:
        await property_service.delete_unit_tax(db_client, unit_id, tax_id, user_id_str)
        return None # Return None for 204 No Content
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Endpoint error deleting tax record {tax_id} for unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@router.get("/{unit_id}/history", response_model=dict, summary="Get Unit History")
async def get_unit_history(
    unit_id: uuid.UUID = Path(..., description="The ID of the unit"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Get the complete history of a unit, including previous tenants, leases, and payments.
    Requires authentication and authorization (user must own parent property).
    """
    logger.info(f"Endpoint: Getting history for unit {unit_id}")
    user_id = current_user.get("id")
    
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user credentials")
    
    try:
        # Verify user has access to this unit
        unit_details = await property_service.get_unit_details(db_client, unit_id, user_id)
        if not unit_details:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found or access denied")
        
        # Get historical data
        tenants = await tenant_service.get_tenants_for_unit(unit_id, user_id)
        leases = await tenant_service.get_leases_for_unit(unit_id)
        payments, _ = await payment_service.get_payments_for_unit(db_client, unit_id, user_id, skip=0, limit=100)  # Get payments with pagination
        maintenance_requests = await maintenance_service.get_requests_for_unit(db_client, str(unit_id), user_id)
        
        return {
            "unit_id": str(unit_id),
            "unit_number": unit_details.get("unit_number"),
            "property_id": unit_details.get("property_id"),
            "tenants": tenants,
            "leases": leases,
            "payments": payments,
            "maintenance_requests": maintenance_requests
        }
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions from service layer
        raise http_exc
    except Exception as e:
        logger.error(f"Error retrieving unit history for {unit_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail="Failed to retrieve unit history")

# Add other endpoints here following the plan...
