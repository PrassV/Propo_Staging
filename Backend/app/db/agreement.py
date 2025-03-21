from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from ..config.database import supabase_client

logger = logging.getLogger(__name__)

async def get_agreements(
    owner_id: str = None,
    property_id: str = None,
    tenant_id: str = None,
    status: str = None,
    agreement_type: str = None
) -> List[Dict[str, Any]]:
    """
    Get rent agreements from Supabase, optionally filtered.
    
    Args:
        owner_id: Optional owner ID to filter by
        property_id: Optional property ID to filter by
        tenant_id: Optional tenant ID to filter by
        status: Optional status to filter by
        agreement_type: Optional agreement type to filter by
        
    Returns:
        List of rent agreements
    """
    try:
        query = supabase_client.table('agreements').select('*, property:properties(*), tenant:tenants(*)')
        
        if owner_id:
            query = query.eq('owner_id', owner_id)
            
        if property_id:
            query = query.eq('property_id', property_id)
            
        if tenant_id:
            query = query.eq('tenant_id', tenant_id)
            
        if status:
            query = query.eq('status', status)
            
        if agreement_type:
            query = query.eq('agreement_type', agreement_type)
            
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching agreements: {response['error']}")
            return []
            
        agreements = response.data or []
        
        # Process the joined data
        for agreement in agreements:
            if agreement.get('property'):
                agreement['property_details'] = agreement.pop('property')
            if agreement.get('tenant'):
                agreement['tenant_details'] = agreement.pop('tenant')
                
        return agreements
    except Exception as e:
        logger.error(f"Failed to get agreements: {str(e)}")
        return []

