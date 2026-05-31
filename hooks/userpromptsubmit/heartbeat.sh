#!/usr/bin/env bash
# Absence-tolerance: refresh the human-presence heartbeat on every human prompt.
# This is the canonical "the human is here" signal. The absence-guard and
# session-start notice read this file to decide whether the project is in
# review mode. Never blocks (exit 0 always).

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$PWD}"
mkdir -p "$root/.harness"
date -u +%Y-%m-%dT%H:%M:%SZ > "$root/.harness/heartbeat"
exit 0
