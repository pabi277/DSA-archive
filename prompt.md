<!-- Adapted for a WEBSITE from AppFlow templates/prompt-app.md (MIT template). -->

# DSA Archive (website) — continuation prompt

> **Self-contained handoff. Paste this file as the first message of the
> next chat, then give one command.**
> This repo is self-contained: `rule.md` holds the full rules, `docs/`
> the plan and decisions, THIS FILE the living state. AppFlow @
> `57597b3332ad578614a0d9d5609f9cf8a278ee8a` is provenance only.
> Update this file at the end of every phase, in the same commit as the
> phase record.

## Identity (fixed — exit gate complete 2026-11-02)

- Site: `DSA Archive` · repo: `pabi277/DSA-archive` · license: MIT
  for our original code/data (`LICENSE` file to be added in Phase 0.1)
- Audience: owner + a few invited friends (2026-11-02). Backend:
  **Firebase Spark only** — Auth (Google) + Firestore + Hosting
  (gated); no Functions/Storage/Blaze (2026-11-02).
- Website first; a future Android app is a separate project (not a
  phase here). Data + tokens + Firestore shape stay portable for it.
- Git author (owner-designated 2026-11-02):
  `pabi277 <chakraborttypabi2772006@gmail.com>` · work only on the
  session branch assigned to your chat (the planning branch
  `arena/6dcaf48f-dsa-archive` was merged to `main` on 2026-11-02 by
  owner command — do not reuse it) · never push `main` directly.
  Before every commit, verify `git var GIT_AUTHOR_IDENT` /
  `GIT_COMMITTER_IDENT` resolve to this identity (set repo-local
  `user.name`/`user.email` to it if needed).

## Rules digest (full rules: `./rule.md`)

- One **phase** per chat (2–4 parts, one whole capability), per
  `docs/ROADMAP.md`. No work outside the phase's "Done means".
- Never create/switch branches, push `main`, force-push, `reset --hard`.
- No PR, merge, tag, release, **deploy (incl. Hosting preview
  channels), live Firestore-rules deploy, Firebase project
  creation/upgrade**, visibility change, or bulk delete/move (incl.
  the copied `copy-web/` tree) without the owner's explicit command
  in chat. Green CI is not authorization.
- **Ask less, gate always** (`rule.md` §3). Recorded answers in
  `docs/DECISIONS.md` are **never re-asked**.
- **Clean-room:** copied takeUforward page = STUDY-only; never ship its
  code/assets/content; link out instead (`rule.md` §5).
- Secrets never in git/chat; owner does Firebase-console steps
  personally; rules (versioned + emulator-tested) are the protection.
- Evidence before hypothesis (`file:line`). CI green + downloadable
  `site-preview` every phase. Docs ride with the code commit.
- No UI code before phase 0-D approval + frozen tokens.

## State (update at every phase end)

- **2026-11-02 — PLAN APPROVED; plan docs committed, copied website
  moved to `copy-web/`, and the planning branch merged to `main`**
  (owner's explicit cleanup+merge command; read the PR/merge facts
  from the repo — they are not guessed here). **Phase 0 has NOT
  started.** Repo root is clean: plan docs + `copy-web/` (the copied
  one-page snapshot, STUDY-only, outside every build). Phase 0
  extraction reads `copy-web/index.html`. No website code, no
  Firebase project, no deploy.
- Decisions digest (full log: `docs/DECISIONS.md`): planning only · no
  merge until owner says · website first, app later · **clean-room
  rebuild, powerful with Firebase backend + helpful extras · audience
  me + a few friends · login + cloud sync from the start (Firestore,
  emulator-first) · v1 = sheet + progress + notes + revision planner**
  (all 2026-11-02) · Spark-only cost guardrail · friends = opt-in,
  summary-only sharing · plan approved · stage-2/Phase-0 authorized
  for the next chat (copied tree already in `copy-web/`; extraction
  reads `copy-web/index.html`) ·
  name `DSA Archive` · MIT · Git identity designated (above).
- **Open right now:** no gate item. Remaining owner items live in
  `docs/DECISIONS.md` (repo is PUBLIC with the third-party copy —
  make it private or explicitly command a visibility change; create
  the Spark Firebase project personally before Phase 2, not now).
- Next: **Phase 0 — Bootstrap + data extraction** —
  0.1 MIT LICENSE + repo hygiene (plan docs already on `main`;
  copied tree already in `copy-web/`) · 0.2 extraction →
  validated `data/problems.json` (495 rows, counts reconciled) ·
  0.3 Vite+React+TS hello-sheet + CI (`site-preview`; Firebase
  emulator config only — **no live project in phase 0**). Then 0-D
  design approval before any real UI.

## How to continue

1. Read `rule.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`,
   `docs/RESEARCH.md`, `docs/DATA-MODEL.md` — trust the repo, not
   memory; never re-ask anything recorded there. Verify state first
   (`git status`, `git log`, PRs, CI) and the designated identity
   (`git var GIT_AUTHOR_IDENT` / `GIT_COMMITTER_IDENT`; set repo-local
   `user.name`/`user.email` to the identity above if they differ).
2. **Confirm the merged starting point:** these plan docs are on
   `main` and the copied tree is under `copy-web/` (owner-commanded
   merge, 2026-11-02). Do not re-commit the plan docs or re-move the
   copied tree. Work on your assigned session branch only.
3. Then implement **Phase 0 only** (parts 0.1–0.3 in
   `docs/ROADMAP.md`; its "Done means" is the acceptance test); end
   with CI green +
   `site-preview` · `docs/phases/NN-<slug>.md` · roadmap row updated ·
   this file updated · short report · **next-chat prompt printed in
   chat** · stop at the merge gate.
