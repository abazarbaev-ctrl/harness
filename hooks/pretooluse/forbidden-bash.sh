#!/usr/bin/env bash
set -euo pipefail
input=$(cat)
cmd=$(echo "$input" | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/' || echo "")
[ -z "$cmd" ] && exit 0

forbidden=(
  'rm[[:space:]]+-rf[[:space:]]+/'
  'rm[[:space:]]+-rf[[:space:]]+~'
  'git[[:space:]]+push.*--force'
  'git[[:space:]]+reset[[:space:]]+--hard'
  'chmod[[:space:]]+-R[[:space:]]+777'
  'dd[[:space:]]+if='
  'mkfs\.'
  'DROP[[:space:]]+TABLE'
  'DROP[[:space:]]+DATABASE'
  'TRUNCATE'
  'terraform[[:space:]]+destroy'
  'kubectl[[:space:]]+delete[[:space:]]+namespace'
)

for pattern in "${forbidden[@]}"; do
  if echo "$cmd" | grep -qE "$pattern"; then
    echo "BLOCKED by Hard Rail #1: command matched pattern" >&2
    echo "Command: $cmd" >&2
    exit 2
  fi
done
exit 0
