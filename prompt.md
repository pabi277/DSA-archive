<!-- This file is the continuation prompt: paste it into the next chat. -->

# DSA Archive (website) — continuation prompt

> **Self-contained handoff.** Repo authority: `rule.md`; owner answers:
> `docs/DECISIONS.md`; roadmap: `docs/ROADMAP.md`; design inventory and
> **frozen** tokens: `docs/UI-REFERENCE.md`; data/Firestore shape:
> `docs/DATA-MODEL.md`; living state: this file. AppFlow @
> `57597b3332ad578614a0d9d5609f9cf8a278ee8a` is provenance only. Update
> this file at each phase end in the same commit as that phase record.

## Identity (fixed — exit gate complete 2026-11-02)

- Site: `DSA Archive` · repo: `pabi277/DSA-archive` · MIT applies to
  original code/data only; `LICENSE` is present.
- Audience: owner + a few invited friends. Backend: **Firebase Spark only**
  — Google Auth + Firestore + Hosting (gated); no Functions, Storage or
  Blaze. Website first; any Android app is a separate project.
- Git author: `pabi277 <chakraborttypabi2772006@gmail.com>`. Before every
  commit verify `git var GIT_AUTHOR_IDENT` / `GIT_COMMITTER_IDENT`; a fresh
  clone may default to a `noreply` address, so set the repo-local identity
  first. Phases 0/0-D/1 used earlier Arena branches and were merged to
  `main`; phase 2 used `arena/62f988be-dsa-archive` and stopped at its
  merge gate. The next chat must use **its own** Arena-assigned branch;
  never rename, switch, reuse another chat's branch, or push `main`.

## Rules digest (full rules: `./rule.md`)

- One phase per chat, exactly within `docs/ROADMAP.md` "Done means".
- No PR, merge, release, deployment (including GitHub Pages or Hosting
  preview channels), live Firebase change, project creation/upgrade,
  visibility change, or bulk move/delete without explicit owner command.
- Never re-ask recorded choices. Read `docs/DECISIONS.md` first.
- Clean-room: `copy-web/` is STUDY-only. Do not ship its code/assets/text.
  Factual topic/problem labels/order/levels/links live in our own data
  file; learning content is reached by linking out.
- No secrets in git/chat. The owner handles Firebase console steps and
  creates the Spark project personally. Security rules are the protection
  and must be Emulator-tested before any gated live deploy.
- CI green + downloadable `site-preview` per phase. Any Firebase phase
  additionally needs Firestore **rules tests against the Emulator Suite in
  CI**. Docs ride with the code commit. Report CI run/tip/artifact and what
  the preview shows; print the next-chat prompt in chat; stop at the gate.
- **The design gate stays closed:** 0-D was approved 2026-11-02 and tokens
  are frozen in `docs/UI-REFERENCE.md`. Build UI to those tokens; changing
  a frozen value or the design direction re-opens the GATE.

## Current state (2026-11-02)

- **Phase 0 — Bootstrap + data extraction: ✅ complete and merged.**
  PR #2 merged to `main` at `8638a91`. Data: **495 rows · 20 topics**
  (Basic 84 · Core 287 · Pro 109 · 15 unbadged stored as `null`;
  link rows practice 453, video 369, article 289, LeetCode 289).
- **Phase 0-D — Design prototype + tokens freeze: ✅ approved 2026-11-02.**
  Tokens frozen unchanged in `docs/UI-REFERENCE.md`; the mock was folded
  into phase 1 and deleted (readable at `1791693`).
- **Phase 1 — Sheet core: ✅ complete and merged to `main`.** PR #3
  merged with merge commit
  `dab3207c83953667d7af66b2cc127938d63862f3`; CI run #13 green at tip
  `baac7ac`. All 495 rows, instant cross-topic search, filters, random
  pick, weakest-topic hint, outbound links, guest progress and settings.
