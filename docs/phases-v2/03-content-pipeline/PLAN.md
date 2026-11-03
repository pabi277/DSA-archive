# Phase 03 — Content pipeline: statements, hints, primers, quiz bank, test cases

**Folder:** `docs/phases-v2/03-content-pipeline/`
**Estimate:** 5–7 build days + an authoring track (the real long pole) · **Depends on:** 01 (+02 for rendering) · **Blocks:** 05, 06, 07
**Why:** the app can currently tell *nothing* about a problem except its title and
links. Statements, hints, common mistakes, primers, quiz banks and test cases are what
turn a list into a course. They are **data**, not code — so they need a schema, tooling,
validation and CI before a single word is written.

---

## 1. Charter

Define, validate, load and CI-check all learner content; wire it into the topic page
from phase 02 and the problem page from phase 06. Ship the authoring pipeline (agent
drafts → owner verifies) and the "content coming" behaviour so code never blocks
content.

## 2. Current state (evidence)

| Fact | Evidence |
|---|---|
| A problem is 6 fields only | `data/problems.json` — `id, title, order, level, kind, links` |
| No statement/hint/test/quiz anywhere | `grep -ri "statement\|hint\|quiz" src data` → none |
| Existing data validator counts structure only | `tools/validate_data.py` |
| Notes markdown renderer exists but is being deleted | `markdown.ts` (removed in phase 04) |

## 3. Scope

### In
0. **Resource policy (multi-source) and practice sets** — two companion documents in this
   folder, both executed here:
   - [`RESOURCE-POLICY.md`](RESOURCE-POLICY.md): replace the single-publisher situation
     (289/289 articles from takeuforward, 453 practice links from the same host) with a
     ranked `resources[]` array per problem across an approved registry (LeetCode,
     NeetCode, cp-algorithms, USACO, GfG, Programiz, YouTube channels, cppreference).
     Every non-theory row must have ≥1 practice + ≥1 learning resource and ≥2 distinct
     sources; UI shows publisher names under `⋯ More sources`.
   - [`PRACTICE-SETS.md`](PRACTICE-SETS.md): ~34 patterns × 3–4 rungs, **+120–140 extra
     LeetCode problems** in `data/practice-sets/*.json`, `#/practice` route, drills toggle
     on the topic Practice tab, `lc-<n>` synthetic ids so progress needs no schema change.
1. **Schema (v1) for content**, one JSON file per topic and per problem
   (`data/content/...`, see §5). Every field optional except `problemId` so content can
   land incrementally.
2. **Loader** (`src/content/load.ts`): static imports of the JSON (build-time, no fetch),
   shape-sanitised at load (never trust JSON), exposing:
   `getStatement(id)`, `getHint(id)`, `getPrimer(topicId)`, `getQuiz(topicId)`,
   `getTests(id)`, `contentCoverage()`.
3. **Problem statement rendering** — 4 fixed blocks: *What's asked* (1–3 sentences,
   ours) · *Constraints* (bullets) · *Example* (input → output → why, monospace) ·
   *Further reading* (the existing Practice/Article/Video/LeetCode links).
   Never copied text: paraphrased behaviour only (`rule.md` clean-room law).
4. **Hint + common mistake** — collapsed `<details>` under the statement; one line each;
   opening a hint is *logged in local state only* (no attempt history, no telemetry).
5. **Primer rendering** (phase 02 surface): fixed section set, ≤900 words, headings,
   bullets, inline code, one code block, one callout ("3 mistakes"). A ~150-line safe
   renderer replaces the deleted `markdown.ts` concepts: escape first, whitelist
   constructs, no raw HTML, no external images.
