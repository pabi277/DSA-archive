<!-- This file is the continuation prompt: paste it into the next chat. -->

# DSA Archive (website) — continuation prompt

> **Self-contained handoff.** Repo authority: `rule.md`; owner answers:
> `docs/DECISIONS.md`; roadmap: `docs/ROADMAP.md`; design inventory and
> **frozen** tokens: `docs/UI-REFERENCE.md`; data/Firestore shape:
> `docs/DATA-MODEL.md`; living state: this file. AppFlow @
> `57597b3332ad578614a0d9d5609f9cf8a278ee8a` is provenance only. Update
> this file at each phase end in the same commit as that phase record.

## Identity (fixed — exit gate complete 2026-11-02)

- Site: `DSA Archive` · repo: `pabi277/DSA-archive` · MIT applies to
  original code/data only; `LICENSE` is present.
- Audience: owner + a few invited friends. Backend: **Firebase Spark only**
  — Google Auth + Firestore + Hosting (gated); no Functions, Storage or
  Blaze. Website first; any Android app is a separate project.
- Git author: `pabi277 <chakraborttypabi2772006@gmail.com>`. Before every
  commit verify `git var GIT_AUTHOR_IDENT` / `GIT_COMMITTER_IDENT`; a fresh
  clone defaults to a `noreply` address, so set the repo-local identity
  first (`git config user.name` / `user.email`). Phase 5 must use **its
  own** Arena-assigned branch cut from the current `main`; never rename,
  switch, reuse another chat's branch, or push `main`.

## Rules digest (full rules: `./rule.md`)

- One phase per chat, exactly within `docs/ROADMAP.md` "Done means".
- No PR, merge, release, deployment (including Hosting preview channels),
  live Firebase change, project creation/upgrade, visibility change, or bulk
  move/delete without an explicit owner command. "Open a PR" ≠ "merge it".
- Never re-ask recorded choices. Read `docs/DECISIONS.md` first.
- Clean-room: `copy-web/` is STUDY-only; never ship its code/assets/text.
- No secrets in git/chat. The owner creates the Spark project personally and
  does console steps; rules are the protection and must be Emulator-tested
  before any gated live deploy.
- CI green + downloadable `site-preview` per phase; every Firebase phase
  needs Emulator-Suite rules tests in CI. Docs ride with the code commit.
  Report CI run/tip/artifact and what the preview shows; print the next-chat
  prompt in chat; stop at the merge gate.
- **The design gate stays closed:** 0-D approved 2026-11-02, tokens frozen in
  `docs/UI-REFERENCE.md`. Changing a frozen value re-opens the GATE.

## Current state (2026-11-03)

