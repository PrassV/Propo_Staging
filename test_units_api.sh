#!/bin/bash

# Extract token from token.txt
TOKEN=$(grep -o '".*"' token.txt | sed 's/"//g')

# Base URL for the API
BASE_URL="http://localhost:8000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Units API Tests${NC}"
echo "=================================================="

# Test Case 1.1: List All Units
echo -e "\n${YELLOW}Test Case 1.1: List All Units${NC}"
echo "GET $BASE_URL/units"
response=$(curl -s -X GET "$BASE_URL/units" -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 1.2: Filter Units by Property ID
echo -e "\n${YELLOW}Test Case 1.2: Filter Units by Property ID${NC}"
echo "GET $BASE_URL/units?property_id=97a15f34-4b86-4dfb-b0bf-79d16006dc13"
response=$(curl -s -X GET "$BASE_URL/units?property_id=97a15f34-4b86-4dfb-b0bf-79d16006dc13" -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 1.3: Filter Units by Status
echo -e "\n${YELLOW}Test Case 1.3: Filter Units by Status${NC}"
echo "GET $BASE_URL/units?status=Vacant"
response=$(curl -s -X GET "$BASE_URL/units?status=Vacant" -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 1.4: Pagination Test
echo -e "\n${YELLOW}Test Case 1.4: Pagination Test${NC}"
echo "GET $BASE_URL/units?skip=1&limit=2"
response=$(curl -s -X GET "$BASE_URL/units?skip=1&limit=2" -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 2.1: Get Existing Unit
echo -e "\n${YELLOW}Test Case 2.1: Get Existing Unit${NC}"
echo "GET $BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90"
response=$(curl -s -X GET "$BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90" -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 2.2: Get Non-existent Unit
echo -e "\n${YELLOW}Test Case 2.2: Get Non-existent Unit${NC}"
echo "GET $BASE_URL/units/00000000-0000-0000-0000-000000000000"
response=$(curl -s -X GET "$BASE_URL/units/00000000-0000-0000-0000-000000000000" -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 3.1: Create Valid Unit
echo -e "\n${YELLOW}Test Case 3.1: Create Valid Unit${NC}"
echo "POST $BASE_URL/units"
response=$(curl -s -X POST "$BASE_URL/units" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "97a15f34-4b86-4dfb-b0bf-79d16006dc13",
    "unit_number": "407",
    "status": "Vacant",
    "bedrooms": 2,
    "bathrooms": 2,
    "area_sqft": 1200,
    "rent": 5000,
    "deposit": 50000
  }')
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Store the created unit ID for later use
CREATED_UNIT_ID=$(echo "$response" | python -c "import sys, json; print(json.load(sys.stdin).get('id', ''))")

# Test Case 3.2: Create Unit with Duplicate Number
echo -e "\n${YELLOW}Test Case 3.2: Create Unit with Duplicate Number${NC}"
echo "POST $BASE_URL/units"
response=$(curl -s -X POST "$BASE_URL/units" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "97a15f34-4b86-4dfb-b0bf-79d16006dc13",
    "unit_number": "403",
    "status": "Vacant",
    "bedrooms": 1,
    "bathrooms": 1,
    "area_sqft": 800,
    "rent": 3000,
    "deposit": 30000
  }')
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 3.3: Create Unit with Invalid Property ID
echo -e "\n${YELLOW}Test Case 3.3: Create Unit with Invalid Property ID${NC}"
echo "POST $BASE_URL/units"
response=$(curl -s -X POST "$BASE_URL/units" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": "00000000-0000-0000-0000-000000000000",
    "unit_number": "101",
    "status": "Vacant",
    "bedrooms": 1,
    "bathrooms": 1,
    "area_sqft": 800,
    "rent": 3000,
    "deposit": 30000
  }')
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 4.1: Update Existing Unit
echo -e "\n${YELLOW}Test Case 4.1: Update Existing Unit${NC}"
echo "PUT $BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90"
response=$(curl -s -X PUT "$BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Occupied",
    "rent": 5500
  }')
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 4.2: Update Non-existent Unit
echo -e "\n${YELLOW}Test Case 4.2: Update Non-existent Unit${NC}"
echo "PUT $BASE_URL/units/00000000-0000-0000-0000-000000000000"
response=$(curl -s -X PUT "$BASE_URL/units/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Occupied"
  }')
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 5.1: Delete Existing Unit (using the unit we created in Test Case 3.1)
if [ -n "$CREATED_UNIT_ID" ]; then
  echo -e "\n${YELLOW}Test Case 5.1: Delete Existing Unit${NC}"
  echo "DELETE $BASE_URL/units/$CREATED_UNIT_ID"
  response=$(curl -s -X DELETE "$BASE_URL/units/$CREATED_UNIT_ID" -H "Authorization: Bearer $TOKEN" -w "\nStatus: %{http_code}")
  echo -e "${GREEN}Response:${NC}"
  echo "$response"
else
  echo -e "\n${RED}Skipping Test Case 5.1: No unit was created in Test Case 3.1${NC}"
fi

# Test Case 5.2: Delete Non-existent Unit
echo -e "\n${YELLOW}Test Case 5.2: Delete Non-existent Unit${NC}"
echo "DELETE $BASE_URL/units/00000000-0000-0000-0000-000000000000"
response=$(curl -s -X DELETE "$BASE_URL/units/00000000-0000-0000-0000-000000000000" -H "Authorization: Bearer $TOKEN" -w "\nStatus: %{http_code}")
echo -e "${GREEN}Response:${NC}"
echo "$response"

# Test Case 6.1: List Maintenance Requests for Unit
echo -e "\n${YELLOW}Test Case 6.1: List Maintenance Requests for Unit${NC}"
echo "GET $BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/maintenance_requests"
response=$(curl -s -X GET "$BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/maintenance_requests" -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 7.1: Create Maintenance Request
echo -e "\n${YELLOW}Test Case 7.1: Create Maintenance Request${NC}"
echo "POST $BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/maintenance_requests"
response=$(curl -s -X POST "$BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/maintenance_requests" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Leaking Faucet",
    "description": "The bathroom faucet is leaking continuously",
    "priority": "normal",
    "category": "plumbing"
  }')
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 8.1: List Tenants for Unit
echo -e "\n${YELLOW}Test Case 8.1: List Tenants for Unit${NC}"
echo "GET $BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/tenants"
response=$(curl -s -X GET "$BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/tenants" -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 10.1: List Payments for Unit
echo -e "\n${YELLOW}Test Case 10.1: List Payments for Unit${NC}"
echo "GET $BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/payments"
response=$(curl -s -X GET "$BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/payments" -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 11.1: List Amenities for Unit
echo -e "\n${YELLOW}Test Case 11.1: List Amenities for Unit${NC}"
echo "GET $BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/amenities"
response=$(curl -s -X GET "$BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/amenities" -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 12.1: Add Amenity to Unit
echo -e "\n${YELLOW}Test Case 12.1: Add Amenity to Unit${NC}"
echo "POST $BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/amenities"
response=$(curl -s -X POST "$BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/amenities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Air Conditioner",
    "description": "Split AC in living room",
    "status": "working"
  }')
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 13.1: List Taxes for Unit
echo -e "\n${YELLOW}Test Case 13.1: List Taxes for Unit${NC}"
echo "GET $BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/taxes"
response=$(curl -s -X GET "$BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/taxes" -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 14.1: Add Tax Record to Unit
echo -e "\n${YELLOW}Test Case 14.1: Add Tax Record to Unit${NC}"
echo "POST $BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/taxes"
response=$(curl -s -X POST "$BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/taxes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tax_type": "property",
    "amount": 5000,
    "due_date": "2025-06-30",
    "status": "pending"
  }')
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

# Test Case 15.1: Get Unit History
echo -e "\n${YELLOW}Test Case 15.1: Get Unit History${NC}"
echo "GET $BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/history"
response=$(curl -s -X GET "$BASE_URL/units/77b214b6-3902-436b-ace0-5c860cdd3a90/history" -H "Authorization: Bearer $TOKEN")
echo -e "${GREEN}Response:${NC}"
echo "$response" | python -m json.tool

echo -e "\n${YELLOW}All tests completed!${NC}"
