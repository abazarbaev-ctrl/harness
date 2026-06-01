# Session Start Ritual

Borrowed from Anthropic's harness engineering (Claude Code two-agent architecture) and the SWE-agent ACI design. Every coding session in a harness-managed project begins with this short, standardized sequence. The point is to orient the agent **deterministically** without burning tokens on environment archaeology.

> A session that starts by figuring out where the dev server lives, which file holds the progress, and what state the project is in has already wasted half its context budget on work the previous session should have surfaced. The ritual eliminates that waste.

## The ritual (in order)

```
1. pwd                                      # confirm working directory
2. cat .harness/feature_list.json | head    # what features exist, what passes
3. tail -30 .harness/progress.log           # what the last session did
4. git log --oneline -5                     # last commits
5. bash init.sh                             # deterministically start the env
6. bash init.sh --smoke                     # quick end-to-end sanity
7. begin work on ONE feature from the list  # never the whole project
```

If any step fails, the *first task is fixing that step* — not the feature you came to work on. A broken environment is the work.

## Files the ritual reads

These are project artifacts the harness maintains. If any is missing, `harness verify` flags it.

- **`init.sh`** — deterministic startup. Created from `templates/init.sh` by `harness init`; the project's first real piece of work is filling in the placeholders for that project's tech stack (which dev server, which DB, etc.). Optional `--smoke` flag runs the basic end-to-end check.
- **`.harness/feature_list.json`** — canonical feature ground truth. JSON because models edit it more carefully than markdown. Generated and updated by `harness features regenerate` from PRD frontmatter + scenario test results.
- **`.harness/progress.log`** — append-only log of session ends. Each session writes ≤ 5 lines at end: what was worked on, what was completed, what state was left in. Read on next session start.
- **`git log`** — short-term memory; the ritual reads the last 5–20 commits to orient.

## What the agent does at session end

Symmetric to the start: every session ends with the same three things, in this order:

```
1. update .harness/feature_list.json   # mark anything verified-passing
2. append to .harness/progress.log     # ≤ 5 lines: what / why / state-left
3. git commit -m "<descriptive>"       # tagged Refs-ERR: if it was a bug fix
```

If the session is mid-feature when it ends, leave the working tree in a state that the *next* session can pick up from. That means: no half-applied edits, no in-progress migrations, no broken init.sh. If you can't reach clean state, the last action is to `git reset --hard` to the last committed state and note in the progress log what was attempted and why it was reverted.

## What this prevents

- **The "declare victory too early" failure** (Anthropic): an agent looks around, sees code, concludes the job is done. The feature list says otherwise, explicitly.
- **The "one-shot the whole app" failure**: the ritual forces "begin work on ONE feature from the list," not "build everything at once."
- **The "rediscover the env every session" tax**: `init.sh` is read once and reused forever.
- **The "lost between sessions" failure**: progress log + feature list give the next session a deterministic orientation in <2 KB of context.

## What this does NOT replace

- The constitution (R1–R4, Five Exceptions, Hard Rails). The ritual runs *inside* the constitution.
- The four human gates (PRD, architecture, phase plan, prod deploy). The ritual doesn't blow past gates.
- The Bache loop (Test-Writer → Builder → Validator → Judge → Promoter). The ritual orients the agent; the loop is what the agent then does.

## In Zeen specifically

When you next open `ai-tutor-app/` in Claude Code, the first message of every session should be (or trigger automatically):

> Run the session start ritual: pwd, read `.harness/feature_list.json`, tail `.harness/progress.log`, last 5 commits, `bash init.sh --smoke`. Then tell me the current state in ≤ 3 sentences before doing anything else.

For Zeen's first run, `init.sh` doesn't exist yet and `feature_list.json` is empty. That's the actual first task: fill in `init.sh` for Zeen's Next.js + Prisma + Postgres stack so every future session has a 5-second startup instead of a 5-minute one.
