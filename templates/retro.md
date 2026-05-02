---
week: <YYYY-WWW>
date: <YYYY-MM-DD Friday>
duration_minutes: 30
author: <human>
---

# Friday Retro — Week {YYYY-WWW}

Per V1 §3.12 commitment 2: "Friday retro, 30 minutes, written. Names which harness components helped this week and which didn't. The components that didn't help get **deleted**, not iterated."

This is a discipline, not a meeting. Write for 30 minutes, save the file, push.

## What helped this week

Components (agents, hooks, skills, templates, tier presets, CLI subcommands) that earned their place. One line per component with the load-bearing evidence.

- ...
- ...
- ...

## What didn't help this week

Components that didn't earn their place. Two outcomes possible: keep on probation (3-strikes rule) OR delete now.

| Component | Why it didn't help | Strike count | Action |
|---|---|---|---|
| ... | ... | 1 of 3 | probation |
| ... | ... | 3 of 3 | delete this week |
| ... | ... | n/a | delete now |

Per V1 §3.13: speculative issues that have been speculative for 3 retros without becoming load-bearing get **closed without implementing**.

## Pruning candidates (load-bearing vs. speculative)

Walk every component touched this week. Apply V1 §1.4 pruning rule: "If you can't articulate the failure it prevents, delete it."

- agents/eng/orchestrator.md — load-bearing — prevents: same-file parallel collisions
- skills/necessity-detector.md — load-bearing — prevents: design over-engagement on backend features
- (etc.)

Speculative components (cannot articulate the failure they prevent) that have been speculative for 3 retros: list and decide.

## Errors and lessons

ERR entries opened or closed this week:

- ERR-XXXX — title — status — paired test — hook/skill change?

Lessons promoted from `learnings/failures.md` into hooks / skills / agent prompts:

- ...

## Founder reality (honest)

- Hours worked on harness this week: ____ vs. stated 8h/wk budget
- Energy level: high | medium | low | wrecked
- Anything I avoided that I should not have:
- Anything I did that I shouldn't have:

## Mission Drift Detector signals

(From `pm/mission/digest-{date}.md` if generated this week.)

- Drift detected: yes | no
- Severity: minor | meaningful | severe
- Action: ignore | watch | propose mission update | propose pivot

## Web Watcher digest highlights

(From `watch/findings/{date}/digest.md` if generated this week.)

- Top finding 1: ...
- Top finding 2: ...
- Top finding 3: ...
- PRs opened against harness: ...
- PRs merged: ...
- PRs closed without merging: ...

## Decisions made

- Decided: ...
- Deferred: ...
- Killed: ...

## Next week

The single-most-important thing for next week. One sentence. (If it's longer than a sentence, it's two priorities; pick one.)

> ...

## Push

```
git add retros/{YYYY-WWW}.md
git commit -m "retro: week {YYYY-WWW}"
git push
```
