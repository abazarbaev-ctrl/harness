#!/usr/bin/env bash
# R4 enforcement — verifies that any commit message containing Refs-ERR:ERR-XXXX
# pairs to a regression test that was RED on a prior commit.
# Invoked by the Promoter agent before opening a PR.

set -euo pipefail

base="${1:-origin/main}"
project_root="${2:-$(pwd)}"

cd "$project_root"

errs=$(git log --pretty=%B "$base"..HEAD | grep -oE 'Refs-ERR:ERR-[0-9]+' | sort -u || true)

if [ -z "$errs" ]; then
  echo "No Refs-ERR tokens between $base and HEAD."
  exit 0
fi

failures_md="learnings/failures.md"
if [ ! -f "$failures_md" ]; then
  echo "BLOCKED by R4: $failures_md not found but commits reference ERR ids." >&2
  exit 2
fi

for err in $errs; do
  err_id="${err#Refs-ERR:}"
  echo "Checking pairing for $err_id..."

  test_path=$(grep -A 10 "^## $err_id" "$failures_md" | grep -oE 'tests/[^ ]+' | head -1 || true)
  if [ -z "$test_path" ]; then
    echo "BLOCKED by R4: $err_id has no paired test path in $failures_md." >&2
    exit 2
  fi
  if [ ! -f "$test_path" ]; then
    echo "BLOCKED by R4: paired test $test_path does not exist on disk." >&2
    exit 2
  fi

  fix_commit=$(git log --reverse --pretty=%H --grep="Refs-ERR:$err_id" "$base"..HEAD | head -1)
  prior=$(git rev-parse "$fix_commit^")

  echo "Verifying $test_path was RED at $prior..."
  git stash push -u -m "r4-pairing-stash-$$" >/dev/null 2>&1 || true
  git checkout -q "$prior"

  test_passed_at_prior=0
  if npm test -- "$test_path" >/dev/null 2>&1; then test_passed_at_prior=1; fi
  if [ $test_passed_at_prior -eq 0 ] && command -v pytest >/dev/null 2>&1; then
    if pytest "$test_path" >/dev/null 2>&1; then test_passed_at_prior=1; fi
  fi

  git checkout -q -
  git stash pop >/dev/null 2>&1 || true

  if [ $test_passed_at_prior -eq 1 ]; then
    echo "BLOCKED by R4: $test_path PASSED at $prior — should have been RED before fix." >&2
    exit 2
  fi

  echo "  -> $err_id: paired and verified RED-before-fix."
done

echo "R4 pairing check passed for all referenced ERRs."
exit 0
