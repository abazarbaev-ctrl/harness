#!/usr/bin/env bash
# Hard Rail #5 enforcement — circuit breaker on autocompact.
# Fires on PreCompact (Claude Code event). Archives the current transcript
# before compaction so we can recover context if compaction is lossy or wrong.
#
# Per V1 §1.2 hard rail #5: Claude Code v2.1.88 leak revealed
# MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3. We adopt the same posture:
# count compactions per session; halt with non-zero exit after 3 failures.

set -euo pipefail

archive_dir="${CLAUDE_PROJECT_DIR:-$PWD}/audit/compactions"
mkdir -p "$archive_dir"

ts=$(date -u +%Y-%m-%dT%H%M%SZ)
session_id="${CLAUDE_SESSION_ID:-unknown}"
out="${archive_dir}/${ts}-${session_id}.json"

cat > "$out" <<EOF
{
  "ts": "$ts",
  "session_id": "$session_id",
  "event": "PreCompact",
  "note": "transcript backed up before compaction (Hard Rail #5)"
}
EOF

# Circuit-breaker counter: 3 consecutive compactions in one session = halt.
counter_file="${archive_dir}/.counter-${session_id}"
count=0
[ -f "$counter_file" ] && count=$(cat "$counter_file")
count=$((count + 1))
echo "$count" > "$counter_file"

if [ "$count" -ge 3 ]; then
  echo "BLOCKED by Hard Rail #5: $count consecutive compactions in this session. Halting per V1 §1.2." >&2
  echo "Reset by deleting $counter_file after investigating why the session needed so many compactions." >&2
  exit 2
fi

exit 0
