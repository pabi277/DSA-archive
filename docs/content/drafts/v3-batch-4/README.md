# Learn-content drafts — batch 4 (v3)

Fourth batch of Learn-tab content, authored 2026-11-06. Parked here (not in
`data/content/`) per the hybrid-precache decision in
`docs/content/drafts/v3-batch-1/DECISION-MEMO.md`: the precache budget is frozen
at 393,000 B until the catalogue/content split ships, so drafts wait in docs/.

## What's in this batch

| Topic | Prose words (primer + sections) | Sections (checks) | Quiz | Problems (learnOrder) |
| --- | --- | --- | --- | --- |
| `graphs` | 704 | The visited array (`graphs-check-visited`) · Waves and colours | 12 | number-of-provinces, number-of-islands, flood-fill-algorithm, rotten-oranges, detect-a-cycle-in-an-undirected-graph, bipartite-graph |
| `dynamic-programming` | 717 | Name the state (`dynamic-programming-check-state`) · Pick or skip | 12 | climbing-stairs, frog-jump, maximum-sum-of-non-adjacent-elements, house-robber, grid-unique-paths, best-time-to-buy-and-sell-stock |
| `tries` | 725 | One node per prefix (`tries-check-nodes`) · The bitwise trie | 12 | trie-implementation-and-operations, trie-implementation-and-advanced-operations, longest-word-with-all-prefixes, number-of-distinct-substrings-in-a-string, maximum-xor-of-two-numbers-in-an-array, maximum-xor-with-an-element-from-an-array |
| `strings-advanced-algo` | 715 | The border array (`strings-advanced-check-border`) · Hashes and windows | 12 | reverse-every-word-in-a-string, count-and-say, kmp-algorithm-or-lps-array, z-function, rabin-karp-algorithm, longest-happy-prefix |

Each topic: 1 primer (600–900 words, worked example ≤20 lines), 2 sections
(one with an inline check wired to a verified reference), 12-item quiz
(4 pattern · 3 dryrun · 2 complexity · 2 bug · 1 edge). Each problem file:
statement, 2–4 constraints, worked example, hint, mistake, 3 runner tests
(stdin/stdout, expected without trailing newline). All expected outputs were
computed and asserted by script before writing (BFS/DP simulations, trie
simulations, lps/z/count-and-say/Rabin-Karp/max-XOR helpers).

Notable conventions in this batch:
- `house-robber` is stated as the **circular** variant (two linear runs).
- `z-function` uses the `z[0] = 0` convention; `rabin-karp-algorithm` prints
  `-1` when the pattern is absent; `longest-word-with-all-prefixes` prints
  `none` when no word qualifies.

## How to stage for review

From the repo root:

```bash
cp docs/content/drafts/v3-batch-4/topics/*.json data/content/topics/
cp docs/content/drafts/v3-batch-4/problems/*.json data/content/problems/
npm run content:coverage
npm run test:data
```

With only this batch staged on top of the committed arrays content, the
expected coverage line is: **5 primer · 30 statements · 60 quiz items ·
42/42 theory MCQs** (validated green on 2026-11-06). Unstage with
`git checkout -- data/content/ docs/content/coverage.md` and
`git clean -fdq data/content/problems/`.

## Cumulative draft status

Batches 1–4 together hold **16 topics / 96 problem files**: sorting,
binary-search, linked-list, bit-manipulation (batch 1); strings-basic-and-medium,
recursion, stack-queues, sliding-window-2-pointer (batch 2); binary-trees,
binary-search-trees, heaps, greedy-algorithms (batch 3); graphs,
dynamic-programming, tries, strings-advanced-algo (batch 4). Promoting all of
them adds +16 primers, +96 statements, +192 quiz items, +288 runner tests on
top of the live arrays content.

Remaining unauthored topics: **beginner-problems** (fully authorable), plus
**hashing** (5 non-theory rows) and **maths** (3 non-theory rows) — those two
cannot satisfy the 6-problem learnOrder convention and need an owner decision
(shorter learnOrder, merged topic, or skip).

Accuracy review by the owner is a separate gate per batch before promotion.


## Promoted

Promoted into `data/content/` on 2026-11-06 (v3 hybrid precache split turn),
after two owner-run accuracy-review rounds (`../REVIEW-TRIAGE.md`). The JSON
files were removed from this folder at promotion — `data/content/` is the
single source of truth; this memo stays as the batch record.
