# Patterns Log

Reusable patterns extracted from the work, the retros, and the Web Watcher's findings. A pattern earns its place by preventing a failure class or unlocking a capability class (V1 §1.4).

## Format

```
## PAT-0001 — <name>
- Source: <retro | err | web-watcher | mission-drift>
- Date promoted: <YYYY-MM-DD>
- Failure class prevented: <describe>
- Capability class unlocked: <describe, if applicable>
- Where it lives now: <skill | hook | agent prompt | template>
- Pruning review: <last reviewed YYYY-MM-DD; status: load-bearing | speculative>
```

## Patterns

> The three entries below are CANDIDATES sourced from studying the iii harness
> article + the iii-hq/workers repo (2026-05-29). They are marked `speculative`
> and await a Friday-retro decision (§3.13: 3 retros speculative without becoming
> load-bearing → closed without implementing). Do NOT implement on impulse.

## PAT-0001 — Per-agent cost/budget tracking with hard caps
- Source: web-watcher (iii harness article + iii-hq/workers `llm-budget` worker, 2026-05-29)
- Date promoted: candidate (not yet promoted)
- Failure class prevented: silent token/$ burn across a multi-agent run with no
  per-agent attribution. Today we cannot answer "which agent spent the budget?"
  A runaway Orchestrator fan-out or a flailing Builder (pre-circuit-breaker) can
  cost real money before anyone notices.
- Capability class unlocked: per-workspace / per-agent spend caps that HARD-STOP
  (not just alert), plus forecast and period rollover. iii's `llm-budget` is a
  standalone worker registering `budget::*`; its README is explicit that it
  enforces "spend caps", i.e. hard enforcement, not advisory.
- Where it would live: a new `hooks/posttooluse/` or `SubagentStop` hook that
  records tokens+model+agent+run-id to `audit/budget.log`; surfaced in
  `harness status`; cap thresholds declared per tier in `tier-presets/*.yaml`
  (e.g. T0 generous, T3 strict). Maps to Hard Rail #5 (circuit breakers) — this
  is the $ dimension of the same principle.
- Pruning review: 2026-05-29; status: speculative (awaiting retro #1).

## PAT-0002 — Run-level trace id threaded through multi-agent dispatch
- Source: web-watcher (iii harness article, 2026-05-29)
- Date promoted: candidate (not yet promoted)
- Failure class prevented: inability to reconstruct the causal chain of a single
  feature run. When the Orchestrator fans out Test-Writer → Builder → Validator →
  Judge → Promoter, the evidence today is scattered across separate `audit/`
  transcript files with no shared key. Debugging "why did this run fail?" means
  manually correlating timestamps.
- Capability class unlocked: "group by run / by feature / by agent" over the audit
  log, the way iii's engine tags every span with `iii.session.id`,
  `iii.message.id`, `iii.function.id` and reads them via `engine::traces::group_by`.
  NOTE: iii gets this for free because their ENGINE auto-instruments every
  function (Proxy over registerFunction). We do NOT own the runtime (Claude Code),
  so our version must be done at the hook layer — a `SubagentStop` /
  transcript-archive hook that stamps a run-id + parent-agent into each record.
- Where it would live: extend `hooks/postcommit/transcript-archive.sh` and the
  subagent-stop hook to write `{run_id, agent, parent, ts}`; Orchestrator seeds
  `run_id` at dispatch and passes it to each worker prompt.
- Pruning review: 2026-05-29; status: speculative (awaiting retro #1).

## PAT-0003 — Enforced JSON schemas for inter-agent manifests
- Source: web-watcher (iii harness article — "the contract is the wire shape", 2026-05-29)
- Date promoted: candidate (not yet promoted)
- Failure class prevented: silent drift between an agent's output and the next
  agent's expectations. Today the Validator→Judge manifest is described in PROSE
  inside the agent files. If the Validator's output shape changes, the Judge can
  misread it with no error — exactly the failure iii avoids by making every layer
  talk through a stable wire contract (they refactored turn-orchestrator 11→7
  states with zero neighbour changes because the wire shape held).
- Capability class unlocked: swap any engineering agent's internals without
  touching its neighbours, as long as the manifest schema validates. Makes the
  Pruning Rule safer to apply (replace a component without fear of breaking the
  chain).
- Where it would live: real JSON Schema files in `arch/schemas/` (start with
  `validator-manifest.schema.json`, consumed by Judge); Judge REJECTs on
  schema-invalid manifest (it already says "missing field = REJECT" — this makes
  that mechanical). Extend to test-writer→builder and intake→RLM handoffs later.
- Pruning review: 2026-05-29; status: speculative (awaiting retro #1).

## Anti-pattern logged (do NOT adopt)
- AP-0001 — Rebuilding the runtime as composable "workers". iii decomposes the
  runtime because no engine gave them composition. OUR runtime is Claude Code,
  which already provides the loop, tools, streaming, hooks, sessions, and subagent
  dispatch (~11 of iii's 15 jobs). Building a worker engine / WebSocket bus would
  be massive scope explosion for zero gain over what Claude Code already gives us.
  Our value-add is the governance/methodology layer, not the substrate. Source:
  iii article, 2026-05-29. Status: rejected on sight.
