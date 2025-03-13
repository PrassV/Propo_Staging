import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Settings
API_VERSION = "1.0.0"
API_TITLE = "Propify API"
API_DESCRIPTION = "Backend API for Propify property management platform"

# Authentication settings
AUTH_SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "dev_secret_key_change_in_production")
AUTH_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Service URLs
API_URL = os.getenv("API_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# External API keys
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Database settings
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = ENVIRONMENT.lower() == "development"

# CORS configuration
CORS_ORIGINS_STR = os.getenv("CORS_ORIGINS", "*")
# Convert to list, handle comma-separated values
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_STR.split(",") if origin.strip()]
# If empty, add a wildcard
if not CORS_ORIGINS:
    CORS_ORIGINS = ["*"]
    
# Log CORS configuration for debugging
print(f"CORS_ORIGINS configured as: {CORS_ORIGINS}")
