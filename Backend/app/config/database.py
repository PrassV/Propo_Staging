# Use standard imports (v2 client should handle async)
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

# --- Globally Initialized Client ---
try:
    validate_supabase_config()
    # Use standard client creation
    supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    logger.info("Successfully initialized GLOBAL Supabase client (v2)")
    
    # Service role client for admin operations (bypasses RLS)
    if settings.SUPABASE_SERVICE_ROLE_KEY:
        supabase_service_role_client: Client = create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        logger.info("Successfully initialized SERVICE ROLE Supabase client (bypasses RLS)")
    else:
        logger.warning("SUPABASE_SERVICE_ROLE_KEY not set - using regular client as fallback")
        supabase_service_role_client = supabase_client
        
except ValueError as ve:
    logger.critical(f"Configuration error: {str(ve)}")
    raise
except Exception as e:
    logger.critical(f"Failed to initialize GLOBAL Supabase client (v2): {str(e)}")
    logger.debug(f"Current environment: SUPABASE_URL={'SUPABASE_URL' in os.environ}, SUPABASE_KEY={'SUPABASE_KEY' in os.environ}")
    raise 

# --- Dependency for Request-Scoped Authenticated Client --- #
security_scheme = HTTPBearer()

async def get_supabase_client_authenticated(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> Client: # Use standard Client type hint
    """
    FastAPI dependency that provides a Supabase client instance configured
    with the user's JWT token in the headers for RLS. (Using v2 async capability)
    """
    try:
        token = credentials.credentials

        # Create a standard client instance (v2 handles async)
        request_client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY # Use the anon key for base client creation
        )

        # Set the Authorization header
        request_client.postgrest.auth(token) # Pass the token directly

        return request_client # Return the configured client

    except Exception as e:
        logger.error(f"Failed to create authenticated Supabase client (v2): {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not configure authenticated database client: {str(e)}"
        ) 