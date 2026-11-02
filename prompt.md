<!-- This file is the continuation prompt: paste it into the next chat. -->

# DSA Archive (website) — continuation prompt

> **Self-contained handoff.** Repo authority: `rule.md`; owner answers:
> `docs/DECISIONS.md`; roadmap: `docs/ROADMAP.md`; design inventory and
> **frozen** tokens: `docs/UI-REFERENCE.md`; data/Firestore shape:
> `docs/DATA-MODEL.md`; release checklist & deploy steps:
> `docs/RELEASE-RUNBOOK.md`; living state: this file. AppFlow @
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
  clone defaults to a `noreply` address, so set the repo-local identity
  first (`git config user.name` / `user.email`). Each chat must use **its
  own** Arena-assigned branch cut from the current `main`; never rename,
  switch, reuse another chat's branch, or push `main`.

## Rules digest (full rules: `./rule.md`)

- One phase per chat, exactly within `docs/ROADMAP.md` "Done means".
- No PR, merge, release, deployment (including Hosting preview channels),
  live Firebase change, project creation/upgrade, visibility change, or bulk
  move/delete without an explicit owner command. "Open a PR" ≠ "merge it".
- Never re-ask recorded choices. Read `docs/DECISIONS.md` first.
- Clean-room: `copy-web/` is STUDY-only; never ship its code/assets/text.
- No secrets in git/chat. The owner creates the Spark project personally and
  does console steps; rules are the protection and must be Emulator-tested
  before any gated live deploy.
- CI green + downloadable `site-preview` per phase; every Firebase phase
  needs Emulator-Suite rules tests in CI. Docs ride with the code commit.
  Report CI run/tip/artifact and what the preview shows; print the next-chat
  prompt in chat; stop at the merge gate.
- **The design gate stays closed:** 0-D approved 2026-11-02, tokens frozen in
  `docs/UI-REFERENCE.md`. Changing a frozen value re-opens the GATE.

## Current state (2026-11-02 UTC)

- **Phases 0, 0-D, 1, 2, 3, 4 and 5 are ✅ complete and merged to `main`:**
  - **Phase 0** (PR #2): 495 rows · 20 topics (`Basic 84 · Core 287 · Pro 109 · 15 null`).
  - **Phase 0-D + Phase 1** (PR #3): tokens frozen; full sheet browsable signed-out, search/filters/random/weakest-topic, outbound links.
  - **Phase 2** (PR #4): Google Auth, topic-sharded Firestore progress sync + persistent local cache, explicit guest→cloud merge, rules v1, JSON backup v1.
  - **Phase 3** (PR #5): synced markdown notes + code snippets, searchable notes overview, custom lists filtering the sheet, rules v2, backup v2.
  - **Phase 4** (PR #6): daily goal + Today plan, 3/7/21-day spaced revision queue (`rc`), 8-week heatmap + streak + weekly stats, rules v3, backup v3; **14-day owner use test (`docs/RESEARCH.md` §6)** active.
  - **Phase 5** (PR #7, `3303c8a`): rotatable 128-bit invite codes, atomic reciprocal friendships, opt-in summary-only sharing, topic compare, rolling 7-day leaderboard, viewer-local group goal, rules v4.
- **Phase 6 — Offline/PWA, hardening & release prep: ✅ implemented on `arena/991952b2-dsa-archive` — STOPPED at the merge & deploy gates.**
  Record: `docs/phases/06-offline-pwa-hardening-release-prep.md`; release checklist & deploy runbook: `docs/RELEASE-RUNBOOK.md`.
  - **6.1** `public/manifest.webmanifest` (`standalone`, `#101313`) + deterministic clean-room `"DA"` monogram icons (`tools/generate-pwa-icons.mjs`) + build-time SHA-256 precache Service Worker (`tools/build-sw.mjs` → `dist/sw.js`, bypassing `/__/*` Hosting Auth helpers and cross-origin APIs) + `src/pwa.ts` + offline `getDocFromCache` cold-boot fallback in `src/accountData.ts` + friendly `404` and `offline.html` states.
  - **6.2** CSS trimmed **203.18 → 26.86 kB (6.30 kB gzip)** by scoping Tailwind `@source` to `src/` + `index.html` and removing unused `@plugin "daisyui"` output; JS split via Rolldown `codeSplitting.groups` + lazy `import('./backup')` so every chunk is `<500 kB` (`index` **103.25 kB / 28.39 kB gzip**; full 19-file shell **317.66 kB gzip** = ~1,133 cold installs/day inside Spark Hosting's 360 MB/day cap), enforced in CI by `npm run check:budgets`. Firestore rules & Spark quotas audited (12 Emulator tests in `tools/firestore-rules.test.mjs`; `public/summary` write deduplication in `src/friendsData.ts`). Firebase App Check evaluated and **not enabled** in v1 (reCAPTCHA v3/Enterprise tracker/whitelist/offline trade-offs documented in `DECISIONS.md` and the phase-6 record).
  - **6.3** `firebase.json` Hosting block (`dist/`, `copy-web/**` ignored, immutable asset cache + safe `SAMEORIGIN` headers, no `.firebaserc`); `README.md`, licence/credits and `copy-web/` disposition re-confirmed; exact gated rules-first then Hosting deploy runbook written in `docs/RELEASE-RUNBOOK.md`.
  - **Tests:** **126 unit/jsdom tests / 11 files**, **12 Firestore Emulator rules tests**, **10 real-Chromium Playwright specs / 6 files** (including `e2e/pwa.spec.ts` proving both signed-out and signed-in Airplane-Mode cold opens in a fresh tab with progress/notes intact, plus 0 axe / 0 horizontal overflow across `dark + light × phone + desktop × large-text`).
- **Nothing is deployed.** No PR, merge, tag, release, live Firebase project, live rules deploy, or Hosting deploy was made.

## Next-chat handoff (merge gate / owner release prep)

Read `rule.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`,
`docs/RELEASE-RUNBOOK.md`, `docs/phases/06-offline-pwa-hardening-release-prep.md`,
and verify branch, `git status`, open PRs, CI runs and Git identity
(`pabi277 <chakraborttypabi2772006@gmail.com>`) first. Never re-ask a recorded
decision.

All v1 roadmap phases (`0`, `0-D`, `1`–`6`) are complete in code and CI:

1. **If the owner commands merging Phase 6:** open the PR from the Phase 6
   branch (`arena/991952b2-dsa-archive`) or merge it only as explicitly
   commanded (`"Open a PR"` ≠ `"Merge it"`).
2. **If the owner reports friction from the 14-day use test (`docs/RESEARCH.md` §6) or visual review:** implement only that targeted fix on the current session's assigned branch, keep CI + emulator rules + budgets green, and stop at the merge gate.
3. **Live Firebase setup & deploy stay owner-gated (`docs/RELEASE-RUNBOOK.md`):** never create/upgrade a Firebase project, handle credentials/service keys, deploy live rules, deploy Hosting (including preview channels), or change repository visibility without an explicit owner command.
