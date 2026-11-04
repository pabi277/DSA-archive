# Phase v2-05 — Quiz engine & theory MCQs record

**Branch:** `arena/6327674f-dsa-archive` (cut from `main` at `f4fa993`, after Phases 01–04 merged) · **Status:** implemented locally; stopped at owner PR / merge gate
**CI run id / `site-preview` bytes / `visual-baselines` bytes:** _pending owner command to open PR (sandbox has no Java or Chromium binaries; all local gates below are green)_
**PR gate:** NOT opened yet — awaiting the owner's explicit command per `rule.md` §3. No merge, deploy or `main` push was performed.

## What is now visible

- **42 theory rows are concept-check MCQ cards, never coding tests.** Across `#/topic/<id>?tab=practice`, `#/search`, and `#/problem/<id>`, `kind: "theory"` rows carry `[Check]` (expanding an inline `TheoryMcqCard` accordion with `aria-expanded`) instead of `[Solve]` or code actions; coding rows never show a quiz card. Each card renders 4 radio options (`role="radiogroup"` with roving arrow-key `tabIndex`), per-option explanations after submit, an always-visible `Show solution` toggle (worked walkthrough + verified publisher reference link + offline notice), wrong-answer retry + deep link (`#/topic/<id>?tab=learn&section=<sectionId>`) to the primer section to re-read, correct-answer auto-completion with outcome `clean`, and `Show solution → Mark as read` recording outcome `hint` (with `u` / toast undo).
- **Primer sections carry bounded inline quick checks (`≤1` per section, `≤3` per topic).** `data/content/topics/arrays.json` now ships 3 authored inline checks (`arrays-check-indexing`, `arrays-check-two-pointer`, `arrays-check-bounds`), one beneath each of the 3 Arrays primer sections (`read-the-shape`, `choose-one-scan`, `check-the-boundaries`). `tools/validate_data.py` enforces `≤1` check per section, `≤3` per topic, valid `rereadSectionId`, and publisher allowlist membership; `tools/check-resource-links.mjs` audits inline-check reference URLs alongside catalogue and theory-MCQ links. Inline checks are pure formative self-checks and never write to `localStorage` or Firestore.
- **`#/quiz` is a real screen.** Lists all 20 curriculum topics with live status tags (`Quiz ✓ 12/12`, `Best X/12`, `Not taken`, or `Coming soon` + `Open theory checks` when theory MCQs exist), plus a single primary *Start a 4-minute check* CTA targeting the weakest incomplete available topic (`pickWeakestQuizTopic`: unpassed first, fewest attempts, lowest score ratio, curriculum order tie-break). Command palette (`⌘K`) includes *Start a 4-minute quiz check* (`Action` group).
- **`#/quiz/<topicId>` runs the 12-question topic check offline and keyboard-first.** Deterministic Mulberry32 shuffle seeded by `topicId` + `?seed=<n>` so retakes reshuffle reproducibly; sticky progress rail on desktop (`1 / 12`, progress bar, 12 step dots) collapsing cleanly above the card on phone (`≥44 px` option targets, zero horizontal scroll); keys `1–4` pick an option, `Enter` submits then advances, `Back` works before submitting a question (locked once submitted per `PLAN.md` §3.2), `Exit` returns to the topic without saving partial runs. Short banks (`0 < N < 12`) run what exists, scale the `≥80%` pass mark (`ceil(0.8 * N)`), and display an explicit `bank incomplete` tag; empty banks (`0` items) render an honest *Coming soon — 12-item bank in authoring* state.
- **Result breakdown + targeted primer re-read links.** `ResultScreen` shows the score ring + denominator (`X / 12 correct (pass mark 10/12)`), `Passed` / `Almost` / `Try again` tag, per-kind accuracy strip (`Pattern`, `Dry run`, `Complexity`, `Spot the bug`, `Edge case`), up to 3 missed questions initially (expandable to all missed) with tap-to-compare wrong vs right explanations and `→ Re-read “<section>”` links that focus and scroll `#primer-section-<id>`, plus `Retake` (`r` shortcut, increments `?seed=`) and `Back to topic`.
- **Guest storage, explicit merge-on-sign-in, Firestore sync, and topic badges.** Signed-out runs save to `dsa-archive.quiz.v1`. Signing in with guest quiz scores surfaces an explicit *Merge guest quiz scores?* banner (*Merge quiz scores* / *Keep separate* / *Discard guest scores*) — nothing writes to Firestore until chosen. Merging keeps `max(bestScore)`, sums `attempts` (capped at `999`), keeps the newer `lastScore`, and sets `passed: local.passed || remote.passed || bestScore/bestTotal >= 0.8`. `#/topics` tiles and `#/topic/<id>?tab=quiz` reflect live quiz pass/best state.

