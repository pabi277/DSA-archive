<!-- This file is the continuation prompt: paste it into the next chat. -->

# DSA Archive — continuation prompt (v2 programme, one phase per chat)

> **Self-contained handoff.** v1 is complete. v2 Phase 01 is merged to `main` in PR #12
> (`558a25f`; CI run `41635438159` passed). Phase 02 is merged to `main` in PR #13
> (`bd9350b`; CI run `41647413508` passed, including emulator rules and Playwright/axe).
> Phase 03 is **implemented** on `arena/cae52fb6-dsa-archive`; its local validation is
> green and CI/owner-review metadata is recorded in
> `docs/phases-v2/03-content-pipeline/RECORD.md`. No PR was opened: PR/merge remains a
> standing owner gate. The owner's sample-batch content-accuracy review and generated
> visual-baseline review are still pending. No deployment or `main` push was performed.
> Phase 04 is the next build phase after the owner commands Phase 03's PR/merge.
> Authority order: `rule.md` → `docs/DECISIONS.md` (owner answers) →
> `docs/phases-v2/` (phase contracts) → `docs/ROADMAP.md` (status) →
> `docs/DATA-MODEL.md` (Firestore/backup shapes) → `docs/UI-REFERENCE.md`
> (design tokens) → this file (living state). Update **this file** whenever a
> phase closes, in the same commit as that phase's `RECORD.md`.

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
- Docs ride with the code commit: phase `RECORD.md`, `docs/ROADMAP.md` status, this file.

---

## 4. Where we are (2026-11-03)

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
- **v2-03 implementation complete; owner review/merge gate pending**: branch
  `arena/cae52fb6-dsa-archive`; `schemaVersion: 2`, 495 ranked resource rows with ≥2
  publishers, 420/495 exact-or-near LeetCode twins, 136 drills, 42 theory MCQ cards, one
  fully authored Arrays topic, statement/practice screens, coverage CI and a scheduled
  link audit. Local `npm run build`, `npm test` (170), `test:data`, `check:content`,
  `check:rules`, `check:dist`, `check:links`, `check:budgets` all green. CI run id, tip sha
  and `site-preview` bytes are in
  `docs/phases-v2/03-content-pipeline/RECORD.md`. No PR opened, no merge, no deploy.
- **v2-04 … v2-10 not started**: Phase 04 follows only after the owner reviews Phase 03,
  explicitly commands its PR/merge, and starts a new chat. Its primer/statement/quiz-bank
  authoring track continues separately from the build phases.
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
| 03 | `03-content-pipeline/` | 🟡 **implementation complete; owner accuracy/visual review + merge gate** — schema v2 + safe renderers + validator/CI + **`resources[]` multi-source** + **136 drills** + 42 theory MCQs + Arrays primer/statements/quiz + coverage report | 7–9 d + authoring | 01, 02 merged |
| 04 | `04-code-notebooks/` | **Delete notes** end-to-end; add `snippets` collection, rules **v6**, backup **v5** (+v4 notes migration), `#/code`, small editor, peek/reveal | 5–6 d | 01 |
| 05 | `05-quiz-engine/` | **Theory MCQ cards** (4 options, per-option explanations, always-available `Show solution`, `[Solve]` vs `[Check]`) + 12-item topic quiz, 80% pass, `quizResults`, guest merge | 6–7 d | 02, 03 |
| 06 | `06-theatre-player/` | In-app YouTube theatre (official IFrame API, our chrome), mini player surviving routes, timeline **stamps**, speed memory, oEmbed metadata + dead-link badge | 7–9 d | 01–03 |
| 07 | `07-browser-runner/` | Local wasm C++/Python/JS runner in a Worker: Run, Stop, diagnostics, authored tests with first-diff, predict-the-output, 14 MB cache control, copy-out for Java/C# | 5–7 d | 04, 03 |
| 08 | `08-insights-light/` | Reason vocabulary + chips, **momentum** (no punitive streak), one-line trajectory, "How this plan was made", 2 detectors, target date/list | 4–5 d | 01, 02, 05 |
| 09 | `09-pwa-accessibility-hardening/` | Budgets re-baselined with published numbers, SW v2 exclusions, CSP (report-only → enforce), a11y × offline matrices, network assertion, dead-dependency decision | 4–5 d | 01–08 |
| 10 | `10-release-v2/` | README v2, generated screenshots, DATA-MODEL v5, CHANGELOG, runbook, honest content-coverage table | 2–3 d | 09 |

**Sequential ≈57–69 build days.** Phases 01 and 02 are merged; Phase 03 is at its owner review/merge gate. Rules v5 / backup v4 remain the latest merged baseline (Phase 03 adds only generated `lc-<n>` whitelist keys). Future rules/backup versions must increment from the actual merged baseline after each phase.

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
  shell 380 kB gz · runtime assets in a **separate** bucket (never precached).
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

> **Ready-made next one (04, only after Phase 03 is reviewed and merged by my explicit command):**
>
> Run v2 phase **04 — code-notebooks** for `pabi277/DSA-archive`.
> Read `rule.md`, `docs/DECISIONS.md` (both 2026-11-03 v2 batches plus Phase 01–03
> implementation choices), `docs/phases-v2/README.md`,
> `docs/phases-v2/00-overview/PLAN.md`, and
> `docs/phases-v2/04-code-notebooks/PLAN.md` in full. Phases 01 and 02 are merged; Phase 03
> must be reviewed and merged by my explicit command before starting a new phase. Keep Phase
> 04 to its own branch/PR; preserve the earlier phase plans as contracts and advance rules
> v6 / backup v5 from the latest merged baseline (including the Phase 03 `lc-<n>` whitelist
> if Phase 03 lands first). Update its `RECORD.md`, `docs/ROADMAP.md`,
> `docs/DECISIONS.md` if needed, and `prompt.md`. No merge, deploy, or `main` push without
> my explicit command.

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
