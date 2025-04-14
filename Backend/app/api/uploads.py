from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Path, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging
import uuid
from supabase import Client

from app.config.database import get_supabase_client_authenticated

from app.config.auth import get_current_user
from app.services import upload_service # Assuming upload_service exists

router = APIRouter(
    prefix="/uploads",
    tags=["Uploads"],
    responses={404: {"description": "Not found"}}
)

logger = logging.getLogger(__name__)

class UploadResponse(BaseModel):
    file_paths: List[str]
    message: str = "Files uploaded successfully"

@router.post("/", response_model=UploadResponse)
async def upload_files(
    files: List[UploadFile] = File(..., description="The file(s) to upload"),
    context: Optional[str] = Form(None, description="Context for the upload (e.g., 'property_image')"),
    related_id: Optional[str] = Form(None, description="ID related to the context (e.g., property ID)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Uploads one or more files to storage.
    Requires authentication. Context and related_id can be used for organization.
    Returns a list of permanent storage paths.
    """
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")

        # TODO: Add authorization checks based on context and related_id if necessary

        file_paths = await upload_service.handle_upload(
            files=files,
            user_id=user_id,
            context=context,
            related_id=related_id
        )

        if not file_paths:
             logger.warning(f"handle_upload returned empty list for user {user_id}")
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="File upload failed or returned no paths")

        return {"file_paths": file_paths, "message": "Files uploaded successfully"}

    except HTTPException as http_exc:
        logger.error(f"HTTPException during upload for user {user_id}: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        logger.exception(f"Unexpected error during upload for user {user_id}: {e}") # Log full traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during file upload: {str(e)}"
        )

@router.get("/property/{property_id}/images", response_model=List[str])
async def get_property_images(
    property_id: uuid.UUID = Path(..., description="The property ID"),
    db_client: Client = Depends(get_supabase_client_authenticated),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all images for a specific property with signed URLs.
    """
    try:
        # Verify user is authenticated
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")

        # Log the request
        logger.info(f"Retrieving images for property {property_id} requested by user {user_id}")

        # Get signed URLs for property images
        signed_urls = await upload_service.get_property_images(db_client, str(property_id))

        # Check if we got any URLs back
        if not signed_urls:
            logger.warning(f"No image paths found for property {property_id}")
            # Return empty list instead of 404 to handle properties with no images gracefully
            return []

        # Ensure all URLs are HTTPS
        secure_urls = []
        for url in signed_urls:
            if url.startswith('http://'):
                secure_url = url.replace('http://', 'https://')
                logger.info(f"Converted image URL from HTTP to HTTPS for property {property_id}")
                secure_urls.append(secure_url)
            else:
                secure_urls.append(url)

        logger.info(f"Successfully retrieved {len(secure_urls)} image URLs for property {property_id}")
        return secure_urls
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error retrieving property images: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error retrieving images: {str(e)}")

@router.get("/{file_path:path}", response_class=Response)
async def get_file(
    file_path: str,
    db_client: Client = Depends(get_supabase_client_authenticated),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Retrieve a file from storage by its path.
    Returns a redirect to a signed URL.
    """
    try:
        # Verify user is authenticated
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")

        # Get signed URL for the file
        signed_url = await upload_service.get_file_url(db_client, file_path)

        if not signed_url:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        # Redirect to the signed URL
        return RedirectResponse(url=signed_url)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error retrieving file {file_path}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error retrieving file: {str(e)}")
