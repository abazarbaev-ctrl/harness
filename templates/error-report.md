---
err_id: ERR-<NNNN>
opened: <YYYY-MM-DD>
opened_by: <agent | human>
state: open | resolved | wontfix
severity: low | medium | high | critical
tier: T0 | T1 | T2 | T3
paired_test: tests/regression/<path>
fix_commit: <sha or pending>
---

# ERR-{NNNN} — {one-line title}

Per R4 (V1 §1.1): every bug becomes a regression test BEFORE the fix is accepted. The Validator refuses to merge a fix until a failing test reproduces the bug. The Promoter enforces this mechanically via `hooks/prepush/r4-err-pairing.sh`.

## Summary

One paragraph, plain language. The thing that was wrong, what real users saw, when it started.

## Severity rubric

| Level | Definition |
|---|---|
| critical | Real-user data loss, security breach, billing error, or full outage |
| high | Major feature broken for >5% of users, or any data integrity concern |
| medium | Visible bug in a feature path, workaround exists |
| low | Cosmetic, edge case, or non-user-facing |

This bug: ____

## Real-user impact (RIGHT NOW)

| Metric | Value |
|---|---|
| Users affected | `{count or %, with timestamp}` |
| First seen | `{date and how detected}` |
| Last seen | `{date or ongoing}` |
| Mitigation in place | `{yes/no — what}` |

## Reproduction

### Environment
- Tier: T0 / T1 / T2 / T3
- Branch / commit: ____
- Browser / OS: ____
- Auth state: ____

### Steps
1. ...
2. ...
3. ...

### Expected
...

### Actual
...

### Logs / screenshots / traces
- ...

## Paired regression test (R4)

Test path: `tests/regression/err-{NNNN}-{slug}.test.ts` (or `.test.py`)

Test name MUST reference the ERR-id, e.g.:

```ts
it("ERR-0042: rejects malformed annotation payload with 400", () => { ... })
```

The test was RED on commit: `{prior-sha}` (verified by `hooks/prepush/r4-err-pairing.sh`).

## Root cause

Once known. Don't speculate before evidence.

> ...

## Fix

- Commit: `{sha}` with message including `Refs-ERR:ERR-{NNNN}`.
- Tier-mandatory checks all pass per Validator manifest.

## Hook / skill / agent change (if any)

If this bug suggests a hook or skill or agent prompt should change to prevent the class of failure:

- Proposed change: ...
- Where it lives: `hooks/...` | `skills/...` | `agents/...`
- DDR / ADR / PR: ...

## Mission Drift signal?

Did this bug indicate a deeper drift (e.g., the JTBD doesn't match what users actually do)? If yes, file an Evidence Card in `pm/mission/cards/{date}/`.

## Closure

- [ ] Paired test exists and was RED on prior commit
- [ ] Fix landed; Refs-ERR in commit message
- [ ] Validator manifest PASS at tier-required thresholds
- [ ] Promoter R4 audit PASS
- [ ] Closed: <date>
