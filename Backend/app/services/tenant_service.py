from typing import List, Dict, Any, Optional, Tuple
import logging
from datetime import datetime, timedelta, date
import uuid
import secrets # For invitation tokens
from fastapi import HTTPException, status
from supabase import Client  # Add missing import for Supabase Client

from ..models.tenant import (
    TenantCreate, TenantUpdate, Tenant,
    PropertyTenantLink, PropertyTenantLinkCreate, PropertyTenantLinkUpdate,
    TenantInvitationCreate, TenantInvitation, InvitationStatus, TenantStatus
)
from ..db import tenants as tenants_db
from ..db import properties as properties_db
# Import other DB layers or services as needed
# from ..services import notification_service # Example for sending invites

logger = logging.getLogger(__name__)

# --- Helper for Access Control ---
# This logic might need refinement based on specific roles (owner, manager, tenant)
async def _can_access_tenant(tenant_id: uuid.UUID, requesting_user_id: uuid.UUID) -> bool:
    # Convert requesting user ID to string for comparison
    user_id_str = str(requesting_user_id)

    # Option 1: Tenant accessing their own profile (assuming tenant.user_id links to auth.users.id)
    tenant_profile = await tenants_db.get_tenant_by_id(tenant_id)
    if tenant_profile and tenant_profile.get("user_id") == user_id_str:
        return True

    # Option 2: Is the requesting user the owner who created this tenant?
    if tenant_profile and tenant_profile.get("owner_id") == user_id_str:
        return True

    # Option 3: Property owner/manager accessing a tenant linked to their property
    linked_properties = await tenants_db.get_property_links_for_tenant(tenant_id)
    for link in linked_properties:
        from ..config.database import supabase_client as db_client
        property_owner = await properties_db.get_property_owner(db_client, link["property_id"])
        if property_owner == user_id_str:
            return True # User owns a property this tenant is linked to

    logger.warning(f"User {requesting_user_id} denied access to tenant {tenant_id}")
    return False

# --- Tenant CRUD ---

