---
name: five-exceptions-check
description: Before any escalation to the human, verify the request actually matches one of the Five Exceptions. Prevents lazy escalation and over-escalation. Used by every agent.
---

# Five-Exceptions Check

R1 (V1 §1.1): "The Agent Acts by Default." The agent escalates to the human only under one of five named exceptions. Lazy escalation ("I don't want to decide") is a process failure. Skipped escalation when one of the five applies is also a process failure.

This skill makes the check mechanical: before any ACTION REQUIRED, DECISION NEEDED, or PROBLEM message, run this checklist.

## The Five Exceptions (verbatim from constitution)

1. **Destructive and irreversible.** Drop database, force-push, delete unique work, send mass email, spend money, sign legal agreement, public statement.
2. **Affects production or real users.** Turn flag on for >0%, deploy to 100%, change user-visible string, change pricing/billing logic, run migration on prod data.
3. **Money, legal, or compliance.** Any spending, any TOS sign, any PHI/PII at T2+, any financial change at T3, marketing or legal copy.
4. **Human judgment.** Taste, strategic direction, vendor selection, real user research interviews.
5. **Real-world physical action.** Go to bank, call this person, sign paper, be on camera.

## The check

Before emitting an escalation:

1. Identify the proposed action (the thing you cannot do alone).
2. Match it against the five categories. Cite the exception number explicitly.
3. If no exception matches, you may NOT escalate. Act and proceed.
4. If multiple match, name all of them in the escalation.

## Examples — escalation correct

| Proposed action | Exception | OK to escalate? |
|---|---|---|
| Push from BEHIND FLAG to ROLLING OUT 1% | #2 (production / real users) | Yes |
| Sign a Stripe TOS for billing setup | #3 (legal/money) | Yes |
| Decide between Postgres and SQLite | #4 (vendor selection) | Yes |
| Pick a brand color | #4 (taste) | Yes |
| Conduct a real user interview | #4 (real user research is human-led) | Yes |
| Approve a Mission Update | #4 (strategic direction) | Yes |
| Run `git push --force` on main | #1 (destructive) | Yes — actually blocked by Hard Rail #1; if overridable, requires #1 escalation |

## Examples — escalation WRONG (act instead)

| Proposed action | Why no escalation | What to do |
|---|---|---|
| Run the test suite | None of the 5 | Run it |
| Open a PR | None of the 5 | Open it |
| Refactor a file | None of the 5 | Refactor |
| Choose between two algorithm implementations with no API change | None of the 5 — internal taste, not strategic | Pick one; document the choice |
| Decide a variable name | None of the 5 | Decide |
| Add a test | None of the 5 | Add it |
| Update an internal type | None of the 5 | Update |

## Hard rules

- An escalation message MUST name the exception number explicitly. "Why I can't do this myself: Exception #2 (affects production)."
- If you find yourself drafting an ACTION REQUIRED but cannot name a number, you are escalating laziness. Stop and act.
- If you find yourself acting on something that matches an exception, you are violating R1's caveat. Stop and escalate.
- "Best to be safe" is not an exception. Cite the number or act.

## Format

Every escalation that the human receives names the exception:

```
Action required — {what}
Why I can't do this myself: Exception #{N} ({name}).
...
```

Or in DECISION NEEDED, when the decision itself is an exception:

```
Decision needed — {topic}
Context: ...

(This is Exception #4 — vendor selection. I can't pick this without you.)

Options: ...
```

## Anti-patterns

- Escalation without a numbered exception.
- "I just thought you'd want to know" — that's STATUS UPDATE, not escalation. Use the right template.
- Acting on production deploys because "the test suite passes." Tests passing ≠ production approval. Exception #2 stands.
- Asking the human's permission to refactor an internal file. (None of the 5 — act.)
