#!/usr/bin/env bash
# Module-boundary check. Activated at T2+.
# For TS/JS: defer to dependency-cruiser advanced rules.
# For Java/Kotlin: actual ArchUnit (project-side runner).

set -euo pipefail

if [ -f "tests/arch/run.sh" ]; then
  bash tests/arch/run.sh
  exit $?
fi

if [ -f "scripts/arch-check.sh" ]; then
  bash scripts/arch-check.sh
  exit $?
fi

exit 0