- **Phase 2 — Firebase Auth + cloud progress: ✅ complete on
  `arena/62f988be-dsa-archive`, stopped at the merge gate.** Record:
  `docs/phases/02-firebase-auth-cloud-progress.md`. Final tip
  `75a9d7e1fad9b5d11e037423ffe67f025e1a2943`.
  - **CI: Site CI run [#23](https://github.com/pabi277/DSA-archive/actions/runs/41501878705)
    SUCCESS** (1m46s): catalogue validation · generated-rules check ·
    **60 unit tests** · emulator-configured build · dist/link checks ·
    **4 Emulator Suite rules tests** · **4 real-Chromium Playwright tests**
    (desktop + phone-light + signed-in phone sync/backup, three axe
    audits). Failure-only diagnostics step skipped. **`site-preview`
    artifact: 312,869 bytes** (14-day retention).
  - **2.1** Google sign-in (`signInWithPopup`) + emulator-only deterministic
    CI Google account, profile doc, avatar menu, sync pill, sign-out/error
    states, `theme`/`hideDone` profile sync (`largeText` stays local-only).
  - **2.2** `users/{uid}/progressByTopic/{topicId}` shards with
    `s,b,a,fd,lr,updatedAt`, persistent Firestore local cache, pending/
    offline metadata, and an **explicit, never-silent** guest merge using
    `dsa-archive.progress.v1` plus backfilled per-topic
    `dsa-archive.progress.updatedAt.v1`. Newest `updatedAt` wins per topic;
    no write happens before the user chooses. Guest mode was kept, not cut.
  - **2.3** versioned `firestore.rules`, generated from `data/problems.json`
    by `tools/generate-firestore-rules.mjs`: default deny, own-data-only,
    owner collection queries, exact profile/progress field types and size
    caps, known topic/problem ids, one changed problem key per write,
    `serverTimestamp` enforcement. `tools/firestore-rules.test.mjs` proves
    stranger/unauthenticated denial, invalid fields, unknown ids,
    oversized/bulk writes, owner deletion. No rule was weakened.
  - **2.4** backup `schemaVersion: 1` (profile + all progress rows + empty
    notes/lists/plans + excluded friends/summary), with invalid-file error,
    count preview, explicit replace, and success state.
  - `e2e/sync.spec.ts` covers solve → guest merge → relogin in a fresh
    browser profile → offline mark → reconnect → second fresh profile →
    export/import at 390×844 against Auth + Firestore emulators.
  - Local checks green: `test:data`, `npm test` (**60 tests / 6 files**),
    `check:rules`, emulator-configured `build`, `check:dist`, `check:links`,
    Playwright spec discovery, `git diff --check`. Java/Chromium downloads
    are unavailable in the agent sandbox, so **CI is the authority** for
    emulator and real-browser checks.
  - Dependencies: Firebase JS SDK **12.19.0** (Apache-2.0) shipped;
    dev-only `@firebase/rules-unit-testing` **5.0.2** (Apache-2.0) and
    `firebase-tools` **15.34.2** (MIT); Node-22-compatible overrides
    `@firebase/app` 0.16.2, `@firebase/app-compat` 0.5.18,
    `@grpc/grpc-js` 1.14.7. Java 21 is installed in CI for the emulator.
    No dependency outside the Firebase whitelist.
  - **No live Firebase project was created or linked. No rules deploy,
    Hosting deploy, public URL, PR, merge, tag, release, or visibility
    change was made.** The owner's live check remains gated.
- Deliberate phase-2 adaptations (inline notices instead of dialogs,
  account card instead of a second route, bottom nav still deferred,
  emulator test button, retained guest mode, text sync pill) are listed in
  `docs/UI-REFERENCE.md`; none is a token change.
- Open owner items (`docs/DECISIONS.md`): repo is still **PUBLIC** while
  `copy-web/` holds the third-party snapshot — make it private or command
  the change; the **10-row live-sheet spot-check** is pending; create the
  **Spark** Firebase project personally before the gated live check.
- Known debt, deliberately deferred: the JS bundle is now ~1.03 MB
  (283 kB gzipped) because Firebase Auth + Firestore are statically
  imported; code-splitting and the still-unused Tailwind + daisyUI weight
  are **phase 6 perf-budget** items.

## Next: Phase 3 — Notes, snippets & custom lists

Read `rule.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`,
`docs/DATA-MODEL.md` (§3 notes/lists shape and §6 backup),
`docs/UI-REFERENCE.md` (frozen tokens + phase-2 adaptations),
`docs/phases/02-firebase-auth-cloud-progress.md`, and the phase-2 source.
Verify branch, `git status`, PRs, CI runs and Git author identity first;
work only on the next chat's assigned Arena branch. Do not re-ask any
recorded answer. Do not start phase 4.

Phase 3 parts, exactly as the roadmap states them:

1. **3.1** per-problem note (markdown) + my-code snippet, synced. Extend
   the own-data-only rules with note field/size validation and add
   Emulator Suite rules tests; never weaken phase-2 rules.
2. **3.2** notes overview + search.
3. **3.3** custom lists/tags (create, add/remove, filter sheet by list).
   Extend backup schema in a recorded, backward-compatible migration and
   include the new data in export/import.

"Done means": a note written on one device appears on the other; lists
filter the sheet; all of it is covered by export/import and rules tests.
Keep the sheet browsable signed-out, keep guest mode and explicit merge,
keep the frozen tokens, stay within the Firebase whitelist, and end at
the merge gate — no PR/merge/deploy without a fresh explicit command.
