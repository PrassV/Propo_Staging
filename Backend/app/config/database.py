from supabase import create_client
from .settings import settings
import logging

logger = logging.getLogger(__name__)

try:
    # Initialize Supabase client
    supabase_client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_KEY
    )
    logger.info("Successfully initialized Supabase client")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {str(e)}")
    raise 