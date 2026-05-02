---
name: necessity-detector
description: Design's gatekeeper. Returns ENGAGE or SILENT for each new feature. Logs every silent skip to design/necessity-log.md. Used by Concept Designer before producing artifacts.
---

# Necessity Detector

Per V1 §1.1 R2: the Design harness does not bother the human with questions when there is no real UX/UI issue worth addressing. The Necessity Detector is the gate: it decides whether Design engages on a given feature or stays silent.

## When to use

Run this skill at the start of every Design harness invocation:

- Concept Designer reads it before producing moodboards.
- UI Composer reads it before composing screens.
- UX Critic reads it both before reviewing AND when auditing past necessity decisions.

If the result is `SILENT`, log to `design/necessity-log.md` and stop.

## Decision logic

```
ENGAGE if any of:
  - feature has a UI surface (screen, modal, widget, tour step, email body)
  - feature affects brand expression (color, type, voice, copy beyond placeholders)
  - feature has a flagged accessibility concern in the PRD
  - feature has design system drift risk (proposes a new component, token, or pattern)
  - human or another agent explicitly requested design input

else SILENT
```

A feature with NO UI surface and NO design implications is `SILENT`. Examples:
- Backend job runner.
- Internal API endpoint.
- Database migration.
- CI pipeline change.

A feature with `SILENT` outcome means: Design produces zero artifacts for this feature. No moodboards, no mockups, no critique. The Engineering harness proceeds without Design.

## Logging (mandatory)

Every decision — both ENGAGE and SILENT — is logged to `design/necessity-log.md`:

```yaml
- date: 2026-05-04
  feature: backend-job-runner-v2
  decision: SILENT
  reason: |
    No UI surface. No copy. No brand. No accessibility surface. PRD spec/prd/job-runner.md is backend-only.
  audited_by: ux-critic # populated when audited later
```

## Audit (UX Critic, monthly)

The UX Critic reads `design/necessity-log.md` monthly and verifies:

- ENGAGE decisions were correct (no over-engagement on backend).
- SILENT decisions were correct (no missed accessibility surfaces).

Audit findings go in `design/decisions/necessity-audit-{date}.md`.

## Hard rules

- The default is SILENT, not ENGAGE. Design earns its engagement.
- Logging is non-optional. A silent skip without a log entry is a process failure.
- The detector cannot be overridden by Design itself. If a human or a non-design agent requests engagement explicitly, that's a valid ENGAGE trigger; otherwise, the rule stands.
- A feature that "might have UI later" stays SILENT until the UI surface actually exists.

## Anti-patterns

- Design engaging on a feature "just in case." (Default SILENT.)
- Skipping the log because the feature was obviously SILENT. (Always log.)
- ENGAGE because the feature touches frontend code. (Frontend ≠ UI surface; a backend-driven API endpoint behind an existing UI doesn't trigger ENGAGE.)
