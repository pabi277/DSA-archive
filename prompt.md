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
  (`projectId: dsa-archive`, linked via `.env.production` + `.firebaserc` on
  2026-11-02; Analytics omitted) — Google Auth + Firestore + Hosting; no
  Functions, Storage or Blaze. Website first; any Android app is separate.
- Git author: `pabi277 <chakraborttypabi2772006@gmail.com>`. Before every
  commit verify `git var GIT_AUTHOR_IDENT` / `GIT_COMMITTER_IDENT`; a fresh
  clone defaults to a `noreply` address, so set the repo-local identity
  first (`git config user.name` / `user.email`). Each chat must use **its
  own** Arena-assigned branch cut from the current `main`; never rename,
  switch, reuse another chat's branch, or push `main`.

## Rules digest (full rules: `./rule.md`)

- No PR, merge, release, deployment (including Hosting preview channels),
  live Firebase change, project upgrade, visibility change, or bulk
  move/delete without a fresh explicit owner command.
- Never re-ask recorded choices. Read `docs/DECISIONS.md` first.
- Clean-room: `copy-web/` is STUDY-only; never ship its code/assets/text.
- No secrets or tokens in git/chat. Public web identifiers in
  `.env.production` are client identifiers, not protection — `firestore.rules`
  is the protection and must pass Emulator tests in CI before any live deploy.
- CI green + downloadable `site-preview` per change; every Firebase change
  needs Emulator-Suite rules tests in CI. Docs ride with the code commit.
- **The design gate stays closed:** 0-D approved 2026-11-02, tokens frozen in
  `docs/UI-REFERENCE.md`. Changing a frozen value re-opens the GATE.

## Current state (2026-11-02 UTC)

- **All v1 roadmap phases (`0`, `0-D`, `1`, `2`, `3`, `4`, `5` and `6`) are ✅ complete:**
  - **Phase 0** (PR #2): 495 rows · 20 topics (`Basic 84 · Core 287 · Pro 109 · 15 null`).
  - **Phase 0-D + Phase 1** (PR #3): tokens frozen; full sheet browsable signed-out, search/filters/random/weakest-topic, outbound links.
  - **Phase 2** (PR #4): Google Auth, topic-sharded Firestore progress sync + persistent local cache, explicit guest→cloud merge, rules v1, JSON backup v1.
  - **Phase 3** (PR #5): synced markdown notes + code snippets, searchable notes overview, custom lists filtering the sheet, rules v2, backup v2.
  - **Phase 4** (PR #6): daily goal + Today plan, 3/7/21-day spaced revision queue (`rc`), 8-week heatmap + streak + weekly stats, rules v3, backup v3; **14-day owner use test (`docs/RESEARCH.md` §6)** active.
  - **Phase 5** (PR #7, `3303c8a`): rotatable 128-bit invite codes, atomic reciprocal friendships, opt-in summary-only sharing, topic compare, rolling 7-day leaderboard, viewer-local group goal, rules v4.
  - **Phase 6** (PR #8, `387ae81`, + post-merge hardening on `arena/66cea8c2-dsa-archive`): installable PWA (`manifest.webmanifest`, clean-room `"DA"` monogram icons, deterministic `sw.js` precache), friendly `404` & `offline.html`, offline `getDocFromCache` cold-boot fallback, CSS `26.86 kB` (`6.30 kB` gz) + `<500 kB` JS chunks enforced by `npm run check:budgets` (`317.85 kB` gz total shell), 12 Emulator rules tests, `public/summary` write deduplication, atomic `addManyToToday` planner race fix, `hosting.predeploy` build hook, App Check & Analytics omitted, public Spark web config linked for `dsa-archive` (`.env.production` + `.firebaserc`), and deploy runbook in `docs/RELEASE-RUNBOOK.md`.
- **Live deploy is owner-executed:** run `npx firebase deploy --only firestore:rules --project dsa-archive` then `npx firebase deploy --only hosting --project dsa-archive` from your terminal or Google Cloud Shell per `docs/RELEASE-RUNBOOK.md`.

## Next-chat handoff (post-v1 maintenance / 14-day use test)

Read `rule.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`,
`docs/RELEASE-RUNBOOK.md`, and `docs/RESEARCH.md` §6, and verify branch,
`git status`, open PRs, CI runs and Git identity
(`pabi277 <chakraborttypabi2772006@gmail.com>`) first.

1. **14-day owner use test (`docs/RESEARCH.md` §6):** implement only targeted fixes or friction improvements requested by the owner on the session's assigned branch, keeping all 126+ unit tests, 12+ Emulator rules tests, 10+ Playwright specs, and `npm run check:budgets` green, then stop at the merge gate.
2. **Never handle Firebase tokens/credentials in chat or git**, and never deploy or alter `copy-web/` / repo visibility without an explicit owner command.
