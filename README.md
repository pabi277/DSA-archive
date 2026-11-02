# DSA Archive — my own DSA sheet website

> **Status: Phases 0, 0-D, 1 and 2 are complete and merged to `main`;
> Phase 3 is complete on its session branch and stopped at the merge
> gate.** The owner approved the 0-D design prototype on 2026-11-02, so
> the design tokens remain **frozen** in
> [`docs/UI-REFERENCE.md`](docs/UI-REFERENCE.md). Phase 2 added Google
> sign-in, a profile avatar menu, offline-first Firestore progress sync,
> an explicit guest→account merge, versioned Firestore rules with
> emulator tests, and JSON export/import. Phase 3 adds synced markdown
> notes + code snippets per problem, a searchable notes overview, custom
> lists that filter the sheet, rules v2 (owner-only notes/lists with size
> caps) and backup schema v2 with a backward-compatible v1 import. All
> cloud acceptance runs against the **local Emulator Suite in CI**: Site
> CI run [#30](https://github.com/pabi277/DSA-archive/actions/runs/41517643913)
> is green at `21809c5`, with a downloadable `site-preview` artifact.
> **No live Firebase project has been created, no rules or Hosting
> deploy was made, and there is still no public URL.** The owner's own
> live check and the 10-row content spot-check remain pending. Gate record:
> [`docs/DECISIONS.md`](docs/DECISIONS.md); phase records:
> [`docs/phases/`](docs/phases/).**

Planning adapted from AppFlow @ `57597b3332ad578614a0d9d5609f9cf8a278ee8a`
on 2026-11-02 (reference only — this repo is self-contained; see
[`rule.md`](rule.md)).

## Current repository contents

- `copy-web/` — containing `index.html` + `css/` + `js/` + `fonts/`
  + `images/`: a one-page
  offline copy, made with a website-copy tool, of the takeUforward page
  *"Striver's A2Z DSA Sheet & Course"*
  (`https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet`).
  Originally added at the repo root in `9de75e8 "template push"`;
  moved intact into `copy-web/` on 2026-11-02 (owner command).
- It is **reference material for study only** (AppFlow reuse-first STUDY
  verdict): their compiled Next.js output, fonts, and logos are **not**
  ours to ship. It will never be deployed as the product.
- It only *looks* complete: every internal link (`/practice/...`,
  `/blogs/...`, `/dashboard`, login, planner, contests, IDE) 404s or
  needs their backend. Progress is stuck at `0/495` forever without
  their account system. Evidence: [`docs/RESEARCH.md`](docs/RESEARCH.md) §1.
- `data/problems.json` is our independently extracted catalogue;
  `tools/extract_problems.py` is a one-time source tool and is never
  part of the website bundle. The owner spot-check remains pending.
- `src/` is the **real Phase 3 app** built to the frozen 0-D tokens:
  `App.tsx` (page/account UI + Sheet/Notes/Lists views), `SheetList.tsx`
  (topic accordions + rows), `sheet.ts` (search/filter/random/weakest-topic
  logic), `progress.ts` (guest store), `cloudProgress.ts` (Firestore row
  shape + merge plan), `account.ts`/`accountData.ts` (Google Auth, profile,
  sync, backup), `library.ts`/`libraryData.ts` (notes + custom lists),
  `NoteEditor.tsx`, `NotesView.tsx`, `ListsView.tsx`, `ListPicker.tsx`,
  `markdown.ts` (safe, dependency-free preview), `backup.ts` (JSON schema v2),
  `firebase.ts` (emulator/live config), `settings.ts`, `catalogue.ts`, and
  unit tests. `firestore.rules` is generated from `data/problems.json` by
  `tools/generate-firestore-rules.mjs`. Planner, revision and friends remain
  later phases. The disposable 0-D mock was folded into phase 1 and deleted
  (readable in git history at `1791693`).
- ⚠️ **This repo is currently PUBLIC while containing that copy.**
  Owner item #1 in `docs/DECISIONS.md`: make it private while the
  copy remains under `copy-web/`, before anything is published.

## What it will become (owner-chosen direction, 2026-11-02)

A **powerful, Firebase-backed DSA web app** — built clean-room in our
own code and design, *inspired by the structure* of the A2Z sheet (20
topics → subtopics → 495 problems), for **me + a few friends**:

- The full sheet as our own editable data file (titles, order, level,
  links out to LeetCode / article / video) — see
  [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md). Search, filters, random
  pick, collapsible topics. Browsable signed-out; progress needs login.
- **Login (Google sign-in) + cloud sync via Firebase** (Auth +
  Firestore, free Spark plan): done / revision / bookmarks, notes,
  daily planner and streaks follow you phone ⇄ laptop, and keep
  working offline through Firestore's local cache. No custom server,
  no Cloud Functions, no paid plan (see `docs/RESEARCH.md` §4).
- My own notes + code snippets per problem, custom lists (e.g.
  "weak topics", "last-week revision"), a spaced revision queue
  (3 / 7 / 21 days) and a light daily planner — all synced.
- **Friends, opt-in only:** invite code/link, share a progress summary
  (never notes by default), compare topic progress, a small
  friends-only leaderboard and weekly group goal.
- Still no ads, no trackers (no Analytics by default), no copied
  articles/solutions — we **link out** to the originals. Export/import
  backup stays, so our data is never locked into Firebase.

**Website first.** An Android app may come later as a separate AppFlow
project; problem data, design tokens, and the per-user data shape are
kept portable (Firebase has an Android SDK, so a later app could read
the same Firestore data). No app work is in this plan's v1.

## How work happens here

Owner-gated, AppFlow-style (translated from apps to a website in
[`rule.md`](rule.md)):

1. ✅ Direction and exit-gate answers complete 2026-11-02: plan
   approved; site name `DSA Archive`; MIT licence; Git author
   identity designated (recorded in `docs/DECISIONS.md`). By the
   owner's follow-up command the same day, the plan-docs commit and
   the `copy-web/` move were merged to `main` (not held for the next
   chat). Phases 0 (bootstrap + data), 0-D (design prototype, approved
   2026-11-02) and 1 (sheet core) are complete on their own session
   branches, each stopping at the merge gate. See `prompt.md` for the
   living state and the next-chat prompt.
2. Then **one phase per chat** from [`docs/ROADMAP.md`](docs/ROADMAP.md)
   (phases 0 → 6). Every phase ends with green CI and a downloadable
   `site-preview` artifact the owner can open on their phone — the
   website equivalent of AppFlow's per-phase APK. Firebase work runs
   against the local **Auth + Firestore emulators** in CI, including
   rules tests and signed-in browser acceptance; the owner creates the
   real (Spark) Firebase project personally before any gated live check —
   credentials/service keys are never pasted in chat or git.
3. ✅ Design was approved before any UI code: the owner approved the
   phase 0-D prototype in chat on 2026-11-02 and the tokens are frozen
   in [`docs/UI-REFERENCE.md`](docs/UI-REFERENCE.md). Changing a frozen
   token, or the design direction, re-opens that gate.
4. **No PR, no merge, no deploy, no live-Firebase change without the
   owner's explicit command in chat.** Green CI is evidence, not
   authorization.

## The file set (this is the whole plan — nothing else is needed)

| File | Holds |
|---|---|
| `README.md` | this page |
| [`rule.md`](rule.md) | this repo's own operating manual (laws, gates, work cycle) |
| [`prompt.md`](prompt.md) | continuation prompt — paste into the next chat |
| [`docs/RESEARCH.md`](docs/RESEARCH.md) | audit of the copied page, options compared, reuse + Firebase map, rejected paths, use/kill test |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | phases 0–6, each with parts and "Done means" |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | dated decision log — the anti-re-ask register; all gate answers (complete 2026-11-02) |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | sheet schema, Firestore schema + security/cost design, extraction plan |
| [`docs/UI-REFERENCE.md`](docs/UI-REFERENCE.md) | every screen + state; design tokens **frozen 2026-11-02**; deliberate adaptations vs the approved mock |
| `docs/phases/` | phase records: 0 bootstrap + data extraction · 0-D design prototype · 1 sheet core |
| `src/` | the real sheet + phase-2 account/sync/backup modules, styles and unit tests |
| `firestore.rules` | generated, versioned own-data-only rules with field/size validation |
| `data/problems.json` | validated, versioned catalogue; 495 rows across 20 topics |
| `tools/` | one-time extractor, data validator, rules generator/test, build/link checks |
| `e2e/` | real-Chromium sheet and emulator-backed sync acceptance specs |
| `.env.example` | public Firebase web identifiers and emulator settings; `.env.local` is gitignored |
| `.github/workflows/ci.yml` | tests, rules-generation check, emulator rules tests, production build, phone/desktop accessibility checks and `site-preview` artifact |

## License

The owner selected **MIT on 2026-11-02** for our original code and
data; `LICENSE` was added in Phase 0.1. MIT can only
cover **our** work — never the copied third-party files above or the
external content our original catalogue links to.
