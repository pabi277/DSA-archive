# Phase 4 — Planner & revision

- Date: 2026-11-03
- Status: ✅ **complete and merged to `main` through PR #6** on the owner's explicit command of 2026-11-03 (**"Merge it to main"**). Site CI **run [#39](https://github.com/pabi277/DSA-archive/actions/runs/41524189110)** — **SUCCESS** (135 s) at code tip `592c8fd` — and **run [#40](https://github.com/pabi277/DSA-archive/actions/runs/41525296888)** green at docs tip `1190459`; `site-preview` artifact **327,940 bytes** (14-day retention). The merge commit is visible in `main`'s history and is confirmed by the phase-5 chat. **No deploy.**
- Scope: roadmap Phase 4 only — 4.1 daily goal + Today list · 4.2 spaced revision queue (3/7/21 days, computed client-side) + one-tap revised · 4.3 streak heatmap + weekly stats + continue-where-I-left · rules v3 (planner collection, `rc` on progress entries) with Emulator tests · backup schema v3 with the recorded backward-compatible reader. **Not** in this phase: friends (phase 5), PWA/perf/release prep (phase 6), any live Firebase change.
- Prerequisites: phase 3 merged to `main` (PR #5, `457f811`); frozen 0-D tokens; repo-local Git identity reset from the fresh clone's `noreply` address to `pabi277 <chakraborttypabi2772006@gmail.com>` before any commit.

## Delivered

### 4.1 — Daily goal + Today list

- `users/{uid}/plans/{yyyy-mm-dd}` holds one day's plan: `problemIds` (≤200), `doneIds` and a server `updatedAt` — exactly the shape sketched in `DATA-MODEL.md` §3, with the local day key doubling as the document id.
- `src/plannerData.ts` (`usePlanner`) subscribes to **today's document only** (`includeMetadataChanges`, so the header pill reports pending writes), so the planner costs **one read per app open** and rides the offline cache like every other collection. The day key is recomputed every minute and on `focus`/`visibilitychange`, so a tab left open past midnight moves to the new day by itself.
- Before this phase the profile's `dailyGoal` was written once and hard-coded to 5 on export. It is now a real control (1–100, clamped, saved to the profile doc the rules already validate) and the exported backup carries the actual value.
- Today lists the planned rows with their level badge and state, ticks a row (writing the progress entry **and** the plan's `doneIds`), removes a row, adds any sheet problem through a search box, and offers **five suggested picks** — the touched topic with the lowest completion first, otherwise the top of the sheet. Suggestions are deterministic and never overwrite an existing plan.
- The tally is honest: a problem counts **once** a day whether it was solved in the sheet, revised, or ticked in Today, so the goal cannot be met by double-ticking. `movedToday / goal` drives the line, the tab label and the context card.

### 4.2 — Spaced revision queue (3/7/21 days) + one-tap revised

- `src/planner.ts` derives the schedule: a solved row is due **3 days** after its first solve (`fd`), then **7 days** after that revision, then **21 days** after the next one; a third revision **graduates** it. Stage 0 deliberately uses `fd` rather than `lr`, so re-toggling a row cannot silently push its first review around.
- The only new field is `rc` (revision count, 0–100) on a progress entry. "Revised ✓" bumps `rc`, stamps `lr` and keeps the row solved — one problem key per write, exactly like every other progress write.
- The Revision view lists overdue rows first (most overdue at the top) with a spoken label (`Overdue 2 days · revision 1 of 3`), then a "Next up" list of the next six scheduled rows, and an explicit "Caught up" empty state. Revision status is **derived, never stored in `s`**: `s` stays `todo|done`, so the sheet's binary control and the phase-2 merge logic keep working unchanged (the rules still allow `revision` for forward compatibility).
- Signed out, Revision explains why it needs an account — the same "no dead controls" rule phases 1–3 used.

### 4.3 — Streak heatmap, weekly stats, continue-where-I-left

- `streakInfo()` counts consecutive active days (today counts from today or, with one day of grace, from yesterday), keeps the best run and the last active day. `weeklyStats()` produces the seven-day strip, solved/revised this week and the running total. `heatmap()` produces a **Monday-aligned 8-week** grid in the approved 7-column `.heatmap` anatomy, with future cells padded rather than counted.
- Activity is derived from the owner's own `fd`/`lr` dates: an `lr` bump on a row that is no longer solved is ignored, and one problem counts once per day even when it was solved and revised that day.
- The Stats view adds metric tiles (solved, this week, streak), the heatmap with a text summary, the weekly strip with counts, per-topic bars and a solved-by-level split. **Nothing is stored for stats and nothing is computed on a server** — no Cloud Function, no scheduled job, no extra collection.
- "Continue where you left off" surfaces the most recently touched problem on Today with an inline jump back to its sheet row.
- The context column gains a **Today at a glance** card (streak, due count, goal, link to the queue) — the streak the phase-0-D inventory deferred to phase 4.

### Rules v3 — planner collection + revision counter

- `tools/generate-firestore-rules.mjs` now emits, in addition to the unchanged profile/progress/note/list rules:
  - `validCloudEntry` requires `rc` (`is int`, 0–100) beside `s/b/a/fd/lr`, and the entry field set is exactly those six keys.
  - `match /plans/{date}` — owner `get/list/delete`; `create/update` require a `^[0-9]{4}-[0-9]{2}-[0-9]{2}$` day id, exactly `problemIds`/`doneIds`/`updatedAt`, both lists ≤200 with joined text ≤12,000, **`doneIds` ⊆ `problemIds`** (`toSet().difference(...).size() == 0`) and `updatedAt == request.time`.
- Phase-2 and phase-3 rules are untouched. `tools/firestore-rules.test.mjs` grows from 8 to **10** Emulator Suite tests: owner plan create/read/list/extend/delete; stranger, cross-user and unauthenticated denial; bad day ids; unknown extra fields; missing keys; non-list ids; >200 ids; `doneIds` outside `problemIds`; a non-server `updatedAt`; an empty day and a full 200-id day accepted; plus `rc` required/typed/bounded on progress entries and a revised entry accepted.
- The phase-2 "unspecified collection is denied" assertion now names `friends` and `public/summary` (plans became deliberately owner-only in this phase) — a stricter, still-true statement: every collection that has no explicit rule stays denied.

### Backup schema v3 + recorded migration

- `src/backup.ts` writes **schemaVersion 3**: profile (with the real `dailyGoal`), `progressByTopic` (entries now carry `rc`), real `notes[]`, real `lists[]` and the real `plans[]` (`date`, `problemIds`, `doneIds`, `updatedAt`). Friends/summary stay excluded.
- Plan days are read on demand at export time, so a backup carries the **whole planner history** even though the app only subscribes to today.
- **Backward-compatible reader:** `parseBackup` accepts schema **1, 2 and 3**. A phase-2 or phase-3 file imports unchanged; its entries simply default `rc` to 0, and because those schemas always wrote `plans: []`, they restore zero plan days — a file of those versions that claims plan content is refused rather than guessed. Import replaces plans too (delete, then one document per day) and reports the plan-day count in its success notice and preview.

### Design and a11y

- Frozen 0-D tokens unchanged; **no CSS was added**. The phase reuses the approved `.goal-line`, `.goal-track`, `.metric-grid`/`.metric-tile`, `.heatmap`/`.heat-cell`/`.heat-1..3`, `.week-strip`, `.bar-row`, `.list-problems`, `.empty-state` and `.list-tabs` components, which the 0-D mock already froze.
- The tab row now carries six views — **Sheet · Today · Revision · Notes · Lists · Stats** — with `aria-pressed` and horizontal overflow on phones. It stays a view switch, not ARIA `tab`; the bottom nav and desktop rail remain deferred (their last two destinations are still phase 5).
- Every state is text: goal met / to go, `Done today`, `Overdue 2 days · revision 1 of 3`, `Caught up`, heatmap summary, "no solved rows yet", sign-in explainers. Shading is backed by the counted strip, so no state is colour-only.

## Reuse scan (checked 2026-11-03)

- **STUDY:** our own approved artefacts only — `rule.md`, `docs/ROADMAP.md`, `docs/DATA-MODEL.md` §3/§4/§6, `docs/UI-REFERENCE.md`, `docs/RESEARCH.md` §6, the phase-2/3 records and source, `data/problems.json`. `copy-web/` was not opened or shipped.
- **BUILD:** original planner model, Firestore hook, Today/Revision/Stats views, `rc` field + revision math, rules generator additions, backup v3 parser/writer, and every test. All wording is ours.
- **DEPEND:** none added. Streak/heatmap/weekly maths is ~200 lines of pure TypeScript; no date, chart or statistics library was introduced, so there is no new licence to log.
- **ADAPT:** the approved mock's Today/Revision/Stats/heatmap/weekly-strip components are now real views; the planner summary lives in the existing context column. The mock's 5-destination bottom nav stays deferred (Friends and More do not exist yet).
- **REJECT:** a stored "revision" status, a server-side scheduler, Cloud Functions, extra stats documents, live project creation/link, rules/Hosting deploy.

## Verification

- Local: `npm run test:data` PASS (495 rows · 20 topics); `npm test` **PASS — 113 tests / 9 files** (catalogue 2, sheet 22, progress 10, app 23, cloudProgress 9, backup 9, library 10, markdown 8, planner 20); `npm run check:rules` PASS; emulator-configured `npm run build` PASS (`tsc -b` clean; CSS 203.18 kB / JS 1,083.03 kB — 297.70 kB gzip; bundle weight stays a **phase 6** item); `npm run check:dist` PASS (3 files, no copied-site paths); `npm run check:links` PASS; `npx playwright test --list` discovers **6 specs in 4 files**; `git diff --check` PASS.
- `npm run test:rules` / `npm run test:e2e` remain un-runnable in the agent sandbox (no Java; Playwright's browser host is outside the network allowlist). **CI is the authority.**
- **CI: run [#39](https://github.com/pabi277/DSA-archive/actions/runs/41524189110) — SUCCESS** (135 s) at `592c8fd`. Every step green: catalogue validation · generated-rules check · 113 unit tests · emulator-configured build · copied-site exclusion · built-page links · Chromium install · **10 Emulator Suite rules tests** · **6 real-Chromium Playwright tests** (3 signed-out sheet specs with 2 axe audits, the phase-2 sync/backup spec, the phase-3 notes/lists spec, and the new 390×844 planner spec with a third audit on the Stats view).
- Artifact: **`site-preview` 327,940 bytes** (14 days). Only annotation is GitHub's own `ubuntu-latest` → Ubuntu 26 migration notice.
- Iterations this phase (all before the green run): a rules test that expressed a missing `rc` as `undefined` — the client SDK rejects `undefined` before the request leaves the browser, so the entry key is now omitted · phase-3 specs asserted backup `schemaVersion 2` and re-imported a phase-2 file still carrying plan days (a shape that schema never produced, so it is refused) · the revision count legitimately reports two scheduled rows once a Today row is also solved, so the spec asserts a non-zero count instead of a magic number.
- Test-tooling change: `ci.yml` now re-emits each failing block **with context** as a check-run annotation; the agent sandbox cannot download Actions logs *or* artifacts (both blob hosts are outside its allowlist), so annotations are the only readable failure channel.

## What the preview shows

The downloadable `site-preview.zip` (**327,940 bytes**) is the emulator-configured production `dist/`. Opened on a phone it shows the dark-first sheet with six view tabs; signed out, **Today**, **Revision** and **Stats** show their sign-in explainers while the sheet stays fully browsable. With the emulators behind it, the acceptance spec shows: sign-in → an empty Today → **Add 5 suggested picks** → a ticked row (`Done today`, `1/5 moved today`) → a searched row added from another topic → a row solved five days ago appearing as **Overdue 2 days · revision 1 of 3** → one tap **Revised ✓** clearing the queue and moving it to "Next up" (7 days out) → Stats with streak, 8-week heatmap, weekly strip, topic bars and level split → a schema-v3 export containing the plan day and `rc: 1` → a restore that clears today's plan exactly as its preview says. `test-results/planner-phone.png` captures the Stats view at 390×844 for CI diagnostics.

## Comparison duty (approved 0-D mock vs shipped Phase 4)

Reviewed `test-results/planner-phone.png` against the mock's `Today (planner) — planned / nothing planned / goal met`, `Revision queue — due / caught up` and `Stats` states, plus the existing sheet/notes/sync captures. The goal line, metric tiles, heatmap, weekly strip, bar rows and empty states use the approved anatomy and frozen tokens; no token, colour or type value changed. Differences are recorded as deliberate adaptations in `docs/UI-REFERENCE.md`.

## Gate / next

- **Merged to `main` via PR #6** on the owner's explicit command (2026-11-03, verbatim "Merge it to main"), as recorded in `DECISIONS.md`. That command authorized the merge only: **no deploy**, Hosting channel, tag/release, Firebase project or live rules deploy was made.
- **The 14-day use test (`docs/RESEARCH.md` §6) starts now** that phase 4 is complete — it is the owner's test to run (use the site as the only DSA tracker for 14 days; the pre-written verdict rule decides iterate-vs-stop and must not be rewritten afterwards). It runs in parallel with the merge decision; phase 5 (friends) is the agreed first cut if the budget or the test says so.
- Phase 5 (friends) is **not** started. The next chat uses its own Arena-assigned branch, verifies branch/status/PRs/CI/Git identity first, and executes only roadmap phase 5 after the owner commands it.
- Owner items unchanged: make the repo private while `copy-web/` holds the third-party snapshot; complete the 10-row live-sheet content spot-check; create the Spark project personally and perform the gated live check.