async def get_agreement_by_id(agreement_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a rent agreement by ID from Supabase.
    
    Args:
        agreement_id: The agreement ID
        
    Returns:
        Agreement data or None if not found
    """
    try:
        response = supabase_client.table('agreements').select('*, property:properties(*), tenant:tenants(*)').eq('id', agreement_id).single().execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching agreement: {response['error']}")
            return None
            
        agreement = response.data
        
        # Process the joined data
        if agreement:
            if agreement.get('property'):
                agreement['property_details'] = agreement.pop('property')
            if agreement.get('tenant'):
                agreement['tenant_details'] = agreement.pop('tenant')
                
        return agreement
    except Exception as e:
        logger.error(f"Failed to get agreement {agreement_id}: {str(e)}")
        return None

async def create_agreement(agreement_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new rent agreement in Supabase.
    
    Args:
        agreement_data: The agreement data to insert
        
    Returns:
        Created agreement data or None if creation failed
    """
    try:
        # Prepare data for insertion
        insert_data = {**agreement_data}
        if 'property_details' in insert_data:
            del insert_data['property_details']
        if 'tenant_details' in insert_data:
            del insert_data['tenant_details']
            
        response = supabase_client.table('agreements').insert(insert_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating agreement: {response['error']}")
            return None
            
        created_agreement = response.data[0] if response.data else None
        
        # If successfully created, retrieve the full agreement with joins
        if created_agreement:
            return await get_agreement_by_id(created_agreement['id'])
            
        return None
    except Exception as e:
        logger.error(f"Failed to create agreement: {str(e)}")
        return None

async def update_agreement(agreement_id: str, agreement_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a rent agreement in Supabase.
    
    Args:
        agreement_id: The agreement ID to update
        agreement_data: The updated agreement data
        
    Returns:
        Updated agreement data or None if update failed
    """
    try:
        # Prepare data for update
        update_data = {**agreement_data}
        if 'property_details' in update_data:
            del update_data['property_details']
        if 'tenant_details' in update_data:
            del update_data['tenant_details']
            
        # Add updated_at timestamp
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        # If status is changing to signed, add signed_at timestamp
        if update_data.get('status') in ['signed_tenant', 'signed_landlord', 'signed']:
            if 'signed_at' not in update_data:
                update_data['signed_at'] = datetime.utcnow().isoformat()
        
        response = supabase_client.table('agreements').update(update_data).eq('id', agreement_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating agreement: {response['error']}")
            return None
            
        updated_agreement = response.data[0] if response.data else None
        
        # If successfully updated, retrieve the full agreement with joins
        if updated_agreement:
            return await get_agreement_by_id(updated_agreement['id'])
            
        return None
    except Exception as e:
        logger.error(f"Failed to update agreement {agreement_id}: {str(e)}")
        return None

async def delete_agreement(agreement_id: str) -> bool:
    """
    Delete a rent agreement from Supabase.
    
    Args:
        agreement_id: The agreement ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('agreements').delete().eq('id', agreement_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deleting agreement: {response['error']}")
            return False
            
        return True
    except Exception as e:
        logger.error(f"Failed to delete agreement {agreement_id}: {str(e)}")
        return False

async def get_agreement_templates(owner_id: str = None, agreement_type: str = None) -> List[Dict[str, Any]]:
    """
    Get agreement templates from Supabase, optionally filtered.
    
    Args:
        owner_id: Optional owner ID to filter by
        agreement_type: Optional agreement type to filter by
        
    Returns:
        List of agreement templates
    """
    try:
        query = supabase_client.table('agreement_templates').select('*')
        
        if owner_id:
            query = query.eq('owner_id', owner_id)
            
        if agreement_type:
            query = query.eq('agreement_type', agreement_type)
            
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching agreement templates: {response['error']}")
            return []
            
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get agreement templates: {str(e)}")
        return []

async def get_agreement_template_by_id(template_id: str) -> Optional[Dict[str, Any]]:
    """
    Get an agreement template by ID from Supabase.
    
    Args:
        template_id: The template ID
        
    Returns:
        Template data or None if not found
    """
    try:
        response = supabase_client.table('agreement_templates').select('*').eq('id', template_id).single().execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching agreement template: {response['error']}")
            return None
            
        return response.data
    except Exception as e:
        logger.error(f"Failed to get agreement template {template_id}: {str(e)}")
        return None

async def create_agreement_template(template_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new agreement template in Supabase.
    
    Args:
        template_data: The template data to insert
        
    Returns:
        Created template data or None if creation failed
    """
    try:
        response = supabase_client.table('agreement_templates').insert(template_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating agreement template: {response['error']}")
            return None
            
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create agreement template: {str(e)}")
        return None

async def update_agreement_template(template_id: str, template_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update an agreement template in Supabase.
    
    Args:
        template_id: The template ID to update
        template_data: The updated template data
        
    Returns:
        Updated template data or None if update failed
    """
    try:
        # Add updated_at timestamp
        template_data['updated_at'] = datetime.utcnow().isoformat()
        
        response = supabase_client.table('agreement_templates').update(template_data).eq('id', template_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating agreement template: {response['error']}")
            return None
            
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update agreement template {template_id}: {str(e)}")
        return None

async def delete_agreement_template(template_id: str) -> bool:
    """
    Delete an agreement template from Supabase.
    
    Args:
        template_id: The template ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('agreement_templates').delete().eq('id', template_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deleting agreement template: {response['error']}")
            return False
            
        return True
    except Exception as e:
        logger.error(f"Failed to delete agreement template {template_id}: {str(e)}")
        return False

async def get_current_agreement(property_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the current active agreement for a property and tenant.
    
    Args:
        property_id: The property ID
        tenant_id: The tenant ID
        
    Returns:
        Current agreement data or None if not found
    """
    try:
        today = datetime.utcnow().date().isoformat()
        
        # Look for an active agreement that covers today's date
        query = supabase_client.table('agreements').select('*, property:properties(*), tenant:tenants(*)')
        query = query.eq('property_id', property_id)
        query = query.eq('tenant_id', tenant_id)
        query = query.eq('status', 'signed')
        query = query.lte('start_date', today)
        query = query.gte('end_date', today)
        query = query.limit(1)
        
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching current agreement: {response['error']}")
            return None
            
        agreements = response.data or []
        
        if not agreements:
            return None
            
        agreement = agreements[0]
        
        # Process the joined data
        if agreement.get('property'):
            agreement['property_details'] = agreement.pop('property')
        if agreement.get('tenant'):
            agreement['tenant_details'] = agreement.pop('tenant')
            
        return agreement
    except Exception as e:
        logger.error(f"Failed to get current agreement: {str(e)}")
        return None 