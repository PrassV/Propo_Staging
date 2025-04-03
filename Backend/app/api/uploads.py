from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any
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
    file_url: str
    message: str = "File uploaded successfully"

@router.post("/", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(..., description="The file to upload"),
    context: Optional[str] = Form(None, description="Context for the upload (e.g., 'profile', 'maintenance')"),
    related_id: Optional[str] = Form(None, description="ID related to the context (e.g., user ID, request ID)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Uploads a file to storage.
    Requires authentication. Context and related_id can be used for organization and potential authorization.
    """
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")

        # TODO: Add authorization checks based on context and related_id if necessary

        file_url = await upload_service.handle_upload(
            file=file,
            user_id=user_id,
            context=context,
            related_id=related_id
        )

        if not file_url:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="File upload failed")

        return {"file_url": file_url, "message": "File uploaded successfully"}

    except HTTPException as http_exc:
        logger.error(f"HTTPException during upload for user {user_id}: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        logger.exception(f"Unexpected error during upload for user {user_id}: {e}") # Log full traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during file upload: {str(e)}"
        ) 