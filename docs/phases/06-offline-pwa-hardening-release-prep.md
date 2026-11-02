# Phase 6 — Offline/PWA, hardening & release prep (STOP before deploy)

- Date: 2026-11-02
- Status: 🚧 **implemented on `arena/991952b2-dsa-archive`, awaiting CI run confirmation, stopped before PR/merge/deploy.**
- Scope: roadmap Phase 6 only — **6.1** installable PWA + true offline open + friendly offline / 404 states · **6.2** perf & a11y budgets in CI, Firestore rules + Spark quota audit, Firebase App Check evaluation · **6.3** release checklist, truthful `README.md`/licence/credits, `copy-web/` disposition re-confirmed, Firebase Hosting + rules deploy runbook (`docs/RELEASE-RUNBOOK.md`). **Nothing is deployed; no live Firebase project was created or touched.**
- Prerequisites: Phase 5 merged to `main` at `3303c8a8f965dbe50ef107de63e2fb81ab95c781` (PR #7); frozen 0-D tokens unchanged; repo-local Git identity set to and verified as `pabi277 <chakraborttypabi2772006@gmail.com>`.

## Delivered

### 6.1 — Installable PWA + true offline open + friendly offline / 404 states

- **Web App Manifest & clean-room icons (`public/manifest.webmanifest`, `tools/generate-pwa-icons.mjs`, `public/icons/*`, `index.html`):**
  - `manifest.webmanifest` sets `name`/`short_name: "DSA Archive"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, and `#101313` (`--canvas`) for both `background_color` and `theme_color` (`index.html` `<meta name="theme-color">` updated from the Phase 0 `#f5f7fa` placeholder to `#101313`).
  - `tools/generate-pwa-icons.mjs` generates `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180×180), and `icon.svg` deterministically using only Node's built-in `node:zlib` and our frozen tokens (`#101313` canvas, `#171b1b` surface, `#343a38` border, `#edf0ed`/`#c4d0ca` `"DA"` monogram) — zero third-party dependencies and zero `copy-web/` assets.
- **Deterministic Service Worker & app-shell precache (`tools/build-sw.mjs`, `vite.config.ts`, `src/pwa.ts`, `src/main.tsx`):**
  - On every production build (`closeBundle`), `tools/build-sw.mjs` hashes all built files in `dist/` into a versioned cache bucket (`dsa-archive-shell-<12-hex>`) and writes `dist/sw.js` precaching `/`, `/index.html`, `/offline.html`, `/404.html`, `/manifest.webmanifest`, all icons, and every content-hashed CSS and JS chunk.
  - `sw.js` intercepts **only same-origin `GET`** requests and explicitly bypasses `/__/*` (`url.pathname.startsWith('/__/')`), preserving Firebase Hosting's reserved `/__/auth/handler` and `/__/auth/iframe` OAuth endpoints as well as all Firestore/Auth API and outbound problem traffic.
  - Document navigations use network-first when online (with an instant cache fast-path when `navigator.onLine === false` and catch fallback on network error) serving `/index.html` (or `/offline.html` as last-resort fallback); hashed assets serve cache-first.
  - `src/pwa.ts` registers `/sw.js` in production over HTTP(S), degrades quietly if blocked, surfaces an optional `Install` topbar control only when `beforeinstallprompt` fires (no dead button), and validates routes (`isAppRoute`).
- **Offline cold-boot hardening (`src/accountData.ts`):**
  - Fixed a real offline cold-open failure mode: `accountData.ts` previously called `getDoc(profileRef)` unconditionally on sign-in restoration, which rejects with `unavailable / client is offline` when booting a fresh tab in Airplane Mode and flipped the sync pill to `Sync error`. It now falls back to `getDocFromCache(profileRef)` when offline so signed-in Airplane-Mode cold opens load cleanly from IndexedDB with `Offline — changes will sync`. Signed-out Airplane-Mode opens now report `Offline — local only`.
- **Friendly Offline & Not-Found (`404`) states (`public/offline.html`, `public/404.html`, `src/App.tsx`):**
  - Unknown paths (`/anything-else`) render an accessible `Page not found` state inside the app chrome with a one-tap `Back to the sheet` action that works both online and in Airplane Mode, backed by self-contained `public/404.html` and `public/offline.html` using frozen dark/light tokens and zero external URLs.

### 6.2 — Perf & a11y budgets (CI), rules + Spark quota audit, App Check evaluation

#### Performance & bundle budgets (`src/styles.css`, `vite.config.ts`, `src/accountData.ts`, `tools/check-budgets.mjs`)

| Metric | Phase 5 baseline | Phase 6 actual | CI hard cap (`check:budgets`) | Change |
|---|---:|---:|---:|---|
| Built CSS (`assets/index-*.css`) | 203.18 kB raw · 32.84 kB gzip | **26.86 kB raw · 6.30 kB gzip** | ≤ 36 kB raw · ≤ 8.5 kB gzip | **−86.8% raw / −80.8% gzip** (scoped Tailwind `@source` to `src/` + `index.html`, stopping scans of `copy-web/`, and removed unused `@plugin "daisyui"` CSS emission while keeping approved packages pinned) |
| Entry app JS (`assets/index-*.js`) | 1,093.06 kB raw · 300.52 kB gzip | **103.25 kB raw · 28.39 kB gzip** | ≤ 130 kB raw · ≤ 36 kB gzip | **−90.6% entry JS** via Rolldown `codeSplitting.groups` (`catalogue`, `react-vendor`, `firebase-auth`, `firebase-firestore`, `firebase-transport`, `firebase-core`) + lazy `import('./backup')` |
| Largest single JS chunk | 1,093.06 kB (`>500 kB` warning) | **486.05 kB raw · 139.89 kB gzip** (`firebase-firestore`) | ≤ 500 kB raw · ≤ 155 kB gzip | Zero Vite chunk-size warnings |
| Full precached shell (all 19 files) | ~330.7 kB zip (no PWA/icons/SW) | **317.66 kB gzip total** (incl. SW, manifest, icons, 404 & offline pages) | ≤ 335 kB gzip | Smaller overall than Phase 5 despite adding full PWA offline support |

- **Accessibility & responsive budgets (CI):** **0** axe-core violations and **0** horizontal overflow (`scrollWidth <= innerWidth`) enforced across `Sheet`, `Today`, `Revision`, `Notes`, `Lists`, `Stats`, `Friends`, `404 Not Found`, and `offline.html` across **dark + light × phone (`390×844`) + desktop (`1280×900`) × large-text** (`e2e/pwa.spec.ts` + `e2e/sheet.spec.ts` + `e2e/sync.spec.ts` + `e2e/library.spec.ts` + `e2e/planner.spec.ts` + `e2e/friends.spec.ts`). `FriendsView.tsx` was wrapped in the existing `.library-view`/`.inline-form`/`.invite-code` layout so 32-char hex codes and inputs never overflow 390px in large-text mode.

#### Firestore rules & Spark quota audit (checked against `firestore.rules` & client hooks)

- **Rules audit (`firestore.rules` v4 + `tools/firestore-rules.test.mjs`):**
  - Default-deny verified across every collection. Only `users/{uid}` (and its 6 explicit subcollections) and `invites/{code}` have allow rules.
  - **Rule `get()`/`exists()` call budget:** Firestore allows 10 document access calls per single-document request and 20 per multi-doc batch. Our maximums are: `public/summary` friend `get` = **3** (`2 × exists` + `1 × get`, `list` denied); `public/summary` owner write = **1** (`get` profile); `friends` reciprocal 2-doc batch create = **4** (`2 × get(invite)` + `2 × getAfter(reciprocal)`); all other paths = **0**. Every path has wide margin below Firestore's ceiling.
  - **Expression & size caps:** progress writes allow **1 changed problem key per write** via short-circuiting ternaries (well under the 1,000-expression limit) and cap shard size to `topicProblems + 1`; notes cap at `5,000 + 8,000` chars; lists and plans cap at `200` ids and `12,000` joined chars; summaries validate exact sum across all 20 catalogue topics; invites require 32 lowercase hex chars with `list` and `update` denied.
  - **New emulator audit tests (`tools/firestore-rules.test.mjs`, now 12 tests):** explicitly prove `/users` and `/users/{uid}/public` directory listing is denied, non-`summary` public doc ids are denied even when `shareSummary == true`, invite updates and non-owner invite deletes fail, and a third party (`eve`) cannot delete `alice`↔`bob` friend documents.
- **Quota finding fixed (`src/friendsData.ts`):**
  - Audit of `src/friendsData.ts` found that `makeFriendSummary(...)` returned a fresh object on every `entries` snapshot (including initial load, `hasPendingWrites` server-ack echoes, and bookmark-only toggles), triggering redundant `setDoc(users/{uid}/public/summary)` writes when `shareSummary` was on. `friendsData.ts` now deduplicates summary publishes by canonical JSON within an active sharing session, cutting idle/bookmark summary writes to **0**.
- **Spark quota headroom (`DATA-MODEL.md` §4 re-verified):**
  - **Firestore:** 6 active users × 3 sessions/day ≈ **~600 reads/day (1.2% of 50,000)** and **~240 writes/day (1.2% of 20,000)** worst-case cache-miss; storage < 5 MB total (**<0.5% of 1 GiB**).
  - **Hosting:** full cold precached shell is **317.66 kB gzip**, allowing **~1,133 full cold uncached installs every single day** inside Spark Hosting's **360 MB/day** free transfer limit, while repeat opens serve from the Service Worker cache at **0 bytes** of Hosting transfer unless a new build was deployed.

#### Firebase App Check evaluation (6.2 — "adopt only if free-tier-safe")

- **Evaluated `@firebase/app-check` 0.13.1 (bundled in `firebase` 12.19.0, Apache-2.0) — Verdict: REJECT / do not enable in v1.**
  1. **Tracker & gate conflict (`rule.md` §§3, 5):** Web App Check requires Google **reCAPTCHA v3** or **reCAPTCHA Enterprise**. Both inject external Google scripts/telemetry (`google.com/recaptcha`, `gstatic.com`) on page load, which triggers the **"adding analytics/trackers" GATE** and breaks our zero-third-party-runtime-script posture. App Check is also outside the `rule.md` §5 v1 Firebase whitelist (`Auth · Firestore · Hosting · Emulator Suite`).
  2. **Free-tier & billing risk:** reCAPTCHA Enterprise assessments above its monthly free tier require a Google Cloud billing account (violating our Spark-only / no-payment-method guardrail); standard reCAPTCHA v3 is capped at 10,000 assessments/month.
  3. **Offline PWA conflict:** App Check tokens have a maximum TTL of 1 hour (minimum 30 minutes) and cannot refresh in Airplane Mode; enforcing App Check on Firestore would reject queued syncs or reads if a session resumes before reCAPTCHA finishes loading on flaky mobile networks.
  4. **Threat-model fit:** for ≤6 Google-authenticated friends with zero unauthenticated Cloud Functions/AI endpoints, `firestore.rules` v4 (requiring `request.auth != null`, owner/reciprocal-friend path checks, 1-entry progress writes, and strict byte/count caps) already bounds what any authenticated browser can read or write. Revisit via an explicit owner GATE only if DSA Archive ever opens to a public audience.

### 6.3 — Release checklist, truthful docs/credits, `copy-web/` disposition & deploy runbook

- **`firebase.json`:** added the `hosting` configuration pointing `public` at `dist`, explicitly ignoring `copy-web/**`, setting `immutable` 1-year caching on hashed `/assets/**` and `no-cache` on `index.html`, `offline.html`, `404.html`, `sw.js`, and `manifest.webmanifest`, plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Frame-Options: SAMEORIGIN` (`SAMEORIGIN` rather than `DENY` so Firebase Hosting's same-origin `/__/auth/iframe` Google sign-in helper works when deployed). No `.firebaserc` or live project ID was added.
- **`docs/RELEASE-RUNBOOK.md`:** written with the pre-deploy checklist, Spark-only console setup, `.env.local` setup, local verification commands, rules-first then Hosting deploy commands, post-deploy phone+laptop+airplane-mode checklist, and rollback/lock-down procedures.
- **`README.md` & `src/App.tsx` footer:** updated from stale Phase 3/4 wording to truthful v1 state, MIT licence scope, open-source credits, clean-room attribution, and re-confirmed `copy-web/` disposition.

## Reuse scan (checked 2026-11-02)

- **STUDY:** our own repo docs, rules, and existing phases (`rule.md`, `docs/*.md`, `src/*`, `tools/*`). `copy-web/` was not opened or shipped.
- **BUILD:** `tools/generate-pwa-icons.mjs` (Node `zlib` PNG encoder), `tools/build-sw.mjs` (deterministic SHA-256 precache Service Worker generator), `tools/check-budgets.mjs` (CI perf/PWA/Spark-transfer budget gate), `src/pwa.ts` + `src/pwa.test.ts`, `public/manifest.webmanifest`, `public/offline.html`, `public/404.html`, `e2e/pwa.spec.ts`, and `docs/RELEASE-RUNBOOK.md`.
- **DEPEND:** **none added.** All `package.json` pins from Phases 0 and 2 are unchanged; no `vite-plugin-pwa`/`workbox` or App Check runtime script was added, so zero new licences are owed.
- **ADAPT:** scoped Tailwind v4 `@source` to `src/` + `index.html` and removed unused `@plugin "daisyui"` emission; configured Rolldown `codeSplitting.groups`; added offline `getDocFromCache` fallback in `src/accountData.ts` and summary deduplication in `src/friendsData.ts`.
- **REJECT:** Firebase App Check / reCAPTCHA v3 & Enterprise (tracker + offline + whitelist gates; see §6.2 above); `vite-plugin-pwa` / Workbox (~50 transitive packages unnecessary for a 19-file static shell); any live Firebase project creation, rules deploy, or Hosting deploy without an explicit owner command.

## Verification

- Local:
  - `npm run test:data` — **PASS** (495 rows · 20 topics).
  - `npm run check:rules` — **PASS** (`firestore.rules` current, 20 topics).
  - `npm test` — **PASS — 126 tests / 11 files** (`app` 27, `sheet` 22, `planner` 20, `library` 10, `progress` 10, `backup` 9, `cloudProgress` 9, `markdown` 8, `friends` 5, `pwa` 4, `catalogue` 2).
  - `npm run build:emulator` — **PASS** (`tsc -b` + `vite build`, zero warnings, 19 files emitted including `sw.js`, `manifest.webmanifest`, `offline.html`, `404.html`, and 5 clean-room icons).
  - `npm run check:dist` — **PASS** (19 files; zero copied-site paths/assets).
  - `npm run check:links` — **PASS** (15 HTML & manifest asset references resolved).
  - `npm run check:budgets` — **PASS** (CSS 26.86 / 6.30 kB gzip; entry JS 103.25 / 28.39 kB gzip; largest JS 486.05 / 139.89 kB gzip; full shell 317.66 kB gzip · ~1,133 cold installs/day on Spark).
  - `npx playwright test --list` — discovers **10 specs in 6 files**.
- **CI (Emulator Suite + real Chromium):** recorded immediately below once pushed and verified on `arena/991952b2-dsa-archive`.

## What the preview shows

`site-preview.zip` is the complete 19-file production PWA build (`dist/`). Served over HTTP(S) or `npx vite preview`, it registers `/sw.js`, exposes installable PWA metadata + clean-room `"DA"` monogram icons, renders all 7 views (`Sheet · Today · Revision · Notes · Lists · Stats · Friends`), opens cold in **Airplane Mode** with both signed-out guest progress and signed-in cached Firestore progress/notes intact, shows a friendly **Page not found (`404`)** screen on unknown paths with a working `Back to the sheet` button, and provides `/offline.html` as a self-contained fallback.

## Comparison duty (approved 0-D mock vs shipped Phase 6)

Reviewed the `Offline / 404`, `Friends`, `Settings & account`, and dark/light + phone/desktop + large-text variants against `docs/UI-REFERENCE.md`:
- Frozen tokens (`#101313` / `#f3f5f2` canvas, `#171b1b` / `#ffffff` surface, `#343a38` / `#d9dfda` line, `#c4d0ca` / `#33483d` accent, system sans/mono stacks, radii, touch targets) are byte-for-byte unchanged.
- `Offline / 404` uses the approved `.empty-state` card anatomy inside the sticky topbar + footer layout, plus matching standalone `offline.html` / `404.html` pages.
- Deliberate adaptations recorded in `docs/UI-REFERENCE.md` remain honest (scrollable 7-tab view bar instead of a 5-item bottom nav; account/backup context card; inline `Install` button shown only when `beforeinstallprompt` fires; owner visual review of CI phone captures recommended before live deploy).

## Gate / next

- **STOP at the merge gate AND the deploy gate (`rule.md` §§2–3).** No PR, merge, tag, release, Firebase project creation, live Firestore rules deploy, or Firebase Hosting deploy (including preview channels) was performed.
- All roadmap phases (`0`, `0-D`, `1`–`6`) are now implemented. Next actions require explicit owner commands: review `site-preview`, optionally command opening/merging the Phase 6 PR to `main`, complete the owner items in `docs/RELEASE-RUNBOOK.md` §1, and follow `docs/RELEASE-RUNBOOK.md` §§2–5 when ready to go live.
