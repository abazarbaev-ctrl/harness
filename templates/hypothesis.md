---
exp_id: EXP-<NNNN>
feature: <slug>
status: proposed | approved | running | complete | killed
proposed_by: experiment-analyst
proposed_on: <YYYY-MM-DD>
---

# Hypothesis — EXP-{NNNN}

## Statement

> If we ship `{change}`, we expect `{metric}` to move from `{baseline}` to `{predicted}` in `{timeframe}` because `{mechanism}`.

## Baseline

| Metric | Value | Confidence interval (95%) | Source |
|---|---|---|---|
| `{primary_metric}` | `{value}` | `{lo}` – `{hi}` | PostHog query / dashboard URL |

## Change being tested

| Variant | Description | Linked PRD |
|---|---|---|
| A (control) | Current behavior | n/a |
| B (treatment) | `{description}` | `spec/prd/{feature}.md` |

## Predicted effect

- Direction: increase | decrease | no-change
- Predicted lift: `{value}` (`{absolute|relative}`)
- Minimum effect worth shipping (MDE): `{value}`
- Mechanism (why we believe this): one paragraph

## Cost to run

- Engineering: `{hours/days}`
- UI / copy: `{hours/days}`
- Data analysis: `{hours/days}`

## Cost if wrong

- Real-user impact: `{N users for M weeks}`
- Reversibility: `{easy | medium | hard}`
- Rollback action: ...

## Guardrail metrics

(Mandatory; ≥2.)

| Guardrail | Threshold for KILL |
|---|---|
| Crash rate | > +0.5 pp |
| p95 latency | > +200 ms |
| Conversion rate | < -1.5 pp |

If a guardrail regresses, KILL is recommended regardless of primary-metric lift.

## RICE score

- Reach (users / week): ____
- Impact (1, 0.5, 0.25): ____
- Confidence (1.0, 0.8, 0.5): ____
- Effort (person-weeks): ____
- **RICE = R × I × C / E** = ____

## What we'll do if we're wrong

> If lift is < MDE OR a guardrail regresses, we KILL the variant. The empty-state stays as it is.

## Approval

- [ ] Experiment Analyst proposed: <date>
- [ ] Human approved (Exception #2 — affects real users): <date>
