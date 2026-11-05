<!-- This file is the continuation prompt: paste it into the next chat. -->

# DSA Archive — continuation prompt (v2 programme, one phase per chat)

> **Self-contained handoff.** v1 is complete. v2 Phases 01–07 are merged to `main`
> (PR #12 `558a25f`, PR #13 `bd9350b`, PR #14 `e51695a`, PR #15 `f4fa993`, PR #16
> `4741a1b`, PR #17 `d44b55a`, PR #18 `ace2289`, plus the post-merge CI fix in PR #19
> `79c6099`). Phase 08 (`08-insights-light`) is **implemented** on
> `arena/d4a6c3b3-dsa-archive` and stopped at the owner's PR/review/merge gate: the nine
> reason chips, momentum instead of a punitive streak, one trajectory sentence, "How this
> plan was made", two undoable detectors and `#/insights`, with optional
> `targetDate`/`targetListId` under rules **v9** / backup **v8** and a shell re-baselined
> by the owner to **393 kB gzip / 61 kB raw CSS**. Its closure is recorded in
> `docs/phases-v2/08-insights-light/RECORD.md` — CI run
> [`41996518444`](https://github.com/pabi277/DSA-archive/actions/runs/41996518444) green at
> `76f4909`, `site-preview` 29,677,654 B. Opening a PR and merging remain standing owner gates;
> no PR, merge, deployment or `main` push was performed without the owner's explicit
> command. Phase 09 (`09-pwa-accessibility-hardening`) is the next build phase after the
> owner commands Phase 08's PR and merge.
> Authority order: `rule.md` → `docs/DECISIONS.md` (owner answers) → `docs/phases-v2/`
> (phase contracts) → `docs/ROADMAP.md` (status) → `docs/DATA-MODEL.md`
> (Firestore/backup shapes) → `docs/UI-REFERENCE.md` (design tokens) → this file (living
> state). Update **this file** whenever a phase closes, in the same commit as that
> phase's `RECORD.md`.

---

## 1. Read these first (in order, ~15 minutes)

1. `rule.md` — laws, gates, clean-room, Spark-only, work cycle.
2. `docs/DECISIONS.md` — every owner answer, including the **2026-11-03 v2 batch**
   (two batches: direction + content policy). Never re-ask a recorded answer.
3. `docs/phases-v2/README.md` — the phase index.
4. `docs/phases-v2/00-overview/PLAN.md` — architecture, cross-cutting rules, dependency graph.
5. The folder for the phase you were told to run (`docs/phases-v2/NN-slug/PLAN.md`).
6. `docs/ROADMAP.md` → the v2 table (statuses).

Do **not** start coding before step 5 is read end-to-end.

---

## 2. Identity & environment (fixed)

- Site `DSA Archive` · repo `pabi277/DSA-archive` · MIT for original code/data only.
- Audience: the owner + a few invited friends. Backend: **Firebase Spark only**
  (`projectId: dsa-archive`, `.env.production` + `.firebaserc`). Whitelist:
  Auth (Google) + Firestore + Hosting + Emulator Suite. **No** Functions, Storage,
  Realtime DB, Analytics, FCM, AI.
- Git author: `pabi277 <chakraborttypabi2772006@gmail.com>` — set repo-local
  identity, verify `git var GIT_AUTHOR_IDENT` / `GIT_COMMITTER_IDENT` before committing.
- Each chat uses **its own** Arena-assigned branch cut from current `main`; never
  rename, switch, reuse another chat's branch, or push `main`.

## 3. Rules digest (full text: `rule.md`)

- **GATES — ask, never act:** PR · merge · `main` push · deploy (incl. preview
  channels) · live Firebase/rules deploy · Spark→Blaze · new Firebase products ·
  repo visibility · money · analytics/trackers · AI · publishing anything derived
  from the copied page · changing a recorded owner answer.
- **Clean-room:** `copy-web/` is STUDY-only; never ship its code, fonts, logos, text.
  Topic/problem titles + outbound links may be reused as facts; **learning content is
  reached by linking out** and all statements/primers/quizzes we ship are written by us.
- **No-secrets:** never handle Firebase tokens or credentials in chat or git.
- **CI per phase:** unit + Playwright (390×844 and 1440×900) + axe (0 violations) +
  `check:budgets` + `check:link`/`check:dist` + data validation; Firebase-touching phases
  also run **Emulator rules tests**. Every run uploads the `site-preview` artifact.
- **Toolchains are fetched, not committed:** `npm run runtime:fetch` (`--pack cpp` on CI,
  both packs locally) downloads and sha-512-verifies `public/runtime/{clang,pyodide}/`;
  `npm run runtime:worker` bundles the 1.28 MB worker; `npm run runtime:check` re-verifies
  both. `prebuild`/`predev` rebuild the worker automatically so `dist/` is never stale, but
  the packs are an explicit `runtime:fetch` (build works offline, and a build without a pack
  ships the honest "not deployed with this build" state).
  `public/runtime/` contents are git-ignored by design — a fresh clone must fetch them.
- Docs ride with the code commit: phase `RECORD.md`, `docs/ROADMAP.md` status, this file.

---

## 4. Where we are (2026-11-04)

- **v1 complete** (`docs/phases/00…06`): 495 problems / 20 topics, Google Auth +
  Firestore progress sync, notes+snippets+lists, planner + 3/7/21 revision, friends,
  PWA offline. Rules v4 (v1 programme) and backup v3 were the v1-era versions; nothing
  was deployed by this Phase 2 work.
- **v2-01 complete and merged**: PR #12 → `main` at `558a25f`; CI run `41635438159`
  passed. The Phase 1 contract is preserved in
  `docs/phases-v2/01-foundation-router-shell/PLAN.md`; its closure is recorded in
  `docs/phases-v2/01-foundation-router-shell/RECORD.md`.
- **v2-02 complete and merged**: PR #13 → `main` at `bd9350b`; CI run `41647413508`
  passed with emulator rules, Playwright phone/desktop, axe, bundle, and catalogue
  checks. All 20 topics, topic tabs/practice/outcomes, grouped search, and Today
  updates are implemented. No deployment occurred.
- **v2-03 complete and merged**: PR #14 → `main` at `e51695a` (2026-11-03); `main` CI
  run `41696457606` passed. `schemaVersion: 2`, 495 ranked resource rows with ≥2
  publishers, 420/495 exact-or-near LeetCode twins, 136 drills, 42 theory MCQ cards, one
  fully authored Arrays topic, statement/practice screens, coverage CI and a scheduled
  link audit. Closure is recorded in `docs/phases-v2/03-content-pipeline/RECORD.md`.
  No deployment occurred.
- **v2-04 complete and merged**: PR #15 → `main` at `f4fa993` (2026-11-04); CI run
  `41782795154` green (emulator rules v6, 83 Playwright tests, axe 0, 56 visual
  baselines). Notes deleted end-to-end; `users/{uid}/snippets/{problemId}` under rules
  **v6**, backup **v5** (schemas 1–4 still import; legacy code kept byte-for-byte,
  markdown dropped with a named warning), `#/code` search + filters, small editor,
  peek-for-recall and copy-out. Record: `docs/phases-v2/04-code-notebooks/RECORD.md`.
- **v2-05 complete and merged**: PR #16 → `main` at `4741a1b` (2026-11-04). 42
  `TheoryMcqCard`s, 3 Arrays primer inline checks, `#/quiz` + `#/quiz/<topicId>` Mulberry32
  runner (`1–4` / `Enter` / `r`, `≥80%` pass, per-kind breakdown + primer re-read links),
  `users/{uid}/quizResults/{topicId}` under rules **v7** (18 emulator tests), guest
  `dsa-archive.quiz.v1` + explicit merge-on-sign-in, backup **v6** (schemas 1–5 accepted),
  total precached shell **376.01 kB** gzip. Record: `docs/phases-v2/05-quiz-engine/RECORD.md`.
- **v2-06 complete and merged**: PR #17 → `main` at `d44b55a` (2026-11-04), CI run
  `41825858179` green on its branch. `#/problem/<id>` is the theatre — the official IFrame
  Player API on that route only, our control bar **below** the frame (play/pause, ±10 s,
  clock, per-topic speed 0.5–2×, Stamp, captions `c`, skip-to-next-stamp, watched ≥60%),
  keys `space/k ←/→ c s n` (`f` fill-screen dropped on purpose), one mini player that docks
  the *same* frame across routes, timeline stamps in `snippets[id].moments` under rules
  **v8**, build-time oEmbed metadata in `data/media/<videoId>.json`, the dead-link
  `Open on YouTube` card, opt-in auto-advance and a Settings card with the honest ads line.
  Backup **v7** (reads 1–7). **Owner re-baselined the shell cap 380 → 386 → 388 kB gzip**
  (rationale + rejected alternatives in the phase record).
  Record: `docs/phases-v2/06-theatre-player/RECORD.md`.
- **v2-07 implemented; owner PR/review/merge gate pending**: branch
  `arena/435eaa93-dsa-archive`. A **Run** panel beside the code on
  `#/problem/<id>?tab=code` (and in the row editor): `Run ▸`, `Run tests ▸ N` over the
  phase-03 authored cases with `✓ 3/3` / `✗ 2/3 — case 3 differs` and a ≤10-line
  first-diff, `stdin`, output with `Compiled in … · ran in … · exit N`, compile
  diagnostics (first line + `N more`), `Stop` (a worker `terminate()`, instant),
  copy/clear, `⌘↵` run and `Esc` stop. Languages: **C/C++** (Clang 22 + `wasm-ld` + wasi
  sysroot on wasm, `@live-codes/clang-wasm` MIT, **29.0 MB**), **Python** (Pyodide
  MPL-2.0, **13.5 MB**), **JavaScript** (native sandbox, no pack). Java/Go/Rust/TS get a
  reason plus copy-out, never a dead Run. Downloads are opt-in per language, announced
  with their real byte count, cached in `dsa-archive-runtime-v1`, reported and cleared in
  Settings. The whole runner — panel, CSS, 1.28 MB worker, toolchains — is an **installed
  add-on**: `assets/runner-*` chunks and `runtime/` are never precached and are served
  cache-first from the runtime cache after install. **Shell measured 386,674 B gzip
  against the frozen 388,000 B cap (1,326 B headroom)** — no re-baseline was made. No
  Firestore/rules/backup change (rules **v8** / backup **v7** stand). 294 unit tests;
  Playwright + axe + emulator rules run in CI.
  Record: `docs/phases-v2/07-browser-runner/RECORD.md`.
- **v2-08 implemented; owner PR/review/merge gate pending**: branch
  `arena/d4a6c3b3-dsa-archive`. Every recommendation now carries a reason from a fixed
  nine-item vocabulary (`src/insights/reasons.ts`): `overdue 2d` · `due today` ·
  `first solve` · `next in your target` · `shaky — couldn’t last time` · `weakest topic` ·
  `not touched 41d` · `quiz to pass` · `buddy of <problem>` — at most two muted chips per
  Today row, plus the same chips on suggested picks, topic Practice rows and every ⌘K
  problem result, with the full list in the tooltip. Today's head line is **Momentum 7.2 ·
  4 study days this week** (`Σ 0.9^daysAgo × active(day)` over 14 days, scaled to 10; a
  rest day is *earned* at 5 study days in the last 7) instead of the punitive streak, **How
  this plan was made** is a `<details>` with the four rules and the real inputs, plan vs
  reality reads `Planned 5 · completed 3 · median 3.0/day over 3 weeks` with one optional
  `Set goal to 3`, and two detectors (`6 forgotten solves → Add 6 to today` with one undo;
  `3 stale solutions → Open in Code`) are dismissible per day. `#/insights` holds the
  momentum strip (`role="img"` + sentence), the one trajectory sentence (median pace over
  the last 14 active days; `Needs 3.4/day` when stalled), both detectors and the optional
  **target date / target list**, which bias the picks inside 14 days and sync to the
  profile under generated rules **v9** (backup **v8**, schemas 1–7 still import). No new
  collection, no extra read. **Owner re-baselined the budgets (2026-11-05): shell 388 →
  393 kB gzip, CSS raw 60 → 61 kB** — measured 391,193 B gzip (+4,613 B) and 60,238 B raw,
  1,807 B of headroom; the layer is Today surface, so it cannot ride an on-demand bucket.
  349 unit tests (55 new), 124 Playwright tests (1 skipped), `e2e/insights.spec.ts` at phone
  and desktop with axe 0, 60 visual baselines. **CI run
  [`41996518444`](https://github.com/pabi277/DSA-archive/actions/runs/41996518444) green at
  `76f4909`**, `site-preview` 29,677,654 B (it carries the C++ toolchain). No deployment, no
  PR, no merge.
  Record: `docs/phases-v2/08-insights-light/RECORD.md`.
- **v2-09 … v2-10 not started**: Phase 09 follows only after the owner reviews Phase 08,
  explicitly commands its PR/merge, and starts a new chat. The primer/statement/quiz-bank
  authoring track continues separately from the build phases. The **~300 runner test
  cases** in the content track (`docs/content/AUTHORING.md`) now have a consumer: authored
  `tests[]` feed `Run tests` on the problem page.
- **Data facts to trust (audited 2026-11-03):** `data/problems.json` = 495 rows / 20
  topics (Basic 84 · Core 287 · Pro 109 · 15 null; 453 `problem` + 42 `theory`).
  **369 video links** (321 unique: 256 `youtu.be` + 65 `youtube.com`) — **single source
  by owner decision, keep them**; they are copied verbatim from the snapshot (no
  rewrite, no repair). 289 rows have LeetCode links (**273 unique**, 13 duplicated
  slugs). **206 rows have no LeetCode mapping.** Phase 03 adds additive
  `resources[]`, `lcMatch`, `lcLabel` and optional `coveredBy` to every row, four
  derived runtime catalogue shards, `data/content/` and `data/practice-sets/`.
- Tokens **v2 are frozen** (`src/design/tokens.css` + `UI-REFERENCE.md`); v1 is history
  and the one-time re-freeze is spent.

---

## 5. The v2 phases (execute one per chat, in this order)

| # | Folder | Scope in one line | Est | Deps |
|---|---|---|---|---|
| 01 | `01-foundation-router-shell/` | ✅ **merged in PR #12** — hash router + sidebar/bottom-bar shell + tokens v2 (Inter + JetBrains Mono, one accent / five semantic roles, density, motion, undo, skeletons, `⌘K`, `j/k/x`, sheet windowing) | 9–11 d | — |
| 02 | `02-topics-browse/` | ✅ **merged in PR #13** (`bd9350b`) — `#/topics` + topic pages + practice/outcomes + Today + grouped search; run `41647413508` green | 5–6 d | 01 |
| 03 | `03-content-pipeline/` | ✅ **merged in PR #14** (`e51695a`) — schema v2 + safe renderers + validator/CI + **`resources[]` multi-source** + **136 drills** + 42 theory MCQs + Arrays primer/statements/quiz + coverage report; run `41696457606` green | 7–9 d + authoring | 01, 02 merged |
| 04 | `04-code-notebooks/` | ✅ **merged in PR #15** (`f4fa993`) — **Delete notes** end-to-end; `snippets` collection, rules **v6**, backup **v5** (+v4 notes migration), `#/code`, small editor, peek/reveal; run `41782795154` green | 5–6 d | 01 |
| 05 | `05-quiz-engine/` | ✅ **merged** (PR #16, `4741a1b`) — **Theory MCQ cards** (4 options, per-option explanations, always-available `Show solution`, `[Solve]` vs `[Check]`), 3 Arrays inline checks, 12-item topic quiz, 80% pass, `quizResults`, rules **v7**, backup **v6**, guest merge | 6–7 d | 02, 03 |
| 06 | `06-theatre-player/` | ✅ **merged in PR #17** (`d44b55a`) — official IFrame player on `#/problem/<id>` only, our bar *below* the frame (play/pause, ±10 s, per-topic speed, Stamp, `c`, skip-to-stamp, watched ≥60%; `f` consciously dropped), one mini player across routes, stamps in `snippets[id].moments` (rules **v8**, backup **v7**, undoable), build-time oEmbed metadata, opt-in auto-advance, Settings card; shell re-baselined **380 → 388 kB** by owner decision (`~2 kB` headroom); run `41825858179` green | 7–9 d | 01–03 |
| 07 | `07-browser-runner/` | ✅ **merged in PR #18** (`ace2289`; post-merge CI fix PR #19 `79c6099`) — one sandboxed module worker: Clang 22 on wasm for **C/C++** (29.0 MB, opt-in), **Pyodide** for Python (13.5 MB, opt-in), native **JS** (no pack); `Run ▸` / `Run tests ▸ N` with first-diff, compile diagnostics + `N more`, `Stop` = `terminate()`, stdout/stderr caps 256 kB, 3 s per case / 30 s total, `⌘↵`/`Esc`, `stdin`, copy/clear; predict-the-output hook after an MCQ answer; copy-out with a reason for Java/Go/Rust/TS; cache reported + cleared in Settings (`dsa-archive-runtime-v1` only); **add-on chunk** design keeps the shell at **386,674 B gzip** (cap 388,000) and the toolchains in their own bucket; no Firestore change | 5–7 d | 04, 03 |
| 08 | `08-insights-light/` | 🟡 **implemented on `arena/d4a6c3b3-dsa-archive`; owner PR/merge gate** — nine reasons, ≤2 chips per row, momentum (decays, never resets; rest day earned at 5/7), one trajectory sentence (median pace, `Needs 3.4/day` when stalled), `<details>` "How this plan was made", plan vs reality + one-tap goal, two detectors with one undo, `#/insights`, optional `targetDate`/`targetListId` under rules **v9** / backup **v8** (no new collection, no extra read); **shell 391,193 B gzip against the owner's re-baselined 393 kB** (and CSS raw 60,238 / 61,000) | 4–5 d | 01, 02, 05 |
| 09 | `09-pwa-accessibility-hardening/` | Budgets re-baselined with published numbers, SW v2 exclusions, CSP (report-only → enforce), a11y × offline matrices, network assertion, dead-dependency decision | 4–5 d | 01–08 |
| 10 | `10-release-v2/` | README v2, generated screenshots, DATA-MODEL v5, CHANGELOG, runbook, honest content-coverage table | 2–3 d | 09 |

**Sequential ≈57–69 build days.** Phases 01–07 are merged; Phase 08 is implemented on `arena/d4a6c3b3-dsa-archive` at its owner PR/review/merge gate. Rules **v8** / backup **v7** and the shell cap of **388 kB** gzip are the latest *merged* baseline on `main`; Phase 08 advances them to rules **v9** / backup **v8** and a shell cap of **393 kB** (CSS raw 61 kB) on its branch, on the owner's explicit decision of 2026-11-05. Phase 09 owns the next cap review with the runner and the insight layer both in place.

Each `PLAN.md` already contains: charter · current-state evidence (`file:line`) · scope in ·
scope **out with reasons** · design spec/wireframes · file plan (`NEW`/`EDIT`/`DELETE`) ·
data model · a11y + performance targets · test table · risk table · acceptance criteria ·
exit gate. **The acceptance list is the contract** — do not add features outside it.

---

## 6. Approved gate re-openings (2026-11-03 — use them, don't re-litigate)

- **Design tokens v1 → v2**: one-time re-freeze in phase 01 after the owner reviews
  tokens v2. `UI-REFERENCE.md` keeps v1 as history.
- **"System fonts only" lifted**: two self-hosted subsets (~45 kB), budgeted.
- **CI budgets re-baselined once**, in phase 09, with published numbers + rationale:
  CSS 60 kB raw / 18 kB gz · entry JS 180 kB raw / 55 kB gz · single chunk 520 kB raw ·
  shell 380 kB gz (owner re-baselined to **388 kB** in phase 06, then **393 kB** in phase 08
  together with CSS raw **61 kB**) · runtime assets in a
  **separate** bucket (never precached). Phase 07 added two more separate buckets with
  published caps — runner UI 120 kB raw / 40 kB gz, toolchains 48 MB raw — and asserts the
  Service Worker precaches none of them.
- **Tailwind/daisyUI**: decide (use them or remove them) — no third state.
- **CSP**: adopt (report-only first), including `frame-src` for YouTube and `worker-src`.

## 7. Owner decisions that shape the work (2026-11-03 — full text in `DECISIONS.md`)

1. **UI craft first**; it must be excellent, not polished later.
2. **Expensive analytics dropped**: no FSRS, attempt-history engine, readiness score,
   calibration, per-pattern "par", weak-pattern radar, workload forecast, ETA model.
   Cheap survivors only (reason chips, one `o` field, momentum, one-line pace).
3. **Videos play inside our screen** via the official IFrame player. **Never modify,
   overlay or block the player** (ToS §4.13). The owner uses **Brave**, so ads are the
   browser's business — this is a permanent limit, not a TODO.
4. **Video links stay single-source** (takeuforward sheet) — do not multi-source or
   bulk-rewrite them. Multi-source applies to **articles/resources** only.
5. **Transcripts dropped** (auto-fetch *and* paste-your-own). Do not reintroduce.
6. **Notes section removed → Code section** in Firestore.
7. **Beginner audience**: all 20 topics visible, in-app statements, primers, hints,
   mistakes, quizzes. Copy readable by a first-year student.
8. **Code execution is local** (wasm in a Worker). **No** server, **no** Judge0/Piston,
   no hidden suites, no judge verdicts.
9. **Coding stays coding, theory becomes MCQ** — one action per row: `[Solve]` or
   `[Check]`. No quiz spam: checks only where they are checkable, follow the material,
   and change behaviour (≤3 per topic beside the quiz, ≤1 inline per primer section).
10. **No single source of truth for articles/learning resources**: ranked `resources[]`,
    ≥2 publishers per non-theory row, publisher names always visible, `verified` dates
    re-checked. **Videos stay single-source** in `links.video` by owner clarification
    (`69834c7`); no rewrite, multi-sourcing or player modification.
11. **More LeetCode problems**: pattern drills (+120–140) in `data/practice-sets/`,
    reusing `progressByTopic` with `lc-<n>` ids — **no Firestore schema change**; only
    the generated rules whitelist and per-topic size cap include the known drill ids.

## 8. Hard no list

Notes · transcripts/scraping · ad-blocking or touching the YouTube player · remote judge ·
AI of any kind · Cloud Functions/Storage/Realtime DB/Analytics · public signup or
leaderboards · copying third-party prose · bulk link rewrites · multi-sourcing the video
links · code judge/IDE beyond the local runner · changing a recorded answer without a gate.

---

## 9. How to execute one phase (checklist)

1. Verify: branch, `git status`, open PRs, CI, Git identity. Read the phase `PLAN.md`.
2. Scan for reuse first (DEPEND/ADAPT/STUDY/BUILD/REJECT) and record the decision.
3. Implement **only** that phase's acceptance criteria, in 2–4 parts.
4. Land tests: unit + Playwright (phone/desktop) + axe 0 + visual snapshots; rules tests
   if Firestore changed; budgets if bundles changed.
5. Update in the same commit: `docs/phases-v2/NN-slug/RECORD.md` (CI run id, tip sha,
   `site-preview` bytes, what is now visible, deviations, content added; for v2-01 the
   RECORD is written and the CI run id / preview bytes are the open blanks),
   `docs/ROADMAP.md` status, `docs/DECISIONS.md` if anything was decided, **and this file**.
6. Report to the owner, print the next-chat prompt (template in §10), then **stop at the
   merge gate**. Never merge, never deploy, never push `main`.

## 10. Copy-paste prompt for the next chat

> **Next chat prompt (fill `{NN}` / `{slug}`):**
>
> Run v2 phase **{NN} — {slug}** for `pabi277/DSA-archive`.
> Read, in order: `rule.md`, `docs/DECISIONS.md` (v2 batches, 2026-11-03),
> `docs/phases-v2/README.md`, `docs/phases-v2/00-overview/PLAN.md`, then
> `docs/phases-v2/{NN}-{slug}/PLAN.md` in full — its acceptance list is the contract.
> Verify branch/`git status`/open PRs/CI/Git identity first, then implement only that
> phase, land its tests (unit + Playwright phone & desktop + axe 0 + snapshots;
> emulator rules tests if Firestore changed), and update the phase `RECORD.md`,
> `docs/ROADMAP.md` status and `prompt.md` in the same commit. Stop at the merge gate —
> no PR merge, no deploy, no `main` push without my explicit command.

> **Ready-made next one (09, only after Phase 08 is reviewed and merged by my explicit
> command and its CI emulator/Playwright/axe/visual matrix is green):**
>
> Run v2 phase **09 — pwa-accessibility-hardening** for `pabi277/DSA-archive`.
> Read `rule.md`, `docs/DECISIONS.md` (both 2026-11-03 v2 batches, the 2026-11-04 phase-06
> cap decision, the **2026-11-05 phase-08 cap decision — shell 393 kB gzip / CSS raw
> 61 kB, measured 391,193 B and 60,238 B, so there is 1,807 B of headroom and any further
> shell growth is a gate, not a re-baseline** — and the Phase 01–08 implementation choices,
> especially: the YouTube IFrame ToS §4.13 rules (never modify, overlay or block the
> player), video links single-source, the integrity rule that no verdict is ever invented,
> the runner's separate add-on buckets that the Service Worker must never precache, and the
> insight layer being *Today* surface that must stay precached), `docs/phases-v2/README.md`,
> `docs/phases-v2/00-overview/PLAN.md`, and
> `docs/phases-v2/09-pwa-accessibility-hardening/PLAN.md` in full — its acceptance list is
> the contract.
> Phases 01–07 are merged (`main` = PR #19, `79c6099`); Phase 08 is implemented on
> `arena/d4a6c3b3-dsa-archive` and must be reviewed and merged by my explicit command
> before a new phase starts. Advance from the actual merged state and **verify versions
> before versioning anything** (rules **v8** / backup **v7** as of the Phase 07 merge;
> Phase 08 advances them to rules **v9** / backup **v8** and re-baselines the shell to
> 393 kB gzip / CSS raw 61 kB). Phase 09 is the hardening gate: re-baseline review with
> published numbers, Service Worker exclusions, CSP report-only → enforce, the a11y ×
> offline matrices, the network assertion and the dead-dependency decision.
> Update `RECORD.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md` if needed, and `prompt.md`.
> No PR, merge, deploy, `main` push, or any live Firebase command without my explicit
> command.

---

## 11. Content track (runs in parallel from phase 02; the real long pole)

`docs/phases-v2/03-content-pipeline/AUTHORING.md` — templates + review workflow;
`docs/content/AUTHORING.md` — the live workflow and per-topic checklist.
Volumes: 20 primers (600–900 words) · 120 beginner statements (then ~375) · 495 hints ·
495 common mistakes · **42 theory MCQs** · 240 topic-quiz items · ~300 runner test cases ·
~34 pattern files (drills). Phase 03 landed 1 primer, 6 beginner statements, 6 hints +
mistakes, 12 topic-quiz items, 42 theory MCQs, 18 runner cases and 34 drill files; the
generated `docs/content/coverage.md` is the checked-in progress report. Order: **P0** =
primers, beginner statements, hints/mistakes for beginner rows, quizzes, theory MCQs,
first 10 pattern files. Everything is our own writing, verified by the owner in small
batches, and every screen renders a designed "content coming" state so code never waits
on content. **Owner sample-batch accuracy review is pending.**
