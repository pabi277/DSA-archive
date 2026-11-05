# Phase v2-08 — Light insight layer — RECORD

**Branch:** `arena/d4a6c3b3-dsa-archive` (cut from `main` at `79c6099`, the merge of PR #19)
**Contract:** [`PLAN.md`](PLAN.md) · **Status:** implemented; stopped at the owner's PR/merge gate
**CI:** [run #41996518444](https://github.com/pabi277/DSA-archive/actions/runs/41996518444) — **green**, every step,
at `76f4909` (the last code commit; the documentation commits after it change no code and
run through the same gates) ·
**Preview:** `site-preview` artifact **29,677,654 B** (it carries the C++ toolchain, so it really compiles)

---

## 1. What is now visible

Every recommendation now says **why**, in words the learner can check against their own
data — and the streak that punished a rest day is gone from Today.

| Where | What a learner sees |
|---|---|
| Today header | `Momentum 7.2 · 4 study days this week` (plus `· rest day earned` when the week's quota is already met) — a line, not a hero number, no flame, no colour |
| Today rows | Up to **two** muted chips from the fixed vocabulary (`overdue 2d`, `due today`, `first solve`, `next in your target`, `shaky — couldn’t last time`, `weakest topic`, `not touched 41d`, `quiz to pass`, `buddy of Longest Consecutive Sequence`); the `title` tooltip carries every reason for that row |
| Today → `▸ How this plan was made` | A native `<details>` listing the four rules applied and the exact inputs (`goal 5/day · 6 due · weakest Arrays · target 2026-12-02`), then `What would change it: goal 6 · a target date` |
| Today → picks card | `Planned 5 · completed 3 · median 3.0/day over 3 weeks` with one optional action, `Set goal to 3` — shown only when reality is below the goal |
| Today → detectors | One muted row per detector, dismissible for the day: `6 problems marked done 30+ days ago and never revised` → `Add 6 to today` (one write, one undo toast) · `3 saved solutions on problems you later marked “couldn’t”` → `Open in Code` (filtered `#/code?topic=…`) |
| `#/insights` | Momentum (`7.2/10` + a 14-bar strip with `role="img"` and a sentence behind it), one trajectory sentence, the two target fields, both detectors, plan vs reality, and one line saying what is deliberately absent |
| Topic → Practice rows | One chip where a reason exists (`first solve` on untouched rows in the weakest topic, `due today` on a revision, …) |
| `⌘K` palette | Every problem result carries its reason line beside the topic name, and `Insights` is now a route in the palette and the sidebar |
| `#/insights` → Target | `Finish the sheet by` (date) and `Target list` (a phase-03 custom list), both optional, both synced with the account |

The trajectory is **one sentence** and it changes with the inputs:

- no target: `At 2/day you’ll finish the sheet in 10 days`
- with a target: `At 2/day you finish 14 Nov (6 days ahead of 20 Nov)`
- five quiet days and a target: `Needs 3.4/day to hit 2 Dec`
- nothing solved: `495 rows left · no work in the last 5 days to pace from`

## 2. The vocabulary, the formula, the thresholds

Everything is derived on the device from data already in memory. There is no new
collection, no extra document read, no stored derived value and no server.

**`src/insights/reasons.ts`** — nine reasons, one fixed display order, ≤2 chips per row:

| Reason | Fires when | Text |
|---|---|---|
| `overdue` | solved row whose 3/7/21-day slot is in the past | `overdue 2d` |
| `due` | solved row whose slot is today | `due today` |
| `first` | no progress entry at all | `first solve` |
| `target` | unsolved row inside the target list | `next in your target` |
| `shaky` | `s === done && o === 'couldnt'` (the one `o` field we kept) | `shaky — couldn’t last time` |
| `weakest` | row in the topic with the lowest completion | `weakest topic` |
| `stale` | last touch ≥ 30 days ago | `not touched 41d` |
| `quiz` | the topic has a quiz attempt that did not pass | `quiz to pass` |
| `buddy` | an unsolved row whose subtopic neighbour is solved | `buddy of <title>` |

A row already ticked done today returns **no** reasons — a chip there would be noise.

**`src/insights/momentum.ts`** — `weighted = Σ over the last 14 days of 0.9^daysAgo × active(day)`,
`momentum = round(10 × weighted / Σ 0.9^d, 1)`, so all 14 days active is exactly `10.0`.
`studyDaysThisWeek` counts active days in the last 7. A rest day is *earned* when today is
empty **and** the week already has 5 study days (`WEEK_QUOTA_DAYS`). The number decays; it
never resets to zero, which is the whole point of the owner's 2026-11-03 decision.

**`src/insights/trajectory.ts`** — `pace = median(problems moved) over the last 14 *active*
days`; `finish = today + ceil(remaining / pace)`. Stalled (`pace = 0` or no work for
`STALL_DAYS = 5`) with a target date → the sentence asks for a rate instead of projecting.

**`src/insights/detectors.ts`** — `forgotten-done` at `≥ 6` rows solved `≥ 30` days ago with
`rc = 0 && lr = null`; `stale-code` at `≥ 3` saved solutions whose current outcome is
`couldnt`. Both thresholds are exported constants.

**Plan bias** — `suggestedPicks(entries, plan, limit, focusIds)`: when a target date is
inside 14 days, unsolved target-list rows are offered first; otherwise the phase-01
weakest-topic order is untouched. `planner.test.ts` proves both halves.

**Plan vs reality** — median problems moved over the **days that had work** in the last
three weeks. Counting empty days would have failed every honest learner at `0.0/day`,
which is why the sentence names the window; the one action (`Set goal to N`) appears only
when that median is below the goal and never writes by itself.

## 3. GATE — the shell cap moved again (owner decision, 2026-11-05)

Phase 07 closed at **386,674 B gzip** against the frozen **388,000 B** cap: 1,326 B of
headroom. Phase 08 measured, on this branch, before and after:

| Bucket | `main` @ `79c6099` | Phase 08 | Cap before → now |
|---|---|---|---|
| Shell gzip | 386,580 B | **391,193 B** (+4,613) | 388,000 → **393,000** |
| CSS raw | 58,960 B | **60,238 B** (+1,278) | 60,000 → **61,000** |
| CSS gzip | 10,100 B | 10,320 B | 18,000 (unchanged) |
| Entry JS gzip | 32,200 B | 36,170 B | 55,000 (unchanged) |
| Largest chunk gzip | 129,860 B | 129,860 B | 165,000 (unchanged) |

The insight layer cannot be an on-demand bucket the way the runner is: chips, momentum and
the disclosure live on **Today**, which must work offline on the first launch, so every
byte is precached shell. Trimming before asking recovered ~0.2 kB (copy tightened, the `+N`
chip badge and two CSS rules dropped, the phase-01 `saveSessionDrawer` placeholder removed);
the rest is the contract.

Asked in one batch with the numbers above and three options: re-baseline, cut the contract
(chips alone are already ~2 kB, so even that needed a bump), or park the phase for Phase 09.
**The owner chose the re-baseline: shell 393 kB gzip, CSS 61 kB raw.** Both constants and
the rationale live in `tools/check-budgets.mjs`; measured headroom is now **1,807 B gzip**.
No other cap moved. Phase v2-09 still owns the cap review — this is a one-phase re-baseline,
not a permanent ceiling.

## 4. Data model — rules v9, backup v8, no new reads

- `users/{uid}` gains two **optional** fields, `targetDate` (a real `YYYY-MM-DD` day or
  `null`) and `targetListId` (a list id or `null`). They ride the profile document that
  every session already reads, so **no extra document, no extra read, no new collection**.
- `firestore.rules` regenerated to **v9**: the profile whitelist gains both keys, each
  validated (`matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')` / `matches('^[a-z0-9-]{8,40}$')`,
  both accepting `null`). Two new emulator cases: valid write (including an explicit
  clear) and malformed rejection (bad day, bad id, wrong type, unknown key).
- Backup **schema v8**: `profile.targetDate` / `profile.targetListId`, optional and
  re-sanitised on import; schemas 1–7 still import unchanged (v7 files simply arrive with
  no target).
- The two fields sync like `theme`/`hideDone`: a cloud snapshot applies them, a local
  change writes them, and a profile created on a new device seeds them from the device.
  `density`, `railCollapsed` and `largeText` stay local-only.

## 5. Deviations, all deliberate

1. **The two target controls sit on `#/insights`, not in Settings.** The contract calls
   them "settings additions"; they *are* settings-store fields (sanitised, synced,
   backed up), but a finish line is only meaningful beside the trajectory it changes, and
   a duplicate Settings form would have cost shell bytes for no new capability.
2. **`src/insights/bits.tsx` is a file the plan did not list.** The chips, the momentum
   line/strip, the detector row and the plan-reality line are shared by Today, Practice,
   the palette and `#/insights`; one small module beats importing the route screen from
   four places.
3. **`planVsReality` counts days that had work**, not all 21 calendar days (see §2). The
   contract's example (`median 2.9/day`) is still the shape of the sentence.
4. **`stale-code` opens `#/code?topic=<id>`** — the shared topic when the stale solutions
   share one, otherwise unfiltered `#/code`. The screen has no outcome filter and adding
   one was outside this phase.
5. **"Rest day earned" is quantified**: 0 problems today **and** ≥ 5 study days in the
   last 7 (`WEEK_QUOTA_DAYS`). The contract said "the 7-day plan quota is met" without a
   number; this is the number, and it is exported so a later phase can argue with it.
6. **Dismissal is per device and per day** (`dsa-archive.detectors.v1`, storing the day and
   the ids), so yesterday's "hide" never silences today's note.
7. **Visual baselines cannot show chips or the open disclosure**: they run signed out, and
   both need real progress. `#/insights` joins the snapshot matrix in its designed
   signed-out state; the signed-in surfaces are proved functionally in
   `e2e/insights.spec.ts` (both viewports, axe 0).
8. **`library.ts` gained `subtopicId` and `subtopicNeighbours()`** so the `buddy of …`
   reason can name a solved neighbour without re-walking the catalogue per row.

## 6. Tests

| Kind | Count / what |
|---|---|
| Unit | **349 passing** (was 294): 55 new across `reasons.test.ts` (the nine reasons, ordering, the ≤2 chip rule, the done-today escape), `momentum.test.ts` (formula by hand, decay vs reset, rest-day quota, strip), `trajectory.test.ts` (median edge cases, the hand-computed `At 2/day … 10 days` example, ahead/behind, stalled `Needs 3.4/day`, empty sheet, plan-vs-reality), `detectors.test.ts` (thresholds, both detectors, dismissal per day, corrupt blob), plus `planner.test.ts` focus-order cases and `settings.test.ts` target sanitisation. |
| Playwright (emulator) | `e2e/insights.spec.ts` — chips on Today and the open disclosure at **390×844 and 1440×900** with axe 0; the forgotten-done detector plans 6 rows in one action and the single undo toast takes them back; `#/insights` momentum/trajectory/detectors at desktop with axe 0; the target date + list survive a reload. |
| Rules (emulator) | rules v9: valid `targetDate`/`targetListId` (and explicit clearing) succeed; malformed day, malformed id, wrong types and an unknown profile key fail. **Not run in this sandbox** (no JRE, and the emulator jar host is outside the sandbox's
network allowlist) — CI runs `npm run test:emulator`. |
| Visual | `insights` added to the 15-route × 2 viewport × 2 theme matrix (now 60 baselines). |

CI totals for the green run: **349 unit tests**, **124 Playwright tests passing** (1 skipped, the
macOS-only case), axe **0 violations** on every audited route at both viewports, 18 rules
suites, budgets and `check:dist`/`check:links`/`check:content`/`test:data` all green.

### What the first red runs caught (kept, because they are real)

1. **The rules v9 test wrote the two fields onto a document that did not exist yet** (a
   create with three keys, correctly denied) and then rewrote a whole profile with a fresh
   `createdAt` (refused). The test now creates the profile with both targets, changes them
   and clears them — the shape the client actually produces.
2. **A day of the wrong *shape* is not a rules case.** `2026-13-01` matches
   `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`, and refusing an impossible calendar day is the settings
   store's job (`clampTargetDate` parses it). The rules test now uses a shape violation and
   says why.
3. **A Firestore REST `PATCH` without an `updateMask` replaces the document.** Six per-row
   seeds left only the last row, so the detector was honestly absent — the spec now writes
   the whole shard in one request and asserts the landed field count before judging the UI.
4. **Navigating to the route you are already on is a hash change, not a reload**, so the app
   never re-read the seeded shard; the spec reloads (and waits out a cold boot) first.
5. **axe `label-content-name-mismatch` (serious, WCAG 2.5.3)** on the dismiss link: its
   accessible name has to contain the visible text, so it is now
   `Hide for today: <the note>` — which is also a better screen-reader sentence.
6. **Deleting the app's IndexedDB while it is open leaves a *blocked* delete queued**, which
   then fires during the next reload and signs the test out. Each Playwright test already
   gets a fresh context; local state is cleared through `localStorage` only.
| Budgets | `check:budgets` green at the re-baselined caps; `check:dist`, `check:links`, `check:rules`, `test:data`, `check:content` all green locally. |

## 7. What stays out (the "Out" list is part of the acceptance test)

Readiness score · FSRS/retention math · calibration · per-pattern time-to-solve ("par") ·
weak-pattern radar · workload forecast · best-hours analysis · any AI summary · charts
beyond the 14-bar momentum strip and the existing heatmap. Nothing in this phase computes
a verdict, a probability or a prediction: every number can be traced to a row, a date or a
count, and the screen says so in one line.

## 8. Next

Phase **09 — PWA, accessibility & hardening** (depends on 01–08): re-baseline review of the
budgets with the runner *and* this insight layer in place, CSP report-only → enforce, SW v2
exclusions, a11y × offline matrices, network assertion, dead-dependency decision.
