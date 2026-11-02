# Phase 1 — Sheet core

- Date: 2026-11-02
- Status: ✅ **complete** on session branch `arena/df11f576-dsa-archive` — CI green (run #13, tip `baac7ac`), `site-preview` uploaded; **stops at the merge gate**: no PR, merge, deploy, Firebase project or Hosting change was authorized or made.
- Scope: roadmap Phase 1 only — 1.1 accordions + all rows · 1.2 search/filters/random/weakest-topic · 1.3 outbound row actions. **Not** in this phase: Firebase, accounts, sync, notes, snippets, custom lists, planner, revision, stats, friends, PWA.
- Prerequisite satisfied: Phase 0-D **approved by the owner 2026-11-02** and tokens frozen (`00d-design-prototype.md`, `docs/UI-REFERENCE.md`). Real UI code was blocked until that moment.

## Delivered

### 1.1 — Topic/subtopic accordions, all 495 rows, browsable signed out

- `src/App.tsx` renders the real sheet: sticky topbar (text-only **DSA Archive** wordmark, `done/total` count pill, appearance and large-text controls), the account/storage banner, the page heading (`495 problems · 20 topics · browsable signed out`), the toolbar, the topic list and a right-hand context column; a single-column layout below 820px.
- `src/SheetList.tsx` renders one `<details class="topic-card">` per topic (all **20**, collapsed by default, `done/total` + progress bar + chevron in the header) and, inside it, one `<h2 class="subtopic-title">` per subtopic (**84** across the sheet) with every row beneath it. All **495** rows come from `data/problems.json` via `src/catalogue.ts`; nothing is hard-coded and the runtime never reads `copy-web/`.
- Row anatomy follows the approved mock: status control · title + `Problem|Theory · To do|Done` meta · neutral text-labelled level badge · bookmark · outbound link group.
- Signed-out browsing needs no account and no network: the catalogue is bundled at build time.

### 1.2 — Search + filters (topic/level/link-type) + random pick + weakest-topic hint

- **Search** (`src/sheet.ts` → `applySheetQuery`): instant, per keystroke, case/space-normalised, and it matches **row titles, subtopic titles and topic titles**, so results are cross-topic. Every topic that still has a match auto-expands, so the user sees rows instead of a wall of collapsed headers. A clear (✕) button sits in the field and `/` focuses it from anywhere on desktop.
- **Filters**: a topic `<select>` (all 20 topics), level chips (Basic / Core / Pro / **Ungraded**), link-type chips (Practice / Article / Video / LeetCode) and a **Hide done** chip. Levels and link types are OR-within, AND-across; the topic select narrows to one topic. A live line reports `Showing X of 495 problems across Y of 20 topics · N filters on`, and **Clear all** resets everything including hide-done.
- **No-results state**: the reusable empty-state pattern with the offending query echoed back and a working `Clear search and filters` action.
- **Random pick**: uniform over the *currently visible* rows (so it respects the query), then opens that row's topic, highlights it (`.is-revealed`) and scrolls to it. A `role="status"` notice names the row and its topic and offers `Pick another` / `Dismiss`.
- **Weakest-topic hint**: among topics the user has *touched* (≥1 row done or bookmarked), the lowest done ratio wins; ties break by most rows remaining, then sheet order. With nothing touched it says so rather than guessing. `Open topic →` clears the query, expands that topic and scrolls to it. The rule is recorded in `docs/DECISIONS.md` so a later chat does not re-derive it differently.

### 1.3 — Outbound row actions

- Each row renders exactly the links that row actually has, as real anchors in the canonical order **Practice · Article · Video · LeetCode**, with `target="_blank"` and `rel="noopener noreferrer"`. No in-app problem detail screen exists yet (that is Phase 3), and no link is invented: **14 rows have no outbound links at all and correctly render no link group**.
- Link targets are the factual outbound URLs already validated in `data/problems.json` (rows with each link type: practice 453, video 369, article 289, LeetCode 289). Learning content is reached by linking out — never copied (`rule.md` §5).
- Row actions are **text labels, not icons**, matching the approved neutral/text-labelled direction and avoiding a new dependency (`docs/DECISIONS.md`).

### Local progress and settings (supporting 1.2, shaped for Phase 2)

- `src/progress.ts`: `useSyncExternalStore` over a `localStorage` object keyed `dsa-archive.progress.v1`, sharded by topic id as `{ problemId: { s: 'todo'|'done', b: boolean } }` — the `docs/DATA-MODEL.md` §3 Firestore shape minus the timestamps/attempts Phase 2 adds. Empty shards are dropped so stored JSON stays tiny; stored values are sanitized on read (unknown status → `todo`, non-boolean bookmark → `false`, no-op entries dropped) and a corrupt or unavailable store degrades to `{}` instead of breaking the sheet.
- `src/settings.ts`: `theme` (dark default), `largeText`, `hideDone` under `dsa-archive.settings.v1`, all persisted and restored across reloads.
- **No Firebase SDK, no network call, no account.** The banner states plainly that progress is device-local until Phase 2. Phase 2 owns the signed-out→signed-in merge of these guest rows (`DATA-MODEL.md` §3 note).

### Design system after the mock

- `src/styles.css` now opens with the **frozen token block** (values documented in `docs/UI-REFERENCE.md` → Tokens) on `.app-root`, with `[data-theme="light"]` and `.large-text` variants. Mock scaffolding classes (`.prototype-*`, screen picker, draft banner, simulated network toggle, rail/bottom-nav) are gone or renamed to product names; the approved styles for Phase 2–5 screens are kept in one clearly commented block so later phases build to the approved design instead of re-deriving it.
- Accessibility: skip link to `#sheet-content`, one `<h1>`, `<h2>` subtopic/card headings (no skipped level), all content inside `header`/`aside`/`main`/`footer` landmarks, `aria-pressed` on every toggle, `aria-label` on icon-only controls and on each row's link group, visible `:focus-visible` outline, and state never carried by colour alone.
- Responsive: three breakpoints (1080 / 820 / 560px), 60px rows, 44px primary targets, no horizontal overflow at 390px (asserted in CI).

## Reuse scan (checked 2026-11-02)

- **STUDY:** only our own already-approved artefacts — `data/problems.json` (factual titles/order/levels/outbound links) and the owner-approved 0-D mock for layout and component anatomy. The copied page was **not** opened in this phase.
- **BUILD:** original React components (`App.tsx`, `SheetList.tsx`), original query logic (`sheet.ts`), original local stores (`progress.ts`, `settings.ts`), original CSS on the frozen tokens, original tests. All wording is ours.
- **DEPEND:** **nothing new.** The Phase 0 pins are unchanged (React 19.3.1, Vite 8.3.5, TypeScript 7.0.2, Tailwind 4.3.3, daisyUI 5.7.50; test-only Vitest 5.0.5, Playwright 1.64.1, axe-core Playwright 4.14.0). No icon set, no state library, no UI kit added. `docs/DECISIONS.md` → Third-party licences is unchanged and needed no re-verification.
- **ADAPT:** the approved mock's own component patterns (topic card, problem row, toolbar, context cards, notices, empty state) adapted to real data and real interaction; the mock's five-destination navigation deliberately deferred (see `UI-REFERENCE.md` → Deliberate adaptations).
- **REJECT:** copied takeUforward HTML/CSS/JS/fonts/images/logos and any article/solution text; Firebase SDK/Auth/Firestore/Hosting (Phase 2+, gated); an icon package; a data grid/virtualisation library (495 rows do not need one); real sign-in, cloud writes, sharing or any friend feature; any analytics/tracker.

## Verification

- `npm run test:data` — **PASS**: 495 rows · 20 topics; Basic 84 · Core 287 · Pro 109 · unbadged 15 (kept `null`); links practice 453/453 · article 289/286 · LeetCode 289/273 · video 369/321.
- `npm test` — **PASS: 50 tests / 4 files** (`catalogue.test.ts` 2, `sheet.test.ts` 21, `progress.test.ts` 9, `app.test.tsx` 18). `app.test.tsx` mounts the real `<App />` in jsdom and mirrors the browser spec assertion-for-assertion.
- `npm run build` — **PASS** (`tsc -b` type-check clean, then Vite): `dist/index.html` 0.53 kB · CSS 193.36 kB (gzip 31.59) · JS 401.44 kB (gzip 98.63). The CSS/JS weight is Tailwind + daisyUI, not Phase 1 code; trimming it is a **Phase 6 perf-budget** item, recorded here so it is not forgotten.
- `npm run check:dist` — **PASS**: 3 files, no copied-site paths or assets.
- `npm run check:links` — **PASS**: built-page references resolve.
- `npm run test:e2e` — **not runnable in this sandbox**: Playwright's Chromium download host is outside the configured network allowlist (same limitation recorded in `00d-design-prototype.md`). CI runs it on a real Chromium at 1280×900 and 390×844 with two axe audits. The jsdom mirror above is the local evidence; **CI remains the authority**.
- `git diff --check` — **PASS** (no whitespace errors).
- **CI: Site CI run [#13](https://github.com/pabi277/DSA-archive/actions/runs/41490242266) — SUCCESS on the first attempt** (1m11s) at tip `baac7acdb17301d5991116e962245ccdb492d3f4`. (Run #12 on this branch was the earlier push of the ported 0-D state, also green.) Every step green: catalogue validation · unit tests · production build · copied-site exclusion · built-page links · Chromium install · **phone/desktop screenshot + accessibility checks** (`e2e/sheet.spec.ts`: 3 tests, two axe audits, 1280×900 and 390×844). The failure-only `site-e2e-diagnostics` step was skipped, i.e. nothing failed in the browser.
- Artifact: **`site-preview` uploaded, 129,574 bytes** (built `dist/` zip, 14-day retention) — the owner can open it on a phone. The only annotation on the run is GitHub's own `ubuntu-latest` → Ubuntu 26 migration notice, unrelated to this repo.

## What the preview shows

Opening the preview shows the real sheet, dark-first: the **DSA Archive** wordmark, `0/495 done`, the "Sign in to save progress — phase 1 keeps progress on this device only" banner, `Your learning sheet` over `495 problems · 20 topics · browsable signed out`, a search field with `Random pick`, the topic select plus 9 filter chips, the count line `Showing 495 of 495 problems across 20 of 20 topics · press / to search`, then all 20 topic accordions. Expanding **Arrays** shows its 4 subtopics (Fundamentals, Logic Building, FAQs(Medium), FAQs(Hard)) and all 32 of its rows; **Two Sum** carries a `Basic` badge and four outbound links (Practice, Article, Video, LeetCode). Ticking a row updates the pill to `1/495 done` and makes **Focus next** name Arrays; `Hide done` then removes that row from the sheet. Typing `two sum` narrows instantly and auto-expands the matches; `zzzz` gives the empty state with a working clear action. The `Light` and `Aa` controls switch theme and text size and survive a reload. On a 390px phone the layout is single-column with a bottom-nav-free chrome and nothing overflows horizontally.

## Comparison duty (approved 0-D mock vs shipped Phase 1)

Reviewed phone + desktop, dark + light, against the mock's `Sheet · signed out`, `Sheet · topic expanded`, `Sheet · filters on` and `Sheet · no results` states. Tokens, chrome, row anatomy and neutral badges match. All seven differences found are recorded as **deliberate adaptations** in `docs/UI-REFERENCE.md` (nav deferral, static sign-in banner, `Ungraded` badge, real device-local progress, mock scaffolding removed, `Inter` dropped, `<h2>` subtopics). None is a token change; none re-opens the design gate.

## Gate / next

- **Stop at the merge gate.** No PR, merge, `main` push, tag, release, deploy, Hosting channel, Firebase project, rules deploy or visibility change was made or is authorized by this phase.
- Owner items still open (`docs/DECISIONS.md`): make the repo **private** while `copy-web/` holds the third-party snapshot; complete the **10-row live-sheet spot-check**; create the **Spark** Firebase project personally *before* Phase 2.
- Next chat: **Phase 2 — Firebase Auth + cloud progress** on that chat's own assigned Arena branch, per `prompt.md`. Phase 2 must read the guest rows written by `src/progress.ts` and merge them visibly on first sign-in.
