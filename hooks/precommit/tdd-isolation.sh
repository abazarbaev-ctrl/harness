#!/usr/bin/env bash
# Mechanical enforcement of Bache TDD: never modify a test and its code in the
# same commit (skill tdd-red-green-refactor). Red commit = tests/ only; green
# commit = src/ only.
#
# Warning by default (exit 0). Blocking (exit 2) when STRICT_TDD=1 or the
# project tier is >= 2 (read from .claude/tier.yaml).
#
# Escape hatch for genuine exceptions: git commit --no-verify.

set -uo pipefail

staged=$(git diff --cached --name-only 2>/dev/null || true)
[ -z "$staged" ] && exit 0

touches_tests=0
touches_src=0
while IFS= read -r f; do
  case "$f" in
    tests/*|*/tests/*|*.test.*|*.spec.*|*_test.py|test_*.py) touches_tests=1 ;;
    src/*|*/src/*|lib/*|app/*) touches_src=1 ;;
  esac
done <<< "$staged"

[ "$touches_tests" -eq 1 ] && [ "$touches_src" -eq 1 ] || exit 0

# Determine strictness
strict="${STRICT_TDD:-0}"
tier=0
if [ -f .claude/tier.yaml ]; then
  tier=$(grep -E '^tier:' .claude/tier.yaml | head -1 | awk '{print $2}' || echo 0)
fi

msg="TDD isolation: this commit touches BOTH test files and implementation files."
detail="Bache discipline (skill tdd-red-green-refactor): red commit = tests only, green commit = src only. Split this into two commits, or use --no-verify for a genuine exception (e.g. a refactor updating both)."

if [ "$strict" = "1" ] || [ "${tier:-0}" -ge 2 ] 2>/dev/null; then
  echo "BLOCKED by $msg" >&2
  echo "$detail" >&2
  exit 2
else
  echo "WARNING — $msg" >&2
  echo "$detail" >&2
  exit 0
fi
