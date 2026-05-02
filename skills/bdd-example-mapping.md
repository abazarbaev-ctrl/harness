---
name: bdd-example-mapping
description: Liz Keogh / Matt Wynne pattern. Rules → examples → questions. Translate user stories into Gherkin scenarios. Used by Spec Author and Scenario Writer.
---

# BDD: Example Mapping

Reference: Matt Wynne's *Example Mapping* technique; Liz Keogh's BDD canon. The pattern: every user story explodes into a fan-out of rules (yellow), examples (green), and questions (red). Each example becomes a Gherkin scenario. Questions stay red until the human answers.

## The four-color discipline

- **Blue**: the user story itself. One blue card per story.
- **Yellow**: the rules. Each rule is a constraint or invariant the system must obey for this story.
- **Green**: the examples. One concrete example per rule. Specific values, real names, real times.
- **Red**: the questions. Anything you don't know. These are NOT guessed — they go to the human.

If a rule has zero examples, the rule is theoretical (delete it or example it).
If you have more than three rules per story, the story is too big (split it).
If you have more red than green, you don't have a story yet — you have a research task.

## Translation to Gherkin

Each green card becomes one scenario:

```gherkin
Feature: <human-readable feature name>
  As a <persona>
  I want to <jtbd>
  So that <outcome>

  Background:
    Given <shared precondition>

  Scenario: <one specific example>
    Given <precondition>
    When <single action>
    Then <observable outcome>
    And <observable outcome>
```

## Hard rules

- **One example = one scenario.** Do not bundle multiple examples into one scenario.
- **Observable outcomes only.** "Then a row appears in the database" is observable; "Then the system processes the request" is not.
- **Negative scenarios are first-class.** For each rule, write at least one scenario that violates it and verify the system refuses correctly.
- **Questions never become scenarios with a guess.** Red cards stay red. They go in `spec/open-questions.md` and the human answers.
- **Specific values.** "Jane Doe" not "a user." "2026-05-04" not "a date." Specific examples are easier to reason about and to test.
- **State-aware language.** When a scenario depends on a feature being in a certain state from R3, name the state: "Given the feedback feature is BEHIND FLAG for this user."

## The seven-edge-case checklist

For every feature, write scenarios covering at minimum:

1. **Happy path.**
2. **Empty input / null / missing field.**
3. **Maximum input** (long string, large list, boundary value).
4. **Concurrent action** (two users, same target).
5. **Permission denied** (logged out, wrong role, expired token).
6. **External dependency failure** (API down, timeout, partial response).
7. **Idempotency** (action repeated — same outcome or different, document which).

If a case genuinely doesn't apply, leave a one-line comment in the .feature file: `# (3) max input n/a — no input field`. Don't silently skip.

## Process

1. Read the user story.
2. Lay out yellow rules. Aim for 1–3 per story.
3. For each rule, lay out green examples. Aim for ≥1, ideally 2–4.
4. For each rule, write at least one negative-case green example.
5. Surface red questions to the human via `spec/open-questions.md` and DECISION NEEDED template.
6. Translate green examples to Gherkin scenarios in `spec/scenarios/{name}.feature`.
7. Verify the seven-edge-case checklist; add scenarios for missing cases.

## Anti-patterns

- Rules without examples (theoretical specs).
- Examples without rules (untraceable scenarios).
- Red questions that become scenarios with a guess.
- One mega-scenario covering five examples.
- Skipping negative cases ("the happy path is enough").
- Skipping the edge-case checklist ("obviously these don't apply").

## Output

The example map (`spec/example-maps/{name}.md`) and the .feature file (`spec/scenarios/{name}.feature`) and the open-questions delta (`spec/open-questions.md`).
