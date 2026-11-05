<!-- Adapted for a WEBSITE from AppFlow templates/docs-system/DECISIONS.md (MIT template). -->

# Decisions — DSA Archive website

> The anti-re-ask register (`../rule.md` §3). Answered once, dated.
> Later chats read this before asking anything. Re-asking a recorded
> answer is a defect. Changing an owner answer is a GATE.

## Owner decisions — process (2026-11-02)

- 2026-11-02 — Stage? — **Planning only** in the plan chat; create the
  planning, build nothing yet.
- 2026-11-02 — Merge? — **No merge until the owner explicitly says so**
  (standing law, `rule.md` §2; PR/deploy likewise gated).
- 2026-11-02 — Product order? — **Fully working website first**; app
  later as a separate project.
- 2026-11-02 — Work rules? — Follow `pabi277/AppFlow`, adapted from
  apps to a website. Pinned commit read:
  `57597b3332ad578614a0d9d5609f9cf8a278ee8a`.
- 2026-11-02 — Starting point? — The copied one-page snapshot in this
  repo is STUDY material to rebuild "as I like, better for my use".

## Owner decisions — DECIDE-ONCE batch (answered 2026-11-02, never re-ask)

- 2026-11-02 — Build direction? — Owner's own words: **"I want it to
  be powerful with firebase backed and other things added that will
  be helpful."** Recorded as: clean-room rebuild (Option A base) **+
  Firebase backend** (Auth + Firestore + Hosting), agent to propose
  helpful Firebase-powered additions inside the approved scope
  (`RESEARCH.md` §5 prices them into phases). NOT option B (patch the
  copy) and NOT a full clone with IDE/contest engine.
- 2026-11-02 — Audience? — **Me + a few friends** (shared by invite;
  no public audience in v1).
- 2026-11-02 — Progress storage? — **Login + cloud sync from day 1**
  (implemented phase 2, emulator-first; offline cache still required
  so the app never becomes cloud-only in behaviour).
- 2026-11-02 — V1 scope? — **Sheet + progress + notes + revision
  planner** (roadmap phases 0–6; friends phase 5 is the agreed first
  cut if time slips — agent-proposed, reversible at phase 4 review).

## Owner decisions — exit gate (answered 2026-11-02, complete)

- 2026-11-02 — Plan? — **Approved.** This approves the revised
  Firebase-backed website plan in this file set; it does not by
  itself authorize a PR, merge, deployment, or live Firebase work.
- 2026-11-02 — Stage 2? — **Authorized:** verify the designated Git
  identity (below), commit the planning documents on the session
  branch, inspect that commit, then run **Phase 0 only** in a stage-2
  chat. (Timing/name superseded by the cleanup decision below.)
- 2026-11-02 — Git author identity for THIS repo? —
  **`pabi277 <chakraborttypabi2772006@gmail.com>`** (custom identity
  selected; email supplied by the owner 2026-11-02; display name
  confirmed by the owner 2026-11-02 as `pabi277` — the words
  "Author Name" in the owner's first reply were the format
  placeholder, not the name). The only identity designated for
  commits here; verify with `git var GIT_AUTHOR_IDENT` /
  `GIT_COMMITTER_IDENT` before every commit. Changing it is a GATE.
- 2026-11-02 — Working site name + licence? — **`DSA Archive` +
  MIT** for our original code and data. The MIT `LICENSE` file will
  be added in Phase 0.1. This licence does not cover the copied
  third-party website, its assets, linked third-party content, or
  third-party libraries.
- 2026-11-02 — Cleanup + merge (owner's explicit command, verbatim
  intent): **merge this session branch to `main`, and move all files
  and folders of the copied website into a new `copy-web/` folder so
  the repo root page stays clean.** Recorded as: explicit merge
  authorization for THIS branch/PR only (plan-docs commit + move);
  copied items are `index.html`, `css/`, `js/`, `fonts/`, `images/`
  → `copy-web/`, preserved intact as STUDY material. This supersedes
  the earlier `archive/` folder name and the move-after-extraction /
  next-chat timing for the commit+move. Phase 0 extraction will read
  `copy-web/index.html`. No deployment or live Firebase is authorized
  by this answer, and future merges remain gated.

## Owner decisions — phase 0-D prototype direction + approval (2026-11-02)

- 2026-11-02 — Prototype preference choices: **dark-first**; **neutral,
  text-labelled level badges**; responsive for **both phone and desktop**
  (comfortable phone touch spacing, wider desktop layout); **text-only
  “DSA Archive” wordmark**. At the time these guided the disposable
  prototype only; they are now part of the approved design.
- 2026-11-02 — **Phase 0-D prototype and design tokens: APPROVED.** The
  owner reviewed the prototype running live from the session branch
  (all 25 mocked screens via the picker, dark and light, phone and
  desktop) and then commanded phase 1 to start. Because `rule.md` §5
  gates all real UI on this approval, that command is the approval; no
  changes were requested. Recorded effects: the approval checkbox in
  `docs/UI-REFERENCE.md` is dated 2026-11-02, the candidate palette/type/
  spacing values are **frozen there unchanged**, phase 0-D is ✅, and
  phase 1 UI work is unblocked. This approval covers the **design**; it
  does not authorize a PR, merge, deploy, or any Firebase work — those
  remain separately gated.
- 2026-11-02 — **Phase 1 authorized** by the same command ("start phase
  1"): roadmap phase 1 only (1.1 accordions + all 495 rows, 1.2 search/
  filters/random/weakest-topic, 1.3 outbound row actions). Phase 2 was
  **not** authorized: no Firebase project, no Auth, no Firestore, no
  Hosting, no deploy.
- 2026-11-02 — **Merge to `main`: AUTHORIZED**, owner's explicit command
  in chat, verbatim: **"Merge it to main."** Recorded as explicit merge
  authorization for **PR #3** (`arena/df11f576-dsa-archive` → `main`),
  covering the phase 0-D approval/token-freeze commit and the phase 1
  sheet-core commits — i.e. phases 0-D and 1 land on `main` together.
  This is the second merge the owner has commanded (the first was the
  plan-docs + `copy-web/` move, above). It authorizes **the merge only**:
  no deploy, no Hosting channel, no Firebase project, no rules deploy, no
  repo-visibility change, and every future merge stays separately gated.
  Note on ordering: the commit recording this command rides inside PR #3
  itself, so the merge commit on `main` lands immediately after it; the
  merge-commit SHA is visible in `main`'s history and is confirmed by the
  next phase chat (this repo never pushes `main` directly).

## Owner decisions — phase 3 merge (2026-11-03)

- 2026-11-03 — **Phase 3 merge to `main`: AUTHORIZED** by the owner's
  explicit command in chat, verbatim: **"Merge it."** Recorded as
  authorization to open **PR #5** (`arena/0277d181-dsa-archive` → `main`) and
  merge it, covering the phase-3 commits (`4bd24cc` implementation through
  `0d02c72` docs) plus the commit that records this command. It authorizes
  **the merge only**: no deploy, no Hosting channel/preview URL, no Firebase
  project creation or link, no live rules deploy, no repo-visibility change,
  no tag/release, and no phase 4. The merge-commit SHA lands in `main`'s
  history and is confirmed by the next phase chat; this repo never pushes
  `main` directly and every future merge stays separately gated.

## Owner decisions — phase 4 merge (2026-11-03)

- 2026-11-03 — **Phase 4 merge to `main`: AUTHORIZED** by the owner's
  explicit command in chat, verbatim: **"Merge it to main"**. Recorded as
  authorization to open **PR #6** (`arena/08f229da-dsa-archive` → `main`) and
  merge it, covering the phase-4 commits (`4d7da26` implementation through
  `1190459` docs) plus the commit that records this command. It authorizes
  **the merge only**: no deploy, no Hosting channel/preview URL, no Firebase
  project creation or link, no live rules deploy, no repo-visibility change,
  no tag/release, and no phase 5. The merge-commit SHA lands in `main`'s
  history and is confirmed by the next phase chat; this repo never pushes
  `main` directly and every future merge stays separately gated.

## Owner decisions — phase 5 merge + phase 6 authorization (2026-11-02 UTC)

- 2026-11-02 — **Phase 5 merged to `main` via PR #7** (`arena/49d9fa08-dsa-archive`
  → `main`, merge commit `3303c8a8f965dbe50ef107de63e2fb81ab95c781`, verified in
  git history). Covers the Phase 5 opt-in friends implementation (`3218933`
  through `f342950`) only — no deploy, no Hosting channel, no Firebase project,
  no live rules deploy, and no repo-visibility change.
- 2026-11-02 — **Phase 6 authorized** by the owner's explicit command in chat:
  **"Read prompt.md and start phase 6"**. Authorizes roadmap Phase 6 only (6.1
  installable PWA + true offline open, 6.2 perf/a11y budgets in CI + rules/quota
  audit + App Check evaluation, 6.3 release checklist + truthful docs/credits +
  Hosting/rules deploy runbook) on `arena/991952b2-dsa-archive`.

## Owner decisions — live Spark project link, Analytics, PR/merge & deploy prep (2026-11-02 UTC)

