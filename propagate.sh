#!/usr/bin/env bash
set -euo pipefail
project_dir="${1:-}"
[ -z "$project_dir" ] && { echo "Usage: ./propagate.sh /path/to/project"; exit 1; }
[ ! -d "$project_dir" ] && { echo "ERROR: $project_dir not a directory"; exit 1; }
mkdir -p "$project_dir/.claude/hooks"
cp constitution/CLAUDE.md "$project_dir/CLAUDE.md"
cp constitution/AGENTS.md "$project_dir/AGENTS.md"
cp constitution/settings.json "$project_dir/.claude/settings.json"
cp -r hooks/* "$project_dir/.claude/hooks/" 2>/dev/null || true
git rev-parse HEAD > "$project_dir/.harness-version"
echo "Harness propagated to $project_dir"
