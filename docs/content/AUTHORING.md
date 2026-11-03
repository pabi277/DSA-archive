# Learner-content authoring workflow

**Status:** Phase 03 code and one complete sample topic are shipped; the owner sample-batch accuracy review is pending. Do not claim a batch is approved until the owner says so in chat.

## The workflow

1. **Agent drafts in small batches** — 6 statements or 1 primer at a time. All prose, examples, distractors and explanations are our own writing. No copied third-party prose, paid content, scraped text or copied examples.
2. **Owner verifies accuracy** — checks the problem behaviour, constraints, example I/O, hint, common mistake, quiz answer/explanations and LeetCode slug. The owner's approval line is recorded in the phase `RECORD.md` before merge.
3. **JSON lands** — one file per topic or problem under `data/content/`. Missing files are expected: every screen has a designed empty state and CI fails only on schema breaks, never on missing content.
4. **Regenerate the report** — `npm run content:coverage` refreshes `data/content/coverage.json` and `docs/content/coverage.md`; `npm run test:data` and `npm run check:content` must stay green.

## Authoring checklist per topic

- [ ] `data/content/topics/<topicId>.json` has 3 pattern labels, a partial `learnOrder`, a primer or `null`, ≤3 optional sections, and either an empty or complete quiz bank.
- [ ] Primer is 600–900 words, has intro, 3–5 *when to use* bullets, a mental model, exactly 3 mistakes, one ≤20-line code block with an explanation, and a practice closing paragraph.
- [ ] Quiz bank, when present, has **12** items: `pattern` 4, `dryrun` 3, `complexity` 2, `bug` 2, `edge` 1. Exactly 4 options, `answerIndex` 0–3, every option has an explanation, ≤240 chars per option. No "all of the above" and no negative wording except `bug`.
- [ ] Six beginner statements per topic are the P0 target. Each `data/content/problems/<problemId>.json` has a ≤700-char statement, 2–4 constraints, example with input/output/why, one-line hint, one-line common mistake and 2–3 runner cases.
- [ ] Runner cases are plain text: ≤6 cases, ≤2 KB per input/expected, no tabs beyond the first line. They are data for Phase 07, not an executable judge here.
- [ ] Theory rows get exactly one 4-option MCQ card with per-option explanations, an always-available reveal solution and an allow-listed reference link. Coding rows never get MCQs; theory rows never get runner tests.
- [ ] No raw HTML, external images, tracker, script or `javascript:` URL in any field. `src/content/richText.tsx` escapes first and whitelists semantic elements.

## Current coverage (2026-11-03)

| Track | Landed | Target |
|---|---:|---:|
| Topic primers | 1 | 20 |
| Beginner statements | 6 | 120 |
| Hints + common mistakes | 6 | 495 + 495 |
| Quiz items | 12 | 240 |
| Theory MCQs | 42 | 42 |
| Runner test cases | 18 | ~300 |
| Pattern drill files | 34 | ~34 |

The deterministic report is [`coverage.md`](coverage.md). `contentCoverage()` exposes the same sanitised JSON in the app.

## Reproducible tools

- `python3 tools/seed_content_phase3.py` — idempotent generator for resource policy, practice sets, theory cards, topic shells, runtime catalogue shards and duplicate-slug `coveredBy` links. It preserves the authored Arrays topic.
- `python3 tools/author_arrays_phase3.py` — the first fully authored topic: primer, 6 statements and 12 quiz items. Original prose only.
- `python3 tools/phase3_drill_candidates.py` — curated drill candidate pool used by the seeder.
- `npm run content:coverage` — writes the coverage report.
- `npm run test:data` — validates schema, IDs, resources, practice sets, theory parity and coverage.
- `npm run check:links` — deterministic publisher/URL/date integrity; `CHECK_EXTERNAL_LINKS=1 LIVE_LINK_STRICT=1 npm run check:links` performs a strict live HTTP audit.

## Hard limits

No AI-generated dumps, no copying from LeetCode/GfG/takeUforward articles, no transcripts, no paid sources, no bulk video rewrites, no multi-sourcing of the single-source video links, no raw HTML/images, and no new runtime fetch. Content JSON is imported at build time so it stays offline.