- 2026-11-02 — **Link repository to live Spark project `dsa-archive` (`[GATE: Link repo to live Firebase project]`):**
  owner supplied the personally created Spark web config (`projectId: "dsa-archive"`,
  `authDomain: "dsa-archive.firebaseapp.com"`, `appId: "1:207824804845:web:cd4c13333793090b0425e4"`,
  public `apiKey`, `messagingSenderId`, `storageBucket`) and explicitly approved
  committing `.env.production` + `.firebaserc` (`"default": "dsa-archive"`) so
  `npm run build` and `firebase deploy` work out of the box while CI/dev
  emulator runs stay isolated on `demo-dsa-archive`.
- 2026-11-02 — **Keep Firebase Analytics OFF (`[GATE: Analytics / trackers & Firebase whitelist]`):**
  owner confirmed keeping `rule.md` §§3, 5 intact — `firebase/analytics` and
  `measurementId` (`G-WMM90G1QJC`) from the Console boilerplate snippet are
  intentionally omitted so zero trackers ship.
- 2026-11-02 — **Open Phase 6 PR and merge to `main` (`[GATE: PR & Merge]`):**
  owner explicitly authorized opening the pull request from
  `arena/991952b2-dsa-archive` and merging it into `main` once `Site CI` is green.
- 2026-11-02 — **Prepare live `dsa-archive` deploy commands (`[GATE: Live Firestore rules & Hosting deploy]`):**
  owner confirmed preparing exact copy-paste `firestore:rules`-first then
  `hosting` deploy steps for `dsa-archive` (laptop terminal + phone Google Cloud
  Shell) without pasting or handling credentials in chat.

## Agent decisions (reversible — object if wrong)

- 2026-11-02 — Stack after the Firebase pivot: **Vite + React +
  TypeScript + Tailwind/daisyUI** (was: Astro for a local-only content
  site; changed because login/sync/friends make this a routed web
  *app*). Reversible at phase 0 only. Versions pinned then.
- 2026-11-02 — Firebase = **Spark plan only**; whitelist Auth ·
  Firestore Standard · Hosting (gated) · Emulator Suite (dev/CI).
  No Functions/Storage/RTDB/SQL Connect/Analytics/FCM in v1
  (Functions+Storage require paid Blaze — official pricing checked
  2026-11-02). Blaze or any whitelist addition = GATE.
- 2026-11-02 — Auth v1 = **Google sign-in only** (no passwords held);
  sheet browsable signed-out, personal data login-gated. Reversible.
- 2026-11-02 — Sheet catalogue stays a **git-versioned JSON data
  file**; Firestore stores per-user data only (`DATA-MODEL.md`).
- 2026-11-02 — Friends sharing = **opt-in, summary-only** by default;
  notes/snippets/progress detail are never shared by default.
- 2026-11-02 — Agent never creates the Firebase project or handles
  credentials/service keys; owner does console steps from a checklist
  (phase 2). Web config values are identifiers; security = rules.
- 2026-11-02 — AppFlow's Android `templates/`+`knowledge/` snapshot is
  **not** copied into this repo; only this adapted docs set. Reversible.
- 2026-11-02 — Topic/problem **titles, order, levels, outbound links**
  = factual list data in our file; all prose/design/code clean-room;
  content linked out, never copied (`rule.md` §5).
- 2026-11-02 — Phase 0 implementation pins the versions in
  `package.json`/`package-lock.json`: Vite + React + TypeScript +
  Tailwind/daisyUI. TypeScript catalogue levels permit `null` when the
  source has no badge; do not guess a difficulty. The data is a factual
  extraction only; the owner's 10-row live-sheet spot-check remains
  pending. Reversible at Phase 0 / content remains owner-verified.
- 2026-11-02 — **Phase 1: the 0-D mock is discarded, not kept behind a
  flag.** `src/design-prototype.tsx` is deleted (readable at `1791693`)
  and its approved component styles stay in `src/styles.css`, renamed
  from `.prototype-*` to product names. Rationale: `UI-REFERENCE.md`
  says the mock is "folded into phase 1 or discarded"; keeping a second,
  fake-data screen tree would invite drift from the real sheet.
- 2026-11-02 — **Phase 1: guest progress lives in `localStorage` now**
  (`src/progress.ts`), sharded per topic as `{ problemId: { s, b } }` —
  byte-for-byte the `DATA-MODEL.md` §3 Firestore shape minus the
  timestamps phase 2 adds. Phase 1 needs truthful input for hide-done,
  the header count and the weakest-topic hint; phase 2 swaps the source
  for Firestore and merges these guest rows (merge design already
  sketched in `DATA-MODEL.md`). No Firebase SDK is imported anywhere.
- 2026-11-02 — **Phase 1: weakest-topic rule** = among topics the user
  has *touched* (≥1 row done or bookmarked), the lowest done ratio wins;
  ties break by most rows remaining, then sheet order. With nothing
  touched the hint says so instead of guessing. Attempts and revision
  dates (phase 2/4) can refine this without changing the call site.
- 2026-11-02 — **Phase 1: no new dependency, and no icon library.** Row
  actions, status and bookmark use text labels plus typographic glyphs;
  Lucide stays deferred. Adding a package would need a licence check and
  is not needed for this phase. daisyUI/Tailwind stay in the stack
  (owner-approved) even though phase 1 renders no daisyUI component —
  trimming the CSS bundle is a phase 6 perf-budget item, not a phase 1
  stack change.
- 2026-11-02 — **Phase 1: browser checks are mirrored in jsdom.**
  Playwright's Chromium cannot be downloaded in this sandbox (host
  outside the network allowlist), so `src/app.test.tsx` asserts the same
  behaviour `e2e/sheet.spec.ts` asserts in CI. Local green is therefore
  evidence about CI, not a substitute for it; CI remains the authority.

- 2026-11-02 — **Phase 2: Firebase 12.19.0** was pinned instead of 13.x
  because this repo/CI use Node 22; 13.x subpackages require Node ≥24.12.
  `@grpc/grpc-js` is overridden to 1.14.7 to clear the shipped-dependency
  audit. `@firebase/rules-unit-testing` 5.0.2 and `firebase-tools` 15.34.2
  are dev-only Emulator Suite tooling. All are inside the Firebase
  whitelist; no UI/state/icon library was added.
- 2026-11-02 — **Phase 2: guest mode was kept, not cut.** Phase-1
  `dsa-archive.progress.v1` rows stay byte-for-byte compatible; a new
  `dsa-archive.progress.updatedAt.v1` key holds per-topic guest
  timestamps, backfilled once for older installs. The merge notice shows
  guest/cloud row counts and per-topic winners, and writes nothing until
  the user chooses. Firestore Rules has no loops, so progress writes are
  one problem key per `setDoc`; import/merge use sequential one-key writes.
- 2026-11-02 — **Phase 2: the CI Google account is emulator-only.**
  `src/account.ts` supplies a strict JSON fake `google.com` id_token to
  the Auth Emulator; production uses `signInWithPopup`. No service
  account, Admin SDK, password, or live project identifier is present.
- 2026-11-02 — **Phase 2: backup schema v1** is one JSON file with profile
  settings plus all `progressByTopic` rows, empty notes/lists/plans arrays
  for phases 3–4, and friends/summary excluded. Import validates schema,
  catalogue ids, field types and a 1 MB cap, previews counts, then
  replaces only after confirmation.
- 2026-11-02 — **Phase 2: `largeText` remains local-only**; `theme` and
  `hideDone` sync through the profile doc. Cloud→local changes are tagged
  so they do not echo a write.

- 2026-11-02 — **Phase 3: notes and custom lists require sign-in; guest mode
  is unchanged for progress.** Personal writing is exactly the data `rule.md`
  §5 says needs login ("only personal data requires login"), and phase 3 adds
  no guest-note store to merge. The sheet, its search/filters and guest
  progress keep working signed out; the Notes/Lists views explain why an
  account is needed. Reversible if the owner later wants offline guest notes.
- 2026-11-02 — **Phase 3: rules v2 validates notes and lists by shape and
  size, not by a 495-id whitelist.** Firestore Rules allow 1,000 evaluated
  expressions per request, so a 495-element `in` test on every note/list write
  risks that ceiling — and it would not prevent extra documents anyway. The
  rules enforce the owner-only paths, the exact field set, string/list types,
  5,000/8,000 note caps, ≤60-char list titles, ≤200 list ids, joined-id text
  ≤12,000, and `updatedAt == request.time`; catalogue membership is enforced
  in the client (`isKnownProblemId`) and re-checked by the backup parser.
  **No phase-2 rule was weakened**; the only phase-2 test edit is stricter
  (it now proves `plans`/unknown collections stay denied, because notes and
  lists became deliberately owner-readable).
- 2026-11-02 — **Phase 3: backup schema v2 with a v1 reader.** The writer
  emits real `notes[]` and `lists[]` arrays next to the unchanged profile and
  progress payload; `parseBackup` accepts schema 1 **and** 2, so phase-2 files
  import unchanged (they always wrote empty arrays, so they restore zero notes
  and lists). A v1 file claiming note/list content is refused rather than
  guessed. The 1 MB file cap rises to **4 MB** because notes are individually
  capped but numerous.
