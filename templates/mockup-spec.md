---
feature: <slug>
approach: A | B | C
author: ui-composer
created: <YYYY-MM-DD>
status: draft | approved | superseded
---

# Mockup Spec — {feature} ({approach})

The contract that Test-Writer and Builder read. Every visible string, every component reference, every token reference, every interaction.

## 1. Screen states

For each, attach mockup file or annotation.

| State | Mockup | Notes |
|---|---|---|
| Empty | `design/mockups/{feature}/A/empty.{ext}` | First-time user; no data yet. |
| Loading | ...`/loading.{ext}` | While async fetch is in flight. |
| Success | ...`/success.{ext}` | Happy path. |
| Error | ...`/error.{ext}` | API failure or validation error. |
| Partial | ...`/partial.{ext}` | Some data, some missing. |
| Edge | ...`/edge.{ext}` | Boundary condition (max length, large list). |
| Idle | ...`/idle.{ext}` | After user has finished an action; next-action affordance. |

If a state genuinely doesn't apply, replace the row with a one-line note explaining why.

## 2. Components used

From `design/storybook/`. Reference the story id, not the component file.

- `Button.Primary` — `design/storybook/Button.stories.tsx#Primary`
- `Card.Default` — `design/storybook/Card.stories.tsx#Default`
- `Input.WithLabel` — ...

**New components proposed** (must be approved by Design System Custodian before merge):

- ...

## 3. Tokens used

Pulled from `design/tokens.json`. No hex codes, no arbitrary spacings.

- `color.surface.primary.default`
- `color.text.primary.default`
- `space.4`, `space.6`
- `radius.lg`
- `type.body.lg`

## 4. Copy

Every visible string. The Spec Author owns the copy; the UI Composer embeds it.

| Element | String |
|---|---|
| Page title | "..." |
| Primary CTA | "..." |
| Empty state heading | "..." |
| Empty state body | "..." |
| Error heading | "..." |
| Error body | "..." |

## 5. Interactions

What clicks/taps/keystrokes do, in plain English.

- Click on primary CTA → submits form, transitions to Success state.
- Press Esc on modal → closes modal, returns focus to the trigger.
- Drag of annotation marker → updates position in real time, persists on mouseup.

## 6. Accessibility

- **Tab order**: Primary CTA → Secondary CTA → Field 1 → Field 2 → ...
- **ARIA roles**: list each interactive element and its role.
- **Color contrast**: primary CTA (`color.brand.500` on `color.surface.primary.default`) measured at __:1 (≥ 4.5:1 required).
- **Focus state**: explicit focus ring, `outline: 2px solid color.focus.ring; outline-offset: 2px`.
- **Reduced-motion**: respects `prefers-reduced-motion`; transitions disabled when set.
- **Screen reader**: list names that screen readers will announce for non-text elements.
- **Touch targets**: ≥ 44×44 CSS px on mobile breakpoints.

## 7. Responsive behavior

Breakpoints from tokens. What reflows where.

- < `breakpoint.sm` (e.g., 640px): single column; CTA full width.
- `breakpoint.sm` to `breakpoint.lg`: two columns; CTA inline.
- ≥ `breakpoint.lg`: three columns; sidebar visible.

## 8. Telemetry

Events that fire from this screen. Cross-references PRD `#telemetry` section.

- `feedback_submitted` — fires on successful submit.
- `feedback_form_abandoned` — fires when user navigates away with unsaved input.

## 9. Open questions

- Q: ...
