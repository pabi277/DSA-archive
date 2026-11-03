<!-- Adapted for a WEBSITE from AppFlow templates/docs-system/RESEARCH.md (MIT template). -->

# Research — DSA Archive website

> Evidence-backed. Every claim cites its source + check date (all
> checks: **2026-11-02**). Rejected options stay listed so nobody
> re-litigates them. Rules: `../rule.md`.

## Verdict line (owner-chosen 2026-11-02)

A **powerful, Firebase-backed DSA web app** for the owner + a few
invited friends: clean-room rebuilt from the *structure* of the A2Z
sheet (20 topics, 495 problems), Google login + Firestore sync
(offine-first, Spark free plan, no server code), sheet + progress +
my notes + spaced revision planner, opt-in friends comparison.

## 1. Audit: what the copied page actually is (evidence)

Source: local inspection of this repo at `9de75e8` ("template push",
sole commit on `main`), 2026-11-02.

| Fact | Evidence |
|---|---|
| Source page | `index.html` `<title>` + canonical/OG URL: "Striver's A2Z DSA Sheet & Course \| takeUforward", `https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet` |
| Shape | Next.js (Turbopack) production output: ONE `index.html` (11,704,452 bytes, 1 line), 77 JS + 36 CSS hashed bundles, 42 `.woff2` fonts, 7 images — 163 files, ~20 MB |
| Sheet size | Header claims **495 problems**; 495 checkbox inputs found (exact match) |
| Structure | **20 top topics** (Beginner Problems 83 · Sorting 7 · Arrays 32 · Hashing 6 · Binary Search 32 · Strings (Basic and Medium) 7 · Recursion 22 · Linked-List 49 · Bit Manipulation 14 · Greedy 14 · Sliding Window/2-Pointer 13 · Stack/Queues 31 · Binary Trees 32 · BST 15 · Heaps 20 · Graphs 46 · Dynamic Programming 53 · Tries 7 · Strings (Advanced) 9 · Maths 3) → subtopics → rows. Sums to exactly 495 |
| Row content | Title, level badge, actions (per `aria-label`s): mark complete · open practice · read article · watch video · open on LeetCode · notes |
| Links (1,106 hrefs, 1,084 unique) | `/practice/dsa/*` 453 · `/blogs/*` 286 unique · `leetcode.com/problems/*` 273 unique · `youtu.be/*` 256 unique · login `/get-started` |
| Features visible | Overall progress 0/495 + per-level split; "Search sheet problems", "Filter syllabus", "Show difficulty", "Pick random"; per-topic contests; certificate at 80%; streak/coins; Daily Planner; sidebar (Dashboard, Practice, IDE, NoteSpace…); Plus upsell; Google Tag Manager |
| Levels | Header says Basic 84 · Core 287 · Pro 109 (=480). Phase-0 extraction re-counted badge labels directly in the row markup as **84/287/109**; 15 of 495 rows have no badge and are stored with `level: null`. The older planning tally 85/288/110 is not reproducible from the checked-in snapshot; see `docs/phases/00-bootstrap-data-extraction.md` for the reconciliation and validation command. |

### What is broken / can never work in this copy

- **One page only.** Local serve: `200` for `/`, `404` for
  `/practice/dsa/pattern-1` (verified 2026-11-02). 761 unique internal
  links are dead ends here.
- **All state needs their backend:** login, progress (stuck 0/495),
  notes, planner, contests, IDE. → Our rebuild supplies its *own*
  backend (Firebase, §4) instead of imitating theirs.
- **Unmaintainable:** minified hashed bundles; no source/data/tests/CI.
- **Not ours to publish:** their code, fonts, logos, page text. Repo is
  currently **public** (`isPrivate=false`, 2026-11-02) — owner item.

Reuse-first verdict for the page itself: **STUDY (clean-room)**.

## 2. How we work — AppFlow, translated app → website

Playbook `pabi277/AppFlow` @ `57597b3332ad578614a0d9d5609f9cf8a278ee8a`
(read 2026-11-02: README/PURPOSE/RULES/PLAN/START, templates
`rule-app`/`prompt-app`/`next-chat-prompt`/`docs-system/*`, knowledge
`reuse-first`/`ui-reference-site`/`web-ui-references`/
`fast-quality-no-device`).

