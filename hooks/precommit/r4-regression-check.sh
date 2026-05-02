#!/usr/bin/env bash
# R4 commit-time check.
# If a commit message contains Refs-ERR:ERR-XXXX, verify:
#   1. learnings/failures.md has an entry for that ERR-id with a paired test path.
#   2. The paired test file exists on disk.
# The full red-on-prior-commit verification runs in hooks/prepush/r4-err-pairing.sh
# This commit-time hook catches the obvious cases earlier.

set -euo pipefail

# Read commit message from $1 (standard pre-commit-msg arg) or from .git/COMMIT_EDITMSG
msg_file="${1:-.git/COMMIT_EDITMSG}"
[ ! -f "$msg_file" ] && exit 0

msg=$(cat "$msg_file")
errs=$(echo "$msg" | grep -oE 'Refs-ERR:ERR-[0-9]+' | sort -u || true)

if [ -z "$errs" ]; then
  exit 0
fi

failures_md="learnings/failures.md"
if [ ! -f "$failures_md" ]; then
  echo "BLOCKED by R4: $failures_md not found but commit references ERR ids." >&2
  echo "Open a regression entry under $failures_md before committing the fix." >&2
  exit 2
fi

for err in $errs; do
  err_id="${err#Refs-ERR:}"
  echo "R4 commit-time check for $err_id..."

  test_path=$(grep -A 10 "^## $err_id\b" "$failures_md" | grep -oE 'tests/[^ ]+' | head -1 || true)
  if [ -z "$test_path" ]; then
    echo "BLOCKED by R4: $err_id has no paired test path in $failures_md." >&2
    echo "Add a 'Paired test:' line under the $err_id entry pointing to a tests/regression/ file." >&2
    exit 2
  fi

  if [ ! -f "$test_path" ]; then
    echo "BLOCKED by R4: paired test '$test_path' for $err_id does not exist on disk." >&2
    echo "Write the failing regression test FIRST (red), commit it, then commit the fix." >&2
    exit 2
  fi

  if ! grep -qE "$err_id" "$test_path"; then
    echo "BLOCKED by R4: paired test $test_path does not reference $err_id by name." >&2
    echo "Add the ERR id to the test name or docstring so prepush verification can find it." >&2
    exit 2
  fi

  echo "  -> $err_id: paired test exists and references the err id."
done

echo "R4 commit-time check passed."
exit 0
