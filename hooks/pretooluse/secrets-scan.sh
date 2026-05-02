#!/usr/bin/env bash
set -euo pipefail
input=$(cat)
path=$(echo "$input" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/' || echo "")
[ -z "$path" ] && exit 0

forbidden=('\.env$' '\.env\.' '/secrets/' 'credential' 'api_key' '\.pem$' '\.key$')
for pattern in "${forbidden[@]}"; do
  if echo "$path" | grep -qiE "$pattern"; then
    echo "BLOCKED by Hard Rail #2: secret-pattern path" >&2
    exit 2
  fi
done
exit 0
