<!-- This file is the continuation prompt: paste it into the next chat. -->

# DSA Archive — continuation prompt (v2 programme, one phase per chat)

> **Self-contained handoff.** v1 is complete. **v2 phase 01 is code-complete on
> `arena/42bcf5f6-dsa-archive`, stopped at the merge gate** (no PR, no merge, no deploy).
> Phases 02–10 are planned and not started.
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
  PWA offline. Rules **v4**, backup **v3**. Nothing deployed.
- **v2-01 code complete, awaiting owner review + first CI run** (`docs/phases-v2/01-foundation-router-shell/RECORD.md`):
  hash router (16 routes, `#/notes` included), sidebar/rail/bottom-bar shell, **tokens v2
  frozen**, Tailwind + daisyUI **removed**, density 38/48/62, 24 hand-rolled icons, undo
  toast, `⌘K` palette, `j k x s ↵ ?` triage, windowed sheet (40 rows per topic), 24 visual
  baselines + re-baselined budgets (**335 kB gz shell / 42.2 kB CSS / 57.5 kB fonts**).
  Local proof: **154 unit tests + 24 jsdom shell tests**; Playwright/axe/snapshots run in CI
  only (sandbox cannot download Chromium). **Next chat resumes at the merge gate** — the
  owner reviews the branch, then phase 02 starts from the merged `main`.
- **v2-02 … v2-10 fully planned, zero code written:** nine remaining phase contracts plus
  three policy docs (`RESOURCE-POLICY.md`, `PRACTICE-SETS.md`, `THEORY-MCQ.md`) and the
  authoring guide (`AUTHORING.md`). `data/` is **byte-identical to `main`**.
- **Data facts to trust (audited 2026-11-03):** `data/problems.json` = 495 rows / 20
  topics (Basic 84 · Core 287 · Pro 109 · 15 null; 453 `problem` + 42 `theory`).
  **369 video links** (321 unique: 256 `youtu.be` + 65 `youtube.com`) — **single source
  by owner decision, keep them**; they are copied verbatim from the snapshot (no
  rewrite, no repair). 289 rows have LeetCode links (**273 unique**, 13 duplicated
  slugs). **206 rows have no LeetCode mapping.**
- Tokens **v2 are frozen** (2026-11-03, `src/design/tokens.css` + `UI-REFERENCE.md`
  "Tokens v2"); v1 is history and the one-time re-freeze is spent.

---

## 5. The v2 phases (execute one per chat, in this order)

| # | Folder | Scope in one line | Est | Deps |
|---|---|---|---|---|
| 01 | `01-foundation-router-shell/` | 🟡 **done, at the merge gate** — hash router + sidebar/bottom-bar shell + tokens v2 (Inter + JetBrains Mono, one accent / five semantic roles, density, motion, undo, skeletons, `⌘K`, `j/k/x`, sheet windowing) | 9–11 d | — |
| 02 | `02-topics-browse/` | `#/topics` (all 20 always visible with rings) + `#/topic/<id>` Learn/Practice/Quiz + learning order + **3-way outcome** (`o: clean\|hint\|couldnt`) + `#/search` | 5–6 d | 01 |
| 03 | `03-content-pipeline/` | Content schema + safe renderers + validator/CI + **`resources[]` multi-source** + **`data/practice-sets/` drills (+120–140 LeetCode)** + 42 theory MCQs schema + coverage report | 7–9 d + authoring | 01 |
| 04 | `04-code-notebooks/` | **Delete notes** end-to-end; add `snippets` collection, rules **v5**, backup **v4** (+v3 notes migration), `#/code`, small editor, peek/reveal | 5–6 d | 01 |
| 05 | `05-quiz-engine/` | **Theory MCQ cards** (4 options, per-option explanations, always-available `Show solution`, `[Solve]` vs `[Check]`) + 12-item topic quiz, 80% pass, `quizResults`, guest merge | 6–7 d | 02, 03 |
| 06 | `06-theatre-player/` | In-app YouTube theatre (official IFrame API, our chrome), mini player surviving routes, timeline **stamps**, speed memory, oEmbed metadata + dead-link badge | 7–9 d | 01–03 |
| 07 | `07-browser-runner/` | Local wasm C++/Python/JS runner in a Worker: Run, Stop, diagnostics, authored tests with first-diff, predict-the-output, 14 MB cache control, copy-out for Java/C# | 5–7 d | 04, 03 |
| 08 | `08-insights-light/` | Reason vocabulary + chips, **momentum** (no punitive streak), one-line trajectory, "How this plan was made", 2 detectors, target date/list | 4–5 d | 01, 02, 05 |
| 09 | `09-pwa-accessibility-hardening/` | Budgets re-baselined with published numbers, SW v2 exclusions, CSP (report-only → enforce), a11y × offline matrices, network assertion, dead-dependency decision | 4–5 d | 01–08 |
| 10 | `10-release-v2/` | README v2, generated screenshots, DATA-MODEL v5, CHANGELOG, runbook, honest content-coverage table | 2–3 d | 09 |

**Sequential ≈57–69 build days.** 02 ∥ 03 once 01 merges; 04–07 are independent after 03.

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
10. **No single source of truth for articles**: ranked `resources[]`, ≥2 publishers per
    non-theory row, publisher names always visible, `verified` dates re-checked.
11. **More LeetCode problems**: pattern drills (+120–140) in `data/practice-sets/`,
    reusing `progressByTopic` with `lc-<n>` ids — **no schema change**.

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

> **Ready-made next one (02, once v2-01 is merged):**
>
> Run v2 phase **02 — topics-browse** for `pabi277/DSA-archive`.
> Read `rule.md`, `docs/DECISIONS.md` (both 2026-11-03 v2 batches, plus the
> phase v2-01 implementation notes), `docs/phases-v2/README.md`,
> `docs/phases-v2/00-overview/PLAN.md`, then `docs/phases-v2/02-topics-browse/PLAN.md`
> in full — its acceptance list is the contract. Start from `main` **after** v2-01 is
> merged (the router, shell, tokens v2, palette and triage already exist; reuse them,
> do not rebuild them). Verify branch/CI/identity first, implement only that phase,
> land unit + Playwright (phone & desktop) + axe 0 + visual snapshots (extend the 24-name
> baseline set only where a screen genuinely changed), and update the phase `RECORD.md`,
> `docs/ROADMAP.md` status and `prompt.md` in the same commit. Stop at the merge gate —
> no PR, no merge, no deploy, no `main` push without my explicit command.

---

## 11. Content track (runs in parallel from phase 02; the real long pole)

`docs/phases-v2/03-content-pipeline/AUTHORING.md` — templates + review workflow.
Volumes: 20 primers (600–900 words) · 120 beginner statements (then ~375) · 495 hints ·
495 common mistakes · **42 theory MCQs** · 240 topic-quiz items · ~300 runner test cases ·
~34 pattern files (drills). Order: **P0** = primers, beginner statements, hints/mistakes
for beginner rows, quizzes, theory MCQs, first 10 pattern files. Everything is our own
writing, verified by the owner in small batches, and every screen renders a designed
"content coming" state so code never waits on content.
