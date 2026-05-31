---
phase: <N>
project: <name>
created: <YYYY-MM-DD>
human_approval: pending
author: orchestrator
---

# Phase {N} Plan — {project}

Per V1 §2.1 "Plan": one human gate per phase, not per task. The human approves THIS document; the Orchestrator runs the tasks under it.

The XML structure below is what the Orchestrator parses to produce the dispatch graph.

```xml
<phase number="{N}" name="{name}">
  <goal>
    <one_paragraph>
      What this phase ships, in plain language.
    </one_paragraph>
  </goal>

  <tier>T0|T1|T2|T3</tier>

  <success_criterion>
    A testable statement. "Feature X is BEHIND FLAG and the staging URL passes E2E."
  </success_criterion>

  <tasks>
    <task id="T-001" blast_radius="SAFE">
      <deliverable>One feature or fix</deliverable>
      <files>
        <file>src/feedback/submit.ts</file>
        <file>src/feedback/types.ts</file>
        <file>tests/unit/feedback-submit.test.ts</file>
      </files>
      <owner>builder</owner>
      <fresh_context>false</fresh_context>
      <acceptance>
        <criterion>spec/scenarios/feedback.feature::submits_when_logged_in</criterion>
        <criterion>spec/scenarios/feedback.feature::refuses_when_logged_out</criterion>
      </acceptance>
      <rollback>
        Revert commit; flag stays BEHIND FLAG.
      </rollback>
      <depends_on></depends_on>
    </task>

    <task id="T-002" blast_radius="SCOPED">
      <deliverable>Schema migration adding feedback table</deliverable>
      <files>
        <file>migrations/0042_feedback.sql</file>
        <file>arch/adr/0008-feedback-storage.md</file>
      </files>
      <owner>builder</owner>
      <fresh_context>false</fresh_context>
      <acceptance>
        <criterion>migration runs forward and backward on staging</criterion>
        <criterion>existing tables unchanged</criterion>
      </acceptance>
      <rollback>
        Run `migrations/0042_feedback.down.sql`; takes ~2 min.
      </rollback>
      <depends_on>T-001</depends_on>
    </task>

    <task id="T-003" blast_radius="RISKY">
      <deliverable>Public-portal feedback widget bundle</deliverable>
      <files>
        <file>packages/widget/src/index.ts</file>
        <file>packages/widget/dist/widget.js</file>
      </files>
      <owner>builder</owner>
      <fresh_context>false</fresh_context>
      <acceptance>
        <criterion>bundle ≤ 50KB gzipped</criterion>
        <criterion>html2canvas-pro renders correctly on Chrome/Firefox/Safari</criterion>
      </acceptance>
      <rollback>
        Pull from CDN; add CSP block. Public widget; affects all embeds.
      </rollback>
      <depends_on>T-001, T-002</depends_on>
    </task>

    <task id="T-004" blast_radius="DEPLOY-GATED">
      <deliverable>Production deploy to ROLLING OUT 1%</deliverable>
      <files>
        <file>.github/workflows/deploy-staging.yml</file>
      </files>
      <owner>promoter</owner>
      <fresh_context>false</fresh_context>
      <acceptance>
        <criterion>signed-token CI workflow succeeds</criterion>
        <criterion>0 guardrail metric regressions in 24h</criterion>
      </acceptance>
      <rollback>
        Flag → 0%; revert PR; takes ~1 min.
      </rollback>
      <depends_on>T-003</depends_on>
      <human_gate>true</human_gate>
    </task>
  </tasks>

  <human_gates>
    <gate>Phase plan approval (this document)</gate>
    <gate>Production deploy (T-004) — Exception #2</gate>
  </human_gates>

  <parallelism_groups>
    <group>T-001</group>
    <group>T-002 (after T-001)</group>
    <group>T-003 (after T-002)</group>
    <group>T-004 (after T-003, human gate)</group>
  </parallelism_groups>
</phase>
```

## Blast-radius tags

- **SAFE**: internal change, no user-visible behavior, no data side-effects. Can roll back via revert with no cleanup.
- **SCOPED**: user-visible behavior change but bounded (one feature, one route). Rollback is well-defined and rehearsed.
- **RISKY**: cross-cutting change, multiple modules affected, or external integration. Rollback requires coordination.
- **DEPLOY-GATED**: changes production state for real users. Requires human gate and Exception #2 escalation.

## Approval checklist

- [ ] PRDs for all features in tasks exist and are approved.
- [ ] Scenarios for all features exist.
- [ ] ADRs for non-obvious technical choices exist.
- [ ] Rollback plans for all SCOPED+ tasks exist.
- [ ] Human approves this phase plan: <date> <signature>
