# DSA Archive — my own DSA sheet website

> **Status: Phase 0 is complete on the assigned session branch.** It
> adds the MIT licence, clean-room extracted catalogue, minimal
> Vite/React hello-sheet, quality checks and green CI preview packaging.
> The owner's 10-row live-sheet content spot-check remains pending. No
> Firebase project, deploy, PR or merge is authorized. Gate record:
> [`docs/DECISIONS.md`](docs/DECISIONS.md).**

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
- `src/` is a Phase 0 hello-sheet scaffold only; phase 0-D design
  approval is still required before real product UI work.
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
   chat); Phase 0 implementation is now in progress on this session
   branch. See `prompt.md` for the living state.
2. Then **one phase per chat** from [`docs/ROADMAP.md`](docs/ROADMAP.md)
   (phases 0 → 6). Every phase ends with green CI and a downloadable
   `site-preview` artifact the owner can open on their phone — the
   website equivalent of AppFlow's per-phase APK. Firebase work runs
   against the local **emulator** in CI; the owner creates the real
   (Spark) Firebase project personally when phase 2 approaches —
   credentials/service keys are never pasted in chat or git.
3. Design is approved before UI code (phase 0-D,
   [`docs/UI-REFERENCE.md`](docs/UI-REFERENCE.md)).
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
| [`docs/UI-REFERENCE.md`](docs/UI-REFERENCE.md) | every screen + state, design tokens (frozen at phase 0-D approval) |
| `data/problems.json` | validated, versioned catalogue; 495 rows across 20 topics |
| `tools/` | one-time clean-room extractor, permanent data validator and build/link checks |
| `.github/workflows/ci.yml` | tests, production build, phone/desktop accessibility checks and `site-preview` artifact |

## License

The owner selected **MIT on 2026-11-02** for our original code and
data; `LICENSE` was added in Phase 0.1. MIT can only
cover **our** work — never the copied third-party files above or the
external content our original catalogue links to.
