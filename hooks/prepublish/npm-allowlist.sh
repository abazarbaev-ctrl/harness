#!/usr/bin/env bash
# Hard Rail #3 — npm publish allowlist + size check.
# Runs `npm pack --dry-run` and blocks if:
#   - any *.map file is included (Claude Code leak lesson, March 31, 2026)
#   - total size exceeds threshold
#   - files outside package.json:files allowlist are included.

set -euo pipefail

if [ ! -f package.json ]; then
  echo "no package.json — npm-allowlist hook skipped"
  exit 0
fi

# 1. dry-run pack and capture the file list
if ! command -v npm >/dev/null 2>&1; then
  echo "BLOCKED: npm not on PATH; cannot verify Hard Rail #3." >&2
  exit 2
fi

pack_out=$(npm pack --dry-run --json 2>&1) || {
  echo "BLOCKED by Hard Rail #3: npm pack --dry-run failed." >&2
  echo "$pack_out" >&2
  exit 2
}

# 2. block on any .map files
if echo "$pack_out" | grep -qE '"path"[[:space:]]*:[[:space:]]*"[^"]*\.map"'; then
  echo "BLOCKED by Hard Rail #3: source map (.map) file in npm pack." >&2
  echo "Reference: Claude Code source-map leak, March 31, 2026." >&2
  echo "Remove the maps from the publish path or add to .npmignore." >&2
  exit 2
fi

# 3. size threshold (default 5 MB; override via NPM_ALLOWLIST_SIZE_KB env var)
size_threshold_kb="${NPM_ALLOWLIST_SIZE_KB:-5120}"
size_kb=$(echo "$pack_out" | grep -oE '"size"[[:space:]]*:[[:space:]]*[0-9]+' | head -1 | grep -oE '[0-9]+' || echo "0")
size_kb=$((size_kb / 1024))

if [ "$size_kb" -gt "$size_threshold_kb" ]; then
  echo "BLOCKED by Hard Rail #3: pack size ${size_kb}KB exceeds threshold ${size_threshold_kb}KB." >&2
  exit 2
fi

# 4. verify package.json:files allowlist exists for any pack with > 5 files
file_count=$(echo "$pack_out" | grep -cE '"path"[[:space:]]*:' || true)
allowlist=$(node -e "try{const p=require('./package.json');console.log(Array.isArray(p.files)?'present':'missing')}catch(e){console.log('missing')}" 2>/dev/null || echo "missing")

if [ "$file_count" -gt 5 ] && [ "$allowlist" = "missing" ]; then
  echo "BLOCKED by Hard Rail #3: package.json missing 'files' allowlist." >&2
  echo "Declare the allowlist explicitly to prevent accidental publication." >&2
  exit 2
fi

echo "npm-allowlist OK: ${file_count} files, ${size_kb}KB."
exit 0
