---
exp_id: EXP-<NNNN>
feature: <slug>
status: complete | killed-early
analyzed_by: experiment-analyst
analyzed_on: <YYYY-MM-DD>
recommendation: ship | kill | iterate | extend
---

# Experiment Result — EXP-{NNNN}

## TL;DR (one sentence)

> Ship | Kill | Iterate | Extend: variant B beat A on `{metric}` by `{lift}` (p=`{value}`); guardrails: `{ok | regressed}`.

## Plan vs. actual

| Item | Plan | Actual |
|---|---|---|
| Sample size per variant | `{n}` | `{n}` |
| Runtime days | `{n}` | `{n}` |
| Stopped by | sample size | sample size / guardrail / manual |

## Primary metric

| Variant | N | `{metric}` mean | 95% CI | Diff vs A | p-value |
|---|---|---|---|---|---|
| A (control) | `{n}` | `{value}` | `{lo}` – `{hi}` | — | — |
| B (treatment) | `{n}` | `{value}` | `{lo}` – `{hi}` | `{diff}` | `{value}` |

Effect size (Cohen's h or d): `{value}`.

## Guardrails

| Metric | Variant A | Variant B | Diff | KILL threshold | Verdict |
|---|---|---|---|---|---|
| Crash rate | `{}` | `{}` | `{}` | `{}` | OK / regressed |
| p95 latency | `{}` | `{}` | `{}` | `{}` | OK / regressed |
| Conversion | `{}` | `{}` | `{}` | `{}` | OK / regressed |

## Novelty / primacy check

Compare first 3 days vs. last 3 days of the variant exposure:

- First 3 days lift: `{value}`
- Last 3 days lift: `{value}`
- Significant difference: yes | no

Verdict: novelty effect likely | primacy effect likely | no novelty/primacy concern.

## Segment cuts

Did the effect hold across:

- Tier (free / paid):
- Geography (regions present in PRD):
- New vs. returning users:
- Mobile vs. desktop:

(Note: cutting too fine inflates false positives; report ≥2 cuts only when sample size supports.)

## Surprises

Anything you didn't predict. (These are NOT new hypotheses to test in this experiment — they are candidates for the next cycle.)

- ...

## Recommendation

> Ship variant B because `{reason}`. Confidence: high | medium | low.

OR

> Kill variant B because `{reason}` — primary lift was below MDE / guardrail regressed.

OR

> Iterate: the directional signal is right but the effect is below MDE; propose EXP-`{next}` testing `{change}`.

OR

> Extend: lift looks promising but sample size insufficient; extend by `{n}` days at current allocation.

## State change requested

- Current state: ROLLING OUT to `{pct}%`
- Proposed state: GENERALLY AVAILABLE | BEHIND FLAG (kill) | ROLLING OUT to `{higher pct}%` (extend)
- Human gate: Exception #2 — affects all real users (for GA).

## Logs and data

- Raw data export: `experiments/completed/EXP-{NNNN}/data.csv`
- Notebook: `experiments/completed/EXP-{NNNN}/analysis.ipynb`
- Bayesian re-analysis (T2+): `experiments/completed/EXP-{NNNN}/bayesian.md`

## Approvals (if SHIP)

- [ ] Experiment Analyst recommends: <date>
- [ ] PM concurs / dissents: <date>
- [ ] Human approves GENERALLY AVAILABLE: <date>
