#!/bin/bash

# Colors for terminal output
GREEN="\033[92m"
RED="\033[91m"
YELLOW="\033[93m"
BLUE="\033[94m"
RESET="\033[0m"

echo -e "${BLUE}=================================${RESET}"
echo -e "${BLUE}      API ENDPOINT TESTER       ${RESET}"
echo -e "${BLUE}=================================${RESET}"

# Check if the backend server is running
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${RED}Backend server is not running. Please start it first.${RESET}"
    echo -e "${YELLOW}Run: cd Backend && python -m app.main${RESET}"
    exit 1
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo -e "${YELLOW}Activating virtual environment...${RESET}"
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo -e "${YELLOW}Activating virtual environment...${RESET}"
    source .venv/bin/activate
fi

# Install required packages if needed
echo -e "${YELLOW}Checking dependencies...${RESET}"
pip install requests > /dev/null

# Run the test script
echo -e "${GREEN}Running API endpoint tests...${RESET}"
python test_api_endpoints.py

# Save the exit code
RESULT=$?

# Deactivate virtual environment if we activated one
if [[ -n "$VIRTUAL_ENV" ]]; then
    deactivate
fi

# Return the same exit code as the Python script
exit $RESULT 