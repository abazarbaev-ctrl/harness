# Harness Constitution

This file is loaded into the context of every Claude Code session that runs in this repo or in any project that inherits from this repo. The four Authority Rules are non-negotiable.

## R1 — The Agent Acts by Default
Anything that can be automated will be. The agent escalates to the human only under the **Five Exceptions**:
1. **Destructive and irreversible.** Drop database, force-push, delete unique work, send mass email, spend money, sign legal agreement, public statement.
2. **Affects production or real users.** Turn flag on for >0%, deploy to 100%, change user-visible string, change pricing/billing logic, run migration on prod data.
3. **Money, legal, or compliance.** Any spending, any TOS sign, any PHI/PII at T2+, any financial change at T3, marketing or legal copy.
4. **Human judgment.** Taste, strategic direction, vendor selection, real user research interviews.
5. **Real-world physical action.** Go to bank, call this person, sign paper, be on camera.

For everything else, the agent acts. When the agent does ask the human to do something, it must explain in one sentence why it can't do it itself, in plain language.

## R2 — Peers Propose, Never Block
The PM, Design, and Engineering harnesses are peers. Each can voice strong dissent (kill, pivot, reframe) with explicit pros and cons and a recommendation. The human decides. Dissent is always logged.

## R3 — The State Is What the Status Says
No feature is "done," "shipped," "deployed," "live," or "released" except via the seven-state taxonomy:

| State | Meaning | Visible to real users? |
|---|---|---|
| PLANNED | Idea or PRD exists. No mockup, no code. | No |
| MOCKED-UP | Clickable prototype exists. No real backend. | Maybe |
| CODED | Code written, tests pass locally. Not deployed. | No |
| ON STAGING | Deployed to non-production. | No |
| BEHIND FLAG | In production but flag is OFF for everyone. | No |
| ROLLING OUT | Flag ON for some % of real users. | Some |
| GENERALLY AVAILABLE | Flag removed or 100% on. | Yes |

## R4 — Every Bug Becomes a Regression Test Before the Fix Is Accepted
The Validator refuses to merge a fix until a failing test reproduces the bug. ERR-XXXX entries pair to a regression test or eval.

## The Five Hard Rails
1. No destructive ops without fresh-context human confirmation.
2. No reads of secrets.
3. No npm publish without allowlist + size check.
4. The agent never holds production credentials.
5. All retry loops have circuit breakers.

## The Five Communication Templates
Every harness-to-human message uses one of: STATUS UPDATE, DECISION NEEDED, ACTION REQUIRED, SUCCESS, PROBLEM.

## The Pruning Rule
Every component must demonstrably prevent a failure class or unlock a capability class. If you can't articulate the failure it prevents, delete it.

## Where the harness lives in this project

A project under the harness has these structural pieces — verify they exist:

- `.claude/agents-central/` → symlink to the central harness `agents/`. Each subfolder (pm/, design/, eng/, client/, monitor/, browser/, selfimp/, mission/, memory/) holds the 22 agent system prompts. Invoke an agent by name; its prompt is at `.claude/agents-central/<group>/<name>.md`.
- `.claude/skills-central/` → symlink to the central `skills/`. The 8 named skills (`tdd-red-green-refactor`, `bdd-example-mapping`, `mom-test-interview`, `three-approach-design`, `necessity-detector`, `state-clarifier`, `five-exceptions-check`, `ralph-loop`).
- `.claude/templates-central/` → symlink to the central `templates/`. PRD, scenarios.feature, mockup-spec, ADR/DDR, phase-plan, hypothesis, A/B-test-design, experiment-result, request, change-tour, retro, error-report, etc.
- `.claude/tier.yaml` → this project's tier preset (T0–T3). Declares which gates, hooks, agents, and skills are mandatory.
- `.claude/hooks/` → the live Claude Code hook scripts wired through `.claude/settings.json` (PreToolUse, PostToolUse, UserPromptSubmit, PreCompact) and into `.git/hooks/` (pre-commit, pre-push, post-commit).
- `harness.config.yaml` → project metadata (name, tier, harness version pin, languages, channels).
- `.harness-version` → the commit of the central harness this project is pinned to. `harness sync` updates it.

If any of `.claude/{agents,skills,templates}-central` is missing or stale, the harness is not fully live here — run `harness sync` (or, in this session, ask Claude to run `bash /path/to/harness/propagate.sh "$PWD"`).

## Test categories the harness recognizes

Every category has a home and a tier at which it becomes mandatory. See `docs/TEST-FLOW.md` for the full process (who writes, in what order, what's enforced mechanically).

- `tests/unit/`, `tests/integration/` — required from T1.
- `tests/contract/` (Pact) — required from T2 (cross-service boundaries).
- `tests/e2e/` (Playwright) — required from T1 if there's a UI.
- `tests/property/` (fast-check / Hypothesis) — required from T3, encouraged at T1+ when invariants exist.
- `tests/mutation/` (Stryker / mutmut) — required from T2.
- `tests/perf/` — latency budgets; required from T2.
- `tests/security/` — SAST/DAST/secrets; Semgrep+gitleaks+Snyk from T1, +Trivy from T2.
- `tests/regression/` — R4 paired to ERR-XXXX; required at every tier; mechanically enforced by `prepush/r4-err-pairing.sh`.
- `tests/a11y/` — automated WCAG (axe/pa11y/lighthouse); required from T1 if a UI exists.
- `tests/i18n/` — localization (RTL, plural, format, encoding, overflow); required from T1 if multilingual.
- `tests/migration/` — DB schema migrations forward+backward + data integrity; required from T1 if a DB has migrations.
- `tests/synthetic/` — production-running smoke (Datadog Synthetics / Checkly / Playwright cron); required from T2.
- `tests/compliance/` — audit-log emission, PII redaction, BAA validity, signed audit chain; required from T2.
- `evals/{capability,refusal,safety,bias,adversarial,regression,drift,judges}/` — LLM-side evals; `regression` from T1, all from T2.

## Standard handoff order

Discover (PM) → Constitute (PM + Eng) → Plan (Eng Orchestrator) → Execute (Test-Writer → Builder → Validator → Judge → Promoter) → Harden & Release. Design engages only when the Necessity Detector returns ENGAGE. Client + Monitor + Browser + Self-Improvement + Mission + Memory subsystems run alongside per their own cadences (event-driven, weekly, nightly).

## Session-start ritual

Every coding session begins with a short, standardized orientation, *before* any feature work:

1. `pwd`
2. `tail -30 .harness/progress.log` — what the last session did
3. `harness features show` (or `cat .harness/feature_list.json`) — what features exist, what passes
4. `git log --oneline -5`
5. `bash init.sh --smoke` — deterministically start the environment + verify it boots
6. Then begin work on ONE feature (state ≠ GENERALLY AVAILABLE)

If `init.sh` is missing or still has placeholder TODOs, **authoring it is the first task** — not the feature you came to work on. A broken environment is the work. See `docs/SESSION-START.md` for the rationale; run `harness session-start` to print the orientation digest.

Every session **ends** symmetrically: update `.harness/feature_list.json` for anything verified-passing, append ≤ 5 lines to `.harness/progress.log` (what / why / state left), `git commit` (with `Refs-ERR:` if it was a bug fix).
