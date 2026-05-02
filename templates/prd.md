---
feature_name: <slug>
source_request: <REQ-XXXX or "internal">
tier: <T0|T1|T2|T3>
human_approval: pending
created: <YYYY-MM-DD>
author: spec-author
---

# PRD — {feature_name}

## 1. Problem

> Quote the JTBD verbatim from `pm/jtbd.md`.

Cite the persona (`pm/personas.md#P-XXX`). Name the moment. State the current alternative the user pays for in time or money. State what changes after this exists.

(1–2 paragraphs, plain language, no jargon.)

## 2. Out of scope (explicit)

What this PRD is deliberately NOT building. Be specific. This is load-bearing.

- ...
- ...

## 3. User-visible behavior

Plain language description, no jargon. The Change Tour copy will be drawn from this section.

## 4. Acceptance criteria

Each criterion maps to ≥1 scenario in `spec/scenarios/{feature_name}.feature`.

- [ ] AC1: ... (scenario: `feature.scenario_name_1`)
- [ ] AC2: ... (scenario: `feature.scenario_name_2`)
- [ ] AC3: (negative case) ... (scenario: `feature.refuses_when_X`)

## 5. Tier-specific gates

(Read from `harness/config.yaml`.)

- T1: line coverage ≥ 70%, Semgrep zero high
- T2: + mutation ≥ 60%, contract tests, audit log
- T3: + property-based, fuzzing, chaos, mutation ≥ 75%

Active for THIS feature: ____

## 6. Hypothesis

(Per V1 §3.7. Every user-facing feature ships with a hypothesis the Experiment Analyst will test post-launch.)

> If we ship `{change}`, we expect `{metric}` to move by `{direction, magnitude}` because `{mechanism}`. Minimum effect worth shipping: `{value}`. If wrong, we will: `{rollback action}`.

## 7. Rollback plan

Required for any feature beyond CODED state.

- Flag name: `{flag_name}`
- Rollback steps:
  1. ...
  2. ...
- Data side-effects to clean up (if any): ...
- Estimated rollback duration: ...

## 8. Telemetry

Events the Telemetry Instrumenter will auto-wire (extends `monitoring/event_catalog.yaml`):

- `{event_name}` — fired on {situation}; properties: `{...}`
- `{event_name}` — fired on {situation}; properties: `{...}`

PII fields: `{none | list}`

## 9. Open questions

Cross-references `spec/open-questions.md`:

- Q1: ...
- Q2: ...

## 10. Approvals

- [ ] Spec author drafted: <date>
- [ ] Human approved Discover spec: <date>
- [ ] Human approved Architecture spec: <date> (if T2+)
