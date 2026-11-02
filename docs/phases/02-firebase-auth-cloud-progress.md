# Phase 2 — Firebase Auth + cloud progress

- Date: 2026-11-02
- Status: 🚧 **implementation complete on the session branch; CI verification pending first run. Stopped at the merge gate.**
- Scope: roadmap Phase 2 only — 2.1 Google sign-in + profile · 2.2 topic-sharded progress sync + offline cache + explicit guest merge · 2.3 Firestore rules v1 + Emulator Suite tests in CI · 2.4 JSON export/import. **Not** in this phase: notes, snippets, custom lists, planner, revision, friends, PWA, Hosting, or any live Firebase change.
- Prerequisites: phase 0-D design approved and tokens frozen; phase 1 merged to `main` at `dab3207c83953667d7af66b2cc127938d63862f3` through PR #3. Repo-local Git identity was reset from the fresh clone's `noreply` address to `pabi277 <chakraborttypabi2772006@gmail.com>` before the phase commit.

## Owner pre-step checklist — **owner only, never the agent**

Phase 2 can be built and accepted entirely against the local Emulator Suite. The agent has **not** created, linked, upgraded, or deployed a Firebase project. Before the owner's own live check, the owner personally:

1. Creates a Firebase project in the Firebase console on the **Spark (no-cost)** plan. Do not add a payment method or upgrade to Blaze.
2. Enables **Authentication → Sign-in method → Google**. Adds only the owner's intended domain(s) to Authorized domains when a gated deploy is eventually commanded.
3. Creates a **Cloud Firestore Standard** database in the chosen region. Enables no other Firebase product; Cloud Functions/Storage/Analytics/FCM/AI remain out of v1.
4. Registers a **Web app** and copies its public web-config identifiers into a local, gitignored `.env.local` using the keys shown in `.env.example`: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` (optional `messagingSenderId`/`storageBucket`). These are public identifiers, **not secrets**; Firestore rules are the protection.
5. **Never** pastes a service-account JSON, private key, OAuth client secret, password, or token into chat or git. The app uses the client SDK and rules only; no Admin SDK exists.
6. Runs the emulator suite locally/CI first: `npm run build:emulator && npm run test:emulator` (Java required for the Firestore emulator). Only after that, and only after a separate explicit owner command, may live rules/Hosting be deployed by the owner's chosen gated process.
7. Performs the phone ↔ laptop live check: sign in on both, solve a row offline on one, reconnect, and confirm the other sees it. This live check is **not** a substitute for the emulator CI acceptance and remains pending.

## Delivered

### 2.1 — Google sign-in + profile

- `src/firebase.ts` initializes **Auth + Firestore only**. `VITE_FIREBASE_USE_EMULATOR=true` uses the `demo-dsa-archive` project and connects to `127.0.0.1:9099/8080`; otherwise a live build requires the owner's public web config. With neither, the app remains in a truthful unconfigured guest mode instead of contacting an invented project.
- `src/account.ts` uses `signInWithPopup(GoogleAuthProvider)` in live builds, rejects non-Google providers, exposes sign-out/error states, and creates an `AccountUser` shape (`uid`, display name, email, photo). The phase-1 static banner is now a real sign-in banner with the approved "Sign in to save progress" copy and a why-login explainer. An **emulator-only** "Use CI Google account" button supplies a deterministic fake `google.com` ID token to the Auth Emulator; it never appears in a live/unconfigured build.
- The header's **avatar menu returns**: initials avatar, account identity, an anchor to Account & backup, and sign out. A text-labelled sync pill shows `Local only`, `Connecting…`, `Changes pending`, `Offline — changes will sync`, `Synced`, or `Sync error`; state is never colour-only.
- On first sign-in the app creates `users/{uid}` with `displayName`, `photoURL`, `createdAt`, `updatedAt`, `dailyGoal: 5`, `theme`, `hideDone`, and `shareSummary: false`. `theme`/`hideDone` sync both ways with `dsa-archive.settings.v1`; `largeText` remains local-only. Cloud→local changes are tagged so they do not echo writes.

### 2.2 — Progress sync, offline cache and visible guest merge

- Firestore uses exactly `DATA-MODEL.md` §3's `users/{uid}/progressByTopic/{topicId}` topic shards. Each row has `s` (`todo|done|revision`), `b`, `a` (attempts), `fd` (first done), and `lr` (last status change for phase 4 to refine); each doc has `updatedAt: serverTimestamp()`. The UI consumes `{s,b}` via `src/cloudProgress.ts`.
- `persistentLocalCache()` gives an IndexedDB-backed offline cache, with an in-memory fallback if a browser blocks persistence. `onSnapshot(..., { includeMetadataChanges: true })` over the ≤20 shards drives the sync pill and pending-write state.
- Phase-1 guest rows stay byte-for-byte compatible in `dsa-archive.progress.v1`; `dsa-archive.progress.updatedAt.v1` adds per-topic guest timestamps and backfills older installs once. `planGuestMerge()` applies **newest `updatedAt` wins per topic**, preserves cloud metadata, and plans deletion of cloud-only rows when the guest shard wins.
- The merge is **shown, never silent**: a neutral notice reports guest/cloud row counts and topic winners and writes nothing until the user chooses **Merge guest rows** or **Keep cloud only**. Guest mode was kept, not cut.
- Because Firestore Rules has no loops, every progress write changes one problem key plus `updatedAt`. Merge/import replay sequences of these one-key writes. `e2e/sync.spec.ts` proves solve → merge → relogin in a fresh browser profile → offline mark → reconnect → second fresh profile, all at 390×844 against Auth + Firestore emulators.

### 2.3 — Firestore rules v1 and Emulator Suite proof

- `firestore.rules` is generated by `tools/generate-firestore-rules.mjs` from the one validated `data/problems.json`: 20 topic whitelists and 495 unique problem ids; `npm run check:rules` fails CI if the rules drift from the catalogue.
- Rules are default-deny, owner-only, and validate exact profile fields/types/sizes, progress entry fields/types/sizes, `updatedAt == request.time`, known topic/problem ids, one changed problem key per write, and shard size. Stranger and signed-out reads/writes, unknown collections, oversized fields, and bulk writes are denied. No rule was weakened to make a test pass.
- `tools/firestore-rules.test.mjs` uses `@firebase/rules-unit-testing` against the **local Emulator Suite**, with no Admin SDK or service key: owner create/read/update/delete succeeds; user B cannot read user A's profile, shard, or collection; unauthenticated access fails; invalid profile/progress fields fail; an 83-entry bulk write and a 41+ character timestamp fail; explicit one-key deletion succeeds.
- `firebase.json` points Firestore at the versioned rules and starts only Auth + Firestore emulators. CI installs Java and runs `npm run test:emulator` (rules tests + all Playwright specs) under `firebase-tools emulators:exec --project demo-dsa-archive`.

### 2.4 — Export/import backup

- `src/backup.ts` defines `schemaVersion: 1`: `generatedBy`, `exportedAt`, profile settings, all `progressByTopic` rows with `a/fd/lr`, empty `notes`/`lists`/`plans` arrays for phases 3–4, and an `excluded` list for friends/summary. `createBackup()` downloads a dated JSON file.
- `parseBackup()` rejects invalid JSON, wrong schema, non-DSA files, oversized files (>1 MB), unknown topic/problem ids, invalid profile fields, and invalid progress entries. The account card shows the **invalid-file error**, a **preview** with row/topic/note/list/plan counts, and a **success** notice. Replacement happens only after "Replace my progress": existing shards are deleted, then one-key writes replay the backup and profile settings are restored.
- Backup covers the same anti-lock-in path as `DATA-MODEL.md` §6. Friends and public summaries are deliberately excluded.

### Design and a11y

- Frozen 0-D tokens are unchanged. New components reuse existing `.app-banner`, `.sync-pill`, `.notice`, `.card`, `.profile-row`, `.action-grid`, and `.button` styles; no new colour, type, spacing, radius, or icon tokens were added.
- Inline notices (not a modal/toast library) carry sign-in, sync, merge, backup success, and invalid-file error states. A quiet "topic complete" notice appears when every row in one or more topics is done.
- The account panel stays in the existing context column, reachable from the avatar menu; bottom nav and desktop rail remain deferred because their destinations still do not exist. The phone sync pill is text-truncated with CSS but keeps its full accessible text; no horizontal overflow at 390px is asserted in CI.

## Reuse scan (checked 2026-11-02)

- **STUDY:** only our own approved artefacts — `rule.md`, `docs/DATA-MODEL.md`, `docs/UI-REFERENCE.md`, the phase-1 record/source, and `data/problems.json`. The copied `copy-web/` tree was not opened or shipped.
- **BUILD:** original Auth/Firestore wiring, account/profile hook, cloud-progress planner, backup schema/parser, generated rules, UI notices, and all tests. All wording is ours.
- **DEPEND:** Firebase JS SDK **12.19.0** (Apache-2.0) for Auth + Firestore; dev-only `@firebase/rules-unit-testing` **5.0.2** (Apache-2.0) and `firebase-tools` **15.34.2** (MIT) for the Emulator Suite. `@firebase/app` 0.16.2 / `@firebase/app-compat` 0.5.18 and `@grpc/grpc-js` 1.14.7 overrides keep Node 22 support and a clean production audit. Licences/engines checked from npm metadata 2026-11-02. All are within the Firebase whitelist; no icon/UI/state library was added.
- **ADAPT:** phase-1 guest storage extended with per-topic timestamps; approved 0-D mock styles folded into real sign-in, avatar, sync and account/backup components; DATA-MODEL §3 sketch frozen with exact validation caps.
- **REJECT:** copied HTML/CSS/JS/fonts/images/articles/solutions; Cloud Functions, Storage, Analytics, FCM, AI products; Admin SDK/service-account keys; live project creation/link, rules deploy, Hosting/preview-channel deploy, repo visibility change; a live public URL; friend-readable summaries before phase 5; any password or token in git/chat.

## Verification

- Local: `npm run test:data` PASS; `npm test` **PASS — 60 tests / 6 files** (catalogue 2, sheet 21, progress 10, app 19, cloudProgress 5, backup 3); `npm run check:rules` PASS; `VITE_FIREBASE_USE_EMULATOR=true … npm run build` PASS (`tsc -b` clean; CSS 199.99 kB / JS 1,026.71 kB — Firebase SDK weight is a **phase 6 perf-budget** item); `npm run check:dist` PASS (3 files, no copied-site paths); `npm run check:links` PASS; `npx playwright test --list` discovers 4 specs; `git diff --check` PASS.
- `npm run test:rules` / `npm run test:e2e` are **not locally runnable in this sandbox**: Java is absent and Playwright's Chromium download host is outside the network allowlist. CI is the authority; `npm run test:emulator` starts the Emulator Suite and runs both.
- **CI:** pending first run on this branch. This section will be updated with the successful run id, tip SHA, `site-preview` artifact size, and any diagnostics before the phase is marked ✅.
- **Owner live check:** pending and gated; no Spark project exists yet.

## What the preview shows

The downloadable `site-preview.zip` is the emulator-configured production `dist/`. Opened on a phone it shows the dark-first sheet, the real **Sign in with Google** banner, the `Local only` sync pill, theme/large-text controls, all 495 rows and search/filters. In CI that same `dist/` is served with the Auth + Firestore emulators: the signed-in screen shows `CI Owner` in the banner and avatar menu, a `Synced` pill, the merge notice with guest counts, the Account & backup card, and the offline/success/error notices. `test-results/sync-phone.png` captures the signed-in phone state; the existing desktop/phone-light screenshots still cover the signed-out sheet. The static ZIP alone cannot perform cloud writes — it needs the emulator-backed CI server, which is exactly what the acceptance spec uses.

## Comparison duty (approved 0-D mock vs shipped Phase 2)

Reviewed the signed-out desktop/phone screenshots and `test-results/sync-phone.png` against `Sheet — signed out`, `Sheet — signed in`, `Sheet — syncing / offline`, `Sign-in`, `Settings & account`, and `Topic complete`. Tokens, chrome, row anatomy, neutral badges, and text-labelled state all match. Differences are recorded as **deliberate adaptations** in `docs/UI-REFERENCE.md` (nav still deferred, account card instead of a route, inline notices instead of dialogs, emulator test button, retained guest mode, text sync pill). None changes a frozen token; the design gate stays closed.

## Gate / next

- **Stop at the merge gate.** No PR, merge, `main` push, tag, release, deploy, Hosting channel, Firebase project, live rules deploy, or visibility change was made or is authorized by this phase.
- Phase 3 is **not** started. Next chat must use its own Arena-assigned branch, verify branch/status/PRs/CI/Git identity first, and execute only **Notes, snippets & custom lists** from the roadmap after the owner commands the next phase.
- Owner items still open: make the repo private while `copy-web/` holds the third-party snapshot; complete the 10-row live-sheet content spot-check; create the Spark project personally and perform the gated live check.
