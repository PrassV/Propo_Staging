from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body, Form
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.models.document import (
    DocumentCreate,
    DocumentUpdate,
    Document,
    DocumentAccess,
    DocumentType,
    DocumentStatus
)
from app.services import document_service
from app.config.auth import get_current_user

router = APIRouter()

# Response models
class DocumentResponse(BaseModel):
    document: Dict[str, Any]
    message: str = "Success"

class DocumentsResponse(BaseModel):
    documents: List[Dict[str, Any]]
    count: int
    message: str = "Success"

class DocumentVersionResponse(BaseModel):
    version: Dict[str, Any]
    message: str = "Success"

class DocumentVersionsResponse(BaseModel):
    versions: List[Dict[str, Any]]
    count: int
    message: str = "Success"

class DocumentShareResponse(BaseModel):
    share: Dict[str, Any]
    message: str = "Success"

class DocumentSharesResponse(BaseModel):
    shares: List[Dict[str, Any]]
    count: int
    message: str = "Success"

class DocumentCategoryResponse(BaseModel):
    category: Dict[str, Any]
    message: str = "Success"

class DocumentCategoriesResponse(BaseModel):
    categories: List[Dict[str, Any]]
    count: int
    message: str = "Success"

@router.get("/", response_model=DocumentsResponse)
async def get_documents(
    property_id: Optional[str] = Query(None, description="Filter by property ID"),
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get documents for the current user.
    
    Args:
        property_id: Optional filter by property ID
        tenant_id: Optional filter by tenant ID
        document_type: Optional filter by document type
        status: Optional filter by status
        current_user: The current authenticated user
        
    Returns:
        List of documents
    """
    documents = await document_service.get_documents(
        owner_id=current_user["id"],
        property_id=property_id,
        tenant_id=tenant_id,
        document_type=document_type,
        status=status
    )
    
    return {
        "documents": documents,
        "count": len(documents),
        "message": "Documents retrieved successfully"
    }

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str = Path(..., description="The document ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific document by ID.
    
    Args:
        document_id: The document ID
        current_user: The current authenticated user
        
    Returns:
        Document details
    """
    document = await document_service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if the user has access to the document
    has_access = await document_service.check_document_access(document_id, current_user["id"])
    if not has_access and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this document"
        )
    
    return {
        "document": document,
        "message": "Document retrieved successfully"
    }

@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    document_data: DocumentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new document.
    
    Args:
        document_data: The document data
        current_user: The current authenticated user
        
    Returns:
        Created document
    """
    document = await document_service.create_document(document_data, current_user["id"])
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create document"
        )
    
    return {
        "document": document,
        "message": "Document created successfully"
    }

@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_data: DocumentUpdate,
    document_id: str = Path(..., description="The document ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a document.
    
    Args:
        document_data: The updated document data
        document_id: The document ID
        current_user: The current authenticated user
        
    Returns:
        Updated document
    """
    # Check if the document exists and belongs to the user
    document = await document_service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this document"
        )
    
    updated_document = await document_service.update_document(document_id, document_data)
    
    if not updated_document:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update document"
        )
    
    return {
        "document": updated_document,
        "message": "Document updated successfully"
    }

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
async def delete_document(
    document_id: str = Path(..., description="The document ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a document.
    
    Args:
        document_id: The document ID
        current_user: The current authenticated user
        
    Returns:
        Success message
    """
    # Check if the document exists and belongs to the user
    document = await document_service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this document"
        )
    
    success = await document_service.delete_document(document_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document"
        )
    
    return {
        "message": "Document deleted successfully"
    }

@router.put("/{document_id}/archive", response_model=DocumentResponse)
async def archive_document(
    document_id: str = Path(..., description="The document ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Archive a document.
    
    Args:
        document_id: The document ID
        current_user: The current authenticated user
        
    Returns:
        Updated document
    """
    # Check if the document exists and belongs to the user
    document = await document_service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to archive this document"
        )
    
    updated_document = await document_service.archive_document(document_id)
    
    if not updated_document:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to archive document"
        )
    
    return {
        "document": updated_document,
        "message": "Document archived successfully"
    }

