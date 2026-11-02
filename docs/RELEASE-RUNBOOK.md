# Release checklist & gated Firebase deploy runbook

> **Live deploy is owner-executed (`rule.md` §§2, 3, 5).**
> The public Spark web identifiers for **`dsa-archive`** are linked in
> `.env.production` and `.firebaserc` (owner-approved 2026-11-02; Analytics /
> `measurementId` intentionally omitted). Because credentials and tokens are
> never shared in git or chat (`rule.md` §5), run the final `firebase deploy`
> step yourself from your **laptop terminal** or from your **phone browser via
> free Google Cloud Shell** (`https://shell.cloud.google.com`).

---

## 1. Pre-deploy checklist (verify before first live deploy)

- [x] **Catalogue & clean-room:** `npm run test:data` passes (495 rows · 20 topics); `npm run check:dist` confirms zero `copy-web/` files or third-party assets enter `dist/`.
- [x] **Repository visibility (`copy-web/` disposition):** keep `pabi277/DSA-archive` **Private** on GitHub while `copy-web/` remains in the repo/history (unless you explicitly delete `copy-web/` and scrub history before making the repo public).
- [x] **Security rules parity & Emulator proof:** `npm run check:rules` passes and all **12** Firestore Emulator security-rules tests (`tools/firestore-rules.test.mjs`) pass in CI.
- [x] **Offline PWA + variant a11y + budgets:** **126** unit tests, **10** real-Chromium Playwright specs (including signed-out + signed-in Airplane-Mode cold opens and 0 axe / 0 overflow across dark/light × phone/desktop × large-text), `npm run check:links`, and `npm run check:budgets` (`~317.8 kB` gzip full shell) are green in CI.
- [x] **Zero trackers / Spark-only:** `firebase/analytics` and `measurementId` are omitted from `.env.production` and `dist/`; only Google Auth, Cloud Firestore (Standard), and Hosting are used.

---

## 2. One-time Firebase Console verification for `dsa-archive` (Spark only)

Open <https://console.firebase.google.com/project/dsa-archive> and confirm:

1. **Plan badge (bottom-left):** **Spark (no-cost)** — **do not** add a billing account or upgrade to Blaze.
2. **Authentication → Sign-in method:**
   - Enable **Google** provider and choose your support email → **Save**.
   - Under **Authentication → Settings → Authorized domains**, confirm `dsa-archive.firebaseapp.com` and `dsa-archive.web.app` are listed.
3. **Firestore Database:**
   - If not created yet, click **Create database** → **Standard edition** → pick the closest region (e.g. `asia-south1` Mumbai for India — permanent once chosen) → **Start in production mode** → **Create**.

---

## 3. Deploy Firestore rules FIRST, then Hosting (`dsa-archive`)

> **Order matters (`rule.md` §5):** always deploy `firestore:rules` **before**
> `hosting` so the database is protected by our Emulator-tested v4 rules before
> any browser visits `https://dsa-archive.web.app`.

### Option A — From a phone browser (Google Cloud Shell, 0 setup, 0 tokens in chat)

1. Open **<https://shell.cloud.google.com>** signed into the Google account that owns `dsa-archive` (and has access to `pabi277/DSA-archive`).
2. Run:

```bash
gh auth login   # only if your repo is Private and not cloned yet
git clone https://github.com/pabi277/DSA-archive.git
cd DSA-archive
npm ci
npm run test:data && npm run check:rules && npm test
npm run build
npm run check:dist && npm run check:links && npm run check:budgets

# 1) Deploy security rules FIRST
npx firebase deploy --only firestore:rules --project dsa-archive

# 2) Deploy the PWA static bundle to Firebase Hosting (hosting.predeploy runs `npm run build` automatically)
npx firebase deploy --only hosting --project dsa-archive
```

*(If `npx firebase` prompts for auth inside Cloud Shell, run `npx firebase login --no-localhost` or rely on Cloud Shell's built-in Google account credentials via `GOOGLE_CLOUD_PROJECT=dsa-archive`.)*

### Option B — From your laptop / desktop terminal

```bash
git clone https://github.com/pabi277/DSA-archive.git
cd DSA-archive
npm ci
npm run test:data && npm run check:rules && npm test
npm run build
npm run check:dist && npm run check:links && npm run check:budgets

npx firebase login
npx firebase deploy --only firestore:rules --project dsa-archive
npx firebase deploy --only hosting --project dsa-archive
```

Your live URLs after step 2:
- **`https://dsa-archive.web.app`**
- **`https://dsa-archive.firebaseapp.com`**

---

## 4. Post-deploy verification (phone + laptop, ~3 minutes)

1. **Signed-out browse:** open `https://dsa-archive.web.app` in an incognito tab — confirm all 20 topics and 495 problems search/filter cleanly.
2. **404 route:** visit `https://dsa-archive.web.app/not-a-page` — confirm the friendly **Page not found** screen and **Back to the sheet** button work.
3. **Google sign-in & sync:** sign in with Google on your phone, mark one problem done, write a short note, and verify both appear on your laptop.
4. **Install PWA & Airplane-Mode check:** tap **Install** / *Add to Home Screen* on your phone, open the installed app once, switch **Airplane Mode ON**, force-close the app, and reopen it — confirm the full 495-problem sheet, solved rows, and notes load intact (`Offline — changes will sync`), and sync automatically when Airplane Mode turns back off.
5. **Export first backup:** in `Account & backup`, tap **Export backup JSON** and keep a local copy.

---

## 5. Rollback & emergency lock-down

- **Roll back Hosting:** Firebase Console → **Hosting → Releases** → `⋮` on the previous release → **Rollback** (takes effect in seconds).
- **Emergency Firestore lock-down** (locks out all client reads/writes while preserving stored data if you ever suspect rule misuse):
  1. Temporarily set `allow read, write: if false;` inside `match /{document=**}` in `firestore.rules`.
  2. Run `npx firebase deploy --only firestore:rules --project dsa-archive`.
  3. Restore from git (`git checkout -- firestore.rules`) after investigating.
