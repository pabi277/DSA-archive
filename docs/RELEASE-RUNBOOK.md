# Release checklist & gated Firebase deploy runbook (v2)

> **Live deploy is owner-executed** (`rule.md` §§2, 3, 5). The public Spark web
> identifiers for **`dsa-archive`** live in `.env.production` and `.firebaserc`
> (owner-approved 2026-11-02; Analytics / `measurementId` intentionally omitted).
> Credentials and tokens are never shared in git or chat, so run the final
> `firebase deploy` yourself from your **laptop terminal** or from your **phone
> browser via free Google Cloud Shell** (<https://shell.cloud.google.com>).
>
> **What a v2 deploy contains:** the built `dist/` (app shell, content UI, the
> lazy runner/account add-ons), the **enforced CSP** header, the generated
> Firestore rules **v9**, and — if you fetched them — the toolchain packs under
> `/runtime/`. It contains **no** Cloud Functions, no Storage bucket, no
> Analytics, no third-party script and no copied third-party asset.
>
> Deploying is a GATE. Nothing here has been run: `git log` will show that no
> `main` push, PR merge or Hosting release was performed by the agent.

---

## 0. What is frozen at 2.0.0

| Thing | Value | Where it is enforced |
|---|---|---|
| Firestore rules | **v9** | `firestore.rules` (generated), `npm run check:rules` |
| Backup schema | backup **v8**, accepts schemas **1 → 8** | `src/backup.ts`, `src/backup.test.ts` |
| Catalogue | 495 rows · 20 topics · schemaVersion 2 | `npm run test:data` |
| Content | 1 primer, 6 statements, 6 hints/mistakes, 12 quiz items, 42 theory MCQs, 136 drills | `npm run check:content`, `docs/content/coverage.md` |
| Budgets | shell **393,000 B** gzip cap (measured 392,739 B) · CSS 61,000 B raw | `npm run check:budgets` |
| CSP | 19 directives, enforced; `frame-src` YouTube, `worker-src` blob | `tools/csp.mjs`, `npm run check:csp` |
| Versions in docs | one story across README/CHANGELOG/DATA-MODEL/ROADMAP | `npm run check:docs` |

`npm run check:docs` is the command that fails if a document starts claiming a
rules or backup version that no code implements.

---

## 1. Pre-deploy checklist (run on the exact commit you will deploy)

```bash
npm ci
npm run test:data          # 495 rows · 20 topics · links/levels/resources/drills
npm run check:content      # the coverage report still matches data/
npm run check:rules        # firestore.rules matches the catalogue (v9)
npm run check:docs         # README/CHANGELOG/DATA-MODEL/RUNBOOK/ROADMAP/prompt agree
npm test                   # Vitest unit + jsdom UI suite
npm run runtime:fetch      # optional: C/C++ (+ Python) toolchains, sha-512 verified
npm run build              # live public config; prebuild also bundles the runner worker
npm run check:dist         # copy-web/ and third-party assets absent from dist/
npm run check:links        # built HTML, manifest and resource references resolve
npm run check:budgets      # CSS, JS, shell 393 kB, fonts, add-ons, Spark transfer
npm run check:hardening    # CSP header, token contrast, dead-weight decisions
npm run check:screenshots  # docs/screenshots exists, is listed and is not stale
```

Emulator-backed suites (needs Java 21 + Chromium — CI does this for you):

```bash
npm run test:rules         # Firestore security-rules tests
npm run test:emulator      # rules + all Playwright specs (axe, offline, CSP, deletion)
```

- [ ] All of the above green on the commit you are deploying.
- [ ] `git status` clean; you know the tip sha (the phase record has it).
- [ ] **Repository visibility:** keep `pabi277/DSA-archive` **Private** while
      `copy-web/` remains in the history (`rule.md` §5, clean-room).
- [ ] Spark plan confirmed (step 2). No billing account. Do not upgrade to Blaze.
- [ ] You have a **backup export** of your own data (`Settings → Export backup
      JSON`) if you have been using a previous live deploy.

---

## 2. One-time Firebase Console verification for `dsa-archive` (Spark only)

Open <https://console.firebase.google.com/project/dsa-archive> and confirm:

1. **Plan badge (bottom-left): Spark (no-cost).** No billing account.
2. **Authentication → Sign-in method:** Google enabled with a support email.
   **Authentication → Settings → Authorized domains** lists
   `dsa-archive.firebaseapp.com` and `dsa-archive.web.app`.
3. **Firestore Database:** created (Standard edition, region permanent).
4. **Firestore → Indexes:** none required by v2 — every query is a single
   collection or a document read (see `docs/DATA-MODEL.md` §4).
5. **Usage and billing → usage:** confirm you are inside the Spark free tier
   (the quota math is in `docs/DATA-MODEL.md` §4; the shell allows ~900 cold
   installs/day of Hosting transfer).

---

## 3. Deploy — rules FIRST, then Hosting

> **Order matters.** Deploying the site before the rules means a browser can reach
> a database protected by the *old* rules for a moment. Always: **rules → hosting.**

### Option A — phone browser (Google Cloud Shell, no local setup)

1. Open <https://shell.cloud.google.com> signed into the account that owns
   `dsa-archive`.
2. Run:

```bash
git clone https://github.com/pabi277/DSA-archive.git
cd DSA-archive
git checkout <the reviewed tip sha>
npm ci
npm run test:data && npm run check:rules && npm run check:docs && npm test
npm run runtime:fetch          # optional; without it the runner ships honest "not deployed" states
npm run build
npm run check:dist && npm run check:links && npm run check:budgets

# 1) Security rules first
npx firebase deploy --only firestore:rules --project dsa-archive

# 2) Then the PWA bundle (hosting.predeploy runs `npm run build` again; that is expected)
npx firebase deploy --only hosting --project dsa-archive
```

If `npx firebase` asks you to log in inside Cloud Shell, use
`npx firebase login --no-localhost`.

### Option B — laptop terminal

```bash
git clone https://github.com/pabi277/DSA-archive.git
cd DSA-archive
git checkout <the reviewed tip sha>
npm ci
npm run test:data && npm run check:rules && npm run check:docs && npm test
npm run runtime:fetch
npm run build
npm run check:dist && npm run check:links && npm run check:budgets

npx firebase login
npx firebase deploy --only firestore:rules --project dsa-archive
npx firebase deploy --only hosting --project dsa-archive
```

### What must NOT appear in the deploy output

- a `functions` or `storage` deploy step — v2 has neither;
- a `Remote Config`/`Analytics` step;
- any uploaded file under `copy-web/` or a `*.md*` content file (the catalogue is
  bundled into JS at build time, so `dist/` holds no markdown).

Live URLs after step 2: **<https://dsa-archive.web.app>** and
**<https://dsa-archive.firebaseapp.com>**.

---

## 4. Post-deploy verification (~5 minutes, phone + laptop)

Open the site in a phone browser, then repeat the signed-out checks in an
incognito desktop tab.

| # | Check | Expected |
|---|---|---|
| 1 | `/` loads and redirects to `#/today` | Today with `Momentum` and the plan card |
| 2 | `#/topics` | All 20 topic tiles, each with a ring; nothing locked |
| 3 | `#/topic/arrays` | The authored primer; the Arrays quiz badge shows `10/12` once you pass it |
| 4 | `#/problem/linear-search` | Our statement, constraints, example, **hint opens**, `Open on YouTube` if the player is blocked |
| 5 | `#/quiz/arrays` | A 12-question run; `1`–`4`, `Enter`, `r`; pass ≥80%; per-option explanation after answering |
| 6 | `#/problem/two-sum?tab=code` → **Run** (JavaScript) | Instantly runs. Press **Run** for C++ → the download is announced with its real size before it starts |
| 7 | Google sign-in → mark one row done on the phone | The same row is done on the laptop, and the sync pill reads `Synced` |
| 8 | Install (Add to Home Screen) → open once → **Airplane Mode** → reopen | The app opens on all routes, with cached progress, code and the quiz; the runner says *cached/unavailable* if no pack was installed |
| 9 | `Settings → Account & backup` | `Export backup JSON` produces a backup v8 file; import preview names rows/topics before replacing anything |
| 10 | `Settings → Account & backup → Delete my data` (only on a test account) | Two-step confirmation, then the accounts path is empty; export first if the data matters |
| 11 | DevTools → Network (desktop, `#/topics`) | Every request is first-party. Only a problem page with a video talks to YouTube |
| 12 | DevTools → Console | No `securitypolicyviolation` (the enforced CSP header is live) |
| 13 | Lighthouse (optional, your own run) | Recorded for information only; CI enforces budgets, axe and CLS instead (phase-09 deviation) |

If any check fails: **roll back** (below) rather than patching in the console.

---

## 5. Rollback and emergency lock-down

- **Roll back Hosting:** Console → **Hosting → Releases** → `⋮` on the previous
  release → **Rollback** (seconds). The Service Worker on a device picks up the
  older shell on its next visit, and its "New version ready — Reload" toast makes
  that explicit instead of silent.
- **Roll back rules:** `git checkout <previous sha> -- firestore.rules`, then
  `npx firebase deploy --only firestore:rules --project dsa-archive`. Rules v9 only
  *widened* the profile document (two optional target fields); every earlier client
  keeps working under it, so a rules rollback is rarely needed.
- **Emergency lock-down** (if you ever suspect rule misuse): set
  `allow read, write: if false;` inside `match /{document=**}` in
  `firestore.rules`, deploy rules only, investigate, then restore from git. Data is
  preserved; the app goes read-only/offline until you restore.
- **Clear a stuck runner cache on one device:** Settings → *Runner storage* →
  **Clear** deletes `dsa-archive-runtime-v1` only. Saving code, progress and quiz
  results are untouched.

---

## 6. After a successful deploy (record it)

1. Paste the deploy date, the tip sha and the Hosting release id into
   [`docs/DECISIONS.md`](DECISIONS.md) as the owner's deploy decision, and update
   the status line in [`docs/phases-v2/10-release-v2/RECORD.md`](phases-v2/10-release-v2/RECORD.md).
2. If the deploy changed the CSP or the Service Worker behaviour, note it in the
   CHANGELOG under a `2.0.x` heading.
3. Keep `copy-web/` and the repository **Private** (`rule.md` §5).

Nothing in this runbook has been executed by the agent: no deploy, no preview
channel, no rules push, no `main` push, no tag or release.
