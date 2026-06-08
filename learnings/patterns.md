# Patterns Log

Reusable patterns extracted from the work, the retros, and the Web Watcher's findings. A pattern earns its place by preventing a failure class or unlocking a capability class (V1 §1.4).

## Format

```
## PAT-0001 — <name>
- Source: <retro | err | web-watcher | mission-drift>
- Date promoted: <YYYY-MM-DD>
- Failure class prevented: <describe>
- Capability class unlocked: <describe, if applicable>
- Where it lives now: <skill | hook | agent prompt | template>
- Pruning review: <last reviewed YYYY-MM-DD; status: load-bearing | speculative>
```

## Patterns

> The three entries below are CANDIDATES sourced from studying the iii harness
> article + the iii-hq/workers repo (2026-05-29). They are marked `speculative`
> and await a Friday-retro decision (§3.13: 3 retros speculative without becoming
> load-bearing → closed without implementing). Do NOT implement on impulse.

## PAT-0001 — Per-agent cost/budget tracking with hard caps
- Source: web-watcher (iii harness article + iii-hq/workers `llm-budget` worker, 2026-05-29)
- Date promoted: candidate (not yet promoted)
- Failure class prevented: silent token/$ burn across a multi-agent run with no
  per-agent attribution. Today we cannot answer "which agent spent the budget?"
  A runaway Orchestrator fan-out or a flailing Builder (pre-circuit-breaker) can
  cost real money before anyone notices.
- Capability class unlocked: per-workspace / per-agent spend caps that HARD-STOP
  (not just alert), plus forecast and period rollover. iii's `llm-budget` is a
  standalone worker registering `budget::*`; its README is explicit that it
  enforces "spend caps", i.e. hard enforcement, not advisory.
- Where it would live: a new `hooks/posttooluse/` or `SubagentStop` hook that
  records tokens+model+agent+run-id to `audit/budget.log`; surfaced in
  `harness status`; cap thresholds declared per tier in `tier-presets/*.yaml`
  (e.g. T0 generous, T3 strict). Maps to Hard Rail #5 (circuit breakers) — this
  is the $ dimension of the same principle.
