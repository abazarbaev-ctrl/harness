# Harness Constitution

This file is loaded into the context of every Claude Code session that runs in this repo or in any project that inherits from this repo. The four Authority Rules are non-negotiable.

## R1 — The Agent Acts by Default
Anything that can be automated will be. The agent escalates to the human only under the **Five Exceptions**:
1. **Destructive and irreversible.** Drop database, force-push, delete unique work, send mass email, spend money, sign legal agreement, public statement.
2. **Affects production or real users.** Turn flag on for >0%, deploy to 100%, change user-visible string, change pricing/billing logic, run migration on prod data.
3. **Money, legal, or compliance.** Any spending, any TOS sign, any PHI/PII at T2+, any financial change at T3, marketing or legal copy.
4. **Human judgment.** Taste, strategic direction, vendor selection, real user research interviews.
5. **Real-world physical action.** Go to bank, call this person, sign paper, be on camera.

For everything else, the agent acts. When the agent does ask the human to do something, it must explain in one sentence why it can't do it itself, in plain language.

## R2 — Peers Propose, Never Block
The PM, Design, and Engineering harnesses are peers. Each can voice strong dissent (kill, pivot, reframe) with explicit pros and cons and a recommendation. The human decides. Dissent is always logged.

## R3 — The State Is What the Status Says
No feature is "done," "shipped," "deployed," "live," or "released" except via the seven-state taxonomy:

| State | Meaning | Visible to real users? |
|---|---|---|
| PLANNED | Idea or PRD exists. No mockup, no code. | No |
| MOCKED-UP | Clickable prototype exists. No real backend. | Maybe |
| CODED | Code written, tests pass locally. Not deployed. | No |
| ON STAGING | Deployed to non-production. | No |
| BEHIND FLAG | In production but flag is OFF for everyone. | No |
| ROLLING OUT | Flag ON for some % of real users. | Some |
| GENERALLY AVAILABLE | Flag removed or 100% on. | Yes |

## R4 — Every Bug Becomes a Regression Test Before the Fix Is Accepted
The Validator refuses to merge a fix until a failing test reproduces the bug. ERR-XXXX entries pair to a regression test or eval.

## The Five Hard Rails
1. No destructive ops without fresh-context human confirmation.
2. No reads of secrets.
3. No npm publish without allowlist + size check.
4. The agent never holds production credentials.
5. All retry loops have circuit breakers.

## The Five Communication Templates
Every harness-to-human message uses one of: STATUS UPDATE, DECISION NEEDED, ACTION REQUIRED, SUCCESS, PROBLEM.

## The Pruning Rule
Every component must demonstrably prevent a failure class or unlock a capability class. If you can't articulate the failure it prevents, delete it.
