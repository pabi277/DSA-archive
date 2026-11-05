# DSA Archive — personal offline-first DSA workspace

> **Status: v1 is complete and deployed-ready; v2 phases 01–03 are merged, and phase 04 (Notes → Code) is implemented on its branch at the owner merge gate.**
> v2 turns this from a 495-row sheet tracker into a **beginner-first workspace**:
> a routed shell with a real design system, all 20 topics as pages, in-app problem
> statements and quizzes, a **Code** section replacing Notes, an **in-app video
> theatre** (official YouTube IFrame player — the app never touches the player),
> and a **local in-browser C++/Python/JS runner**. Phase contracts live in
> [`docs/phases-v2/`](docs/phases-v2/README.md) (one folder per phase); the
> handoff prompt is [`prompt.md`](prompt.md); owner answers are in
> [`docs/DECISIONS.md`](docs/DECISIONS.md); CI keeps running all cloud, rules,
> accessibility, bundle-budget and PWA checks against the local Emulator Suite
> (`demo-dsa-archive`) and real Chromium. Deploy stays owner-executed
> ([`docs/RELEASE-RUNBOOK.md`](docs/RELEASE-RUNBOOK.md)).

## v2 at a glance (planned 2026-11-03)

| # | Phase | What it delivers |
|---|---|---|
| 01 | Router, shell, **design tokens v2** | Every screen has a URL · sidebar/bottom bar · Inter + JetBrains Mono · one accent / five semantic roles · density · motion · undo · `⌘K` · keyboard triage |
| 02 | Topic spine | `#/topics` (all 20 always visible) · topic pages with Learn/Practice/Quiz · learning order · 3-way outcome (clean/hint/couldn't) |
| 03 | Content pipeline | Our own statements, hints, mistakes, primers · **ranked multi-source resources** (no single publisher) · **+120–140 LeetCode drills** by pattern · 42 theory MCQs · validator + coverage report |
| 04 | Notes → **Code** | `snippets` in Firestore, rules v6, backup v5, `#/code`, peek-for-recall editor |
| 05 | Quiz engine | Theory MCQ cards with an always-available solution · 12-item topic quizzes, 80% pass, synced results |
| 06 | Theatre | Video plays inside our screen: our chrome, mini player, timeline stamps, speed memory, dead-link badge |
| 07 | Browser runner | Compile + run C++/Python/JS locally in a Web Worker · authored tests with first-diff · runaway loops stopped · code never leaves the device |
| 08 | Light insights | Reason chips, momentum (no punitive streak), one-line pace, "How this plan was made" |
| 09 | Hardening | Budgets re-baselined with numbers, CSP, a11y + offline matrices, network assertion |
| 10 | Release v2 | Truthful README, generated screenshots, DATA-MODEL v5, changelog, runbook |

Planning adapted from AppFlow @ `57597b3332ad578614a0d9d5609f9cf8a278ee8a`
on 2026-11-02 (provenance only — this repo is self-contained; see
[`rule.md`](rule.md)).

## What DSA Archive ships today (v1 — Phases 0 → 6, complete)

A **clean-room, Firebase-backed DSA web app** inspired by the factual topic and
problem structure of the A2Z sheet (20 topics → subtopics → 495 problems),
built for **the owner + a few invited friends** on Firebase's **no-cost Spark
plan**:

- **Sheet core (Phase 1):** all 495 problems across 20 collapsible topics from
  our validated `data/problems.json`, instant search (`/` shortcut),
  topic/level/link-type/hide-done filters, random pick, weakest-topic focus
  hint, and safe outbound links to Practice, Article, Video, and LeetCode.
  Fully browsable signed out with local guest progress.
- **Google Auth + synced cloud progress + JSON backup (Phase 2):** Google
  sign-in, profile settings sync, topic-sharded `progressByTopic` documents
  backed by IndexedDB `persistentLocalCache()`, explicit guest→cloud merge
  preview, generated `firestore.rules`, and anti-lock-in JSON export/import.
- **Notes, code snippets & custom lists (Phase 3):** per-problem markdown notes
  (hand-written HTML-escaping renderer) and code snippets, searchable notes
  overview, and custom lists that filter the sheet.
- **Planner, spaced revision & on-device stats (Phase 4):** daily goal + Today
  plan (`users/{uid}/plans/{yyyy-mm-dd}`), client-computed **3 → 7 → 21-day**
  spaced revision queue with one-tap *Revised ✓*, 8-week Monday-aligned
  heatmap, streak, weekly strip, and topic/level progress bars.
- **Opt-in friends comparison (Phase 5):** rotatable 128-bit invite codes
  (`invites/{code}`), atomic reciprocal friendships, default-off summary
  sharing (aggregate counts and streak only — notes, snippets, and per-row
  progress stay strictly private), per-topic comparison, rolling 7-day
  friends leaderboard, and a viewer-local group goal.
- **Installable PWA, hardening & release prep (Phase 6):** Web App Manifest +
  clean-room `"DA"` monogram icons + deterministic app-shell Service Worker
  (`sw.js`) for true **Airplane-Mode** cold opens with data intact, friendly
  `404` and `offline.html` states, code-split JS + trimmed CSS enforced by CI
  budgets (`npm run check:budgets`), rules/quota audit, App Check evaluation,
  and the gated deploy runbook ([`docs/RELEASE-RUNBOOK.md`](docs/RELEASE-RUNBOOK.md)).

**Website first.** Data (`data/problems.json`), frozen design tokens, and the
per-user Firestore schema (`docs/DATA-MODEL.md`) are kept portable so a future
Android project remains open as a separate repo.

## Repository contents & `copy-web/` disposition (re-confirmed Phase 6.3)

| Path | Role |
|---|---|
| [`rule.md`](rule.md) | Operating manual (laws, gates, clean-room & Spark invariants) |
| [`prompt.md`](prompt.md) | Self-contained continuation handoff |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phases 0–6 scope and acceptance criteria |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Dated owner & agent decision log + licence register |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Catalogue schema, Firestore v9 schema, Spark quota math (v2 audit + deletion contract), backup v8 |
| [`docs/UI-REFERENCE.md`](docs/UI-REFERENCE.md) | Screen inventory, **frozen** tokens v2, and deliberate adaptations |
| [`docs/RESEARCH.md`](docs/RESEARCH.md) | Specimen audit, reuse scorecard, and pre-written 14-day use test |
| [`docs/RELEASE-RUNBOOK.md`](docs/RELEASE-RUNBOOK.md) | Pre-deploy checklist + owner-gated Firestore rules & Hosting deploy steps |
| [`docs/phases-v2/`](docs/phases-v2/README.md) | **v2 phase contracts** `00`–`10`, one folder each (`PLAN.md`), plus `RESOURCE-POLICY.md`, `PRACTICE-SETS.md`, `THEORY-MCQ.md`, `AUTHORING.md` |
| [`docs/FEEDBACK-v2-REPORT.md`](docs/FEEDBACK-v2-REPORT.md) | Why v1 feels weak: craft + power audit with `file:line` evidence, and the research behind the redesign |
| [`docs/PLAN-in-browser-code-runner.md`](docs/PLAN-in-browser-code-runner.md) | C++-in-the-browser feasibility: measured sizes/timings, why no remote judge |
| `docs/phases/` | v1 phase records `00` through `06` |
| `data/problems.json` | Validated 495-problem / 20-topic catalogue (bundled at build) |
| `src/` | React + TypeScript application, styles, PWA shell, and Vitest suite |
| `public/` | `manifest.webmanifest`, clean-room `icons/`, `offline.html`, `404.html` |
| `firestore.rules` | Generated default-deny security rules (v9, emulator-tested in CI) |
| `firebase.json` | Firestore rules path, Hosting `dist/` config, **enforced CSP** + cache headers, local Emulator ports |
| `tools/` | Extractor, validator, rules generator/tests, SW/icon builders, dist/link/budget/CSP/token checks |
| `e2e/` | Real-Chromium Playwright specs: features plus the phase-09 a11y, offline, network, CSP, deletion and performance matrices; `e2e/matrix.ts` holds the shared profiles, route list and SW fixture |
| `copy-web/` | **STUDY-only** third-party offline page snapshot — **never** imported, scanned, built, or deployed |

### `copy-web/` disposition

- `copy-web/` holds the one-page snapshot originally checked in at `9de75e8`
  and moved into `copy-web/` on 2026-11-02 by explicit owner command.
- Under `rule.md` §§3, 5, `copy-web/` is **STUDY-only provenance** (deleting or
  moving it, or changing repository visibility, requires an explicit owner
  command). It is excluded from `dist/` by Vite (the build only reads `src/`,
  `index.html` and `public/`), excluded from Firebase Hosting uploads
  (`hosting.ignore` in `firebase.json`), and verified absent on every CI run
  by `npm run check:dist`. Tailwind/daisyUI were removed in v2-01, so there is
  no stylesheet scan that could reach it.
- **Owner reminder:** while `copy-web/` remains in the repository/history, keep
  `pabi277/DSA-archive` **Private** in GitHub Settings (or explicitly command
  its removal before keeping the repository public).

## Local verification commands

```bash
npm ci
npm run test:data      # 495 rows · 20 topics · badge & URL invariants
npm run check:rules    # confirm firestore.rules matches data/problems.json
npm test               # Vitest unit + jsdom UI suite
npm run build:emulator # TypeScript + Vite production build + Service Worker
npm run check:dist     # confirm copy-web/ is absent from dist/
npm run check:links    # verify all built HTML & manifest asset references
npm run check:budgets  # enforce CSS, JS, SW v2, PWA and Spark transfer budgets
npm run check:hardening # CSP, token contrast, dead-weight decisions
```

*(Full emulator + Chromium E2E suite `npm run test:emulator` runs automatically
in GitHub Actions `.github/workflows/ci.yml` with Java 21 and Chromium.)*

## Licence & credits

- **Original code & `data/problems.json` extraction (`LICENSE`):** **MIT
  License**, `Copyright (c) 2026 pabi277`.
- **Clean-room attribution & external content:** the 20-topic / 495-problem
  syllabus order and titles reflect the factual curriculum structure of
  takeUforward's *"Striver's A2Z DSA Sheet"*. All problem statements, articles,
  practice pages, LeetCode problems, and YouTube videos remain the intellectual
  property of their respective authors and platforms and are reached strictly
  by linking out; zero third-party prose, solutions, fonts, logos, or compiled
  assets are distributed in our build. The `copy-web/` study folder is **not**
  covered by our MIT licence.
- **Open-source runtime dependencies shipped in `dist/`:**
  - `react` & `react-dom` `19.3.1` — MIT
  - `firebase` `12.19.0` (`@firebase/app`, `@firebase/auth`, `@firebase/firestore`) — Apache-2.0
  - Self-hosted `Inter` (SIL OFL) and `JetBrains Mono` (SIL OFL) Latin subsets — fonts are fetched, never bundled into JS
  - Opt-in local runner toolchains, **not** in `dist/` until `npm run runtime:fetch`: `@live-codes/clang-wasm` (MIT, Clang 22) and `pyodide` (MPL-2.0)
  - Build/test-only dev tooling (not shipped in `dist/`): `vite` (MIT), `@vitejs/plugin-react` (MIT), `typescript` (Apache-2.0), `esbuild` (MIT), `vitest` & `jsdom` (MIT), `@playwright/test` (Apache-2.0), `@axe-core/playwright` (MPL-2.0), `@firebase/rules-unit-testing` (Apache-2.0), `firebase-tools` (MIT).
  - **Tailwind and daisyUI were removed in v2-01** (owner gate decision 2026-11-03). The stylesheet is plain CSS on frozen tokens v2; `npm run check:deadweight` keeps it that way.

## Privacy, deletion & network (phase v2-09)

- **Only your data.** Firestore rules v9 give each signed-in user read/write access to
  their own `users/{uid}` tree and nothing else; friends see an opted-in summary of
  counts and streak, never saved code, quiz answers or per-row outcomes. Guest progress
  stays in this browser's `localStorage` until an explicit merge on sign-in.
- **Delete my data** lives in Settings → *Account & backup* while signed in. One
  two-step action removes `progressByTopic`, `snippets`, `quizResults`, `lists`,
  `plans`, the profile, both sides of each friend link, the invite capability and the
  opt-in `public/summary`, plus this device's guest study records (including watched-video
  history). Device preferences such as theme and finish line are kept. It cannot be undone;
  export a backup JSON first. `e2e/account-deletion.spec.ts` proves every path is gone
  against the Firestore emulator and `src/accountDelete.test.ts` pins the list.
- **No trackers.** No Analytics, no App Check, no reporting endpoint in the CSP, no
  CDN script. The only third-party request is YouTube's official IFrame player on a
  problem route with a video; `e2e/network.spec.ts` asserts that on non-video routes
  nothing leaves for a third party. Learner code is compiled in a local Worker and
  never uploaded.
- **CSP** is enforced by a Hosting header (`tools/csp.mjs` is the single source);
  `e2e/csp.spec.ts` runs the report-only stage first, confirms zero
  `securitypolicyviolation` events across the core routes, and only then repeats
  them with the enforced header. The Service Worker bypasses YouTube, the iframe
  API, Google/Firebase hosts and Firebase's `/__/auth/*` helpers entirely. Runner
  toolchains are **never precached into the shell**: they live in the separate
  opt-in `dsa-archive-runtime-v1` cache that an installed runner reads offline.
