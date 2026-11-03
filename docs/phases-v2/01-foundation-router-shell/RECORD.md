# Phase v2-01 — foundation: router, shell, design system v2

- Date: 2026-11-03
- Status: 🟡 **code complete on `arena/42bcf5f6-dsa-archive`; stopped at the merge gate.**
  Not merged, not deployed, no PR opened, `main` untouched. Owner review of tokens v2
  and the visual baselines is the remaining gate before CI is asked to run.
- Scope: the acceptance list in [`PLAN.md`](PLAN.md) §10 (13 items) only — hash router,
  shell, tokens v2, primitives + icons, density, row anatomy, motion, designed states,
  undo, `⌘K`, keyboard triage, sheet windowing, budget re-baseline + snapshots.
- Prerequisites: v1 complete at `main` `088c284`; v2 planning docs (docs-only commits);
  branch cut from `main` for this chat, per `rule.md` §2.

## Delivered

### 1–2. Router + shell (URL is the state)

- **`src/app/router.ts` (NEW, 234 lines).** `parseRoute` / `buildPath` / `buildQuery` /
  `navigate` / `useRoute` / `<Link>`, scroll restoration and `#/not-found` as the parse
  fallback. 16 route names: `today topics topic problem code search practice review quiz
  insights settings lists notes friends stats not-found`. Query pairs survive back/forward
  (`#/search?q=two+sum&level=basic&topic=arrays&link=leetcode`); spaces encode as `+`.
  Every v1 `view` state and every `.content-columns` grid is gone from `App.tsx`
  (acceptance 8), and v1 path bookmarks (`/notes`, `/sheet`, `/today`) are translated to
  hash routes on boot.
- **`src/app/shell.tsx` (NEW).** 240 px sidebar with a 64 px rail (`rail-toggle`,
  remembered in `settings.railCollapsed`), phone bottom bar (Today · Topics · Code ·
  Review, ≥44 px targets), sticky top bar (wordmark, sync pill, account menu), route-aware
  `PageHeader` with a progress pill replacing the v1 eyebrow/hero/subtitle.

### 3. Tokens v2 (frozen)

- **`src/design/tokens.css` (NEW)** — Inter var + JetBrains Mono subsets, scale
  11/12/13/14/16/20/28/40, one accent `--action`, five semantic roles (adding `--info`),
  level bars on `--chart-1…3`, radii 8/12/999, motion 120/180/240 ms ease-out, density
  38/48/62, shell metrics. Documented in `docs/UI-REFERENCE.md` → "Tokens v2"; v1 kept
  verbatim as history. The authorised one-time re-freeze is **spent**.
- **Fonts are vendored, not dependencies.** `public/fonts/` carries 24,856 B Inter +
  15,988 / 16,652 B JetBrains Mono = **57.5 kB raw**, in the separate runtime bucket and
  **never precached**. `tools/fetch-fonts.mjs` (NEW) reproduces them from `@fontsource*` +
  `pyftsubset`; the packages are deliberately not in `package.json` so `npm ci` cannot
  change shell bytes.
- **Tailwind + daisyUI removed** (the gate required a decision, not a third state):
  packages uninstalled, `@tailwindcss/vite` dropped from `vite.config.ts`,
  `src/styles.css` imports only the token file. Recorded in `docs/DECISIONS.md`.

### 4. Primitives + icons

- **`src/design/primitives.tsx`**: `Button`, `Card`, `Ring`, `Stat`, `Chip`, `Segmented`,
  `Menu`/`MenuItem`, `Sheet` (native `<dialog>`), `Empty`, `Skeleton`, `Avatar`, `Tabs`.
- **`src/design/icons.tsx`**: 24 hand-rolled 16/20 px SVG icons, `currentColor`,
  `aria-hidden`; no icon library and no icon font.

### 5. Density

- `settings.ts` gains `density` (`compact | comfortable | roomy` → 38/48/62 px) and
  `railCollapsed`, both sanitised on read (`clampDensity`, malformed → `comfortable`) and
  persisted under `dsa-archive.settings.v1`. **Local only** — a Firestore profile or a
  backup restore never moves a device preference (`applyProfileSettings` preserves them).
- Backup **v3 stays v3**: `profile.density` / `profile.railCollapsed` are optional, written
  when present and re-sanitised on import, so a pre-v2 file imports unchanged. Covered by
  two new `src/backup.test.ts` cases.

