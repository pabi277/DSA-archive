<!-- Adapted for a WEBSITE from AppFlow templates/docs-system/DECISIONS.md (MIT template). -->

# Decisions — DSA Archive website

> The anti-re-ask register (`../rule.md` §3). Answered once, dated.
> Later chats read this before asking anything. Re-asking a recorded
> answer is a defect. Changing an owner answer is a GATE.

## Owner decisions — process (2026-11-02)

- 2026-11-02 — Stage? — **Planning only** in the plan chat; create the
  planning, build nothing yet.
- 2026-11-02 — Merge? — **No merge until the owner explicitly says so**
  (standing law, `rule.md` §2; PR/deploy likewise gated).
- 2026-11-02 — Product order? — **Fully working website first**; app
  later as a separate project.
- 2026-11-02 — Work rules? — Follow `pabi277/AppFlow`, adapted from
  apps to a website. Pinned commit read:
  `57597b3332ad578614a0d9d5609f9cf8a278ee8a`.
- 2026-11-02 — Starting point? — The copied one-page snapshot in this
  repo is STUDY material to rebuild "as I like, better for my use".

## Owner decisions — DECIDE-ONCE batch (answered 2026-11-02, never re-ask)

- 2026-11-02 — Build direction? — Owner's own words: **"I want it to
  be powerful with firebase backed and other things added that will
  be helpful."** Recorded as: clean-room rebuild (Option A base) **+
  Firebase backend** (Auth + Firestore + Hosting), agent to propose
  helpful Firebase-powered additions inside the approved scope
  (`RESEARCH.md` §5 prices them into phases). NOT option B (patch the
  copy) and NOT a full clone with IDE/contest engine.
- 2026-11-02 — Audience? — **Me + a few friends** (shared by invite;
  no public audience in v1).
- 2026-11-02 — Progress storage? — **Login + cloud sync from day 1**
  (implemented phase 2, emulator-first; offline cache still required
  so the app never becomes cloud-only in behaviour).
- 2026-11-02 — V1 scope? — **Sheet + progress + notes + revision
  planner** (roadmap phases 0–6; friends phase 5 is the agreed first
  cut if time slips — agent-proposed, reversible at phase 4 review).

## Owner decisions — exit gate (answered 2026-11-02, complete)

- 2026-11-02 — Plan? — **Approved.** This approves the revised
  Firebase-backed website plan in this file set; it does not by
  itself authorize a PR, merge, deployment, or live Firebase work.
- 2026-11-02 — Stage 2? — **Authorized:** verify the designated Git
  identity (below), commit the planning documents on the session
  branch, inspect that commit, then run **Phase 0 only** in a stage-2
  chat. (Timing/name superseded by the cleanup decision below.)
- 2026-11-02 — Git author identity for THIS repo? —
  **`pabi277 <chakraborttypabi2772006@gmail.com>`** (custom identity
  selected; email supplied by the owner 2026-11-02; display name
  confirmed by the owner 2026-11-02 as `pabi277` — the words
  "Author Name" in the owner's first reply were the format
  placeholder, not the name). The only identity designated for
  commits here; verify with `git var GIT_AUTHOR_IDENT` /
  `GIT_COMMITTER_IDENT` before every commit. Changing it is a GATE.
- 2026-11-02 — Working site name + licence? — **`DSA Archive` +
  MIT** for our original code and data. The MIT `LICENSE` file will
  be added in Phase 0.1. This licence does not cover the copied
  third-party website, its assets, linked third-party content, or
  third-party libraries.
- 2026-11-02 — Cleanup + merge (owner's explicit command, verbatim
  intent): **merge this session branch to `main`, and move all files
  and folders of the copied website into a new `copy-web/` folder so
  the repo root page stays clean.** Recorded as: explicit merge
  authorization for THIS branch/PR only (plan-docs commit + move);
  copied items are `index.html`, `css/`, `js/`, `fonts/`, `images/`
  → `copy-web/`, preserved intact as STUDY material. This supersedes
  the earlier `archive/` folder name and the move-after-extraction /
  next-chat timing for the commit+move. Phase 0 extraction will read
  `copy-web/index.html`. No deployment or live Firebase is authorized
  by this answer, and future merges remain gated.

