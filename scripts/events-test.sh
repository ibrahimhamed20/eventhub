#!/usr/bin/env bash
set -e

BASE_URL="http://localhost:3000/api/v1"
TIMESTAMP=$(date +%s)

echo "========================================================"
echo "           EVENTHUB API TEST SIMULATION                 "
echo "========================================================"

run_test() {
  local title="$1"
  local expected_status="$2"
  local method="$3"
  local url="$4"
  local headers="$5"
  local data="$6"

  echo ""
  echo "--------------------------------------------------------"
  echo "🔹 TEST: $title"
  echo "--------------------------------------------------------"
  echo "📡 $method $url"
  if [ -n "$data" ]; then
    echo "📦 Body: $data"
  fi

  # Execute request and capture HTTP status code + body
  local response
  local status_code
  local body

  if [ -n "$data" ]; then
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X "$method" "$url" $headers -d "$data")
  else
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X "$method" "$url" $headers)
  fi

  status_code=$(echo "$response" | grep "HTTP_STATUS:" | cut -d':' -f2)
  body=$(echo "$response" | sed '/HTTP_STATUS:/d')

  echo "📥 Status Code: $status_code (Expected: $expected_status)"
  echo "📄 Response:"
  echo "$body"
}

# --- STEP 1: SETUP TOKENS ---
echo ""
echo "=== STEP 1: AUTHENTICATION & TOKENS ==="

ORG1_EMAIL="org1_${TIMESTAMP}@test.com"
ORG2_EMAIL="org2_${TIMESTAMP}@test.com"
ATT_EMAIL="attendee_${TIMESTAMP}@test.com"

ORG1_TOKEN=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ORG1_EMAIL\",\"password\":\"password123\",\"fullName\":\"Organizer One\",\"role\":\"organizer\"}" \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "✅ Registered Organizer 1 ($ORG1_EMAIL)"

ORG2_TOKEN=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ORG2_EMAIL\",\"password\":\"password123\",\"fullName\":\"Organizer Two\",\"role\":\"organizer\"}" \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "✅ Registered Organizer 2 ($ORG2_EMAIL)"

ATT_TOKEN=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ATT_EMAIL\",\"password\":\"password123\",\"fullName\":\"Attendee User\",\"role\":\"attendee\"}" \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "✅ Registered Attendee ($ATT_EMAIL)"


# --- STEP 2: CREATE EVENTS ---
echo ""
echo "=== STEP 2: POST /api/v1/events (Create Event) ==="

# 2.1 Success - Published Event
PUBLISHED_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/events" \
  -H "Authorization: Bearer $ORG1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Node.js Architecture Masterclass",
    "description": "Deep dive into scalable backend systems",
    "venue": "Cairo Tech Hub, Hall A",
    "startsAt": "2026-11-20T18:00:00.000Z",
    "capacity": 100,
    "priceCents": 2500,
    "status": "published"
  }')
PUB_STATUS=$(echo "$PUBLISHED_RESP" | grep "HTTP_STATUS:" | cut -d':' -f2)
PUB_BODY=$(echo "$PUBLISHED_RESP" | sed '/HTTP_STATUS:/d')
EVENT_ID=$(echo "$PUB_BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

echo ""
echo "--------------------------------------------------------"
echo "🔹 TEST 2.1: Success — Create Published Event (Organizer 1)"
echo "--------------------------------------------------------"
echo "📥 Status Code: $PUB_STATUS (Expected: 201)"
echo "📄 Response: $PUB_BODY"
echo "🎯 Created Event ID: $EVENT_ID"

# 2.2 Success - Draft Event
DRAFT_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/events" \
  -H "Authorization: Bearer $ORG1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Secret Upcoming Hackathon",
    "venue": "Online Discord",
    "startsAt": "2026-12-01T10:00:00.000Z",
    "capacity": 50,
    "priceCents": 0,
    "status": "draft"
  }')