- 2026-11-02 — **Phase 3: the markdown preview is hand-written, not a
  dependency.** `src/markdown.ts` escapes all HTML first, then re-introduces
  only fenced code, `#`-headings, bullets, inline code, bold, italic and
  `http(s)` links; `javascript:` and raw HTML never render. Headings are
  styled paragraphs so the CI axe heading-order audit stays valid. No
  markdown/editor/sanitiser/icon/dialog package was added, so no licence entry
  is owed.
- 2026-11-02 — **Phase 3: one screen, three views; the note editor stays
  inline in the row.** Sheet · Notes · Lists are `.list-tabs` buttons with
  `aria-pressed` (not ARIA tabs, which would promise a keyboard contract this
  view switch does not implement). The approved problem-detail mock is served
  by an inline row panel because the app still has no router; bottom nav and
  the desktop rail stay deferred until phases 4–5 add real destinations.
- 2026-11-02 — **Phase 3: emulator browser specs run serially
  (`playwright.config.ts` → `workers: 1`).** Both emulator specs sign in as
  the same deterministic CI user and reset the shared emulator, so overlapping
  them would be flaky. `ci.yml` also pipes the emulator step to
  `test-output.log` and, on failure only, re-emits the interesting lines as
  check-run annotations — the agent sandbox cannot download Actions logs,
  which made earlier failures unreadable.
- 2026-11-02 — **Phase 3: notes/lists have no guest local store.** Unlike
  progress, a signed-out note has nowhere truthful to live, and inventing a
  second merge path would double the phase-2 merge risk. Drop a note's text
  before signing in and it is simply not saved; the editor is not rendered
  while signed out.

- 2026-11-03 — **Phase 4: the daily plan is one document per local day**
  (`users/{uid}/plans/{yyyy-mm-dd}`, `problemIds` + `doneIds` + server
  `updatedAt`), exactly the shape sketched in `DATA-MODEL.md` §3. Only **today's**
  document is subscribed (one read per app open, offline-cached); export is the
  only place that reads the whole history. The day key is the phone's *local*
  calendar day, so a 23:59 session on one device never lands on another date
  than the one the owner is living in.
- 2026-11-03 — **Phase 4: revision status is derived, never stored.** A solved
  row is due 3 → 7 → 21 days after its first solve and each revision, then
  graduates. The only new field is `rc` (revision count), which rules v3 requires
  on every progress entry; `s` stays `todo|done` so the sheet control, the phase-2
  merge logic and the "revision" value the rules already allowed all keep working.
  Consequence recorded for the next phase: a phase-2/3 document (and a v1/v2
  backup entry) without `rc` still loads — readers default it to 0 — and the
  backup parser normalizes it before writing, because the v3 rules demand it.
- 2026-11-03 — **Phase 4: the planner, the queue and the stats need an account;
  the sheet does not.** Planning writes per-account data and the queue is
  computed from the owner's own dates, so signed out these three views show a
  short explainer instead of controls that cannot save (the same rule phases 2–3
  used for notes and lists). No guest planner store was invented, so guest mode
  keeps exactly one merge path — progress.
- 2026-11-03 — **Phase 4: rules v3 adds `plans` and the `rc` field, and weakens
  nothing.** Phase-2 profile/progress rules and phase-3 note/list rules are
  byte-for-byte unchanged apart from the entry field set gaining `rc`; the plan
  block is owner-only with a day-key doc id, exact fields, ≤200 ids each, joined
  text ≤12,000 and `doneIds` ⊆ `problemIds`. The phase-2 "unspecified collection
  is denied" assertion now names `friends`/`public/summary` — still a *stricter*
  statement, and the emulator suite grew to 10 tests rather than losing any.
