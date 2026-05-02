---
name: ralph-loop
description: Geoffrey Huntley pattern. Autonomous build loop for prototyping. Gated to T0 ONLY. Three-failure circuit breaker.
---

# Ralph Loop

Reference: Geoffrey Huntley's posts on autonomous coding loops at ghuntley.com. The pattern: read backlog → pick top item → implement → test → commit → next.

This skill is **gated to T0 (prototype) only**. At T1+, the harness's Test-Writer / Builder / Validator / Judge / Promoter chain provides the rigor. Ralph bypasses those gates by design — that's why it's only safe in throwaway environments.

## Allowed at

**T0 only.** Prototypes, hackathon code, internal demos.

The tier preset for T0 enables Ralph; T1, T2, T3 disable it via `tier-presets/tier{N}.yaml#allows_ralph: false`. Ralph reads `harness/config.yaml` first; if tier > 0, it refuses to start.

## The loop (per iteration)

```
1. Read backlog.md → pick top item not yet completed.
2. Decompose into ≤3 atomic sub-tasks.
3. For each sub-task:
   a. Read relevant code.
   b. Implement.
   c. Run smoke tests.
   d. If green, commit with conventional-commit message.
   e. If red, note failure; continue to next sub-task or halt.
4. Update backlog.md (mark item done, add follow-ups if any).
5. Check circuit breakers.
6. Loop or halt.
```

## Circuit breakers (NON-NEGOTIABLE — Hard Rail #5)

- **3 consecutive task failures** → STOP and surface to the human via PROBLEM template.
- **Wall-clock per iteration**: default 30 min. Configurable via `harness/config.yaml#ralph.iteration_max_minutes`.
- **Token budget per session**: default 200K. Configurable via `harness/config.yaml#ralph.session_max_tokens`.
- **Calendar wall**: default 4 hours per session. Beyond 4 hours, halt regardless of progress.

The Claude Code v2.1.88 leak (per V1 §1.2) revealed `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3`; we adopt the same posture for Ralph.

## What Ralph is good for

- Greenfield prototype where the goal is "see if this idea even works."
- Hackathon demos where the value is the demo, not the maintainability.
- Throwaway internal tools.
- Spike branches where you'll evaluate the diff and then throw it all away.

## What Ralph is bad for

- Anything tier T1 or higher.
- Code that reaches real users.
- Code that handles money, PII, or auth.
- Anything where a regression matters.
- Anything in a shared production codebase.

## Forbidden

- Running on T1+ projects (refused at start; tier check first).
- Running without a written `backlog.md`.
- Running without circuit breakers configured in the calling script.
- Running outside a sandboxed environment (container, VM, ephemeral repo).
- Writing to `main`. Ralph runs on its own branch; the branch is reviewed (or thrown away) by the human afterward.
- Bypassing the constitution. Even in Ralph, R1's Five Exceptions still apply — destructive ops, prod-touching, money/legal, etc., still escalate.

## Output

Each iteration appends to `audit/ralph-{session-id}.log`:

```yaml
- iter: 5
  task: "wire up email notifications stub"
  duration_seconds: 612
  result: green
  commit: a1b2c3d
  tokens_used: 18432
  cumulative_failures: 0
- iter: 6
  task: "add basic styling"
  duration_seconds: 1801
  result: red
  failures: ["lint failed twice", "type error in component"]
  cumulative_failures: 1
```

When circuit breaker hits, emit PROBLEM with the log path and stop.

## Anti-patterns

- Running Ralph on a project that has even a hint of real-user exposure.
- "Just one more iteration" — the wall-clock cap is the cap.
- Bypassing the tier check. (The skill refuses to start; don't talk it around.)
- Treating a Ralph branch as production-ready. (Review the diff; rewrite the bits that matter.)
