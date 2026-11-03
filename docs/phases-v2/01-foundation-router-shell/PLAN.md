# Phase 01 — Foundation: router, shell, design system v2

**Folder:** `docs/phases-v2/01-foundation-router-shell/`
**Estimate:** 9–11 days · **Depends on:** nothing · **Blocks:** everything
**Why first:** every "outdated / AI-template" complaint traces to two things — no
routing and a frozen 2026-11-02 token set that was approved from one phone mock.
Fix both before adding a single feature.

---

## 1. Charter

Turn the single-page tab dashboard into a real product shell: URLs, a sidebar /
bottom bar, a type-and-colour system with actual roles, density control, one-line
rows, motion that explains change, crafted empty/loading/error states, undo on every
mutation, and a `⌘K` palette. **No new learner features in this phase.**

## 2. Current state (evidence)

| Problem | Evidence |
|---|---|
| No routing; view = `useState` | `App.tsx:86` (`const [view, setView]`), no `history`/`hashchange` anywhere in `src/` |
| Seven equal-width tabs | `App.tsx:510-566` |
| Hero + eyebrow + subtitle on every screen | `App.tsx:494-501` |
| Two-column card grid as the layout idiom | `styles.css:126` (`.content-columns`) |
| One accent doing four jobs | `styles.css:31` (`--accent` used by buttons, done-check, bars, heatmap) |
| System fonts, no scale | `styles.css:26-28` |
| One animation in 355 CSS lines | `styles.css` (`grep -c "transition\|@keyframes\|animation"` → 1) |
| 8 interactive targets per row | `SheetList.tsx:45-127` |
| 495 rows always in the DOM | `SheetList.tsx:161-209` |

## 3. Scope

### In
1. **Hash router** (`src/app/router.tsx`): `useRoute()`, `navigate()`, `<Link>`, scroll
   restoration, `?tab=`/`?t=`/`?lang=` query state, friendly `#/not-found`.
2. **Shell** (`src/app/shell.tsx`): desktop 240 px sidebar (collapsible 64 px rail,
   remembered), phone 4-item bottom bar (Today · Topics · Code · Review), sticky top
   bar with wordmark, sync pill, account menu. Route-aware page header (`h1`, one line
   of context, ≤1 action) replaces eyebrow/hero/subtitle.
3. **Design tokens v2** (`src/design/tokens.css`): colour roles, type scale, spacing,
   radii, elevation, motion durations. Dark-first, light parity.
4. **Primitives** (`src/design/primitives.tsx`): `Button` (primary/secondary/ghost/danger),
   `Chip`, `SegmentedControl`, `Ring`, `Stat`, `Card`, `Sheet`, `Toast`, `Empty`,
   `Skeleton`, `Field`, `Avatar`, `Tag`.
5. **Density** setting: Compact 38 / Comfortable 48 / Roomy 62 px; persisted in
   `settings.ts` (extend the existing settings shape, keep backup compatibility).
6. **Row anatomy v2** for problem rows (`SheetList.tsx` rewrite of presentation only):
   status edge-mark · title · mono `#LC`/index · level 3 px bar + label · age `12d` ·
   hover/focus cluster `✓ ⏱ ★ ↗ ⋯`. Links move to `↗ Solve` + `⋯` menu.
7. **Motion**: 120–180 ms ease-out; `document.startViewTransition` for list↔detail and
   topic↔topic (feature-detected fallback); check-bloom on complete; all gated behind
   `prefers-reduced-motion`.
8. **States**: skeletons per screen shaped like the result; empty states with exactly
   one primary action; error/offline banners redesigned; designed 404.
9. **Undo**: `src/app/undo.ts` — a 6-second undo stack rendered by `Toast`
   (`Marked done · Undo`), wired to every progress mutation and list/code deletion.
10. **Command palette**: `⌘K`/`Ctrl-K` — fuzzy over views, 20 topics, 495 problems,
    and actions (`mark done`, `start 20-min session`, `filter: pro`, `open code`,
    `toggle theme`, `density: compact`); recents; keyboard-only operable.
11. **Keyboard triage** in lists: `j/k` move, `x` toggle, `s` star, `enter` open,
    `g t` Today, `g c` Code, `?` shortcuts sheet.
12. **Grid virtualization** for the sheet: keep `<details>` semantics but render rows
    lazily (windowed list inside the open topic) so 495 rows never mount at once.
13. **CI**: re-baseline budgets in `tools/check-budgets.mjs`; add Playwright visual
    snapshots (`e2e/visual.spec.ts`) for 390×844 and 1440×900 × dark/light.

### Out (deliberately)
Any new learner feature · topic-content work · the video player · the code runner ·
touching Firestore schemas.

## 4. Design spec

