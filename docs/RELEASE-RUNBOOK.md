# Release Checklist & Gated Deploy Runbook — DSA Archive (v1)

> **STOP GATE (`rule.md` §§2–3):** Nothing in this file authorizes an agent to
> create a Firebase project, link a live project, deploy Firestore rules, deploy
> Firebase Hosting (including preview channels), change repository visibility,
> or merge/tag a release. **Every step below is performed personally by the
> owner (or only on a fresh, explicit owner command per gate).**

---

## 1. Pre-deploy release checklist (must all be green before live deploy)

- [x] **Clean-room & `copy-web/` exclusion verified:**
  - `copy-web/` remains isolated as non-shipped STUDY provenance (`rule.md` §5).
  - Excluded from `dist/` by Vite, excluded from CSS scanning via `@source "./"` / `@source "../index.html"` in `src/styles.css`, excluded from Hosting uploads via `hosting.ignore` in `firebase.json`, and enforced in CI by `npm run check:dist`.
- [x] **Licence & credits truthful:**
  - Root `LICENSE` is MIT (`Copyright (c) 2026 pabi277`) covering original code and `data/problems.json` only.
  - `README.md` and `docs/DECISIONS.md` document third-party open-source licences (React MIT, Tailwind CSS MIT, Firebase JS SDK Apache-2.0) and state clearly that linked third-party problems/articles/videos belong to their respective authors.
- [x] **Automated CI verification green (no live service required):**
  - `npm run test:data` — 495 rows across 20 topics, link & badge invariants.
  - `npm run check:rules` — `firestore.rules` matches `data/problems.json`.
  - `npm test` — unit & jsdom suite green.
  - `npm run check:dist` · `npm run check:links` · `npm run check:budgets` — bundle, PWA, and Spark transfer budgets green.
  - `npm run test:emulator` — Firestore Emulator rules suite (12 tests) + real-Chromium Playwright suite (10 specs across desktop/phone, dark/light, large-text, two-account friends privacy, and airplane-mode PWA cold open) green, with **0** axe violations.
- [ ] **Owner-only pre-release items (`docs/DECISIONS.md`):**
  - **Repository visibility:** set `pabi277/DSA-archive` to **Private** in GitHub (`Settings → Danger Zone → Change repository visibility`) while `copy-web/` remains in the working tree / git history, **or** explicitly command its removal before keeping the repository public.
  - **Content accuracy spot-check:** compare 10 random rows in `data/problems.json` against the live A2Z sheet (titles, difficulty badges, outbound links).
  - **14-day personal use test (`docs/RESEARCH.md` §6):** confirm the pre-written verdict criteria before inviting friends.

---

## 2. Step-by-step owner console setup (Firebase Spark — no-cost plan only)

1. Open <https://console.firebase.google.com/> signed into your Google account and click **Create a project**.
2. Choose a project ID (for example `dsa-archive-<your-handle>`), **disable Google Analytics** (`rule.md` §5: no trackers/Analytics in v1), and verify the project stays on the **Spark (no-cost)** plan. **Never attach a billing account or upgrade to Blaze.**
3. **Enable Google Authentication:**
   - Go to **Build → Authentication → Get started → Sign-in method**.
   - Enable **Google**, pick your support email, and click **Save**.
   - Under **Authentication → Settings → Authorized domains**, keep `localhost`, `<PROJECT_ID>.firebaseapp.com`, and `<PROJECT_ID>.web.app` (add a custom domain later only if you configure one).
4. **Create Cloud Firestore (Standard):**
   - Go to **Build → Firestore Database → Create database**.
   - Select **Standard edition**, pick the region closest to you and your friends (for example `asia-south1` Mumbai), and start in **production mode** (locked). Step 4 below replaces the placeholder rules with our generated `firestore.rules`.
   - Do **not** enable Cloud Functions, Cloud Storage, Realtime Database, FCM, or Vertex/Gemini AI.
5. **Register the Web App & create `.env.local`:**
   - Go to **Project Overview → Project settings (gear icon) → General → Your apps → Web (`</>`)**.
   - Register app nickname `DSA Archive` (you may leave Hosting unchecked here or link the default site `<PROJECT_ID>`).
   - Copy `.env.example` to `.env.local` (which is gitignored — verify with `git status --ignored`) and fill in the public web identifiers:

```bash
cp .env.example .env.local
```

