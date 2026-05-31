---
name: property-invariant-discovery
description: Generalized checklist for deriving property-based test invariants from a feature spec. Used by Test-Writer and Spec Author when a function's behavior maps to a clearly-statable mathematical property.
---

# Property-Invariant Discovery

Property-based testing (fast-check / Hypothesis) generates hundreds of random inputs and checks that a stated invariant holds for all of them. Mandatory at T3; encouraged at T1+ whenever a function has an obvious invariant. The hard part is naming the invariant. This checklist captures the textbook patterns.

## When this skill applies

You are scoping a new feature or function. Ask: *is there a mathematical statement about this function's behavior that should be true for any input in the domain?* If yes, you have a property worth testing.

Common triggers:
- Pure functions (no side effects, same input → same output).
- Encoder/decoder, parser/serializer, encrypt/decrypt pairs.
- Math: conversion, normalization, aggregation, sorting.
- Validation: predicate functions that classify inputs.
- State machines with reachability or non-reachability claims.
- "X always satisfies property P" requirements in the PRD.

## The 13 patterns

### 1. Round-trip / inverse
`parse(serialize(x)) == x` for any valid `x`.
`decode(encode(x)) == x`. `decrypt(encrypt(k, x), k) == x`.
**Use when:** anytime you have an inverse function.
**Counter-example fishing:** unicode edge cases, empty input, max length, locale-specific data.

### 2. Idempotency
`f(f(x)) == f(x)`. Applying twice has the same effect as applying once.
**Use when:** normalizers (trim, lowercase, deduplicate), migrations, setters that should be safe to retry.
**Counter-example fishing:** inputs that look already-normalized but aren't.

### 3. Commutativity
`f(a, b) == f(b, a)` for any `a`, `b`.
**Use when:** "+", "&&", "||", `merge`, `union`, anything order-shouldn't-matter.
**Counter-example fishing:** does order matter when types differ, when one is null, when both are the same?

### 4. Associativity
`f(f(a, b), c) == f(a, f(b, c))`.
**Use when:** aggregations, reducers, monoid-like operations.
**Counter-example fishing:** floating-point precision (real-world associativity often fails on floats).

### 5. Identity element
There exists `e` such that `f(x, e) == x` for any `x`.
**Use when:** "" for string concat, 0 for sum, 1 for product, empty list for union.

### 6. Bounds / range invariant
For any `x` in domain, `lo ≤ f(x) ≤ hi`.
**Use when:** percentages (0–100), probabilities (0–1), array indices, ages, scores.
**Counter-example fishing:** boundary inputs, negative inputs, inf/NaN.

### 7. Monotonicity
`x ≤ y ⇒ f(x) ≤ f(y)` (or strictly, or in reverse).
**Use when:** scoring, ranking, time-based functions, accumulators.

### 8. Conservation
`sum(f(xs)) == sum(xs)`, `len(f(xs)) == len(xs)`, total tokens preserved.
**Use when:** sorting, reordering, partitioning, redistribution.

### 9. Postcondition from precondition
`precondition(x) ⇒ postcondition(f(x))`.
**Use when:** the PRD says "if input is valid X, output is Y."
**Phrasing:** "for all `x` satisfying X, `f(x)` satisfies Y."

### 10. Implementation equivalence
`fast(x) == slow(x)` for any `x`.
`cached(x) == uncached(x)`. `parallel(x) == sequential(x)`.
**Use when:** introducing a performance optimization; refactoring; caching.
**Why this is gold:** the slow/reference version is your oracle; the property catches divergence.

### 11. Distributivity
`f(a + b) == f(a) + f(b)`. `f(map(g, xs)) == map(f ∘ g, xs)`.
**Use when:** linear transformations, functor laws.

### 12. Refinement of a deterministic verifier
`verify(generate(t, l), exact(generate(t, l))) == true`.
**Use when:** you have BOTH a generator and a verifier (e.g., the fraction→percentage pilot). The verifier should always accept the generator's exact answer.
**Variant:** `verify(p, wrong_answer(p)) == false` — verifier always rejects a synthesized wrong answer.

### 13. Concurrency / linearizability
Two concurrent operations on a shared resource produce a state equivalent to some serial ordering of them.
**Use when:** anything with locking, transactions, queues, last-write-wins.
**Hard to test directly:** usually requires fault-injection (chaos) more than pure property tests.

## Worked example: fraction→percentage pilot

The Zeen pilot is the textbook case. Properties to test (from this checklist):

- **(12) Refinement of deterministic verifier:** for any (n, d) with d ≠ 0, `verify(generate(n,d), n*100/d) == true`.
- **(6) Bounds:** for any (n, d) with n ≥ 0, d > 0, `0 ≤ fractionToPercentage(n,d)`.
- **(7) Monotonicity:** for fixed d, `n1 < n2 ⇒ fractionToPercentage(n1,d) < fractionToPercentage(n2,d)`.
- **(5) Identity:** `fractionToPercentage(1, 1) == 100`. `fractionToPercentage(0, anything) == 0`.
- **(12 variant) Negative case:** for any wrong answer `w` such that `|w - n*100/d| > tolerance`, `verify(problem, w) == false`.

One property file with five `it.prop()` declarations, 200 examples each at T3, catches a class of bugs unit tests miss (the verifier accidentally accepting `0.875` instead of `87.5` would surface here even if the Test-Writer didn't think to write that one unit test).

## Process for the Test-Writer

1. Read the PRD and the function signature(s).
2. Walk this 13-item checklist. For each pattern, ask: "does it apply here?"
3. Name 1–5 invariants you'd commit to. If zero, this feature has no property-based home — that's a valid outcome; move on.
4. Write each invariant as a fast-check / Hypothesis property in `tests/property/<feature>.prop.ts` (or `.py`).
5. Run with at least 100 examples in CI (T1), 200 at T3.

## What NOT to do

- Don't write property tests that just re-state unit tests with random data.
- Don't pick a property the function obviously satisfies trivially (e.g., monotonicity on a constant function).
- Don't suppress shrinking; the shrunk counter-example is the bug.
- Don't lower the example count to "make CI fast" — at <50 examples the noise floor is high.
- Don't bypass tolerance: floating-point identities almost never hold exactly. Use approximate equality with a documented bound.

## Output (Test-Writer report addition)

When you write property tests, your output to the Orchestrator names them:

```json
{
  "property_tests_added": [
    {"file": "tests/property/fraction-to-percentage.prop.ts",
     "invariants": ["bounds", "monotonicity", "verifier-refinement"],
     "examples_per_property": 200}
  ]
}
```

That count surfaces in the dashboard and the Validator manifest.
