from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
from uuid import uuid4

from ..models.tenant import TenantCreate, TenantUpdate, Tenant
from ..db import tenants as tenants_db
from ..db import properties as properties_db

logger = logging.getLogger(__name__)

async def get_tenants(property_id: Optional[str] = None, owner_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get tenants, optionally filtered by property or owner.
    
    Args:
        property_id: Optional property ID to filter by
        owner_id: Optional owner ID to filter by
        
    Returns:
        List of tenants
    """
    try:
        return await tenants_db.get_tenants(property_id, owner_id)
    except Exception as e:
        logger.error(f"Error in get_tenants service: {str(e)}")
        return []

async def get_tenant_by_id(tenant_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a tenant by ID.
    
    Args:
        tenant_id: The tenant ID
        
    Returns:
        Tenant data or None if not found
    """
    try:
        return await tenants_db.get_tenant_by_id(tenant_id)
    except Exception as e:
        logger.error(f"Error in get_tenant_by_id service: {str(e)}")
        return None

async def create_tenant(tenant_data: TenantCreate, owner_id: str) -> Optional[Dict[str, Any]]:
    """
    Create a new tenant.
    
    Args:
        tenant_data: The tenant data to create
        owner_id: The ID of the property owner
        
    Returns:
        Created tenant data or None if creation failed
    """
    try:
        # Check if property exists
        property_data = await properties_db.get_property_by_id(tenant_data.property_id)
        if not property_data:
            logger.error(f"Property not found: {tenant_data.property_id}")
            return None
        
        # Ensure owner_id matches property owner
        if property_data.get("owner_id") != owner_id:
            logger.error(f"User {owner_id} does not own property {tenant_data.property_id}")
            return None
        
        # Convert Pydantic model to dict and add additional fields
        tenant_dict = tenant_data.model_dump()
        
        # Add generated fields
        tenant_dict["id"] = str(uuid4())
        tenant_dict["owner_id"] = owner_id
        tenant_dict["created_at"] = datetime.utcnow().isoformat()
        
        # Convert datetime objects to ISO format
        if tenant_dict.get("lease_start_date"):
            tenant_dict["lease_start_date"] = tenant_dict["lease_start_date"].isoformat()
        if tenant_dict.get("lease_end_date"):
            tenant_dict["lease_end_date"] = tenant_dict["lease_end_date"].isoformat()
        
        return await tenants_db.create_tenant(tenant_dict)
    except Exception as e:
        logger.error(f"Error in create_tenant service: {str(e)}")
        return None

async def update_tenant(tenant_id: str, tenant_data: TenantUpdate, owner_id: str) -> Optional[Dict[str, Any]]:
    """
    Update an existing tenant.
    
    Args:
        tenant_id: The tenant ID to update
        tenant_data: The updated tenant data
        owner_id: The ID of the property owner
        
    Returns:
        Updated tenant data or None if update failed
    """
    try:
        # Get existing tenant to make sure it exists
        existing_tenant = await tenants_db.get_tenant_by_id(tenant_id)
        if not existing_tenant:
            logger.error(f"Tenant not found: {tenant_id}")
            return None
        
        # Ensure owner_id matches tenant owner
        if existing_tenant.get("owner_id") != owner_id:
            logger.error(f"User {owner_id} does not own tenant {tenant_id}")
            return None
        
        # Convert Pydantic model to dict and add updated_at timestamp
        update_dict = tenant_data.model_dump(exclude_none=True)
        update_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Convert datetime objects to ISO format
        if update_dict.get("lease_start_date"):
            update_dict["lease_start_date"] = update_dict["lease_start_date"].isoformat()
        if update_dict.get("lease_end_date"):
            update_dict["lease_end_date"] = update_dict["lease_end_date"].isoformat()
        
        return await tenants_db.update_tenant(tenant_id, update_dict)
    except Exception as e:
        logger.error(f"Error in update_tenant service: {str(e)}")
        return None

async def delete_tenant(tenant_id: str, owner_id: str) -> bool:
    """
    Delete a tenant.
    
    Args:
        tenant_id: The tenant ID to delete
        owner_id: The ID of the property owner
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        # Get existing tenant to make sure it exists
        existing_tenant = await tenants_db.get_tenant_by_id(tenant_id)
        if not existing_tenant:
            logger.error(f"Tenant not found: {tenant_id}")
            return False
        
        # Ensure owner_id matches tenant owner
        if existing_tenant.get("owner_id") != owner_id:
            logger.error(f"User {owner_id} does not own tenant {tenant_id}")
            return False
        
        return await tenants_db.delete_tenant(tenant_id)
    except Exception as e:
        logger.error(f"Error in delete_tenant service: {str(e)}")
        return False

async def upload_tenant_document(tenant_id: str, document_name: str, document_url: str, document_type: str, owner_id: str) -> Optional[Dict[str, Any]]:
    """
    Upload a tenant document.
    
    Args:
        tenant_id: The tenant ID
        document_name: The document name
        document_url: The document URL
        document_type: The document type
        owner_id: The ID of the property owner
        
    Returns:
        Updated tenant data or None if update failed
    """
    try:
        # Get existing tenant
        existing_tenant = await tenants_db.get_tenant_by_id(tenant_id)
        if not existing_tenant:
            logger.error(f"Tenant not found: {tenant_id}")
            return None
        
        # Ensure owner_id matches tenant owner
        if existing_tenant.get("owner_id") != owner_id:
            logger.error(f"User {owner_id} does not own tenant {tenant_id}")
            return None
        
        # Get existing documents or initialize empty list
        documents = existing_tenant.get("documents", []) or []
        
        # Add new document
        documents.append({
            "url": document_url,
            "name": document_name,
            "type": document_type,
            "uploaded_at": datetime.utcnow().isoformat()
        })
        
        # Update tenant with new documents
        update_dict = {
            "documents": documents,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        return await tenants_db.update_tenant(tenant_id, update_dict)
    except Exception as e:
        logger.error(f"Error in upload_tenant_document service: {str(e)}")
        return None 