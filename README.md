# DSA Archive — personal offline-first DSA sheet

> **Status: Phases 0, 0-D, 1, 2, 3, 4 and 5 are complete and merged to `main`;
> Phase 6 (Offline/PWA, hardening & release prep) is complete on its session
> branch (`arena/991952b2-dsa-archive`) and STOPPED before merge and deploy.**
> Design tokens approved by the owner in Phase 0-D (2026-11-02) remain
> **frozen** in [`docs/UI-REFERENCE.md`](docs/UI-REFERENCE.md). All cloud,
> security-rules, accessibility, bundle-budget, and Airplane-Mode PWA checks
> run in CI against the **local Firebase Emulator Suite** and real Chromium.
> **No live Firebase project has been created by the agent, no rules or
> Hosting deploy has been made, and there is no public URL.** Exact owner-gated
> release steps live in [`docs/RELEASE-RUNBOOK.md`](docs/RELEASE-RUNBOOK.md).

Planning adapted from AppFlow @ `57597b3332ad578614a0d9d5609f9cf8a278ee8a`
on 2026-11-02 (provenance only — this repo is self-contained; see
[`rule.md`](rule.md)).

## What DSA Archive ships (v1 — Phases 0 → 6)

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
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Catalogue schema, Firestore v4 schema, Spark quota math, backup v3 |
| [`docs/UI-REFERENCE.md`](docs/UI-REFERENCE.md) | Screen inventory, **frozen** tokens, and deliberate adaptations |
| [`docs/RESEARCH.md`](docs/RESEARCH.md) | Specimen audit, reuse scorecard, and pre-written 14-day use test |
| [`docs/RELEASE-RUNBOOK.md`](docs/RELEASE-RUNBOOK.md) | Pre-deploy checklist + owner-gated Firestore rules & Hosting deploy steps |
| `docs/phases/` | Phase records `00` through `06` |
| `data/problems.json` | Validated 495-problem / 20-topic catalogue (bundled at build) |
| `src/` | React + TypeScript application, styles, PWA shell, and Vitest suite |
| `public/` | `manifest.webmanifest`, clean-room `icons/`, `offline.html`, `404.html` |
| `firestore.rules` | Generated default-deny security rules (v4, verified in CI) |
| `firebase.json` | Firestore rules path, Hosting `dist/` config + headers, and local Emulator ports |
| `tools/` | One-time extractor, data validator, rules generator/tests, SW/icon builders, dist/link/budget checks |
| `e2e/` | Real-Chromium Playwright specs (`sheet`, `sync`, `library`, `planner`, `friends`, `pwa`) |
| `copy-web/` | **STUDY-only** third-party offline page snapshot — **never** imported, scanned, built, or deployed |

### `copy-web/` disposition

- `copy-web/` holds the one-page snapshot originally checked in at `9de75e8`
  and moved into `copy-web/` on 2026-11-02 by explicit owner command.
- Under `rule.md` §§3, 5, `copy-web/` is **STUDY-only provenance** (deleting or
  moving it, or changing repository visibility, requires an explicit owner
  command). It is excluded from `dist/` by Vite, excluded from Tailwind CSS
  scanning (`@source` in `src/styles.css`), excluded from Firebase Hosting
  uploads (`hosting.ignore` in `firebase.json`), and verified absent on every
  CI run by `npm run check:dist`.
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
npm run check:budgets  # enforce CSS, JS, PWA and Spark transfer budgets
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
  - `tailwindcss` `4.3.3` (preflight base styles) — MIT
  - `firebase` `12.19.0` (`@firebase/app`, `@firebase/auth`, `@firebase/firestore`) — Apache-2.0
  - Build/test-only dev tooling (not shipped in `dist/`): `vite` (MIT), `@vitejs/plugin-react` (MIT), `typescript` (Apache-2.0), `daisyui` (MIT, unused in built CSS), `vitest` & `jsdom` (MIT), `@playwright/test` (Apache-2.0), `@axe-core/playwright` (MPL-2.0), `@firebase/rules-unit-testing` (Apache-2.0), `firebase-tools` (MIT).
