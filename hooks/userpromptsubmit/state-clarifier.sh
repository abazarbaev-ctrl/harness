#!/usr/bin/env bash
set -euo pipefail
input=$(cat)
prompt=$(echo "$input" | grep -oE '"prompt"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"prompt"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/' || echo "")
shorthand='(deployed|shipped|live|released)'
state='(PLANNED|MOCKED-UP|CODED|ON STAGING|BEHIND FLAG|ROLLING OUT|GENERALLY AVAILABLE)'
if echo "$prompt" | grep -qiE "$shorthand" && ! echo "$prompt" | grep -qE "$state"; then
  echo 'REMINDER (R3): coder shorthand detected without a state qualifier. Use the seven-state taxonomy.'
fi
exit 0
