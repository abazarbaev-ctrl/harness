#!/usr/bin/env bash
# Absence-tolerance: block state-changing operations when the human has been
# gone past the threshold. Prevents an autonomous run (cron-fired agent, Ralph
# loop) from flipping flags to real users or deploying while no human is present.
#
# In an active human session this NEVER triggers: the UserPromptSubmit heartbeat
# hook refreshes the timestamp on every prompt, so heartbeat is fresh whenever a
# human is typing. It only bites autonomous runs after a real absence.
#
# Reads PreToolUse JSON on stdin; inspects the Bash command.

set -euo pipefail

input=$(cat)
cmd=$(echo "$input" | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/' || echo "")
[ -z "$cmd" ] && exit 0

# Only guard state-changing operations.
state_change='(deploy|--prod|production|flag.*(on|enable|rollout|100%|[1-9][0-9]?%)|migrate.*prod|vercel.*--prod|flyctl deploy|railway up)'
echo "$cmd" | grep -qiE "$state_change" || exit 0

root="${CLAUDE_PROJECT_DIR:-$PWD}"
hb="$root/.harness/heartbeat"
threshold_days="${HARNESS_ABSENCE_DAYS:-5}"

# No heartbeat yet = brand new project, allow.
[ -f "$hb" ] || exit 0

last=$(cat "$hb" 2>/dev/null || echo "")
[ -z "$last" ] && exit 0
last_epoch=$(date -d "$last" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last" +%s 2>/dev/null || echo 0)
[ "$last_epoch" -eq 0 ] && exit 0
now_epoch=$(date -u +%s)
age_days=$(( (now_epoch - last_epoch) / 86400 ))

if [ "$age_days" -ge "$threshold_days" ]; then
  echo "BLOCKED by absence-guard: state-changing op attempted but no human signal for ${age_days} days." >&2
  echo "This op affects production or real users (Exception #2) and the human is absent." >&2
  echo "A human must run 'harness daily' (refreshes the heartbeat) before state changes resume." >&2
  exit 2
fi
exit 0