Kept: plan-only first chat → gates → one phase per chat · ask less/gate
always, never re-ask · branch discipline + owner-only PR/merge/deploy ·
reuse-first DEPEND/ADAPT/STUDY/BUILD/REJECT · evidence first ·
self-contained repo · ≤4-week small v1 · owner's the content verifier.

Translated: APK artifact → **`site-preview`** artifact per phase ·
no-device gate → no-live-service CI gate (data/unit/build/link/a11y/
screenshot + **Firestore rules tests on the Emulator Suite**) ·
UI-reference-app → phase 0-D design approval for the site itself ·
name+package ID → site name + optional domain · Play/testers/ads →
hosting gate / invited-friends preview / **no ads, no Analytics**.
AppFlow's "no backend unless proven" default is **superseded by the
owner's explicit Firebase decision (2026-11-02)** — multi-device sync
+ a few friends *is* the recorded need; offline-first still holds
via Firestore cache. The Android `templates/`+`knowledge/` snapshot
is not copied in (agent decision, reversible).

## 3. Options compared → owner's pick

| Option | What | Verdict |
|---|---|---|
| A · Clean-room static site, local-only progress | Agent's first recommendation | **Superseded** by the owner's refinement below (kept: clean-room + own data file; changed: storage) |
| **A+ · Clean-room rebuild + Firebase backend** | Own web app + own data; Firebase Auth/Firestore/Hosting on Spark; no server code | ✅ **CHOSEN by owner 2026-11-02** ("powerful with firebase backed and other things added that will be helpful"; storage pick: login + cloud from day 1) |
| B · Patch the copied site | Keep their build, fix links | ❌ Rejected: still needs their backend; unmaintainable; IP risk |
| C · Full-stack clone (own server, judge/IDE, contest engine) | Months; breaks 4-week law | ❌ Rejected for v1. Firebase gives the *useful* part of C (accounts/sync) without operating a server; IDE/contests stay cut |
| D · Fork a community A2Z tracker | GitHub search 2026-11-02: top repos have **no licence file** (= unusable code) | ❌ Rejected as base; STUDY at most |

Audience (owner): **me + a few friends** · Scope (owner):
**sheet + progress + notes + revision planner** (phases 0–6).

## 4. Reuse map (checked 2026-11-02; re-check at moment of use)

Method: AppFlow reuse-first scorecard — licence → activity → health →
fit (stars last). Versions pinned at phase time from official artefacts.

