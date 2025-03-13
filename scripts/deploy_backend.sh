#!/bin/bash
# Deploy backend to Railway

# Set colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}Deploying Propify Backend to Railway${NC}"
echo -e "${BLUE}===============================================${NC}"

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
fi

# Ensure we're logged in to Railway
echo -e "${BLUE}Checking Railway login status...${NC}"
railway whoami || (echo -e "${YELLOW}Please log in to Railway:${NC}" && railway login)

# Show current Railway project
echo -e "${BLUE}Current Railway project:${NC}"
railway project

# Change to backend directory
cd backend || (echo -e "${YELLOW}Backend directory not found. Make sure you're in the project root.${NC}" && exit 1)

# Deploy to Railway
echo -e "${BLUE}Deploying backend to Railway...${NC}"
railway up

# Return to the original directory
cd ..

echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}Deployment completed!${NC}"
echo -e "${YELLOW}Note: It may take a few minutes for changes to take effect.${NC}"
echo -e "${BLUE}===============================================${NC}"

# Open the Railway dashboard
echo -e "${BLUE}Opening Railway dashboard in browser...${NC}"
railway open 