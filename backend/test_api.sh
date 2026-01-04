#!/bin/bash

# A script to test the MeetingRecord API endpoints.
#
# Prerequisites:
# 1. The backend server must be running (e.g., with `npm run dev`).
# 2. The database must be migrated and seeded (`npx prisma migrate dev --name init && npx prisma db seed`).
# 3. `jq` should be installed to parse JSON responses (`sudo apt-get install jq` or `brew install jq`).
#
# Before running, replace the placeholder IDs with actual IDs from your database.
# You can get the IDs by running `npx prisma studio` and inspecting the User and Schedule tables.

# --- Configuration ---
API_BASE_URL="http://localhost:3000/api"

# !!! IMPORTANT !!!
# Replace these placeholder IDs with actual IDs from your database.
SCHEDULE_ID="<REPLACE_WITH_ACTUAL_SCHEDULE_ID>"
USER_ID="<REPLACE_WITH_ACTUAL_USER_ID>"


# --- Helper Functions ---
function print_header {
    echo ""
    echo "=========================================================="
    echo "$1"
    echo "=========================================================="
}

# --- Tests ---

# 1. GET all meeting records
print_header "1. GET /meeting-records"
curl -X GET "$API_BASE_URL/meeting-records"
echo ""

# 2. POST a new meeting record
print_header "2. POST /meeting-records"
CREATE_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{
        "scheduleId": "'$SCHEDULE_ID'",
        "title": "API Test Meeting",
        "meetingDate": "2026-02-01T00:00:00.000Z",
        "createdBy": "'$USER_ID'",
        "location": "Test Location",
        "leader": "Test Leader"
    }' \
    "$API_BASE_URL/meeting-records")

echo $CREATE_RESPONSE
RECORD_ID=$(echo $CREATE_RESPONSE | jq -r '.id')
echo "Created record with ID: $RECORD_ID"


if [ -z "$RECORD_ID" ] || [ "$RECORD_ID" == "null" ]; then
    echo "Error: Could not create a new record. Aborting further tests."
    exit 1
fi

# 3. GET the created meeting record by ID
print_header "3. GET /meeting-records/:id"
curl -X GET "$API_BASE_URL/meeting-records/$RECORD_ID"
echo ""

# 4. PUT (update) the created meeting record
print_header "4. PUT /meeting-records/:id"
curl -X PUT -H "Content-Type: application/json" \
    -d '{"status": "completed", "notes": "This record was updated by the test script."}' \
    "$API_BASE_URL/meeting-records/$RECORD_ID"
echo ""

# 5. POST (upload) an audio file
print_header "5. POST /meeting-records/:id/upload-audio"
# Create a dummy audio file for testing
echo "dummy audio data" > dummy_audio.mp3
curl -X POST -F "audioFile=@dummy_audio.mp3" "$API_BASE_URL/meeting-records/$RECORD_ID/upload-audio"
# Clean up dummy file
rm dummy_audio.mp3
echo ""

# 6. POST to generate minutes
print_header "6. POST /meeting-records/:id/minutes"
curl -X POST "$API_BASE_URL/meeting-records/$RECORD_ID/minutes"
echo ""

# 7. DELETE the created meeting record
print_header "7. DELETE /meeting-records/:id"
curl -X DELETE "$API_BASE_URL/meeting-records/$RECORD_ID"
echo "--- Should return no content (204) ---"
echo ""

# 8. GET the deleted record (should be 404)
print_header "8. GET /meeting-records/:id (should fail with 404)"
curl -X GET "$API_BASE_URL/meeting-records/$RECORD_ID"
echo ""

echo "All tests completed."