### 6. Row anatomy v2

- **`src/design/row.tsx`**: status edge-mark · title · mono `#LC` · 3 px level bar **plus**
  the level label · age (`12d`) · hover/focus cluster `✓ ⏱ ★ ↗ ⋯`. Links open in a new tab
  with `rel="noopener noreferrer"`; the `⋯` menu replaces the v1 row of per-link buttons.
  The reason a check and a bookmark are separate controls is preserved (axe
  `label-content-name-mismatch` was the v1 failure mode).

### 7. Motion

- View transitions are feature-detected (`document.startViewTransition`) and skipped under
  `prefers-reduced-motion`; check-bloom and every transition is 120–180 ms ease-out and
  disabled in the reduced-motion block of `tokens.css`.

### 8. Designed states

- `src/app/placeholderScreens.tsx` ships **designed** pending states for `#/topic/<id>`
  (learning order + Learn/Practice/Quiz tabs), `#/problem/<id>` (sources + pending body),
  `#/code`, `#/practice`, `#/quiz`, `#/insights`, plus `#/not-found` and missing-topic /
  missing-problem states. Each says what will live there, what you can do now, and offers
  exactly one primary action. Skeleton + empty + error components live in
  `src/design/primitives.tsx`.

### 9. Undo

- **`src/app/undo.ts`** (pure, unit-tested) + `src/app/feedback.tsx` toast host: 6 s
  window, capped stack, same-key replacement, one-shot revert. Wired to every guest
  progress mutation (status flip, bookmark, outcome) through
  `replaceGuestProgress` (NEW in `src/progress.ts`). Destructive list deletion keeps its
  confirm step and is intentionally **not** undoable (PLAN §9 risk note).

### 10–12. Palette, triage, windowing

- **`src/app/commandPalette.tsx`**: `⌘K` / `Ctrl-K`; 10 destinations, all 20 topics, all
  495 problems, 11 actions (theme, density, shortcuts, hide done, session, sign-in, level
  filters…), recents, grouped `Go to → Action → Topic → Problem`, fully keyboard operable.
- **`src/app/triage.ts`** + `src/app/shortcuts.tsx`: `j`/`k` roving focus, `x` status,
  `s` bookmark, `↵` open, `g t` / `g c` / `g p` / `g r` jumps, `?` shortcut sheet. Typing
  in any field is inert, `meta/ctrl/alt` are ignored.
- **Windowing**: closed topics mount **0** rows; an open topic mounts the first 40 and
  grows by 40 via "Show N more rows"; a deep link or random pick pre-expands its topic.
  Well under the ≤1,200-node budget.
- Real bug fixed on the way: `applySheetQuery` never applied the `levels` filter.

### 13. CI: budgets + snapshots

- `tools/check-budgets.mjs` (EDIT): the **fonts/ bucket was miscounted inside the shell**
  (the cause of the apparent 427 kB failure); fonts are now excluded from
  `totalShellGzip`, counted in the separate runtime bucket (cap 60 kB), and the script
  prints a `Shell parts:` composition line. Caps are unchanged from the approved
  re-baseline. Latest run: **CSS 42.2 kB raw / 7.9 kB gz · entry 149.2 kB raw / 43.3 kB gz
  · largest chunk 486.05 kB raw / 139.89 kB gz (`firebase-firestore`) · shell 335 kB gz
  (cap 380) · fonts 57.5 kB raw (cap 60)**; `check:dist` and `check:links` green.
- `tools/build-sw.mjs` (EDIT): `fonts/` is never precached (they are runtime assets).
- `e2e/visual.spec.ts` (NEW): 2 viewports × 2 themes × 6 routes = **24 snapshots**, plus
  `snapshotPathTemplate` and a `toHaveScreenshot` threshold in `playwright.config.ts`.
  Specs skip unless `CI` or `VISUAL_BASELINES=1`, so no baseline can be accepted silently.

### Tests