Edit `.env.local` on your machine (**never commit `.env.local`, and never paste service-account JSON keys anywhere**):

```dotenv
VITE_FIREBASE_USE_EMULATOR=false
VITE_FIREBASE_PROJECT_ID=<YOUR_PROJECT_ID>
VITE_FIREBASE_API_KEY=<YOUR_WEB_API_KEY>
VITE_FIREBASE_AUTH_DOMAIN=<YOUR_PROJECT_ID>.firebaseapp.com
VITE_FIREBASE_APP_ID=<YOUR_WEB_APP_ID>
VITE_FIREBASE_MESSAGING_SENDER_ID=<YOUR_SENDER_ID>
VITE_FIREBASE_STORAGE_BUCKET=
```

---

## 3. Local production build & verification (before any live deploy)

Run these commands locally from a clean checkout of `main` (after merging Phase 6):

```bash
npm ci
npm run test:data
npm run check:rules
npm test
npm run build
npm run check:dist
npm run check:links
npm run check:budgets
```

Verify that `.env.local` does **not** appear in `git status` and that `dist/` contains 19 clean files (`index.html`, `offline.html`, `404.html`, `manifest.webmanifest`, `sw.js`, `icons/*`, `assets/*`) with `VITE_FIREBASE_USE_EMULATOR=false` baked in.

---

## 4. Gated live deploy — Rules FIRST, Hosting SECOND

> **Security order matters:** always deploy `firestore.rules` **before**
> publishing the web app so no live user or script ever touches Firestore under
> stale rules.

### 4.1 Authenticate Firebase CLI on your machine

```bash
npx firebase login
```

*(Note: we pass `--project <YOUR_PROJECT_ID>` explicitly on the CLI so no `.firebaserc` with a live project ID needs to be committed to git.)*

### 4.2 Deploy Firestore Security Rules (v4)

```bash
npm run check:rules
npx firebase deploy --only firestore:rules --project <YOUR_PROJECT_ID>
```

Confirm in **Firebase Console → Firestore Database → Rules** that the active ruleset header reads:
`Rules v4 (phase 5): reciprocal invitation-based friendships and opt-in summaries.`

### 4.3 Deploy Firebase Hosting (`dist/`)

> Warning: both `firebase deploy --only hosting` and `firebase hosting:channel:deploy` create **publicly reachable URLs** (`https://<YOUR_PROJECT_ID>.web.app`). Run only when you intend the app to be live.

```bash
npx firebase deploy --only hosting --project <YOUR_PROJECT_ID>
```

---

## 5. Post-deploy live acceptance check (phone + laptop)

1. **Signed-out sheet:** open `https://<YOUR_PROJECT_ID>.web.app` in a private tab — confirm all 20 topics / 495 problems browse, search, and filter without signing in.
2. **Google sign-in & sync:** sign in with Google on your phone, mark 1 problem done and save 1 short note, then sign in with the same Google account on your laptop — confirm both appear within seconds.
3. **Install PWA & Airplane-Mode open:** on your phone browser, choose **Add to Home screen / Install app**, open the installed app once while online, switch the phone to **Airplane Mode**, force-close and reopen `DSA Archive` — confirm the full sheet, your progress, and your note open offline, mark 1 row offline, disable Airplane Mode, and confirm `Synced`.
4. **Export backup:** click **Export backup JSON** in **Account & backup** and keep a dated local copy.
5. **Quota check:** open **Firebase Console → Usage and billing** after day 1 — confirm reads/writes are a tiny fraction (<1%) of Spark's 50K reads / 20K writes daily cap.

---

## 6. Rollback & emergency lock-down

- **Roll back Hosting to a previous release:** open **Firebase Console → Hosting → Release history**, click the three-dot menu on the prior good release, and choose **Rollback**.
- **Disable public Hosting access immediately (if ever needed):** deploy a minimal static maintenance `dist/` or delete the Hosting release from **Firebase Console → Hosting**.
- **Revoke a shared invite code or friend access:** open **Friends → Stop sharing** (revokes server reads immediately via `shareSummary == false` in rules), **Remove friend**, and **Rotate invite code** so the old bearer code is deleted from `invites/{code}`.
- **Emergency Firestore lock-down:** if you ever suspect compromise of a client session, sign out, revoke sessions in Google Account security, or deploy a temporary deny-all ruleset while your data remains safe in your exported JSON backup.
