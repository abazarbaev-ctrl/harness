#!/usr/bin/env bash
set -euo pipefail
payload='{"tool_name":"Bash","tool_input":{"command":"git push --force origin main"}}'
set +e
result=$(echo "$payload" | bash hooks/pretooluse/forbidden-bash.sh 2>&1)
exitcode=$?
set -e
if [ "$exitcode" -eq 2 ] && echo "$result" | grep -q "BLOCKED"; then
  echo "PASS — Hard Rail #1 blocked git push --force."
  exit 0
else
  echo "FAIL — exit $exitcode, output: $result"
  exit 1
fi
