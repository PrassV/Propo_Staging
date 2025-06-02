from typing import Dict, List, Any, Optional
import logging
import uuid
from ..config.database import supabase_client, supabase_service_role_client
from datetime import date, datetime

logger = logging.getLogger(__name__)

# --- Primary Tenant Functions ---

async def get_tenants_for_owner(
    owner_id: uuid.UUID,
    property_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    sort_by: str = 'created_at',
    sort_order: str = 'desc'
) -> tuple[List[Dict[str, Any]], int]:
    """
    Get tenants associated with properties owned by a specific user.
    This is more complex and requires multiple queries:
    1. Find properties owned by the user (or a specific property if provided)
    2. Find property_tenant links for those properties
    3. Fetch the tenant details for those links

    Args:
        owner_id: The ID of the property owner
        property_id: Optional specific property to filter by
        status: Optional tenant status to filter by (active, unassigned, inactive)
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (pagination)
        sort_by: Field to sort by
        sort_order: Sort direction ('asc' or 'desc')

    Returns:
        List of tenant dictionaries
    """
    try:
        # If specific property_id provided, verify ownership first
        if property_id:
            # Fetch property to verify ownership
            property_response = supabase_client.table('properties').select('id').eq('id', str(property_id)).eq('owner_id', str(owner_id)).execute()
            if not property_response.data:
                logger.warning(f"User {owner_id} does not own property {property_id} or property doesn't exist")
                return []

            # Get property_tenant links for this property
            links_response = supabase_client.table('property_tenants').select('tenant_id').eq('property_id', str(property_id)).execute()
            if not links_response.data:
                return []  # No tenants linked to this property

            tenant_ids = [link['tenant_id'] for link in links_response.data]
        else:
            # Get all properties owned by this user
            properties_response = supabase_client.table('properties').select('id').eq('owner_id', str(owner_id)).execute()
            if not properties_response.data:
                return []  # User doesn't own any properties

            property_ids = [prop['id'] for prop in properties_response.data]

            # Get all property_tenant links for these properties
            # Note: Supabase PostgreSQL RLS policies must allow this query
            # In supabase-py we can't do a direct "in" query easily, so we'll use multiple queries
            tenant_ids = set()
            for p_id in property_ids:
                links_response = supabase_client.table('property_tenants').select('tenant_id').eq('property_id', p_id).execute()
                if links_response.data:
                    tenant_ids.update([link['tenant_id'] for link in links_response.data])

            if not tenant_ids:
                return []  # No tenants linked to any properties

        # Fetch tenant details for these IDs
        # Note: In production, consider using a stored procedure/RPC for better performance
        tenants = []
        for t_id in list(tenant_ids)[skip:skip+limit]:  # Apply simple pagination here
            query = supabase_client.table('tenants').select('*').eq('id', t_id)
            
            # Apply status filter if provided
            if status:
                query = query.eq('status', status)
                
            tenant_response = query.execute()
            if tenant_response.data:
                tenants.append(tenant_response.data[0])

        # Sort tenants (in-memory sorting for simplicity)
        # In production, this should be done at the database level
        ascending = sort_order.lower() == 'asc'
        try:
            tenants.sort(key=lambda x: x.get(sort_by, ''), reverse=not ascending)
        except (KeyError, TypeError):
            logger.warning(f"Sort by '{sort_by}' failed, falling back to default")
            tenants.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        return tenants, len(tenants)
    except Exception as e:
        logger.exception(f"Failed to get tenants for owner {owner_id}: {str(e)}")
        return [], 0

async def get_tenant_by_email(email: str) -> Optional[Dict[str, Any]]:
    """
    Get a tenant by email address.

    Args:
        email: The tenant's email address

    Returns:
        Tenant data or None if not found
    """
    try:
        response = supabase_client.table('tenants').select('*').eq('email', email).limit(1).execute()

        # Handle different Supabase client versions
        # Some versions have response.error, others don't
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching tenant by email: {response.error.message}")
            return None

        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to get tenant by email {email}: {str(e)}")
        return None

