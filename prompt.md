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
  first. The phase-1 chat worked on `arena/df11f576-dsa-archive`; the next
  chat must use **its own** Arena-assigned branch and must not rename,
  switch or reuse another chat's branch. Never push `main`.

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
- **The design gate is now cleared:** 0-D was approved 2026-11-02 and the
  tokens are frozen in `docs/UI-REFERENCE.md`. Build UI to those tokens;
  changing a frozen value or the design direction re-opens the GATE.

## Current state (2026-11-02)

- **Phase 0 — Bootstrap + data extraction: ✅ complete and merged.**
  PR #2 merged to `main` at `8638a91`. Record:
  `docs/phases/00-bootstrap-data-extraction.md`. Data: **495 rows · 20
  topics** (Basic 84 · Core 287 · Pro 109 · 15 unbadged stored as `null`;
  link rows practice 453, video 369, article 289, LeetCode 289).
- **Phase 0-D — Design prototype + tokens freeze: ✅ approved 2026-11-02.**
  The owner reviewed the live prototype and commanded phase 1, which is the
  approval (`rule.md` §5 gates UI on it). Tokens frozen **unchanged** in
  `docs/UI-REFERENCE.md`; the mock `src/design-prototype.tsx` was folded
  into phase 1 and deleted (readable at `1791693`). Records:
  `docs/phases/00d-design-prototype.md` → "Approval outcome".
- **Phase 1 — Sheet core: ✅ implemented, on branch
  `arena/df11f576-dsa-archive`, stopped at the merge gate.** Record:
  `docs/phases/01-sheet-core.md`. No PR was opened and nothing was merged
  or deployed.
  - Shipped: all 495 rows in 20 topic accordions (84 subtopics), browsable
    signed out · instant cross-topic search (row/subtopic/topic titles, `/`
    shortcut, auto-expanding matches) · filters: topic select, level chips
    (incl. **Ungraded**), link-type chips, hide-done · live result count ·
    empty state with clear action · random pick over the visible rows ·
    weakest-topic hint · outbound row links (`target=_blank`,
    `rel=noopener noreferrer`; 14 rows legitimately have none) · status +
    bookmark toggles · dark/light and large-text variants, both persisted.
  - Code: `src/App.tsx`, `src/SheetList.tsx`, `src/sheet.ts`,
    `src/progress.ts`, `src/settings.ts`, `src/catalogue.ts`,
    `src/styles.css`; tests `src/sheet.test.ts`, `src/progress.test.ts`,
    `src/app.test.tsx`; browser spec `e2e/sheet.spec.ts`.
  - **No dependency was added.** No Firebase SDK, no network call, no
    account. Progress/settings are device-local (`localStorage` keys
    `dsa-archive.progress.v1`, `dsa-archive.settings.v1`) in exactly the
    `DATA-MODEL.md` §3 shape minus timestamps.
  - Local checks green: `test:data`, `npm test` (**50 tests**), `build`
    (`tsc -b` clean), `check:dist`, `check:links`, `git diff --check`.
    `test:e2e` cannot run in the agent sandbox (Playwright Chromium
    download host is outside the network allowlist), so `src/app.test.tsx`
    mirrors `e2e/sheet.spec.ts` in jsdom and **CI is the authority**.
- Deliberate deviations from the approved mock (nav deferred, static
  sign-in banner, `Ungraded` badge, real device-local progress, mock
  scaffolding removed, `Inter` dropped, `<h2>` subtopics) are listed in
  `docs/UI-REFERENCE.md` → Deliberate adaptations. None is a token change.
- Open owner items (`docs/DECISIONS.md`): the repo is still **PUBLIC**
  while `copy-web/` holds the third-party snapshot — make it private or
  command the change; the **10-row live-sheet spot-check** is still
  pending; create the **Spark** Firebase project personally before phase 2.
- Known debt, deliberately deferred: the CSS/JS bundle is dominated by
  Tailwind + daisyUI (193 kB CSS / 401 kB JS, 32 kB / 99 kB gzipped) and
  daisyUI renders no component yet — a **phase 6 perf-budget** item.

## Next: Phase 2 — Firebase Auth + cloud progress

Read `rule.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`,
`docs/DATA-MODEL.md` (§3 schema, §4 Spark budget, the signed-out/merge
note), `docs/UI-REFERENCE.md` (frozen tokens + adaptations) and
`docs/phases/01-sheet-core.md`. Verify branch, `git status`, PRs, CI runs
and Git author identity first; work only on this chat's assigned branch.
Do not re-ask any recorded answer. Do not start phase 3.

Phase 2 parts, exactly as the roadmap states them:

1. **Owner pre-step (never the agent's):** create the **Spark** Firebase
   project personally from the checklist the phase-2 record must contain.
   The agent never handles credentials, never creates/links a project,
   never deploys live rules or Hosting. Web config values are public
   identifiers; **rules are the protection**.
2. **2.1** Google sign-in + profile (the phase-1 banner becomes the real
   sign-in flow; avatar menu returns to the header).
3. **2.2** Progress sync using the topic-sharded docs of `DATA-MODEL.md`
   §3 + Firestore offline cache + the **signed-out→signed-in merge** of
   the guest rows phase 1 already writes to `dsa-archive.progress.v1`
   (merge shown to the user, never silent; if it proves fiddly, cut guest
   mode rather than ship it buggy and record that).
4. **2.3** Firestore rules v1 (own-data-only, default deny, field/size
   validation) **proved by Emulator-Suite tests in CI** — including
   stranger-read and oversized-write cases. Weakening a rule to make a
   test pass is a failed phase.
5. **2.4** Export/import backup (JSON), with success and invalid-file
   error states.

"Done means": solve on the phone preview → the same progress after a
"relogin" in a fresh browser profile **against the emulator in CI**, plus
the owner's own live check once a project is linked (gated); offline
marking syncs on reconnect; rules tests prove user A cannot read user B.
Keep the sheet browsable signed-out, keep the frozen tokens, add no
dependency outside the Firebase whitelist, and end at the merge gate — no
PR/merge/deploy without a fresh explicit command.