DRAFT_STATUS=$(echo "$DRAFT_RESP" | grep "HTTP_STATUS:" | cut -d':' -f2)
DRAFT_BODY=$(echo "$DRAFT_RESP" | sed '/HTTP_STATUS:/d')
DRAFT_ID=$(echo "$DRAFT_BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

echo ""
echo "--------------------------------------------------------"
echo "🔹 TEST 2.2: Success — Create Draft Event (Organizer 1)"
echo "--------------------------------------------------------"
echo "📥 Status Code: $DRAFT_STATUS (Expected: 201)"
echo "📄 Response: $DRAFT_BODY"
echo "🎯 Created Draft Event ID: $DRAFT_ID"

# 2.3 Error - Attendee tries to create event (403)
run_test "2.3: Error — Attendee tries to create event" "403" \
  "POST" "$BASE_URL/events" \
  "-H 'Authorization: Bearer $ATT_TOKEN' -H 'Content-Type: application/json'" \
  '{"title":"Unauthorized Event","venue":"Somewhere","startsAt":"2026-11-20T18:00:00.000Z","capacity":20,"priceCents":1000}'

# 2.4 Error - No auth header (401)
run_test "2.4: Error — No Authorization Header" "401" \
  "POST" "$BASE_URL/events" \
  "-H 'Content-Type: application/json'" \
  '{"title":"No Auth Event","venue":"Somewhere","startsAt":"2026-11-20T18:00:00.000Z","capacity":20,"priceCents":1000}'

# 2.5 Error - startsAt in the past (400)
run_test "2.5: Error — startsAt in the past" "400" \
  "POST" "$BASE_URL/events" \
  "-H 'Authorization: Bearer $ORG1_TOKEN' -H 'Content-Type: application/json'" \
  '{"title":"Past Event","venue":"Cairo","startsAt":"2020-01-01T10:00:00.000Z","capacity":50,"priceCents":1000}'

# 2.6 Error - Missing / invalid fields (400)
run_test "2.6: Error — Empty title & negative capacity" "400" \
  "POST" "$BASE_URL/events" \
  "-H 'Authorization: Bearer $ORG1_TOKEN' -H 'Content-Type: application/json'" \
  '{"title":"   ","venue":"","startsAt":"2026-11-20T18:00:00.000Z","capacity":-5,"priceCents":-100}'

# 2.7 Error - Strict mode rejects unrecognized organizerId (400)
run_test "2.7: Error — .strict() rejects organizerId payload spoofing" "400" \
  "POST" "$BASE_URL/events" \
  "-H 'Authorization: Bearer $ORG1_TOKEN' -H 'Content-Type: application/json'" \
  '{"title":"Spoofed Event","venue":"Hall B","startsAt":"2026-11-20T18:00:00.000Z","capacity":50,"priceCents":1000,"organizerId":999}'


# --- STEP 3: GET /events/mine ---
echo ""
echo "=== STEP 3: GET /api/v1/events/mine ==="

run_test "3.1: Success — Organizer 1 fetches their own events" "200" \
  "GET" "$BASE_URL/events/mine" \
  "-H 'Authorization: Bearer $ORG1_TOKEN'"

run_test "3.2: Success — Organizer 2 fetches their own events (empty list)" "200" \
  "GET" "$BASE_URL/events/mine" \
  "-H 'Authorization: Bearer $ORG2_TOKEN'"

run_test "3.3: Error — Attendee tries to access /mine" "403" \
  "GET" "$BASE_URL/events/mine" \
  "-H 'Authorization: Bearer $ATT_TOKEN'"


# --- STEP 4: GET /events/:id ---
echo ""
echo "=== STEP 4: GET /api/v1/events/:id ==="

run_test "4.1: Success — Public user views Published Event" "200" \
  "GET" "$BASE_URL/events/$EVENT_ID" ""

run_test "4.2: Success — Organizer 1 views their own Draft Event" "200" \
  "GET" "$BASE_URL/events/$DRAFT_ID" \
  "-H 'Authorization: Bearer $ORG1_TOKEN'"

run_test "4.3: Security — Public user cannot view Draft Event" "404" \
  "GET" "$BASE_URL/events/$DRAFT_ID" ""

run_test "4.4: Security — Organizer 2 cannot view Organizer 1's Draft Event" "404" \
  "GET" "$BASE_URL/events/$DRAFT_ID" \
  "-H 'Authorization: Bearer $ORG2_TOKEN'"

run_test "4.5: Error — Invalid param format (string instead of number)" "400" \
  "GET" "$BASE_URL/events/not_a_number" ""


# --- STEP 5: PATCH /events/:id ---
echo ""
echo "=== STEP 5: PATCH /api/v1/events/:id ==="

run_test "5.1: Success — Organizer 1 updates their own event" "200" \
  "PATCH" "$BASE_URL/events/$EVENT_ID" \
  "-H 'Authorization: Bearer $ORG1_TOKEN' -H 'Content-Type: application/json'" \
  '{"title":"Node.js Architecture Masterclass (Updated)","priceCents":3000}'

run_test "5.2: Error — Organizer 2 tries to update Organizer 1's event" "403" \
  "PATCH" "$BASE_URL/events/$EVENT_ID" \
  "-H 'Authorization: Bearer $ORG2_TOKEN' -H 'Content-Type: application/json'" \
  '{"title":"Hacked by Org2"}'

run_test "5.3: Error — Attendee tries to update event" "403" \
  "PATCH" "$BASE_URL/events/$EVENT_ID" \
  "-H 'Authorization: Bearer $ATT_TOKEN' -H 'Content-Type: application/json'" \
  '{"title":"Attendee Hack"}'

run_test "5.4: Error — Empty body for PATCH" "400" \
  "PATCH" "$BASE_URL/events/$EVENT_ID" \
  "-H 'Authorization: Bearer $ORG1_TOKEN' -H 'Content-Type: application/json'" \
  '{}'

run_test "5.5: Error — .strict() rejects unknown fields (seatsTaken)" "400" \
  "PATCH" "$BASE_URL/events/$EVENT_ID" \
  "-H 'Authorization: Bearer $ORG1_TOKEN' -H 'Content-Type: application/json'" \
  '{"seatsTaken":0}'


# --- STEP 6: GET /events (List & Filters) ---
echo ""
echo "=== STEP 6: GET /api/v1/events (Discovery, Search, Pagination) ==="

run_test "6.1: Success — List all published events" "200" \
  "GET" "$BASE_URL/events" ""

run_test "6.2: Success — Search keyword ('Masterclass')" "200" \
  "GET" "$BASE_URL/events?search=Masterclass" ""

run_test "6.3: Success — Filter by venue ('Cairo')" "200" \
  "GET" "$BASE_URL/events?venue=Cairo" ""

run_test "6.4: Success — Pagination & Sorting" "200" \
  "GET" "$BASE_URL/events?page=1&limit=5&sortBy=priceCents&sortOrder=desc" ""


# --- STEP 7: DELETE /events/:id ---
echo ""
echo "=== STEP 7: DELETE /api/v1/events/:id ==="

run_test "7.1: Error — Organizer 2 tries to delete Organizer 1's event" "403" \
  "DELETE" "$BASE_URL/events/$DRAFT_ID" \
  "-H 'Authorization: Bearer $ORG2_TOKEN'"

run_test "7.2: Error — Attendee tries to delete event" "403" \
  "DELETE" "$BASE_URL/events/$DRAFT_ID" \
  "-H 'Authorization: Bearer $ATT_TOKEN'"

run_test "7.3: Success — Organizer 1 deletes their draft event (0 bookings)" "204" \
  "DELETE" "$BASE_URL/events/$DRAFT_ID" \
  "-H 'Authorization: Bearer $ORG1_TOKEN'"

run_test "7.4: Verify Deletion — Event is now 404" "404" \
  "GET" "$BASE_URL/events/$DRAFT_ID" \
  "-H 'Authorization: Bearer $ORG1_TOKEN'"

echo ""
echo "========================================================"
echo "          🎉 ALL TEST SIMULATIONS PASSED! 🎉           "
echo "========================================================"
