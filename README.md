# Harness

The autonomous AI-coding harness for a non-coder solo builder.

Phases 0–8 are built. The harness is ready to bootstrap projects.

## What it is

A set of rules, agents, skills, hooks, and templates that sit on top of Claude
Code and make it safe to let AI agents build real products. Not a framework
you import — a folder of markdown files + shell hooks + a CLI that gets
copied/symlinked into each project. The runtime is Claude Code; the harness
adds governance, methodology, and gates around it.

## What's in here

| Path | What it is |
|---|---|
| `constitution/` | `CLAUDE.md`, `AGENTS.md`, `settings.json`. Inherited verbatim by every project. |
| `agents/` | 22 agent system prompts, grouped by harness (pm/, design/, eng/, client/, monitor/, browser/, selfimp/, mission/, memory/). |
| `skills/` | 8 named skills (TDD, BDD, Mom Test, three-approach, necessity, state-clarifier, five-exceptions, ralph). |
| `hooks/` | Hard Rail + Phase-1+ hooks wired through `constitution/settings.json` and propagated as Claude Code hooks (`.claude/hooks/`) and git hooks (`.git/hooks/`). |
| `templates/` | 14 templates: PRD, lean canvas, concept brief, scenarios.feature, mockup spec, DDR, phase plan, hypothesis, A/B test, experiment result, request, change tour, retro, error report. |
| `tier-presets/` | `tier0.yaml`–`tier3.yaml`. Drives which gates/hooks/agents/skills fire per project. |
| `watch/` | Web Watcher source list + findings/proposed PR drafts. |
| `learnings/` | `failures.md` (ERR-XXXX log) + `patterns.md` (PAT-XXXX, including candidate patterns awaiting retro decisions). |
| `bin/harness` | CLI: `init / resume / sync / retro / status / sign-deploy`. |
| `propagate.sh` | Installs the harness into a project. Called by `harness init`. |
| `tests/phase0/` | Verification tests: destructive-ops blocked, state-clarifier fires. |
| `docs/HARNESS-V1.md` | The canonical blueprint. Read this first. |

## Quick start

**Install the CLI on your PATH (one-time):**

```bash
ln -s "$(pwd)/bin/harness" ~/.local/bin/harness
```

**Start a new project:**

```bash
harness init my-project --tier=1
cd my-project
claude
```

In Claude Code, the constitution loads automatically. **Just talk to Claude in plain language** — say what you want ("I have an idea for X," "there's a bug in Y," "I'm back after time away, catch me up," "let's do the retro"). The **Conductor** (`agents/conductor.md`) is the single agent you address; it decides which sub-agents, skills, rituals, and CLI commands to run on your behalf. You never need to know the names of slash commands, agent files, or templates — that's the Conductor's job.

You approve at four authorized gates (product spec, architecture spec, phase plan, prod deploy). Everything else, the Conductor and its sub-agents act.

**Bootstrap an existing project (additive install):**

```bash
./propagate.sh /path/to/existing-project --tier=1
```

`propagate.sh` is idempotent: backs up existing `CLAUDE.md` and `settings.json`,
prepends the constitution above the project's prior rules, installs Claude Code
hooks via settings.json, installs git-hook dispatchers if `.git/` exists, and
symlinks the central `agents/skills/templates/tier-presets/hooks` directories
into `.claude/*-central/` so updates flow via `harness sync`.

## Authority

The four authority rules are in `constitution/CLAUDE.md`. R1 (agent acts by
default) + R2 (peers propose, never block) + R3 (state taxonomy) + R4 (every
bug becomes a regression test first). Non-negotiable.

The Five Hard Rails run *outside* the model as hooks. The Five Exceptions
(destructive, prod-touching, money/legal, human judgment, real-world action)
are the only times the agent escalates instead of acting.

## Iterating on the harness

Per V1 §3.12: every change to the harness is a PR. Even your own. Even the
Web Watcher's. The Friday retro template at `templates/retro.md` is the
discipline that keeps it honest — components that didn't help get **deleted,
not iterated**. Run `harness retro` weekly.

## Verifying the install in a project

Inside a project folder:

```bash
harness status            # state, open requests, ERRs, last retro
bash tests/phase0/test_destructive_blocked.sh  # Hard Rail #1 sanity check
bash tests/phase0/test_state_clarifier.sh      # R3 sanity check
```
