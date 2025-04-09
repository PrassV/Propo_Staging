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
) -> List[str]: # Return a list of PATHS now
    """
    Handles upload of multiple files to Supabase Storage using the service role key.
    Selects the bucket based on the provided context.
    Constructs a path for each file based on context, user_id, related_id, and a unique filename.
    Returns a list of permanent storage paths for the uploaded files. 
    """
    file_paths = [] # Changed variable name
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

        # Expiration time no longer needed here
        # expires_in = 3600 # 1 hour

        for file in files:
            # Generate a unique filename for each file
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
            unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())

            # Construct path RELATIVE to the bucket (user_id/filename)
            # Context is used only for bucket selection, not path prefix
            path_parts = [str(user_id)] 
            if related_id: # Keep related_id if needed for organization within user folder
                path_parts.append(str(related_id))
            path_parts.append(unique_filename)
            storage_path = "/".join(path_parts) # Path is now e.g., "USER_ID/FILENAME.jpg"

            logger.info(f"Attempting to upload file '{file.filename}' to: Bucket='{bucket_name}', Relative Path='{storage_path}'")

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
            # TODO: Add better error checking for upload_response if needed
            logger.info(f"File '{file.filename}' uploaded to path: {storage_path}")

            # --- Start: Update owner_id ---
            try:
                # Fetch the object ID first using the path (more reliable than assuming upload_response structure)
                # Note: This uses the service client which bypasses RLS select policies
                logger.info(f"[OwnerUpdate] Selecting object ID for bucket={bucket_name}, path={storage_path}")
                object_select_response = storage_client.table('objects', schema="storage").select('id').eq('bucket_id', bucket_name).eq('name', storage_path).single().execute()
                logger.info(f"[OwnerUpdate] Select response: {object_select_response}") # Log raw select response
                
                if hasattr(object_select_response, 'data') and object_select_response.data and 'id' in object_select_response.data:
                    object_id = object_select_response.data['id']
                    logger.info(f"[OwnerUpdate] Found object ID {object_id} for path {storage_path}. Attempting to update owner_id to {user_id}.")
                    
                    # Update the owner_id using the service client
                    update_response = storage_client.table('objects', schema="storage")\
                        .update({'owner_id': str(user_id)})\
                        .eq('id', object_id)\
                        .execute()
                    logger.info(f"[OwnerUpdate] Update response: {update_response}") # Log raw update response
                        
                    if hasattr(update_response, 'error') and update_response.error:
                         logger.error(f"[OwnerUpdate] Failed to update owner_id for object {object_id} (path: {storage_path}): {update_response.error.message}")
                         # Decide if this should be a fatal error for the upload? For now, just log it.
                    elif hasattr(update_response, 'data') and update_response.data: # Check if data exists on success
                         logger.info(f"[OwnerUpdate] Successfully updated owner_id for object {object_id} (path: {storage_path}) to {user_id}. Response data: {update_response.data}")
                    else:
                         logger.warning(f"[OwnerUpdate] Update owner_id for object {object_id} completed but response had no error or data.")
                elif hasattr(object_select_response, 'error') and object_select_response.error:
                    logger.error(f"[OwnerUpdate] Error selecting object ID for path {storage_path}: {object_select_response.error.message}")
                else:
                    logger.error(f"[OwnerUpdate] Could not find object ID for path {storage_path} after upload (data missing or malformed). Cannot update owner_id.")
                    # This might indicate an issue with the upload itself or timing
            except Exception as owner_update_err:
                 logger.exception(f"[OwnerUpdate] Exception occurred while trying to update owner_id for path {storage_path}: {owner_update_err}")
                 # Decide if this should be a fatal error for the upload? For now, just log it.
            # --- End: Update owner_id ---

            # Append the storage path instead of the signed URL
            file_paths.append(storage_path)
            logger.info(f"Stored path for '{file.filename}': {storage_path}")


        # Return the list of successfully generated storage paths
        if not file_paths and len(files) > 0:
             # Check if we attempted uploads but got no paths back (shouldn't happen if upload worked)
             logger.error("File upload process completed, but no storage paths were generated/collected.")
             # Raise error if no paths were generated despite having files
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="File upload succeeded but failed to retrieve storage paths.")
             
        return file_paths # Return paths

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