## Data, rules and backup changes

| Surface | Change |
|---|---|
| Content | `data/content/topics/arrays.json` authored with 3 `PrimerSection`s + 3 inline checks (`check` per section, `789` primer words). `tools/validate_data.py` + `tools/check-resource-links.mjs` validate inline checks and enforce the `THEORY-MCQ.md` placement budget (`≤1`/section, `≤3`/topic). |
| Firestore | `users/{uid}/quizResults/{topicId}` = `{bestScore, bestTotal, attempts, lastScore, lastAt, passed}`; `topicId` in the 20-topic generated whitelist, `1 <= bestTotal <= 12`, `0 <= bestScore <= bestTotal`, `0 <= lastScore <= bestTotal`, `1 <= attempts <= 999`, `passed is bool`, `lastAt == request.time()`. One doc per topic; optimistic cache writes sync on reconnect. |
| Rules | Generated **v7** (`tools/generate-firestore-rules.mjs`, never hand-edited): adds `isKnownQuizTopic`, `validQuizResult`, and owner-only `match /quizResults/{topicId}` (`get, list, delete` for owner; `create, update` gated by `validQuizResult`). All Phase 04 v6 rules (`profile`, `progressByTopic` + `lc-<n>`, `snippets`, `lists`, `plans`, `friends`, `public/summary`, `/notes/` default-deny) preserved. |
| Backup | Writer **v5 → v6** (`quizResults[]` sorted by `topicId`); reader accepts **1–6**. Schemas 1–5 import cleanly with `quizResults: []` (pre-v6 files claiming `quizResults` are refused rather than guessed). Invalid topic ids, out-of-range scores/totals/attempts, non-boolean `passed`, or duplicate `topicId`s are refused. Settings import preview and completion notice include quiz counts. |
| Client & build | New `src/quiz/` (`engine.ts`, `results.ts`, `mcqCard.tsx`, `quizHome.tsx`, `quizScreen.tsx`, `resultScreen.tsx`); router `OPTIONAL_SEGMENT_PARAM` (`#/quiz` and `#/quiz/<topicId>`); `PrimerView`, `ProblemRow`, `TopicPage`, `TopicsScreen`, `SheetScreen`, `ProblemScreen`, `CommandPalette`, `accountData.ts`, and `App.tsx` wired. `vite.config.ts` packs `virtual:dsa-catalogue` (URL prefix + `$` slug back-reference + publisher label table, proven deep-equal to `data/problems.json` in `src/catalogue.test.ts`) and `virtual:dsa-content` (including all 42 `TheoryMcq`s and `PrimerSection` checks) plus splits `@firebase/auth` core from `@firebase/firestore`. |

## Validation and tests

