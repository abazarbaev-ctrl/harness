#!/usr/bin/env bash
set -euo pipefail
input=$(cat)
cmd=$(echo "$input" | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/' || echo "")
[ -z "$cmd" ] && exit 0
if echo "$cmd" | grep -qiE "(prod|production)" && ! echo "$cmd" | grep -q -- "--allow-prod"; then
  if echo "$cmd" | grep -qE "(deploy|migrate|apply|push|publish)"; then
    echo "BLOCKED by Hard Rail #4: command appears to target production." >&2
    exit 2
  fi
fi
exit 0
