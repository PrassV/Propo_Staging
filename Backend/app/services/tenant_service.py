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
    # Option 1: Tenant accessing their own profile (assuming tenant.user_id links to auth.users.id)
    tenant_profile = await tenants_db.get_tenant_by_id(tenant_id)
    if tenant_profile and tenant_profile.get("user_id") == requesting_user_id:
        return True

    # Option 2: Is the requesting user the owner who created this tenant?
    if tenant_profile and tenant_profile.get("owner_id") == requesting_user_id:
        return True

    # Option 3: Property owner/manager accessing a tenant linked to their property
    linked_properties = await tenants_db.get_property_links_for_tenant(tenant_id)
    for link in linked_properties:
        from ..config.database import supabase_service_role_client as db_client
        property_owner = await properties_db.get_property_owner(db_client, link["property_id"])
        if property_owner == requesting_user_id:
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
            # If getting all tenants for an owner, use the new direct lookup
            tenant_dicts, total_count = await tenants_db.get_tenants_by_owner_id(
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
    """
    try:
        if not await _can_access_tenant(tenant_id, requesting_user_id):
            return None # Access denied

        tenant_dict = await tenants_db.get_tenant_by_id(tenant_id)
        return Tenant(**tenant_dict) if tenant_dict else None
    except Exception as e:
        logger.error(f"Error in get_tenant_by_id service: {str(e)}")
        return None

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
            tenant_dict = tenant_data.dict(exclude_unset=True)
        
        tenant_id = uuid.uuid4()
        
        # Check if tenant already exists by email
        existing_tenant = await tenants_db.get_tenant_by_email(tenant_data.email)
        
        if existing_tenant:
            logger.warning(f"Tenant with email {tenant_data.email} already exists (ID: {existing_tenant['id']})")
            tenant_id = existing_tenant['id']
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

            # Create the tenant in the database
            created_tenant_dict = await tenants_db.create_tenant(tenant_dict)
            if not created_tenant_dict:
                logger.error(f"Failed to create tenant record in DB for email {tenant_data.email}")
                return None
            
            tenant_id = created_tenant_dict['id']
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
            update_dict = tenant_data.dict(exclude_unset=True)
            
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
            from ..config.database import supabase_service_role_client as db_client
            property_owner = await properties_db.get_property_owner(db_client, link["property_id"])
            if property_owner == requesting_user_id:
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

        from ..config.database import supabase_service_role_client as db_client
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
    Assign a tenant to a specific unit by creating a property_tenant_link record.
    
    Args:
        db_client: The Supabase client
        unit_id: The ID of the unit
        user_id: The ID of the requesting user (must own the parent property)
        assignment_data: Dict containing tenant_id, lease_start, lease_end, etc.
        
    Returns:
        The tenant that was assigned, or None if assignment failed
        
    Raises:
        HTTPException: For authorization or validation errors
    """
    logger.info(f"Service: Assigning tenant {assignment_data.get('tenant_id')} to unit {unit_id}")
    
    try:
        # 1. Authorization Check: Does the requesting user own the parent property?
        parent_property_id = await properties_db.get_parent_property_id_for_unit(unit_id)
        if not parent_property_id:
            logger.warning(f"Unit {unit_id} not found during tenant assignment.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")

        property_owner = await properties_db.get_property_owner(db_client, str(parent_property_id))
        if not property_owner or property_owner != str(user_id):
            logger.warning(f"User {user_id} not authorized to assign tenant to unit {unit_id}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, 
                              detail="Not authorized to assign tenant to this unit")
        
        # 2. Validation: Check if tenant exists
        tenant_id = assignment_data.get('tenant_id')
        if not tenant_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, 
                              detail="tenant_id is required")
            
        tenant = await get_tenant_by_id(tenant_id, user_id)
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                              detail="Tenant not found or not accessible")
        
        # 3. Create a property_tenant_link (lease) record
        link_data = {
            "id": uuid.uuid4(),
            "property_id": str(parent_property_id),
            "tenant_id": str(tenant_id),
            "unit_id": str(unit_id),
            "start_date": assignment_data.get('lease_start').isoformat() if isinstance(assignment_data.get('lease_start'), date) else assignment_data.get('lease_start'),
            "end_date": assignment_data.get('lease_end').isoformat() if assignment_data.get('lease_end') and isinstance(assignment_data.get('lease_end'), date) else assignment_data.get('lease_end'),
            "rent_amount": assignment_data.get('rent_amount'),
            "deposit_amount": assignment_data.get('deposit_amount'),
            "notes": assignment_data.get('notes'),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # 4. Insert the link record
        lease_created = await tenants_db.create_property_tenant_link(link_data)
        if not lease_created:
            logger.error(f"Failed to create lease for tenant {tenant_id} on unit {unit_id}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                              detail="Failed to create tenant assignment")
        
        # 5. Update unit status to occupied (if needed)
        unit_update = {
            "status": "occupied",
            "current_tenant_id": str(tenant_id),
            "updated_at": datetime.utcnow().isoformat()
        }
        await properties_db.update_unit_db(db_client, str(unit_id), unit_update)
        
        # 6. Return the tenant details
        return tenant
        
    except HTTPException as http_exc:
        # Re-raise specific HTTP exceptions from validations
        raise http_exc
    except Exception as e:
        logger.exception(f"Error assigning tenant to unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                           detail="An unexpected error occurred while assigning tenant")

# --- Tenant Invitation ---

async def create_tenant_invitation(
    invitation_data: TenantInvitationCreate,
    owner_id: uuid.UUID
) -> Optional[TenantInvitation]:
    """
    Create an invitation for a tenant to join the platform and link to a property.
    """
    try:
        # 1. Check if owner actually owns the property
        from ..config.database import supabase_service_role_client as db_client
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
        from ..config.database import supabase_service_role_client as db_client
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
    """Create a new lease."""
    try:
        # Prepare data for insertion
        link_data = {
            "id": uuid.uuid4(),
            "property_id": lease_data.property_id,
            "tenant_id": lease_data.tenant_id,
            "unit_number": lease_data.unit_number,
            "start_date": lease_data.start_date.isoformat(),
            "end_date": lease_data.end_date.isoformat() if lease_data.end_date else None,
            "created_at": datetime.now(datetime.timezone.utc),
            "updated_at": datetime.now(datetime.timezone.utc)
        }

        # Create the lease
        created_lease = await tenants_db.create_property_tenant_link(link_data)
        return created_lease
    except Exception as e:
        logger.error(f"Error in create_lease service: {str(e)}")
        return None

async def update_lease(lease_id: uuid.UUID, lease_data: PropertyTenantLinkUpdate) -> Optional[Dict[str, Any]]:
    """Update an existing lease."""
    try:
        # Get the current lease
        current_lease = await tenants_db.get_property_tenant_link_by_id(lease_id)
        if not current_lease:
            return None

        # Prepare data for update - handle Pydantic v1 and v2 compatibility
        if hasattr(lease_data, "model_dump"):
            update_data = lease_data.model_dump(exclude_unset=True)
        else:
            # Pydantic v1 compatibility
            update_data = lease_data.dict(exclude_unset=True)
            
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
        from ..config.database import supabase_service_role_client as db_client
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
        logger.exception(f"Unexpected error retrieving tenant by user_id {user_id}: {e}")
        # Re-raise for API layer to handle
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
    Links an existing tenant to a property.
    Requires creator_user_id to own the target property.
    """
    try:
        # 1. Check if property exists and creator owns it
        from ..config.database import supabase_service_role_client as db_client
        property_owner = await properties_db.get_property_owner(db_client, property_id)
        if not property_owner:
            logger.error(f"Property not found: {property_id}")
            return None
        if property_owner != creator_user_id:
            logger.error(f"User {creator_user_id} does not own property {property_id}")
            return None
            
        # 2. Check if tenant exists
        tenant = await tenants_db.get_tenant_by_id(tenant_id)
        if not tenant:
            logger.error(f"Tenant not found: {tenant_id}")
            return None
            
        # 3. Create PropertyTenantLink
        link_data = {
            "id": uuid.uuid4(),
            "property_id": property_id,
            "tenant_id": tenant_id,
            "unit_number": unit_number,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat() if end_date else None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        link_created = await tenants_db.create_property_tenant_link(link_data)
        if not link_created:
            logger.error(f"Failed to link tenant {tenant_id} to property {property_id}")
            return None
            
        return link_created
    except Exception as e:
        logger.exception(f"Error in link_tenant_to_property: {e}")
        return None

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