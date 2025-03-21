from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import uuid
import re

from ..db import agreement as agreement_db
from ..db import properties as property_db
from ..db import tenants as tenant_db
from ..models.agreement import AgreementCreate, AgreementUpdate, AgreementTemplateCreate

logger = logging.getLogger(__name__)

async def get_agreements(
    owner_id: str = None,
    property_id: str = None,
    tenant_id: str = None,
    status: str = None,
    agreement_type: str = None
) -> List[Dict[str, Any]]:
    """
    Get rent agreements, optionally filtered.
    
    Args:
        owner_id: Optional owner ID to filter by
        property_id: Optional property ID to filter by
        tenant_id: Optional tenant ID to filter by
        status: Optional status to filter by
        agreement_type: Optional agreement type to filter by
        
    Returns:
        List of rent agreements
    """
    return await agreement_db.get_agreements(
        owner_id=owner_id,
        property_id=property_id,
        tenant_id=tenant_id,
        status=status,
        agreement_type=agreement_type
    )

async def get_agreement(agreement_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a specific rent agreement by ID.
    
    Args:
        agreement_id: The agreement ID
        
    Returns:
        Agreement data or None if not found
    """
    return await agreement_db.get_agreement_by_id(agreement_id)

async def create_agreement(agreement_data: AgreementCreate, owner_id: str) -> Optional[Dict[str, Any]]:
    """
    Create a new rent agreement.
    
    Args:
        agreement_data: The agreement data
        owner_id: The owner ID
        
    Returns:
        Created agreement data or None if creation failed
    """
    try:
        # Prepare agreement data
        insert_data = agreement_data.dict()
        
        # Add owner ID
        insert_data['owner_id'] = owner_id
        
        # Set created_at and updated_at timestamps
        insert_data['created_at'] = datetime.utcnow().isoformat()
        insert_data['updated_at'] = insert_data['created_at']
        
        # Generate unique ID
        insert_data['id'] = str(uuid.uuid4())
        
        # Set initial status to draft if not provided
        if 'status' not in insert_data or not insert_data['status']:
            insert_data['status'] = 'draft'
        
        # Create the agreement
        return await agreement_db.create_agreement(insert_data)
    except Exception as e:
        logger.error(f"Error creating agreement: {str(e)}")
        return None

async def update_agreement(agreement_id: str, agreement_data: AgreementUpdate) -> Optional[Dict[str, Any]]:
    """
    Update a rent agreement.
    
    Args:
        agreement_id: The agreement ID to update
        agreement_data: The updated agreement data
        
    Returns:
        Updated agreement data or None if update failed
    """
    try:
        # Get existing agreement
        existing_agreement = await agreement_db.get_agreement_by_id(agreement_id)
        if not existing_agreement:
            logger.error(f"Agreement not found: {agreement_id}")
            return None
            
        # Prepare update data
        update_data = {k: v for k, v in agreement_data.dict(exclude_unset=True).items() if v is not None}
        
        # Update the agreement
        return await agreement_db.update_agreement(agreement_id, update_data)
    except Exception as e:
        logger.error(f"Error updating agreement: {str(e)}")
        return None

async def delete_agreement(agreement_id: str) -> bool:
    """
    Delete a rent agreement.
    
    Args:
        agreement_id: The agreement ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    return await agreement_db.delete_agreement(agreement_id)

async def get_agreement_templates(
    owner_id: str = None,
    agreement_type: str = None
) -> List[Dict[str, Any]]:
    """
    Get agreement templates, optionally filtered.
    
    Args:
        owner_id: Optional owner ID to filter by
        agreement_type: Optional agreement type to filter by
        
    Returns:
        List of agreement templates
    """
    return await agreement_db.get_agreement_templates(
        owner_id=owner_id,
        agreement_type=agreement_type
    )

async def get_agreement_template(template_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a specific agreement template by ID.
    
    Args:
        template_id: The template ID
        
    Returns:
        Template data or None if not found
    """
    return await agreement_db.get_agreement_template_by_id(template_id)

async def create_agreement_template(template_data: AgreementTemplateCreate, owner_id: str) -> Optional[Dict[str, Any]]:
    """
    Create a new agreement template.
    
    Args:
        template_data: The template data
        owner_id: The owner ID
        
    Returns:
        Created template data or None if creation failed
    """
    try:
        # Prepare template data
        insert_data = template_data.dict()
        
        # Add owner ID
        insert_data['owner_id'] = owner_id
        
        # Set created_at and updated_at timestamps
        insert_data['created_at'] = datetime.utcnow().isoformat()
        insert_data['updated_at'] = insert_data['created_at']
        
        # Generate unique ID
        insert_data['id'] = str(uuid.uuid4())
        
        # Create the template
        return await agreement_db.create_agreement_template(insert_data)
    except Exception as e:
        logger.error(f"Error creating agreement template: {str(e)}")
        return None

async def update_agreement_template(template_id: str, template_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update an agreement template.
    
    Args:
        template_id: The template ID to update
        template_data: The updated template data
        
    Returns:
        Updated template data or None if update failed
    """
    try:
        # Get existing template
        existing_template = await agreement_db.get_agreement_template_by_id(template_id)
        if not existing_template:
            logger.error(f"Agreement template not found: {template_id}")
            return None
            
        return await agreement_db.update_agreement_template(template_id, template_data)
    except Exception as e:
        logger.error(f"Error updating agreement template: {str(e)}")
        return None

async def delete_agreement_template(template_id: str) -> bool:
    """
    Delete an agreement template.
    
    Args:
        template_id: The template ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    return await agreement_db.delete_agreement_template(template_id)

async def get_current_agreement(property_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the current active agreement for a property and tenant.
    
    Args:
        property_id: The property ID
        tenant_id: The tenant ID
        
    Returns:
        Current agreement data or None if not found
    """
    return await agreement_db.get_current_agreement(property_id, tenant_id)

async def generate_agreement_document(agreement_id: str, template_id: str = None) -> Optional[Dict[str, Any]]:
    """
    Generate a document from an agreement and template.
    
    Args:
        agreement_id: The agreement ID
        template_id: Optional template ID (if not provided, uses default template)
        
    Returns:
        Updated agreement data with document URL or None if generation failed
    """
    try:
        # Get the agreement
        agreement = await agreement_db.get_agreement_by_id(agreement_id)
        if not agreement:
            logger.error(f"Agreement not found: {agreement_id}")
            return None
            
        # Get the template
        template = None
        if template_id:
            template = await agreement_db.get_agreement_template_by_id(template_id)
        else:
            # Get default template for this agreement type
            templates = await agreement_db.get_agreement_templates(
                owner_id=agreement.get('owner_id'),
                agreement_type=agreement.get('agreement_type')
            )
            default_templates = [t for t in templates if t.get('is_default')]
            if default_templates:
                template = default_templates[0]
                
        if not template:
            logger.error(f"No suitable template found for agreement: {agreement_id}")
            return None
            
        # Get property details
        property_data = None
        if agreement.get('property_id'):
            property_data = await property_db.get_property_by_id(agreement.get('property_id'))
            
        # Get tenant details
        tenant_data = None
        if agreement.get('tenant_id'):
            tenant_data = await tenant_db.get_tenant_by_id(agreement.get('tenant_id'))
            
        # In a real system, you would use the template and data to generate a document
        # For now, we'll just simulate this by updating the agreement with a dummy URL
        
        # This would actually use the template content and replace placeholders
        # For example: {{tenant.name}}, {{property.address}}, {{agreement.start_date}}, etc.
        
        # Generate a dummy document URL
        document_url = f"https://example.com/agreements/{agreement_id}.pdf"
        
        # Update the agreement with the document URL
        update_data = {
            'document_url': document_url,
            'status': 'generated',
            'updated_at': datetime.utcnow().isoformat()
        }
        
        return await agreement_db.update_agreement(agreement_id, update_data)
    except Exception as e:
        logger.error(f"Error generating agreement document: {str(e)}")
        return None

async def process_agreement_variables(template_content: str, data: Dict[str, Any]) -> str:
    """
    Process variables in an agreement template.
    
    Args:
        template_content: The template content with placeholders
        data: The data to use for replacing placeholders
        
    Returns:
        Processed template content
    """
    try:
        # Process placeholders like {{property.address}}, {{tenant.name}}, etc.
        def replace_placeholder(match):
            placeholder = match.group(1).strip()
            parts = placeholder.split('.')
            
            # Navigate through the data dictionary
            value = data
            for part in parts:
                if part in value:
                    value = value[part]
                else:
                    # If part not found, return the original placeholder
                    return match.group(0)
                    
            return str(value)
            
        # Replace all placeholders
        pattern = r'\{\{(.*?)\}\}'
        processed_content = re.sub(pattern, replace_placeholder, template_content)
        
        return processed_content
    except Exception as e:
        logger.error(f"Error processing agreement variables: {str(e)}")
        return template_content

async def update_agreement_status(agreement_id: str, status: str, signed_url: str = None) -> Optional[Dict[str, Any]]:
    """
    Update the status of an agreement (e.g., when signed).
    
    Args:
        agreement_id: The agreement ID
        status: The new status value
        signed_url: Optional URL to the signed document
        
    Returns:
        Updated agreement data or None if update failed
    """
    try:
        # Prepare update data
        update_data = {
            'status': status,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # If signed URL provided, add it
        if signed_url:
            update_data['signed_url'] = signed_url
            
        # If status indicates signing, add signed_at timestamp
        if status in ['signed_tenant', 'signed_landlord', 'signed']:
            update_data['signed_at'] = datetime.utcnow().isoformat()
            
        return await agreement_db.update_agreement(agreement_id, update_data)
    except Exception as e:
        logger.error(f"Error updating agreement status: {str(e)}")
        return None 