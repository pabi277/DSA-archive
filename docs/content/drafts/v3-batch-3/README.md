# Content batch v3-3 (4 topics) — parked pending the hybrid precache split

**Status: DRAFT — validator-green, awaiting (a) the hybrid split implementation and
(b) the owner's accuracy review. `data/content/` is unchanged from `main`.**

Authored 2026-11-06 under the recorded hybrid decision (`docs/DECISIONS.md`,
option 3 of `../v3-batch-1/DECISION-MEMO.md`). Same parking protocol as batches 1–2.

| Topic | Prose (primer + sections) | Sections / inline checks | Quiz | Statements (3 runner tests each) |
|---|---|---|---|---|
| binary-trees | 712 words | 2 / 1 | 12 | 6 |
| binary-search-trees | 673 words | 2 / 1 | 12 | 6 |
| heaps | 715 words | 2 / 1 | 12 | 6 |
| greedy-algorithms | 688 words | 2 / 1 | 12 | 6 |

With this batch staged into `data/content/`, `npm run content:coverage` +
`npm run test:data` were green on 2026-11-06 (5 primers, 30 statements, 60 quiz items
counting Arrays). Files mirror `data/content/` paths (28 files). Tree/BST statements
use a level-order input format with -1 for absent children; every expected test output
was generated and asserted programmatically during authoring (traversals, heapify,
greedy simulations), not hand-computed.

Drafts total across batches 1–3: **12 topics** — +12 primers, +72 statements,
+144 quiz items, +216 runner cases. Remaining unauthored: 7 topics
(beginner-problems, graphs, dynamic-programming, tries, strings-advanced-algo,
hashing, maths — note hashing has only 5 non-theory rows and maths 3, so those two
cannot meet the 6-statement convention without new catalogue rows).

Staging for review:

```
cp docs/content/drafts/v3-batch-3/topics/*.json    data/content/topics/
cp docs/content/drafts/v3-batch-3/problems/*.json  data/content/problems/
npm run content:coverage && npm run test:data      # must be green
```

Accuracy review happens in small owner-verified batches per the standing process —
nothing here is approved until the owner says so.


## Promoted

Promoted into `data/content/` on 2026-11-06 (v3 hybrid precache split turn),
after two owner-run accuracy-review rounds (`../REVIEW-TRIAGE.md`). The JSON
files were removed from this folder at promotion — `data/content/` is the
single source of truth; this memo stays as the batch record.