- Pruning review: 2026-05-29; status: speculative (awaiting retro #1).

## PAT-0002 — Run-level trace id threaded through multi-agent dispatch
- Source: web-watcher (iii harness article, 2026-05-29)
- Date promoted: candidate (not yet promoted)
- Failure class prevented: inability to reconstruct the causal chain of a single
  feature run. When the Orchestrator fans out Test-Writer → Builder → Validator →
  Judge → Promoter, the evidence today is scattered across separate `audit/`
  transcript files with no shared key. Debugging "why did this run fail?" means
  manually correlating timestamps.
- Capability class unlocked: "group by run / by feature / by agent" over the audit
  log, the way iii's engine tags every span with `iii.session.id`,
  `iii.message.id`, `iii.function.id` and reads them via `engine::traces::group_by`.
  NOTE: iii gets this for free because their ENGINE auto-instruments every
  function (Proxy over registerFunction). We do NOT own the runtime (Claude Code),
  so our version must be done at the hook layer — a `SubagentStop` /
  transcript-archive hook that stamps a run-id + parent-agent into each record.
- Where it would live: extend `hooks/postcommit/transcript-archive.sh` and the
  subagent-stop hook to write `{run_id, agent, parent, ts}`; Orchestrator seeds
  `run_id` at dispatch and passes it to each worker prompt.
- Pruning review: 2026-05-29; status: speculative (awaiting retro #1).

## PAT-0003 — Enforced JSON schemas for inter-agent manifests
- Source: web-watcher (iii harness article — "the contract is the wire shape", 2026-05-29)
- Date promoted: candidate (not yet promoted)
- Failure class prevented: silent drift between an agent's output and the next
  agent's expectations. Today the Validator→Judge manifest is described in PROSE
  inside the agent files. If the Validator's output shape changes, the Judge can
  misread it with no error — exactly the failure iii avoids by making every layer
  talk through a stable wire contract (they refactored turn-orchestrator 11→7
  states with zero neighbour changes because the wire shape held).
- Capability class unlocked: swap any engineering agent's internals without
  touching its neighbours, as long as the manifest schema validates. Makes the
  Pruning Rule safer to apply (replace a component without fear of breaking the
  chain).
- Where it would live: real JSON Schema files in `arch/schemas/` (start with
  `validator-manifest.schema.json`, consumed by Judge); Judge REJECTs on
  schema-invalid manifest (it already says "missing field = REJECT" — this makes
  that mechanical). Extend to test-writer→builder and intake→RLM handoffs later.
- Pruning review: 2026-05-29; status: speculative (awaiting retro #1).

## PAT-0004 — Invert the retro default: auto-retire-with-defense, archive never delete
- Source: conversation (2026-05-29). Operator-proposed inversion of the §3.12
  Friday retro default, after honest-feedback session on default-as-destiny.
- Date promoted: candidate (not yet promoted)
- Failure class prevented: silent harness bloat during operator absences. The
  current default is "components stay unless deleted at retro," which relies on
  operator willpower against own creations (loss aversion). The operator has
  stated 8h/wk budget with multi-week gaps; a keep-by-default harness grows
  silently during gaps. Also prevents the failure mode where 3-retro
  speculative-auto-close (§3.13) only applies to issues, not to existing
  components — meaning existing-but-useless components never auto-die today.
- Capability class unlocked: the retro inverts from "should I delete this?"
  (which licenses mumbled keep-decisions) to "why does this deserve to live?"
  (which forces articulation of failure-class-prevented). Scales constantly
  with component count instead of linearly — operator only reviews items that
  hit the threshold this week, not all 60.
- Where it would live: a NEW `bin/harness retire --shadow|--quarantine|--enforce`
  subcommand, a `retire/usage-signals.sh` collector, a small `retire/exempt.yaml`
  list, and two new directories at the project root: `attic/` (quarantine, one
  cycle) and `archive/retired/{YYYY-MM-DD}/{original-path}/` (permanent record;
  NEVER deleted — matches Memory Custodian's "never delete, only promote" rule).
  Rescue via `harness rescue <component>` which copies from attic or archive
  back to its original path. Auto-fills a new section in `templates/retro.md`
  named "Defend or let drift" with the week's candidates.

### Design constraints (load-bearing — these are what make it not break the harness)
  1. **Exempt list is small, named, hard to grow.** Hardcoded in `retire/exempt.yaml`:
     - everything under `constitution/`
     - the five Hard Rail hooks by file path
     - anything with frontmatter `dormant-by-design: true` (component author
       declares correct dormancy at design time)
     - components gated by a tier the current project isn't running
     If the exempt list grows in 3 consecutive retros, the auto-retire system
     itself becomes a candidate for retirement.
  2. **Archive, never `git rm`.** Items in `attic/` for 4 weeks without rescue
     move to `archive/retired/{date}/{path}/` with a metadata file:
     ```yaml
     retired_on: YYYY-MM-DD
     original_path: agents/browser/closed-source-researcher.md
     last_usage_signal: <date or "never">
     usage_summary: 0 invocations, 0 references, 0 mentions in 8 weeks
     rescued_at: null
     rescue_count: 0
     ```
     Items stay in `archive/` forever. Git history alone preserves anything; the
     `archive/` tree makes the graveyard browseable without git archaeology.
  3. **Composite signal, not just last-fired-date.** A component counts as "used"
     this week if ANY of: hook fired in `audit/` | agent invoked (subagent-stop
     log) | mentioned in a commit message | cited by another active component
     (static reference grep) | defended in any prior retro (counter increments).
     Just one signal is enough — bias toward keeping things alive.
  4. **Two-stage retirement with rescue.** active → attic (week N+4 with zero
     signal) → archive (week N+8 if not rescued from attic). Rescue from attic
     is one command; rescue from archive is one command (it just copies the file
     back). Mistakes are cheap to undo.
  5. **Phased rollout. NEVER give the system teeth on day one.**
     - **Shadow (4 weeks):** runs each Friday, generates a "would-have-retired"
       section in the retro file. Zero file movement. Operator compares
       judgments against own intuition; calibrates the signal.
     - **Quarantine (next 4 weeks):** items hitting threshold move to `attic/`.
       Still no archiving. `harness rescue` restores from `attic/`.
     - **Full enforcement (week 9+):** attic items > 4 weeks unrescued move to
       `archive/`. Never `git rm`. Operator can always pull from `archive/`.
  6. **This pattern is ITSELF subject to retirement.** The auto-retire system is
     a component. If it produces bad judgments (defends-required-rate > 70%
     over a quarter, or operator has had to rescue items 3+ retros in a row),
     the system is failing its own test and goes to attic.

### Risks acknowledged
  - Wrong signal could quarantine a load-bearing dormant component (Hard Rails
    fire never; Mission Drift Detector fires only when drift exists). Mitigated
    by exempt list + `dormant-by-design` frontmatter flag + tier-aware exemption +
    composite signal + shadow-first rollout.
  - Exempt-list creep recreates default-keep. Mitigated by 3-retro growth review
    of the exempt list itself.
  - "Defend or let drift" becomes a perfunctory mass-rescue (operator defends
    everything reflexively, restoring default-keep). Mitigated by requiring a
    one-sentence failure-class-prevented argument PER defended item; mute defends
    don't count.

- Pruning review: 2026-05-29; status: speculative (awaiting retro #1).
  Note: this is meta-pattern — if PAT-0001/2/3 fail to be promoted via the
  existing retro flow, that itself is evidence FOR PAT-0004.

## Anti-pattern logged (do NOT adopt)
- AP-0001 — Rebuilding the runtime as composable "workers". iii decomposes the
  runtime because no engine gave them composition. OUR runtime is Claude Code,
  which already provides the loop, tools, streaming, hooks, sessions, and subagent
  dispatch (~11 of iii's 15 jobs). Building a worker engine / WebSocket bus would
  be massive scope explosion for zero gain over what Claude Code already gives us.
  Our value-add is the governance/methodology layer, not the substrate. Source:
  iii article, 2026-05-29. Status: rejected on sight.

## PAT-0005 — Linter-rejects-bad-edit (immediate-feedback editor)
- Source: SWE-agent paper + Anthropic harness engineering, 2026-05-31
- Date promoted: candidate (not yet promoted)
- Failure class prevented: cascading failures from syntax errors. An LLM
  introduces a syntax error in an Edit; the next test run fails for what
  looks like an unrelated reason; the agent spends multiple steps chasing
  the wrong problem until context is exhausted. The SWE-agent paper's
  ablation study showed the linter-on-edit integration was among the
  highest-leverage components — catching the error at the moment of
  introduction localizes the fix before it propagates.
- Capability class unlocked: the file editor becomes self-correcting at
  the syntax layer; agent token budget shifts from "debugging ghost
  errors" to "fixing real ones."
- Where it would live: a PostToolUse hook on Edit|Write that runs the
  project's linter on just the edited file. If the linter exit > 0, the
  hook exits 2 with the linter error in stderr. The agent's next move
  is to either re-edit or revert. Tier preset declares which linter
  (eslint / ruff / mypy / etc.); the hook reads from there.
- Pruning review: 2026-05-31; status: speculative (awaiting retro #1).
- Why not built immediately: needs project-specific linter wiring; the
  tier presets declare linters but the per-project config (which lint
  rules, severity threshold for reject) is real design work. Better to
  see one Zeen edit fail this way in the wild, then build the hook
  matched to the actual failure mode.

## PAT-0006 — Throughput-aware merge philosophy
- Source: OpenAI Codex harness engineering (Aug 2025–Feb 2026), 2026-05-31
- Date promoted: candidate (not yet promoted)
- Failure class prevented: blocking merge gates that made sense when humans
  wrote every line of code become productivity killers when agents are
  generating PRs at multiples of human review capacity. OpenAI: "test
  flakes addressed with follow-up runs rather than blocking progress
  indefinitely... when agent throughput far exceeds human attention,
  corrections are cheap and waiting is expensive."
- Capability class unlocked: a coherent rule for *when* to relax merge
  gates and *which* ones. Avoids the failure mode where the operator
  reflexively keeps strict gates from a low-throughput context and ends
  up bottlenecking themselves.
- Where it would live: a section in `docs/TEST-FLOW.md` or a new
  `docs/THROUGHPUT.md` documenting:
  • At low throughput (< 1 PR/day): keep all gates strict.
  • At medium throughput (1–5 PR/day): allow flake-retry, auto-merge
    docs-only and dependency-bump PRs.
  • At high throughput (> 5 PR/day): allow auto-merge of anything that
    passes the deterministic crosscheck + Judge ACCEPT + tier-mandatory
    checks, even without human review.
  Hard Rails and the four human gates stay in place at every throughput.
- Pruning review: 2026-05-31; status: speculative (awaiting retro #1).
- Why not built immediately: the user is currently a solo builder at
  ~0 agent PRs/day. The framework is premature; the failure mode it
  prevents is one the operator hasn't yet encountered. Worth keeping
  as a doc-only PAT until throughput rises.

## PAT-0007 — Initializer Agent as a formalized role
- Source: Anthropic two-agent architecture (Initializer + Coding Agent), 2026-05-31
- Date promoted: candidate (not yet promoted)
- Failure class prevented: the "every session figures out the env from
  scratch" tax. Anthropic's harness has a DISTINCT first session with a
  distinct system prompt whose only job is scaffolding: init.sh, feature
  list, progress log, first commit. Every subsequent session is a coding
  agent that inherits that scaffolding. The role separation is what makes
  the standardized session-start ritual actually deterministic.
- Capability class unlocked: a named owner for the "scaffolding is the
  work" insight. Today our CLI + Concept Coach + Spec Author collectively
  cover this, but no single agent OWNS the standardized scaffolding
  output. Formalizing it might tighten the loop.
- Where it would live: `agents/pm/initializer.md` (or fold into Spec
  Author with explicit "initialization sub-mode"). Triggered on the
  first session of a new project; produces init.sh, feature_list.json,
  progress.log, the first 1-2 PRDs, and the first commit. Then
  hands off to the standard lifecycle.
- Pruning review: 2026-05-31; status: speculative (awaiting retro #1).
- Why not built immediately: our `harness init` + `templates/init.sh`
  + `bin/feature-list.py` + the session-start ritual doc collectively
  do what an Initializer Agent would do, just split across the CLI +
  conventions instead of a single agent prompt. Naming it a separate
  agent might be cosmetic. Decide at retro after the first Zeen session
  uses the new init.sh + session-start flow — if the boundary feels
  ragged in practice, name the agent; if it feels clean, this PAT
  closes without implementation.

## PAT-0008 — Graduate the Bache loop from agent-prompt-chain to a saved /bache-loop workflow
- Source: Anthropic Dynamic Workflows in Claude Code v2.1.154+, 2026-06-03
  (https://claude.com/blog/a-harness-for-every-task-dynamic-workflows-in-claude-code)
- Date promoted: candidate (not yet promoted)
- Failure class prevented: the Bache loop (Test-Writer → Builder →
  Validator → Judge → Promoter) is ordered. Today the ordering lives
  in agents/eng/orchestrator.md's prose, plus the Orchestrator's
  context. Failure modes the prose can't strictly prevent:
    (a) Builder runs before Test-Writer reports tests_red.
    (b) Judge ratifies a manifest the Validator didn't actually emit
        (or emitted partially).
    (c) Promoter starts when the Judge said REJECT.
    (d) Fresh-context boundary on Test-Writer/Validator is forgotten.
  A Dynamic Workflow script makes ordering mechanical: the runtime
  enforces step N+1 cannot start until step N returns.
- Capability class unlocked: the loop becomes deterministic, replayable
  ('/bache-loop feature=fraction-to-percentage refs_err=ERR-0001'),
  resumable mid-pipeline, and observable via /workflows. Plus: it can
  fan out at the per-AC level (run cross-checks in parallel after the
  Builder reports green).
- Where it would live: `.claude/workflows/bache-loop.js` in each
  project, copied/derived from `templates/workflows/bache-loop.example.js`
  in the central harness. The agents/eng/*.md prompts STAY (they're
  the spec; the workflow is the executable implementation). If they
  drift, the prompt wins and the workflow is regenerated.
- Pruning review: 2026-06-03; status: speculative (awaiting retro #1).
- Why not built immediately: the failure modes above are HYPOTHESES.
  The Bache loop has never run end-to-end on a real Zeen feature.
  Building a workflow to enforce ordering before observing the
  ordering ever fail is exactly the build-before-validate failure mode
  the harness exists to prevent. Run the Zeen fraction→percentage
  pilot first; if the Orchestrator's prose discipline holds, this PAT
  may auto-close at 3 retros without implementation. If the order
  breaks even once, promote and implement immediately.
- Related: the four human gates STILL bind. The workflow ends at the
  Promoter's ACTION REQUIRED for prod deploy (Exception #2), never
  auto-deploys. The five Hard Rail hooks fire inside the workflow's
  subagent calls just as they do in conversations.

## PAT-0009 — MCP server presets keyed by project stack
- Source: ECC harness (affaan-m/ecc, mcp-configs/mcp-servers.json), 2026-06-03
- Date promoted: candidate (not yet promoted)
- Failure class prevented: every new project rediscovers which MCP servers
  it needs (GitHub for code+issues, Playwright for E2E, PostHog for
  telemetry, Supabase for DB, Vercel for deploy, Stripe for billing, etc.).
  Currently `harness init` doesn't seed any. Each project's first session
  burns time figuring out which MCPs to wire and where to put their config.
- Capability class unlocked: `harness init <project> --stack=nextjs-prisma-vercel`
  (or detected from package.json) seeds `.claude/mcp.json` with the right
  preset. Aligns with our other init scaffolding (init.sh template,
  workflows/README seed).
- Where it would live:
    templates/mcp-presets/nextjs-prisma-vercel.json
    templates/mcp-presets/fastapi-postgres.json
    templates/mcp-presets/static-site.json
    templates/mcp-presets/README.md
  Plus a `harness init --stack=...` flag (or auto-detection from package.json
  + pyproject.toml). For Zeen specifically: GitHub MCP + Playwright MCP +
  PostHog MCP.
- Pruning review: 2026-06-03; status: speculative (awaiting retro #1).
- Why not built immediately: building 5–7 preset JSONs on speculation is
  exactly the breadth-over-depth pattern ECC's 261 skills exemplify and the
  Pruning Rule warns against. Wait until Zeen's first MCP wiring shows
  which preset would have saved real friction; build that one preset, not
  a library.

## PAT-0010 — contexts/ mode-specific system prompt injection
- Source: ECC harness (affaan-m/ecc, contexts/dev.md+review.md+research.md), 2026-06-03
- Date promoted: candidate (not yet promoted)
- Failure class prevented: today a Claude session can't be put into a
  durable "I'm reviewing this week's outputs, explain don't act" mode, or
  a durable "I'm researching, don't write code, cite sources" mode. The
  operator has to re-state the mode each turn. ECC adds short context files
  injected at session-mode set time.
- Capability class unlocked: `/mode research` / `/mode review` / `/mode build`
  (or similar) sets a session flag; UserPromptSubmit hook reads it and
  appends the corresponding `contexts/<mode>.md` to every prompt for the
  remainder of the session.
- Where it would live:
    contexts/research.md (Mom Test discipline + capped-output + cite-or-kill)
    contexts/review.md (explain, don't edit; surface candidates for retro)
    contexts/build.md (the Bache loop discipline + R4 + state taxonomy)
    hooks/userpromptsubmit/mode-injector.sh
- Pruning review: 2026-06-03; status: speculative (awaiting retro #1).
- Why not built immediately: Claude Code has native plan/auto/effort modes
  that may already cover the relevant axes. Don't add a parallel mode
  system before seeing whether the native one falls short on a real Zeen
  task. If a Zeen retro reports "I kept having to re-instruct Claude to
  stay in research mode," promote this PAT and build it.

## PAT-0011 — Claude Code plugin manifest for one-command distribution
- Source: ECC harness (affaan-m/ecc, .claude-plugin/ directory), 2026-06-03
- Date promoted: candidate (not yet promoted)
- Failure class prevented: today our harness installs via clone +
  propagate.sh + manual PATH symlink. Three steps. A Claude Code plugin
  manifest would let `claude plugins install <ours>` do it all.
- Capability class unlocked: lower-friction distribution if/when the
  harness is shared beyond the operator. Per V1 §3.12 the harness is
  meant to be the central authority across multiple projects — easier
  install = more projects under the harness = the Pruning Rule running
  on more retros = better harness.
- Where it would live:
    .claude-plugin/plugin.json (manifest)
    .claude-plugin/post-install.sh (run propagate.sh into target)
- Pruning review: 2026-06-03; status: speculative (awaiting retro #1).
- Why not built immediately: (a) Claude Code plugin spec is still
  evolving; coupling now risks rework. (b) the harness currently has one
  user (you) on two projects (the harness itself + Zeen). Distribution is
  not yet a friction. Build when a third project under the harness is on
  the horizon.

## PAT-0012 — Per-language rules/ directory (deliberate skeptical log)
- Source: ECC harness (affaan-m/ecc, rules/typescript/+python/+golang/+...), 2026-06-03
- Date promoted: candidate (not yet promoted)
- Failure class prevented: agents writing inconsistent code across files in
  a greenfield project. ECC's pattern: per-language style + testing +
  patterns rules that always apply.
- Capability class unlocked: in theory, code consistency without relying
  on the project having an existing style to match.
- Honest skepticism: the project's actual tooling configs (eslint, ruff,
  black, gofmt, prettier) already enforce most of this MECHANICALLY. Prose
  rules duplicate the mechanical config and rot when the config changes.
  Probably the wrong level of abstraction for our discipline-over-breadth
  posture.
- Pruning review: 2026-06-03; status: SPECULATIVE WITH HEAVY PRIOR-AGAINST.
  Logged for retro completeness but expected to auto-close at 3 retros
  unless evidence surfaces that tooling configs aren't enough.
