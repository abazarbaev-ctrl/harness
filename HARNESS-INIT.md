# HARNESS-INIT.md — Phase 0 Plan for Claude Code

You are reading this because the human asked you to bootstrap Phase 0 of the Harness.

## What Phase 0 is
Constitution + State Taxonomy + Communication discipline + the five Hard Rails are live in this repo. No agents yet. No projects yet.

## What you should find
- `constitution/CLAUDE.md` — four Authority Rules + Five Exceptions + State Taxonomy + Five Hard Rails.
- `constitution/AGENTS.md` — same content, cross-runtime.
- `constitution/settings.json` — deny-list and hook wiring.
- `hooks/pretooluse/forbidden-bash.sh` — Hard Rail #1.
- `hooks/pretooluse/secrets-scan.sh` — Hard Rail #2.
- `hooks/pretooluse/no-prod-creds.sh` — Hard Rail #4.
- `hooks/userpromptsubmit/state-clarifier.sh` — R3 enforcement.
- `hooks/postcommit/transcript-archive.sh` — audit log.
- `tier-presets/tier0.yaml`, `propagate.sh`.
- `tests/phase0/test_destructive_blocked.sh`, `tests/phase0/test_state_clarifier.sh`.

## Your tasks
1. Run `bash tests/phase0/test_destructive_blocked.sh`. Must print PASS.
2. Run `bash tests/phase0/test_state_clarifier.sh`. Must print PASS.
3. Read `constitution/CLAUDE.md` end to end. Confirm to the human you understand the four Authority Rules.
4. Read `docs/HARNESS-V1.md`. In one sentence tell the human what Phase 1 is.
5. Stop. Do NOT begin Phase 1 unless the human says "go to Phase 1."

## What you do NOT do in Phase 0
- Do not write agent prompts.
- Do not write skills.
- Do not initialize a project.
- Do not modify `constitution/` files.

## Communication
Use only the five message templates from `constitution/CLAUDE.md`.
