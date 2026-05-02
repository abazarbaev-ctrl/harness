# HARNESS-V1.md

**The consolidated, pruned, ship-ready blueprint for an autonomous AI-coding harness for a non-coder solo builder.**

Version 1.0 — May 2026
Status: implementation-ready, Phase 0 starts now
Owner: Almaz (operator); Claude Code (executor)

---

## 0. How to use this document

This is the canonical specification. It supersedes all four prior synthesis documents in the conversation that produced it. Where this document and a prior pass disagree, this document is correct.

The document has three layers:

- **Section 1 — Constitution.** Non-negotiable. Every project under the harness inherits this verbatim.
- **Section 2 — Architecture.** The agent topology, the file layout, the lifecycle, the message templates. Adapts per project tier but the structure is fixed.
- **Section 3 — Implementation plan.** What gets built when. Phase 0 starts this week. Each phase ships a working harness AND a piece of a real product.

Read Section 1 once, in full. Read Section 2 by reference as needed. Execute Section 3 in order.

---

## SECTION 1 — CONSTITUTION

### 1.1 The Four Authority Rules

These four rules sit at the top of every project's `CLAUDE.md` and `AGENTS.md`. They are not suggestions.

**R1 — The Agent Acts by Default.** Anything that can be automated will be. The agent escalates to the human only under the Five Exceptions:

1. Destructive and irreversible (drop database, force-push, delete unique work, send mass email, spend money, sign legal agreement, public statement).
2. Affects production or real users (turn flag on for >0%, deploy to 100%, change user-visible string, change pricing or billing logic, run migration on prod data).
3. Money, legal, or compliance (any spending, any TOS sign, any PHI/PII at T2+, any financial change at T3, marketing or legal copy).
4. Human judgment (taste, strategic direction, vendor selection, real user research interviews — the human does the interviews, the agent drafts the questions).
5. Real-world physical action (go to bank, call this person, sign paper, be on camera).

For everything else, the agent acts. When the agent does ask the human to do something, it must explain in one sentence why it can't do it itself, in plain language.

