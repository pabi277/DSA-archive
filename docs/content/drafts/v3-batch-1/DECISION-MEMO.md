# Decision memo — content batch v3-1 (4 topics) vs the 393,000 B shell cap

**Status: DECIDED 2026-11-06 — the owner chose option 3 (hybrid): primers/sections/quiz stay precached, per-problem statements move to a lazy runtime-cached chunk (recorded in `docs/DECISIONS.md`). The batch stays parked here until that split is implemented; accuracy review is a separate owner gate. `data/content/` is unchanged from `main`. See also `../v3-batch-2/` for the second parked batch.**

Written 2026-11-06 while the owner was offline. No gate was crossed: the batch was authored,
validated, **measured**, then moved here and the live tree restored.

## What this batch is

Four fully authored learn-track topics, written to the `tools/validate_data.py` contract and
passing `npm run test:data` + `npm run content:coverage` when staged into `data/content/`:

| Topic | Primer | Sections / inline checks | Quiz | Statements (3 runner tests each) |
|---|---|---|---|---|
| sorting | 794 words | 2 / 1 | 12 | 6 |
| binary-search | 762 words | 2 / 1 | 12 | 6 |
| linked-list | 754 words | 2 / 1 | 12 | 6 |
| bit-manipulation | 782 words | 2 / 1 | 12 | 6 |

Coverage if merged: primers 1→5 of 20 · statements 6→30 of 120 · quiz 12→60 of 240 ·
runner cases 18→90. Files mirror `data/content/` paths under this folder:
`topics/<topicId>.json`, `problems/<problemId>.json` (28 files).

## The measured problem

`data/content/**` is imported at build time (`virtual:dsa-content`, vite.config.ts) and lands in
the **catalogue chunk, which the service worker precaches** — i.e. every byte of authored
content is shell weight.

Clean builds (`rm -rf dist && npm run build && npm run check:budgets`), 2026-11-06:

| | Shell gz | Cap | Headroom |
|---|---|---|---|
| main (`72beb24`, arrays only) | 392,739 B | 393,000 B | **+261 B** |
| main + this batch | **416,210 B** | 393,000 B | **−23,210 B — check:budgets FAILS** |

- Batch cost: **+23,471 B gz ≈ 5.9 kB gz per authored topic.**
- All other budgets stay green (entry JS 36,977 B gz, CSS, fonts, lazy chunks).
- Catalogue chunk: 65.5 → ~66.2 kB gz (sample build); content-ui and the rest unchanged.

Extrapolation: all 20 topics at this density ≈ **+118 kB gz** over today's baseline →
shell ≈ 510 kB gz. The cap exists for the ~360 MB Spark cold-install budget
(check:budgets prints the installs/day figure; 416 kB still shows ~864/day).

## Options (owner decision — this is a recorded-gate change either way)

1. **Re-baseline the cap** (e.g. 393,000 → 420,000 B now, or ~515,000 B for full coverage).
   One-line change + a DECISIONS.md entry. Simplest; cost is cold-install bandwidth.
2. **Stop precaching content**: split `virtual:dsa-content` out of the catalogue chunk into a
   lazy, runtime-cached chunk (same pattern as runner/account UI). Keeps the shell flat
   forever but is a vite.config + swBuckets change and learn pages lose offline-on-first-visit.
3. **Hybrid**: precache primers+quiz (small) and lazy-load statements, or precache only
   started topics. Most code; best UX/size balance.
4. **Hold content** until a decision; batch stays parked here (current state).

## How to stage the batch for review/merge

```
cp docs/content/drafts/v3-batch-1/topics/*.json    data/content/topics/
cp docs/content/drafts/v3-batch-1/problems/*.json  data/content/problems/
npm run content:coverage && npm run test:data      # must be green
rm -rf dist && npm run build && npm run check:budgets   # fails until the cap decision
```

Accuracy review: per standing process, owner verifies each topic in small batches before any
batch is called approved. Inline-check references were pulled from each row's existing
`resources[]` in `data/problems.json` (allow-listed sources, `verified` ≤ 2026-11-03), so
`test:data` date checks pass without new link audits.
