# `.claude/workflows/`

Project-shared Claude Code Dynamic Workflows (research preview, v2.1.154+).
See `docs/WORKFLOWS.md` in the central harness for the harness's opinion on
when to reach for a workflow vs. an agent vs. a skill.

## What lives here

JavaScript files you've saved from `/workflows` view (press `s`). They become
`/<name>` slash commands in any session in this project.

## Authoring conventions (this harness)

- **Name matches the agent or skill it instantiates.** `/bache-loop` runs the
  Bache TDD pipeline; `/feature-cross-check` runs the cross-check pattern.
- **Header comment cites the agent prompt or skill it implements.** If they
  drift, the agent prompt wins and the workflow is regenerated.
- **Workflows MUST stop at the four human gates** (PRD, architecture, phase
  plan, prod deploy). Production-affecting changes end at an ACTION REQUIRED
  surface; don't auto-deploy.
- **Workflows inherit our settings.json hooks** — hard rails fire on every
  agent tool call, even inside a workflow.

## Illustrative examples

Reference implementations live in the central harness at
`templates/workflows/*.example.js`:

- `bache-loop.example.js` — Test-Writer → Builder → Validator → Judge →
  Promoter as a script. Status: NOT a production workflow yet. Graduation
  pending Zeen pilot evidence — see PAT-0008 in `learnings/patterns.md`.

- `feature-cross-check.example.js` — fan-out N independent verifications of
  a feature's acceptance criteria across DIFFERENT framings (static code
  review, test-suite review, runtime-behavior review), vote, surface ACs
  without consensus for human review.

Copy and adapt with `ultracode` when you actually need them in a project.

## Turning workflows off for a project

`/config` → toggle "Dynamic workflows" off, or set `disableWorkflows: true`
in `.claude/settings.json`. T2/T3 regulated projects may want this off for
auditability until specific workflows are reviewed and saved.
