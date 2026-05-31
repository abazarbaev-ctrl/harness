#!/usr/bin/env bash
# Prepush gate: independently verify the latest Validator manifest's numbers
# before a push that the Promoter would turn into a release. Wraps
# bin/crosscheck.py. Fail-closed at tier >= 2.
#
# Looks for the most recent manifest at .harness/validator-manifest.json
# (the Validator agent writes it there). If no manifest exists, this is a
# no-op (nothing to cross-check yet).

set -uo pipefail

manifest=".harness/validator-manifest.json"
[ -f "$manifest" ] || exit 0

tier=0
if [ -f .claude/tier.yaml ]; then
  tier=$(grep -E '^tier:' .claude/tier.yaml | head -1 | awk '{print $2}' || echo 0)
fi

# Locate crosscheck.py: prefer the central symlink, fall back to PATH-adjacent.
cc=""
for cand in ".claude/hooks-central/../../bin/crosscheck.py" \
            "$(dirname "$(readlink -f .claude/hooks-central 2>/dev/null || echo /nonexistent)")/bin/crosscheck.py"; do
  [ -f "$cand" ] && { cc="$cand"; break; }
done
# Last resort: find it relative to a HARNESS_ROOT env var.
[ -z "$cc" ] && [ -n "${HARNESS_ROOT:-}" ] && [ -f "$HARNESS_ROOT/bin/crosscheck.py" ] && cc="$HARNESS_ROOT/bin/crosscheck.py"

if [ -z "$cc" ]; then
  echo "WARNING — validator-crosscheck: crosscheck.py not found; skipping (install harness centrally)." >&2
  exit 0
fi

python3 "$cc" "$manifest" --tier "$tier"
