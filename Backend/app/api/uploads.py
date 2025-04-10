from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging

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