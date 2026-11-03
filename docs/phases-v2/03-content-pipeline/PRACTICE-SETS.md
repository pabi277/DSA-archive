# Practice sets — more LeetCode problems, grouped by pattern

**Owner decision 2026-11-03:** *"Add more LeetCode problems."*

The catalogue has 495 rows but only **273 unique LeetCode URLs**, 206 rows with no
LeetCode mapping, and exactly one practice link each. This adds a **second, third and
fourth problem per pattern** — the "drill" that turns understanding into fluency.

---

## 1. Why (the learning argument, briefly)

One problem per concept teaches recognition once. Three problems per concept teaches
*transfer*: same pattern, different skin. That is what interviews test, and it is what
set 1 → set 7 maps measure.

## 2. Structure

```
data/practice-sets/<pattern>.json     ← one file per pattern (~30 patterns)
```

```jsonc
{
  "patternId": "two-pointers",
  "topicId": "arrays",
  "summary": "One line: when this pattern shows up.",
  "prerequisites": ["hashing"],
  "problems": [
    { "lc": 1,   "slug": "two-sum",           "title": "Two Sum",
      "level": "core",  "set": 1, "estMinutes": 15, "why": "the pattern's hello-world" },
    { "lc": 167, "slug": "two-sum-ii-input-array-is-sorted", "title": "Two Sum II",
      "level": "core",  "set": 2, "estMinutes": 15, "why": "sorted input enables pointers" },
    { "lc": 15,  "slug": "3sum",              "title": "3Sum",
      "level": "pro",   "set": 3, "estMinutes": 35, "why": "fix one, two-pointer the rest" },
    { "lc": 11,  "slug": "container-with-most-water", "title": "Container With Most Water",
      "level": "core","set": 3, "estMinutes": 25, "why": "greedy move of the shorter wall" },
    { "lc": 42,  "slug": "trapping-rain-water","title": "Trapping Rain Water",
      "level": "pro",   "set": 4, "estMinutes": 40, "why": "two pointers + running maxima" }
  ]
}
```

- **`set` 1–4** = difficulty rung inside the pattern (not the same as Basic/Core/Pro).
  A learner can stop at set 2 and still have learned the pattern.
- `why` is one line, ≤90 chars, explaining *what this problem adds* — no spoilers.
- `lc` + `slug` give a canonical `https://leetcode.com/problems/<slug>/` URL; a nightly
  `check:links` verifies it, so a renamed slug fails CI instead of dying silently.
- `estMinutes` is an estimate for the *beginner* case, used by the session planner
  (`20 min → set 1 + set 2`).

## 3. The pattern taxonomy (~30, owner-editable)

`two-pointers` · `sliding-window` · `prefix-sum` · `hashing` · `binary-search` ·
`binary-search-on-answer` · `sorting` · `stack` · `monotonic-stack` · `queue-deque` ·
`linked-list-reversal` · `fast-slow-pointers` · `heap-topk` · `intervals` · `greedy` ·
`backtracking` · `recursion-subsets` · `tree-dfs` · `tree-bfs` · `bst-invariant` ·
`trie` · `union-find` · `graph-traversal` · `topological-sort` · `shortest-path` ·
`mst` · `bit-manipulation` · `dp-1d` · `dp-knapsack` · `dp-lis` · `dp-interval` ·
`dp-on-trees` · `math-number-theory` · `strings-pattern-matching`

Each topic file (`data/content/topics/<id>.json`) lists its patterns **in learning
order**, which is what the topic page shows as chips.

## 4. Where practice sets appear

| Surface | Behaviour |
|---|---|
| Topic page → Practice tab | Toggle `Core sheet (46)` / `Drills (+38)` — drills are the extra LC problems, grouped by pattern and rung |
| Pattern drawer (from any problem) | "More like this" → the same pattern's sets 2–4, minus what you've solved |
| `#/practice` (new route) | All patterns as a grid: `two-pointers — 12 problems · 3 solved · next: 3Sum (set 3)` |
| Today / session autopilot | Only drills when the pattern's set 1 is done and no revision is due |
| Quiz tie-in | Pattern MCQ stems reference the pattern, not a specific problem |

**Progress model:** drills use the **same** `progressByTopic` shape, keyed by a synthetic
id `lc-<number>` in the topic the pattern belongs to (`s`, `b`, `o`, `fd`, `lr`, `rc`).
No new collection, no rules change, no quota change. Catalogue loader accepts
`lc-*` ids and resolves their titles/links from the practice-set files.

## 5. Volume and batching

| Batch | Content | Rows |
|---|---|---|
| 1 | 10 highest-value patterns (arrays, hashing, two-pointers, sliding-window, binary-search, stack, linked-list, trees, graphs, dp-1d) × 4 problems | 40 |
| 2 | next 10 patterns × 4 | 40 |
| 3 | remaining ~14 patterns × 3–4 | ~50 |
| 4 | "interview classics" cross-pattern sets (Blind-75 / NeetCode-150 mapping, **as a filter, not a copy**) | — |

Target: **+120–140 drill problems**, each with a verified LeetCode slug, a one-line `why`,
a level and a rung. Total distinct LeetCode problems in the app: **≈400**.

Set filters (no duplication of someone else's list): a `classic` boolean on a problem means
"appears in most interview lists" — computed by consensus across public lists by the owner,
not copied from any single list.

## 6. Validation (`tools/validate_data.py` extensions)

- `patternId` exists in the taxonomy; `topicId` exists in `problems.json`.
- `lc` is an integer 1–3000+; `slug` matches `^[a-z0-9-]+$` and the generated URL is
  unique across **all** practice sets and `problems.json`.
- Sets are contiguous per pattern (1,2,3… no gaps), `level` ∈ {basic, core, pro},
  `estMinutes` 5–120, `why` ≤90 chars.
- Every `slug` verified by `check:links` (HTTP 200 + no redirect to a different slug).
- **No duplicate**: if a drill's slug already exists on a sheet row, it is linked to that
  row (`coveredBy: <problemId>`) instead of being added twice — the 13 existing duplicates
  in `problems.json` get the same treatment in this pass.

## 7. Acceptance (part of phase 03)

1. ~30 pattern files with contiguous sets and a total ≥120 drills, all unique.
2. `#/practice` route renders pattern grid + progress; topic Practice tab toggles drills.
3. Drills show up in progress, review and Today without any schema change.
4. Validator + `check:links` green; duplicate slugs impossible by test.
5. Each drill's LeetCode URL resolves to the intended problem (spot-checked by the owner).
