---
name: three-approach-design
description: Always three distinct mockup approaches with explicit pros and cons. Used by Concept Designer (moodboards) and UI Composer (screens). Three approaches that are flavors of one are not three approaches.
---

# Three-Approach Design

Discipline: every design decision worth making is presented to the human as three meaningfully distinct options, each with pros and cons, and a recommendation. The human picks.

This is the Design harness's contribution to R2 (peers propose, never block). One approach is "design dictating." Three is the human deciding with eyes open.

## When to use

- Concept Designer: when producing moodboards for a new feature. Three contrasting moods.
- UI Composer: when composing screens. Three contrasting screen approaches.
- Design System Custodian: when proposing a token-level brand decision (palette, type ramp). Three options.

## The "meaningfully distinct" bar

Three approaches must differ along at least one of:

- **Information density.** Sparse / standard / dense.
- **Navigation pattern.** Modal / inline / dedicated route.
- **Affordance shape.** Form / direct manipulation / chat / tour.
- **Progressive disclosure.** Everything visible / drill-in / hover-reveal.
- **Brand register.** Quiet / neutral / expressive.

Three approaches that all use the same density, the same navigation, and the same affordance shape are *one approach with cosmetic variants*. Reject and try again.

## What each approach must include

```markdown
# Approach {A|B|C} — {short name}

## Direction
<one paragraph: what kind of experience this is going for>

## References
- {real-world product name and url} — what we borrow
- {real-world product name and url} — what we borrow
- {real-world product name and url} — what we contrast against

## Mockup
<image / link / inline JSX / Storybook reference>

## Pros
- ...
- ...

## Cons
- ...
- ...

## Reversibility
<easy | medium | hard — how hard is it to abandon this if it doesn't work>

## Cost
<token cost or component cost or design system delta>
```

## The recommendation

After the three approaches, the file `comparison.md` includes:

- A pros/cons matrix at a glance.
- A recommendation: A or B or C, or "none — reframe."
- Confidence: low / medium / high.
- One sentence reason.

The recommendation is honest. "I recommend A" with weak reasoning is worse than "I recommend none — reframe" with strong reasoning.

## Hard rules

- Three. Not two, not four. Two becomes a binary pick (false dichotomy); four overwhelms.
- Each must have explicit pros AND cons. No "this is the best one" framing without trade-offs.
- Cite real-world references per approach.
- Recommend honestly. If you genuinely have no preference, say "no preference — pick what fits the brand budget."
- "None — reframe" is a valid fourth option only if all three approaches are wrong; do not use it as a default escape.

## Anti-patterns

- Three approaches that are flavors of one.
- "Approach A is so obviously better; B and C are straw men." (Honest distinct approaches; honest pros and cons.)
- No references; no real-world precedent.
- Recommendation with no reasoning.
- Skipping the discipline because "the answer is obvious." The discipline is the point.

## Output

The output of this skill is the three approach files plus comparison.md. The DECISION NEEDED template is what gets sent to the human.