async def get_tenant_by_id(tenant_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get a tenant by ID from Supabase.

    Args:
        tenant_id: The tenant ID (UUID)

    Returns:
        Tenant data or None if not found
    """
    try:
        response = supabase_client.table('tenants').select('*').eq('id', str(tenant_id)).single().execute()

        # Handle different Supabase client versions
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching tenant: {response.error.message}")
            return None

        return response.data
    except Exception as e:
        logger.error(f"Failed to get tenant {tenant_id}: {str(e)}")
        return None

async def create_tenant(tenant_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new tenant in Supabase.

    Args:
        tenant_data: The tenant data to insert

    Returns:
        Created tenant data or None if creation failed
    """
    try:
        # Create a copy of the data to avoid modifying the original
        tenant_data_copy = tenant_data.copy()
        
        # Ensure ID is a string for Supabase
        if 'id' in tenant_data_copy and isinstance(tenant_data_copy['id'], uuid.UUID):
            tenant_data_copy['id'] = str(tenant_data_copy['id'])
        # Same for user_id if present
        if 'user_id' in tenant_data_copy and isinstance(tenant_data_copy['user_id'], uuid.UUID):
            tenant_data_copy['user_id'] = str(tenant_data_copy['user_id'])
            
        # Convert all datetime objects to ISO format strings
        for key, value in tenant_data_copy.items():
            if isinstance(value, datetime):
                tenant_data_copy[key] = value.isoformat()
            elif isinstance(value, date):
                tenant_data_copy[key] = value.isoformat()

        # Use service role client to bypass RLS for tenant creation
        # Property owners should be able to create tenants for their properties
        response = supabase_service_role_client.table('tenants').insert(tenant_data_copy).execute()

        # Handle different Supabase client versions
        if hasattr(response, 'error') and response.error:
            logger.error(f"Failed to create tenant: {response.error}")
            return None

        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create tenant: {str(e)}")
        return None

async def update_tenant(tenant_id: uuid.UUID, tenant_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a tenant in Supabase.

    Args:
        tenant_id: The tenant ID to update (UUID)
        tenant_data: The updated tenant data

    Returns:
        Updated tenant data or None if update failed
    """
    try:
        # Create a copy of the data to avoid modifying the original
        tenant_data_copy = tenant_data.copy()
        
        # Ensure ID is a string for Supabase
        if 'id' in tenant_data_copy and isinstance(tenant_data_copy['id'], uuid.UUID):
            tenant_data_copy['id'] = str(tenant_data_copy['id'])
        # Same for user_id if present
        if 'user_id' in tenant_data_copy and isinstance(tenant_data_copy['user_id'], uuid.UUID):
            tenant_data_copy['user_id'] = str(tenant_data_copy['user_id'])
            
        # Convert all datetime objects to ISO format strings
        for key, value in tenant_data_copy.items():
            if isinstance(value, datetime):
                tenant_data_copy[key] = value.isoformat()
            elif isinstance(value, date):
                tenant_data_copy[key] = value.isoformat()

        response = supabase_client.table('tenants').update(tenant_data_copy).eq('id', str(tenant_id)).execute()

        # Handle different Supabase client versions
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error updating tenant: {response.error.message}")
            return None

        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update tenant {tenant_id}: {str(e)}")
        return None

async def delete_tenant(tenant_id: uuid.UUID) -> bool:
    """
    Delete a tenant from Supabase.

    Args:
        tenant_id: The tenant ID to delete (UUID)

    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('tenants').delete().eq('id', str(tenant_id)).execute()

        # Handle different Supabase client versions
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error deleting tenant: {response.error.message}")
            return False

        return True
    except Exception as e:
        logger.error(f"Failed to delete tenant {tenant_id}: {str(e)}")
        return False

async def get_tenant_by_user_id(user_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get a tenant by the linked user ID (auth ID).
    If multiple tenants are linked to the same user ID, returns the first one found.

    Args:
        user_id: The user ID (UUID) linked to the tenant profile.

    Returns:
        Tenant data or None if not found.
    """
    try:
        # Use the service role client to bypass RLS policies
        response = supabase_service_role_client.table('tenants')\
                        .select('*')\
                        .eq('user_id', str(user_id))\
                        .limit(1)\
                        .execute()

        # Check for explicit error (Supabase client v1/v2 difference might exist)
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching tenant by user_id {user_id}: {response.error.message}")
            return None

        # Return the first item in the response data if any exists
        if response.data and len(response.data) > 0:
            return response.data[0]
        else:
            logger.info(f"No tenant found for user_id {user_id}")
            return None # Explicitly return None if no data

    except Exception as e:
        # Catch potential exceptions during client call or processing
        logger.error(f"Failed to get tenant by user_id {user_id}: {str(e)}")
        return None # Explicitly return None if exception

async def get_tenant_by_property_id(property_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Gets the tenant details for a tenant associated with a specific property ID.
    Assumes a single active tenant per property for simplicity, or returns the first found.

    Args:
        property_id: The ID of the property.

    Returns:
        Tenant data dictionary if found, otherwise None.
    """
    logger.info(f"Attempting to find tenant linked to property_id: {property_id}")
    try:
        # 1. Find the link in property_tenants table (using parentheses for chaining)
        link_response = await (
            supabase_client.table('property_tenants')
            .select('tenant_id')
            .eq('property_id', str(property_id))
            .limit(1) # Assuming one tenant link per property for this use case
            .execute()
        )

        if hasattr(link_response, 'error') and link_response.error:
            logger.error(f"Error finding property_tenant link for property {property_id}: {link_response.error.message}")
            return None

        if not link_response.data:
            logger.warning(f"No tenant link found for property_id: {property_id}")
            return None

        tenant_id_str = link_response.data[0].get('tenant_id')
        if not tenant_id_str:
            logger.error(f"Found link for property {property_id} but tenant_id was null or missing.")
            return None

        logger.info(f"Found tenant link: tenant_id {tenant_id_str} for property {property_id}")

        # 2. Fetch the tenant details using the found tenant_id
        tenant_id = uuid.UUID(tenant_id_str)
        tenant_data = await get_tenant_by_id(tenant_id) # Reuse existing get_tenant_by_id

        if not tenant_data:
             logger.warning(f"Tenant link found ({tenant_id}) but failed to fetch tenant details.")
             # This case might indicate inconsistent data
             return None

        logger.info(f"Successfully retrieved tenant details for tenant {tenant_id} linked to property {property_id}")
        return tenant_data

    except Exception as e:
        logger.exception(f"Unexpected error retrieving tenant by property_id {property_id}: {e}")
        return None

async def update_tenant_user_id(tenant_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    """
    Helper function to specifically update only the user_id of a tenant.
    Uses the generic update_tenant function.

    Args:
        tenant_id: The ID of the tenant to update.
        user_id: The user ID to link.

    Returns:
        True if update was successful (or seemed successful), False otherwise.
    """
    logger.info(f"Attempting to update user_id for tenant {tenant_id} to {user_id}")
    try:
        # Call the generic update function with only the user_id field
        updated_tenant = await update_tenant(tenant_id, {"user_id": str(user_id)})

        # Check if the update function returned data (indicating success)
        if updated_tenant:
            logger.info(f"Successfully updated user_id for tenant {tenant_id}.")
            return True
        else:
            # update_tenant logs its own errors, just log context here
            logger.warning(f"Update_tenant call failed for tenant {tenant_id} when setting user_id.")
            return False
    except Exception as e:
        logger.exception(f"Unexpected error in update_tenant_user_id for tenant {tenant_id}: {e}")
        return False

# --- Property-Tenant Link Functions ---

async def create_property_tenant_link(link_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new property-tenant link in the property_tenants table.

    Args:
        link_data: The link data including property_id, tenant_id, etc.

    Returns:
        Created link data or None if creation failed
    """
    try:
        # Create a copy of the data to avoid modifying the original
        link_data_copy = link_data.copy()
        
        # Ensure IDs are strings for Supabase
        if 'id' in link_data_copy and isinstance(link_data_copy['id'], uuid.UUID):
            link_data_copy['id'] = str(link_data_copy['id'])
        if 'property_id' in link_data_copy and isinstance(link_data_copy['property_id'], uuid.UUID):
            link_data_copy['property_id'] = str(link_data_copy['property_id'])
        if 'tenant_id' in link_data_copy and isinstance(link_data_copy['tenant_id'], uuid.UUID):
            link_data_copy['tenant_id'] = str(link_data_copy['tenant_id'])
            
        # Convert all datetime/date objects to ISO format strings
        for key, value in link_data_copy.items():
            if isinstance(value, datetime):
                link_data_copy[key] = value.isoformat()
            elif isinstance(value, date):
                link_data_copy[key] = value.isoformat()

        response = supabase_client.table('property_tenants').insert(link_data_copy).execute()

        # Handle different Supabase client versions
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error creating property-tenant link: {response.error.message}")
            return None

        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create property-tenant link: {str(e)}")
        return None

async def get_property_links_for_tenant(tenant_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get all property-tenant links for a specific tenant.

    Args:
        tenant_id: The tenant ID

    Returns:
        List of property-tenant link data
    """
    try:
        response = supabase_client.table('property_tenants').select('*').eq('tenant_id', str(tenant_id)).execute()

        # Handle different Supabase client versions
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching property links for tenant: {response.error.message}")
            return []

        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get property links for tenant {tenant_id}: {str(e)}")
        return []

async def get_property_tenant_link_by_id(link_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get a property-tenant link by ID.

    Args:
        link_id: The link ID

    Returns:
        Property-tenant link data or None if not found
    """
    try:
        response = supabase_client.table('property_tenants').select('*').eq('id', str(link_id)).single().execute()

        # Handle different Supabase client versions
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching property-tenant link: {response.error.message}")
            return None

        return response.data
    except Exception as e:
        logger.error(f"Failed to get property-tenant link {link_id}: {str(e)}")
        return None

async def update_property_tenant_link(link_id: uuid.UUID, link_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a property-tenant link in Supabase.

    Args:
        link_id: The link ID to update
        link_data: The updated link data

    Returns:
        Updated link data or None if update failed
    """
    try:
        # Create a copy of the data to avoid modifying the original
        link_data_copy = link_data.copy()
        
        # Ensure IDs are strings for Supabase
        if 'id' in link_data_copy and isinstance(link_data_copy['id'], uuid.UUID):
            link_data_copy['id'] = str(link_data_copy['id'])
        if 'property_id' in link_data_copy and isinstance(link_data_copy['property_id'], uuid.UUID):
            link_data_copy['property_id'] = str(link_data_copy['property_id'])
        if 'tenant_id' in link_data_copy and isinstance(link_data_copy['tenant_id'], uuid.UUID):
            link_data_copy['tenant_id'] = str(link_data_copy['tenant_id'])
            
        # Convert all datetime/date objects to ISO format strings
        for key, value in link_data_copy.items():
            if isinstance(value, datetime):
                link_data_copy[key] = value.isoformat()
            elif isinstance(value, date):
                link_data_copy[key] = value.isoformat()

        response = supabase_client.table('property_tenants').update(link_data_copy).eq('id', str(link_id)).execute()

        # Handle different Supabase client versions
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error updating property-tenant link: {response.error.message}")
            return None

        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update property-tenant link {link_id}: {str(e)}")
        return None

async def delete_property_tenant_link(link_id: uuid.UUID) -> bool:
    """
    Delete a property-tenant link from Supabase.

    Args:
        link_id: The link ID to delete

    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('property_tenants').delete().eq('id', str(link_id)).execute()

        # Handle different Supabase client versions
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error deleting property-tenant link: {response.error.message}")
            return False

        return True
    except Exception as e:
        logger.error(f"Failed to delete property-tenant link {link_id}: {str(e)}")
        return False

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
    """
    Get leases (property-tenant links) with pagination and filtering.

    Args:
        owner_id: The owner ID to filter by
        property_id: Optional property ID to filter by
        tenant_id: Optional tenant ID to filter by
        active_only: If True, only return active leases (end_date is null or in the future)
        skip: Number of records to skip for pagination
        limit: Maximum number of records to return
        sort_by: Field to sort by
        sort_order: Sort direction ('asc' or 'desc')

    Returns:
        Tuple of (list of leases, total count)
    """
    try:
        # First, get properties owned by this user
        properties_response = supabase_client.table('properties').select('id').eq('owner_id', str(owner_id)).execute()

        if not properties_response.data:
            return [], 0  # User doesn't own any properties

        property_ids = [prop['id'] for prop in properties_response.data]

        # If specific property_id provided, check if it's in the list of owned properties
        if property_id and str(property_id) not in property_ids:
            return [], 0  # User doesn't own this property

        # Build the query for property_tenants
        query = supabase_client.table('property_tenants').select('*, property:properties(*), tenant:tenants(*)')

        # Apply filters
        if property_id:
            query = query.eq('property_id', str(property_id))
        else:
            # Filter by all properties owned by this user
            # Note: This is a simplification. In a real app, you'd use a more efficient query
            query = query.in_('property_id', property_ids)

        if tenant_id:
            query = query.eq('tenant_id', str(tenant_id))

        if active_only:
            today = date.today().isoformat()
            query = query.or_(f"end_date.gte.{today},end_date.is.null")

        # Get total count first
        count_query = supabase_client.table('property_tenants').select('id', count='exact')

        if property_id:
            count_query = count_query.eq('property_id', str(property_id))
        else:
            count_query = count_query.in_('property_id', property_ids)

        if tenant_id:
            count_query = count_query.eq('tenant_id', str(tenant_id))

        if active_only:
            count_query = count_query.or_(f"end_date.gte.{today},end_date.is.null")

        count_response = count_query.execute()
        total_count = count_response.count if hasattr(count_response, 'count') else 0

        # Apply sorting and pagination
        sort_direction = 'asc' if sort_order.lower() == 'asc' else 'desc'
        query = query.order(sort_by, sort_direction)
        query = query.range(skip, skip + limit - 1)

        # Execute the query
        response = query.execute()

        if response.error:
            logger.error(f"Error fetching leases: {response.error.message}")
            return [], 0

        leases = response.data or []

        # Process the joined data
        for lease in leases:
            if lease.get('property'):
                lease['property_details'] = lease.pop('property')
            if lease.get('tenant'):
                lease['tenant_details'] = lease.pop('tenant')

        return leases, total_count
    except Exception as e:
        logger.error(f"Failed to get leases: {str(e)}")
        return [], 0

async def delete_property_tenant_links_by_tenant(tenant_id: uuid.UUID) -> bool:
    """
    Delete all property-tenant links for a specific tenant.

    Args:
        tenant_id: The tenant ID

    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('property_tenants').delete().eq('tenant_id', str(tenant_id)).execute()

        if response.error:
            logger.error(f"Error deleting property-tenant links: {response.error.message}")
            return False

        return True
    except Exception as e:
        logger.error(f"Failed to delete property-tenant links for tenant {tenant_id}: {str(e)}")
        return False

# --- Added Function ---
async def get_property_links_for_property(property_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get all property-tenant links for a specific property.

    Args:
        property_id: The property ID

    Returns:
        List of property-tenant link data
    """
    try:
        response = await supabase_client.table('property_tenants').select('*').eq('property_id', str(property_id)).execute()

        if response.error:
            logger.error(f"Error fetching property links for property: {response.error.message}")
            return []

        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get property links for property {property_id}: {str(e)}")
        return []

# --- Added Function ---
async def get_property_links_for_property_within_dates(
    property_id: uuid.UUID,
    start_date: date,
    end_date: date
) -> List[Dict[str, Any]]:
    """
    Get property-tenant links for a property that overlap with a given date range.
    Overlap condition: link_start <= report_end AND (link_end >= report_start OR link_end IS NULL)

    Args:
        property_id: The property ID
        start_date: The start date of the report period
        end_date: The end date of the report period

    Returns:
        List of overlapping property-tenant link data
    """
    try:
        # Filter for links starting before or on the report end date
        query = supabase_client.table('property_tenants')\
                    .select('*')\
                    .eq('property_id', str(property_id))\
                    .lte('start_date', end_date.isoformat())

        # Filter for links ending after or on the report start date (or have no end date)
        # This requires an OR condition which might be tricky with the standard builder
        # Using PostgREST filter syntax directly within .or()
        query = query.or_(f"end_date.gte.{start_date.isoformat()},end_date.is.null")

        response = await query.execute()

        if response.error:
            logger.error(f"Error fetching property links within dates for property: {response.error.message}")
            return []

        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get property links within dates for property {property_id}: {str(e)}")
        return []

# --- Tenant Invitation Functions ---

async def create_invitation(invitation_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new tenant invitation in Supabase.

    Args:
        invitation_data: The invitation data

    Returns:
        Created invitation data or None if creation failed
    """
    try:
        # Ensure IDs are strings for Supabase
        if 'id' in invitation_data and isinstance(invitation_data['id'], uuid.UUID):
            invitation_data['id'] = str(invitation_data['id'])
        if 'property_id' in invitation_data and isinstance(invitation_data['property_id'], uuid.UUID):
            invitation_data['property_id'] = str(invitation_data['property_id'])
        if 'owner_id' in invitation_data and isinstance(invitation_data['owner_id'], uuid.UUID):
            invitation_data['owner_id'] = str(invitation_data['owner_id'])
        if 'tenant_id' in invitation_data and isinstance(invitation_data['tenant_id'], uuid.UUID):
            invitation_data['tenant_id'] = str(invitation_data['tenant_id'])

        # Date/time fields need string conversion
        if 'expires_at' in invitation_data and hasattr(invitation_data['expires_at'], 'isoformat'):
            invitation_data['expires_at'] = invitation_data['expires_at'].isoformat()
        if 'created_at' in invitation_data and hasattr(invitation_data['created_at'], 'isoformat'):
            invitation_data['created_at'] = invitation_data['created_at'].isoformat()
        if 'updated_at' in invitation_data and hasattr(invitation_data['updated_at'], 'isoformat'):
            invitation_data['updated_at'] = invitation_data['updated_at'].isoformat()

        response = supabase_client.table('tenant_invitations').insert(invitation_data).execute()

        if response.error:
            logger.error(f"Error creating tenant invitation: {response.error.message}")
            return None

        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create tenant invitation: {str(e)}")
        return None

async def get_active_invitation(email: str, property_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get an active invitation for a specific email and property.

    Args:
        email: The recipient email address
        property_id: The property ID

    Returns:
        Invitation data or None if not found
    """
    try:
        response = supabase_client.table('tenant_invitations').select('*')\
            .eq('email', email)\
            .eq('property_id', str(property_id))\
            .eq('status', 'pending')\
            .gt('expires_at', 'now()')\
            .limit(1)\
            .execute()

        if response.error:
            logger.error(f"Error fetching active invitation: {response.error.message}")
            return None

        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to get active invitation for {email}: {str(e)}")
        return None

# --- Property Retrieval for Tenant ---

async def get_properties_for_tenant_db(tenant_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get all properties associated with a tenant.

    Args:
        tenant_id: The tenant ID

    Returns:
        List of property data
    """
    try:
        # 1. Get property IDs from property_tenants
        links_response = supabase_client.table('property_tenants').select('property_id').eq('tenant_id', str(tenant_id)).execute()

        if links_response.error:
            logger.error(f"Error fetching property links: {links_response.error.message}")
            return []

        if not links_response.data:
            return []

        # 2. Fetch each property
        properties = []
        for link in links_response.data:
            property_id = link.get('property_id')
            if not property_id:
                continue

            property_response = supabase_client.table('properties').select('*').eq('id', property_id).single().execute()

            if property_response.error:
                logger.error(f"Error fetching property {property_id}: {property_response.error.message}")
                continue

            if property_response.data:
                properties.append(property_response.data)

        return properties
    except Exception as e:
        logger.error(f"Failed to get properties for tenant {tenant_id}: {str(e)}")
        return []

async def get_tenant_payments(
    tenant_id: uuid.UUID,
    limit: int = 100,
    sort_by: str = 'payment_date',
    sort_order: str = 'desc'
) -> List[Dict[str, Any]]:
    """
    Get payment history records for a tenant.

    Args:
        tenant_id: The tenant ID to get payments for
        limit: Maximum number of records to return
        sort_by: Field to sort by (default: payment_date)
        sort_order: Sort direction ('asc' or 'desc')

    Returns:
        List of payment history records
    """
    try:
        # Build the query
        query = supabase_client.table('payment_history').select('*').eq('tenant_id', str(tenant_id))

        # Apply sorting
        if sort_order.lower() == 'asc':
            query = query.order(sort_by, ascending=True)
        else:
            query = query.order(sort_by, ascending=False)

        # Apply limit
        query = query.limit(limit)

        # Execute query
        response = query.execute()

        if response.error:
            logger.error(f"Error fetching payment history: {response.error.message}")
            return []

        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Failed to get payment history for tenant {tenant_id}: {str(e)}")
        return []

async def get_tenant_payment_tracking(
    tenant_id: uuid.UUID,
    limit: int = 100,
    sort_by: str = 'payment_date',
    sort_order: str = 'asc'
) -> List[Dict[str, Any]]:
    """
    Get payment tracking records for a tenant.
    These are upcoming and scheduled payments, not historical completed payments.

    Args:
        tenant_id: The tenant ID to get payment tracking for
        limit: Maximum number of records to return
        sort_by: Field to sort by (default: payment_date)
        sort_order: Sort direction ('asc' or 'desc')

    Returns:
        List of payment tracking records
    """
    try:
        # Build the query
        query = supabase_client.table('payment_tracking').select('*').eq('tenant_id', str(tenant_id))

        # Apply sorting
        if sort_order.lower() == 'asc':
            query = query.order(sort_by, ascending=True)
        else:
            query = query.order(sort_by, ascending=False)

        # Apply limit
        query = query.limit(limit)

        # Execute query
        response = query.execute()

        if response.error:
            logger.error(f"Error fetching payment tracking: {response.error.message}")
            return []

        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Failed to get payment tracking for tenant {tenant_id}: {str(e)}")
        return []

async def db_get_current_tenant_for_unit(unit_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Get the tenant currently associated with a specific unit via an active lease.

    An active lease is defined as one where the current date is between
    the lease's start_date and end_date (inclusive).

    Args:
        unit_id: The ID of the unit.

    Returns:
        Tenant data if an active lease exists for the unit, otherwise None.
    """
    try:
        today = date.today()
        # Find the currently active lease link for the given unit
        # Assumes 'property_tenants' table links tenants to units and has start/end dates
        lease_response = supabase_client.table('property_tenants') \
            .select('tenant_id') \
            .eq('unit_id', str(unit_id)) \
            .lte('start_date', today.isoformat()) \
            .gte('end_date', today.isoformat()) \
            .order('created_at', desc=True) \
            .limit(1) \
            .maybe_single() \
            .execute()

        # Handle potential errors during lease fetch
        if hasattr(lease_response, 'error') and lease_response.error:
            logger.error(f"Error fetching current lease for unit {unit_id}: {lease_response.error.message}")
            return None

        if not lease_response.data:
            logger.info(f"No active lease found for unit {unit_id} as of {today}")
            return None # No active lease found for today

        tenant_id_str = lease_response.data.get('tenant_id')
        if not tenant_id_str:
             logger.error(f"Found active lease for unit {unit_id} but tenant_id is missing.")
             return None

        # Fetch the tenant details using the tenant_id from the lease
        # Convert tenant_id string back to UUID
        tenant_response = await get_tenant_by_id(uuid.UUID(tenant_id_str))

        return tenant_response # Returns tenant data or None if get_tenant_by_id fails

    except Exception as e:
        logger.exception(f"Exception occurred while fetching tenant for unit {unit_id}: {str(e)}")
        return None

# --- New Function ---
async def db_get_tenants_for_unit(unit_id: uuid.UUID) -> List[Dict[str, Any]]:
    """
    Get tenants associated with a specific unit via the property_tenants link.

    Args:
        unit_id: The ID of the unit.

    Returns:
        A list of tenant data dictionaries associated with the unit.
    """
    tenants = []
    try:
        # Find links for the unit
        lease_response = await supabase_client.table('property_tenants') \
            .select('tenant_id') \
            .eq('unit_id', str(unit_id)) \
            .execute()

        if hasattr(lease_response, 'error') and lease_response.error:
            logger.error(f"Error fetching leases for unit {unit_id}: {lease_response.error.message}")
            return []

        if not lease_response.data:
            logger.info(f"No leases/tenants found linked to unit {unit_id}")
            return []

        tenant_ids = {link.get('tenant_id') for link in lease_response.data if link.get('tenant_id')}
        if not tenant_ids:
             return []

        # Fetch details for each unique tenant ID found
        for tenant_id_str in tenant_ids:
            try:
                 tenant_id_uuid = uuid.UUID(tenant_id_str)
                 tenant_details = await get_tenant_by_id(tenant_id_uuid) # Reuse existing function
                 if tenant_details:
                     tenants.append(tenant_details)
                 else:
                     logger.warning(f"Found link for tenant {tenant_id_str} in unit {unit_id}, but failed to fetch tenant details.")
            except ValueError:
                 logger.warning(f"Invalid UUID format '{tenant_id_str}' found in property_tenants for unit {unit_id}")
            except Exception as inner_e:
                logger.error(f"Error fetching details for tenant {tenant_id_str} linked to unit {unit_id}: {inner_e}")

        return tenants

    except Exception as e:
        logger.exception(f"Exception occurred while fetching tenants for unit {unit_id}: {str(e)}")
        return []

# --- Property-Tenant Link (Lease) Functions ---

# Example: Function to get all leases for a tenant (could be added)
# async def get_leases_for_tenant(tenant_id: uuid.UUID): ...

# Example: Function to get all leases for a property (could be added)
# async def get_leases_for_property(property_id: uuid.UUID): ...

# --- Helper/Utility Functions ---

async def check_tenant_exists(tenant_id: uuid.UUID) -> bool:
    """
    Check if a tenant with the given ID exists in the database.

    Args:
        tenant_id: The UUID of the tenant to check.

    Returns:
        True if the tenant exists, False otherwise.
    """
    try:
        response = supabase_client.table('tenants') \
            .select('id', count='exact') \
            .eq('id', str(tenant_id)) \
            .limit(1) \
            .execute()

        # Check if the count is greater than 0
        if response.count is not None and response.count > 0:
            return True
        elif response.error:
            logger.error(f"Error checking tenant existence for {tenant_id}: {response.error.message}")
            return False
        else:
            # No error, but count is 0 or None
            return False

    except Exception as e:
        logger.exception(f"Exception checking tenant existence for {tenant_id}: {str(e)}")
        return False

async def update_tenant_status(tenant_id: uuid.UUID, status: str) -> bool:
    """
    Update a tenant's status.

    Args:
        tenant_id: The tenant ID (UUID)
        status: The new status ('active', 'unassigned', or 'inactive')

    Returns:
        True if update succeeded, False otherwise
    """
    try:
        # Validate status value
        valid_statuses = ['active', 'unassigned', 'inactive']
        if status not in valid_statuses:
            logger.error(f"Invalid tenant status: {status}. Must be one of {valid_statuses}")
            return False

        # Update tenant status
        response = supabase_client.table('tenants').update({"status": status}).eq('id', str(tenant_id)).execute()

        if response.error:
            logger.error(f"Error updating tenant status: {response.error.message}")
            return False

        return True
    except Exception as e:
        logger.error(f"Failed to update tenant {tenant_id} status to {status}: {str(e)}")
        return False

async def get_tenants_by_owner_id(
    owner_id: uuid.UUID,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    sort_by: str = 'created_at',
    sort_order: str = 'desc'
) -> tuple[List[Dict[str, Any]], int]:
    """
    Get all tenants directly created by a specific owner using the owner_id field.
    
    Args:
        owner_id: The ID of the owner who created the tenants
        status: Optional tenant status to filter by (active, unassigned, inactive)
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (pagination)
        sort_by: Field to sort by
        sort_order: Sort direction ('asc' or 'desc')
        
    Returns:
        Tuple of (list of tenant dictionaries, total count)
    """
    try:
        # Start building the query
        query = supabase_client.table('tenants').select('*', count='exact').eq('owner_id', str(owner_id))
        
        # Apply status filter if provided
        if status:
            query = query.eq('status', status)
            
        # Apply sorting
        if sort_order.lower() == 'asc':
            query = query.order(sort_by, desc=False)
        else:
            query = query.order(sort_by, desc=True)
            
        # Apply pagination
        query = query.range(skip, skip + limit - 1)
        
        # Execute the query
        response = query.execute()
        
        # Handle error
        if hasattr(response, 'error') and response.error:
            logger.error(f"Error fetching tenants by owner_id: {response.error.message}")
            return [], 0
            
        # Get count from response
        total_count = response.count if hasattr(response, 'count') else len(response.data)
        
        return response.data, total_count
        
    except Exception as e:
        logger.exception(f"Failed to get tenants by owner_id {owner_id}: {str(e)}")
        return [], 0