## Agent decisions (reversible — object if wrong)

- 2026-11-02 — Stack after the Firebase pivot: **Vite + React +
  TypeScript + Tailwind/daisyUI** (was: Astro for a local-only content
  site; changed because login/sync/friends make this a routed web
  *app*). Reversible at phase 0 only. Versions pinned then.
- 2026-11-02 — Firebase = **Spark plan only**; whitelist Auth ·
  Firestore Standard · Hosting (gated) · Emulator Suite (dev/CI).
  No Functions/Storage/RTDB/SQL Connect/Analytics/FCM in v1
  (Functions+Storage require paid Blaze — official pricing checked
  2026-11-02). Blaze or any whitelist addition = GATE.
- 2026-11-02 — Auth v1 = **Google sign-in only** (no passwords held);
  sheet browsable signed-out, personal data login-gated. Reversible.
- 2026-11-02 — Sheet catalogue stays a **git-versioned JSON data
  file**; Firestore stores per-user data only (`DATA-MODEL.md`).
- 2026-11-02 — Friends sharing = **opt-in, summary-only** by default;
  notes/snippets/progress detail are never shared by default.
- 2026-11-02 — Agent never creates the Firebase project or handles
  credentials/service keys; owner does console steps from a checklist
  (phase 2). Web config values are identifiers; security = rules.
- 2026-11-02 — AppFlow's Android `templates/`+`knowledge/` snapshot is
  **not** copied into this repo; only this adapted docs set. Reversible.
- 2026-11-02 — Topic/problem **titles, order, levels, outbound links**
  = factual list data in our file; all prose/design/code clean-room;
  content linked out, never copied (`rule.md` §5).
- 2026-11-02 — Phase 0 implementation pins the versions in
  `package.json`/`package-lock.json`: Vite + React + TypeScript +
  Tailwind/daisyUI. TypeScript catalogue levels permit `null` when the
  source has no badge; do not guess a difficulty. The data is a factual
  extraction only; the owner's 10-row live-sheet spot-check remains
  pending. Reversible at Phase 0 / content remains owner-verified.

## Law waivers

- 2026-11-02 — AppFlow law 13 ("no backend unless the niche proves it;
  offline-first default") — **owner-directed adaptation, not a waiver
  of caution:** backend (Firebase) is the owner's explicit product
  choice for multi-device + friends use; the offline-first *half* of
  the law is kept as an invariant (Firestore local cache + signed-out
  browsing + export). No other law waived; ≤4-week budget stands.

## Third-party licences

- **Nothing shipped yet.** Repo currently holds a third-party site
  copy (their build output/fonts/logos) as STUDY reference only — not
  licensed for redistribution, never in a deployable build.
- Verified at planning (2026-11-02, LICENSE files / API; to be logged
  again with pinned versions when they actually ship): Firebase JS SDK
  Apache-2.0 (+BSD-3 protobuf) · firebase-tools MIT · React MIT ·
  Vite MIT · Tailwind MIT · daisyUI MIT · Astro MIT (rejected for v1).
  Lucide: verify per-file licence at phase 0 before DEPEND.

## Open

- [x] **Exit gate complete (2026-11-02).** Plan, stage-2
      authorization, copied-tree disposition, Git author identity,
      site name, and licence are all recorded above. No exit-gate
      item remains open, and none of them may be re-asked; changing
      any of them is a new GATE decision. Plan-docs commit +
      `copy-web/` move + merge to `main` were separately commanded
      by the owner on 2026-11-02 (above); Phase 0 itself starts in
      the next stage-2 chat — see `prompt.md`.

### Owner items (settings only you should change)

- [ ] **Repo visibility:** `pabi277/DSA-archive` is PUBLIC while
      containing a third-party paid-site copy. Recommended: set
      Private while the third-party copy remains under `copy-web/` (Settings →
      Danger zone) — or explicitly command the agent to change it.
- [ ] **Later, before phase 2 (not now):** create the Firebase
      project personally on the **Spark (no-cost)** plan from the
      checklist the phase-1 record will contain. Never paste service
      account keys/passwords in chat or git.
