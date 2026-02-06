#!/bin/bash

# Test script for send-batch-email Edge Function
# Usage: ./test-email.sh [local|prod]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-local}

if [ "$ENVIRONMENT" = "local" ]; then
    FUNCTION_URL="http://localhost:54321/functions/v1/send-batch-email"
    # Use your local anon key from `supabase start` output
    ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
else
    echo -e "${YELLOW}Enter your Supabase project reference:${NC}"
    read PROJECT_REF
    FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/send-batch-email"

    echo -e "${YELLOW}Enter your Supabase anon key:${NC}"
    read ANON_KEY
fi

echo -e "${GREEN}Testing send-batch-email function in ${ENVIRONMENT} environment...${NC}\n"

# Test 1: Valid request
echo -e "${YELLOW}Test 1: Valid request with multiple members${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST "$FUNCTION_URL" \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "agent_email": "test@example.com",
    "reply_to": "support@carynops.com",
    "agency_name": "ABC Collections",
    "subject": "Test Email - Delinquent Members",
    "member_list": [
      {
        "name": "John Doe",
        "amount_due": 1250.50,
        "days_late": 45,
        "member_id": "M12345"
      },
      {
        "name": "Jane Smith",
        "amount_due": 3500.00,
        "days_late": 67,
        "member_id": "M12346"
      }
    ]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Test 1 passed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Test 1 failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
fi

echo -e "\n---\n"

# Test 2: Missing required field
echo -e "${YELLOW}Test 2: Missing required field (agent_email)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST "$FUNCTION_URL" \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "reply_to": "support@carynops.com",
    "member_list": [
      {
        "name": "John Doe",
        "amount_due": 1250.50
      }
    ]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Test 2 passed (HTTP $HTTP_CODE - Expected error)${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Test 2 failed (HTTP $HTTP_CODE - Expected 400)${NC}"
    echo "Response: $BODY"
fi

echo -e "\n---\n"

# Test 3: Invalid email format
echo -e "${YELLOW}Test 3: Invalid email format${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST "$FUNCTION_URL" \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "agent_email": "invalid-email",
    "reply_to": "support@carynops.com",
    "member_list": [
      {
        "name": "John Doe",
        "amount_due": 1250.50
      }
    ]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Test 3 passed (HTTP $HTTP_CODE - Expected error)${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Test 3 failed (HTTP $HTTP_CODE - Expected 400)${NC}"
    echo "Response: $BODY"
fi

echo -e "\n---\n"

# Test 4: Empty member list
echo -e "${YELLOW}Test 4: Empty member list${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST "$FUNCTION_URL" \
  --header "Authorization: Bearer $ANON_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "agent_email": "test@example.com",
    "reply_to": "support@carynops.com",
    "member_list": []
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Test 4 passed (HTTP $HTTP_CODE - Expected error)${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Test 4 failed (HTTP $HTTP_CODE - Expected 400)${NC}"
    echo "Response: $BODY"
fi

echo -e "\n---\n"

# Test 5: Test from file
if [ -f "supabase/functions/send-batch-email/test-payload.json" ]; then
    echo -e "${YELLOW}Test 5: Using test-payload.json${NC}"
    RESPONSE=$(curl -s -w "\n%{http_code}" --location --request POST "$FUNCTION_URL" \
      --header "Authorization: Bearer $ANON_KEY" \
      --header 'Content-Type: application/json' \
      --data @supabase/functions/send-batch-email/test-payload.json)

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Test 5 passed (HTTP $HTTP_CODE)${NC}"
        echo "Response: $BODY"
    else
        echo -e "${RED}✗ Test 5 failed (HTTP $HTTP_CODE)${NC}"
        echo "Response: $BODY"
    fi
fi

echo -e "\n${GREEN}Testing complete!${NC}"