- 2026-11-03 — **Phase 4: stats are computed on the device, with no chart or
  date dependency.** Streak, heatmap, weekly strip and topic/level bars are
  derived from `fd`/`lr` (and a plan day's `doneIds`) by ~200 lines of pure
  TypeScript in `src/planner.ts`; nothing is stored for them and no server job,
  Cloud Function or extra collection exists. Avoiding a chart/date library keeps
  the Spark-only, no-new-licence position intact and the bundle honest.
- 2026-11-03 — **Phase 4: backup schema v3, still reading 1 and 2.** Plans are
  real documents in the export (`date`, `problemIds`, `doneIds`, `updatedAt`) and
  entries carry `rc`; `parseBackup` accepts schemas 1, 2 and 3, defaults a missing
  `rc` to 0, and refuses a v1/v2 file that claims plan content rather than
  guessing. The exported `profile.dailyGoal` is now the real value instead of the
  hard-coded 5 the phase-2 writer emitted.
- 2026-11-03 — **Phase 4: tabs, not a router or a bottom nav.** The view row
  grows to Sheet · Today · Revision · Notes · Lists · Stats with `aria-pressed`
  and horizontal overflow on phones; the 0-D mock's five-destination bottom nav
  stays deferred because Friends and More still do not exist. No new CSS token or
  colour was introduced — the phase reuses the goal track, metric tiles, heatmap,
  weekly strip and bar rows the mock already froze.
- 2026-11-03 — **Phase 4: CI failure diagnostics now include context.** The
  sandbox can download neither Actions logs nor artifacts (both blob hosts are
  outside its allowlist), so `ci.yml` re-emits each failing block with 14 lines of
  context as a check-run annotation. That change is what turned three opaque
  Playwright failures into fixable ones this phase.

## Law waivers

- 2026-11-02 — AppFlow law 13 ("no backend unless the niche proves it;
  offline-first default") — **owner-directed adaptation, not a waiver
  of caution:** backend (Firebase) is the owner's explicit product
  choice for multi-device + friends use; the offline-first *half* of
  the law is kept as an invariant (Firestore local cache + signed-out
  browsing + export). No other law waived; ≤4-week budget stands.

## Third-party licences

- **Shipped in Phase 0:** React/React DOM 19.3.1 (MIT), Vite 8.3.5 and
  React plugin 6.2.1 (MIT), TypeScript 7.0.2 (Apache-2.0), Tailwind CSS
  and Vite plugin 4.3.3 (MIT), daisyUI 5.7.50 (MIT); test-only Vitest
  5.0.5/jsdom 30.1.3 (MIT), Playwright 1.64.1 (Apache-2.0), and
  axe-core Playwright 4.14.0 (MPL-2.0). Exact pins and the phase-time
  licence check are recorded in `docs/phases/00-bootstrap-data-extraction.md`.
- **Shipped in Phase 2:** Firebase JS SDK 12.19.0 (Apache-2.0), with
  `@firebase/app` 0.16.2 / `@firebase/app-compat` 0.5.18 and
  `@grpc/grpc-js` 1.14.7 (Apache-2.0) overrides to keep Node 22 support
  and a clean production audit. Dev-only Emulator Suite tools:
  `@firebase/rules-unit-testing` 5.0.2 (Apache-2.0) and `firebase-tools`
  15.34.2 (MIT). Package licences and engines were checked against npm
  metadata on 2026-11-02. No icon library was added; Lucide remains
  deferred until a row-action screen needs icons.
- Repo also holds a third-party site copy as STUDY reference only — not
  licensed for redistribution and never part of a deployable build.

## Open

- [x] **Exit gate complete (2026-11-02).** Plan, stage-2
      authorization, copied-tree disposition, Git author identity,
      site name, and licence are all recorded above. No exit-gate
      item remains open, and none of them may be re-asked; changing
      any of them is a new GATE decision. Plan-docs commit +
      `copy-web/` move + merge to `main` were separately commanded
      by the owner on 2026-11-02 (above). Phases 0, 0-D and 1 are
      complete (0-D approved and tokens frozen 2026-11-02); phases 0-D
      and 1 were merged to `main` through PR #3 on the owner's explicit
      command of 2026-11-02 (above). Phase 2 is complete on its own
      session branch with green emulator CI, stopped at the merge gate.
      Phase 3 (notes, snippets, notes overview/search, custom lists, rules v2,
      backup schema v2) is **merged to `main` through PR #5** on the owner's
      explicit command of 2026-11-03 (CI runs
      [#30](https://github.com/pabi277/DSA-archive/actions/runs/41517643913)
      and [#31](https://github.com/pabi277/DSA-archive/actions/runs/41518256654)
      green). Phase 4 (daily goal + Today, 3/7/21-day revision queue, stats,
      rules v3, backup schema v3) is complete and **merged to `main` through
      PR #6** on the owner's explicit command of 2026-11-03, with CI
      [#39](https://github.com/pabi277/DSA-archive/actions/runs/41524189110)
      and [#40](https://github.com/pabi277/DSA-archive/actions/runs/41525296888)
      green. Nothing is deployed or published
      — there is no public URL and no live Firebase project. Living state and
      the next-chat prompt: `prompt.md`.

### Owner items (settings only you should change)

- [ ] **Repo visibility:** `pabi277/DSA-archive` is PUBLIC while
      containing a third-party paid-site copy. Recommended: set
      Private while the third-party copy remains under `copy-web/` (Settings →
      Danger zone) — or explicitly command the agent to change it.
- [ ] **Owner live check (still gated):** create the Firebase project
      personally on the **Spark (no-cost)** plan from the checklist in
      `docs/phases/02-firebase-auth-cloud-progress.md`, then perform the
      owner's own phone↔laptop check once linked. Phase 2's CI acceptance
      is emulator-only; the agent created no project, deployed no rules
      and published no Hosting URL. Never paste service account
      keys/passwords in chat or git.


### Phase 5 agent implementation choices (2026-11-03)

- Invite codes are 128-bit bearer capabilities, direct-get-only and rotatable;
  friendship requires an atomic reciprocal write verified by rules. Remove
  access requires reciprocal existence; rotate after removal to prevent the
  removed person reusing an old code. No invite links or social backup.
- The summary exposes only aggregate counts, streak and the last activity
  date, plus an as-of day for freshness. The rolling-seven-day group target is
  viewer-local and session-only, not a synchronized group setting. A stale or
  inaccessible summary is excluded rather than assumed to be zero.
- Access is server-revocable, but data already seen or cached cannot be erased
  from another device; the app hides unconfirmed cached friend summaries.

### Phase 6 agent implementation choices (2026-11-02 UTC)

- **Zero-dependency PWA shell (`tools/build-sw.mjs`, `tools/generate-pwa-icons.mjs`, `src/pwa.ts`).**
  Instead of pulling in `vite-plugin-pwa` / Workbox (~50 transitive packages),
  a deterministic Vite `closeBundle` step hashes `dist/` into a versioned cache
  bucket (`dsa-archive-shell-<sha>`) and emits `dist/sw.js`; clean-room `"DA"`
  monogram PNG/SVG icons are generated with Node's `zlib` using frozen tokens.
  `sw.js` intercepts same-origin `GET` only and explicitly skips `/__/*` so
  Firebase Hosting's `/__/auth/*` OAuth helpers are never hijacked.
- **CSS & JS performance budgets enforced in CI (`tools/check-budgets.mjs`).**
  Tailwind v4 `@source` is restricted to `src/` and `index.html` (stopping
  accidental scans of `copy-web/`) and unused `@plugin "daisyui"` CSS emission
  is removed while keeping approved packages pinned in `package.json`, cutting
  built CSS from **203.18 kB → 26.86 kB (6.30 kB gzip)**. Rolldown
  `codeSplitting.groups` + lazy `import('./backup')` split JS into cacheable
  chunks all strictly `<500 kB` (`index` **103.25 kB / 28.39 kB gzip**).
- **Offline cold-boot & Spark quota hardening (`src/accountData.ts`, `src/friendsData.ts`).**
  `accountData.ts` falls back to `getDocFromCache(profileRef)` when `getDoc`
  rejects offline so signed-in Airplane-Mode cold opens boot cleanly without a
  false `Sync error`. `friendsData.ts` deduplicates `public/summary` publishes
  by canonical JSON within an active sharing session so app opens, metadata
  echoes, and bookmark toggles cost 0 extra Firestore writes.
- **Firebase App Check evaluated and NOT enabled in v1 (6.2).** Web App Check
  requires Google reCAPTCHA v3 or Enterprise, which injects third-party Google
  scripts/telemetry on page load (triggering the `rule.md` §3 analytics/tracker
  GATE), falls outside the `rule.md` §5 Firebase v1 whitelist, carries
  10k-assessment/Enterprise billing caveats, and uses 30–60m tokens that cannot
  refresh in Airplane Mode — while `firestore.rules` v4 already enforces
  authenticated owner/reciprocal-friend access and strict per-field caps for a
  ≤6-person group. Revisit via an owner GATE only if the app becomes public.

## Owner decisions — v2 direction (answered 2026-11-03, never re-ask)

- 2026-11-03 — **v2 priority?** — "boost its UI" is the **first** work item; the
  interface must be *super good*, not polished later. Recorded as phase v2-01.
- 2026-11-03 — **Expensive ideas?** — **Dropped**: FSRS scheduler, attempt-history
  engine, readiness score, calibration, per-pattern time ("par"), weak-pattern radar,
  workload forecast, ETA modelling. Cheap survivors only: reason chips, a single
  `o` outcome field (`clean|hint|couldnt`), momentum instead of a punitive streak, and
  a one-line pace sentence (phase v2-08).
- 2026-11-03 — **Video?** — YouTube plays **inside our own screen** via the official
  IFrame Player API. The owner browses with **Brave**, so ad filtering is the browser's
  business. The app **never** modifies, overlays or blocks any part of the player
  (ToS §4.13) — a permanent limit, not a TODO.
- 2026-11-03 — **Transcripts?** — **Dropped entirely** (auto-fetch *and*
  paste-your-own). Analysis kept in `docs/FEEDBACK-ytpro-review.md` §2.2; not revisited
  unless the owner asks.
- 2026-11-03 — **Notes section?** — **Removed.** Replaced by a **Code section** stored in
  Firestore (`users/{uid}/snippets/{problemId}`), with rules v5 and backup v4.
- 2026-11-03 — **Audience of the redesign?** — **Beginners.** All 20 topics always
  listed, in-app problem statements, primers, hints, common mistakes and **quizzes**
  (12 per topic, pass 80%). Copy must be readable by a first-year student.
- 2026-11-03 — **Code execution?** — **Local, in-browser** (WebAssembly compiler in a
  Worker). **No** server, **no** Judge0/Piston, **no** hidden test suites or judge
  verdicts. C++/Python/JS run; Java/C#/Go/Rust get copy-out links.
- 2026-11-03 — **Phase packaging?** — Every phase gets its own folder under
  `docs/phases-v2/NN-slug/` with a complete `PLAN.md` (and a `RECORD.md` when executed).

### GATE re-openings approved for v2 (2026-11-03, phase v2-01)

- **Design tokens v1 → v2**: the 2026-11-02 freeze is superseded by a new one-time freeze
  after the owner reviews tokens v2 (Inter + JetBrains Mono subsets, semantic colour
  roles, density, motion). `UI-REFERENCE.md` keeps the v1 table as history.
- **"System fonts only"** is lifted (two self-hosted subsets, ~45 kB, budgeted).
- **CI budgets** may be re-baselined **once**, with published numbers and a written
  rationale (phase v2-09): CSS 60 kB raw / 18 kB gz · entry JS 180 kB raw / 55 kB gz.
- **Tailwind/daisyUI** must be decided (use them, or remove them) — no third state.
- **CSP**: adopting one (with `frame-src` for YouTube and `worker-src`) is approved in
  principle; report-only first, then enforce.

## Owner decisions — v2 content policy (answered 2026-11-03, batch 2)

- 2026-11-03 — **More problems?** — **Yes: add more LeetCode problems.** Implemented as
  pattern "drills" (3–4 rungs per pattern, **+120–140 problems**, `data/practice-sets/`),
  not by inflating the sheet. Progress reuses the existing `progressByTopic` shape with
  `lc-<n>` ids — no new collection, field, schema version or quota path. The generated
  `firestore.rules` whitelist and per-topic size cap were extended to admit those known
  ids; no rules *design* change. Target ≈400 distinct LeetCode problems overall. Doc:
  `docs/phases-v2/03-content-pipeline/PRACTICE-SETS.md`.
- 2026-11-03 — **Sources?** — **No single source of truth for articles/learning
  resources.** Ranked, multi-publisher `resources[]` are added per problem (LeetCode,
  NeetCode, cp-algorithms, USACO Guide, GfG, Programiz, cppreference), every non-theory
  row with ≥1 practice + ≥1 learning source and **≥2 distinct publishers**, publisher name
  always visible, `verified` dates re-checked by `check:links`. takeuforward is demoted to
  one source among several. **Owner clarification in `69834c7`: video links stay
  single-source** in `links.video`; no video multi-sourcing, transcript, oEmbed badge,
  player modification or bulk rewrite. Doc:
  `docs/phases-v2/03-content-pipeline/RESOURCE-POLICY.md`.
- 2026-11-03 — **Questions/tasks?** — **No quiz spam.** A check appears only where it is
  checkable, follows the material, and changes behaviour; ≤3 checks per topic beside the
  topic quiz, ≤1 inline check per primer section. **Coding stays coding** (run + authored
  tests, phase 07) and **theory becomes MCQ** (4 options, per-option explanations, and a
  solution the learner can always reveal). Never both on one row:
  `[Solve]` for coding, `[Check]` for theory. Doc:
  `docs/phases-v2/05-quiz-engine/THEORY-MCQ.md`.

## Phase v2-01 agent implementation choices (2026-11-03 UTC)

- **Tailwind/daisyUI REMOVED, not adopted (the gate required one or the other).**
  Every shipping class was already hand-written against the token layer; the
  framework contributed only an unused preflight + theme-variable layer — once
  `@source` was scoped to `src/`, its remaining contribution was dead bytes that
  failed the shell budget. Built CSS is **42.2 kB raw / 7.9 kB gzip** without it
  (cap 60 / 18 kB). `@tailwindcss/vite`, `tailwindcss`
  and `daisyui` are uninstalled from `package.json`/`package-lock.json`,
  `vite.config.ts` no longer registers the plugin, and `src/styles.css` imports
  only `./design/tokens.css`. Consequence: `docs/UI-REFERENCE.md` v1's
  "Vite + React + TypeScript + Tailwind + daisyUI" stack line is v1 history.
- **Tokens v2 frozen** (`src/design/tokens.css`, documented in
  `UI-REFERENCE.md` "Tokens v2"). The single accent is `--action`, semantic roles
  add `--info` (v1 had a "no separate hue story"), and `--chart-1…3` carry level
  bars. The authorised one-time v1 → v2 re-freeze is now **spent**.
- **Fonts are vendored, not installed at build time** (`public/fonts/`, 57.5 kB
  raw in the separate runtime bucket, never precached). `tools/fetch-fonts.mjs`
  reproduces them from `@fontsource*` + `pyftsubset`; the packages are *not*
  dependencies because a `npm ci` must not change shell bytes. Both typefaces
  are OFL; nothing comes from `copy-web/`.
- **`#/notes` is a first-class route.** The v1 tab strip showed "Notes" and
  "Lists" side by side; v2 keeps both (notes are deleted in v2-04, not in v2-01)
  and gives each its own URL so the back button and the palette can address them
  independently. No data shape changed.
- **Windowing is by topic, not by scroll position.** A closed topic mounts zero
  rows; an open topic mounts the first 40 and grows by 40 through an explicit
  "Show N more rows" control, which a deep link or a random pick pre-expands.
  This keeps ≤1,200 DOM nodes with all 20 topics openable and keeps keyboard
  triage deterministic (no node recycling under the focus ring).
- **Undo covers guest progress and the local library; destructive deletes still
  confirm.** Marking, un-marking and status/outcome flips push a 6-second toast
  that restores the exact previous snapshot (`replaceGuestProgress`); list delete
  keeps its confirm step and is *not* undoable, per the PLAN risk note.
- **Visual baselines are generated in CI only** and committed by hand
  (`e2e/visual.spec.ts`, 2 viewports × 2 themes × 6 routes = 24 PNGs). The specs
  skip unless `CI` or `VISUAL_BASELINES=1` is set, so a local run cannot silently
  accept a new baseline.

## Phase v2-02 implementation choices (2026-11-03)

- **Outcome persistence is one optional field.** `progressByTopic` entries accept
  `o: clean|hint|couldnt` only while solved; legacy solved rows with no outcome read
  as `clean`, and todo rows omit the field. Topic confidence rings count `clean` as
  learned; `hint` and `couldnt` remain solved but not confidently learned. Firestore
  rules are now v5 and backup schema v4; prior backup versions remain importable.
- **Phase 02 content states stay honest.** Learn primer and Quiz execution are
  placeholders pending the content pipeline/quiz engine (phases 03/05); the Quiz
  start button is disabled until questions exist. No statements, primers, quizzes,
  or drill content were authored in this phase.
- **Visual baselines remain a human gate.** CI generates the Phase 01/02 matrix and
  uploads `visual-baselines`; it does not silently commit or auto-accept PNGs. The
  owner reviews the artifact before the Phase 02 merge gate closes.

## Phase v2-03 implementation choices (2026-11-03)

- **No owner answer was changed.** The earlier owner-answer clarifications above
  record the source policy (`69834c7`: videos stay single-source) and the drill
  rules shape. This phase implements them; it does not re-open a gate.
- **Four ranked resources per row, not six.** The seeder was trimmed from 4–6 to
  exactly 4 to stay inside the 380 kB gzip shell budget. The first-ranked resource
  is a verb-noun primary action; `⋯ More sources` exposes all four with publisher,
  type, rank, `verified` date and match label. Rank is global 1–4, which is also
  unique per type. Original video links are preserved byte-for-byte in `links.video`.
- **Build-time JSON, no runtime fetch.** `data/problems.json` stays the validation/
  authoring master; four derived minified catalogue shards and all learner/practice
  JSON are imported by `src/content/load.ts` via `import.meta.glob(..., eager: true)`.
  Content chunks are code-split in `vite.config.ts`: `content-data` 7.1 kB gzip,
  `practice-data` 5.2 kB gzip, `content-ui` 23.6 kB gzip.
- **Safe renderer and shape sanitisation.** `RichText` escapes first, then whitelists
  semantic inline elements, bullets, code and HTTPS allow-listed links; raw HTML and
  external images never enter the DOM. Every JSON accessor tolerates a missing or
  malformed file and returns a designed state instead of failing the build.
- **Rules whitelist is generated, not a new schema.** `lc-<n>` drill keys join the
  existing 20-topic `progressByTopic` shape; the generated rules whitelist and size
  cap include 495 + 136 known ids. Firestore rules remain v5 and backup remains v4.
- **Link checks are split.** Deterministic `npm run check:links` validates the source
  registry, canonical URL shape and 180-day `verified` freshness for CI speed and
  Spark frugality. `link-audit.yml` runs live HTTP checks on schedule/manual dispatch;
  video oEmbed/player badges remain Phase 06 work.
- **Coverage publication.** CI adds the coverage table to the run summary, a PR
  comment, a marker-delimited section of the PR body, and a `content-coverage`
  artifact. The generated `docs/content/coverage.md` remains the checked-in source of
  truth; publishing is non-blocking. PR [#14](https://github.com/pabi277/DSA-archive/pull/14) was opened on the owner's explicit 2026-11-03 command; no merge was authorized.
- **One-open-PR law preserved.** The stale v2-01 PR #11 was closed (not merged, branch untouched) before PR #14 was opened, because `rule.md` §2 forbids a second open PR. Closing was explicitly approved by the owner in the same gate moment.
- **Authoring is incremental.** One fully authored topic (Arrays) ships with 6
  statements, 12 quiz items, 42 theory MCQ cards, 136 drills and a coverage report.
  The remaining 19 primers, 114 statements and 228 quiz items keep designed missing
  states. Owner sample-batch accuracy review is explicitly pending.
- **Visual baselines remain a human gate.** The matrix grows from 32 to 48 generated
  baselines (statement, hint open, primer, practice grid added); owner visual review
  remains outstanding before merge.

## Phase v2-04 implementation choices (2026-11-04)

- **No owner answer was changed.** "Notes section removed → Code section" (2026-11-03)
  is implemented as recorded; snippets stay private (own-data path only, never in
  `public/summary`, never shared with friends by default), and snippets require
  sign-in while the sheet keeps working signed out — the same split lists already had.
- **Explicit save, no autosave.** The editor saves on the Save button or ⌘S/Ctrl+S;
  the `Saving… / Saved ✓ / Offline — will sync` line is driven by the Firestore
  snapshot's `hasPendingWrites` plus `navigator.onLine` read at render (no listener
  state, no awaited writes), so an offline save queues in the persistent cache and
  syncs on reconnect exactly like progress. Saving an emptied solution deletes it.
- **The verdict is runner data, not an editor picker.** `verdict`
  (`clean|hint|couldnt`, the same enum as progress `o`) records how the last run went.
  The Phase 04 editor preserves an existing verdict untouched and the UI displays it
  as a chip; writing it belongs to the Phase 07 runner. A verdict picker in the
  editor was cut — it is outside the Phase 04 editor spec and the frozen shell
  budget left no room for extras.
- **`#/notes` is gone, not redirected.** The route, nav item and palette destination
  were deleted with the feature; an old `#/notes` bookmark lands on the designed
  not-found screen. There is no nested `#/problem/<id>/code` route — code lives in
  the problem page's panel and at `#/code`.
- **Legacy backup migration is lossless for code, honest about markdown.** Schemas
  1–4 still import. A legacy note's `snippet` field was already code and becomes
  `code` byte-for-byte (`language: "other"`); the markdown body is dropped except a
  ≤500-char plain-text tail kept as the reminder, and every shortened note's id is
  named in a printed import warning. Progress outcomes are preserved. A pre-v5 file
  claiming `snippets`, or a v5 file claiming `notes`, is refused, not guessed.
- **The frozen 380 kB shell cap was met, not moved — by 35 bytes.** Landing at
  379,965 B gzip took dead-code deletion (the never-imported v1 `SheetList.tsx`,
  already-tree-shaken placeholder bodies, dead CSS), scope-minimum choices (no
  title-sort on `#/code` — newest first per the PLAN scope text; `⌨ has code` badge
  on sheet/topic rows, not drill rows; clipboard-API-only copy; CSS
  `content-visibility` instead of JS windowing for 631 rows), and a build-baseline
  tightening (modulepreload polyfill off, `target: 'esnext'` — the app already
  requires evergreen browsers for React 19 + PWA; pinning `es2022` instead costs
  ~38 B and would tip the shell over the cap). The optional `highlight.ts`
  tokenizer was skipped. The next phase must budget against equal cuts or stop
  for a cap gate — the approved one-time re-baseline remains Phase 09's.
- **Visual baselines remain a human gate.** The matrix grows from 48 to 56
  baselines (signed-out `code` and `problem-code` routes added), generated in CI
  as artifacts for owner review per the standing flow; contentful signed-in
  editor/peek shots ride in the emulator spec's screenshots. Owner visual review
  remains outstanding before merge.

## Phase v2-05 implementation choices (2026-11-04)

- **No owner answer was changed.** "Coding stays coding, theory becomes MCQ" and
  the anti-spam placement rule (`THEORY-MCQ.md`: `≤1` inline check per primer
  section, `≤3` per topic beside the 12-item quiz) are enforced both in UI and
  in `tools/validate_data.py`. Theory rows carry `[Check]` (never `[Solve]` or
  code panels); coding rows carry `[Solve]` (never quiz cards).
- **Theory MCQs reuse `progressByTopic`; inline primer checks write nothing.**
  Answering a theory MCQ right marks the row `done` with `o: "clean"`; opening
  `Show solution → Mark as read` marks it `done` with `o: "hint"` (both wired
  into the 6-second `u` / toast undo stack via an atomic `markDoneWithOutcome`
  write). Primer inline checks are purely formative and touch neither
  `localStorage` nor Firestore.
- **Rules v7 + backup v6.** `users/{uid}/quizResults/{topicId}` stores one best-score
  document per topic (`bestScore <= bestTotal <= 12`, `lastScore <= bestTotal`,
  `1 <= attempts <= 999`, `passed is bool`, `lastAt == request.time`, `topicId`
  in the 20-topic generated whitelist). Guest users store the identical shape at
  `dsa-archive.quiz.v1` and receive an explicit *Merge guest quiz scores?* banner
  on sign-in (nothing merges silently). Backup writer advances **v5 → v6**
  (`quizResults[]` added; schemas 1–5 still import with `quizResults: []`, and
  pre-v6 files claiming `quizResults` are refused rather than guessed).
- **Lossless build-time table-packing keeps the frozen 380 kB shell cap intact
  with 4.04 kB of headroom (`375.96 kB` gzip).** Phase 04 ended `35 B` below the
  `380,000 B` shell precache cap, while Phase 05 needed to ship the quiz engine,
  UI screens, styles, 3 Arrays inline checks, and all 42 `TheoryMcq` JSON files
  in the offline bundle. Rather than raising the cap early (the one-time
  re-baseline belongs to Phase 09) or trimming scope, `vite.config.ts` packs
  `virtual:dsa-catalogue` at build time (URL prefix dictionary, `$` problem-slug
  back-references, deduplicated publisher-label table) and unpacks the exact
  runtime `Catalogue` object in `src/catalogue.ts` (proven `toEqual` to
  `data/problems.json` in `src/catalogue.test.ts`), alongside splitting
  `@firebase/auth` core from `@firebase/firestore`. All canonical JSON files on
  disk remain untouched and human-readable.
- **Visual baselines grow from 56 to 64.** Added `quiz-home` (`/#/quiz`) and
  `quiz-runner` (`/#/quiz/arrays`) across phone/desktop × dark/light for CI
  generation and owner visual review.

## Phase v2-06 implementation choices (2026-11-04)

### Owner decision — the shell cap moved 380 kB → 386 kB gzip (2026-11-04)

Asked, with measured numbers: Phase 05 ended at `376,014 B` (3,986 B of headroom under the
frozen 380,000 B cap) and the theatre adds **~9.9 kB gzip** of new capability — the stage and
its states, the control bar, the stamps list, the mini player, the per-topic speed store, the
auto-advance offer, the Settings card and ~0.85 kB of CSS.

Every byte that could be recovered without breaking the phase contract was recovered first:
the coverage-report projection (1.2 kB), duplicate/dead CSS and the unused `Skeleton`/`Field`
primitives (~1.5 kB raw), stamp *editing* (the contract only asks for add/delete), the stage's
tick rail, and the second full player in the mini dock. Chunk reshuffles were measured and
rejected — `${catalogue}+app-data`, `content-ui → entry`, one merged chunk and a separate
`theatre` chunk all land between `362.9` and `386.1 kB`, i.e. they move bytes rather than
remove them, and splitting the theatre from `content-ui` *adds* 1.4 kB of duplicated UI.
Dropping the catalogue's positional `rank` and deduping three `lcLabel` strings buys 0.29 kB
(gzip already absorbs the repetition).

**Owner chose "re-baseline to 386 kB now"** (2026-11-04), from four options that also included
a phase-06-only 390 kB cap, cutting a piece of the contract, and leaving CI red for review.

**Second re-baseline, same day: 386 kB → 388 kB.** The 386 kB figure put the build exactly on
the ceiling, so a few hundred bytes of ordinary build-to-build variance failed CI while the
identical tree passed locally. Trimming dead exports and dead CSS recovered only ~120 B, and
the alternatives worth another 2 kB (moving the authored theory/practice content out of the
precache, or cutting the stamps rail) trade away offline-first or contract items. The owner
chose **388 kB**, which restores ~2 kB of real headroom and keeps every feature.
Consequences, all recorded in `docs/phases-v2/06-theatre-player/RECORD.md`:

- `tools/check-budgets.mjs` `maxShellGzipBytes` = `388_000` (was `380_000`, then `386_000`);
  CSS 60 kB raw / 18 kB gz, entry 180 kB raw / 55 kB gz and the 520 kB largest-chunk caps are
  **unchanged**.
- Measured: **~`386,0xx B`** gzip — about `2 kB` of headroom, which is what a working gate
  needs. Phase 07 must still treat the precache as full: the runner's wasm belongs in the
  runtime bucket, never in the shell.
- **Phase v2-09 still owns the cap review.** It is expected to tighten it again once the
  browser runner lands; this is a one-phase re-baseline, not a permanent 386 kB ceiling.

### Theatre architecture choices

- **Our chrome never touches the player.** The IFrame player is the official, unmodified
  embed (`enablejsapi=1` + `origin`, `rel=0`, `iv_load_policy=3`, `playsinline=1`,
  `cc_load_policy=1`, `host=youtube-nocookie`, `start=` for `?t=`). Our control bar is a
  separate row *below* the 16:9 box; `e2e/theatre.spec.ts` asserts the bar's top edge is at or
  below the frame's bottom edge. Ads remain the browser's business, as decided.
- **`f` fill-screen is not shipped.** It was implemented (fixed overlay, bar still under the
  frame) and then removed: to be usable it needed overlay CSS that fought the 16:9
  letterboxing, and YouTube's own player already has a correct full-screen control that we
  must not shadow or replace (ToS §4.13). The remaining keys are `space`/`k`, `←`/`→`, `c`,
  `s` and `n`; `f` is the one phase-contract item consciously dropped, and the phase record
  says so.
- **The problem page's tab is URL state** (`#/problem/<id>?tab=code`). The phase-04 code
  screen's "Open problem" row relies on landing with the solution in view, and "every view
  has a URL" is a standing rule, so the tab had to graduate from component state.
- **The tab strip is phone-only UI; the tab itself is never phone-only.** Above 1080 px the
  strip is `display: none`, because the rail carries the same two destinations (the stamps
  list and `⌨ Code`) and a second control would be duplicate navigation. It was briefly kept
  in the DOM as a 1×1 `clip-path` box to stay keyboard-operable; that was removed after CI
  showed it still intercepting pointer events — a control that is invisible but in the way is
  worse than no control. Because the tab is the address, nothing is lost at any width, and
  the screen listens for `hashchange` so back/forward and pasted deep links land on the panel
  they name.
- **An editor is keyed by identity, never by a save timestamp.** Keying `CodeEditor` on
  `problemId-updatedAt` made every save remount it, discarding whatever was typed after the
  save and (on a slow snapshot) unmounting the panel mid-read. `updatedAt` is data, not
  identity.
- **Stamps live in the snippet document** (`snippets[id].moments`), not a new collection:
  ≤30 per snippet, `text` ≤140 chars, `at` 0–86 400, `createdAt` ISO. They ride the read
  Phase 04 already performs, so no new document, no new quota path and no new sync concern.
  Rules **v8** whitelist the keys; backup **v7** carries them and still reads 1–7.
- **Metadata is build-time only.** `tools/fetch-media.mjs` queries oEmbed once per unique
  video and `vite.config.ts` folds `data/media/` into the existing content bundle. The runtime
  never calls oEmbed, so real titles work in Airplane Mode with no CORS surface. When the
  build machine has no egress (this sandbox), the tool writes nothing — no guessed metadata is
  ever committed.
- **The theatre screens are lazy, the models are eager.** `problemPage`/`stage`/`stamps`/
  `player` load with the `content-ui` route chunk on `#/problem/<id>`; the models
  (`video.ts`, `speedMemory.ts`, `stamps.ts`) and the mini player stay eager because a video
  that keeps playing must be able to dock on any route. Entry JS therefore stays at
  `32.84 kB` gzip.


## Phase v2-07 implementation choices (2026-11-04)

### Reuse scan — the two toolchains we depend on

| Job | Choice | Licence | Checked | Why |
|---|---|---|---|---|
| C / C++ in the browser | `@live-codes/clang-wasm@0.3.0` | MIT | 2026-11-04 (published 2026-09-23) | Clang 22.1.8 + `wasm-ld` + wasi sysroot on wasm behind one API (`createCompiler(lang, {baseUrl}).run(code, stdin)`), assets are plain files we serve ourselves |
| Python in the browser | `pyodide@314.0.7` | MPL-2.0 | 2026-11-04 (published 2026-09-14) | CPython 3.13 on wasm; unmodified distribution, stdlib only |
| Bundling the worker | `esbuild@0.28.2` | MIT | 2026-11-04 | build-time only |

Rejected in the same scan, with reasons: writing our own interpreter (a fake partial C++
teaches the wrong thing), any remote judge (owner decision: code never leaves the device,
no server, no money), Monaco/CodeMirror (phase 04 already decided the small editor),
and an in-browser TypeScript checker (doubles the download for a copy-out case).

### Owner-facing numbers: the compiler is 29 MB, not the 14 MB the plan guessed

The contract estimated "~14 MB of assets, unpack to about 84 MB". Measured: **C/C++
29,000,772 B**, **Python 13,531,207 B**, worker bundle **1,276,228 B**. A real C++17
standard library plus `wasm-ld` does not fit in 14 MB. Every number the UI prints is read
from `public/runtime/packs.json`, which `tools/fetch-runtime.mjs` writes from the bytes it
actually stored, so the button label and the progress bar cannot disagree with the
download. No pack is fetched until the learner taps a button that states its size, and
each language downloads only its own pack. The *budget* consequence is nil: toolchains sit
in the runtime bucket (cap 48 MB for both packs + worker, published in
`tools/check-budgets.mjs`), never in the shell.

### The runner is an installed add-on, not shell — and the 388 kB cap was not touched

The phase prompt for 07 said the runner's wasm/worker payload must stay in the runtime
bucket and that raising the shell cap again needs a gate. The runner's *UI* would have
broken the cap on its own, so it is treated the same way as its toolchain:

- `vite.config.ts` renames the runner's lazy chunks to `assets/runner-<hash>.js`;
  `tools/build-sw.mjs` excludes that prefix (and `runtime/`) from the precache and serves
  them cache-first from `dsa-archive-runtime-v1` after install;
- `tools/check-budgets.mjs` publishes two *new* separate buckets — runner UI
  (26,543 B raw / 9,907 B gzip, cap 120 kB / 40 kB) and toolchains (cap 48 MB) — and
  asserts the Service Worker precaches **none** of them;
- the panel's stylesheet travels inside its chunk (`import './runner.css?inline'` + one
  injected `<style>`), because a split `assets/*.css` file would have landed in the shell's
  CSS bucket or in a file whose name the SW and the budget gate would have to guess.

Measured shell on this branch: **386,674 B gzip against 388,000 B** (1,326 B of headroom),
i.e. the shell grew by ~1.4 kB gross (the lazy hooks in `mcqCard` and the two `Suspense`
wrappers) and 0.7 kB was recovered in the entry chunk. **No re-baseline was requested and
none was made**; phase 09 still owns the cap review, and any further shell growth before
that is a gate.

### Engineering choices inside the runner

- **Stop is `worker.terminate()`.** wasm that will not yield cannot be interrupted from its
  own thread, so the client kills the worker; the next run respawns it and re-reads the
  cached assets. This is why `while(true)` dies in milliseconds and why a stopped run can
  never leave half a program behind.
- **Two clocks.** The first compile of a language on a device gets a 45 s allowance
  (`COLD_COMPILE_ALLOWANCE_MS`); afterwards a case gets its 3 s (`CASE_TIMEOUT_MS`), and
  the list shares one 30 s budget (`TOTAL_BUDGET_MS`). One clock would have failed the
  first case on a mid-range phone while Clang warmed up.
- **One choke point for the network.** The worker replaces `fetch`: `/runtime/*` is
  cache-first into `dsa-archive-runtime-v1`, everything else throws while a program runs,
  and `WebSocket`/`EventSource`/`importScripts`/`XMLHttpRequest` are deleted for the
  duration. The JS sandbox additionally shadows `fetch`, timers, `caches`, `localStorage`
  and friends in the function scope. `e2e/runner.spec.ts` also asserts on the main thread
  that no request carries the learner's code.
- **No verdict is written by a run.** The contract permits setting the optional
  `snippets[id].verdict` from a run result; we do not, because a local run is not a judge
  verdict and phase 04's picker stays the only writer. No Firestore shape, rules or backup
  version changes in this phase (rules **v8** / backup **v7** stand).
- **`-std=gnu++17`.** The toolchain offers only the `gnu*` spellings (strict `c++17`
  rejects the GNU extensions Clang's default target relies on). `-O0 -Wall -Wextra` are as
  specified and `std::sort` linking is covered by a real CI compile.
- **Python input is line-batched**, so `input()` works but an interactive prompt does not
  flush mid-line. JavaScript takes no `stdin` at all — a browser cannot offer a blocking
  read, and the panel says so.
- **Add-on removal is one cache.** "Clear" deletes `dsa-archive-runtime-v1` only; the app
  shell cache, Firestore's offline cache and every other origin store are untouched.

### A red CI run must name its own failure (2026-11-04, post-merge)

`main` failed its Unit tests step (`41864841877`) on a tree that had just passed on the
branch and passed 294/294 locally six times. The annotation said only `Process completed
with exit code 1.`, Actions logs and artifacts are outside this sandbox's allowlist,
`gh run rerun` was refused, and the run could not be re-dispatched. The failure was not
merely flaky — it was **unreadable**, and that is the defect that got fixed first.

Standing rule from here on: **a step that can fail must be able to say why in a
check-run annotation**, because annotations are the only channel this project's agent can
read. Specifically:

- The unit step writes a JUnit report, keeps the console output, and fails on **vitest's
  exit code only** — it prints `vitest exit=N, tee exit=M`, so an infrastructure failure
  (a missing log directory, a full disk) can never again masquerade as a test failure.
- A follow-up step names up to six failing cases with file, test name and assertion
  message. When zero cases failed it says so, and falls back to `Unhandled / FAIL /
  Failed Suites / Error:` lines from the captured output — which is how the real cause was
  found in one run.
- Browser failures already had this treatment (phase 4); the unit step was the gap.

The underlying bug was **console output outliving a test worker**: vitest ships console
writes over an async RPC, and a write still in flight when the worker is torn down raises
`Closing rpc while "onUserConsoleLog" was pending`, which fails the run while every test
passes. Three sources were removed rather than suppressed: jsdom's `scrollTo`
"Not implemented" messages (157 per run) are stubbed in `src/testSetup.ts`, the runner
panel's missing `IS_REACT_ACT_ENVIRONMENT` flag is set like the other React suites, and
lazy route chunks are settled inside `act()` before a test unmounts.

Two consequences worth keeping:

- **A stub is not a silenced warning.** Nothing asserts scroll position, and jsdom's
  "implementation" is a no-op that differs only by writing to the console.
- **Fire-and-forget writes need an acknowledgement before a reload.** The phase-06 stamps
  spec reloaded while the emulator had not yet received the write. It now polls the
  emulator's REST API (`waitForSavedStamp`) — the same owner-token access `code.spec.ts`
  uses — instead of trusting that the UI showing a row means the server has it.

## Owner decision — phase v2-08 budget re-baseline (2026-11-05)

- 2026-11-05 — **CI budgets after the insight layer?** — Asked with measured numbers and
  three options (re-baseline · cut the contract · park the phase for v2-09). The owner chose
  **re-baseline**: **shell gzip 388,000 → 393,000 B** and **CSS raw 60,000 → 61,000 B**.
  Rationale, in the owner's own decision: the insight layer is *Today* surface (chips,
  momentum, the disclosure) and must be precached to work offline on a first launch, so it
  cannot ride an on-demand bucket like the runner's. Measured on this branch: shell
  **391,193 B gzip** (`+4,613 B` over `main` @ `79c6099`) and **60,238 B raw CSS**
  (`+1,278 B`), leaving **1,807 B** of shell headroom. Entry JS (36.2 / 55 kB gzip), the
  largest chunk (129.9 / 165 kB) and CSS gzip (10.3 / 18 kB) are unchanged and inside their
  caps. Both constants and the reasoning are published in `tools/check-budgets.mjs`; phase
  v2-09 still owns the cap review. This is a one-phase re-baseline, not a new ceiling.

## Phase v2-08 implementation choices (2026-11-05)

- **The reason vocabulary is one module, not per-screen logic.** `src/insights/reasons.ts`
  owns the nine texts and their fixed order; Today, the suggestions card, topic Practice
  rows and the ⌘K palette all read it, so a chip can never be invented at a call site. A
  row already ticked done today returns no reasons at all (a chip there is noise), and the
  ≥30-day `not touched` rule only fires on rows that have been touched.
- **Momentum is a published formula, not a score.** `Σ 0.9^daysAgo × active(day)` over 14
  days, scaled so all 14 active days is exactly `10.0`; `studyDaysThisWeek` is the last 7.
  **"Rest day earned" is quantified**: 0 problems today and ≥ 5 study days in the last 7
  (`WEEK_QUOTA_DAYS`) — the contract said "the 7-day plan quota is met" without a number,
  and this is the number, exported so a later phase can argue with it.
- **The trajectory is arithmetic with a hand-checked example.** Pace is the median over the
  last 14 *active* days (not calendar days), so one heroic afternoon cannot move the line;
  `trajectory.test.ts` pins `At 2/day you’ll finish the sheet in 10 days` and the stalled
  `Needs 3.4/day to hit 2 Dec`. No chart, no confidence band, nothing stored.
- **Plan vs reality counts days that had work.** A calendar-day median puts every honest
  learner at `0.0/day` (most days are rest days), which would make the sentence useless and
  the `Set goal to N` suggestion wrong. The window is days worked and the sentence says so;
  the suggestion never writes by itself.
- **The two target controls live on `#/insights`, not in Settings.** They are genuine
  settings-store fields (sanitised, synced to the profile, carried by backups), but a finish
  line only means something beside the trajectory it changes, and a second form would have
  cost shell bytes for no new capability. Recorded as a deviation in the phase record.
- **Rules v9 / backup v8, and deliberately nothing more.** The target date and list ride the
  profile document every session already reads: no new collection, no extra read, no new
  quota path. Both fields are optional, both accept an explicit `null` to clear, and the
  profile whitelist stays closed (an unknown key is refused, proven in the emulator test).
- **Detector actions are single and undoable.** `Add 6 to today` is one `addManyToToday`
  call and one undo entry that removes exactly what it added; `Hide for today` is per device
  and per day (`dsa-archive.detectors.v1`), so yesterday's dismissal never silences today's
  note. `Open in Code` filters `#/code` by the shared topic when the stale solutions share
  one, because the screen's filters are `q`/`lang`/`topic` (adding an outcome filter was
  outside this phase).
- **`src/insights/bits.tsx` exists and the plan did not list it.** Chips, the momentum
  line/strip, the detector row and the plan-reality line are shared by four screens; one
  small module beats importing the route screen from each of them.
- **Visual baselines cannot show the signed-in surfaces.** They run signed out; chips and
  the open disclosure need real progress, so `e2e/insights.spec.ts` proves them functionally
  (390×844 and 1440×900) with axe 0, and `#/insights` joins the snapshot matrix in its
  designed signed-out state.

- **The profile applies the target fields once, on load — and never over a value the
  learner just set.** Re-applying them from the settings snapshot looked harmless and was
  not: a snapshot generated a beat before a change can be delivered a beat after it, and
  silently restored the old finish line. So (a) the snapshot listener no longer writes
  targets into the settings store; (b) the single load-time application is skipped when the
  value changed while the profile read was in flight. The write path still records the
  fields, so a reload or another device reads them. Caught by `e2e/insights.spec.ts` failing
  intermittently across otherwise-identical runs, which is why the spec holds each value for
  a second, across a reload and across a second cold boot.

## Phase v2-09 decisions & implementation choices (2026-11-05)

**No recorded owner answer was changed in this phase.** The gate re-openings of
2026-11-03 (budget re-baseline once with published numbers, Tailwind/daisyUI "use
or remove", CSP report-only → enforce) are closed here; the 2026-11-05 cap decision
(393,000 B gzip shell / 61,000 B raw CSS, "further shell growth is a gate, not another
re-baseline") is treated as **frozen** and was not re-opened.

- **Budgets: final review, no second re-baseline.** `tools/check-budgets.mjs` now
  publishes the v1 (phase 6, 2026-11-02) → v2 (phase 9) table with a reason per
  line and freezes the caps already approved by the owner: CSS 61,000 B raw /
  18,000 B gz, entry 180,000 / 55,000, single chunk 520,000 / 165,000, shell
  393,000 B gz, fonts 60,000 B, runner UI 120,000 / 40,000, account add-on
  40,000 / 15,000, toolchains 48 MB. Measured shell on this branch: **392,142 B
  gzip** (858 B headroom) against both the emulator/CI build and the
  live-config build. The +74.5 kB over v1 is the packed catalogue (42.0 kB),
  content UI (47.7 kB) and the Today insight layer (4.6 kB), offset by lossless
  packing — not a new dependency. Every future byte over 393,000 is a GATE.
- **Tailwind/daisyUI: still removed.** The v2-01 decision is re-verified, not
  reversed. `package.json`/lockfile carry neither package, `src/styles.css`
  imports only `./design/tokens.css`, and `tools/check-deadweight.mjs` fails CI
  on a stale `@tailwind`/`@plugin "daisyui"` import or a reference in the docs
  that presents the old stack as current. `docs/UI-REFERENCE.md` now labels its
  "Vite + React + TypeScript + Tailwind + daisyUI" line as v1 history and marks
  Tokens v2 **FINAL** with the measured contrast table. 13 dead v1 CSS rules
  (1,023 B) were pruned; 25 unused class names remain in the token layer only
  because they are the documented public API, not dead rules.
- **CSP: report-only first, then enforce — both stages are now tests.** The
  owner's wording is preserved as a sequence, not skipped. `e2e/csp.spec.ts`
  drives the six core routes (plus the runner's injected `<style>`) with
  `Content-Security-Policy-Report-Only`, records `securitypolicyviolation`
  events and asserts zero; only then does the second test repeat them with the
  enforced header and assert the app still works. Both stages run in CI on every
  push, so a future regression re-opens stage 1. `firebase.json` ships the
  enforced header, byte-for-byte equal to `tools/csp.mjs` (checked by
  `npm run check:csp`). No `report-uri`/`report-to`: a report endpoint would be
  a third-party network request, which `rule.md` §3 gates. The emulator variant
  of `connect-src` exists only inside the test and is asserted absent from the
  live header.
- **`style-src-elem 'unsafe-inline'` is deliberate and narrow.** The v2-07
  runner ships its CSS inside the lazy add-on chunk and injects one `<style>`
  element; static Hosting cannot issue a per-response nonce and there is no
  stable hash across builds. React also writes inline style attributes (already
  allowed by `style-src-attr`). `script-src-elem` stays a strict allow-list with
  **no** `'unsafe-inline'`, no `'unsafe-eval'`, no wildcard; eval/wasm belong
  only to the worker's `script-src`. `tools/check-csp.mjs` enforces that split.
- **SW v2 and the `/runtime/*` wording of PLAN §3.2.** PLAN §3.2 says "never
  intercept `/runtime/*`", while PLAN §3.5 requires the runner to say
  "cached/unavailable" offline and the 2026-11-04 v2-07 decision (DECISIONS
  above, higher in the authority order) explicitly says the SW serves runtime
  assets cache-first from `dsa-archive-runtime-v1` after install. Resolved in
  favour of the decision: runtime files are **never precached into the shell**
  and are never handled by the shell's network-first navigation fallback; they
  live only in the separate opt-in runtime cache, which "Clear" deletes on its
  own. YouTube, `youtube-nocookie`, `googlevideo`, `/iframe_api`, Google/Firebase
  hosts and `/__/auth/*` are bypassed entirely. No `navigationPreload`. The
  versioned `dsa-archive-shell-<12 hex>` cache is derived from the built file
  bytes, and a waiting update announces `DSA_UPDATE_READY` → visible
  "New version ready — Reload" toast → `SKIP_WAITING`.
- **"Delete my data" is a real test, not copy.** Phases v2-04 and v2-05 deferred
  this. `src/accountDelete.ts` owns the seven named Firestore shapes, the
  reciprocal friend links, the invite capability and the opt-in public summary;
  `e2e/account-deletion.spec.ts` seeds them through the emulator and proves
  every document is gone after the two-step Settings control. Watched-video
  flags (`dsa-archive.watch.v1`) are **study history, not a preference**, so
  they are cleared; `dsa-archive.settings.v1` (theme, hideDone, targets) is
  kept. No rule was weakened, no Function, no analytics.
- **Lighthouse is not a CI job (recorded deviation).** PLAN §3.6 asks for mobile
  perf ≥90 / a11y ≥95 on five routes. Adding Lighthouse would require a second
  Chrome trace, a new npm dependency and an outbound network path, and would
  break the ≤12-minute CI ceiling. The enforced substitutes are the published
  bundle budgets, the 6-profile × 18-route axe matrix, `e2e/performance.spec.ts`
  (40-row windowing invariant with the measured DOM count printed, warm route
  transition, `font-display: swap`, CLS ≤0.25 with the value printed, lazy
  images), and `tools/check-tokens.mjs` (contrast, 44 px targets, 2 px focus).
  The v2-01 "≤1,200 nodes" figure was the row region, not the whole document;
  a v2-09 cold `/#/search` with one open topic measures 1,628 document nodes. Lighthouse can be run by the owner against the uploaded
  `site-preview`; this phase does **not** claim a Lighthouse score.
- **Visual baselines remain CI-generated and reviewed, never auto-accepted.**
  No PNG baselines are committed (they are platform/font-stack specific), and
  Chromium cannot be downloaded inside this sandbox. `playwright.config.ts` keeps
  `updateSnapshots: 'missing'`; CI writes the 2×2×15 = 60 PNGs and uploads them
  as the `visual-baselines` artifact for the owner to review and commit by hand.
  "Refreshed deliberately" therefore means *the refresh is generated and
  surfaced for review*, not silently accepted.
- **One Playwright project, shared fixtures, ≤12-minute CI.** `e2e/matrix.ts`
  holds the six profiles (390×844, 768×1024, 1440×900 × dark/light × large
  text), `KEY_ROUTES`, `auditRoutes`, `expectFits` and the single
  `waitForServiceWorkerControl` fixture now shared with `e2e/pwa.spec.ts`.
  Adding three Playwright *projects* would have re-run all 18 feature specs
  three times; one project with explicit viewport profiles keeps the matrix
  honest and the job inside `timeout-minutes: 12`. `workers: 1` stays because
  the emulator-backed specs share one deterministic CI user.
- **A real contrast defect was found and fixed, not waived.** The v2-09 palette
  axe audit (CI `42025415117`) reported `color-contrast` on the highlighted
  command-palette row: `--subtle` on `--action-soft` is **3.73:1 dark / 4.28:1
  light**. The active row's secondary text now uses `--muted` (**5.34:1 /
  5.56:1**). `tools/check-tokens.mjs` gained the `muted/action-soft` pair (28
  pairs total) and a source assertion on `src/styles.css`; no frozen token value
  was changed. This is exactly why the matrix was added rather than a waiver.
