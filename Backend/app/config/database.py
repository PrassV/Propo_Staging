from supabase import create_client, Client, AsyncClient
from .settings import settings
import logging
import os
import httpx # Import httpx
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
) -> AsyncClient:
    """
    FastAPI dependency that provides an ASYNCHRONOUS Supabase client instance 
    configured with authorization headers for the user's JWT token.
    Ensures RLS policies based on auth.uid() work correctly in async contexts.
    """
    try:
        token = credentials.credentials
        
        # Create an EXPLICIT AsyncClient with the ANON key
        request_client: AsyncClient = AsyncClient(
            settings.SUPABASE_URL,
            settings.SUPABASE_KEY  # Use the anon key
        )
        
        # Set the Authorization header on the postgrest client's session
        # This is the session that makes the actual database calls
        # Access async session via request_client.postgrest.session
        request_client.postgrest.session.headers.update({
            "Authorization": f"Bearer {token}"
        })
        
        # Also set it on any other client components that might be used (async way)
        if hasattr(request_client, 'functions') and hasattr(request_client.functions, 'session'):
            request_client.functions.session.headers.update({
                "Authorization": f"Bearer {token}"
            })
        
        logger.debug("Created request-scoped ASYNC Supabase client with Authorization headers on postgrest session")
        yield request_client
        
    except Exception as e:
        logger.error(f"Failed to create authenticated ASYNC Supabase client: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create authenticated database client."
        ) 