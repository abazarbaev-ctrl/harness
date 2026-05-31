---
name: state-clarifier
description: Apply the seven-state taxonomy to every human-facing message. R3 enforcement at the agent layer. Used by every agent that emits messages.
---

# State Clarifier

R3 (V1 §1.1): "The State Is What the Status Says." No feature is "done," "shipped," "deployed," "live," or "released" except via the seven-state taxonomy.

This skill is the agent-layer enforcement of R3. The hook `userpromptsubmit/state-clarifier.sh` enforces it at the input layer; this skill enforces it on the output side.

## The seven states

| State | Meaning | Visible to real users? |
|---|---|---|
| **PLANNED** | Idea or PRD exists. No mockup, no code. | No |
| **MOCKED-UP** | Clickable prototype exists. No real backend. | Maybe (link sharing) |
| **CODED** | Code written, tests pass locally. Not deployed. | No |
| **ON STAGING** | Deployed to non-production. | No, internal only |
| **BEHIND FLAG** | In production but flag is OFF for everyone. | No |
| **ROLLING OUT** | Flag ON for some % of real users. | Some (specify %) |
| **GENERALLY AVAILABLE** | Flag removed or 100% on. All real users see it. | Yes, all |

## When to use

Every time you emit text that mentions a feature's status. This includes:
- STATUS UPDATE template (mandatory state line).
- SUCCESS template (mandatory state-change line).
- Client-facing messages (all five client templates).
- Commit messages (when a commit changes the state of a feature).
- Code comments documenting feature state (rare; prefer flags).

## Translation rules

| Coder shorthand | Translate to |
|---|---|
| "shipped X" | "X is now {state}" — pick the actual state |
| "deployed X" | "X is ON STAGING" or "X is BEHIND FLAG" — be specific |
| "X is live" | "X is BEHIND FLAG" or "X is ROLLING OUT to {%}" or "X is GENERALLY AVAILABLE" |
| "released X" | same — pick the actual state |
| "merged X" | "X is CODED" (merging to main does not deploy) |
| "flag is on" | "X is ROLLING OUT to {%}" or "GENERALLY AVAILABLE" — name the percentage |
| "PR is up" | "X is in review; state still {state}" |

## Hard rules

- Never use coder shorthand without a state qualifier in the same sentence.
- Always name the percentage when ROLLING OUT (e.g., "ROLLING OUT to 5%").
- Never say "users see it" without naming whether that's all users or some users.
- A feature can have multiple states at once if multiple variants exist (variant A is BEHIND FLAG; variant B is ROLLING OUT). Name both.

## Format checklist for every message

- [ ] If the message names a feature, name its state.
- [ ] If the message names a state change, name both the old and new states.
- [ ] If the state involves a percentage, name the percentage.
- [ ] If "users see it" is implied, state explicitly: yes-all, yes-some, or no.

## Examples

❌ "We shipped the new annotation widget."
✅ "The new annotation widget is BEHIND FLAG (everyone-off in production); awaiting human approval to start ROLLING OUT to 1%."

❌ "Deployed."
✅ "Feature X: CODED → ON STAGING. Visible to internal users only via staging.example.com."

❌ "Released to users."
✅ "Feature X: ROLLING OUT to 25% (bucketed by user_id hash). Visible to ~25% of real users."

## What this skill replaces

Hand-wavy "we shipped it" / "it's live" / "it's out" sentences that leave the human unable to tell whether real users see the change. The seven-state taxonomy makes the answer mechanical.