- **Phase 0** ✅ merged (495 rows · 20 topics; Basic 84 · Core 287 · Pro 109 ·
  15 unbadged stored as `null`). **Phase 0-D** ✅ approved, tokens frozen.
  **Phase 1** ✅ merged (PR #3). **Phase 2** ✅ merged (PR #4). **Phase 3** ✅
  merged (PR #5, `457f811`): notes/snippets, notes overview + search, custom
  lists, rules v2, backup v2.
- **Phase 4 — Planner & revision: ✅ complete and merged to `main` through
  PR #6** (owner command 2026-11-03: "Merge it to main"). Record:
  `docs/phases/04-planner-revision.md`. CI **run
  [#39](https://github.com/pabi277/DSA-archive/actions/runs/41524189110)
  SUCCESS** (135 s) at `592c8fd` and run
  [#40](https://github.com/pabi277/DSA-archive/actions/runs/41525296888) green
  at docs tip `1190459`; `site-preview` **327,940 bytes**. Nothing is
  deployed.
  - **4.1** `users/{uid}/plans/{yyyy-mm-dd}` = `problemIds` (≤200) +
    `doneIds` + server `updatedAt`; only **today's** document is subscribed
    (one read per open); the daily goal (1–100) now lives on the profile's
    existing `dailyGoal` field and is exported truthfully; Today adds any
    sheet row by search, offers five deterministic suggested picks (weakest
    touched topic first, otherwise the top of the sheet) and counts a
    problem **once a day** whether solved, revised or ticked.
  - **4.2** `src/planner.ts` derives the schedule: 3 → 7 → 21 days after the
    first solve and each revision, then graduated. The only new progress
    field is **`rc`** (revision count, 0–100); "Revised ✓" bumps it, stamps
    `lr` and keeps the row solved. Revision status is **derived, never
    stored in `s`** (which stays `todo|done`).
  - **4.3** streak (today or one day of grace), Monday-aligned 8-week
    heatmap, weekly strip, per-topic bars, solved-by-level and
    continue-where-I-left — all computed on-device from `fd`/`lr`; no stats
    documents, no server job, no chart/date dependency.
  - **Rules v3:** `match /plans/{date}` owner-only with day-key ids, exact
    fields, ≤200 ids each, joined text ≤12,000, `doneIds ⊆ problemIds` and
    `updatedAt == request.time`; `validCloudEntry` now requires `rc`.
    Phase-2/3 rules otherwise unchanged. `tools/firestore-rules.test.mjs`
    runs **10** Emulator tests (the phase-2 "unknown collection" assertion
    now names `friends`/`public/summary`).
  - **Backup schema v3** carries every plan day (read on demand at export)
    and `rc`; `parseBackup` still accepts **schemas 1 and 2** (missing `rc`
    → 0, plans → empty, a v1/v2 file claiming plans is refused).
  - **Tests/CI:** **113 unit tests / 9 files** (new `src/planner.test.ts`),
    **6 Playwright specs / 4 files** (new `e2e/planner.spec.ts` proving a
    full Today → solve → revise session at 390×844 plus a third axe audit),
    three axe audits in total. `playwright.config.ts` keeps `workers: 1`.
  - **New CI affordance:** `ci.yml` re-emits each failing block **with 14
    lines of context** as a check-run annotation — the sandbox can download
    neither Actions logs nor artifacts. Read failures with
    `gh api repos/pabi277/DSA-archive/check-runs/<id>/annotations`.
  - **E2E seeding trick:** `e2e/planner.spec.ts` writes a row "solved five
    days ago" through the emulator's REST API with
    `Authorization: Bearer owner` (uid discovered from `/documents/users`),
    which is how the schedule is proved without waiting three days.
- View set is now **Sheet · Today · Revision · Notes · Lists · Stats**
  (`.list-tabs` with `aria-pressed`, horizontal overflow on phones). The
  bottom nav and desktop rail stay deferred until Friends/More exist.
- **The 14-day use test (`docs/RESEARCH.md` §6) starts now** — it is the
  owner's test (site as the only DSA tracker for 14 days). Its verdict rule
  is pre-written and must not be rewritten after seeing results:
  continue → phase 5; one friction-fix chat → retest 7 days; stop adding
  features if it is ignored for a week.
- Known debt, deliberately deferred: JS bundle ~1.08 MB (298 kB gzip) —
  code-splitting and the unused Tailwind/daisyUI weight are **phase 6**
  perf-budget items.
- Open owner items (`docs/DECISIONS.md`): repo is still **PUBLIC** while
  `copy-web/` holds the third-party snapshot; the **10-row live-sheet
  spot-check** is pending; create the **Spark** project personally before the
  gated live check.

## Next: Phase 5 — Friends (opt-in)

Read `rule.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`,
`docs/DATA-MODEL.md` (§3 profile/friends/summary shape, §4 quota, §6 backup),
`docs/UI-REFERENCE.md`, `docs/phases/04-planner-revision.md`, and the current
source (`src/App.tsx`, `src/accountData.ts`, `src/planner.ts`,
`src/plannerData.ts`, `src/PlannerViews.tsx`, `src/cloudProgress.ts`,
`src/libraryData.ts`, `tools/generate-firestore-rules.mjs`). Verify branch,
`git status`, PRs, CI and Git identity first. Do not re-ask any recorded
answer. Do not start phase 6.

1. **5.1** invite code/link + friend add/remove.
2. **5.2** summary sharing toggle (counts/streak only) + rules for the
   friend-readable summary.
3. **5.3** compare by topic + friends-only mini-leaderboard + weekly group goal.

Sketch already recorded in `DATA-MODEL.md` §3: `users/{uid}/friends/{friendUid}`
(existence = friendship) and `users/{uid}/public/summary` (written only when
`shareSummary` is true, readable **only** by a user who has a friends doc and
whose target still shares). Notes, snippets and progress detail must never be
readable by a friend — prove it with emulator tests.

**Traps to plan for (do not rediscover the hard way):**

- `validProfile` in the generator uses `keys().hasAll([...])` with an exact
  field list, so adding `friendCode` (or any new profile field) naively will
  break every merge-style profile write that does not include it. Make the new
  field **optional** (in `hasOnly`, not in `hasAll`) or update every writer —
  and test both an old-style settings merge and a full create.
- Friend-readability needs a rule that checks the *reader's* friendship and the
  target's `shareSummary`; Firestore rules can `get()` at most 10 documents per
  request, and only 2 per single-document request — budget those `get()`s and
  prove the denial paths in the emulator.
- Two accounts are needed in the specs: use two `browser.newContext()`s plus
  the emulator REST API for any seeded state (see the phase-4 seeding trick);
  keep `workers: 1`.
- Backup stays schema v3 or migrates to v4 with a recorded reader — friends and
  summaries are **excluded** from backups (they are social data), so a v4 bump
  is only needed if friend metadata must round-trip.
- Everything stays opt-in and summary-only: no public profiles, no global
  leaderboard, no notes/snippets in a summary. Adding wider visibility is a
  GATE.

"Done means": two test accounts where a friend sees only the opted-in summary
(rules tests prove notes/progress detail stay private) and the leaderboard
updates from summaries only. It also stays true that CI is green with the
`site-preview` artifact showing the increment, rules tests run in the Emulator
Suite, the sheet is browsable signed-out, guest mode and the explicit merge
still work, frozen tokens are unchanged, no dependency outside the Firebase
whitelist is added, and the phase ends at the merge gate — no PR/merge/deploy
without a fresh explicit command.
