from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Path, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging
import uuid
from supabase import Client

from app.config.database import get_supabase_client_authenticated
from app.config.auth import get_current_user
from app.utils.storage import storage_service

router = APIRouter(
    prefix="/uploads",
    tags=["Uploads"],
    responses={404: {"description": "Not found"}}
)

logger = logging.getLogger(__name__)

class UploadResponse(BaseModel):
    success: bool = True
    uploaded_paths: List[str]
    image_urls: List[str]
    message: str = "Files uploaded successfully"
    # Keep backward compatibility
    file_paths: List[str]

@router.post("/", response_model=UploadResponse)
async def upload_files(
    files: List[UploadFile] = File(..., description="The file(s) to upload"),
    context: Optional[str] = Form(None, description="Context for the upload (e.g., 'property_images', 'tenant_documents')"),
    property_id: Optional[str] = Form(None, description="Property ID for property-related uploads"),
    tenant_id: Optional[str] = Form(None, description="Tenant ID for tenant-related uploads"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Uploads one or more files to storage using unified storage service.
    Requires authentication. Context determines the storage bucket and validation rules.
    Returns a list of permanent storage paths.
    """
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")

        # Map context to storage context (default to id_documents since it doesn't require property_id)
        storage_context = context if context in ['property_images', 'tenant_documents', 'maintenance_files', 'agreements', 'id_documents'] else 'id_documents'
        
        uploaded_paths = []
        image_urls = []
        
        for file in files:
            try:
                # Read file content
                content = await file.read()
                if not content:
                    logger.warning(f"Skipping empty file: {file.filename}")
                    continue
                
                # Prepare metadata
                metadata = {
                    'user_id': user_id,
                    'property_id': property_id,
                    'tenant_id': tenant_id
                }
                
                # Add document_type for tenant documents
                if storage_context == 'tenant_documents' and tenant_id:
                    metadata['document_type'] = 'general'  # Default type, can be overridden
                
                # Upload using unified storage service
                upload_result = storage_service.upload_file(
                    file_content=content,
                    filename=file.filename,
                    context=storage_context,
                    metadata=metadata
                )
                
                if upload_result['success']:
                    uploaded_paths.append(upload_result['file_path'])
                    # Add public URL if available
                    if upload_result.get('public_url'):
                        image_urls.append(upload_result['public_url'])
                    logger.info(f"Successfully uploaded: {file.filename} -> {upload_result['file_path']}")
                else:
                    logger.error(f"Upload failed for {file.filename}: {upload_result.get('error', 'Unknown error')}")
                    
            except Exception as file_error:
                logger.error(f"Error uploading {file.filename}: {str(file_error)}")
                continue

        if not uploaded_paths:
             logger.warning(f"No files were successfully uploaded for user {user_id}")
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files were successfully uploaded")

        # Special handling for property images - update properties table
        if storage_context == 'property_images' and property_id:
            try:
                from app.services import property_service
                from app.config.database import supabase_service_role_client
                
                # Use service role client for database operations
                db_client = supabase_service_role_client
                
                # Get current property data
                property_data = await property_service.get_property(db_client, property_id)
                if property_data:
                    # Get existing image paths and add new ones
                    existing_paths = property_data.get("image_urls", []) or []
                    all_paths = existing_paths + uploaded_paths
                    
                    # Update property with new image paths
                    update_response = db_client.table("properties").update({
                        "image_urls": all_paths
                    }).eq("id", property_id).execute()
                    
                    if hasattr(update_response, 'error') and update_response.error:
                        logger.error(f"Failed to update property {property_id} with image paths: {update_response.error}")
                    else:
                        logger.info(f"Successfully updated property {property_id} with {len(uploaded_paths)} new image paths")
                        
                        # Generate URLs for the newly uploaded images
                        from app.services.property_image_service import property_image_service
                        new_image_urls = await property_image_service.get_property_image_urls(uploaded_paths)
                        image_urls.extend(new_image_urls)
                else:
                    logger.warning(f"Property {property_id} not found when trying to update image paths")
                    
            except Exception as prop_update_error:
                logger.error(f"Error updating property {property_id} with image paths: {str(prop_update_error)}")
                # Don't fail the entire upload, just log the error

        return {
            "success": True,
            "uploaded_paths": uploaded_paths,
            "image_urls": image_urls,
            "file_paths": uploaded_paths,  # Backward compatibility
            "message": f"Successfully uploaded {len(uploaded_paths)} files"
        }

    except HTTPException as http_exc:
        logger.error(f"HTTPException during upload for user {user_id}: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        logger.exception(f"Unexpected error during upload for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during file upload: {str(e)}"
        )

@router.get("/property/{property_id}/images", response_model=List[str])
async def get_property_images(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all images for a specific property with public URLs (property images are public).
    """
    try:
        # Verify user is authenticated
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")

        # List files in the property images bucket for this property
        folder_path = f"properties/{property_id}"
        bucket_name = "propertyimage"
        
        files = storage_service.list_files(bucket_name, folder_path)
        
        if not files:
            return []

        # Generate public URLs for property images (public bucket)
        public_urls = []
        for file_info in files:
            if isinstance(file_info, dict) and 'name' in file_info:
                file_path = f"{folder_path}/{file_info['name']}"
                # Get public URL directly since property images are public
                from app.config.database import supabase_service_role_client
                public_url = supabase_service_role_client.storage.from_(bucket_name).get_public_url(file_path)
                if public_url:
                    public_urls.append(public_url)

        return public_urls
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error retrieving property images: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error retrieving images: {str(e)}")

@router.get("/{file_path:path}", response_class=Response)
async def get_file(
    file_path: str,
    bucket: Optional[str] = Form(None, description="Storage bucket name"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieve a file from storage by its path using unified storage service.
    Returns a redirect to a signed URL for private files or public URL for public files.
    """
    try:
        # Verify user is authenticated
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")

        # Default bucket if not specified
        bucket_name = bucket or "tenant-documents"
        
        # Check if this is a public bucket (property images)
        if bucket_name == "propertyimage":
            # Get public URL directly
            from app.config.database import supabase_service_role_client
            public_url = supabase_service_role_client.storage.from_(bucket_name).get_public_url(file_path)
            if public_url:
                return RedirectResponse(url=public_url)
        else:
            # Get signed URL for private files
            signed_url = storage_service.get_signed_url(file_path, bucket_name, expires_in=3600)
            if signed_url:
                return RedirectResponse(url=signed_url)

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error retrieving file {file_path}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error retrieving file: {str(e)}")