**R2 — The PM Harness, the Design Harness, and the Engineering Harness Are Peers. They Propose, They Never Block.** Each peer can voice strong dissent (kill, pivot, reframe) with explicit pros and cons and a recommendation. The human decides. Dissent is always logged in `pm/decisions.log.md` (or the corresponding harness's log).

Peers communicate only when necessary. The Design harness specifically does not bother the human with questions when there is no real UX/UI issue worth addressing — it has a Necessity Detector that decides when to engage and when to stay silent.

**R3 — The State Is What the Status Says.** No feature is "done," "shipped," "deployed," "live," or "released" except via the seven-state taxonomy:

| State | Meaning | Visible to real users? |
|---|---|---|
| PLANNED | Idea or PRD exists. No mockup, no code. | No |
| MOCKED-UP | Clickable prototype exists. No real backend. | Maybe (link sharing) |
| CODED | Code written, tests pass locally. Not deployed. | No |
| ON STAGING | Deployed to non-production. | No, internal only |
| BEHIND FLAG | In production but flag is OFF for everyone. | No |
| ROLLING OUT | Flag ON for some % of real users. | Some (specify %) |
| GENERALLY AVAILABLE | Flag removed or 100% on. All real users see it. | Yes, all |

Coder shorthand without a state qualifier is a hook-level violation. The `state-clarifier` PreToolUse hook rewrites any message containing "shipped/deployed/live/released" without a state.

**R4 — Every Bug Becomes a Regression Test Before the Fix Is Accepted.** The Validator (fresh context, adversarial) refuses to merge a fix until a failing test reproduces the bug. ERR-XXXX entries in `learnings/failures.md` must pair to a regression test in `tests/regression/` or a regression eval in `evals/regressions/`. The Promoter agent enforces this mechanically: a PR claiming to fix `ERR-XXXX` must contain a test referencing `ERR-XXXX`, and that test must have been red on a prior commit (verified via git log). Only the Five Exceptions process can override.

### 1.2 The Five Hard Rails (settings.json deny lists, hooks)

These run outside the model and cannot be talked around:

1. **No destructive ops without fresh-context human confirmation.** PreToolUse Bash hook denies (regex match) `rm -rf /`, `rm -rf ~`, `git push.*--force`, `git reset --hard`, `chmod -R 777`, `dd if=`, `mkfs.`, `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`, `DELETE FROM .* WHERE 1=1`, `terraform destroy`, `kubectl delete namespace`, `volumeDelete`, fork bombs.
2. **No reads of secrets.** PreToolUse Read hook denies `.env`, `.env.*`, `**/secrets/**`, `**/*credential*`, `**/*token*`, `**/*api_key*`, `**/*.pem`, `**/*.key`, `**/*.p12`, `**/*.pfx`, `~/.aws/credentials`, `~/.config/gcloud/**`, `~/.kube/config`.
3. **No npm publish without allowlist + size check.** Pre-publish hook runs `npm pack --dry-run`, blocks if any `*.map` is present (Claude Code leak lesson, March 31, 2026), if size exceeds threshold, or if files outside `package.json:files` allowlist are included.
4. **The agent never holds production credentials.** Production env vars live only in the deployment platform. Agent works against staging. Production deploys go through a CI workflow the human triggers with a signed approval token. (PocketOS lesson, April 24, 2026.)
5. **All retry loops have circuit breakers.** Any loop the agent runs (Ralph, autocompact, eval retries) has a hard cap on iterations and wall-clock time. The Claude Code v2.1.88 leak revealed `MAX_CONSECUTIVE_AUTOCOMPACT_FAILURES = 3`; harness adopts the same posture: 3 consecutive failures = stop and report.

### 1.3 The Tier System

Each project picks one tier at the start. Tier sets which gates are mandatory.

| Tier | Examples | Test rigor | Monitoring | Compliance |
|---|---|---|---|---|
| T0 | Internal demo, prototype, hackathon | Smoke only | None / minimal | None |
| T1 | Standard B2C/B2B SaaS, marketing site | Pyramid + 70% line + Semgrep | PostHog or equivalent | SOC2-lite hygiene |
| T2 | HIPAA, SOC2 Type II, GDPR-regulated | + contract tests, + adversarial evals, 80% line, 60% mutation, audit log | PostHog HIPAA / Freshpaint | BAAs, encryption at rest + in transit, RBAC |
| T3 | Clinical SaMD, fintech transactional, EU AI Act high-risk | + property-based, + fuzzing, + chaos, 90% line, 75% mutation, signed audit chain | self-hosted PostHog / Piwik PRO + GrowthBook | DPIA, dual-control prod deploy, drift monitoring |

Tier is set in `harness/config.yaml` and drives which hooks fire, which gates are mandatory, which industry test corpora load.

### 1.4 The Pruning Rule

Every agent, skill, hook, file, and ritual in the harness must demonstrably prevent a failure class or unlock a capability class. If you can't articulate the failure it prevents, delete it. Apply this monthly.

---

## SECTION 2 — ARCHITECTURE

### 2.1 The 5-Stage Lifecycle

```
DISCOVER  →  CONSTITUTE  →  PLAN  →  EXECUTE  →  HARDEN & RELEASE
   ↑                                                       │
   └───────────────── retro + learnings ───────────────────┘
```

- **Discover.** Concept clarification, user research, JTBD, personas, scenarios, mockups (if UI), feature list, MVP scope. Owned by PM harness; Design engages if UI surface exists; Engineering on standby. Output: PRD, scenarios.feature, mockup-spec, design-tokens delta. Human approves the product spec.
- **Constitute.** Architecture spec, data model, integrations, tier confirmation, monitoring config, eval suite scaffold. Output: `arch/`, `monitoring/event_catalog.yaml`, `evals/` skeletons. Human approves the architecture spec.
- **Plan.** Phase plan in XML, tasks with blast-radius tags, acceptance criteria, rollback plan per task. Output: `.planning/phase-{N}/PLAN.md`. Human signs off the phase plan (one human gate per phase, not per task).
- **Execute.** Test-Writer (fresh context, spec-only) writes failing tests; Builder (full context) makes them pass; Validator (fresh context, adversarial) attacks; Judge ratifies. Atomic commits per task. The harness runs autonomously.
- **Harden & Release.** Production-Readiness Checklist, threat model review, eval regression suite, staging dry-run on prod-shaped data, rollback plan documented, backups verified. Human approves production deploy. Post-deploy: real-user monitoring, hypothesis loop, A/B tests, retrospective, learnings → AGENTS.md → settings.json → Skill promotion.

### 2.2 The Three Peer Harnesses

```
                    ┌─────────────────────────┐
                    │       HUMAN (you)       │
                    │  approves, decides,     │
                    │  talks to clients,      │
                    │  sets strategy          │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
         ┌─────────┐        ┌─────────┐        ┌──────────────┐
         │   PM    │◄──────►│ DESIGN  │◄──────►│ ENGINEERING  │
         │ HARNESS │        │ HARNESS │        │   HARNESS    │
         └────┬────┘        └────┬────┘        └──────┬───────┘
              │                  │                     │
              └──────────────────┼─────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   SHARED CONSTITUTION   │
                    │   (R1–R4 + hard rails)  │
                    └────────────┬────────────┘
                                 │
       ┌────────────┬────────────┼────────────┬────────────┐
       ▼            ▼            ▼            ▼            ▼
   ┌────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
   │ CLIENT │ │ MONITOR  │ │ BROWSER │ │   SELF-  │ │ MISSION- │
   │INTERFACE│ │   & A/B  │ │ & CLI   │ │  IMPROVE │ │  DRIFT   │
   └────────┘ └──────────┘ └─────────┘ └──────────┘ └──────────┘
```

Peers communicate only when necessary. Design specifically uses the Necessity Detector to decide whether to engage on each new feature; if a feature is backend-only or has no real UX/UI question, Design stays silent.

Parallelism rule: two agents can run concurrently only when they touch non-overlapping files. Each concurrent agent gets its own `git worktree` (Boris Cherny pattern). The Orchestrator analyzes file-overlap before dispatching workers; same-file collisions are physically impossible, so the Cognition warning ("don't build multi-agents") doesn't apply to file-disjoint parallelism.

### 2.3 The Pruned Agent Roster (22 agents)

After applying the pruning rule, the canonical roster:

**PM Harness (4)**
1. **Concept Coach** (Sonnet) — JTBD, problem framing, Mom Test discipline, dissent log.
2. **User Researcher** (Sonnet) — interview script generation, persona synthesis (folded), JTBD writing.
3. **Scenario Writer** (Sonnet) — Gherkin scenarios, Example Mapping, edge-case enumeration.
4. **Spec Author** (Sonnet) — PRD + arch spec; promotes triaged client requests to specs.

**Design Harness (4)**
5. **Concept Designer** (Sonnet) — translates concept brief into design direction, three contrasting moods.
6. **Design System Custodian** (Sonnet) — owns tokens, components, patterns per project.
7. **UI Composer** (Sonnet, with Claude Design + v0/Lovable as tools) — three-approach screen designs with pros/cons.
8. **UX Critic** (Sonnet, fresh context, adversarial) — design review + Necessity Detector role + accessibility audit.

**Engineering Harness (7)**
9. **Orchestrator** (Opus) — coordinates engineering execution, decomposes plans.
10. **Researcher** (Sonnet) — codebase exploration, library research.
11. **Test-Writer** (Sonnet, fresh context, spec-only) — RED tests from scenarios; never reads Builder diffs.
12. **Builder** (Sonnet) — implements until tests are green; never modifies tests.
13. **Validator** (Sonnet, fresh context, adversarial) — attacks the artifact; runs full pyramid + mutation + evals + SAST + perf; structured verdict.
14. **Judge** (Haiku) — ratifies Validator verdict; reads structured manifest only.
15. **Promoter** (Sonnet) — release gate, ERR-pairing audit, signed-token CI deploy.

**Client Interface (2)**
16. **Feedback Intake** (Sonnet) — handles all channels (point-and-annotate, Telegram, web portal, email); normalizes; triages; deduplicates; routes.
17. **Request Lifecycle Manager** (Sonnet) — owns request from intake to closure; computes degree-of-implementation; clarification asks; status visibility; Change Tour composition.

**Monitoring & Experimentation (2)**
18. **Telemetry Instrumenter** (Haiku, co-located with Builder) — auto-wires events from feature flags + scenarios.
19. **Experiment Analyst** (Sonnet) — Hypothesis Generator + A/B Designer + Result Interpreter + Roll-out Recommender merged. Runs weekly on telemetry; designs experiments; interprets results; recommends ship/kill/iterate.

**Browser & CLI (2)**
20. **Browser Operator** (Sonnet) — picks Computer Use vs Playwright per task; runs scripted E2E; runs exploratory tests; logs all sessions.
21. **Closed-Source Researcher** (Sonnet, subagent of Web Watcher) — runs in authenticated browser sessions for X/Twitter, LinkedIn, paywall research.

**Self-Improvement & Mission (2)**
22. **Web Watcher** (Opus lead + Haiku subagents) — weekly cron, multi-agent fan-out across the curated source list, submits PRs to central harness repo.
23. **Mission Drift Detector** (Sonnet) — weekly review of four signal classes (strategic news, product reality, founder reality, combined evidence); generates Evidence Cards; emits Mission Update proposals.

**Memory (1)**
24. **Memory Custodian** (Haiku, nightly) — `regression-map.json`, `requests/index.json`, `flags.yaml` ↔ requests cross-reference, `client-profiles/`, `lessons/`, three-tier memory consolidation.

That's 22 distinct agents (Web Watcher counts as one logical agent with subagent fan-out). Down from a peak of ~36 across all the prior passes. Cuts that hurt to make are listed in the appendix; each cut is justified by the pruning rule.

### 2.4 The Communication Templates (5)

Every harness-to-human message uses one of these. No others.

**🟦 STATUS UPDATE**
```
Status — {feature_name}
State: {one of seven states}
Visible to users: {yes/no, with %}
What just happened: {plain English, ≤2 sentences}
Confidence: {high/medium/low}
What's next: {next action, owner: agent or you}
```

**🟨 DECISION NEEDED**
```
Decision needed — {topic}
Context (plain English, 2–4 sentences, no jargon)

Options:
  A. {name} — Cost/Best/Worst/Reversibility
  B. {name} — Cost/Best/Worst/Reversibility
  C. Defer (do nothing) — Opportunity cost

My recommendation: {A/B/C} because {one sentence}.
My confidence: {low/medium/high}.

Reply with A/B/C or ask me anything.
```

**🟧 ACTION REQUIRED**
```
Action required — {what}

Why I can't do this myself:
{one of Five Exceptions, named explicitly}

Exactly what I need you to do:
1. {step}
2. {step}

When done: reply "done" or paste result.
Estimated time for you: {minutes}.
```

**🟩 SUCCESS**
```
Success — {what}
State change: {old} → {new}
What it means: {1 sentence plain English}
What changed for real users: {explicit yes/no, with %}
Logs: {link}
Next milestone: {what, when, who}
```

**🟥 PROBLEM**
```
Problem — {short title}
What broke: {1 sentence}
Real-user impact RIGHT NOW: {explicit numbers or "0 users"}
What I've already done: {automatic mitigations}
What I'm about to do unless you say stop: {planned, with reversibility}
What I can't do without you: {if anything; with WHY}
ETA to resolution if you say go: {minutes}
```

**Hook-enforced.** The `plain-language-translator` PostToolUse hook scans agent output for jargon ("merged", "deployed", "PR is up", "tests are green", "rolled back", "feature-flagged", "instrumented") and either translates or flags. Coder shorthand without translation is rewritten before the human sees it.

### 2.5 The Project File Layout

```
{project-root}/
├── .harness-version                    # pins central repo version
├── .harness-overrides/                 # project-specific deltas
├── CLAUDE.md                           # imported from central + project overrides
├── AGENTS.md                           # imported from central
├── .claude/
│   ├── settings.json                   # tier preset
│   ├── skills/                         # symlinks to central + local
│   ├── hooks/                          # symlinks to central + local
│   └── agents/                         # symlinks to central
├── pm/
│   ├── concept-brief.md
│   ├── lean-canvas.md
│   ├── personas.md
│   ├── jtbd.md
│   ├── decisions.log.md
│   ├── interviews/
│   └── premature_solutions.md
├── design/
│   ├── tokens.json                     # W3C draft format
│   ├── tokens.delta.json
│   ├── themes/
│   ├── moodboards/                     # the 3 initial approaches
│   ├── mockups/                        # by feature
│   ├── storybook/
│   ├── decisions/                      # ADRs for design
│   ├── regression-snapshots/
│   └── necessity-log.md                # silent-skip log
├── spec/
│   ├── prd/                            # one PRD per feature
│   ├── scenarios/                      # *.feature files (Gherkin)
│   ├── example-maps/
│   └── open-questions.md
├── arch/
│   ├── adr/                            # Architecture Decision Records
│   ├── diagrams/
│   └── fitness-functions/              # archunit/depcruise/etc configs
├── src/                                # the actual code
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   ├── e2e/
│   ├── property/
│   ├── mutation/
│   ├── perf/
│   ├── security/
│   └── regression/                     # paired with ERR-XXXX
├── evals/
│   ├── capability/
│   ├── refusal/
│   ├── safety/
│   ├── bias/
│   ├── adversarial/
│   ├── regressions/
│   ├── drift/
│   └── judges/
├── monitoring/
│   ├── event_catalog.yaml
│   └── monitoring-config.yaml
├── experiments/
│   ├── proposed/
│   ├── running/
│   └── completed/
├── client/
│   ├── feedback/                       # raw intake
│   ├── requests/                       # normalized REQ-XXXX
│   ├── conversations/
│   └── profiles/                       # per-client
├── tour/
│   ├── releases/{version}/             # per-release tour scripts
│   └── clients/{client_id}/            # per-client tour state
├── audit/                              # transcripts, signed-token logs (T2+)
├── learnings/
│   ├── failures.md                     # → ERR-XXXX → hooks/skills
│   └── patterns.md
├── .planning/
│   └── phase-{N}/                      # per-phase artifacts
└── .github/workflows/                  # signed-token CI
```

### 2.6 The Central Harness Repo Layout

```
acme-harness/
├── constitution/
│   ├── CLAUDE.md.tmpl
│   ├── AGENTS.md.tmpl
│   └── settings.json.tmpl
├── agents/                             # system prompts, versioned
├── skills/                             # frontmattered Claude Code skills
├── hooks/                              # PreToolUse, PostToolUse, etc.
├── templates/                          # PRD, scenarios.feature, mockup-spec, etc.
├── tier-presets/
│   ├── tier0.yaml
│   ├── tier1.yaml
│   ├── tier2.yaml
│   └── tier3.yaml
├── watch/
│   ├── sources.yaml
│   ├── findings/
│   └── proposed/
├── learnings/
│   ├── failures.md
│   └── patterns.md
└── propagate.sh
```

A project's `.harness-version` pins which version of the central repo it tracks. `propagate.sh` is a Ralph-style loop: pull, three-way-merge against project overrides, run validation, request human approval, apply.

### 2.7 The Hard-Rail Hooks (drop-in)

Located in `acme-harness/hooks/`. Symlinked from each project's `.claude/hooks/`.

- `pretooluse/forbidden-bash.sh` — destructive-ops deny list (Hard Rail 1).
- `pretooluse/secrets-scan.sh` — secrets read deny list (Hard Rail 2).
- `pretooluse/no-prod-creds.sh` — refuses if env contains prod URLs without `--allow-prod-readonly` flag.
- `pretooluse/state-clarifier.sh` — rewrites coder shorthand for human-facing messages (R3).
- `precommit/depcruise.sh` — dependency-cruiser fitness function (T1+).
- `precommit/archunit.sh` — module boundary check (T2+).
- `prepublish/npm-allowlist.sh` — Hard Rail 3.
- `posttooluse/auto-format.sh` — autoformat after writes (Boris Cherny pattern).
- `subagent-stop/transcript-archive.sh` — store transcripts to `audit/`.
- `precompact/backup-transcript.sh` — Hard Rail 5 (autocompact circuit breaker).

### 2.8 Tooling Defaults — Locked

Where prior passes drifted, these are the canonical choices:

- **Frontend**: React + Vite + TypeScript. Tailwind + shadcn/ui.
- **Backend**: FastAPI for ML-adjacent, Hono or Next.js for everything else.
- **Database**: Postgres on Supabase or Neon. SQLite only for prototypes.
- **Auth**: Auth provider (Clerk, Supabase Auth, Firebase Auth). Never roll your own.
- **Hosting**: Vercel for frontend + serverless. Railway or Fly.io for long-running services.
- **Background jobs**: Trigger.dev or Inngest. Never cron in app code.
- **Type-flow backbone**: Zod as schema source of truth. tRPC for internal frontend↔backend. oRPC or ts-rest for public APIs needing OpenAPI. gRPC + Buf for service-to-service.
- **Tests**: Vitest (TS) / pytest (Py). Playwright for E2E. Pact for cross-service contracts. Stryker (TS) / mutmut (Py) for mutation. fast-check (TS) / Hypothesis (Py) for property-based.
- **CI/CD**: GitHub Actions.
- **Errors**: Sentry from day one.
- **Analytics**: PostHog (T0–T2) or Statsig (when scale > 1M MAU). Freshpaint for HIPAA T2+.
- **Feature flags**: PostHog flags (or LaunchDarkly if SOC2 customer-mandated).
- **A/B testing**: PostHog (T0–T1), Statsig or GrowthBook (T2+).
- **Visual regression**: Argos for Playwright. Chromatic if Storybook present.
- **Design**: Claude Design as primary tool; v0.dev / Lovable / Bolt as project-fit alternatives. Storybook + W3C design tokens as the contract.
- **In-app tour**: Driver.js (MIT) for vanilla; React Joyride (MIT) for React; Onborda for Next.js.
- **Annotation SDK**: custom 30–50KB widget on `html2canvas-pro`. No commercial SDK.
- **Telegram bot**: aiogram (Python).
- **STT**: Deepgram for English + Russian; Whisper self-hosted for Kazakh/Kyrgyz/Uzbek.
- **Browser agent**: Playwright as workhorse with stored cookies; Anthropic Computer Use API for hard cases (Twitter/X anti-bot, sites that block headless).
- **SAST/SCA**: Semgrep + Snyk. Trivy for containers. Gitleaks for secrets.
- **Models**: Opus 4.6 for Orchestrator. Sonnet 4.6 for Researcher/Builder/Validator/Test-Writer. Haiku 4.5 for Judge/Triage/Memory Custodian. Avoid Opus 4.7 unless tokenizer overhead is benchmarked per-project.

### 2.9 Adaptive Behavior

`harness/config.yaml` per project sets tier, industry, compliance scope, data classes, regions, languages, active agents/hooks/skills, eval thresholds, deploy gates, token budgets, client interface channels, design preferences. Tier 0 turns off most gates; T1 enables warnings; T2 enables hard gates and audit; T3 enables everything plus dual-control deploy.

---

## SECTION 3 — IMPLEMENTATION PLAN

### 3.1 The Pilot Project

**Pilot: Zeen.** Not AIRIS. Zeen is greenfield, your stated 8 hours/week matches the harness's target rhythm, and ships a real user (your sons). AIRIS is too far along; retrofitting fights you. AIRIS gets the harness only after Zeen has proven it.

### 3.2 Phase 0 — This Week (Days 1–3)

**Goal: Constitution + State + Communication + Hard Rails are live in one repo. Verification tests PASS.**

Concrete deliverables:
1. Create `harness` repo on GitHub. Private.
2. Write `constitution/CLAUDE.md`, `constitution/AGENTS.md`, `constitution/settings.json`.
3. Implement the five hard-rail hooks.
4. `tier-presets/tier0.yaml`, `propagate.sh`, two verification tests.
5. Run both tests. Both must PASS.
6. Commit and push.

**Phase 0 success criterion (testable):** `git push --force` is blocked by the hook; "deployed" without state qualifier triggers R3 reminder.

**Time estimate:** 2–3 days.

### 3.3 Phase 1 — Engineering Harness Hardening (Week 1)

**Goal: Test-Writer + Builder + Validator + Judge + Promoter loop runs autonomously on a Zeen feature.**

Deliverables:
1. System prompts for the seven engineering agents.
2. Skills: `tdd-red-green-refactor`, `bdd-example-mapping`, `ralph-loop` (T0 only).
3. Hooks: dependency-cruiser PostCommit (T1+), ArchUnit PostCommit (T2+).
4. R4 enforcement: pre-merge check that scans PRs for `Refs-ERR:` and verifies regression test was red on prior commit.
5. Run one real Zeen feature end-to-end through the loop.

**Phase 1 success criterion:** the loop ran without manual intervention except at the four authorized gates.

### 3.4 Phase 2 — PM Harness MVP (Week 2)

**Goal: Concept Coach + Scenario Writer take Zeen's next feature from idea to PRD.**

Deliverables:
1. System prompts for Concept Coach, User Researcher, Scenario Writer, Spec Author.
2. Templates: `prd.md`, `lean-canvas.md`, `concept-brief.md`, `scenarios.feature`.
3. Dissent log mechanism.
4. Handoff protocol: PRD + scenarios.feature reaches Engineering's Orchestrator.

**Phase 2 success criterion:** a feature shipped that you can point to and say "this is what was asked for, exactly."

### 3.5 Phase 3 — Design Harness MVP (Week 3)

**Goal: For Zeen features with UI, Design produces three approaches with pros/cons before architecture is committed.**

Deliverables:
1. System prompts for Concept Designer, Design System Custodian, UI Composer, UX Critic.
2. Necessity Detector skill.
3. Claude Design integration.
4. Storybook + design tokens setup.
5. Three-approach discipline enforced.
6. Visual regression via Argos.

**Phase 3 success criterion:** for backend-only features, Design correctly STAYS SILENT. For UI features, three approaches arrive with pros/cons.

### 3.6 Phase 4 — Tier-Adaptive Monitoring (Week 4)

**Goal: PostHog wired up, events auto-instrumented from scenarios, dashboard for Zeen visible.**

### 3.7 Phase 5 — Hypothesis & A/B Loop (Week 5)

**Goal: Experiment Analyst proposes hypotheses from real Zeen usage; you approve one; harness designs and runs the experiment.**

### 3.8 Phase 6 — Client Interface Subsystem (Week 6–7)

**Goal: First feedback partner can submit a request via point-and-annotate or Telegram, the harness triages, you approve, it ships, the client sees a Change Tour.**

Deliverables:
1. Custom 30–50KB annotation SDK with `html2canvas-pro`.
2. Telegram bot (aiogram, Russian + English minimum).
3. Web portal (Linear-like, embeddable).
4. Feedback Intake + Request Lifecycle Manager agents.
5. Change Tour with Driver.js or React Joyride.
6. Dual-build segregation: feedback code never in public production.
7. Five client-facing message templates.

### 3.9 Phase 7 — Self-Improvement Subsystem (Week 8)

**Goal: Web Watcher runs weekly, submits PRs to central harness repo, you review and merge.**

### 3.10 Phase 8 — Browser & CLI + Mission Drift (Week 9)

**Goal: Harness self-tests Zeen via Playwright; Mission Drift Detector runs weekly.**

### 3.11 Phase 9 — Tier Hardening (when needed)

Triggered by project tier change, not by calendar. When AIRIS or another project enters T2/T3, harden: HIPAA configuration, BAA tracking, audit pipeline, mutation testing required, full audit-grade analytics, event-sourcing where needed.

### 3.12 The Implementation Discipline (Non-Negotiable)

Three commitments that prevent "we designed but never built":

1. **The harness lives in a real repo.** Every agent file, every hook, every skill is committed. Pasting prompts into Claude Code chat does not count.
2. **Friday retro, 30 minutes, written.** Names which harness components helped this week and which didn't. The components that didn't help get **deleted**, not iterated.
3. **Every harness change is a PR to the central harness repo.** Even your own changes. Even Web Watcher's. You approve or reject. This prevents drift across projects.

### 3.13 Open-Issue Tracking

Every recommendation in HARNESS-V1 that is not yet implemented becomes an issue in the harness repo with a tier label, a phase label, and a "load-bearing" or "speculative" label set by the Friday retro. Speculative issues that have been speculative for 3 retros without becoming load-bearing get **closed without implementing**.

---

## APPENDIX A — Cuts Made During Pruning

| Original agent/component | Decision | Reason |
|---|---|---|
| Persona Synthesizer | Folded into User Researcher | A persona without research is theatre |
| Feature Prioritizer | Cut | Prioritization is human judgment (R1.4); RICE is a tool, not an agent |
| Migration Planner | Folded into Update Synthesizer | Same artifact, no context handoff value |
| Mockup Designer | Replaced by Design Harness's UI Composer + Concept Designer | Design promoted to peer harness |
| Result Interpreter | Merged into Experiment Analyst | Same artifact, sequential, no isolation value |
| Roll-out Recommender | Merged into Experiment Analyst | Same |
| Tour Targeting Engine | Cut, became deterministic skill | Algorithm, not reasoning |
| Spec Promoter | Cut | Spec Author already handles this |
| Voice Transcriber | Cut, became tool call | STT is tool, not reasoning |
| Implementation Linker | Cut, became hook | Conventional commits + CI hook is deterministic |
| Reaction Processor | Folded into Feedback Intake | Reactions are typed feedback events |
| Annotation Triager | Folded into Feedback Intake | Single triage path for all channels |
| Calendar Watcher | Cut, became YAML + cron | Schedule, not agent |
| E2E Runner | Cut | Test-Writer produces tests, CI runs them, Validator reads results |
| Visual Self-Checker | Folded into Validator | Validator already covers visual regression |
| Closed-Source Watcher | Folded into Web Watcher (as subagent) | Already a fan-out subagent pattern |
| Evidence Cardinator | Folded into Mission Drift Detector | Same agent does detect → format → propose |
| Mission Revision Composer | Folded into Mission Drift Detector | Same |

**Total: 14 cuts, 4 merges. Final count: 22 agents.**

## APPENDIX B — Contradictions Resolved

| Contradiction | Earlier passes | Final resolution |
|---|---|---|
| Mockup Designer location | PM harness vs Design peer harness | Design is third peer harness; UI Composer + Concept Designer replace Mockup Designer |
| TDD discipline | Some passes lean toward Ralph autonomy | Bache pattern wins: Test-Writer separate from Builder, fresh context, only Builder writes implementation |
| Multi-agent vs monolithic | Anthropic 90.2% lift vs Cognition warning | Multi-agent for research and validation; monolithic loop for implementation; file-disjoint parallelism allowed |
| Self-improvement autonomy | Some passes implied auto-merge | Human approves all PRs; Web Watcher submits, never merges |
| PostHog vs Statsig | Both recommended in different passes | PostHog T0–T1; Statsig at scale (>1M MAU) or rigorous experimentation needs |
| Driver.js vs Shepherd.js | Mixed | Driver.js (MIT) default; Shepherd.js only with commercial license |
| Mutation score thresholds | Different numbers | T0 none, T1 60% critical, T2 60% repo / 75% critical, T3 75% repo / 85% critical |
| Opus 4.6 vs 4.7 | Implicit upgrade assumption | Stay on 4.6 unless project benchmarks 4.7 net win |

## APPENDIX C — What's Deliberately NOT in V1

These came up in research but are explicitly out of scope for V1. Candidates for V2 only after V1 ships and runs Zeen end-to-end:

- BMAD's seven-agent simulation and 86 skills.
- Augment Intent / Tessl living-spec platforms.
- Spec-Kit, GSD, OpenSpec full integration.
- L5 full autonomy (Huntley-style auto-deploy to prod).
- Full Bloom benchmark suite (only the 4 shipped).
- Self-hosted PostHog at T3 (use cloud first).
- Custom Claude Code rewrites or open-source ports.
- More than 5 languages in the Telegram bot at start.

These get added if and when retros prove they earn their keep.

---

**End of HARNESS-V1.md.**

Phase 0 starts when you say go.
