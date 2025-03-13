#!/bin/bash

# Script to update CORS settings on Railway deployment
# This should be run after deploying to Railway

echo "Updating CORS settings for Railway deployment..."

# Export allowed domains to Railway
railway variables set FRONTEND_URL=https://propo-staging.vercel.app ENVIRONMENT=production

echo "CORS settings updated on Railway deployment."
echo "Please redeploy the backend for changes to take effect."
echo "You can redeploy with: railway up" 