| Kind | What | Result |
|---|---|---|
| Unit (vitest) | 15 files — router parse/build/back, undo stack limits & expiry, palette ranking, density clamp + settings sanitise, backup v3 device prefs | **154 tests passing** |
| jsdom shell (`src/shell.test.tsx`, replaces the deleted `src/app.test.tsx`) | 24 mount tests: routes, signed-out state, density, undo, palette, triage, theme | passing |
| Playwright (CI only) | `e2e/foundation.spec.ts` (NEW, 7 specs) + `e2e/sheet.spec.ts` (rewritten) + the six v1 specs migrated to routes | not run locally (see deviations) |
| Visual (CI) | 24 baselines | pending first CI run |
| Budget | `npm run check:budgets` | green |

## Deviations from the plan (and why)

1. **Chromium cannot be downloaded in the agent sandbox** (`playwright install` is blocked;
   `install-deps` fails on `libnspr4`/`libnss3`/`libatk*`). jsdom mount tests plus axe-free
   unit coverage are the local proof; **the Playwright and visual runs, and therefore the
   24 committed PNGs, must come from the first CI run**. `VISUAL_BASELINES=1` regenerates
   them deliberately; review the diff before committing.
2. **`#/notes` exists as its own route** (not in PLAN §4's screen list). Notes are deleted
   in v2-04, not v2-01; folding them into `#/lists` would have hidden a working feature for
   a phase. Recorded in `DECISIONS.md`.
3. **`src/SheetList.tsx`, `PlannerViews.tsx`, `NotesView.tsx`, `ListsView.tsx`,
   `FriendsView.tsx`, `NoteEditor.tsx`, `ListPicker.tsx` are not rebuilt on the
   primitives.** They are mounted through the new shell and restyled with tokens v2
   (including the v1 button classes), and each is rewritten in its own phase (02, 04, 08).
   Rebuilding them now would duplicate that work and blow the phase-01 scope.
4. **The initial CI run failed in real browser acceptance.** The retrieved log excerpt
   showed axe `label-content-name-mismatch`: visible `Solve` buttons had an unrelated
   `aria-label` (`Open <title>`), so the accessible name omitted their visible text. The
   same run showed searched results were not mounted because their topic groups stayed
   collapsed. Fixed by naming the action `Solve <title>` and opening matching topic groups
   while a search is active. A separate PR-comment step failed before publishing because
   its inline Python initialized `bucket` from the not-yet-defined `functional` list; it now
   initializes the lists first and then points `bucket` at `functional`.
5. **Budget caps unchanged.** The earlier failure was a counting bug (fonts in the shell
   bucket), not real growth, so the interim 380 kB → 400 kB re-baseline attempt was reverted.

### Failure follow-up verification (2026-11-03)

- `npm test`: **154/154 passing**; `npm run build`, `check:budgets`, `check:dist`,
  `check:links`, `test:data` (495 rows / 20 topics) and `check:rules`: passing.
- A CI rerun exposed additional concrete failures, now corrected on the session branch:
  account menu's aria-label omitted the visible avatar initials; the shared topic helper
  selected every nested `<summary>` instead of the topic's direct summary; the windowing
  test used Arrays (32 rows) despite expecting a second window; the palette test typed
  before its focus effect; the shortcuts test expected `?` to fire while the search input
  was focused (the keyboard handler correctly suppresses shortcuts while typing); and the
  phone top bar exceeded 390 px. Toasts now render in a body-level portal so the fixed
  undo action is not clipped by app layout ancestors.
- Playwright cannot run in this sandbox: the Chromium download endpoint resets the TLS
  connection. These CI-derived fixes have local unit/build checks, but another CI run must
  prove them and expose any remaining failures; the phase is not CI-green yet.

## Content added

None. No statement, hint, primer, quiz or resource text shipped in this phase; every pending
body is an explicitly-labelled designed state.

## What is now visible to a user

A routed, keyboard-operable shell: sidebar/rail on desktop, bottom bar on a phone, `⌘K`
over everything, `j k x s ↵` triage over the sheet, a real 6-second undo, three densities,
dark + light, and a designed page for every pending feature — with the full 495-row sheet,
Today, Review, Stats, Lists, Notes and Friends still working, signed out or signed in, and
still offline behind the Service Worker.

## Exit

Acceptance 1–8 are met in code; 7 (CI: axe 0 / snapshots committed / budgets green) is met
for budgets and awaits the first CI run for axe + snapshots. **Stop at the merge gate:** no
PR, no merge, no deploy, no `main` push without the owner's explicit command.
