#!/usr/bin/env bash
# Boris Cherny pattern — autoformat after writes.
# Runs prettier / eslint --fix / black depending on what's installed and what changed.
# Receives PostToolUse JSON on stdin; we read the changed file path.

set -euo pipefail

input=$(cat)
path=$(echo "$input" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/' || echo "")
[ -z "$path" ] && exit 0
[ ! -f "$path" ] && exit 0

ext="${path##*.}"

case "$ext" in
  ts|tsx|js|jsx|json|css|scss|md|yaml|yml)
    if command -v prettier >/dev/null 2>&1; then
      prettier --write "$path" >/dev/null 2>&1 || true
    elif command -v npx >/dev/null 2>&1 && [ -f package.json ]; then
      npx --no-install prettier --write "$path" >/dev/null 2>&1 || true
    fi

    if [ "$ext" = "ts" ] || [ "$ext" = "tsx" ] || [ "$ext" = "js" ] || [ "$ext" = "jsx" ]; then
      if command -v eslint >/dev/null 2>&1; then
        eslint --fix "$path" >/dev/null 2>&1 || true
      elif command -v npx >/dev/null 2>&1 && [ -f package.json ]; then
        npx --no-install eslint --fix "$path" >/dev/null 2>&1 || true
      fi
    fi
    ;;
  py)
    if command -v black >/dev/null 2>&1; then
      black --quiet "$path" >/dev/null 2>&1 || true
    fi
    if command -v ruff >/dev/null 2>&1; then
      ruff check --fix --quiet "$path" >/dev/null 2>&1 || true
    fi
    ;;
  go)
    if command -v gofmt >/dev/null 2>&1; then
      gofmt -w "$path" >/dev/null 2>&1 || true
    fi
    ;;
  rs)
    if command -v rustfmt >/dev/null 2>&1; then
      rustfmt --quiet "$path" >/dev/null 2>&1 || true
    fi
    ;;
  *)
    ;;
esac

exit 0
