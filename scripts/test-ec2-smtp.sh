#!/bin/bash
# Test forgot-password endpoint for all 4 account types

echo "=== TRADE NEXUS - Forgot Password SMTP Test ==="
echo ""

BASE="http://localhost:5001/api/auth/forgot-password"

test_account() {
  local label="$1"
  local email="$2"
  echo "Testing [$label]: $email"
  RESULT=$(curl -s -X POST "$BASE/send-otp" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\"}")
  echo "Response: $RESULT"
  echo ""
}

test_account "Admin"       "sagarsuchi26@gmail.com"
test_account "HR"          "bogagourav5@gmail.com"

echo "=== Done ==="
