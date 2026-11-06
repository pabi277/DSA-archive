# Content batch v3-2 (4 topics) — parked pending the hybrid precache split

**Status: DRAFT — validator-green, awaiting (a) the hybrid split implementation and
(b) the owner's accuracy review. `data/content/` is unchanged from `main`.**

Authored 2026-11-06, after the owner chose **option 3 (hybrid)** from
`../v3-batch-1/DECISION-MEMO.md`: primers/sections/quiz stay precached, per-problem
statements move to a lazy, runtime-cached chunk. Until that split lands in
`vite.config.ts`/`swBuckets`, any content added to `data/content/` still blows the
frozen 393,000 B shell cap, so this batch parks here exactly like batch 1.

| Topic | Primer | Sections / inline checks | Quiz | Statements (3 runner tests each) |
|---|---|---|---|---|
| strings-basic-and-medium | 664 words | 2 / 1 | 12 | 6 |
| recursion | 723 words | 2 / 1 | 12 | 6 |
| stack-queues | 695 words | 2 / 1 | 12 | 6 |
| sliding-window-2-pointer | 679 words | 2 / 1 | 12 | 6 |

With this batch staged into `data/content/`, `npm run content:coverage` +
`npm run test:data` were green on 2026-11-06 (5 primers, 30 statements, 60 quiz items
counting Arrays). Files mirror `data/content/` paths (28 files). Inline-check
references come from each row's existing verified `resources[]` in `data/problems.json`.

Combined with batch 1, the drafts now cover 8 of the 19 unauthored topics:
+8 primers, +48 statements, +96 quiz items, +144 runner cases.

Staging for review (either batch, or both):

```
cp docs/content/drafts/v3-batch-2/topics/*.json    data/content/topics/
cp docs/content/drafts/v3-batch-2/problems/*.json  data/content/problems/
npm run content:coverage && npm run test:data      # must be green
```

Accuracy review happens in small owner-verified batches per the standing process —
nothing here is approved until the owner says so.


## Promoted

Promoted into `data/content/` on 2026-11-06 (v3 hybrid precache split turn),
after two owner-run accuracy-review rounds (`../REVIEW-TRIAGE.md`). The JSON
files were removed from this folder at promotion — `data/content/` is the
single source of truth; this memo stays as the batch record.
