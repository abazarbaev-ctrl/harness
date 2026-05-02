---
ddr: <NNNN>
title: <short slug>
date: <YYYY-MM-DD>
status: proposed | accepted | rejected | superseded by DDR-<NNNN>
deciders: <human, plus the agents involved>
---

# DDR-{NNNN}: {title}

A Design Decision Record. Same shape as Michael Nygard's ADR but scoped to design (tokens, components, three-approach picks, brand-level decisions). Lives in `design/decisions/`.

## Status

proposed | accepted | rejected | superseded

## Context

What is the design situation that requires a decision? What forces are at play (brand, accessibility, dev cost, design system coherence, time)?

## Decision

What did we decide, in one paragraph? If this came from a three-approach pick, name the chosen approach explicitly.

> Chose Approach B from `design/moodboards/{feature}/comparison.md`.

## Consequences

What becomes true because of this decision? Both intended and side-effects. Both positive and negative.

- ...
- ...
- ...

## What we considered and rejected

For three-approach picks: A and C, with one-sentence reasons.

- A — `design/moodboards/{feature}/A-{name}.md` — rejected because ...
- C — `design/moodboards/{feature}/C-{name}.md` — rejected because ...

## Tokens / components affected

- New tokens: `{name}` in `design/tokens.delta.json` → merged to `design/tokens.json`.
- New components: `{Name}` in `design/storybook/`.
- Renamed: ...
- Removed: ...

## Reversibility

How hard is it to undo this? What does undo look like?

- Reversibility: easy | medium | hard.
- Undo plan: ...

## Visual regression baseline

Argos / Chromatic baseline updated: yes | no. Snapshot diff link: ...

## Approval

- [ ] Concept Designer drafted: <date>
- [ ] UX Critic reviewed: <date>
- [ ] Human approved: <date>
