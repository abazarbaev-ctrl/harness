#!/usr/bin/env bash
# Absence-tolerance: on session start, if the human has been gone longer than
# the threshold, print a prominent review-mode notice. Informational (exit 0);
# the absence-guard is what actually blocks state-changing ops.

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$PWD}"
hb="$root/.harness/heartbeat"
threshold_days="${HARNESS_ABSENCE_DAYS:-5}"

[ -f "$hb" ] || exit 0

last=$(cat "$hb" 2>/dev/null || echo "")
[ -z "$last" ] && exit 0

last_epoch=$(date -d "$last" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last" +%s 2>/dev/null || echo 0)
now_epoch=$(date -u +%s)
[ "$last_epoch" -eq 0 ] && exit 0

age_days=$(( (now_epoch - last_epoch) / 86400 ))

if [ "$age_days" -ge "$threshold_days" ]; then
  cat <<EOF

──────────────────────────────────────────────────────────────
  REVIEW MODE — the harness has been unattended for ${age_days} days.
  Last human signal: ${last}

  State-changing operations (prod deploy, flag flips to >0%,
  prod migrations) are GUARDED until you re-engage. Run:

      harness daily

  to see what happened while you were gone and lift review mode.
──────────────────────────────────────────────────────────────

EOF
fi
exit 0
