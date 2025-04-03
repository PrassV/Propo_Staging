from supabase import create_client, Client
from .settings import settings
import logging
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

def validate_supabase_config():
    """Validate Supabase configuration before client initialization"""
    if not settings.SUPABASE_URL:
        raise ValueError("SUPABASE_URL environment variable is not set")
    if not settings.SUPABASE_KEY:
        raise ValueError("SUPABASE_KEY environment variable is not set")
    logger.info(f"Supabase URL configured: {settings.SUPABASE_URL}")
    return True

# --- Globally Initialized Client (KEEP for non-authenticated or specific use cases if any) ---
# Note: RLS-dependent operations should generally use the request-scoped client below.
try:
    # Validate configuration
    validate_supabase_config()
    
    # Initialize Supabase client
    supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    logger.info("Successfully initialized GLOBAL Supabase client")
except ValueError as ve:
    logger.critical(f"Configuration error: {str(ve)}")
    raise
except Exception as e:
    logger.critical(f"Failed to initialize GLOBAL Supabase client: {str(e)}")
    logger.debug(f"Current environment: SUPABASE_URL={'SUPABASE_URL' in os.environ}, SUPABASE_KEY={'SUPABASE_KEY' in os.environ}")
    raise 

# --- Dependency for Request-Scoped Authenticated Client --- #
security_scheme = HTTPBearer()

async def get_supabase_client_authenticated(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> Client:
    """
    FastAPI dependency that provides a Supabase client instance configured
    with the user's JWT token in the headers for RLS.
    """
    try:
        token = credentials.credentials

        # Create a standard client instance for this request scope
        # We use create_client, same as the global one
        request_client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY # Use the anon key for base client creation
        )

        # IMPORTANT: Set the Authorization header on the client instance for the CURRENT request.
        # This automatically applies the header to subsequent PostgREST calls made with this client instance.
        # request_client.auth.session = lambda: {'access_token': token, 'token_type': 'bearer'} # REMOVED: This might conflict or be unnecessary
        # Alternative/preferred way for newer versions might be directly setting headers on postgrest:
        request_client.postgrest.auth(token) # Pass the token directly

        # You might not need to yield if you return the client directly
        # yield request_client
        return request_client # Return the configured client

    except Exception as e:
        logger.error(f"Failed to create authenticated Supabase client: {str(e)}", exc_info=True)
        # Keep the original specific error detail for diagnosis
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not configure authenticated database client: {str(e)}" # Add original error detail
        ) 