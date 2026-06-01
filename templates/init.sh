#!/usr/bin/env bash
# init.sh — deterministically start this project's development environment.
# Copied from templates/init.sh by `harness init`; FILL IN THE PLACEHOLDERS for
# your project's tech stack on first use. Every agent session begins by running
# this script, so the savings compound forever.
#
# Usage:
#   bash init.sh          # start the dev environment
#   bash init.sh --smoke  # start + run a basic end-to-end smoke check
#   bash init.sh --stop   # stop everything (graceful)
#
# Exit codes:
#   0   environment up and (if --smoke) smoke passed
#   1   environment up but smoke failed — surface as PROBLEM
#   2   environment failed to start — surface as PROBLEM, this is the work

set -uo pipefail

cmd="${1:-start}"

# -----------------------------------------------------------------------------
# 0. PROJECT-SPECIFIC PLACEHOLDERS — fill in once per project, then never again.
# -----------------------------------------------------------------------------

# Dev server start command (foreground; use 'nohup ... &' or PM2/foreman if you
# want background). Examples below by stack:
#   Next.js:    npm run dev
#   Vite:       npm run dev
#   FastAPI:    uvicorn app.main:app --reload --port 8000
#   Hono:       npm run dev
DEV_SERVER_CMD="echo 'TODO: set DEV_SERVER_CMD in init.sh for this project'"

# Database init (or 'true' if no DB):
#   Prisma + Postgres:  npx prisma migrate dev
#   Drizzle:            npm run db:push
#   Django:             python manage.py migrate
DB_INIT_CMD="true"

# Smoke check — a single command that returns 0 iff the basic end-to-end flow
# works. Examples:
#   curl -fsS http://localhost:3000/api/health
#   npm run smoke
#   pytest tests/smoke
SMOKE_CMD="true"

# Dev server's local URL (so agents know where to point browser automation):
DEV_URL="http://localhost:3000"

# -----------------------------------------------------------------------------
# 1. Pre-flight: dependencies installed?
# -----------------------------------------------------------------------------
preflight() {
  if [ -f package.json ] && [ ! -d node_modules ]; then
    echo "init.sh: installing node deps..."
    npm install --silent || return 2
  fi
  if [ -f pyproject.toml ] && [ ! -d .venv ]; then
    echo "init.sh: creating Python venv..."
    python3 -m venv .venv && . .venv/bin/activate && pip install -e . || return 2
  fi
  return 0
}

# -----------------------------------------------------------------------------
# 2. Start / stop
# -----------------------------------------------------------------------------
start_env() {
  preflight || { echo "init.sh: preflight failed" >&2; return 2; }
  echo "init.sh: running DB init: $DB_INIT_CMD"
  eval "$DB_INIT_CMD" || { echo "init.sh: DB init failed" >&2; return 2; }
  echo "init.sh: dev server: $DEV_SERVER_CMD"
  echo "init.sh: dev URL:    $DEV_URL"
  echo "init.sh: (start the dev server in your own shell or background it as your stack prefers)"
  return 0
}

stop_env() {
  echo "init.sh: --stop is a placeholder; replace with your stack's graceful shutdown."
  return 0
}

smoke() {
  echo "init.sh: running smoke: $SMOKE_CMD"
  eval "$SMOKE_CMD"
  rc=$?
  if [ $rc -eq 0 ]; then
    echo "init.sh: smoke PASSED"
  else
    echo "init.sh: smoke FAILED (exit $rc) — environment may be up but broken" >&2
  fi
  return $rc
}

# -----------------------------------------------------------------------------
# 3. Dispatch
# -----------------------------------------------------------------------------
case "$cmd" in
  start)
    start_env
    ;;
  --smoke|smoke)
    start_env && smoke
    ;;
  --stop|stop)
    stop_env
    ;;
  *)
    echo "init.sh: unknown command: $cmd" >&2
    echo "Usage: bash init.sh [start | --smoke | --stop]" >&2
    exit 2
    ;;
esac