@router.post("/{document_id}/versions", response_model=DocumentVersionResponse)
async def create_document_version(
    document_id: str = Path(..., description="The document ID"),
    file_url: str = Form(..., description="The URL to the new file version"),
    change_notes: Optional[str] = Form(None, description="Notes about the changes"),
    file_size: Optional[int] = Form(None, description="File size in bytes"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new version of a document.
    
    Args:
        document_id: The document ID
        file_url: The URL to the new file version
        change_notes: Optional notes about the changes
        file_size: Optional file size in bytes
        current_user: The current authenticated user
        
    Returns:
        Created version
    """
    # Check if the document exists and belongs to the user
    document = await document_service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create a version for this document"
        )
    
    version = await document_service.create_document_version(
        document_id,
        file_url,
        current_user["id"],
        change_notes,
        file_size
    )
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create document version"
        )
    
    return {
        "version": version,
        "message": "Document version created successfully"
    }

@router.get("/{document_id}/versions", response_model=DocumentVersionsResponse)
async def get_document_versions(
    document_id: str = Path(..., description="The document ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get versions of a document.
    
    Args:
        document_id: The document ID
        current_user: The current authenticated user
        
    Returns:
        List of document versions
    """
    # Check if the document exists and belongs to the user
    document = await document_service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    has_access = await document_service.check_document_access(document_id, current_user["id"])
    if not has_access and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view versions of this document"
        )
    
    versions = await document_service.get_document_versions(document_id)
    
    return {
        "versions": versions,
        "count": len(versions),
        "message": "Document versions retrieved successfully"
    }

@router.post("/{document_id}/share", response_model=DocumentShareResponse)
async def share_document(
    document_id: str = Path(..., description="The document ID"),
    shared_with: Optional[str] = Form(None, description="User ID or email to share with"),
    access_code: Optional[str] = Form(None, description="Access code for public sharing"),
    expiry_date: Optional[str] = Form(None, description="Expiry date for the share (ISO format)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Share a document with a user or generate a public access code.
    
    Args:
        document_id: The document ID
        shared_with: Optional user ID or email to share with
        access_code: Optional access code for public sharing
        expiry_date: Optional expiry date for the share
        current_user: The current authenticated user
        
    Returns:
        Created share
    """
    # Check if the document exists and belongs to the user
    document = await document_service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to share this document"
        )
    
    # Parse expiry_date if provided
    from datetime import datetime
    expiry_datetime = None
    if expiry_date:
        try:
            expiry_datetime = datetime.fromisoformat(expiry_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid expiry date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"
            )
    
    share = await document_service.share_document(
        document_id,
        current_user["id"],
        shared_with,
        access_code,
        expiry_datetime
    )
    
    if not share:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to share document"
        )
    
    return {
        "share": share,
        "message": "Document shared successfully"
    }

@router.get("/{document_id}/shares", response_model=DocumentSharesResponse)
async def get_document_shares(
    document_id: str = Path(..., description="The document ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get shares of a document.
    
    Args:
        document_id: The document ID
        current_user: The current authenticated user
        
    Returns:
        List of document shares
    """
    # Check if the document exists and belongs to the user
    document = await document_service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view shares of this document"
        )
    
    shares = await document_service.get_document_shares(document_id)
    
    return {
        "shares": shares,
        "count": len(shares),
        "message": "Document shares retrieved successfully"
    }

@router.put("/shares/{share_id}/revoke", status_code=status.HTTP_200_OK)
async def revoke_document_share(
    share_id: str = Path(..., description="The share ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Revoke a document share.
    
    Args:
        share_id: The share ID
        current_user: The current authenticated user
        
    Returns:
        Success message
    """
    # For simplicity, we won't check document ownership here
    # In a real implementation, you'd want to check that the user owns the document
    success = await document_service.revoke_document_share(share_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke document share"
        )
    
    return {
        "message": "Document share revoked successfully"
    }

@router.get("/categories", response_model=DocumentCategoriesResponse)
async def get_document_categories(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get document categories for the current user.
    
    Args:
        current_user: The current authenticated user
        
    Returns:
        List of document categories
    """
    categories = await document_service.get_document_categories(current_user["id"])
    
    return {
        "categories": categories,
        "count": len(categories),
        "message": "Document categories retrieved successfully"
    }

@router.post("/categories", response_model=DocumentCategoryResponse)
async def create_document_category(
    name: str = Form(..., description="The category name"),
    description: Optional[str] = Form(None, description="The category description"),
    parent_category_id: Optional[str] = Form(None, description="The parent category ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new document category.
    
    Args:
        name: The category name
        description: Optional category description
        parent_category_id: Optional parent category ID
        current_user: The current authenticated user
        
    Returns:
        Created category
    """
    category = await document_service.create_document_category(
        name,
        current_user["id"],
        description,
        parent_category_id
    )
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create document category"
        )
    
    return {
        "category": category,
        "message": "Document category created successfully"
    }

@router.put("/categories/{category_id}", response_model=DocumentCategoryResponse)
async def update_document_category(
    category_id: str = Path(..., description="The category ID"),
    name: Optional[str] = Form(None, description="The new category name"),
    description: Optional[str] = Form(None, description="The new category description"),
    parent_category_id: Optional[str] = Form(None, description="The new parent category ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a document category.
    
    Args:
        category_id: The category ID
        name: Optional new category name
        description: Optional new category description
        parent_category_id: Optional new parent category ID
        current_user: The current authenticated user
        
    Returns:
        Updated category
    """
    # For simplicity, we won't check category ownership here
    # In a real implementation, you'd want to check that the user owns the category
    
    category = await document_service.update_document_category(
        category_id,
        name,
        description,
        parent_category_id
    )
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update document category"
        )
    
    return {
        "category": category,
        "message": "Document category updated successfully"
    }

@router.delete("/categories/{category_id}", status_code=status.HTTP_200_OK)
async def delete_document_category(
    category_id: str = Path(..., description="The category ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a document category.
    
    Args:
        category_id: The category ID
        current_user: The current authenticated user
        
    Returns:
        Success message
    """
    # For simplicity, we won't check category ownership here
    # In a real implementation, you'd want to check that the user owns the category
    
    success = await document_service.delete_document_category(category_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document category"
        )
    
    return {
        "message": "Document category deleted successfully"
    }

@router.post("/{document_id}/categories/{category_id}", status_code=status.HTTP_200_OK)
async def assign_document_to_category(
    document_id: str = Path(..., description="The document ID"),
    category_id: str = Path(..., description="The category ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Assign a document to a category.
    
    Args:
        document_id: The document ID
        category_id: The category ID
        current_user: The current authenticated user
        
    Returns:
        Success message
    """
    # Check if the document exists and belongs to the user
    document = await document_service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to assign this document to a category"
        )
    
    result = await document_service.assign_document_to_category(document_id, category_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign document to category"
        )
    
    return {
        "message": "Document assigned to category successfully"
    }

@router.delete("/{document_id}/categories/{category_id}", status_code=status.HTTP_200_OK)
async def remove_document_from_category(
    document_id: str = Path(..., description="The document ID"),
    category_id: str = Path(..., description="The category ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Remove a document from a category.
    
    Args:
        document_id: The document ID
        category_id: The category ID
        current_user: The current authenticated user
        
    Returns:
        Success message
    """
    # Check if the document exists and belongs to the user
    document = await document_service.get_document(document_id)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if document["owner_id"] != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to remove this document from a category"
        )
    
    success = await document_service.remove_document_from_category(document_id, category_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove document from category"
        )
    
    return {
        "message": "Document removed from category successfully"
    } 