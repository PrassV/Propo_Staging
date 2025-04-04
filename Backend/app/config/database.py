from supabase.aio import create_client as create_async_client, Client as AsyncClient
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

# --- Globally Initialized Async Client ---
try:
    validate_supabase_config()
    # Use async client creation
    supabase_client: AsyncClient = create_async_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    logger.info("Successfully initialized GLOBAL ASYNC Supabase client")
except ValueError as ve:
    logger.critical(f"Configuration error: {str(ve)}")
    raise
except Exception as e:
    logger.critical(f"Failed to initialize GLOBAL ASYNC Supabase client: {str(e)}")
    logger.debug(f"Current environment: SUPABASE_URL={'SUPABASE_URL' in os.environ}, SUPABASE_KEY={'SUPABASE_KEY' in os.environ}")
    raise 

# --- Dependency for Request-Scoped Authenticated Async Client --- #
security_scheme = HTTPBearer()

async def get_supabase_client_authenticated(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> AsyncClient: # Use AsyncClient type hint
    """
    FastAPI dependency that provides an ASYNC Supabase client instance configured
    with the user's JWT token in the headers for RLS.
    """
    try:
        token = credentials.credentials

        # Create an async client instance for this request scope
        request_client: AsyncClient = create_async_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY # Use the anon key for base client creation
        )

        # Set the Authorization header on the client instance
        request_client.postgrest.auth(token) # Pass the token directly

        return request_client # Return the configured async client

    except Exception as e:
        logger.error(f"Failed to create authenticated ASYNC Supabase client: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not configure authenticated database client: {str(e)}"
        ) 