---
release: <version>
client_id: <client | "all">
composed_by: request-lifecycle-manager
rendered_with: driverjs | react-joyride | onborda
created: <YYYY-MM-DD>
---

# Change Tour — {release}

A per-release tour shown to clients when a feature reaches BEHIND FLAG → ROLLING OUT for them. Composed by the Request Lifecycle Manager; rendered by the chosen library (Driver.js MIT for vanilla; React Joyride MIT for React; Onborda for Next.js).

## Eligibility

- Client must have at least one open or recently-closed REQ paired with a feature in this release.
- Client's flag bucket must include the feature (or feature must be GA).
- Client must not have already seen this tour (`tour/clients/{client_id}/state.yaml#seen_tours`).

## Tour script

Each step ties to one paired REQ from this client. Plain language. Names the seven-state taxonomy explicitly.

```yaml
release: v0.4.1
steps:
  - id: 1
    title: Your annotation now persists across sessions
    body: |
      You asked for this in REQ-2026-04-12-007 — when you closed the tab, your annotations
      vanished. They don't anymore. This is now BEHIND FLAG for everyone but you and a
      handful of other testers.
    target_selector: "#annotation-toolbar"
    placement: bottom
    paired_request: REQ-2026-04-12-007
    state_named: BEHIND FLAG (tester bucket only)

  - id: 2
    title: Voice notes in Russian
    body: |
      We added Deepgram for English and Russian; Whisper-self-hosted for Kazakh, Kyrgyz,
      Uzbek. Tap the mic — speak in any of those — get text back. ROLLING OUT to 25%
      bucketed by user_id; you are in.
    target_selector: "[data-tour='mic-button']"
    placement: top
    paired_request: REQ-2026-03-30-019
    state_named: ROLLING OUT to 25% (you are bucketed in)

  - id: 3
    title: One thing you asked for that we did not ship yet
    body: |
      REQ-2026-04-21-002 (auto-translate annotations to English) — we triaged this,
      paired it with PRD spec/prd/auto-translate.md. State: PLANNED. We'll come back
      with an ETA after the next retro.
    target_selector: null  # informational; no DOM target
    placement: center
    paired_request: REQ-2026-04-21-002
    state_named: PLANNED
```

## Hard rules (composer)

- **Plain language.** No "deployed," "merged," "released" without a state qualifier.
- **One step per paired REQ.** Don't bundle.
- **Honesty about what didn't ship.** If the client asked for X and we didn't ship X, the tour names it explicitly with its state (PLANNED, DECLINED, etc.). The client deserves to know what their feedback turned into.
- **No marketing copy.** Tone matches the client's relationship with the human, not a launch announcement.
- **Dual-build segregation:** the tour code MUST come from the dual-build pipeline that excludes the client-feedback widget code from public bundles.
- **Once per client per release.** Once seen, marked in `tour/clients/{client_id}/state.yaml#seen_tours`; never re-shown.

## Hard rules (renderer)

- Respects `prefers-reduced-motion`: transitions disabled if set.
- Tab order matches step order; Esc dismisses.
- Each step's `target_selector` validates pre-render; if missing, step is shown center as informational.
- Tour-related telemetry events fire via `event_catalog.yaml`: `tour_started`, `tour_step_advanced`, `tour_dismissed`, `tour_completed`.

## Approval

- [ ] Composed by: request-lifecycle-manager (auto)
- [ ] UI Composer rendered: <date>
- [ ] UX Critic accessibility check: <date>
- [ ] Human approves Change Tour publication: <date> (Exception #2 if any step names ROLLING OUT or GENERALLY AVAILABLE)