| Capability | Candidate | Licence · activity (2026-11-02) | Verdict | Why |
|---|---|---|---|---|
| App framework (ONE) | **Vite + React + TypeScript** (`vitejs/vite`, `react/react`) | MIT · MIT · pushed 2026-11-02 / 2026-10-31 | DEPEND | With login/sync/friends this is a web *app* (routed, auth-guarded screens), not a content site; React has the deepest Firebase example ecosystem. *Stack changed from the pre-Firebase Astro pick for exactly this reason — reversible only at phase 0, before UI* |
| ↳ now-rejected | Astro (`withastro/astro`) | **MIT verified from LICENSE file** (API: NOASSERTION) · very active | REJECT for v1 | Best for content sites; our app would be React islands everywhere — two models for one app |
| ↳ rejected | Next.js · Preact · Eleventy | MIT · active | REJECT | Next: SSR/server weight, awkward on plain static/Firebase Hosting. Preact: smaller, but Firebase examples/hooks assume React (fallback via compat only if phase-0 bundle budget fails). Eleventy: app interactivity becomes glue code |
| Styling (ONE) | Tailwind CSS + daisyUI | MIT · MIT · pushed 2026-11-02 / 2026-10-31 | DEPEND | AppFlow web Option B (fastest); dark/light themes cheap; phone-first building |
| Icons (ONE) | Lucide | ISC, confirmed from `lucide-react` package metadata on 2026-11-02 | REJECT for Phase 0 | No icons are needed for the count-and-topic hello sheet; avoid unused code. Re-evaluate once Phase 1 builds row actions. |
| **Backend** | **Firebase** — Auth, Cloud Firestore (Standard), Hosting; Emulator Suite for dev/CI (`firebase/firebase-js-sdk`, `firebase/firebase-tools`) | **Apache-2.0/BSD-3 verified from LICENSE file** · MIT · both pushed 2026-11-02 | **DEPEND (owner-chosen)** | Accounts + sync + offline cache + hosting with zero servers to run. **Spark (no-cost) sizing, official pricing page fetched 2026-11-02:** Firestore Standard 1 GiB stored, 50K reads/day, 20K writes/day, 20K deletes/day, 10 GiB/mo egress · Hosting 10 GB stored, 360 MB/day transfer · Auth (non-phone) included; Identity Platform 50K MAU no-cost · **Cloud Functions & Cloud Storage: "Not applicable" on Spark (Blaze only)** → v1 uses *no* server code and *no* uploads, so Spark suffices with huge headroom for a friend-sized group (budget math: `DATA-MODEL.md` §4). Blaze = money GATE, not planned |
| ↳ rejected backends | Supabase / custom Node server / Realtime Database | — | REJECT (not chosen) | Owner picked Firebase; do not relitigate without a gate-level reason. RTDB: Firestore's offline cache + queries fit better |
| Auth method (v1) | Google sign-in only | Firebase Auth | BUILD on SDK | One-tap for friends, no passwords to protect/store; email-link can be added later as its own small change if a friend lacks Google (reversible) |
| Sheet catalogue | Bundled `data/problems.json` in git (not Firestore) | ours | BUILD | Versioned diffs, offline by construction, zero reads billed; Firestore holds only per-user data |
| Search/filter, revision maths, weak-topic hints | In-memory over 495 rows + own progress | — | BUILD | Small data; a library/server removes nothing |
| The copied page | takeUforward A2Z page (repo snapshot) | proprietary | **STUDY** | Structure/links only; never code/assets/content |
| Community trackers | various A2Z repos | mostly no licence | REJECT | §3 row D |

## 5. "Powerful + helpful" — what Firebase adds (owner scope, priced in)

Inside the owner-approved scope (sheet+progress+notes+revision), the
agent proposes these Firebase-powered helpers — each mapped to a
roadmap phase so "powerful" doesn't become scope creep:

- ✅ Google login, profile, **sync on every device**, offline cache (P2)
- ✅ Notes + code snippets + **custom lists**, synced & searchable (P3)
- ✅ Daily planner + **spaced revision queue (3/7/21d)** + streak
  heatmap + weekly stats, synced; due/streak computed on-device —
  no Cloud Functions needed (P4)
- ✅ **Friends (opt-in):** invite code/link, summary-only sharing,
  topic-compare, friends-only mini-leaderboard, weekly group goal (P5)
- ✅ Smart-but-simple helpers computed locally: random pick,
  "weakest topic" suggestion, continue-where-I-left (P1–P4)
- ✅ Export/import backup even with cloud sync (anti-lock-in) (P2)
- 🅿️ Parked post-v1 (need the use test + possibly Blaze = GATE):
  push reminders (FCM), note attachments (Storage), shared lists
  editing, public profiles, AI features.
- ❌ Still cut: IDE/judge, contest engine, payments, ads, Analytics,
  copied articles/solutions, SQL/aptitude sections.

## 6. Use / kill test (pre-written — never rewrite after results)

After phase 4: use the site as the **only** DSA tracker for **14 days**.

- ✅ Continue (build P5 friends) if: opened ≥10/14 days, progress
  marked same-day, revision queue used ≥3 times, sync trusted
  (checked on 2nd device ≥2 times, zero lost updates).
- 🔧 One fix chat if used-but-frictional; retest 7 days.
- 🛑 Stop adding features if ignored for a week vs the original site/
  notebook — park, keep export; don't polish an unused tool.
Friends invited only after P5 passes the owner's own look; 2+ friends
actually returning in week 2 = friends features earn their keep.

## 7. Sources checked (2026-11-02)

- This repo: `index.html` audit, `git log` (`9de75e8`),
  `gh repo view` (`isPrivate=false`), local 200-vs-404 serve check.
- `pabi277/AppFlow` @ `57597b3332ad578614a0d9d5609f9cf8a278ee8a`
  (files in §2).
