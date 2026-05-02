#!/usr/bin/env bash
set -euo pipefail
payload='{"prompt":"is the login feature deployed yet?"}'
result=$(echo "$payload" | bash hooks/userpromptsubmit/state-clarifier.sh 2>&1)
if echo "$result" | grep -q "REMINDER (R3)"; then
  echo "PASS — state-clarifier flagged coder shorthand."
  exit 0
else
  echo "FAIL — output: $result"
  exit 1
fi
