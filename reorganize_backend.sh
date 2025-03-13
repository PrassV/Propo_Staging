#!/bin/bash

# Create any directories that might not have been created yet
mkdir -p backend/services/analytics
mkdir -p backend/services/maintenance
mkdir -p backend/services/payments
mkdir -p backend/services/invitations
mkdir -p backend/services/estimation
mkdir -p backend/config

# Create __init__.py files for each service
touch backend/services/analytics/__init__.py
touch backend/services/maintenance/__init__.py
touch backend/services/payments/__init__.py
touch backend/services/invitations/__init__.py
touch backend/services/estimation/__init__.py
touch backend/services/__init__.py
touch backend/config/__init__.py

# Move router files from agreement-service to the new structure
cp agreement-service/routers/analytics.py backend/services/analytics/router.py
cp agreement-service/routers/maintenance.py backend/services/maintenance/router.py
cp agreement-service/routers/payments.py backend/services/payments/router.py
cp agreement-service/routers/invitations.py backend/services/invitations/router.py
cp agreement-service/routers/estimation.py backend/services/estimation/router.py

# Create a config file for environment configuration
cat > backend/config/settings.py << 'EOF'
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
EOF

# Output completion message
echo "Backend reorganization completed! New structure is now in place."
echo "Please review the files and make any necessary adjustments to imports."
echo "You'll need to update import paths in the router files to use the new structure." 