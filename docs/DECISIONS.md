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
  `lc-<n>` ids — no new collection, no rules change. Target ≈400 distinct LeetCode
  problems overall. Doc: `docs/phases-v2/03-content-pipeline/PRACTICE-SETS.md`.
- 2026-11-03 — **Sources?** — **No single source of truth.** Articles/videos become a
  ranked, multi-publisher `resources[]` per problem (LeetCode, NeetCode, cp-algorithms,
  USACO Guide, GfG, Programiz, YouTube channels, cppreference), every non-theory row with
  ≥1 practice + ≥1 learning source and **≥2 distinct publishers**, publisher name always
  visible, `verified` dates re-checked by `check:links`. takeuforward is demoted to one
  source among several. Doc: `docs/phases-v2/03-content-pipeline/RESOURCE-POLICY.md`.
- 2026-11-03 — **Questions/tasks?** — **No quiz spam.** A check appears only where it is
  checkable, follows the material, and changes behaviour; ≤3 checks per topic beside the
  topic quiz, ≤1 inline check per primer section. **Coding stays coding** (run + authored
  tests, phase 07) and **theory becomes MCQ** (4 options, per-option explanations, and a
  solution the learner can always reveal). Never both on one row:
  `[Solve]` for coding, `[Check]` for theory. Doc:
  `docs/phases-v2/05-quiz-engine/THEORY-MCQ.md`.
