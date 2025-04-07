import logging
import uuid
from fastapi import UploadFile, HTTPException, status
from supabase import create_client, Client
from typing import List

# Assuming settings are correctly configured with necessary Supabase details
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Helper to get a Supabase client instance initialized with the service role key.
# This is often needed for backend operations like storage uploads that might
# require permissions beyond what the user's JWT provides via RLS.
def get_supabase_service_client() -> Client:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.")
        raise ValueError("Supabase service client configuration missing.")
    try:
        # Create a new client instance specifically with the service role key
        service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        logger.debug("Successfully created Supabase client with service role key.")
        return service_client
    except Exception as e:
        logger.exception("Failed to create Supabase client with service role key.")
        raise ValueError(f"Failed to initialize Supabase service client: {e}")

async def handle_upload(
    files: List[UploadFile], # Accept a list of files
    user_id: str,
    context: str | None = None,
    related_id: str | None = None
) -> List[str]: # Return a list of URLs
    """
    Handles upload of multiple files to Supabase Storage using the service role key.
    Selects the bucket based on the provided context.
    Constructs a path for each file based on context, user_id, related_id, and a unique filename.
    Returns a list of signed URLs for the uploaded files.
    """
    signed_urls = []
    try:
        storage_client = get_supabase_service_client()

        # Select bucket based on context (outside the loop)
        if context == 'property_image':
            bucket_name = settings.PROPERTY_IMAGE_BUCKET
        elif context == 'tenant_document':
            bucket_name = settings.TENANT_DOCUMENT_BUCKET
        elif context == 'id_document':
            bucket_name = settings.ID_DOCUMENT_BUCKET
        elif context == 'maintenance_file':
            bucket_name = settings.MAINTENANCE_FILES_BUCKET
        elif context == 'agreement':
            bucket_name = settings.AGREEMENTS_BUCKET
        else:
            bucket_name = settings.GENERAL_UPLOAD_BUCKET 
            logger.warning(f"Upload context '{context}' not recognized or missing. Using default bucket: {bucket_name}")
            context = context or "general" 

        if not bucket_name:
            logger.error(f"Storage bucket name is not configured for context '{context}' or default.")
            raise ValueError("Storage bucket name not configured correctly.")

        # Set expiration time for signed URLs
        expires_in = 3600 # 1 hour

        for file in files:
            # Generate a unique filename for each file
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
            unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())

            # Construct path within the bucket
            path_parts = [context, str(user_id)] 
            if related_id:
                path_parts.append(str(related_id))
            path_parts.append(unique_filename)
            storage_path = "/".join(path_parts)

            logger.info(f"Attempting to upload file '{file.filename}' to: Bucket='{bucket_name}', Path='{storage_path}'")

            content = await file.read()
            if not content:
                logger.warning(f"Skipping empty file: {file.filename}")
                continue # Skip empty files

            # Perform the upload
            upload_response = storage_client.storage.from_(bucket_name).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": file.content_type or 'application/octet-stream'}
            )
            # Add basic error check for upload if needed based on library version
            logger.info(f"File '{file.filename}' uploaded to path: {storage_path}")

            # Get a signed URL for the uploaded file
            signed_url_response = storage_client.storage.from_(bucket_name).create_signed_url(
                path=storage_path, 
                expires_in=expires_in
            )
            signed_url = signed_url_response.get('signedURL')

            if signed_url:
                logger.info(f"Signed URL generated for '{file.filename}': {signed_url}")
                signed_urls.append(signed_url)
            else:
                logger.error(f"Upload succeeded for '{file.filename}' but failed to get signed URL. Path: {storage_path}. Response: {signed_url_response}")
                # Decide whether to raise an error for the whole batch or just skip this file's URL
                # Raising an error might be safer to signal partial failure.
                # For now, we just log the error and the URL won't be included.

        # Return the list of successfully generated signed URLs
        if not signed_urls and len(files) > 0:
             # Check if we attempted uploads but got no URLs back
             logger.error("File upload process completed, but no signed URLs were generated.")
             # Raise error if no URLs were generated despite having files
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="File upload succeeded but failed to retrieve access URLs.")
             
        return signed_urls

    except ValueError as ve:
         logger.error(f"Configuration error during upload handle: {ve}")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(ve))
    except HTTPException as http_exc:
         raise http_exc
    except Exception as e:
        logger.exception(f"Unexpected error handling file upload for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred processing the file(s): {str(e)}"
        ) 