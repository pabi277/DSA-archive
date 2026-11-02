<!-- Adapted for a WEBSITE from AppFlow templates/rule-app.md (MIT template).
     App-specific parts (Android, Play, APK, AdMob, billing, testers,
     package ID) are translated to web equivalents, never copied blindly. -->

# DSA Archive (website) — rules

> The operating manual for THIS repository — **self-contained**: follow it
> even if no other repo is reachable. Adapted from the owner's AppFlow
> playbook @ `57597b3332ad578614a0d9d5609f9cf8a278ee8a` (checked
> 2026-11-02; provenance only — the text below is authoritative here).
> Owner answers live in `docs/DECISIONS.md`; living state in `prompt.md`.

## 1. Identity

- Product: **Firebase-backed DSA web app** for the owner + a few
  invited friends (owner decision, 2026-11-02) — site name
  `DSA Archive` (confirmed 2026-11-02); repo
  `pabi277/DSA-archive`.
- **Website first.** An Android app is a possible *separate future
  project* (its own AppFlow plan chat), not a phase of this repo. Keep
  `data/`, design tokens, and the Firestore per-user data shape
  portable so that door stays open.
- License: **MIT (owner-selected 2026-11-02)** — our original
  code/data only; the `LICENSE` file is added in Phase 0.1.
- Git author identity for THIS repo (owner-designated 2026-11-02,
  recorded in `docs/DECISIONS.md`):
  `pabi277 <chakraborttypabi2772006@gmail.com>`. Verify with
  `git var GIT_AUTHOR_IDENT` / `GIT_COMMITTER_IDENT` before every
  commit; never use any other identity here, and never copy AppFlow
  addresses into this repo. Changing it is a GATE. Work only on the
  session branch assigned to each chat; the planning branch
  `arena/6dcaf48f-dsa-archive` was merged to `main` on 2026-11-02 by
  explicit owner command and must not be reused for new phases.
- Time budget: ship a small useful v1 in **≤ 4 weeks of phase chats**
  (AppFlow law 3, translated). Firebase + friends cost phases
  (`docs/ROADMAP.md`); if the budget slips, **phase 5 (friends) is the
  first cut**, and any extension is a recorded waiver.

## 2. Branching and the merge gate (law)

- Work only on the assigned session branch. Never create/switch
  branches, push `main`, force-push, or `git reset --hard`.
- Before any commit: verify `git var GIT_AUTHOR_IDENT` /
  `GIT_COMMITTER_IDENT`, inspect the commit before pushing. Never use
  an agent's personal email/account. (Exit gate satisfied
  2026-11-02: plan approved + identity designated above; the
  plan-docs/`copy-web/` merge that day was explicitly commanded by
  the owner and does not loosen any gate below.)
- The agent never opens a PR, merges, pushes `main`, tags, releases,
  **deploys/publishes the site, deploys Firestore rules/indexes to a
  live project, creates/upgrades a Firebase project**, changes repo
  visibility, or bulk-deletes files without the owner's explicit
  command in chat. Permission to plan or code is not permission to
  PR/merge/deploy. "Open a PR" does not mean "merge it".
- One phase at a time; never a second PR while one is open. Check
  branch, working tree, PRs, and CI before GitHub actions.

## 3. Questions — ask less, gate always

**GATE — always ask; never act without an explicit yes:**
plan approval · site name (+ any future domain) · git author identity ·
license · PR · merge · `main` push · tag/release · **deploy the site
(incl. Hosting preview channels — they are public URLs)** · repo
visibility change · **create a Firebase project, link this repo to a
live project, deploy live Firestore security rules, upgrade
Spark → Blaze, or enable any Firebase product outside the v1 whitelist
(§5)** · deleting/moving the copied `index.html` tree · money in any
form (domain, Blaze, paid services) · making any friend/user data
visible to others by default · legal/IP-risk choices (publishing
anything derived from the copied page beyond structure, titles, and
outbound links) · adding analytics/trackers · waiving a law of this
file · changing an answer recorded in `docs/DECISIONS.md`.
→ One Summary batch per gate moment, ≤ 4 questions, each naming its gate.

**DECIDE-ONCE — ask once, record dated in `docs/DECISIONS.md`:**
build direction, audience, progress storage, v1 scope — **all answered
2026-11-02; never re-ask.** Still to confirm once: design direction
(at the phase 0-D approval). Changing any recorded answer is a GATE.

**DEFAULT — never ask:** researchable facts (research, cite source +
check date) · reversible implementation choices (log under Agent
decisions) · anything already answered · taste with an obvious default.

## 4. Work cycle — one phase per chat

1. Verify state first: `git status`, `git log`, PRs, CI runs. Trust the
   repository, not memory.
2. Evidence before hypothesis: `file:line` reads against the current
   tree. No fix (and no claim about the copied page) on a guess.