async def get_tenants(
    owner_id: uuid.UUID,
    property_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    sort_by: str = 'created_at',
    sort_order: str = 'desc'
    # Add more filters as needed (e.g., name, email, status)
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Get tenants associated with properties owned by the requesting user.
    Optionally filter by a specific property ID.
    Includes pagination and sorting.
    """
    try:
        if property_id:
            # If filtering by property, use the existing function
            tenant_dicts, total_count = await tenants_db.get_tenants_for_owner(
                owner_id=owner_id,
                property_id=property_id,
                status=status,
                skip=skip,
                limit=limit,
                sort_by=sort_by,
                sort_order=sort_order
            )
        else:
            # If getting all tenants for an owner, use the enriched lookup with property/unit info
            tenant_dicts, total_count = await tenants_db.get_enriched_tenants_by_owner_id(
                owner_id=owner_id,
                status=status,
                skip=skip,
                limit=limit,
                sort_by=sort_by,
                sort_order=sort_order
            )
        return tenant_dicts, total_count
    except Exception as e:
        logger.error(f"Error in get_tenants service: {str(e)}")
        return [], 0

async def get_tenant_by_id(tenant_id: uuid.UUID, requesting_user_id: uuid.UUID) -> Optional[Tenant]:
    """
    Get a specific tenant by ID, performing access control.
    Now includes property information for frontend compatibility.
    """
    try:
        if not await _can_access_tenant(tenant_id, requesting_user_id):
            return None # Access denied

        # Get basic tenant data
        tenant_dict = await tenants_db.get_tenant_by_id(tenant_id)
        if not tenant_dict:
            return None
            
        # Enrich with property information
        tenant_dict = await _enrich_tenant_with_property_info(tenant_dict)
        
        return Tenant(**tenant_dict) if tenant_dict else None
    except Exception as e:
        logger.error(f"Error in get_tenant_by_id service: {str(e)}")
        return None

async def _enrich_tenant_with_property_info(tenant_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enrich tenant data with property information for frontend compatibility.
    Now uses the single source of truth view for consistent data.
    """
    try:
        tenant_id = tenant_dict.get('id')
        if not tenant_id:
            return tenant_dict
            
        # Use the new single source of truth view
        from ..config.database import supabase_client as db_client
        
        response = db_client.from_('enriched_tenants_view')\
            .select('*')\
            .eq('id', str(tenant_id))\
            .single()\
            .execute()
        
        if response.data:
            # The view already includes all the enriched data
            return response.data
        else:
            # Fallback to original data if view doesn't return anything
            return tenant_dict
            
    except Exception as e:
        logger.error(f"Error enriching tenant with property info: {str(e)}")
        return tenant_dict  # Return original data if enrichment fails

async def create_tenant(tenant_data: TenantCreate, creator_user_id: uuid.UUID) -> Optional[Tenant]:
    """
    Create a new tenant record.
    """
    try:
        # Make sure we're working with a TenantCreate object, not a dict
        if isinstance(tenant_data, dict):
            # Convert dict to TenantCreate if someone passed a dict
            tenant_data = TenantCreate(**tenant_data)
        
        # Ensure tenant has proper status
        tenant_status = getattr(tenant_data, "status", None)
        if not tenant_status:
            # Set default status if not provided
            tenant_data.status = TenantStatus.UNASSIGNED

        # Extract core tenant data, excluding any relationships that would be handled separately
        # Handle both Pydantic v1 (dict) and v2 (model_dump)
        if hasattr(tenant_data, "model_dump"):
            tenant_dict = tenant_data.model_dump(exclude_unset=True)
        else:
            # Pydantic v1 compatibility
            tenant_dict = tenant_data.model_dump(exclude_unset=True)
        
        tenant_id = uuid.uuid4()
        
        # Check if tenant already exists by email
        existing_tenant = await tenants_db.get_tenant_by_email(tenant_data.email)
        
        if existing_tenant:
            logger.warning(f"Tenant with email {tenant_data.email} already exists (ID: {existing_tenant['id']})")
            # Fix: Convert string ID to UUID for proper handling
            tenant_id = uuid.UUID(existing_tenant['id']) if isinstance(existing_tenant['id'], str) else existing_tenant['id']
            # We could update existing tenant details here if needed
        else:
            # Create the core tenant record
            tenant_dict["id"] = tenant_id
            # Set the user_id to satisfy the not-null constraint
            # This will be updated later when the tenant creates an account
            tenant_dict["user_id"] = str(creator_user_id)
            # Set the owner_id to permanently track which owner created this tenant
            tenant_dict["owner_id"] = str(creator_user_id)
            tenant_dict["created_at"] = datetime.utcnow()
            tenant_dict["updated_at"] = datetime.utcnow()

            # Convert date/enums to appropriate formats for DB
            for key in ['dob', 'rental_start_date', 'rental_end_date', 'lease_start_date', 'lease_end_date']:
                if key in tenant_dict and tenant_dict[key]:
                    tenant_dict[key] = tenant_dict[key].isoformat()
                    
            for key in ['gender', 'id_type', 'rental_type', 'rental_frequency', 'electricity_responsibility', 'water_responsibility', 'property_tax_responsibility', 'status']:
                if key in tenant_dict and tenant_dict[key] and hasattr(tenant_dict[key], 'value'):
                    tenant_dict[key] = tenant_dict[key].value
                    
            # Map gender values to match database constraint (prefer_not_to_say -> other)
            if 'gender' in tenant_dict and tenant_dict['gender']:
                gender_mapping = {
                    'prefer_not_to_say': 'other',
                    'male': 'male',
                    'female': 'female',
                    'other': 'other'
                }
                tenant_dict['gender'] = gender_mapping.get(tenant_dict['gender'], 'other')

            # Create the tenant in the database
            created_tenant_dict = await tenants_db.create_tenant(tenant_dict)
            if not created_tenant_dict:
                logger.error(f"Failed to create tenant record in DB for email {tenant_data.email}")
                return None
            
            # Fix: Ensure tenant_id is a UUID object for consistency
            tenant_id = uuid.UUID(created_tenant_dict['id']) if isinstance(created_tenant_dict['id'], str) else created_tenant_dict['id']
            logger.info(f"Successfully created tenant with ID: {tenant_id}")
            
        # Return the created tenant
        final_tenant_dict = await tenants_db.get_tenant_by_id(tenant_id)
        return Tenant(**final_tenant_dict) if final_tenant_dict else None

    except Exception as e:
        logger.exception(f"Error in create_tenant service: {str(e)}")
        return None

async def update_tenant(tenant_id: uuid.UUID, tenant_data: TenantUpdate, requesting_user_id: uuid.UUID) -> Optional[Tenant]:
    """
    Update an existing tenant's profile information.
    Requires appropriate permissions (tenant updating self, or owner updating linked tenant).
    """
    try:
        if not await _can_access_tenant(tenant_id, requesting_user_id):
            return None # Access denied

        # Handle both Pydantic v1 (dict) and v2 (model_dump)
        if hasattr(tenant_data, "model_dump"):
            update_dict = tenant_data.model_dump(exclude_unset=True)
        else:
            # Pydantic v1 compatibility
            update_dict = tenant_data.model_dump(exclude_unset=True)
            
        if not update_dict:
            logger.warning("Update tenant called with no data to update.")
            # Return current tenant data if no changes
            return await get_tenant_by_id(tenant_id, requesting_user_id)

        update_dict["updated_at"] = datetime.utcnow()

        # Convert date/enums if necessary for DB layer
        for key in ['dob', 'rental_start_date', 'rental_end_date', 'lease_start_date', 'lease_end_date']:
            if key in update_dict and update_dict[key]:
                update_dict[key] = update_dict[key].isoformat()
        for key in ['gender', 'id_type', 'rental_type', 'rental_frequency', 'electricity_responsibility', 'water_responsibility', 'property_tax_responsibility']:
             if key in update_dict and update_dict[key]:
                update_dict[key] = update_dict[key].value
                
        # Map gender values to match database constraint (prefer_not_to_say -> other)
        if 'gender' in update_dict and update_dict['gender']:
            gender_mapping = {
                'prefer_not_to_say': 'other',
                'male': 'male',
                'female': 'female',
                'other': 'other'
            }
            update_dict['gender'] = gender_mapping.get(update_dict['gender'], 'other')

        updated_tenant_dict = await tenants_db.update_tenant(tenant_id, update_dict)
        return Tenant(**updated_tenant_dict) if updated_tenant_dict else None
    except Exception as e:
        logger.exception(f"Error in update_tenant service: {str(e)}")
        return None

async def delete_tenant(tenant_id: uuid.UUID, requesting_user_id: uuid.UUID) -> bool:
    """
    Delete a tenant record and all associated property links.
    Requires owner permission on at least one linked property.
    WARNING: This permanently deletes the tenant record.
    Consider deactivation or only removing links instead.
    """
    try:
        # Perform access check - user must own at least one property linked to the tenant
        linked_properties = await tenants_db.get_property_links_for_tenant(tenant_id)
        can_delete = False
        owned_property_links = []
        for link in linked_properties:
            from ..config.database import supabase_client as db_client
            property_owner = await properties_db.get_property_owner(db_client, link["property_id"])
            if property_owner == str(requesting_user_id):
                can_delete = True
                owned_property_links.append(link["id"])

        if not can_delete:
            logger.warning(f"User {requesting_user_id} does not have permission to delete tenant {tenant_id}")
            return False

        # 1. Delete links from property_tenants
        # Should we delete only links owned by the user or all links?
        # Deleting all links since we are deleting the tenant.
        links_deleted = await tenants_db.delete_property_tenant_links_by_tenant(tenant_id)
        if not links_deleted:
             logger.error(f"Failed to delete property links for tenant {tenant_id}")
             # Continue to attempt tenant deletion anyway?

        # 2. Delete tenant record
        tenant_deleted = await tenants_db.delete_tenant(tenant_id)
        if not tenant_deleted:
             logger.error(f"Failed to delete tenant record {tenant_id} after deleting links")
             return False

        logger.info(f"Tenant {tenant_id} and associated links deleted by user {requesting_user_id}")
        return True
    except Exception as e:
        logger.exception(f"Error in delete_tenant service: {str(e)}")
        return False

# --- Tenant Status Management ---

async def _validate_tenant_status_change_business_logic(
    tenant_id: uuid.UUID,
    new_status: str
) -> None:
    """
    Pre-validate tenant status change against business logic rules.
    This provides better error messages before database trigger validation.
    """
    from ..config.database import supabase_client
    
    try:
        # Check current unit assignment
        current_assignment = supabase_client.rpc(
            'get_current_unit_assignment',
            {'tenant_uuid': str(tenant_id)}
        ).execute()
        
        has_active_lease = bool(current_assignment.data)
        
        # Check recent lease history for inactive status
        if new_status == 'inactive':
            recent_lease_check = supabase_client.rpc(
                'has_recent_active_lease',
                {'tenant_uuid': str(tenant_id), 'months_back': 3}
            ).execute()
            
            if recent_lease_check.data:
                raise ValueError("Cannot set tenant to inactive: tenant has had active lease in last 3 months")
        
        # Check active lease for unassigned status
        elif new_status == 'unassigned':
            if has_active_lease:
                assignment_info = current_assignment.data[0] if current_assignment.data else {}
                unit_info = f"unit {assignment_info.get('unit_number', 'unknown')}"
                raise ValueError(f"Cannot set tenant to unassigned: tenant has active lease on {unit_info}. Terminate lease first.")
        
        # Check lease requirement for active status
        elif new_status == 'active':
            if not has_active_lease:
                raise ValueError("Cannot set tenant to active: tenant must have an active lease assignment")
                
    except Exception as e:
        logger.error(f"Error validating tenant status change: {str(e)}")
        raise

async def update_tenant_status(
    tenant_id: uuid.UUID,
    new_status: str,
    reason: Optional[str] = None,
    requesting_user_id: uuid.UUID = None
) -> Optional[Dict[str, Any]]:
    """
    Update tenant status with proper validation and business logic enforcement.
    
    Business Logic Rules:
    1. Unassigned tenants cannot have active leases
    2. Active tenants must have active lease assignments
    3. Inactive tenants cannot have had active leases in last 3 months
    
    Args:
        tenant_id: The tenant ID
        new_status: The new status to set ('active', 'inactive', 'unassigned')
        reason: Optional reason for the status change
        requesting_user_id: ID of the user making the request
        
    Returns:
        Updated tenant data or None if failed
    """
    try:
        # Validate that the requesting user can access this tenant
        if requesting_user_id and not await _can_access_tenant(tenant_id, requesting_user_id):
            logger.error(f"User {requesting_user_id} cannot access tenant {tenant_id}")
            return None
        
        # Validate the status value
        valid_statuses = ['active', 'inactive', 'unassigned']
        if new_status not in valid_statuses:
            logger.error(f"Invalid status {new_status}. Must be one of: {valid_statuses}")
            return None
        
        # Get current tenant data for validation
        current_tenant = await tenants_db.get_tenant_by_id(tenant_id)
        if not current_tenant:
            logger.error(f"Tenant {tenant_id} not found")
            return None
        
        # Check if status is actually changing
        if current_tenant.get('status') == new_status:
            logger.info(f"Tenant {tenant_id} status already {new_status}")
            return current_tenant
        
        # Validate business logic rules using helper function
        try:
            await _validate_tenant_status_change_business_logic(tenant_id, new_status)
        except ValueError as validation_error:
            logger.error(f"Business logic validation failed for tenant {tenant_id}: {str(validation_error)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Status change validation failed: {str(validation_error)}"
            )
        
        # Perform the status update - the database trigger will enforce business rules
        success = await tenants_db.update_tenant_status(tenant_id, new_status)
        if not success:
            logger.error(f"Failed to update tenant {tenant_id} status to {new_status}")
            return None
        
        # Get the updated tenant data
        updated_tenant = await tenants_db.get_tenant_by_id(tenant_id)
        
        # Log the status change
        logger.info(f"Tenant {tenant_id} status updated to {new_status} by {requesting_user_id}")
        if reason:
            logger.info(f"Reason: {reason}")
        
        return updated_tenant
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error updating tenant {tenant_id} status: {str(e)}")
        return None

# --- Tenant History Management ---

async def get_tenant_history(
    tenant_id: uuid.UUID,
    requesting_user_id: uuid.UUID,
    skip: int = 0,
    limit: int = 20,
    action_type: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Get tenant history with proper access control and filtering.
    
    Args:
        tenant_id: The tenant ID
        requesting_user_id: ID of the user making the request
        skip: Number of records to skip for pagination
        limit: Maximum number of records to return
        action_type: Optional filter by action type
        
    Returns:
        Tuple of (history_records, total_count)
    """
    try:
        # Validate that the requesting user can access this tenant
        if not await _can_access_tenant(tenant_id, requesting_user_id):
            logger.error(f"User {requesting_user_id} cannot access tenant {tenant_id}")
            return [], 0
        
        # Get tenant history using database function
        from ..config.database import supabase_client
        
        # Get history records
        history_response = supabase_client.rpc(
            'get_tenant_history',
            {
                'tenant_uuid': str(tenant_id),
                'limit_records': limit + skip  # Get more records for pagination
            }
        ).execute()
        
        if not history_response.data:
            return [], 0
        
        # Apply pagination
        history_records = history_response.data[skip:skip + limit]
        total_count = len(history_response.data)
        
        # Apply action_type filter if specified
        if action_type:
            history_records = [
                record for record in history_records
                if record.get('action') == action_type
            ]
        
        # Convert to expected format
        formatted_history = []
        for record in history_records:
            formatted_history.append({
                'id': record.get('history_id'),
                'action': record.get('action'),
                'action_date': record.get('action_date'),
                'property_name': record.get('property_name'),
                'unit_number': record.get('unit_number'),
                'lease_id': record.get('lease_id'),
                'start_date': record.get('start_date'),
                'end_date': record.get('end_date'),
                'rent_amount': record.get('rent_amount'),
                'deposit_amount': record.get('deposit_amount'),
                'payment_amount': record.get('payment_amount'),
                'termination_reason': record.get('termination_reason'),
                'notes': record.get('notes'),
                'created_at': record.get('created_at')
            })
        
        logger.info(f"Retrieved {len(formatted_history)} history records for tenant {tenant_id}")
        return formatted_history, total_count
        
    except Exception as e:
        logger.error(f"Error getting tenant history for {tenant_id}: {str(e)}")
        return [], 0

async def get_tenant_lease_history(
    tenant_id: uuid.UUID,
    requesting_user_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """
    Get comprehensive lease history for a tenant.
    
    Args:
        tenant_id: The tenant ID
        requesting_user_id: ID of the user making the request
        
    Returns:
        List of lease history records
    """
    try:
        # Validate that the requesting user can access this tenant
        if not await _can_access_tenant(tenant_id, requesting_user_id):
            logger.error(f"User {requesting_user_id} cannot access tenant {tenant_id}")
            return []
        
        # Get lease history using database function
        from ..config.database import supabase_client
        
        lease_history_response = supabase_client.rpc(
            'get_tenant_lease_history',
            {'tenant_uuid': str(tenant_id)}
        ).execute()
        
        if not lease_history_response.data:
            logger.info(f"No lease history found for tenant {tenant_id}")
            return []
        
        # Format the lease history
        formatted_leases = []
        for lease in lease_history_response.data:
            formatted_leases.append({
                'id': lease.get('lease_id'),
                'property_name': lease.get('property_name'),
                'unit_number': lease.get('unit_number'),
                'start_date': lease.get('start_date'),
                'end_date': lease.get('end_date'),
                'rent_amount': lease.get('rent_amount'),
                'deposit_amount': lease.get('deposit_amount'),
                'status': lease.get('status'),
                'duration_months': lease.get('duration_months'),
                'is_current': lease.get('is_current'),
                'created_at': lease.get('created_at')
            })
        
        logger.info(f"Retrieved {len(formatted_leases)} lease records for tenant {tenant_id}")
        return formatted_leases
        
    except Exception as e:
        logger.error(f"Error getting tenant lease history for {tenant_id}: {str(e)}")
        return []

async def terminate_lease_for_unit(unit_id: str, owner_id: str, termination_date: date) -> bool:
    """
    Terminates the active lease for a specific unit.
    """
    try:
        # 1. Find the active lease for the unit
        active_lease = await tenants_db.get_active_tenant_for_unit(unit_id)

        if not active_lease:
            logger.warning(f"No active lease found for unit {unit_id} to terminate.")
            return False

        # 2. Verify owner has permission
        property_id = active_lease.get("property_id")
        from ..config.database import supabase_client as db_client
        property_owner = await properties_db.get_property_owner(db_client, property_id)
        if str(property_owner) != owner_id:
            logger.error(f"User {owner_id} does not own property {property_id}, cannot terminate lease.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")

        link_id = active_lease.get("id")

        # 3. Call the DB function to terminate the lease
        result = await tenants_db.terminate_tenant_lease(
            link_id=link_id,
            termination_date=termination_date
        )
        
        success = result.get("success", False)

        if success:
            logger.info(f"Successfully terminated lease {link_id} for unit {unit_id} by owner {owner_id}")
        else:
            logger.error(f"Failed to terminate lease {link_id} in DB. Reason: {result.get('message')}")
            
        return success

    except Exception as e:
        logger.exception(f"Error in terminate_lease_for_unit service: {e}")
        return False

# --- New Service Function ---
async def get_tenants_for_unit(unit_id: uuid.UUID, requesting_user_id: uuid.UUID) -> List[Tenant]:
    """
    Get tenants associated with a specific unit, performing authorization.

    Args:
        unit_id: The ID of the unit.
        requesting_user_id: The ID of the user making the request.

    Returns:
        List of Tenant objects.

    Raises:
        HTTPException: 403 if user is not authorized, 404 if unit not found,
                       500 for other errors.
    """
    logger.info(f"Service: Attempting to get tenants for unit {unit_id} by user {requesting_user_id}")
    try:
        # 1. Authorization Check: Does the requesting user own the parent property?
        parent_property_id = await properties_db.get_parent_property_id_for_unit(unit_id)
        if not parent_property_id:
            logger.warning(f"Unit {unit_id} not found during tenant fetch.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")

        from ..config.database import supabase_client as db_client
        property_owner = await properties_db.get_property_owner(db_client, parent_property_id)
        if not property_owner or property_owner != requesting_user_id:
            logger.warning(f"User {requesting_user_id} does not own parent property {parent_property_id} of unit {unit_id}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view tenants for this unit")

        # 2. Fetch tenants from DB layer
        tenant_dicts = await tenants_db.db_get_tenants_for_unit(unit_id)

        # 3. Convert to Pydantic models
        tenants = [Tenant(**data) for data in tenant_dicts]
        logger.info(f"Found {len(tenants)} tenants for unit {unit_id}")
        return tenants

    except HTTPException as http_exc:
        # Re-raise specific HTTP exceptions from authorization or DB layer
        raise http_exc
    except Exception as e:
        logger.exception(f"Unexpected error in get_tenants_for_unit service for unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

async def assign_tenant_to_unit(
    db_client: Client,
    unit_id: uuid.UUID,
    user_id: uuid.UUID,
    assignment_data: Dict[str, Any]
) -> Optional[Tenant]:
    """
    Assign a tenant to a specific unit with proper business logic validation.
    
    BUSINESS LOGIC: A unit can only have ONE active tenant at a time.
    This function will check for existing active tenants and prevent assignment if found.
    To replace an existing tenant, the old tenant must be properly terminated first.

    Args:
        db_client: Database client
        unit_id: The ID of the unit to assign tenant to
        user_id: The ID of the user making the assignment (must own the property)
        assignment_data: Assignment details including tenant_id, lease dates, amounts

    Returns:
        Tenant object if successful, None if failed

    Raises:
        HTTPException: If business logic is violated or other errors occur
    """
    try:
        from . import property_service
        
        tenant_id_raw = assignment_data.get('tenant_id')
        if isinstance(tenant_id_raw, uuid.UUID):
            tenant_id = tenant_id_raw
        else:
            tenant_id = uuid.UUID(tenant_id_raw)
        
        # 1. Verify unit exists and get parent property
        unit = await property_service.get_unit_by_id(db_client, unit_id)
        if not unit:
            logger.error(f"Unit {unit_id} not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                              detail="Unit not found")

        parent_property_id = unit.get('property_id')
        if not parent_property_id:
            logger.error(f"Unit {unit_id} has no parent property")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                              detail="Unit has no associated property")

        # 2. Verify user owns the property
        property_owner = await properties_db.get_property_owner(db_client, uuid.UUID(parent_property_id))
        if property_owner != user_id:
            logger.error(f"User {user_id} does not own property {parent_property_id}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                              detail="Not authorized to assign tenants to this property")

        # 3. BUSINESS LOGIC CHECK: Verify unit is available for assignment
        unit_availability = await tenants_db.get_unit_availability_status(unit_id)
        
        if not unit_availability.get('available', False):
            active_tenant_info = unit_availability.get('active_tenant')
            if active_tenant_info:
                error_msg = (f"Unit {unit_id} is currently occupied by tenant {active_tenant_info['tenant_id']}. "
                           f"Lease ends on {active_tenant_info['end_date'] or 'no end date specified'}. "
                           f"Existing tenant must be properly terminated before assigning a new tenant.")
            else:
                error_msg = unit_availability.get('message', 'Unit is not available for assignment.')
                
            logger.error(f"Unit assignment blocked: {error_msg}")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, 
                              detail=error_msg)

        # 4. Verify tenant exists and is available
        tenant = await tenants_db.get_tenant_by_id(tenant_id)
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                              detail="Tenant not found or not accessible")

        # 5. Check if tenant is already assigned elsewhere
        existing_assignments = await tenants_db.get_property_links_for_tenant(tenant_id)
        if existing_assignments:
            # Check if any existing assignments are still active
            today = date.today().isoformat()
            for assignment in existing_assignments:
                end_date = assignment.get('end_date')
                if end_date is None or end_date >= today:
                    existing_unit = assignment.get('unit_id')
                    existing_property = assignment.get('property_id')
                    error_msg = (f"Tenant {tenant_id} is already assigned to "
                               f"{'unit ' + existing_unit if existing_unit else 'property ' + existing_property}. "
                               f"Existing assignment must be terminated before creating a new one.")
                    logger.error(f"Tenant assignment blocked: {error_msg}")
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error_msg)

        # 6. Create the property_tenant_link (lease) record
        # Use assignment data from frontend instead of tenant record
        lease_start_date = assignment_data.get('lease_start')
        lease_end_date = assignment_data.get('lease_end')
        rent_amount = assignment_data.get('rent_amount')
        deposit_amount = assignment_data.get('deposit_amount')

        # Validate required fields for lease creation
        missing_fields = []
        if not lease_start_date:
            missing_fields.append('lease_start')
        
        if missing_fields:
            logger.error(f"Cannot assign tenant {tenant_id}: Assignment data is missing required fields: {', '.join(missing_fields)}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Assignment data is missing required lease details: {', '.join(missing_fields)}")
        
        link_data = {
            "id": uuid.uuid4(),
            "property_id": str(parent_property_id),
            "tenant_id": str(tenant_id),
            "unit_id": str(unit_id),
            "start_date": lease_start_date.isoformat() if isinstance(lease_start_date, date) else lease_start_date,
            "end_date": lease_end_date.isoformat() if lease_end_date and isinstance(lease_end_date, date) else lease_end_date,
            "rent_amount": rent_amount,
            "deposit_amount": deposit_amount,
            "notes": assignment_data.get('notes'),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # 7. Create the lease - this will now enforce business logic
        lease_created = await tenants_db.create_property_tenant_link(link_data)
        if not lease_created:
            logger.error(f"Failed to create lease for tenant {tenant_id} on unit {unit_id}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                              detail="Failed to create tenant assignment")

        # 8. Update unit status to occupied and set current tenant
        from ..constants.status import UNIT_STATUS_OCCUPIED
        unit_update = {
            "status": UNIT_STATUS_OCCUPIED,  # Changed from "occupied" to "Occupied" via constants
            "current_tenant_id": str(tenant_id),
            "updated_at": datetime.utcnow().isoformat()
        }
        unit_updated = await properties_db.update_unit_db(db_client, str(unit_id), unit_update)
        if not unit_updated:
            logger.error(f"Failed to update unit {unit_id} status to {UNIT_STATUS_OCCUPIED}")
            # Consider implementing proper transaction handling or retry mechanism
            # For now, we'll log the error but not fail the whole operation

        # 9. Update tenant status to active
        tenant_status_updated = await tenants_db.update_tenant_status(tenant_id, 'active')
        if not tenant_status_updated:
            logger.error(f"Failed to update tenant {tenant_id} status to active")
            # Consider implementing proper transaction handling in a future update

        logger.info(f"Successfully assigned tenant {tenant_id} to unit {unit_id}")
        return tenant
        
    except HTTPException as http_exc:
        # Re-raise specific HTTP exceptions from validations
        raise http_exc
    except Exception as e:
        logger.exception(f"Unexpected error in assign_tenant_to_unit: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail=f"Error assigning tenant to unit: {str(e)}")

# --- Tenant Invitation ---

async def create_tenant_invitation(
    invitation_data: TenantInvitationCreate,
    owner_id: uuid.UUID,
    db_client: Client
) -> Optional[TenantInvitation]:
    """
    Create an invitation for a tenant to join the platform and link to a property.
    """
    try:
        # 1. Check if owner actually owns the property using injected authenticated client
        property_owner = await properties_db.get_property_owner(db_client, invitation_data.property_id)
        if not property_owner or property_owner != str(owner_id):
            logger.error(f"User {owner_id} does not own property {invitation_data.property_id} for invitation.")
            return None

        # 2. Check if an active invitation already exists for this email/property?
        # existing_invite = await tenants_db.get_active_invitation(invitation_data.email, invitation_data.property_id)
        # if existing_invite: ... handle appropriately (resend? error?)

        # 3. Generate token and expiry
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=7) # Example: 7 day expiry

        # 4. Prepare DB record
        invite_dict = {
            "id": uuid.uuid4(),
            "property_id": invitation_data.property_id,
            "owner_id": owner_id,
            "email": invitation_data.email,
            "token": token,
            "status": "pending", # Use an Enum later
            "expires_at": expires_at,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        # 5. Save invitation to DB
        created_invite_dict = await tenants_db.create_invitation(invite_dict)
        if not created_invite_dict:
            logger.error(f"Failed to save invitation for {invitation_data.email}")
            return None

        # 6. Trigger notification (e.g., email)
        # await notification_service.send_tenant_invitation(created_invite_dict)
        logger.info(f"Tenant invitation created for {invitation_data.email}, token: {token}")

        return TenantInvitation(**created_invite_dict)

    except Exception as e:
        logger.exception(f"Error creating tenant invitation: {str(e)}")
        return None

# --- Fetching Related Data (Placeholders) ---

async def get_properties_for_tenant(tenant_id: uuid.UUID, requesting_user_id: uuid.UUID) -> List[Dict]: # Return Property model list eventually
    """Get properties associated with a tenant via property_tenants link."""
    if not await _can_access_tenant(tenant_id, requesting_user_id):
        return [] # Access denied
    # Implementation: Query property_tenants for property_ids, then query properties table
    logger.info("Placeholder: Fetching properties for tenant")
    return await tenants_db.get_properties_for_tenant_db(tenant_id) # Assumes DB function exists

async def get_leases_for_tenant(tenant_id: uuid.UUID, requesting_user_id: uuid.UUID) -> List[Dict[str, Any]]:
    """Get lease/tenancy link details for a tenant."""
    if not await _can_access_tenant(tenant_id, requesting_user_id):
        return [] # Access denied
    links_dict = await tenants_db.get_property_links_for_tenant(tenant_id)
    return links_dict

async def get_leases(
    owner_id: uuid.UUID,
    property_id: Optional[uuid.UUID] = None,
    tenant_id: Optional[uuid.UUID] = None,
    active_only: bool = False,
    skip: int = 0,
    limit: int = 100,
    sort_by: str = 'created_at',
    sort_order: str = 'desc'
) -> tuple[List[Dict[str, Any]], int]:
    """Get all leases for properties owned by the requesting user."""
    try:
        # Get leases based on filters
        leases, total_count = await tenants_db.get_leases(
            owner_id=owner_id,
            property_id=property_id,
            tenant_id=tenant_id,
            active_only=active_only,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )
        return leases, total_count
    except Exception as e:
        logger.error(f"Error in get_leases service: {str(e)}")
        return [], 0

async def get_lease_by_id(lease_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """Get a specific lease by ID."""
    try:
        lease = await tenants_db.get_property_tenant_link_by_id(lease_id)
        return lease
    except Exception as e:
        logger.error(f"Error in get_lease_by_id service: {str(e)}")
        return None

async def can_access_lease(lease_id: uuid.UUID, requesting_user_id: uuid.UUID) -> bool:
    """Check if the requesting user can access the lease."""
    try:
        # Get the lease
        lease = await tenants_db.get_property_tenant_link_by_id(lease_id)
        if not lease:
            return False

        # Get the property owner
        from ..config.database import supabase_client as db_client
        property_owner = await properties_db.get_property_owner(db_client, lease.get('property_id'))
        if property_owner == requesting_user_id:
            return True

        # Check if the requesting user is the tenant
        tenant = await tenants_db.get_tenant_by_id(lease.get('tenant_id'))
        if tenant and tenant.get('user_id') == requesting_user_id:
            return True

        return False
    except Exception as e:
        logger.error(f"Error in can_access_lease service: {str(e)}")
        return False

async def create_lease(lease_data: PropertyTenantLinkCreate) -> Optional[Dict[str, Any]]:
    """
    Create a new lease with proper business logic validation.
    
    BUSINESS LOGIC: A unit can only have ONE active tenant at a time.
    This function checks for existing active tenants and prevents lease creation if found.
    
    Args:
        lease_data: The lease data to create
        
    Returns:
        Created lease data or None if failed
        
    Raises:
        HTTPException: If business logic is violated or other errors occur
    """
    try:
        # 1. BUSINESS LOGIC CHECK: Verify unit/property is available for assignment
        unit_id = getattr(lease_data, 'unit_id', None)
        property_id = lease_data.property_id
        
        if unit_id:
            # Check unit availability
            unit_availability = await tenants_db.get_unit_availability_status(unit_id)
            
            if not unit_availability.get('available', False):
                active_tenant_info = unit_availability.get('active_tenant')
                if active_tenant_info:
                    error_msg = (f"Unit is currently occupied by tenant {active_tenant_info['tenant_id']}. "
                               f"Lease ends on {active_tenant_info['end_date'] or 'no end date specified'}. "
                               f"Existing tenant must be properly terminated before creating a new lease.")
                else:
                    error_msg = unit_availability.get('message', 'Unit is not available for lease creation.')
                    
                logger.error(f"Lease creation blocked: {error_msg}")
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error_msg)
        else:
            # Check for property-level active assignments
            from ..config.database import supabase_client
            existing_response = supabase_client.table('property_tenants')\
                .select('*')\
                .eq('property_id', str(property_id))\
                .is_('unit_id', 'null')\
                .execute()
                
            if hasattr(existing_response, 'error') and existing_response.error:
                logger.error(f"Error checking existing tenant for property {property_id}: {existing_response.error.message}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                                  detail="Error checking property availability")
                
            if existing_response.data:
                # Check if any property-level assignments are still active
                today = date.today().isoformat()
                for existing_link in existing_response.data:
                    end_date_check = existing_link.get('end_date')
                    if end_date_check is None or end_date_check >= today:
                        existing_tenant_id = existing_link.get('tenant_id')
                        error_msg = (f"Property {property_id} already has active tenant {existing_tenant_id}. "
                                   f"Existing tenant must be properly removed before creating new lease.")
                        logger.error(f"Lease creation blocked: {error_msg}")
                        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error_msg)

        # 2. Check if tenant is already assigned elsewhere
        tenant_id = lease_data.tenant_id
        existing_assignments = await tenants_db.get_property_links_for_tenant(tenant_id)
        if existing_assignments:
            # Check if any existing assignments are still active
            today = date.today().isoformat()
            for assignment in existing_assignments:
                assignment_end_date = assignment.get('end_date')
                if assignment_end_date is None or assignment_end_date >= today:
                    existing_unit = assignment.get('unit_id')
                    existing_property = assignment.get('property_id')
                    error_msg = (f"Tenant {tenant_id} is already assigned to "
                               f"{'unit ' + existing_unit if existing_unit else 'property ' + existing_property}. "
                               f"Existing assignment must be terminated before creating a new lease.")
                    logger.error(f"Lease creation blocked: {error_msg}")
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error_msg)

        # 3. Prepare data for insertion
        link_data = {
            "id": uuid.uuid4(),
            "property_id": lease_data.property_id,
            "tenant_id": lease_data.tenant_id,
            "unit_id": unit_id,
            "unit_number": lease_data.unit_number,
            "start_date": lease_data.start_date.isoformat(),
            "end_date": lease_data.end_date.isoformat() if lease_data.end_date else None,
            "created_at": datetime.now(datetime.timezone.utc),
            "updated_at": datetime.now(datetime.timezone.utc)
        }

        # 4. Create the lease - this will now enforce business logic at the database layer
        created_lease = await tenants_db.create_property_tenant_link(link_data)
        if not created_lease:
            logger.error(f"Failed to create lease for tenant {tenant_id}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                              detail="Failed to create lease")

        # 5. Update tenant status to active
        tenant_status_updated = await tenants_db.update_tenant_status(tenant_id, 'active')
        if not tenant_status_updated:
            logger.warning(f"Created lease but failed to update tenant {tenant_id} status")

        # 6. Update unit status if unit assignment
        if unit_id:
            from ..config.database import supabase_client as db_client
            unit_update = {
                "status": "occupied",
                "current_tenant_id": str(tenant_id),
                "updated_at": datetime.utcnow().isoformat()
            }
            unit_updated = await properties_db.update_unit_db(db_client, str(unit_id), unit_update)
            if not unit_updated:
                logger.warning(f"Created lease but failed to update unit {unit_id} status")

        logger.info(f"Successfully created lease for tenant {tenant_id} on " + 
                   (f"unit {unit_id}" if unit_id else f"property {property_id}"))
        return created_lease
        
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions with proper status codes
        raise http_exc
    except Exception as e:
        logger.error(f"Error in create_lease service: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail=f"Error creating lease: {str(e)}")

async def update_lease(lease_id: uuid.UUID, lease_data: PropertyTenantLinkUpdate, requesting_user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """Update an existing lease."""
    try:
        # Authorize user
        if not await can_access_lease(lease_id, requesting_user_id):
            logger.error(f"User {requesting_user_id} does not have permission to update lease {lease_id}")
            return None

        # Get the current lease
        current_lease = await tenants_db.get_property_tenant_link_by_id(lease_id)
        if not current_lease:
            return None

        # Prepare data for update - handle Pydantic v1 and v2 compatibility
        if hasattr(lease_data, "model_dump"):
            update_data = lease_data.model_dump(exclude_unset=True)
        else:
            # Pydantic v1 compatibility
            update_data = lease_data.model_dump(exclude_unset=True)
            
        update_data["updated_at"] = datetime.now(datetime.timezone.utc)

        # Convert date fields to ISO format
        if 'start_date' in update_data and update_data['start_date']:
            update_data['start_date'] = update_data['start_date'].isoformat()
        if 'end_date' in update_data and update_data['end_date']:
            update_data['end_date'] = update_data['end_date'].isoformat()

        # Update the lease
        updated_lease = await tenants_db.update_property_tenant_link(lease_id, update_data)
        return updated_lease
    except Exception as e:
        logger.error(f"Error in update_lease service: {str(e)}")
        return None

async def delete_lease(lease_id: uuid.UUID) -> bool:
    """Delete a lease."""
    try:
        # Delete the lease
        deleted = await tenants_db.delete_property_tenant_link(lease_id)
        return deleted
    except Exception as e:
        logger.error(f"Error in delete_lease service: {str(e)}")
        return False

async def get_property_owner(property_id: uuid.UUID) -> Optional[str]:
    """Get the owner ID of a property."""
    try:
        from ..config.database import supabase_client as db_client
        owner_id = await properties_db.get_property_owner(db_client, property_id)
        return owner_id
    except Exception as e:
        logger.error(f"Error in get_property_owner service: {str(e)}")
        return None

async def get_payments_for_tenant(tenant_id: uuid.UUID, requesting_user_id: uuid.UUID) -> List[Dict]: # Use Payment model
    """Get payment history for a tenant (requires Payment service/db)."""
    if not await _can_access_tenant(tenant_id, requesting_user_id):
        return []
    # Implementation: Call payment_service.get_payments(tenant_id=tenant_id)
    logger.info("Placeholder: Fetching payments for tenant")
    # Example: return await payment_service.get_payments(tenant_id=tenant_id)
    return []

async def get_maintenance_for_tenant(tenant_id: uuid.UUID, requesting_user_id: uuid.UUID) -> List[Dict]: # Use MaintenanceRequest model
    """Get maintenance requests created by a tenant (requires Maintenance service/db)."""
    if not await _can_access_tenant(tenant_id, requesting_user_id):
        return []
    # Implementation: Call maintenance_service.get_requests(tenant_id=tenant_id)
    logger.info("Placeholder: Fetching maintenance for tenant")
    # Example: return await maintenance_service.get_maintenance_requests(tenant_id=tenant_id)
    return []

async def get_tenant_payments(
    tenant_id: uuid.UUID,
    requesting_user_id: Optional[uuid.UUID] = None,  # Optional because this can be called internally
    limit: int = 100,
    sort_by: str = 'payment_date',
    sort_order: str = 'desc'
) -> List[Dict]:
    """
    Get payment history for a tenant.
    """
    try:
        if requesting_user_id and not await _can_access_tenant(tenant_id, requesting_user_id):
            return [] # Access denied

        # Query payment_history table for this tenant
        payments = await tenants_db.get_tenant_payments(
            tenant_id=tenant_id,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )
        return payments
    except Exception as e:
        logger.exception(f"Error in get_payments_for_tenant service: {str(e)}")
        return []

async def get_tenant_payment_tracking(
    tenant_id: uuid.UUID,
    requesting_user_id: Optional[uuid.UUID] = None,  # Optional because this can be called internally
    limit: int = 100,
    sort_by: str = 'payment_date',
    sort_order: str = 'asc'
) -> List[Dict]:
    """
    Get payment tracking records for a tenant, including upcoming and overdue payments.
    This is different from payment_history which tracks completed payments.
    Payment tracking includes scheduled and upcoming payments.
    """
    try:
        if requesting_user_id and not await _can_access_tenant(tenant_id, requesting_user_id):
            return [] # Access denied

        # Query payment_tracking table for this tenant
        payments = await tenants_db.get_tenant_payment_tracking(
            tenant_id=tenant_id,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )
        return payments
    except Exception as e:
        logger.exception(f"Error in get_tenant_payment_tracking service: {str(e)}")
        return []

async def verify_and_link_tenant_by_property(
    property_id: uuid.UUID,
    user_id: uuid.UUID,
    user_email: str,
    user_details: Optional[Dict[str, Any]] = None # For potential future checks (name, phone)
) -> bool:
    """
    Finds a tenant associated with a property ID, verifies their email
    against the provided user email, and links the tenant record to the user ID.

    Raises HTTPException for specific failure reasons (not found, mismatch, already linked).
    Returns True on successful verification and linking.
    """
    logger.info(f"Attempting to verify/link tenant for user {user_id} and property {property_id}")

    try:
        # 1. Find the tenant associated with the property
        # Assume tenant_db.get_tenant_by_property_id returns a Tenant-like object/dict or None
        tenant_record = await tenants_db.get_tenant_by_property_id(property_id)

        if not tenant_record:
            logger.warning(f"Verification failed: No tenant found for property_id {property_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No tenant association found for the provided Property ID."
            )

        # Extract tenant details for comparison (adjust field names based on actual db model)
        tenant_id = tenant_record.get('id')
        tenant_email = tenant_record.get('email')
        existing_user_id = tenant_record.get('user_id')

        if not tenant_id or not tenant_email:
             logger.error(f"Verification failed: Tenant record {tenant_id} for property {property_id} is missing ID or email.")
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Incomplete tenant data found.")

        # 2. Check if already linked to a DIFFERENT user
        if existing_user_id and uuid.UUID(str(existing_user_id)) != user_id:
            logger.warning(f"Verification failed: Tenant {tenant_id} already linked to different user {existing_user_id}")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This tenant profile is already linked to a different user account."
            )

        # 3. Check if already linked to the SAME user (optional, can just succeed)
        if existing_user_id and uuid.UUID(str(existing_user_id)) == user_id:
            logger.info(f"Verification skipped: Tenant {tenant_id} already linked to user {user_id}")
            return True # Already correctly linked, consider it a success

        # 4. Verify tenant email matches the authenticated user's email
        # Case-insensitive comparison is safer
        if tenant_email.lower() != user_email.lower():
            logger.warning(f"Verification failed: Email mismatch for tenant {tenant_id}. Expected '{tenant_email}', got '{user_email}'")
            # Add more checks here if using user_details (name, phone)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant details do not match the authenticated user."
            )

        # 5. Link the tenant record to the user ID
        logger.info(f"Verification successful for tenant {tenant_id}. Linking to user {user_id}")
        # Assume tenant_db.update_tenant_user_id updates the record and returns success/failure
        update_success = await tenants_db.update_tenant_user_id(tenant_id, user_id)

        if not update_success:
            logger.error(f"Failed to update user_id for tenant {tenant_id} in database.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to link tenant account after verification."
            )

        logger.info(f"Successfully linked tenant {tenant_id} to user {user_id}")
        return True

    except HTTPException as http_exc:
        # Re-raise specific exceptions for API layer to handle
        raise http_exc
    except Exception as e:
        # Catch unexpected errors (e.g., database connection issues)
        logger.exception(f"Unexpected error during tenant verification/linking for property {property_id} and user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during the verification process: {str(e)}"
        )

async def get_tenant_by_user_id(user_id: uuid.UUID) -> Optional[Tenant]:
    """
    Retrieves a tenant profile linked to a specific user ID.
    Returns the Tenant object or None if not found.
    Now includes property information for frontend compatibility.
    """
    logger.info(f"Retrieving tenant profile for user_id {user_id}")
    try:
        # Call the corresponding DB/CRUD function
        tenant_data = await tenants_db.get_tenant_by_user_id(user_id)

        if tenant_data:
            logger.info(f"Found tenant profile {tenant_data.get('id')} for user {user_id}")
            
            # Map database values to enum values before creating the Tenant model
            # Fix for id_type field
            if tenant_data.get('id_type') == 'pan_card':
                tenant_data['id_type'] = 'other'  # Map 'pan_card' to 'other'
                
            # Fix for property_tax_responsibility field
            if tenant_data.get('property_tax_responsibility') == 'landlord':
                tenant_data['property_tax_responsibility'] = 'owner'  # Map 'landlord' to 'owner'
                
            # Fix for any other potential enum mismatches
            # Ensure water_responsibility uses valid enum values
            if tenant_data.get('water_responsibility') == 'landlord':
                tenant_data['water_responsibility'] = 'owner'
                
            # Ensure electricity_responsibility uses valid enum values
            if tenant_data.get('electricity_responsibility') == 'landlord':
                tenant_data['electricity_responsibility'] = 'owner'
            
            # Enrich with property information
            tenant_data = await _enrich_tenant_with_property_info(tenant_data)
            
            try:
                # Create the Tenant model with the fixed data
                return Tenant(**tenant_data)
            except Exception as validation_error:
                logger.error(f"Validation error creating Tenant model: {validation_error}")
                # Log detailed validation errors for debugging
                logger.error(f"Problematic tenant data: {tenant_data}")
                raise
        else:
            logger.info(f"No tenant profile found for user_id {user_id}")
            return None
    except Exception as e:
        logger.error(f"Error in get_tenant_by_user_id: {str(e)}")
        raise

async def link_tenant_to_property(
    tenant_id: uuid.UUID, 
    property_id: uuid.UUID,
    unit_number: Optional[str],
    start_date: date,
    end_date: Optional[date],
    creator_user_id: uuid.UUID
) -> Optional[Dict[str, Any]]:
    """
    Links an existing tenant to a property with proper business logic validation.
    
    BUSINESS LOGIC: A unit can only have ONE active tenant at a time.
    This function checks for existing active tenants and prevents assignment if found.
    
    Args:
        tenant_id: The tenant to link
        property_id: The property to link to
        unit_number: Optional unit number (for multi-unit properties)
        start_date: Lease start date
        end_date: Optional lease end date
        creator_user_id: User creating the link (must own the property)
        
    Returns:
        Created link data or None if failed
        
    Raises:
        HTTPException: If business logic is violated or other errors occur
    """
    try:
        # 1. Check if property exists and creator owns it
        from ..config.database import supabase_client as db_client
        property_owner = await properties_db.get_property_owner(db_client, property_id)
        if not property_owner:
            logger.error(f"Property not found: {property_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                              detail="Property not found")
        if property_owner != creator_user_id:
            logger.error(f"User {creator_user_id} does not own property {property_id}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                              detail="Not authorized to assign tenants to this property")
            
        # 2. Check if tenant exists
        tenant = await tenants_db.get_tenant_by_id(tenant_id)
        if not tenant:
            logger.error(f"Tenant not found: {tenant_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                              detail="Tenant not found")

        # 3. Get unit_id if unit_number is provided
        unit_id = None
        if unit_number:
            # Find the unit by number within this property
            from . import property_service
            units = await property_service.get_units_by_property_id(db_client, property_id)
            for unit in units:
                if unit.get('unit_number') == unit_number:
                    unit_id = uuid.UUID(unit['id'])
                    break
            
            if not unit_id:
                logger.error(f"Unit {unit_number} not found in property {property_id}")
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                  detail=f"Unit {unit_number} not found in property")

        # 4. BUSINESS LOGIC CHECK: Verify unit/property is available for assignment
        if unit_id:
            # Check unit availability
            unit_availability = await tenants_db.get_unit_availability_status(unit_id)
            
            if not unit_availability.get('available', False):
                active_tenant_info = unit_availability.get('active_tenant')
                if active_tenant_info:
                    error_msg = (f"Unit {unit_number} is currently occupied by tenant {active_tenant_info['tenant_id']}. "
                               f"Lease ends on {active_tenant_info['end_date'] or 'no end date specified'}. "
                               f"Existing tenant must be properly terminated before assigning a new tenant.")
                else:
                    error_msg = unit_availability.get('message', 'Unit is not available for assignment.')
                    
                logger.error(f"Unit assignment blocked: {error_msg}")
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error_msg)
        else:
            # Check for property-level active assignments
            existing_response = supabase_client.table('property_tenants')\
                .select('*')\
                .eq('property_id', str(property_id))\
                .is_('unit_id', 'null')\
                .execute()
                
            if hasattr(existing_response, 'error') and existing_response.error:
                logger.error(f"Error checking existing tenant for property {property_id}: {existing_response.error.message}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                                  detail="Error checking property availability")
                
            if existing_response.data:
                # Check if any property-level assignments are still active
                today = date.today().isoformat()
                for existing_link in existing_response.data:
                    end_date_check = existing_link.get('end_date')
                    if end_date_check is None or end_date_check >= today:
                        existing_tenant_id = existing_link.get('tenant_id')
                        error_msg = (f"Property {property_id} already has active tenant {existing_tenant_id}. "
                                   f"Existing tenant must be properly removed before assigning new tenant.")
                        logger.error(f"Property assignment blocked: {error_msg}")
                        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error_msg)

        # 5. Check if tenant is already assigned elsewhere
        existing_assignments = await tenants_db.get_property_links_for_tenant(tenant_id)
        if existing_assignments:
            # Check if any existing assignments are still active
            today = date.today().isoformat()
            for assignment in existing_assignments:
                assignment_end_date = assignment.get('end_date')
                if assignment_end_date is None or assignment_end_date >= today:
                    existing_unit = assignment.get('unit_id')
                    existing_property = assignment.get('property_id')
                    error_msg = (f"Tenant {tenant_id} is already assigned to "
                               f"{'unit ' + existing_unit if existing_unit else 'property ' + existing_property}. "
                               f"Existing assignment must be terminated before creating a new one.")
                    logger.error(f"Tenant assignment blocked: {error_msg}")
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=error_msg)
            
        # 6. Create PropertyTenantLink with business logic validation
        link_data = {
            "id": uuid.uuid4(),
            "property_id": property_id,
            "tenant_id": tenant_id,
            "unit_id": unit_id,
            "unit_number": unit_number,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat() if end_date else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # This will now enforce business logic in the database layer
        link_created = await tenants_db.create_property_tenant_link(link_data)
        if not link_created:
            logger.error(f"Failed to link tenant {tenant_id} to property {property_id}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                              detail="Failed to create tenant-property link")

        # 7. Update tenant status to active
        tenant_status_updated = await tenants_db.update_tenant_status(tenant_id, 'active')
        if not tenant_status_updated:
            logger.warning(f"Created link but failed to update tenant {tenant_id} status")

        # 8. Update unit status if unit assignment
        if unit_id:
            from ..constants.status import UNIT_STATUS_OCCUPIED
            unit_update = {
                "status": UNIT_STATUS_OCCUPIED,  # Changed from "occupied" to "Occupied" via constants
                "current_tenant_id": str(tenant_id),
                "updated_at": datetime.utcnow().isoformat()
            }
            unit_updated = await properties_db.update_unit_db(db_client, str(unit_id), unit_update)
            if not unit_updated:
                logger.error(f"Failed to update unit {unit_id} status to {UNIT_STATUS_OCCUPIED}")
                # Consider implementing proper transaction handling or retry mechanism
                # For now, we'll log the error but not fail the whole operation

        logger.info(f"Successfully linked tenant {tenant_id} to property {property_id}" + 
                   (f" unit {unit_number}" if unit_number else ""))
        return link_created
        
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions with proper status codes
        raise http_exc
    except Exception as e:
        logger.exception(f"Error in link_tenant_to_property: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                          detail=f"Error linking tenant to property: {str(e)}")

# --- New Service Function: Get Current Tenant for Unit ---
async def get_current_tenant_for_unit(unit_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get the tenant currently associated with a specific unit via an active lease.
    Calls the DB-layer function and returns the result.
    Args:
        unit_id: The ID of the unit.
    Returns:
        Tenant data if an active lease exists for the unit, otherwise None.
    """
    from ..db import tenants as tenants_db
    import logging
    logger = logging.getLogger(__name__)
    try:
        tenant_info = await tenants_db.db_get_current_tenant_for_unit(unit_id)
        if tenant_info:
            logger.info(f"Found current tenant for unit {unit_id}: {tenant_info.get('id')}")
        else:
            logger.info(f"No current tenant found for unit {unit_id}")
        return tenant_info
    except Exception as e:
        logger.error(f"Error in get_current_tenant_for_unit service for unit {unit_id}: {e}")
        return None

async def get_leases_for_unit(unit_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get all leases (property_tenant links) for a specific unit.
    
    Args:
        unit_id: The UUID of the unit
        
    Returns:
        List of lease dictionaries with tenant information
    """
    try:
        from ..config.database import supabase_client
        
        # Get all leases for the unit with tenant information
        response = supabase_client.table('property_tenants') \
            .select('*, tenants(*)') \
            .eq('unit_id', str(unit_id)) \
            .order('start_date', desc=True) \
            .execute()
            
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching leases for unit {unit_id}: {response.error.message}")
            return []
            
        return response.data or []
        
    except Exception as e:
        logger.exception(f"Error in get_leases_for_unit for unit {unit_id}: {str(e)}")
        return []

# --- Enhanced Tenant CRUD Methods ---

async def get_tenants_enhanced(
    owner_id: uuid.UUID,
    property_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    verification_status: Optional[str] = None,
    occupation_category: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    sort_by: str = 'created_at',
    sort_order: str = 'desc'
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Enhanced tenant retrieval with additional filtering and search capabilities.
    """
    try:
        # Use existing get_tenants method with additional filters
        tenant_dicts, total_count = await get_tenants(
            owner_id=owner_id,
            property_id=property_id,
            status=status,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Apply additional filters if provided
        if verification_status or occupation_category or search:
            filtered_tenants = []
            for tenant in tenant_dicts:
                # Apply verification status filter
                if verification_status and tenant.get('verification_status') != verification_status:
                    continue
                
                # Apply occupation category filter
                if occupation_category and tenant.get('occupation_category') != occupation_category:
                    continue
                
                # Apply search filter
                if search:
                    search_lower = search.lower()
                    searchable_fields = [
                        tenant.get('name', ''),
                        tenant.get('email', ''),
                        tenant.get('phone', ''),
                        tenant.get('employer_name', '')
                    ]
                    if not any(search_lower in str(field).lower() for field in searchable_fields):
                        continue
                
                filtered_tenants.append(tenant)
            
            tenant_dicts = filtered_tenants
            total_count = len(filtered_tenants)
        
        return tenant_dicts, total_count
    except Exception as e:
        logger.error(f"Error in get_tenants_enhanced service: {str(e)}")
        return [], 0

async def get_tenant_with_history_by_id(tenant_id: uuid.UUID, requesting_user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get a tenant with their complete history.
    Now includes property information for frontend compatibility.
    """
    try:
        if not await _can_access_tenant(tenant_id, requesting_user_id):
            return None
        
        # Get basic tenant data
        tenant_dict = await tenants_db.get_tenant_by_id(tenant_id)
        if not tenant_dict:
            return None
        
        # Enrich with property information
        tenant_dict = await _enrich_tenant_with_property_info(tenant_dict)
        
        # Get history data (mock implementation for now)
        history_data = []
        
        # Combine tenant with history
        tenant_with_history = {
            **tenant_dict,
            'history': history_data,
            'document_count': 0,
            'verification_status': tenant_dict.get('verification_status', 'pending')
        }
        
        return tenant_with_history
    except Exception as e:
        logger.error(f"Error in get_tenant_with_history_by_id service: {str(e)}")
        return None

async def get_tenant_with_history_by_user_id(user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get a tenant with history by user ID.
    Now includes property information for frontend compatibility.
    """
    try:
        # First find the tenant by user_id
        tenant_dict = await tenants_db.get_tenant_by_user_id(user_id)
        if not tenant_dict:
            return None
        
        # Enrich with property information
        tenant_dict = await _enrich_tenant_with_property_info(tenant_dict)
        
        tenant_id = tenant_dict['id']
        return await get_tenant_with_history_by_id(tenant_id, user_id)
    except Exception as e:
        logger.error(f"Error in get_tenant_with_history_by_user_id service: {str(e)}")
        return None

async def create_tenant_comprehensive(tenant_data: TenantCreate, creator_user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Create a tenant with comprehensive validation and history tracking.
    """
    try:
        # Use existing create_tenant method
        created_tenant = await create_tenant(tenant_data, creator_user_id)
        if not created_tenant:
            return None
        
        # Convert to dict for consistent return type
        if hasattr(created_tenant, 'model_dump'):
            return created_tenant.model_dump()
        elif hasattr(created_tenant, 'dict'):
            return created_tenant.dict()
        else:
            return created_tenant
    except Exception as e:
        logger.error(f"Error in create_tenant_comprehensive service: {str(e)}")
        return None

async def update_tenant_comprehensive(tenant_id: uuid.UUID, tenant_data: TenantUpdate, requesting_user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Update a tenant with comprehensive validation and history tracking.
    """
    try:
        # Use existing update_tenant method
        updated_tenant = await update_tenant(tenant_id, tenant_data, requesting_user_id)
        if not updated_tenant:
            return None
        
        # Convert to dict for consistent return type
        if hasattr(updated_tenant, 'model_dump'):
            return updated_tenant.model_dump()
        elif hasattr(updated_tenant, 'dict'):
            return updated_tenant.dict()
        else:
            return updated_tenant
    except Exception as e:
        logger.error(f"Error in update_tenant_comprehensive service: {str(e)}")
        return None

async def get_tenant_documents(tenant_id: uuid.UUID, requesting_user_id: uuid.UUID, document_type: Optional[str] = None) -> Tuple[List[Dict[str, Any]], int]:
    """
    Get documents for a tenant.
    """
    try:
        if not await _can_access_tenant(tenant_id, requesting_user_id):
            return [], 0
        
        # Mock implementation - in reality this would query the documents table
        documents = []
        return documents, len(documents)
    except Exception as e:
        logger.error(f"Error in get_tenant_documents service: {str(e)}")
        return [], 0

async def upload_tenant_document(tenant_id: uuid.UUID, document_data: Dict[str, Any], requesting_user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Upload a document for a tenant.
    """
    try:
        if not await _can_access_tenant(tenant_id, requesting_user_id):
            return None
        
        # Mock implementation - in reality this would upload to storage and create document record
        document = {
            'id': str(uuid.uuid4()),
            'tenant_id': str(tenant_id),
            'document_type': document_data.get('document_type', 'other'),
            'file_name': document_data.get('file_name', ''),
            'file_url': document_data.get('file_url', ''),
            'uploaded_at': datetime.utcnow().isoformat()
        }
        
        return document
    except Exception as e:
        logger.error(f"Error in upload_tenant_document service: {str(e)}")
        return None