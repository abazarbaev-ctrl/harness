#!/usr/bin/env bash
# R4 universalization: a commit whose message describes a bug fix MUST declare
# Refs-ERR:ERR-XXXX, which in turn triggers the regression-pairing check
# (r4-regression-check.sh / r4-err-pairing.sh). This catches the case where a
# bug gets fixed without anyone opening an ERR + paired regression test.
#
# Warning by default (exit 0); blocking (exit 2) at tier >= 2 or STRICT_R4=1.
# Escape: git commit --no-verify.

set -uo pipefail

msg_file="${1:-.git/COMMIT_EDITMSG}"
[ -f "$msg_file" ] || exit 0
msg=$(cat "$msg_file")

# Already declares an ERR ref → the pairing hook handles it; nothing to do here.
echo "$msg" | grep -qE 'Refs-ERR:ERR-[0-9]+' && exit 0

# Does the message read like a bug fix?
bugfix='(\bfix(es|ed)?\b|\bbug\b|\bregression\b|\bbroken\b|\bcrash\b|\bhotfix\b|\bpatch(es|ed)?\b.*\bbug\b)'
# Exclude obvious non-bug "fix" usages (fix typo, fix lint, fix formatting, fix test).
benign='(fix(es|ed)?\s+(typo|lint|format|spacing|whitespace|spelling|doc|docs|comment|import|test name))'

echo "$msg" | grep -qiE "$bugfix" || exit 0
echo "$msg" | grep -qiE "$benign" && exit 0

tier=0
if [ -f .claude/tier.yaml ]; then
  tier=$(grep -E '^tier:' .claude/tier.yaml | head -1 | awk '{print $2}' || echo 0)
fi

m="R4: this commit reads like a bug fix but declares no Refs-ERR:ERR-XXXX."
d="Every bug becomes a regression test first (R4). Open an ERR in learnings/failures.md, write the failing test, then commit the fix with 'Refs-ERR:ERR-XXXX'. If this is NOT a bug fix, rephrase the message (e.g. 'fix typo') or use --no-verify."

if [ "${STRICT_R4:-0}" = "1" ] || [ "${tier:-0}" -ge 2 ] 2>/dev/null; then
  echo "BLOCKED by $m" >&2; echo "$d" >&2; exit 2
else
  echo "WARNING — $m" >&2; echo "$d" >&2; exit 0
fi