- GitHub API metadata + LICENSE files: `firebase/firebase-js-sdk`
  (Apache-2.0/BSD-3 from LICENSE), `firebase/firebase-tools` (MIT),
  `withastro/astro` (MIT from LICENSE), `react/react`, `preactjs/preact`,
  `vitejs/vite`, `tailwindlabs/tailwindcss`, `saadeghi/daisyui`,
  `vercel/next.js`, `11ty/buildawesome`; searches `dsa sheet tracker`,
  `striver a2z` (licence/activity only).
- Official Firebase pricing — https://firebase.google.com/pricing —
  fetched 2026-11-02 (Spark quotas + Functions/Storage
  "Not applicable" on Spark, quoted in §4). Secondary 2026 pricing
  summaries agreed on the same Spark numbers (50K reads / 20K writes
  per day, 1 GiB).

## 8. v2 research trail (2026-11-03)

Every v2 decision is evidence-backed; the source notes live next to the phase that uses
them.

| Topic | Finding that changed the plan | Doc |
|---|---|---|
| Why v1 reads as a template | One accent doing four roles, system fonts, zero routing, 7 equal tabs, 1 animation in 355 CSS lines — audited against `file:line` | [`FEEDBACK-v2-REPORT.md`](FEEDBACK-v2-REPORT.md) |
| 2026 UI consensus | Quiet chrome + density + colour-as-meaning + command palette (Linear/Vercel/Stripe patterns); dark-first | [`FEEDBACK-v2-REPORT.md`](FEEDBACK-v2-REPORT.md) §3, [`FEEDBACK-smart-layer.md`](FEEDBACK-smart-layer.md) §11 |
| Spaced repetition | FSRS beats SM-2 by ~20–30% fewer reviews (5.3% vs 16.2% RMSE) — **rejected anyway** as too expensive for this scope; the 3/7/21 ladder stays | [`FEEDBACK-v2-REPORT.md`](FEEDBACK-v2-REPORT.md) §4 (parked) |
| In-app video | Official IFrame Player API is the supported path; blocking/modifying it is ToS §4.13 and technically impossible from our origin; ads are the browser's business (owner uses Brave) | [`FEEDBACK-video-theatre.md`](FEEDBACK-video-theatre.md), [`FEEDBACK-ytpro-review.md`](FEEDBACK-ytpro-review.md) |
| Transcripts | Dead: `timedtext` is CORS-closed, needs a video-bound PoToken only a non-browser client can mint, ToS forbids non-player access. **Dropped by the owner** | [`FEEDBACK-ytpro-review.md`](FEEDBACK-ytpro-review.md) §2.2 |
| C++ in the browser | Clang/wasm in a Worker: ~14.2 MB cold, 0 bytes warm, ~1.2 s compile+run, no COOP/COEP, runaway loops stopped in ms. Piston's public API stopped being free (15 Feb 2026); Judge0 needs a VPS | [`PLAN-in-browser-code-runner.md`](PLAN-in-browser-code-runner.md) |
| Multi-source resources | v1 has 289/289 articles from one publisher and 453/453 practice links from one host; 206 rows have no LeetCode mapping | [`phases-v2/03-content-pipeline/RESOURCE-POLICY.md`](phases-v2/03-content-pipeline/RESOURCE-POLICY.md) |
| More practice | 273 unique LeetCode URLs today; drills add +120–140 by pattern without a schema change | [`phases-v2/03-content-pipeline/PRACTICE-SETS.md`](phases-v2/03-content-pipeline/PRACTICE-SETS.md) |
| Theory rows | 42 `kind:"theory"` rows had only a checkbox; they become MCQ cards with an always-available solution | [`phases-v2/05-quiz-engine/THEORY-MCQ.md`](phases-v2/05-quiz-engine/THEORY-MCQ.md) |

Audit of the copied snapshot (2026-11-03, read-only): the **369 stored video URLs are
verbatim from `copy-web/index.html`** — identical sequence, 0 ids added, 0 missing,
369/369 positional match (75 of them resolve only after JSON-unescaping the ampersand).
No link was rewritten.
Video links stay **single-source by owner decision**; multi-sourcing applies to
articles/resources only.
