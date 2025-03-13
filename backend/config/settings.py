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
AGREEMENT_SERVICE_URL = os.getenv("AGREEMENT_SERVICE_URL", "http://localhost:8000")

# External API keys
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Database settings
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = ENVIRONMENT == "development"

# CORS settings
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://propify.netlify.app",
]

if DEBUG:
    CORS_ORIGINS.append("*")