6. **Theory-as-MCQ schema** (execution + UI in phase 05, data here): the 42 `kind:"theory"`
   rows become MCQ cards with 4 options, per-option explanations, a `reveal` solution
   (always available per the owner's rule) and a reference link. Coding rows never carry
   MCQs; theory rows never carry coding tests. See
   [`../05-quiz-engine/THEORY-MCQ.md`](../05-quiz-engine/THEORY-MCQ.md).
7. **Quiz bank schema + authoring** (execution in phase 05): 5 kinds —
   `pattern` (recognise), `dryrun` (what does this print), `complexity`, `bug` (spot the
   mistake), `edge` (edge case). 12 items per topic, 4 options each, each option carries
   an explanation; `answerIndex`, optional `codeSnippet` (monospace block).
7. **Test-case schema for the local runner** (used in 07): 2–3 `{input, expected, note}`
   per beginner problem, plain text I/O.
8. **Validation** (`tools/validate_data.py` extension + a Node check):
   - ids exist in `problems.json`, no orphans;
   - quiz: exactly 4 options, `answerIndex` in range, ≤240 chars/option, explanation
     present, ≥12 items/topic where the bank exists, kinds balanced;
   - statements: ≤700 chars, example includes input+output;
   - tests: ≤6 cases, ≤2 KB per case, no tabs beyond the first line;
- resources: allow-listed `source`, unique URL per row, ≥1 practice + ≥1 learning source,
  `verified` ISO day, `rank` unique per type;
- practice sets: contiguous `set` numbers per pattern, unique `lc/slug` app-wide (duplicates
  link to `coveredBy` instead of duplicating), `why` ≤90 chars;
- theory parity: every `kind:"theory"` row has exactly one MCQ, and vice versa;
   - coverage report printed and stored for the UI (`contentCoverage()`).
9. **CI**: `npm run test:data` extended; a coverage summary in the PR body; build fails
   on schema breaks, not on missing content.
10. **Authoring workflow** documented (owner-facing): draft in the agent chat → owner
    verifies accuracy → JSON lands. Includes a per-topic checklist and an "approve" line
    in the phase record.

### Out
Quiz UI/engine (05) · player (06) · runner (07) · pattern tagging of individual problems
(topic-level patterns only) · copying any third-party prose.

## 4. Design spec (how content appears)

```
Problem page (phase 06 shell, statement block shipped here)
┌───────────────────────────────────────────────────────────────┐
│ Two Sum                              Pro · Arrays · #LC 1    │
│ What's asked   Find two indices that add to target…           │
│ Constraints    · 2 ≤ n ≤ 10⁴   · values can be negative      │
│ Example        in  nums=[2,7,11,15], target=9                 │
│                out [0,1]   (why: 2+7=9)                       │
│ ▸ Hint        ▸ Common mistake                                │
│ Further reading  ↗ Solve · Article · Video                    │
└───────────────────────────────────────────────────────────────┘
```
Primer: 600–900 words, max 3 headings per section, one code block ≤20 lines, callout for
mistakes. Quiz item: stem + 4 options (radio group) + explanation revealed after submit.

## 5. File plan

```
NEW  data/content/patterns.json               20 topics × ~3 pattern labels
NEW  data/content/topics/<topicId>.json       { primer, sections, quiz[], learnOrder[] }
NEW  data/content/problems/<problemId>.json   { statement, hint, mistake, tests[] }
NEW  src/content/types.ts                     TS types mirroring the schema
NEW  src/content/load.ts                      static import + sanitise + coverage
NEW  src/content/statement.tsx                the 4-block renderer
NEW  src/content/richText.tsx                 safe ~150-line renderer (replaces markdown.ts role)
NEW  src/content/hint.tsx                     collapsed hint + mistake
NEW  src/content/*.test.ts                    sanitise, render-escape, coverage maths
EDIT tools/validate_data.py                   content schema checks + coverage output
NEW  tools/content-coverage.mjs               prints coverage JSON for CI + PR body
EDIT .github/workflows/ci.yml                 run content validation, upload coverage
EDIT src/topics/topicPage.tsx                 primer view uses real data
NEW  docs/content/AUTHORING.md                workflow, checklist, word budgets
```

## 6. Data model (schema)

```jsonc
// data/content/problems/<problemId>.json
{
  "problemId": "two-sum",
  "statement": "Given a list of numbers and a target…",       // ≤700 chars
  "constraints": ["2 ≤ n ≤ 10⁴", "values may be negative"],
  "example": { "input": "nums=[2,7,11,15], target=9",
               "output": "[0,1]", "why": "2 + 7 = 9" },
  "hint": "What do you need to remember about numbers you've already seen?",
  "mistake": "Checking pairs twice — think about a lookup instead.",
  "tests": [ { "input": "4\n2 7 11 15\n9\n", "expected": "0 1", "note": "sample" } ]
}

// data/content/topics/<topicId>.json
{
  "topicId": "arrays",
  "patterns": ["two-pointers", "prefix-sum", "sliding-window"],
  "learnOrder": ["two-sum", "best-time-to-buy-and-sell-stock"],
  "primer": {
    "intro": "…", "whenToUse": ["…"], "mentalModel": "…",
    "mistakes": ["…", "…", "…"],
    "example": { "title": "…", "code": "…", "explain": "…" }
  },
  "quiz": [ { "id": "arrays-q1", "kind": "pattern",
              "prompt": "Which pattern fits…", "codeSnippet": null,
              "options": [ {"text": "…", "explain": "…"}, … 4 items ],
              "answerIndex": 1 } ]
}
```
Generation rules: `learnOrder` may be partial (rest appended by phase 02's ordering);
quiz ids are `topicId-qN`; no HTML in any field (renderers escape); code fields are
plain text with `\n`.

## 7. Content volumes (the authoring track)

| Batch | Volume | Priority |
|---|---|---|
| Topic primers | 20 × 600–900 words | P0 — beginner entry |
| Beginner statements | 120 (6 per topic, lowest-level rows) | P0 |
| Hints + common mistakes | 495 + 495 (1 line each) | P0 for beginners, P1 rest |
| Quiz bank | 240 items (12 × 20) | P0 |
| Runner test cases | 2–3 per beginner problem (~300) | P1 (phase 07) |
| Theory MCQs | 42 | **P0** (replaces checkbox-only rows) |
| Drill practice sets | ~34 patterns × 3–4 = 120–140 | **P0** for the first 10 patterns, P1 rest |
| Remaining statements | ~375 | P2 |
| Topic patterns | 20 × 3 | P0 |

Splitting P0/P1/P2 lets the product ship a complete beginner path before the long tail.

## 8. Accessibility & performance
- Rich text uses semantic elements (`h2/h3/p/ul/ol/pre/code`) — no heading-level skips
  (the v1 axe lesson: note previews used styled paragraphs to avoid h3 skips).
- Code blocks: `overflow-x:auto`, `tabindex="0"`, `aria-label="code sample"`.
- Statement blocks are visible without JS-driven expansion (SSR-free but in-DOM).
- Content adds **zero** runtime fetch: JSON is imported at build, so it stays offline and
  inside the app-shell budget (measured in 09; content gzip target ≤60 kB for P0).

## 9. Tests
| Kind | What |
|---|---|
| Unit | sanitise tolerates garbage · escaping (no `<script>` survives) · 4-option + answerIndex invariants · coverage maths |
| Data | `npm run test:data` green with the extended schema; 495 integrity unchanged |
| Playwright | statement renders 4 blocks · hint expands · primer renders + "coming" fallback · quiz count shown |
| Visual | statement block, primer, hint open — 2 viewports × 2 themes |

## 10. Risks
| Risk | Mitigation |
|---|---|
| Authoring volume is underestimated | Split P0/P1/P2; every screen tolerates absence; coverage report visible in CI |
| Clean-room drift (accidentally paraphrasing too closely) | Authoring checklist: no verbatim sentences, no copied examples; owner verifies each batch |
| Schema churn after 05/07 | Freeze v1 now; additive fields only later |
| JSON bloat | Per-file split + gzip budget + P0-only initial bundle |

## 11. Acceptance
`resources[]` live on ≥80 % of rows with ≥2 distinct publishers · LeetCode coverage
≥420/495 (exact or near) with the rest labelled theory · ~120 drills in
`data/practice-sets/` with unique slugs and `#/practice` rendering · 42 theory MCQs
authored with parity enforced · schema + loader + renderers shipped · extended validator green in CI · coverage report
printed · at least one fully authored topic (primer + 6 statements + 12 quiz items +
hints) renders end-to-end · every missing-content state designed and tested · no
third-party prose in the repo.

## 12. Exit
Owner verifies a sample batch for accuracy, merges, and the authoring track continues in
parallel with phases 04–07.
