#!/usr/bin/env bash
# Test-impact analysis — run only the tests affected by changes since BASE.
# Wraps the test runner's native impact-detection where available.
#
# Usage:
#   bash changed-tests.sh              # since origin/main
#   bash changed-tests.sh main         # since local main
#   bash changed-tests.sh HEAD~5       # since 5 commits ago
#
# Returns 0 if no source changes detected, or whatever the test runner returns.

set -uo pipefail

base="${1:-origin/main}"

# vitest first (most common in the V1 §2.8 stack)
if [ -f package.json ] && grep -qE '"vitest"|"vitest"' package.json 2>/dev/null; then
  changed=$(git diff --name-only "$base"...HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|mjs|cjs)$' | tr '\n' ' ')
  if [ -z "$changed" ]; then
    echo "changed-tests: no source changes since $base"
    exit 0
  fi
  echo "changed-tests: vitest --related on changed files since $base"
  if command -v npx >/dev/null 2>&1; then
    npx --no-install vitest related $changed
  else
    npx vitest related $changed
  fi
  exit $?
fi

# jest
if [ -f package.json ] && grep -q '"jest"' package.json 2>/dev/null; then
  echo "changed-tests: jest --changedSince=$base"
  if command -v npx >/dev/null 2>&1; then
    npx --no-install jest --changedSince="$base"
  else
    npx jest --changedSince="$base"
  fi
  exit $?
fi

# pytest with testmon (preferred) or pytest-picked
if [ -f pytest.ini ] || [ -f pyproject.toml ] || [ -d tests ] && command -v pytest >/dev/null 2>&1; then
  if pytest --testmon --collect-only >/dev/null 2>&1; then
    echo "changed-tests: pytest --testmon (incremental)"
    pytest --testmon
    exit $?
  fi
  if pytest --picked --help >/dev/null 2>&1; then
    echo "changed-tests: pytest --picked --mode=branch --parent-branch=$base"
    pytest --picked --mode=branch --parent-branch="$base"
    exit $?
  fi
  echo "changed-tests: pytest-testmon and pytest-picked not installed; falling back to full suite"
  echo "  (install one with: pip install pytest-testmon  OR  pip install pytest-picked)"
  pytest
  exit $?
fi

echo "changed-tests: no recognized test runner (vitest/jest/pytest). Wire your own:"
echo "  bash changed-tests.sh defaults to '$base' as the comparison point."
echo "  Project-specific runners: add a case above and commit a PR upstream."
exit 0
