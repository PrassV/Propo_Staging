#!/bin/bash
# Fix, deploy, and test CORS issues in one script

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="https://propostaging-production.up.railway.app"
FRONTEND_URL="https://propo-staging.vercel.app"

# Print section header
section() {
  echo -e "\n${BLUE}======================================================${NC}"
  echo -e "${GREEN}$1${NC}"
  echo -e "${BLUE}======================================================${NC}"
}

# Check if a command exists
command_exists() {
  command -v "$1" &> /dev/null
}

section "CORS Fix Deployment Script"

# Install required dependencies
section "Checking dependencies"

# Check if pip is installed
if ! command_exists pip; then
  echo -e "${RED}pip is not installed. Please install Python and pip.${NC}"
  exit 1
fi

# Check if requests module is installed for our test scripts
echo -e "${YELLOW}Installing required Python packages...${NC}"
pip install requests

# Check if Railway CLI is installed
if ! command_exists railway; then
  echo -e "${YELLOW}Railway CLI not found. Installing...${NC}"
  npm install -g @railway/cli
fi

# Ensure Railway CLI is logged in
section "Checking Railway login"
railway whoami || (echo -e "${YELLOW}Please login to Railway:${NC}" && railway login)

# Deploy the backend
section "Deploying backend to Railway"
cd backend || (echo -e "${RED}Backend directory not found. Make sure you're in the project root.${NC}" && exit 1)
echo -e "${YELLOW}Starting deployment...${NC}"
railway up

# Return to project root
cd ..

section "Testing CORS configuration"

# Wait for deployment to complete
echo -e "${YELLOW}Waiting for deployment to take effect (30 seconds)...${NC}"
sleep 30

# Test CORS headers with our script
echo -e "${YELLOW}Testing CORS headers on API...${NC}"
./scripts/check_cors_headers.py "${API_URL}/cors-test" --origin "${FRONTEND_URL}"

# Test properties endpoint
echo -e "\n${YELLOW}Testing CORS headers on properties endpoint...${NC}"
./scripts/check_cors_headers.py "${API_URL}/properties/user/ee13ce27-680d-429a-a0cb-ea273b034a61" --origin "${FRONTEND_URL}"

# Test maintenance endpoint
echo -e "\n${YELLOW}Testing CORS headers on maintenance endpoint...${NC}"
./scripts/check_cors_headers.py "${API_URL}/maintenance/requests" --origin "${FRONTEND_URL}"

section "Script complete"
echo -e "${GREEN}CORS fix deployed and tested.${NC}"
echo -e "${YELLOW}If tests show errors, you may need to check the Railway logs for more details.${NC}"
echo -e "${YELLOW}You can open the Railway dashboard with: railway open${NC}" 