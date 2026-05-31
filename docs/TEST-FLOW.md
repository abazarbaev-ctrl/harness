# Test Flow — how the harness creates tests

A non-coder solo builder can't read code to confirm correctness. The harness's job is to make *what* gets tested mechanically derived from the spec, and *whether* required tests exist mechanically enforced. This one-page reference says how.

## The pipeline (one feature, end-to-end)

```
PRD (spec/prd/<feature>.md)              ← Spec Author
  │  acceptance criteria, hypothesis, telemetry, tier
  ▼
Example Map (spec/example-maps/<feature>.md)  ← Scenario Writer
  │  rules · examples · open questions
  ▼
Scenarios (spec/scenarios/<feature>.feature) ← Scenario Writer
  │  one Gherkin scenario per acceptance criterion
  │  seven-edge-case checklist applied
  │  state-aware BEHIND FLAG / ROLLING OUT scenarios
  ▼
RED tests (tests/<category>/...)         ← Test-Writer (fresh context)
  │  one failing test per criterion
  │  R4 regression tests reference ERR-XXXX
  ▼
GREEN implementation (src/)              ← Builder (full context, never touches tests/)
  ▼
Validator manifest (.harness/validator-manifest.json)  ← Validator (fresh context)
  │  per-tier suite runs: unit, integration, contract, e2e, property,
  │  mutation, perf, security, a11y, i18n, migration, synthetic,
  │  compliance, evals; coverage/mutation thresholds; adversarial findings
  ▼
Independent cross-check                  ← bin/crosscheck.py + prepush hook
  │  re-runs deterministic tools; FAILS if Validator hallucinated numbers
  ▼
Judge decision                           ← Judge (Haiku, reads manifest only)
  │  ACCEPT iff tier-mandatory checks meet thresholds
  ▼
Promoter (release gate)                  ← Promoter
  │  R4 pairing audit (mechanical)
  │  CI workflow; human signed-token for production
```

## Who writes which kind of test

| Test category | Default authoring agent | Notes |
|---|---|---|
| `tests/unit/` | Test-Writer | One per acceptance criterion; reads spec only. |
| `tests/integration/` | Test-Writer | Cross-module within the service. |
| `tests/contract/` (Pact) | Test-Writer (consumer side) + Spec Author (provider OpenAPI) | T2+. |
| `tests/e2e/` (Playwright) | Browser Operator | One `.spec.ts` per Gherkin scenario. |
| `tests/property/` | Test-Writer | When the function maps to a clear invariant (e.g., `verify(generate(t,l))` always true). |
| `tests/mutation/` | tooling (Stryker / mutmut) | Not human-authored — configured by Validator. |
| `tests/perf/` | Test-Writer + Validator | Latency budget asserted; baseline measured. |
| `tests/security/` | tooling (Semgrep / gitleaks / Snyk / Trivy) | Configured; runs in Validator. |
| `tests/regression/` | Test-Writer | One per ERR-XXXX; **must reference the ERR id by name**; R4 hook verifies red-on-prior-commit. |
| `tests/a11y/` | Test-Writer + UX Critic invariants | jest-axe + axe-playwright + pa11y; tab-order, contrast, accessible-name. |
| `tests/i18n/` | Test-Writer | Pluralization (CLDR), RTL, date/number/currency formatting, char encoding, string overflow, missing-translation fallback. |
| `tests/migration/` | Test-Writer + DB schema owner | Apply up + down; verify data integrity; idempotency. |
| `tests/synthetic/` | Browser Operator | Production cron checks (Checkly/Datadog Synthetics or Playwright-on-cron). T2+. |
| `tests/compliance/` | Spec Author + Test-Writer | Assert audit-log entries emitted, PII redacted, BAA still valid, signed audit chain. T2+. |
| `evals/*/` | Validator (runner); cases authored by spec/red-team | Cases live as files; runner is the Validator. |

## Mechanically enforced (cannot be skipped)

- **Tier-mandatory thresholds.** Judge re-checks numbers; refuses below the line.
- **R4 regression pairing.** `hooks/prepush/r4-err-pairing.sh` blocks the push if a commit references `Refs-ERR:ERR-XXXX` without a paired test that was RED on the prior commit.
- **TDD isolation.** `hooks/precommit/tdd-isolation.sh` rejects commits that modify both `tests/` and `src/` (warning at T0/T1, block at T2+).
- **R4 universalization.** `hooks/precommit/r4-universal.sh` flags bug-fix-language commits without a `Refs-ERR:` token.
- **Deterministic cross-check.** `bin/crosscheck.py` independently re-runs the test suite, gitleaks, and coverage report; rejects if the Validator's claimed numbers don't reconcile (fail-closed at T2+).
- **Visual regression.** Argos/Chromatic baseline diffs block unintended changes.
- **Static analysis.** Semgrep + gitleaks + Snyk + Trivy block per tier severity thresholds.

## Instructional (relies on the agent following its prompt)

- Scenario Writer covers the seven-edge-case checklist (happy / empty / max / concurrent / permission-denied / external-failure / idempotency).
- Test-Writer writes one test per acceptance criterion (not bundled).
- Test-Writer proposes property tests when invariants exist.
- UX Critic runs accessibility tools and verifies WCAG.
- Validator runs adversarial inputs the Test-Writer didn't.

The mechanical layer catches catastrophic failure modes; the instructional layer raises the floor on the softer ones. The Pruning Rule applies to instructional content: if a prompt clause doesn't visibly prevent a class of failure on a real run, delete it at retro.

## The seven-edge-case checklist (per `skills/bdd-example-mapping.md`)

Every feature gets scenarios for these, even if a category genuinely doesn't apply (then a one-line comment in the .feature file explains why):

1. Happy path.
2. Empty / null / missing input.
3. Maximum / boundary input.
4. Concurrent action by two actors.
5. Permission denied (logged out, wrong role, expired token).
6. External dependency failure (API down, timeout, partial response).
7. Idempotency (repeated action = same outcome, document if not).

## Adding a new test category

Three places to update (and the integrity test catches drift):

1. **`bin/harness` `cmd_init`** — add `tests/<new>/` to the `mkdir -p` list.
2. **`constitution/CLAUDE.md` + `AGENTS.md`** — add a line under "Test categories the harness recognizes."
3. **`tier-presets/tier{1,2,3}.yaml`** — add the category to `test_categories` with the right tier policy (`required` / `optional` / `required_if_<condition>`).
4. **`docs/TEST-FLOW.md`** — update the table above.
5. **Optionally:** update agent prompts (Scenario Writer / Test-Writer / Validator) to declare invariants for the new category.

Removing a category follows the same path in reverse, but archive-don't-delete per PAT-0004.

## What still requires the human

- Approving the PRD (gate 1).
- Approving the architecture spec (gate 2).
- Approving the phase plan (gate 3).
- Approving the production deploy via signed token (gate 4).
- Conducting real-user interviews (Exception #4).
- Deciding which PATs in `learnings/patterns.md` become load-bearing.

Everything else, the agents act.
