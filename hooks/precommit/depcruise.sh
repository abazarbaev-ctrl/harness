#!/usr/bin/env bash
# Dependency-cruiser fitness function. Activated at T1+.
# Blocks commit if module-boundary rules in .dependency-cruiser.cjs are violated.

set -euo pipefail

if [ ! -f ".dependency-cruiser.cjs" ]; then
  exit 0
fi

if ! command -v depcruise >/dev/null 2>&1 && ! command -v npx >/dev/null 2>&1; then
  echo "BLOCKED: dependency-cruiser not installed and npx unavailable." >&2
  exit 2
fi

if command -v depcruise >/dev/null 2>&1; then
  depcruise --validate src tests
else
  npx --yes dependency-cruiser --validate src tests
fi
