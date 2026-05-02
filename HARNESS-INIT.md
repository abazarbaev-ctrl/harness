# HARNESS-INIT.md — How to use this harness

The harness is ready. Phases 0 through 8 are built.

If you are Claude Code reading this in the harness repo itself, you are in the **central harness repo**. There are no projects to bootstrap from here — projects are spawned with the `harness init` CLI and live in their own repos.

## The harness is ready; use `harness init` to start a new project

```bash
# from anywhere, after symlinking bin/harness onto your PATH:
harness init my-project --tier=1
cd my-project
claude
```

The `harness init` subcommand:

1. Creates the project skeleton per `docs/HARNESS-V1.md` §2.5 (pm/, design/, spec/, arch/, src/, tests/, evals/, monitoring/, experiments/, client/, tour/, audit/, learnings/, .planning/, .github/workflows/).
2. Runs `propagate.sh` to copy `constitution/CLAUDE.md`, `constitution/AGENTS.md`, `constitution/settings.json`, and the hook tree into the project's `.claude/`.
3. Symlinks `agents/`, `skills/`, `hooks/` from the central harness repo so every project picks up updates via `harness resume`.
4. Copies the chosen tier preset into `.claude/tier.yaml`.
5. Writes `harness.config.yaml` and stub learnings.
6. Initializes git in the new project.

## What lives in this repo

- `constitution/` — `CLAUDE.md`, `AGENTS.md`, `settings.json`. Non-negotiable. Inherited verbatim by every project.
- `agents/` — 22 agent system prompts, organized by harness:
  - `pm/` — concept-coach, user-researcher, scenario-writer, spec-author
  - `design/` — concept-designer, design-system-custodian, ui-composer, ux-critic
  - `eng/` — orchestrator, researcher, test-writer, builder, validator, judge, promoter
  - `client/` — feedback-intake, request-lifecycle-manager
  - `monitor/` — telemetry-instrumenter, experiment-analyst
  - `browser/` — browser-operator, closed-source-researcher
  - `selfimp/` — web-watcher
  - `mission/` — mission-drift-detector
  - `memory/` — memory-custodian
- `skills/` — 8 named skills: `tdd-red-green-refactor`, `bdd-example-mapping`, `necessity-detector`, `ralph-loop`, `mom-test-interview`, `three-approach-design`, `state-clarifier`, `five-exceptions-check`.
- `hooks/` — Hard-Rail and discipline hooks (precommit, posttooluse, prepublish, prepush, pretooluse, userpromptsubmit, postcommit).
- `templates/` — PRD, lean-canvas, concept-brief, scenarios.feature, mockup-spec, DDR, phase-plan, hypothesis, ab-test-design, experiment-result, request, change-tour, retro, error-report.
- `tier-presets/` — `tier0.yaml`, `tier1.yaml`, `tier2.yaml`, `tier3.yaml`. Drives which hooks fire, which agents are active, which gates are mandatory.
- `watch/` — `sources.yaml` (Web Watcher source list), `findings/`, `proposed/`.
- `learnings/` — `failures.md` (ERR-XXXX log), `patterns.md`.
- `bin/harness` — the CLI.
- `propagate.sh` — copies constitution/hooks into a project. Called by `harness init`.
- `tests/phase0/` — Phase 0 verification tests.
- `docs/HARNESS-V1.md` — the canonical blueprint.

## CLI subcommands

| Subcommand | What it does |
|---|---|
| `harness init <name> [--tier=N] [--path=DIR]` | Bootstrap a new project under the harness. |
| `harness resume` | Pull the latest harness, propagate, summarize new commits, launch Claude Code. |
| `harness sync` | Same as resume but does not launch Claude Code. |
| `harness retro` | Open this week's retro template in `$EDITOR`. |
| `harness status` | Show project state (open requests, pending decisions, open ERRs, last retro). |
| `harness sign-deploy` | Generate a Hard Rail #4 signed approval token for a production deploy. |
| `harness help` | Print usage. |

## Installing the CLI

```bash
ln -s "$(pwd)/bin/harness" ~/.local/bin/harness
# or copy to a directory on your PATH
```

## Verification (run anytime)

```bash
bash tests/phase0/test_destructive_blocked.sh
bash tests/phase0/test_state_clarifier.sh
```

Both must print `PASS`. They check that:

- `git push --force` is blocked by the pre-tool-use forbidden-bash hook.
- A prompt containing "deployed" without a state qualifier triggers the R3 reminder.

## Constitution

Read `constitution/CLAUDE.md` end to end at least once. The four Authority Rules (R1–R4), the Five Exceptions, the seven-state taxonomy, and the Five Hard Rails are non-negotiable.

## Communication

Every harness-to-human message uses one of the five templates from `constitution/CLAUDE.md`: STATUS UPDATE, DECISION NEEDED, ACTION REQUIRED, SUCCESS, PROBLEM. Coder shorthand without a state qualifier (R3) is rewritten by the `state-clarifier` and `plain-language-translator` hooks before the human sees it.

## Iterating on the harness itself

Per V1 §3.12 commitment 3: every harness change is a PR to this repo. Even your own changes. Even the Web Watcher's. The human approves or rejects. This prevents drift across projects.

The Friday retro (`templates/retro.md`) is the discipline that keeps the harness honest: components that didn't help get deleted, not iterated. Run `harness retro` weekly.