3. Reuse scan first, then implement the current phase only (2–4 parts;
   one whole capability) per `docs/ROADMAP.md`, recording
   DEPEND / ADAPT / STUDY / BUILD / REJECT with licence + activity
   checked that day (map: `docs/RESEARCH.md` §4). The phase's "Done
   means" cell is the acceptance test. Nothing outside it.
4. Tests + CI green, **nothing live needed** (AppFlow's no-device gate,
   translated): data-validation tests (495-count integrity), unit
   tests, production build, internal link check, a11y + screenshot
   checks at phone/desktop widths, and — for any phase touching
   Firebase — **Firestore rules tests against the local Emulator
   Suite in CI** (a phase that weakens a rule to pass is a failed
   phase). Every run uploads a downloadable **`site-preview`**
   artifact (built `dist/` zip) the owner can open on a phone.
   Live-project deploys of any kind stay gated (§3).
5. Docs ride with the code commit: `docs/phases/NN-<slug>.md` record
   (including what the preview shows), roadmap status,
   `docs/DECISIONS.md` if anything new, `prompt.md` updated.
6. Report (CI run id, tip sha, preview artifact, what is now visible),
   then **print the next-chat prompt IN CHAT** (fully filled, AppFlow
   `templates/next-chat-prompt.md` pattern). `prompt.md` is backup
   only. Then **stop at the merge gate** (§2).

## 5. Invariants — do not break

- **Clean-room law (reuse-first STUDY):** the copied takeUforward page
  is studied for *behaviour/structure only*. Never ship their copied
  HTML/CSS/JS/fonts/logos/images, never copy articles/solutions/paid
  content, never bypass login/paywall/access controls. What may cross
  over: the factual list structure (topic → problem titles in order)
  and outbound links, in our own data file, code, wording, and design;
  learning content is reached by **linking out**. Beyond that = GATE.
- **Firebase whitelist (v1): Authentication (Google sign-in) · Cloud
  Firestore (Standard) · Hosting (at release; gated) · Emulator Suite
  (dev/CI only).** Everything else — Cloud Functions, Cloud Storage,
  Realtime Database, SQL Connect, Analytics, FCM push, AI products —
  is **out of v1** (Functions/Storage also require the paid Blaze
  plan per official pricing, checked 2026-11-02). Enabling one is a
  GATE with a recorded reason.
- **Spark-only cost guardrail:** design and data shapes must stay
  inside the no-cost Spark quotas (`docs/DATA-MODEL.md` §4 budgets the
  reads/writes). Blaze upgrade, or anything that can bill, is a money
  GATE. No payment method is ever added by the agent.
- **Offline-first with sync, never cloud-only:** the app must open,
  browse the sheet, and record progress offline (Firestore local
  cache), syncing when back online. Signed-out browsing of the sheet
  works; only personal data requires login. Export/import backup
  always exists — nobody's progress is locked into Firebase.
- **Secrets & credentials: none in git or chat, ever.** No service
  account JSON, private keys, or passwords. The owner creates the
  Firebase project and performs console steps personally (checklist
  supplied in the phase-2 record). Firebase *web config* values are
  public identifiers, not protection — **Firestore security rules are
  the protection**, are versioned in this repo, and are emulator-tested
  before any gated live deploy.
- **Friends privacy (audience: me + a few friends):** each user can
  read/write **only their own** data. Sharing is opt-in per user and
  summary-only (counts/streak — never notes/snippets by default).
  No public profiles, no public leaderboard. Adding wider visibility
  is a GATE.
- **Phone-first twice over:** the owner builds from a phone (CI builds;
  previews open on a phone) and will mostly *use* the app from a
  phone — mobile layout is the primary target, desktop second.
- **UI from the approved design:** no real UI code before phase 0-D is
  owner-approved and tokens frozen in `docs/UI-REFERENCE.md`.
- **Sheet data is ours and editable:** one validated data file in git
  (`docs/DATA-MODEL.md`); runtime never reads the copied `copy-web/index.html`
  and the catalogue is **not** moved into Firestore in v1 (git diffs
  beat a CMS we don't need yet).
- **Content accuracy is the owner's job** (AppFlow law 14):
  agent-invented explanations are never shipped as fact; notes are the
  user's own writing.
- **Reuse stays lawful** (scorecard in `docs/RESEARCH.md` §4);
  no-licence repos are unusable code; shipped licences logged in
  `docs/DECISIONS.md`. One library per job.
- **Kill/pivot fast:** the pre-written use test in `docs/RESEARCH.md`
  §6 decides iterate-vs-stop. Never rewrite it after seeing results.

## 6. Definition of done (any change)

CI green (build + tests + link/a11y/screenshot; + emulator rules tests
when Firebase is touched) · `site-preview` shows the increment ·
phase record written · roadmap + decisions current · `prompt.md`
updated · next-chat prompt printed in chat · short report — then stop
at the merge gate. A public release additionally needs phase 6's
checklist green and the owner's explicit deploy command.
