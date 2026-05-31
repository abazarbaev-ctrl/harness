---
id: REQ-<YYYY>-<MM>-<DD>-<NNNN>
client_id: <client>
channel: annotate | telegram | portal | email | voice | sticky
received_at: <ISO 8601>
language: en | ru | kk | ky | uz | ...
state: RECEIVED | CLARIFYING | SCOPED | PAIRED | IN_FLIGHT | READY_FOR_HUMAN_APPROVAL | SHIPPED_BEHIND_FLAG | ROLLING_OUT | CLOSED | DECLINED | DEDUPE_CLOSED
type: bug | feature_request | clarification | praise | complaint
severity: low | medium | high | critical
sentiment: positive | neutral | negative | frustrated
state_at_time_of_report: PLANNED | MOCKED-UP | CODED | ON STAGING | BEHIND FLAG | ROLLING OUT | GENERALLY AVAILABLE
duplicates: []
related: []
proposed_route: spec-author | engineering-orchestrator | client-only-clarification | dedupe_close
paired_prd: <path or null>
paired_err: <ERR-XXXX or null>
paired_flag: <flag name or null>
last_updated: <ISO 8601>
---

# REQ-{...} — {one-line title}

## Client's words (verbatim)

> Quote exactly. If translated from non-English, include the original language verbatim plus the working English translation.

```
Original ({language}):
"..."

Working translation (en):
"..."
```

## Attachments

- `client/feedback/{channel}/{timestamp}-{client}/screenshot.png` — annotated.
- `client/feedback/{channel}/{timestamp}-{client}/recording.webm` — screen recording.
- `client/feedback/{channel}/{timestamp}-{client}/voice.mp3` — voice note.
- `client/feedback/{channel}/{timestamp}-{client}/transcript.md` — STT transcript.

## Triage

- Type: ____
- Severity: ____ (per `templates/error-report.md` if bug)
- State of feature when reported: ____
- Sentiment: ____
- Dedupe check: searched against `client/requests/index.json` and `learnings/failures.md`; matches: ____

## Proposed route

`spec-author` | `engineering-orchestrator` | `client-only-clarification` | `dedupe_close`

Reason: ...

## Lifecycle log (append-only)

```
- 2026-05-04T09:42:00Z  RECEIVED  Feedback Intake created REQ from annotate widget.
- 2026-05-04T10:15:00Z  CLARIFYING  RLM asked: "Walk me through the last time you tried this — what did you actually do?"
- 2026-05-04T13:01:00Z  SCOPED  Client answered; routed to spec-author for PRD.
- 2026-05-04T14:30:00Z  PAIRED  Linked to spec/prd/feedback-empty-state.md.
- ...
```

## Degree of implementation

(Computed by Request Lifecycle Manager when paired feature reaches CODED or beyond.)

| What was asked | What we shipped | Status |
|---|---|---|
| Annotation persists across sessions | Implemented | covered |
| Voice transcription in Russian | Implemented (Deepgram) | covered |
| Auto-translate to English | Not in this PRD | deferred |
| Client gets a Change Tour when feature is BEHIND FLAG for them | Implemented | covered |

Total covered: ____% Total deferred: ____%

## Communications log

```
- 2026-05-04 09:50 — Acknowledged template sent via Telegram.
- 2026-05-04 10:15 — Clarifying template sent via Telegram.
- ...
```

## Closure

- Closed on: <date>
- Reason: shipped GA | declined (with reason) | dedupe of REQ-XXXX
- Closing template sent: yes | no
