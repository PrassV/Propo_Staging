import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import logging

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Property Management API"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite default
        "http://127.0.0.1:5173",  # Also include 127.0.0.1 version
        "https://localhost:3000",
        "https://localhost:5173",
        "https://propo-staging.vercel.app",  # Production frontend URL
        "https://propostaging-production.up.railway.app",  # Railway deployed backend
    ]
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "")
    
    # Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 7))
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Specific Storage Buckets (read from env vars, provide defaults if sensible)
    PROPERTY_IMAGE_BUCKET: str = os.getenv("PROPERTY_IMAGE_BUCKET", "Property Images")
    TENANT_DOCUMENT_BUCKET: str = os.getenv("TENANT_DOCUMENT_BUCKET", "Tenant Documents")
    ID_DOCUMENT_BUCKET: str = os.getenv("ID_DOCUMENT_BUCKET", "ID Documents")
    MAINTENANCE_FILES_BUCKET: str = os.getenv("MAINTENANCE_FILES_BUCKET", "Maintenance Files")
    AGREEMENTS_BUCKET: str = os.getenv("AGREEMENTS_BUCKET", "agreements")
    GENERAL_UPLOAD_BUCKET: str = os.getenv("GENERAL_UPLOAD_BUCKET", "general-uploads") # A default bucket
    SUPABASE_BUCKET_NAME: str = "propertyimage"
    # Add others as needed based on your Supabase setup

    model_config = {
        "env_file": ".env", 
        "env_file_encoding": "utf-8", 
        "case_sensitive": True,
        "extra": "ignore"  # Allow extra environment variables
    }

# Create settings instance
settings = Settings()

# Validate that critical settings are set
def validate_settings():
    if not settings.SUPABASE_URL:
        raise ValueError("SUPABASE_URL environment variable is not set")
    if not settings.SUPABASE_KEY:
        raise ValueError("SUPABASE_KEY environment variable is not set")
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning("SUPABASE_SERVICE_ROLE_KEY environment variable is not set. RLS bypass tests will fail.")
    
    return True 