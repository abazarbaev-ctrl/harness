---
name: tdd-red-green-refactor
description: Pocock-style discipline. Write a failing test, make it pass, refactor. One test at a time. Never modify a test in the same edit as code. Used by Test-Writer and Builder.
---

# TDD: Red → Green → Refactor

Bache discipline named in V1 §2.3 and the contradictions appendix. Test-Writer and Builder never share context. The Test-Writer reads only the spec; the Builder reads tests + src.

Reference: Matt Pocock's videos on AI-driven TDD, plus the wider Kent Beck / GeePawHill canon.

## The cycle

1. **Red.** Test-Writer reads the spec (`spec/scenarios/*.feature`, `spec/prd/*`, types only) and writes ONE failing test. Runs it. Confirms it fails for the right reason (assertion failure, not import error from a typo).
2. **Green.** Builder reads the test + the surrounding `src/`. Writes the minimum implementation to pass the test. Runs the test. Confirms green. Runs the full suite. Confirms no regressions.
3. **Refactor.** Builder cleans the implementation while tests stay green. Structure-only — no new behavior, no new tests, no new dependencies. If a refactor surfaces a new test, that's a separate red→green cycle in a separate commit.

## One test at a time

You do NOT write five red tests and then make five greens. Each cycle is:

red → green → optional refactor → commit → next.

This is what makes Bache discipline work. When five tests are red at once, the Builder is tempted to fix all five at once, and the cleanest implementation that passes one test is rarely the cleanest implementation that passes five.

## Never modify test and code in the same edit

A diff with both `tests/foo.test.ts` and `src/foo.ts` modified in the same commit is forbidden. Specifically:

- Red commit: only `tests/` files modified.
- Green commit: only `src/` files modified (plus generated artifacts, type files where unavoidable).
- Refactor commit: only structure-changing edits, tests untouched.

The Builder's `MUST NOT modify any file under tests/` rule is what enforces this on the green side. The Test-Writer's `May Write to tests/ only. NOT to src/.` enforces it on the red side.

## Anti-patterns (FORBIDDEN)

- Builder modifies a test to make it pass.
- Test-Writer writes a test that passes on existing code (the test is wrong, or the feature already exists; either way, halt).
- Refactor introduces new behavior. (Refactor is structure-only.)
- Multiple uncommitted red→green cycles in the working directory.
- "Drive-by" formatting in the green commit (use the post-tool-use auto-format hook; don't bundle).
- Test that asserts internal state instead of external behavior. ("Then `state.foo` is 3" is weaker than "Then GET /api returns {foo: 3}.")

## When to use

- Every new feature.
- Every bug fix. R4: the test reproduces the bug FIRST (red), THEN the fix lands (green). The R4 hook (`hooks/prepush/r4-err-pairing.sh`) verifies the test was red on the prior commit.

## When NOT to use

Pure refactors of code already covered by tests. The cycle for a pure refactor is: confirm green → refactor → confirm green → commit. No red phase because no behavior change.

## Process for the Test-Writer

1. Read scenario.
2. Pick ONE acceptance criterion.
3. Write the test in the project's framework. Reference the criterion in the test name.
4. Run the test. Confirm RED with the right error message.
5. Commit. Hand off to Builder.

## Process for the Builder

1. Run the test. Confirm RED.
2. Read surrounding `src/` to understand the smallest implementation that satisfies.
3. Implement. Run the test. Confirm green.
4. Run the FULL test suite. Confirm no regressions.
5. Optionally refactor. Tests must stay green throughout.
6. Commit (separate commit if refactored).

## Failure cap (Hard Rail #5)

Three consecutive failed attempts at the same red test = halt. Either the test is wrong (push back to Test-Writer) or the spec is ambiguous (push back to Spec Author).
