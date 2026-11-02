# Phase 0 — Bootstrap + data extraction

- Date: 2026-11-02
- Status: 🚧 implementation is in place; awaiting GitHub CI's browser checks and the owner’s content spot-check before moving to Phase 0-D.
- Scope: roadmap Phase 0 only (0.1–0.3). No product features, Firebase project, or deployment.

## Delivered

### 0.1 — Licence and hygiene

- Added the owner-selected MIT `LICENSE` for original project work. It does not license `copy-web/` or third-party content.
- Added `.gitignore`, pinned npm dependencies and lockfile. Confirmed the existing copied tree remains under `copy-web/`; no files moved or deleted.
- Local git identity was set to and verified as `pabi277 <chakraborttypabi2772006@gmail.com>` before the phase commit.

### 0.2 — One-time clean-room data extraction

- `tools/extract_problems.py` reads the copied snapshot only as a one-time source, emits factual topic/subtopic/problem titles, level labels, and outbound links, and is not imported by the site (`tools/extract_problems.py:1-8`, `:130-213`). The app imports only the resulting `data/problems.json` (`src/catalogue.ts:1-19`).
- Output: 495 rows in 20 topics; per-topic counts, in order: 83, 7, 32, 6, 32, 7, 22, 49, 14, 14, 13, 31, 32, 15, 20, 46, 53, 7, 9, 3. Permanent assertions live in `tools/validate_data.py:17-76`.
- Reconciliation against `docs/RESEARCH.md` §1:
  - Level badges in the rendered row markup total **480**: Basic 84, Core 287, Pro 109. **15 catalogue rows have no level badge** and are stored as `null`, rather than inferred. The earlier planning badge tally 85/288/110 is not reproducible from this snapshot; the new extractor and validator are the repeatable evidence.
  - Link counts (rows / unique): practice 453/453; articles 289/286; LeetCode 289/273.
  - The copied markup represents video actions as buttons, so URLs were associated from the corresponding embedded item record by numeric row key (extractor lines 130-175). Result: 369 video links / 321 unique (256 `youtu.be` + 65 `youtube.com`). The 65 full-host URLs were not included in the earlier `youtu.be`-only count.
- `generatedFrom` explicitly does not claim an owner review. The owner’s 10-row comparison against the live sheet remains pending and is the content-accuracy check; no explanations or solutions were authored.

### 0.3 — Minimal site and CI scaffold

- Added Vite + React + TypeScript, Tailwind CSS + daisyUI and a minimal, intentionally unstyled hello-sheet displaying **“495 problems · 20 topics”** and the 20 topic counts (`src/main.tsx:7-43`). No design tokens or feature UI were frozen; Phase 0-D approval is still a hard prerequisite for real UI work.
- `firebase.json` contains only Auth/Firestore Emulator Suite endpoints. There is no Firebase SDK, project alias, Hosting config, live project, credential, or rules deployment. No emulator rules tests apply in this bootstrap-only phase.
- CI (`.github/workflows/ci.yml`) runs catalogue validation, unit tests, production build, dist cleanliness, built-asset link checks, Chromium phone/desktop screenshots and axe accessibility scans; it packages the built `dist/` as the `site-preview` artifact.
- The build output is three files and contains no copied-site assets. `tools/check-dist.mjs` checks that invariant.

## Reuse scan (checked 2026-11-02)

- **STUDY:** `copy-web/index.html` only for hierarchy, labels, badges and outbound URLs; no copied markup, CSS, scripts, fonts, logos, images or learning prose is shipped.
- **BUILD:** the extractor, JSON catalogue, validator, hello-sheet and CI checks are original project code.
- **DEPEND:** React/React DOM 19.3.1 (MIT), Vite 8.3.5 + React plugin 6.2.1 (MIT), TypeScript 7.0.2 (Apache-2.0), Tailwind CSS/Vite plugin 4.3.3 (MIT), daisyUI 5.7.50 (MIT); test-only Vitest 5.0.5/jsdom 30.1.3 (MIT), Playwright 1.64.1 (Apache-2.0), axe Playwright 4.14.0 (MPL-2.0). Exact versions are in `package.json`/`package-lock.json`; licence values were checked in installed package metadata. No icon library is added because this increment has no icon need.
- **ADAPT:** none.
- **REJECT / defer:** copied-site code/assets/content; Firebase client SDK and any live project setup (not needed in Phase 0); Lucide in this increment (revisit for Phase 1 row actions).

## Verification

Local checks completed:

- `npm run test:data` — PASS (495 rows, 20 topics, counts and allowed outbound hosts).
- `npm test` — PASS (2 unit tests).
- `npm run build` — PASS (Vite production build).
- `npm run check:dist` — PASS (three built files, no copied-site paths/assets).
- `npm run check:links` — PASS (both built HTML asset references resolve).
- `git diff --check` — PASS.
- Browser install / Playwright could not run in the sandbox because the browser download host is outside the configured network allowlist. The GitHub workflow installs Chromium on its runner and remains the CI acceptance check; its run and artifact are to be recorded after push.

Preview content: one minimal page with the summary line “495 problems · 20 topics”, then 20 topic names with row counts. It contains no sign-in, progress, notes or planner UI.

## Gate / next

No PR, merge, deployment, Hosting channel, Firebase project, rules deploy, or visibility change was performed. Repo visibility remains the owner’s open setting in `docs/DECISIONS.md`.

Do not start Phase 1. The next phase is **0-D — Design prototype + tokens freeze**. Owner approval in chat must be recorded in `docs/UI-REFERENCE.md` before real UI work; the owner’s catalogue spot-check should also be completed. Phase 0 remains in progress until the GitHub CI run (including phone/desktop screenshots and accessibility) is green and its `site-preview` artifact is available.
