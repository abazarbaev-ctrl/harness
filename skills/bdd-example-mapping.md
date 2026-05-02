---
name: bdd-example-mapping
description: Translate user stories into Gherkin scenarios via Example Mapping. Used by Spec Author / Scenario Writer (Phase 2 dependency).
---

# BDD: Example Mapping

For each user story, fan out into:
- **Rules** (yellow): the business rules.
- **Examples** (green): a concrete example per rule.
- **Questions** (red): things you don't know — surfaced for the human, not guessed.

Each example becomes a Gherkin scenario:

```gherkin
Feature: ...

Scenario: <one example>
  Given <precondition>
  When <action>
  Then <observable outcome>
```

## Hard rules

- One example = one scenario. Do not bundle.
- Questions stay red until the human answers. They do NOT become scenarios with a guess.
- Edge cases, error states, and "what does NOT happen" are first-class examples — not afterthoughts.