All local gates are green on `arena/6327674f-dsa-archive`:
- `npm run test:data` — 495 rows / 20 topics, 42/42 theory MCQs, 12 Arrays quiz items, 3 Arrays inline checks within placement budget, 136 drills.
- `npm run check:content` — coverage report current.
- `npm run check:rules` — `firestore.rules` matches `tools/generate-firestore-rules.mjs`.
- `npm run build` — `tsc -b && vite build` clean (`0` errors, 21 files).
- `npm run check:dist` — 21 files, zero `copy-web/` paths or assets.
- `npm run check:links` — 16 built-page asset links + 2,161 outbound resource references (`1,157` unique URLs, `0` stale, 369 single-source video links untouched).
- `npm run check:budgets` — all caps green (metrics below).
- `npm test` — **193 tests across 22 files** passing (`engine.test.ts`, `results.test.ts`, `quiz.test.tsx`, updated `backup.test.ts`, `router.test.ts`, `load.test.ts`, `catalogue.test.ts`, `shell.test.tsx`).
- `npx playwright test --list` — **94 tests across 12 files** parsed cleanly (`e2e/quiz.spec.ts` added; `topics.spec.ts`, `content.spec.ts`, `helpers.ts`, `visual.spec.ts`, and `schemaVersion: 6` assertions in `code/library/planner/sync.spec.ts` updated).
- **Rules (CI emulator):** `tools/firestore-rules.test.mjs` grows from 15 to **18 tests** — owner valid `quizResults` write/read, invalid `bestScore > bestTotal` / `bestTotal > 12` / `attempts > 999` / unknown topic rejection, and stranger read/write denial.

## Performance & bundle budgets

Phase 04 left `35 B` of shell gzip headroom (`379,965 B / 380,000 B`), while Phase 05 needed to ship the quiz engine, UI screens, styles, 3 inline checks, and all 42 `data/content/theory/*.json` MCQ payloads in the offline bundle. Lossless build-time table-packing of `virtual:dsa-catalogue` (URL prefix dictionary, `$` problem-slug back-references, deduplicated publisher-label table) and `firebase-auth` / `firebase-firestore` chunk alignment recovered `~10.2 kB` gzip without dropping a single field or raising any cap:

- **CSS:** `53.72 kB` raw / `9.43 kB` gzip (cap `60 / 18 kB`)
- **Entry JS:** `111.56 kB` raw / `32.04 kB` gzip (cap `180 / 55 kB`)
- **Largest JS (`firebase-firestore`):** `457.70 kB` raw / `129.86 kB` gzip (cap `520 / 165 kB`)
- **Total precached shell:** **`375.96 kB` (`375,964 B`) gzip** against the frozen `380,000 B` cap (**`4,036 B` headroom** — `4,001 B` smaller than `main` before Phase 05)
- **Runtime fonts:** `57.50 kB` raw (cap `60 kB`, separate non-precached bucket)
- Frozen token values in `src/design/tokens.css` are untouched (`0` bytes changed).

## Deviations, limits and honest notes

- **Emulator + browser verification in CI:** Java and Playwright Chromium are unavailable in this sandbox (same constraint as Phases 03–04). All pure logic, jsdom component/shell flows, lossless catalogue unpacking, rules generation, link audits, and production bundle budgets are proven locally; the 18 Emulator rules tests, 3 new `e2e/quiz.spec.ts` flows, axe-core audits, and **64 visual baselines** (`16 routes × 2 viewports × 2 themes`, adding `quiz-home` and `quiz-runner`) execute in GitHub Actions CI once the owner commands opening the PR.
- **Inline cards avoid competing primary CTAs:** `TheoryMcqCard` and `InlineCheckCard` use secondary/ghost buttons (`Button` default `secondary` / `ghost`) so embedding them inside `PrimerView`, `TopicPage`, `SheetScreen`, or `ProblemScreen` preserves the design-system rule of at most one `variant="primary"` button per view.
- **Content scope:** Arrays has the full 12-item topic quiz + 3 primer inline checks; all 42 `kind: "theory"` rows across the sheet have live `TheoryMcq` cards; the remaining 19 topic quiz banks render honest `Coming soon` states until authored on the parallel content track.
- No timers, leaderboards, anti-cheat, AI, analytics, transcripts, YouTube player modifications, remote code execution, new npm dependencies, or Blaze/non-whitelisted Firebase services were introduced.

## Exit gate

Owner reviews `arena/6327674f-dsa-archive` and this record, then explicitly commands opening the PR so GitHub Actions CI runs the 18 Emulator rules tests, 94 Playwright + axe checks, and 64 visual baselines. **Stopped here before any PR, merge, `main` push, or deploy.**
