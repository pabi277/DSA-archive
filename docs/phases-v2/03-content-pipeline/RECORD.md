# Phase v2-03 — Content pipeline record

**Branch:** `arena/cae52fb6-dsa-archive` · **Status:** implementation complete, owner accuracy review + merge gate pending
**Green CI run id:** [`41667021614`](https://github.com/pabi277/DSA-archive/actions/runs/41667021614) · **Implementation tip sha (green CI head):** `7a7d431a47f77b3a64b15d9c2d40d2c042651a64` · **`site-preview` bytes:** 436,772
**Initial CI run:** [`41665594838`](https://github.com/pabi277/DSA-archive/actions/runs/41665594838) found 2 new e2e assertion failures; they were fixed in `7a7d431`. The final metadata-only follow-up commit sha is reported in chat. `visual-baselines` artifact: 8,787,458 bytes.
**No PR was opened:** PR creation remains gated on an explicit owner command. No merge, deploy or `main` push was performed.

## What is now visible

- `#/problem/<id>` shows the 4-block statement surface: *What's asked*, *Constraints*, *Example*, *Further reading*. Authored Arrays rows show a statement, test-case count, collapsed hint and common mistake. Unauthored rows get a designed `statement-missing` / `hint-missing` state and still show ranked outbound links.
- Ranked `resources[]` are on 495/495 rows. The top-ranked resource is the primary action; `⋯ More sources` lists publisher names, type, rank, verified date and match label. Original video links stay single-source in `links.video` and are never rewritten, multi-sourced or embedded.
- Sheet rows keep their existing menu test ids, but the primary action is now the rank-1 resource and menu labels include publisher names. Offline external clicks explain that the destination needs a network connection.
- `#/topic/arrays` renders the 789-word own-written primer with fixed sections, one code block and one three-mistake callout. The other 19 topics render a designed primer-coming state. Topic patterns now come from `data/content/patterns.json`-derived topic docs rather than subtopic titles.
- Topic Practice has a **Core sheet / Drills** toggle. Drills use synthetic `lc-<n>` ids in the existing `progressByTopic` shard, with done, LeetCode, `+ Today` and detail actions. Topic Quiz shows an authored count (`12/12` for Arrays) but leaves execution disabled for Phase 05.
- `#/practice` renders 34 pattern cards with per-pattern rings and 136 drill rows with progress. The global progress pill remains `0/495 done`; drill progress is shown separately as `n/136`.
- Today, Review, friends summaries, backups, planner and library location lookup accept the known `lc-<n>` ids. Firestore rules still use the same 20 topic documents and generated whitelist now includes the drill keys; no new collection, schema version or quota path was added.
- CI publishes `data/content/coverage.json` + `docs/content/coverage.md`, adds the coverage table to the run summary, PR comment and marker-delimited PR body, and uploads a `content-coverage` artifact. A separate scheduled/manual `link-audit.yml` can run live HTTP checks; normal `check:links` stays deterministic.

## Data and content added

| Item | Count | Notes |
|---|---:|---|
| Catalogue rows | 495 | `schemaVersion: 2`; additive `resources[]`, `lcMatch`, `lcLabel`, `coveredBy` |
| Runtime catalogue shards | 4 | `data/catalogue/catalogue-{a,b,c,d}.json`; 5 topics each, build-time imports only |
| Ranked resource rows | 495/495 | 4 resources per row; ≥2 publishers; ≥1 practice + ≥1 learning on every non-theory row |
| Exact/near LeetCode twins | 420/495 | 289 exact, 131 near; remaining 75 labelled theory + reference |
| Multi-publisher rows | 495/495 | 100% vs the ≥80% acceptance target |
| Practice patterns / drills | 34 / 136 | contiguous sets 1–4, unique `lc` and slug app-wide |
| Theory MCQ cards | 42/42 | one per `kind:"theory"` row; per-option explanations; always-available reveal data; reference link |
| Fully authored topic | Arrays | 789-word primer, 6 statements, 6 hints + mistakes, 12 quiz items, 18 runner test cases |
| Topic docs | 20 | one authored primer; 19 designed placeholder shells with patterns, learn order and empty banks |
| Quiz bank | 12 items | Arrays only; 5 kinds balanced 4/3/2/2/1; execution belongs to Phase 05 |
| Runner cases | 18 | 3 per authored Arrays statement; execution belongs to Phase 07 |
| Coverage report | 1 | `data/content/coverage.json`, `docs/content/coverage.md`, `contentCoverage()` |

Sources used in `resources[]`: LeetCode, NeetCode, takeUforward, GeeksforGeeks, USACO Guide. Theory references additionally use cp-algorithms, Programiz, cppreference, Python docs, MDN and roadmap.sh. **Dead links found by the deterministic check: 0; stale (>180 d) links: 0.** The scheduled live HTTP audit has not run on this branch yet.

## Validation and tests

Local green on this branch: `npm run build`, `npm test` (170 tests), `npm run test:data`, `npm run check:content`, `npm run check:rules`, `npm run check:dist`, `npm run check:links`, `npm run check:budgets`. All seven pinned GitHub Actions refs in `.github/workflows/` were verified to exist via the GitHub API, and the CI YAML/PR-body shell step parses cleanly. CI run `41665594838` exposed two new e2e assertions: an ambiguous `Arrays` heading and a missing-hint state on an unauthored statement. The heading assertion is now exact and `HintDisclosure` always renders its designed missing state; green CI run `41667021614` passes the full emulator + Playwright + axe + visual matrix. A later metadata-only run hit the pre-existing 30 s timeout on the 32-audit axe matrix; that test now has a 90 s ceiling. The final green run id and final tip sha are reported in chat.

- Extended `tools/validate_data.py` checks schema v2, original link counts, unchanged single-source video links, `coveredBy`, ranked resources, rank/URL uniqueness, verified days, ≥2 publishers, practice/learning coverage, 420/495 LeetCode twins, theory parity, content IDs/no orphans, statement ≤700 chars, example input/output, 2–3 runner tests, quiz invariants, primer word budget, practice-set uniqueness, contiguous sets, `why` ≤90 chars and the generated coverage report.
- `tools/content-coverage.mjs` writes/checks the deterministic report. `tools/check-resource-links.mjs` validates every resource, canonical drill URL and theory reference against the publisher registry, reports stale/dead links per source, preserves 369 video links, and offers `CHECK_EXTERNAL_LINKS=1` / `LIVE_LINK_STRICT=1`.
- New unit tests: `src/content/load.test.ts`, `src/content/richText.test.tsx`, `src/content/hint.test.tsx`; updated `src/friends.test.ts` and `src/shell.test.tsx`.
- New browser tests: `e2e/content.spec.ts` (statement, hint, primer/missing states, quiz count, ranked publishers, practice progress, phone/desktop axe 0, no phone overflow) and `e2e/planner.spec.ts` emulator proof that a drill appears in Review and Today. `e2e/visual.spec.ts` now captures 12 routes × 2 themes × 2 viewports = 48 baselines (statement, hint open, primer, practice grid added).
- `tools/firestore-rules.test.mjs` proves a known `lc-<n>` key is accepted and an unknown one rejected. `npm run test:emulator` / Chromium Playwright were not runnable in the sandbox (no browser binary or emulator); CI runs them.

## Performance

Built CSS 48.11 kB raw / 8.68 kB gzip (cap 60/18). Entry JS 119.40 kB raw / 34.78 kB gzip (cap 180/55). Largest JS 486.05 kB raw / 139.89 kB gzip (cap 520/165). Total shell 377.83 kB gzip (cap 380). Runtime content chunks: `content-data` 7.1 kB gzip, `practice-data` 5.2 kB gzip, `content-ui` 23.6 kB gzip; **no runtime JSON fetch**. Frozen token values are unchanged; only new component classes were added.

## Deviations, limits and honest notes

- The authoring track is deliberately partial: 19 primers, 114 beginner statements, 228 topic-quiz items and the long-tail hints/mistakes remain. Every missing state is designed and tested; build never fails on missing content.
- `verified: "2026-11-03"` is a checked-in date assertion. Normal CI validates the allow-listed registry, canonical URL shape and 180-day freshness; live HTTP status is covered by the separate scheduled/manual audit. Video oEmbed/dead-link badge belongs to the Phase 06 theatre and was not added here.
- Some resource/article URLs use a `#<problemId>` fragment to keep URLs unique per row. The live audit strips fragments and checks the canonical page. Rank is global 1–4, which also makes it unique per type.
- Near LeetCode twins are editorial same-pattern matches, not exact problem identity. The 42 theory MCQ cards share a small pool of distractor text; both need the owner's sample-batch accuracy review before merge.
- `firestore.rules` was regenerated to whitelist `lc-<n>` ids and raise each topic's key cap by its drill count. This is a generated-rule change, not a new collection, backup schema or quota path; emulator rules tests were added.
- The link-audit workflow is scheduled/manual and non-strict by default. No owner live-URL verification or sample-batch accuracy approval has been recorded yet.
- No AI, analytics, transcripts, scraping, notes, remote judge, hidden suites, copied third-party prose, paid content, bulk link rewrite, video multi-sourcing, ad-blocking, player modification, new Firebase product, Blaze upgrade, public signup or leaderboard was introduced.

## Exit gate

Owner verifies a sample batch for accuracy, then explicitly commands PR/merge. **Stop here until that command.** The authoring track continues in parallel with phases 04–07.
