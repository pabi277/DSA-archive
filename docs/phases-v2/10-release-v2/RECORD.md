# Phase v2-10 — Release v2: docs, runbook, screenshots, deploy gate — RECORD

**Branch:** `arena/9b4d2ec7-dsa-archive` (cut from `main` at `4f3bb94`, the merge of PR #21)
**Contract:** [`PLAN.md`](PLAN.md) · **Status:** implemented; stopped at the owner's PR/merge gate
**CI:** run id recorded in the final report to the owner (this record rides in the phase
commit; the sha CI validates is the tip of this branch at push time)
**Rules / backup:** **v9 / v8** — unchanged by this phase. No Firestore shape, rule or
backup version was touched; `npm run check:rules` confirms `firestore.rules` is current
for all 20 topics.
**Deployed:** nothing. No PR, no merge, no `main` push, no tag, no Hosting command, no
live Firebase command. Deploying is the owner's decision after walking
[`docs/RELEASE-RUNBOOK.md`](../../RELEASE-RUNBOOK.md); that decision and its date go into
`docs/DECISIONS.md` (PLAN §6).

---

## 1. What is now visible

| Where | What a reader/learner sees |
|---|---|
| `README.md` | The v2 story: the seven surfaces (Today · Topics · Problem/theatre · Code · Review · Quizzes · Insights), the hero screenshot (Today with reason chips), honest limits (compiler pack sizes, offline behaviour, three runnable languages), the **deliberately absent** list (notes, transcripts, ad-blocking, AI, remote judge, analytics), the content-coverage truth table and the "Delete my data" privacy contract |
| `docs/screenshots/` | **16 committed PNGs** — 8 phone (390×844), 6 desktop (1440×900), plus `phone-today-light` and `desktop-topics-light` as the two light-theme references of the *same* seeded record — with a generated `README.md` manifest and a `capture.json` freshness stamp (sha-256 of `src/**`, `index.html`, `data/problems.json`, `public/manifest.webmanifest`; mocked clock `2026-11-05T09:30:00Z`; per-file byte sizes). 4.7 MB total |
| `docs/CHANGELOG.md` | **v2.0.0** written for a user, grouped by surface, plus the v1 history table and the budgets at release |
| `docs/DATA-MODEL.md` | **v6** — a release audit, not a shape change: the v5 shapes re-stated, the Spark quota table re-measured against the release build (~916 cold installs/day inside 360 MB/day), backup v8 import path (schemas 1–8), deletion contract cross-referenced |
| `docs/RELEASE-RUNBOOK.md` | Rewritten for the shipped versions: rules **v9 before** hosting, 13 copy-pasteable verification rows (open `/`, `#/topics`, one problem, one quiz, one run, offline reload, delete-account round trip…), rollback, and the emergency lock-down rules |
| `public/og-image.png` + `index.html` | A generated 1200×630 social card (8,011 B) with OG/Twitter meta; sharing a link no longer renders as a bare URL |
| `#/problem/<id>` statement | Two paper cuts fixed: the `3 local test cases` pill is no longer squeezed by its sentence (the evidence row got its own flex block), and the sentence reads for a learner ("…run against the local runner") instead of the build log ("Bundled for the Phase 07 runner") |
| `#/today` on a phone | The keyboard-shortcut hint in the footer no longer wraps into an orphaned button |
| Theme toggle while a sync lands | **A real defect fixed:** a cloud profile snapshot could silently revert a theme the learner had just changed. `src/settings.ts` now stamps every local settings write with a version counter and `src/accountData.ts` refuses to apply a stale snapshot over newer local intent |

## 2. New verification gates

- `npm run check:docs` (`tools/check-docs.mjs`) — one version story across README,
  CHANGELOG, DATA-MODEL, RELEASE-RUNBOOK, ROADMAP and `prompt.md`: the shipped
  rules/backup/schema versions (v9 / v8 / DATA-MODEL v6) may not be contradicted by any
  claim line; every `docs/phases-v2/*` folder must carry a `RECORD.md`; "Phase NN" never
  appears in learner-facing copy. History lines (changelogs, records) are exempt by
  construction.
- `npm run check:screenshots` (`tools/screenshots.mjs --check`) — the 16-image set is
  complete, every image is listed in the manifest, and the sha-256 source stamp in
  `capture.json` matches the current `src/**`, `index.html`, catalogue and manifest.
  **Freshness is hash-based, not mtime-based** — a git checkout cannot fake it, and any
  UI/source change after the last capture fails CI until `npm run screenshots` is re-run.
- `npm run og:image` (`tools/generate-og-image.mjs`) — deterministic PNG from Node
  `zlib` only (no new dependency, complete 5×7 glyph set, text-width assertions).
- `npm run check:release` = `check:docs && check:screenshots && check:budgets &&
  check:hardening`.
- CI (`.github/workflows/ci.yml`) adds three steps: `check:release`, an OG
  byte-identity check (`git diff --exit-code -- public/og-image.png` after regeneration —
  a diff means the card was edited by hand), and a `docs-screenshots` artifact so the
  owner can review the committed set from the run page.

## 3. How the screenshots are made (honest provenance)

`tools/screenshots.mjs` drives real Chromium (Playwright) against a production build
served by `vite preview`, signed into the **Auth emulator** with a Firestore-emulator
record seeded through the app's own IndexedDB/profile path — the same stack the e2e
suite uses. The clock is mocked to `2026-11-05T09:30:00Z` so due dates, momentum and
"today" are reproducible. The two `-light` images are taken by pressing the app's own
theme toggle, not by injecting CSS. Images are committed (PLAN §2.2: "committed to
`docs/screenshots/` with stable filenames"); CI verifies the set rather than
regenerating it, because a seeded-emulator capture is a local, owner-reviewed step.
`desktop-problem` is a plain viewport shot of the page top: at desktop width a full-page
capture paints the sticky command bar and sidebar mid-document (browser artifact of
full-page compositing), which would be a dishonest image.

## 4. Defect found by this phase's own tooling

The light-theme captures intermittently came out dark. Probes against cold boots
measured the race (3/6 and 2/4 reverts, both themes): `applyProfileSnapshot()` could
arrive *after* the learner toggled the theme and stomp the local value with the older
cloud copy. Fix: `localSettingsVersion()` in `src/settings.ts` increments on every local
settings write; `settingsChangedHere()` in `src/accountData.ts` compares the counter
captured when the snapshot was requested against the counter at apply time and keeps the
local value if it moved. Pinned by **15 unit tests** in `src/settings.test.ts`. A
timing-based Playwright spec (`e2e/preferences.spec.ts`) was written first, measured to
be flaky **by construction** (the race window is sub-frame and scheduler-dependent), and
deleted in favour of the deterministic unit pin — recorded in `docs/DECISIONS.md`.

## 5. Budgets at release — no re-baseline

Measured on a clean `rm -rf dist && npm run build`:

| Bucket | Measured | Cap | Headroom |
|---|---|---|---|
| **App shell (gzip, 18 precached URLs)** | **392,739 B** | **393,000 B** (owner-frozen, phase v2-08) | **261 B — any further growth is a GATE** |
| CSS | 60,523 B raw / 10,364 B gz | 61,000 / 18,000 | 477 B raw |
| Entry JS | 128,007 B raw / 36,981 B gz | 180,000 / 55,000 | 18,019 B gz |
| Largest chunk (Firestore SDK) | 457,704 B raw / 129,864 B gz | 520,000 / 165,000 | — |
| Fonts | 57,496 B raw | 60,000 | separate bucket, never precached |
| Runner UI add-on | 27,698 B raw / 10,201 B gz | 120,000 / 40,000 | lazy, never precached |
| Account/delete add-on | 2,759 B raw / 1,318 B gz | 40,000 / 15,000 | lazy, never precached |
| Toolchains | 1.3 MB worker + 42.5 MB packs | 48 MB | opt-in per language |

The 603 B of shell growth over phase 09 is the two statement/footer CSS fixes and the
learner-facing copy — not the release assets: `og-image.png` (8,011 B) ships in `dist/`
but is **excluded from the shell bucket and from the SW precache** (`NOT_SHELL` in
`tools/build-sw.mjs`, `isNotShell` in `tools/check-budgets.mjs`) because nothing in the
app requests it at runtime. SW v2 hash at this tree: `16cc25aa09f7`.

## 6. Tests

- **366 unit tests in 42 files** (`npx vitest run`) — +6 over phase 09: the settings
  version-counter pins and `src/swBuckets.test.ts` (the SW's add-on/not-shell bucket
  contract, parsed from the generator source because `tsc -b` cannot type-check named
  imports from an `.mjs` tool).
- **147 Playwright tests in 21 files** — `e2e/content.spec.ts` additionally asserts the
  statement evidence line reads for a learner and contains no phase number.
- Green in this tree: `npm test` · `npm run build` (clean) · `check:dist` ·
  `check:links` · `check:budgets` · `check:hardening` · `test:data` · `check:content` ·
  `check:rules` · `check:docs` · `check:screenshots`.

## 7. Deviations from PLAN (recorded, not hidden)

1. **16 images, not 14** — the plan's "8 phone + 6 desktop" is shipped exactly, plus the
   two light-theme references the plan's "dark and light" sentence implies. Counted
   honestly as 16.
2. **DATA-MODEL is v6, not v5** — the plan predates phase 09, which already shipped v5;
   a release audit over an already-correct v5 is a new numbered section, not a rewrite.
3. **`docs/UI-REFERENCE.md`** got a corrected v2 supersession note (screenshots, v2-10
   fixes) rather than a full inventory rewrite — the v2 inventory was already written in
   phase 09 and re-writing it would have created a second source of truth.
4. **The backup round trip** (export → wipe → import) was already a phase-09 e2e
   (`account-deletion.spec.ts` + sync suite); this phase did not duplicate it.
5. **Two UI fixes rode a docs phase** (statement evidence row, Today footer hint, theme
   revert). All three were found *by* the release work (screenshots and copy audit),
   fixed at root cause, and re-captured in the same tree — the alternative was shipping
   screenshots of known defects.

## 8. Content coverage at release (truth table)

Generated `docs/content/coverage.md` is current (2026-11-03): **1/20 primers ·
6/120 beginner statements · 6/495 hints + mistakes · 12/240 topic-quiz items ·
42/42 theory MCQs · 136 drills (120 min) · 18 runner test cases**. The README links this
table instead of implying completeness; every empty surface renders its designed
"content coming" state. Authoring continues as the post-v2 track
(`docs/content/AUTHORING.md`).
