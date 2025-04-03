import logging
import uuid
from fastapi import UploadFile, HTTPException, status
from supabase import create_client, Client

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
    file: UploadFile,
    user_id: str,
    context: str | None = None,
    related_id: str | None = None
) -> str:
    """
    Handles file upload to Supabase Storage using the service role key.
    Constructs a path based on context, user_id, related_id, and a unique filename.
    Returns the public URL of the uploaded file.
    """
    try:
        # Use the service role client for storage operations
        storage_client = get_supabase_service_client()

        # Define bucket and path
        bucket_name = settings.SUPABASE_STORAGE_BUCKET
        if not bucket_name:
            logger.error("SUPABASE_STORAGE_BUCKET is not configured in settings.")
            raise ValueError("Storage bucket name not configured.")

        # Generate a unique filename to prevent overwrites and sanitize input
        # Using UUID + original extension is safer than using original filename directly
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())

        # Construct path (e.g., context/user_id/related_id/unique_filename.ext)
        path_parts = [context or "general", str(user_id)]
        if related_id:
            path_parts.append(str(related_id))
        path_parts.append(unique_filename)
        storage_path = "/".join(path_parts)

        logger.info(f"Attempting to upload file to Supabase Storage: Bucket='{bucket_name}', Path='{storage_path}'")

        # Read file content
        content = await file.read()
        if not content:
             logger.warning(f"Upload attempted with empty file: {file.filename}")
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot upload empty file.")

        # Perform the upload using the storage client
        # Make sure the bucket specified exists in your Supabase project
        # and the service role key has permission to upload to it.
        upload_response = storage_client.storage.from_(bucket_name).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type or 'application/octet-stream'}
        )

        # Basic check: supabase-py v2 might raise an error on failure, 
        # but explicit checks can be useful depending on version/configuration.
        # Add more robust checking based on the actual response if needed.
        # For example, check upload_response.status_code if available and not 2xx.

        logger.info(f"File uploaded to path: {storage_path}")

        # Get the public URL for the uploaded file
        # Ensure the bucket's public access settings allow this if needed, 
        # or handle signed URLs if files should be private.
        public_url_data = storage_client.storage.from_(bucket_name).get_public_url(storage_path)

        # Assuming get_public_url returns the string URL directly (common in newer versions)
        public_url = public_url_data

        if not public_url:
             logger.error(f"Upload succeeded but failed to get public URL for path: {storage_path}")
             # Depending on requirements, you might still return the path or raise an error.
             # Raising an error ensures the frontend knows the URL isn't available.
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="File uploaded but could not retrieve public URL.")

        logger.info(f"Public URL generated: {public_url}")
        return public_url

    except ValueError as ve:
         # Configuration errors (missing settings, client init failure)
         logger.error(f"Configuration error during upload handle: {ve}")
         # Raising as 500 Internal Server Error as it's a backend config issue
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(ve))
    except HTTPException as http_exc:
         # Re-raise HTTPExceptions coming from nested calls or validation
         raise http_exc
    except Exception as e:
        # Catch unexpected errors during the process (file read, upload, URL generation)
        logger.exception(f"Unexpected error handling file upload for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred processing the file: {str(e)}"
        ) 