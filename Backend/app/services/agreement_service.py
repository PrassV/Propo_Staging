from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import uuid
import re
import io

from ..db import agreement as agreement_db
from ..db import properties as property_db
from ..db import tenants as tenant_db
from ..config.database import supabase_client
from ..models.agreement import AgreementCreate, AgreementUpdate, AgreementTemplateCreate

# ReportLab imports
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

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
    Generate a PDF document file from an agreement and template,
    upload it to storage, and update the agreement record.
    """
    logger.info(f"Starting PDF document generation for agreement {agreement_id} using template {template_id}")
    try:
        # --- 1. Fetch Data --- 
        agreement = await agreement_db.get_agreement_by_id(agreement_id)
        if not agreement:
            logger.error(f"[Agreement Gen] Agreement {agreement_id} not found.")
            return None

        # Fetch Template (use default if template_id is None)
        if not template_id:
            # TODO: Implement logic to find a default template based on agreement type?
            templates = await agreement_db.get_agreement_templates(agreement_type=agreement.get('agreement_type'))
            if not templates:
                 logger.error(f"[Agreement Gen] No default template found for agreement type {agreement.get('agreement_type')}")
                 return None
            template = templates[0] # Use the first found as default
            template_id = template.get('id')
            logger.info(f"[Agreement Gen] Using default template {template_id}")
        else:
            template = await agreement_db.get_agreement_template_by_id(template_id)
            if not template:
                 logger.error(f"[Agreement Gen] Specified template {template_id} not found.")
                 return None

        template_content = template.get('content', '')

        # Fetch Related Data
        property_details = await property_db.get_property(agreement.get('property_id'))
        tenant_details = await tenant_db.get_tenant_by_id(agreement.get('tenant_id'))

        if not property_details or not tenant_details:
             logger.error(f"[Agreement Gen] Missing property or tenant details for agreement {agreement_id}")
             return None

        # --- 2. Process Template Variables --- 
        variables = {
            "agreement": agreement,
            "property": property_details,
            "tenant": tenant_details,
            "owner": {"name": "[Owner Name Placeholder]"}, # TODO: Fetch owner details
            "current_date": datetime.utcnow().strftime("%Y-%m-%d")
        }
        processed_content = process_template_variables(template_content, variables)

        # --- 3. Generate PDF File --- 
        pdf_buffer = io.BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=(8.5*inch, 11*inch), topMargin=0.5*inch, bottomMargin=0.5*inch, leftMargin=0.75*inch, rightMargin=0.75*inch)
        styles = getSampleStyleSheet()
        story = []

        # Add Title (Example)
        story.append(Paragraph(agreement.get('agreement_type', 'Agreement').capitalize(), styles['h1']))
        story.append(Spacer(1, 0.2*inch))

        # Add processed content as paragraphs
        # Simple approach: Split content by newlines and create Paragraphs
        # More advanced: Use HTML/Markdown parsing or specific ReportLab elements based on template structure
        for line in processed_content.split('\n'):
            if line.strip(): # Avoid empty paragraphs
                 story.append(Paragraph(line, styles['Normal']))
                 story.append(Spacer(1, 0.1*inch))
            else:
                 story.append(Spacer(1, 0.1*inch)) # Keep spacing for blank lines

        # Build the PDF
        doc.build(story)
        pdf_content_bytes = pdf_buffer.getvalue()
        pdf_buffer.close()

        file_extension = "pdf"
        mime_type = "application/pdf"

        # --- 4. Upload to Storage --- 
        file_name = f"agreement_{agreement_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.{file_extension}"
        bucket_name = "agreements"
        file_path = f"{agreement.get('owner_id')}/{agreement_id}/{file_name}"

        try:
            supabase_storage = supabase_client.storage
            upload_response = await supabase_storage.from_(bucket_name).upload(
                file=io.BytesIO(pdf_content_bytes),
                path=file_path,
                file_options={"content-type": mime_type, "upsert": "true"}
            )
            logger.debug(f"[Agreement Gen] Supabase storage upload response: {upload_response}")

            public_url_response = supabase_storage.from_(bucket_name).get_public_url(file_path)
            document_url = public_url_response
            logger.info(f"[Agreement Gen] Uploaded agreement document URL: {document_url}")

        except Exception as storage_error:
            logger.error(f"[Agreement Gen] Failed to upload agreement {agreement_id} to storage: {storage_error}", exc_info=True)
            return None

        # --- 5. Update Agreement Record --- 
        if document_url:
            update_data = {
                "document_url": document_url,
                "status": "generated", # Update status to indicate generation
                "updated_at": datetime.utcnow().isoformat()
            }
            updated_agreement = await agreement_db.update_agreement(agreement_id, update_data)
            logger.info(f"[Agreement Gen] Updated agreement {agreement_id} with document URL.")
            return updated_agreement
        else:
            logger.error(f"[Agreement Gen] Document URL was not obtained after upload attempt for {agreement_id}")
            return None

    except Exception as e:
        logger.error(f"[Agreement Gen] Error generating document for agreement {agreement_id}: {e}", exc_info=True)
        return None

def process_template_variables(content: str, variables: Dict[str, Any]) -> str:
    """Replace placeholders like {{ tenant.name }} in the content."""
    def replace_match(match):
        # Simple replacement: match.group(1) is like 'tenant.name'
        keys = match.group(1).strip().split('.')
        value = variables
        try:
            for key in keys:
                if isinstance(value, dict):
                    value = value.get(key, f"[Missing: {match.group(0)}]")
                elif hasattr(value, key):
                    value = getattr(value, key, f"[Missing: {match.group(0)}]")
                else:
                    value = f"[Invalid Path: {match.group(0)}]"
                    break
            return str(value) if value is not None else ""
        except Exception:
            return f"[Error: {match.group(0)}]"

    # Regex to find placeholders like {{ object.field }} or {{ simple_var }}
    processed_content = re.sub(r"{{\s*([^}]+?)\s*}}", replace_match, content)
    return processed_content

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