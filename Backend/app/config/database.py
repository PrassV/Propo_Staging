from supabase import create_client, Client
from .settings import settings
import logging
import os

logger = logging.getLogger(__name__)

def validate_supabase_config():
    """Validate Supabase configuration before client initialization"""
    if not settings.SUPABASE_URL:
        raise ValueError("SUPABASE_URL environment variable is not set")
    if not settings.SUPABASE_KEY:
        raise ValueError("SUPABASE_KEY environment variable is not set")
    logger.info(f"Supabase URL configured: {settings.SUPABASE_URL}")
    return True

try:
    # Validate configuration
    validate_supabase_config()
    
    # Initialize Supabase client with minimal configuration
    supabase_client = create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_KEY,
        options={
            'auto_refresh_token': True,
            'persist_session': False
        }
    )
    logger.info("Successfully initialized Supabase client")
except ValueError as ve:
    logger.critical(f"Configuration error: {str(ve)}")
    raise
except Exception as e:
    logger.critical(f"Failed to initialize Supabase client: {str(e)}")
    logger.debug(f"Current environment: SUPABASE_URL={'SUPABASE_URL' in os.environ}, SUPABASE_KEY={'SUPABASE_KEY' in os.environ}")
    raise 