### Tokens v2 (frozen after approval)
```
Type      Inter var (subset) + JetBrains Mono (subset); scale 11/12/13/14/16/20/28/40;
          line-height 1.2 (display) / 1.5 (body); tabular-nums on all numerals.
Colour    --bg --surface --surface-2 --line --line-strong --ink --muted --subtle
          --action --action-ink --success --caution --danger
          --chart-1 --chart-2 --chart-3
          Dark: bg #0B0D0E surface #121516 surface-2 #171B1C line #262B2C ink #EDF0ED
                muted #9BA6A2 subtle #7E8A85 action #7FE3B4 action-ink #06231A
          Light: bg #F7F8F7 surface #FFFFFF surface-2 #F1F3F1 line #DCE1DD ink #141817
                 muted #55605A action #14603F action-ink #FFFFFF
          Contrast: every text pair ≥4.5:1, action-ink pair ≥4.5:1, verified in CI.
Spacing   4px base, 8/12/16/24/32/48 steps.
Radii     8 (control) / 12 (card) / 999 (pill).
Elevation 0 none · 1 1px line · 2 line + 1px shadow · 3 overlay (palette, sheet).
Motion    120 ms (micro) / 180 ms (transition) / 240 ms (view) ease-out.
Density   row-sm 38 · row-md 48 · row-lg 62; control heights 32/40/44.
```
Level colouring: **text label always present**; bar uses `--chart-*` by level
(basic/core/pro) so colour is secondary to the label.

### Layout grid
240 px sidebar · content max 1,200 px · 24 px gutters · context rail 280 px only ≥1280 px.
Phone: 16 px gutters, bottom bar 56 px + safe-area inset, mini player docks above it
(phase 06).

### Screens in this phase
`Today` (existing planner summary, restyled), `Topics` (placeholder grid, real in 02),
`Sheet` → becomes `#/topic/*` in 02 but a provisional `#/sheet` route exists,
`Code` (placeholder card until 04), `Review` (existing queue restyled),
`Settings` (existing settings restyled + density), `Not found`.

## 5. File plan

```
NEW  src/app/router.tsx            hash router + query helpers
NEW  src/app/shell.tsx             sidebar/bottom bar/top bar
NEW  src/app/commandPalette.tsx    ⌘K
NEW  src/app/toast.tsx             toast host + undo rendering
NEW  src/app/undo.ts               undo stack (pure, unit-tested)
NEW  src/app/shortcuts.tsx         "?" sheet + key registry
NEW  src/design/tokens.css         tokens v2 (replaces the :root block in styles.css)
NEW  src/design/primitives.tsx     shared components
NEW  src/design/icons.tsx          ~24 hand-rolled 16/20px SVG icons (no icon lib)
EDIT src/App.tsx                   delete `view` state, keep data wiring, render routes
EDIT src/styles.css                rewritten against tokens; old classes pruned
EDIT src/settings.ts               density + sidebarCollapsed
EDIT src/index.html / index.html   preload font subsets
NEW  public/fonts/*.woff2          2 subsets (~45 kB total)
NEW  e2e/visual.spec.ts            snapshot matrix
EDIT e2e/*.spec.ts                 selectors follow the new shell (testids kept stable)
EDIT tools/check-budgets.mjs       new budgets + runtime-asset bucket
NEW  src/app/router.test.ts, undo.test.ts
```

## 6. Data model
**No Firestore changes.** `settings.ts` gains `density: 'compact'|'comfortable'|'roomy'`
and `railCollapsed: boolean`, both sanitised on read (malformed → default) and carried
in backup v3 unchanged (extra fields ignored by older parsers, added in v4 in phase 04).

## 7. Accessibility & performance acceptance
- axe: **0 violations**, 390×844 and 1440×900, dark and light, on every route.
- All interactive targets ≥44 px on phone, ≥32 px on desktop.
- Focus visible on every control (2 px ring, `--action`, 2 px offset).
- Full keyboard path: nav → palette → list triage → open problem → back.
- `prefers-reduced-motion: reduce` disables view transitions and blooms.
- Sheet scroll: 60 fps with all topics closed on a mid-range phone profile; ≤1,200 DOM
  nodes for the visible window.
- Lighthouse mobile: performance ≥90, accessibility ≥95 on `#/topics`.

## 8. Tests

| Kind | What |
|---|---|
| Unit | router parse/build/back · undo stack limits & expiry · density clamp · settings sanitise |
| Playwright | deep-link every route · back button restores filters · palette opens & navigates · `j/k/x` triage persists · undo restores a mark-done · density changes row height · 404 |
| Visual | 2 viewports × 2 themes × 6 routes = 24 snapshots committed |
| Budget | `npm run check:budgets` green with new numbers |

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Font subsets blow the budget | Subset to Latin + the glyphs the UI actually uses; measure before approving; fallback = system stack with `font-display: swap` |
| Router refactor breaks existing tests | Keep all `data-testid`s; migrate specs in the same PR; no behaviour change to data hooks |
| Visual snapshots are flaky | Fixed fonts, `prefers-reduced-motion` in tests, disable carets, mask avatars |
| Undo hides real data loss | Undo only for reversible mutations; destructive deletes still confirm |
| Snapshot churn across phases | Baselines updated deliberately per phase, never auto-accepted in CI |

## 10. Acceptance criteria (the phase is done when…)

1. Every screen is reachable by URL and the browser back button behaves correctly.
2. No page requires scrolling to find navigation; the tab strip is gone.
3. One accent colour, five semantic roles, all contrast pairs pass; level is never
   colour-only.
4. Density switch changes row height and persists across reloads and devices.
5. Every progress mutation shows an undo toast that actually reverts it.
6. `⌘K` reaches every route, every topic, any problem by title, and 10+ actions.
7. axe 0 / snapshots committed / budgets green / `npm run build` clean.
8. No `view` state left in `App.tsx`; no `.content-columns` grid anywhere.

## 11. Exit
Owner reviews the live preview (phone + desktop, dark + light), approves the tokens v2
freeze (recorded in `DECISIONS.md` + `UI-REFERENCE.md`), and merges. Phase 02 and 03
start only after this merge.
