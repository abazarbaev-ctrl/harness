# Workflows in This Harness

[Anthropic shipped Dynamic Workflows](https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code) in Claude Code v2.1.154+. A **workflow** is a JavaScript script that orchestrates many subagents at scale — the script holds the loop, branches, and intermediate results; Claude's context only sees the final synthesis. This page is our harness's opinion on **when** to reach for one, and which patterns are worth saving.

> **Status:** workflows are in research preview. Our harness recognizes them, ships illustrative examples in `templates/workflows/`, but does NOT yet *require* any orchestration to be a workflow. Whether to graduate (e.g.) the Bache loop from an agent prompt to a workflow is logged as **PAT-0008** pending Zeen pilot evidence.

## When to use a workflow vs. our other primitives

| Use this | When |
|---|---|
| A single **agent prompt** (`agents/*/*.md`) | One agent's job, prose-shaped, expected to vary by case (Spec Author, Concept Coach). Cost of prose interpretation is low; rigid coupling not yet justified. |
| A **skill** (`skills/*.md`) | A reusable discipline an agent applies *inside* a conversation (Mom Test, three-approach-design, property-invariant-discovery). |
| An **agent invocation chain** via the Orchestrator | A pipeline where each step's output informs the next AND where mid-pipeline human gates may exist (current Bache loop). Operator can intervene at gates. |
| A **workflow** | A pipeline where the *ordering is critical*, the steps are well-defined, no mid-run human input is needed, AND we want the orchestration to be deterministic + repeatable + executable in the background. Up to 16 concurrent / 1000 total agents. |

## Patterns where a workflow probably wins

These are *candidates*. None are mandatory yet. Each becomes load-bearing only when the agent-prompt version demonstrably fails:

1. **The Bache loop** (Test-Writer → Builder → Validator → Judge → Promoter). The ordering is the discipline. A workflow makes ordering enforceable in code instead of prose. **See `templates/workflows/bache-loop.example.js`.** Tracked as PAT-0008.

2. **Cross-check claim verification.** Anthropic's bundled `/deep-research` is this pattern: fan-out N independent searches → cross-check → vote → filter unsupported claims. Our `crosscheck.py` is the deterministic-tool version; a workflow extends it to interpretive claims. **See `templates/workflows/feature-cross-check.example.js`.**

3. **Web Watcher weekly run.** 9-bucket fan-out, aggregate, propose. Today the Watcher agent's prose describes this; a workflow would execute it deterministically. *Defer:* Web Watcher is already a PAT-0004 retirement candidate; don't workflow-ify something that may not survive its first retro.

4. **Memory Custodian nightly indexing.** Multi-source fan-out (REQs, ERRs, flags, profiles, conversations), per-source compaction. Workflow-shaped but our current cron approach works.

5. **Phase-plan execution.** The XML phase plan (`templates/phase-plan.md`) lists tasks with file-overlap and dependency tags. A workflow could compute the dispatch graph from the XML and execute it. Probably the highest-leverage future workflow.

## Patterns where a workflow probably **doesn't** win

- **Concept Coach** and **User Researcher** conversations — judgment-heavy, prose-shaped, depend on the human's responses. Workflow rigidity hurts here.
- **Anything that needs the four human gates mid-run** (PRD, architecture, phase plan, prod deploy). Run each gate-bounded segment as its own workflow.
- **One-off tasks.** Workflows are for repeatable orchestration. Single-shot work stays in a conversation.

## How to author / save a workflow in this harness

The Anthropic mechanism:

- **Author**: include `ultracode` in your prompt, or `/effort ultracode` for session-wide opt-in. Claude writes a script for the task.
- **Save**: from the `/workflows` view, press `s`. Save to `.claude/workflows/<name>.js` (project, shared) or `~/.claude/workflows/<name>.js` (user, personal).
- **Invoke**: `/<name>` in any future session; pass `args` for parameterization.

Our convention layered on top:

- **Project-shared workflows live in `.claude/workflows/`** so they go through `propagate.sh` and ride with the project.
- **Workflow names mirror the agent or skill they instantiate.** `/bache-loop` runs the Bache pipeline; `/feature-cross-check` runs the cross-check pattern; etc.
- **A workflow that does the same job as an existing agent prompt SHOULD reference the prompt in its header comment**, so the script is the executable version and the agent prompt is the spec. If they drift, the agent prompt wins and the workflow is regenerated.
- **Workflows are tracked in git** (they're in `.claude/workflows/` which is checked in, unlike `.harness/` which isn't).

## How a workflow composes with our hooks and gates

Workflows execute subagents in `acceptEdits` mode by Anthropic's design. Our Claude Code hooks (`settings.json#hooks`) still fire on every tool call those subagents make — `forbidden-bash`, `secrets-scan`, `state-clarifier`, `auto-format`, etc. So our Hard Rails apply *inside* workflows.

Our gate-bound work (R4 pairing, signed-deploy tokens, validator-crosscheck) lives in **git hooks** which fire on commits/pushes regardless of whether the commit was made by a workflow agent or a conversational one. Workflows don't bypass our enforcement layer.

What workflows *can* bypass: human approval mid-run. So:

- Any workflow whose final step would deploy to production MUST end at a STATUS UPDATE awaiting the signed-deploy token. Production deploy is Exception #2 (R1) — never auto.
- Any workflow that flips a feature flag to >0% MUST end and surface ACTION REQUIRED. Same reasoning.
- Any workflow that opens client-visible changes (Change Tours, customer messages) MUST end at human approval.

The simple rule: **workflows orchestrate the work; the four human gates still gate.**

## When NOT to use `ultracode`

`/effort ultracode` makes Claude plan a workflow for *every* substantive task. That's high-token. Honest defaults for our harness:

- **Solo-builder, low-throughput Zeen pilot:** off. Each request worth one workflow, decide explicitly.
- **High-throughput agent-driven build phase:** on. Worth the token cost for orchestration determinism.
- **Anything T2/T3-tier with regulatory exposure:** off unless the workflow has been reviewed and saved. Auto-planned workflows are not auditable.

## Decision rubric: "Should I make this a workflow?"

Five yes/no questions. If all five are yes, build the workflow. If any is no, keep the existing primitive.

1. Is the orchestration ordered the same way every time?
2. Are the steps' inputs/outputs well-defined (not "the agent figures it out")?
3. Does the operator NOT need to intervene mid-pipeline?
4. Will I want to rerun this exact orchestration ≥5 times?
5. Is the failure class prevented by enforced ordering actually observed?

For the Bache loop: (1) yes, (2) yes, (3) yes between gates, (4) yes, (5) **unknown until Zeen pilot**. That's why PAT-0008 is speculative, not implemented.

## Disabling workflows in a project

Some projects (T2/T3 regulated, or solo-builder phases where the operator wants explicit control) may want workflows off entirely. Three switches:

- `/config` → toggle "Dynamic workflows" off.
- `~/.claude/settings.json#disableWorkflows: true` for the user.
- `CLAUDE_CODE_DISABLE_WORKFLOWS=1` env var.

Our `propagate.sh` does NOT set this by default. Projects opt out explicitly.
