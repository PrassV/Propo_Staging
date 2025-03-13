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
DEBUG = ENVIRONMENT == "development"

# CORS settings
DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

# Add FRONTEND_URL to CORS_ORIGINS if it's set
CORS_ORIGINS = DEFAULT_CORS_ORIGINS.copy()
if FRONTEND_URL and FRONTEND_URL not in CORS_ORIGINS:
    CORS_ORIGINS.append(FRONTEND_URL)

# In development mode, allow all origins
if DEBUG:
    CORS_ORIGINS.append("*")
