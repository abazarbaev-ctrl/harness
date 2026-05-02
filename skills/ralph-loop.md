---
name: ralph-loop
description: Autonomous build loop for prototyping. T0 ONLY. Capped at 3 consecutive failures (V1 §1.2 hard rail #5).
---

# Ralph Loop

Autonomous loop: read backlog → pick top item → implement → test → commit → next.

## Allowed at

T0 (prototype) ONLY. The harness's Validator + Judge gates are the rigor at T1+; Ralph bypasses them.

## Circuit breakers (NON-NEGOTIABLE)

- Hard cap: 3 consecutive task failures = STOP and surface to human.
- Hard cap: wall-clock time per loop iteration (default 30 min).
- Hard cap: token budget per session (default 200K).

## Forbidden

- Running on T1+ projects.
- Running without a written backlog (`backlog.md`).
- Running without circuit breakers configured in the calling script.
