<!-- Adapted for a WEBSITE from AppFlow templates/docs-system/ROADMAP.md (MIT template). -->

# Roadmap — DSA Archive website (Firebase-backed)

Planning adapted from AppFlow @ `57597b3332ad578614a0d9d5609f9cf8a278ee8a` on 2026-11-02 ·
owner direction (Firebase · me + few friends · login+sync · sheet+progress+notes+revision) recorded 2026-11-02 ·
plan + Phase 0 authorized 2026-11-02 · exit gate complete (Git author identity designated in `DECISIONS.md`)

> One phase = one chat (`../rule.md` §4); 2–4 parts each (detailed in
> `docs/phases/NN-<slug>.md` when executed). Status: 📋 planned ·
> 🚧 in progress · ✅ done · ❌ cancelled (keep the row). **"Done
> means" always includes green CI whose `site-preview` artifact shows
> the increment; Firebase phases additionally require Emulator-Suite
> rules tests green.** No live deploy/PR/merge is implied by a ✅.
> Budget note: phases 0–4 = the useful core; **phase 5 (friends) is
> the first cut** if the 4-week budget (`rule.md` §1) slips.

| # | Phase | Done means | Status |
|---|---|---|---|
| — | **PLAN** | Direction + exit gate complete (2026-11-02): plan approved, name `DSA Archive`, MIT, Git author identity designated (`DECISIONS.md`). By owner command the plan docs + `copy-web/` move were merged to `main` (copied tree now under `copy-web/`, root clean). Phases 0 and 0-D are complete; the design gate is cleared, so UI phases may now proceed one per chat | ✅ |
| 0 | **Bootstrap + data extraction** — 0.1 MIT `LICENSE` + hygiene (plan docs already merged to `main`; copied tree already in `copy-web/`, confirmed outside every build) · 0.2 one-time extraction from `copy-web/index.html` → validated `data/problems.json` (495 rows; topic sums, level split, link counts reconciled vs `RESEARCH.md` §1, discrepancies written up) · 0.3 Vite+React+TS "hello sheet" + Tailwind/daisyUI + CI + Firebase **emulator-only** config skeleton (no live project) | CI green (build + data tests); preview proves "495 problems · 20 topics" from our data file; zero third-party files in `dist/` | ✅ |
| 0-D | **Design prototype + tokens freeze** — every screen/state in `UI-REFERENCE.md` mocked phone-first (incl. sign-in, sync, friends), owner-approved in chat; tokens frozen | Approval dated in `UI-REFERENCE.md`; **no UI phase starts before ✅** — approval dated 2026-11-02, tokens frozen unchanged, mock folded into phase 1 and deleted (`1791693` keeps it readable) | ✅ |
| 1 | **Sheet core** — 1.1 topic/subtopic accordions, all 495 rows from data (browsable signed-out) · 1.2 search + filters (topic/level/link-type) + random pick + weakest-topic hint · 1.3 outbound row actions (practice/article/video/LeetCode) | Full sheet in preview; search narrows instantly; row links work; phone-width usable — **met**: CI [#13](https://github.com/pabi277/DSA-archive/actions/runs/41490242266) green incl. real-Chromium phone/desktop + 2 axe audits; `site-preview` uploaded. Merged to `main` by the owner's explicit command (PR #3, 2026-11-02); no deploy | ✅ |
| 2 | **Firebase Auth + cloud progress** — *pre-step (owner, checklist in phase record): create Spark project personally; agent never handles credentials* · 2.1 Google sign-in + profile · 2.2 progress sync (`DATA-MODEL.md` §3 topic-sharded docs) + offline cache + signed-out→signed-in merge · 2.3 Firestore rules v1 (own-data-only) + emulator tests in CI · 2.4 export/import backup | Solve on phone preview → same progress after "relogin" in a fresh browser profile **against the emulator in CI** + owner's live check once linked (gated); offline marking syncs on reconnect; rules tests prove user A cannot read user B — **met**: CI [#23](https://github.com/pabi277/DSA-archive/actions/runs/41501878705) green at `75a9d7e`; `e2e/sync.spec.ts` (guest merge, relogin in two fresh contexts, offline queue/reconnect, export/import, phone axe) and `tools/firestore-rules.test.mjs` (stranger read/write, invalid fields, oversized bulk write); `site-preview` 312,869 bytes. Live owner check remains gated | ✅ |
| 3 | **Notes, snippets & custom lists** — 3.1 per-problem note (markdown) + my-code snippet, synced · 3.2 notes overview + search · 3.3 custom lists/tags (create, add/remove, filter sheet by list) | Note written on one device appears on the other; lists filter the sheet; all covered by export/import — **met**: CI [#30](https://github.com/pabi277/DSA-archive/actions/runs/41517643913) green at `21809c5`; `e2e/library.spec.ts` writes a note + snippet at 390×844, reads it back in a second fresh browser profile, filters the sheet by a created list (`Showing 2 of 495`), and proves schema-v2 export/import plus the recorded schema-v1 import; `tools/firestore-rules.test.mjs` now runs **8** Emulator rules tests including owner-only notes/lists, size caps and stranger denial; `site-preview` 321,193 bytes. Records: `docs/phases/03-notes-snippets-custom-lists.md`. Merged to `main` via **PR #5** on the owner's explicit command (2026-11-03); no deploy | ✅ |
| 4 | **Planner & revision** — 4.1 daily goal + Today list · 4.2 spaced revision queue (3/7/21 days, computed client-side) + one-tap revised · 4.3 streak heatmap + weekly stats + continue-where-I-left | A solved problem resurfaces on schedule; a full study session runs Today → solve → revise — **met**: CI [#39](https://github.com/pabi277/DSA-archive/actions/runs/41524189110) green at `592c8fd`; `e2e/planner.spec.ts` (390×844) plans five suggested rows, ticks one, adds a searched row, then proves the schedule with a row solved five days ago (`Overdue 2 days · revision 1 of 3`) → one tap `Revised ✓` clears the queue and returns it in 7 days, then checks Stats (streak, 8-week heatmap, weekly strip, topic/level bars) and a schema-v3 export carrying the plan day and `rc: 1`; `tools/firestore-rules.test.mjs` now runs **10** Emulator rules tests (owner-only plans, `doneIds` ⊆ `problemIds`, size/date caps, strangers denied, `rc` required and bounded); `site-preview` 327,940 bytes. Records: `docs/phases/04-planner-revision.md`. **14-day use test (`RESEARCH.md` §6) starts now**; merged to `main` via **PR #6** on the owner's explicit command (2026-11-03); no deploy | ✅ |
| 5 | **Friends (opt-in)** — 5.1 invite code/link + friend add/remove · 5.2 summary sharing toggle (counts/streak only) + rules for friend-readable summary · 5.3 compare by topic + friends-only mini-leaderboard + weekly group goal | Two test accounts: friend sees only the opted-in summary (rules tests prove notes/progress detail stay private); leaderboard updates from summaries only — **met**: CI [#41528923623](https://github.com/pabi277/DSA-archive/actions/runs/41528923623) green at `8aa30dc`, including two-account emulator acceptance and the Friends axe audit; `site-preview` 330,704 bytes. Records: `docs/phases/05-friends.md`. Merged to `main` via **PR #7** (`3303c8a`, 2026-11-02); no deploy | ✅ |
| 6 | **Offline/PWA, hardening & release prep (STOP before deploy)** — 6.1 installable PWA + true offline open · 6.2 perf/a11y budgets (CI), rules + quota audit vs Spark limits, App Check evaluated (adopt only if free-tier-safe) · 6.3 release checklist: README/licence/credits truthful, copied-tree disposition re-confirmed, Firebase Hosting + rules deploy runbook written | Airplane-mode open works with data intact; budgets green; owner shown exact gated deploy steps — **nothing goes live without the owner's explicit command** — **met**: `manifest.webmanifest` + clean-room icons + deterministic `sw.js` precache; `e2e/pwa.spec.ts` proves Airplane-Mode cold open in a fresh tab (signed-out guest + signed-in cached Firestore progress & notes), friendly 404/offline pages, and 0 axe / 0 overflow across dark/light × phone/desktop × large-text; CSS 203.18 → 26.86 kB (6.30 kB gzip) and JS code-split `<500 kB` (`npm run check:budgets` in CI); rules/quota audited (12 Emulator tests + summary write deduplication); App Check & Analytics omitted; linked to owner's Spark project `dsa-archive` (`.env.production` + `.firebaserc`); deploy runbook in `docs/RELEASE-RUNBOOK.md` and record in `docs/phases/06-offline-pwa-hardening-release-prep.md` | ✅ |

## Explicitly NOT in v1 (keeps Firebase free + scope honest)

- Cloud Functions, Cloud Storage (note attachments), Realtime DB,
  SQL Connect, FCM push, Analytics, AI — parked; each is a GATE
  (Functions/Storage also force paid Blaze).
- Code judge/IDE, contest engine, payments, public signup/leaderboard,
  copied articles/solutions, SQL/aptitude sections.
- Catalogue-in-Firestore / admin CMS — sheet stays a git data file.
- The Android app — separate future AppFlow project (door kept open:
  portable data + tokens + Firestore shape).

## Held / cancelled (keep visible)

- *(none yet)*

---

# v2 programme (planned 2026-11-03)

Owner decisions 2026-11-03: craft-first UI · in-app YouTube theatre · notes → code ·
beginner layer (all 20 topics, statements, quizzes) · local C++ runner · expensive
analytics dropped. Full contracts live in [`docs/phases-v2/`](phases-v2/README.md)
(one folder per phase, `PLAN.md` each).

| # | Phase | Done means | Status |
|---|---|---|---|
| v2-01 | Router, shell, design system v2 | every screen has a URL · back button works · one accent/5 roles · density · ⌘K · undo · snapshots + budgets | 🟡 **code complete; CI failure fixes applied, rerun pending + owner review** — hash router with 16 routes, 240 px sidebar / 64 px rail / phone bottom bar, tokens v2 frozen, Tailwind+daisyUI removed, density 38/48/62, ⌘K palette (10 destinations · 20 topics · 495 problems · 11 actions), `j k x s ↵ g t g c ?` triage, 6 s undo toast, windowed sheet (40 rows per topic), 24 axe-audited routes, budget re-baseline **335 kB gz shell / 42.2 kB CSS**. Record: [`docs/phases-v2/01-foundation-router-shell/RECORD.md`](phases-v2/01-foundation-router-shell/RECORD.md) |
| v2-02 | 20-topic spine, topic pages, 3-way outcome | `#/topics` shows all 20 with rings · Learn/Practice/Quiz tabs · outcome persists via emulator | 📋 planned |
| v2-03 | Content pipeline + **resource policy** + **practice sets** | ranked multi-source `resources[]` on every row (≥2 publishers) · LeetCode coverage ≥420/495 · +120–140 drills in `data/practice-sets/` with `#/practice` · 42 theory MCQs · schema + validator green · coverage report | 📋 planned |
| v2-04 | Notes → Code | notes gone from code/rules/backup · snippet syncs across profiles · rules v5 · backup v4 migration | 📋 planned |
| v2-05 | Quiz engine + theory MCQs | 42 theory rows are MCQ cards with always-available `Show solution` · `[Solve]` vs `[Check]`, one action per row · inline checks ≤1 per primer section (budget enforced) · 12-question topic quiz passes at 80% · results sync · guest merge · rules tests | 📋 planned |
| v2-06 | Theatre (in-app YouTube) | 40-min session inside the app · mini player survives navigation · stamps seek · dead-link fallback | 📋 planned |
| v2-07 | Browser runner (C++/Py/JS) | compile+run warm ≤2.5 s · test cases pass/fail with diff · runaway loop stops · no code leaves the device | 📋 planned |
| v2-08 | Light insights | ≤2 reason chips per row · momentum (no punitive streak) · one-line trajectory · "how this plan was made" | 📋 planned |
| v2-09 | PWA/a11y/perf hardening | budgets re-baselined with published numbers · axe 0 across matrix · offline every route · CSP decision | 📋 planned |
| v2-10 | Release v2 | README/screenshots truthful · runbook ready · deploy still gated | 📋 planned |

**Explicitly NOT in v2** (owner decisions): FSRS/retention math · attempt-history engine ·
readiness score · calibration · per-pattern "par" · pattern tagging of all 495 rows ·
notes · transcripts (fetch or paste) · ad-blocking or modifying the YouTube player ·
remote judge/Judge0/Piston · AI of any kind · public signup/leaderboards.
