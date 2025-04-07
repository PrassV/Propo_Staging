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
    Selects the bucket based on the provided context.
    Constructs a path based on context, user_id, related_id, and a unique filename.
    Returns the public URL of the uploaded file.
    """
    try:
        storage_client = get_supabase_service_client()

        # Select bucket based on context
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
        # Add more elif blocks for other contexts as needed
        else:
            # Default to a general bucket if context is unknown or missing
            bucket_name = settings.GENERAL_UPLOAD_BUCKET 
            logger.warning(f"Upload context '{context}' not recognized or missing. Using default bucket: {bucket_name}")
            # Use 'general' for path if context was None
            context = context or "general" 

        if not bucket_name:
            logger.error(f"Storage bucket name is not configured for context '{context}' or default.")
            raise ValueError("Storage bucket name not configured correctly.")

        # Generate a unique filename to prevent overwrites and sanitize input
        # Using UUID + original extension is safer than using original filename directly
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())

        # Construct path within the bucket (e.g., context/user_id/related_id/unique_filename.ext)
        # Reverted: Context is needed in the path for signed URLs
        path_parts = [context, str(user_id)] 
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

        # Get a signed URL for the uploaded file (valid for a default duration, e.g., 1 hour)
        # Adjust expiration time (in seconds) as needed. Longer times may have security implications.
        # Example: 60 * 60 * 24 * 7 for one week validity
        expires_in = 3600 # Default: 1 hour
        signed_url_response = storage_client.storage.from_(bucket_name).create_signed_url(
            path=storage_path, 
            expires_in=expires_in
        )

        # Assuming create_signed_url returns a dict like {'signedURL': '...'}
        # Check the actual response structure from supabase-py documentation/testing
        signed_url = signed_url_response.get('signedURL')

        if not signed_url:
             logger.error(f"Upload succeeded but failed to get signed URL for path: {storage_path}. Response: {signed_url_response}")
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="File uploaded but could not retrieve access URL.")

        logger.info(f"Signed URL generated (valid for {expires_in}s): {signed_url}")
        return signed_url # Return the signed URL

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