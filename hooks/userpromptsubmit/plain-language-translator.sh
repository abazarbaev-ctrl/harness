#!/usr/bin/env bash
# Plain-language translator — expanded version of state-clarifier.
# Scans agent output / human messages for coder shorthand and either translates
# or surfaces an R3 reminder. Catches more patterns than state-clarifier alone.
#
# Triggered patterns:
#   - "shipped", "deployed", "live", "released" without a state qualifier (R3)
#   - "merged", "PR is up", "tests are green" without state context
#   - "rolled back", "feature-flagged", "instrumented" — coder jargon
#
# Outputs a REMINDER on stderr; never blocks (exit 0) unless STRICT_PLAIN_LANGUAGE=1.

set -euo pipefail

input=$(cat)
prompt=$(echo "$input" | grep -oE '"prompt"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"prompt"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/' || echo "")

state='(PLANNED|MOCKED-UP|CODED|ON STAGING|BEHIND FLAG|ROLLING OUT|GENERALLY AVAILABLE)'

reminders=()

# R3 state shorthand
shorthand_r3='(deployed|shipped|live|released)'
if echo "$prompt" | grep -qiE "$shorthand_r3" && ! echo "$prompt" | grep -qE "$state"; then
  reminders+=("R3: 'deployed/shipped/live/released' without a state qualifier — use the seven-state taxonomy.")
fi

# Generic coder shorthand
if echo "$prompt" | grep -qiE '\bmerged\b' && ! echo "$prompt" | grep -qE "$state"; then
  reminders+=("Plain language: 'merged' = CODED, not deployed. Name the state.")
fi

if echo "$prompt" | grep -qiE 'PR is up|opened a PR|the PR'; then
  reminders+=("Plain language: an open PR has no state of its own; cite the feature's state, not the PR's.")
fi

if echo "$prompt" | grep -qiE 'tests are green|all green|build is green' && ! echo "$prompt" | grep -qE "$state"; then
  reminders+=("Plain language: 'green' = tests pass; not equal to deployed. Name the state.")
fi

if echo "$prompt" | grep -qiE 'rolled back' && ! echo "$prompt" | grep -qE "$state"; then
  reminders+=("Plain language: 'rolled back' to which state? Name the new state.")
fi

if echo "$prompt" | grep -qiE 'feature-?flagged' && ! echo "$prompt" | grep -qE "$state"; then
  reminders+=("Plain language: 'feature-flagged' = BEHIND FLAG or ROLLING OUT? Name the state and percentage.")
fi

if echo "$prompt" | grep -qiE 'instrumented' && ! echo "$prompt" | grep -qE "(events?|telemetry|catalog)"; then
  reminders+=("Plain language: 'instrumented' is jargon — say 'events emitted to PostHog/Statsig' or similar.")
fi

if [ "${#reminders[@]}" -eq 0 ]; then
  exit 0
fi

for r in "${reminders[@]}"; do
  echo "REMINDER (plain-language-translator): $r" >&2
done

if [ "${STRICT_PLAIN_LANGUAGE:-0}" = "1" ]; then
  exit 2
fi

exit 0
