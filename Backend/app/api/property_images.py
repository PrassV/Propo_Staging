from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Path
from pydantic import BaseModel
from typing import List, Dict, Any
import logging
import uuid
from supabase import Client

from app.config.database import get_supabase_client_authenticated
from app.config.auth import get_current_user
from app.services.property_image_service import property_image_service
from app.services import property_service

router = APIRouter(
    prefix="/properties/{property_id}/images",
    tags=["Property Images"],
    responses={404: {"description": "Not found"}}
)

logger = logging.getLogger(__name__)

class PropertyImageUploadResponse(BaseModel):
    """Response model for property image upload"""
    success: bool
    message: str
    uploaded_paths: List[str]
    image_urls: List[str]
    failed_files: List[str] = []

class PropertyImageListResponse(BaseModel):
    """Response model for property image list"""
    property_id: str
    image_urls: List[str]
    total_images: int

@router.post("/upload", response_model=PropertyImageUploadResponse)
async def upload_property_images(
    property_id: uuid.UUID = Path(..., description="Property ID"),
    files: List[UploadFile] = File(..., description="Image files to upload"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Upload property images using clean S3-like pattern:
    1. Upload files to storage with structured paths
    2. Store only paths in database 
    3. Return URLs generated on-demand
    """
    try:
        # Validate user authentication
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated"
            )
        
        # Validate property exists and user has permission
        property_data = await property_service.get_property(db_client, str(property_id))
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        # Check if user owns the property
        if property_data.get("owner_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to upload images for this property"
            )
        
        # Validate files before upload
        valid_files = []
        failed_files = []
        
        for file in files:
            if property_image_service.validate_image_file(file):
                valid_files.append(file)
            else:
                failed_files.append(file.filename or "unknown")
                logger.warning(f"Invalid image file rejected: {file.filename}")
        
        if not valid_files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid image files provided"
            )
        
        # Upload images to storage (S3-like)
        uploaded_paths = await property_image_service.upload_property_images(
            files=valid_files,
            property_id=str(property_id),
            user_id=user_id
        )
        
        if not uploaded_paths:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload any images"
            )
        
        # Update property database with new image paths
        # Get existing paths first
        existing_paths = property_data.get("image_urls", []) or []
        all_paths = existing_paths + uploaded_paths
        
        # Update property with new paths (store paths, not URLs)
        update_response = db_client.table("properties").update({
            "image_urls": all_paths  # Note: column name is confusing but stores paths
        }).eq("id", str(property_id)).execute()
        
        if hasattr(update_response, 'error') and update_response.error:
            logger.error(f"Failed to update property paths: {update_response.error}")
            # Try to clean up uploaded files
            for path in uploaded_paths:
                await property_image_service.delete_property_image(path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save image references to database"
            )
        
        # Generate public URLs for response (S3-like)
        image_urls = await property_image_service.get_property_image_urls(uploaded_paths)
        
        logger.info(f"Successfully uploaded {len(uploaded_paths)} images for property {property_id}")
        
        return PropertyImageUploadResponse(
            success=True,
            message=f"Successfully uploaded {len(uploaded_paths)} images",
            uploaded_paths=uploaded_paths,
            image_urls=image_urls,
            failed_files=failed_files
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error uploading property images: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during image upload: {str(e)}"
        )

@router.get("/", response_model=PropertyImageListResponse)
async def get_property_images(
    property_id: uuid.UUID = Path(..., description="Property ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Get all images for a property with public URLs (S3-like pattern)
    Supports both legacy and new secure path formats
    """
    try:
        # Validate user authentication
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated"
            )
        
        logger.info(f"Fetching images for property {property_id} for user {user_id}")
        
        # Get property data
        try:
            property_data = await property_service.get_property(db_client, str(property_id))
        except Exception as e:
            logger.error(f"Error fetching property {property_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error fetching property data"
            )
            
        if not property_data:
            logger.warning(f"Property {property_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        # Get image paths from database
        image_paths = property_data.get("image_urls", []) or []
        logger.info(f"Found {len(image_paths)} image paths for property {property_id}: {image_paths}")
        
        # Generate public URLs with improved error handling
        try:
            image_urls = await property_image_service.get_property_image_urls(image_paths)
            logger.info(f"Successfully generated {len(image_urls)} URLs for property {property_id}")
        except Exception as url_error:
            logger.error(f"Error generating image URLs for property {property_id}: {str(url_error)}")
            # Don't fail the entire request - return empty list instead
            image_urls = []
            logger.warning(f"Returning empty image list for property {property_id} due to URL generation error")
        
        return PropertyImageListResponse(
            property_id=str(property_id),
            image_urls=image_urls,
            total_images=len(image_urls)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error retrieving property images for {property_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving images: {str(e)}"
        )

@router.delete("/{image_index}")
async def delete_property_image(
    property_id: uuid.UUID = Path(..., description="Property ID"),
    image_index: int = Path(..., description="Index of image to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db_client: Client = Depends(get_supabase_client_authenticated)
):
    """
    Delete a specific property image by index (S3-like pattern)
    """
    try:
        # Validate user authentication
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated"
            )
        
        # Get property data
        property_data = await property_service.get_property(db_client, str(property_id))
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        # Check permission
        if property_data.get("owner_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete images for this property"
            )
        
        # Get current image paths
        image_paths = property_data.get("image_urls", []) or []
        
        if not image_paths or image_index < 0 or image_index >= len(image_paths):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found at specified index"
            )
        
        # Get path to delete
        path_to_delete = image_paths[image_index]
        
        # Delete from storage (S3-like)
        delete_success = await property_image_service.delete_property_image(path_to_delete)
        
        if not delete_success:
            logger.warning(f"Failed to delete image from storage: {path_to_delete}")
            # Continue anyway to clean up database reference
        
        # Remove from database array
        updated_paths = [path for i, path in enumerate(image_paths) if i != image_index]
        
        # Update property in database
        update_response = db_client.table("properties").update({
            "image_urls": updated_paths
        }).eq("id", str(property_id)).execute()
        
        if hasattr(update_response, 'error') and update_response.error:
            logger.error(f"Failed to update property after image deletion: {update_response.error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update property after image deletion"
            )
        
        logger.info(f"Successfully deleted image at index {image_index} for property {property_id}")
        
        return {
            "success": True,
            "message": f"Image at index {image_index} deleted successfully",
            "remaining_images": len(updated_paths)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting property image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting image: {str(e)}"
        ) 