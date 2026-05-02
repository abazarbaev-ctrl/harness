---
name: tdd-red-green-refactor
description: The discipline of writing tests before implementation, with role separation. Used by Test-Writer and Builder.
---

# TDD: Red → Green → Refactor

Bache discipline: separate the role that writes the test from the role that writes the implementation. Test-Writer and Builder never share context.

## Steps

1. **Red.** Test-Writer reads spec only, writes a failing test, runs it, confirms it fails for the right reason.
2. **Green.** Builder reads test + src, writes minimum implementation to pass, runs the test, confirms green.
3. **Refactor.** Builder cleans implementation while tests stay green. NO new tests during refactor — that's a separate cycle.

## Anti-patterns (FORBIDDEN)

- Builder modifies the test to make it pass.
- Test-Writer writes tests that pass on existing code.
- Refactor introduces new behavior. (Refactor is structure-only.)
- Multiple uncommitted red→green cycles. Commit each cycle.

## When to use

Every new feature. Every bug fix (test reproduces the bug FIRST, then fix — R4).
