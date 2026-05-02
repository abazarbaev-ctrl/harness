#!/usr/bin/env bash
set -euo pipefail
mkdir -p audit
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) commit $(git rev-parse --short HEAD)" >> audit/commits.log
exit 0
