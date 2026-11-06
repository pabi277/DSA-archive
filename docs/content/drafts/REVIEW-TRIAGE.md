# Accuracy-review triage log

Running record of independent review rounds against the parked draft batches,
and what was done about each finding. Fix commits land on
`arena/996c8efe-dsa-archive`.

## Round 1 — 2026-11-06 (five reviewer chats)

| Batch | Review outcome | Status |
| --- | --- | --- |
| 1 | Reviewed from origin branch. 11 blockers / 7 minors reported; all verified and **fixed** (see below). 72/72 tests + 24/24 examples byte-exact per reviewer. | fixed, needs re-review pass only if owner wants one |
| 2 | Reviewed from origin branch. 1 blocker / 4 minors reported; all verified and **fixed**. 72 tests + brute-force cross-checks all passed per reviewer. | fixed |
| 3 | **NOT REVIEWED** — reviewer's branch lacked `docs/content/drafts/`, fell back to reviewing live arrays content. | re-run with updated prompt |
| 4 | **NOT REVIEWED** — same failure mode as batch 3. | re-run with updated prompt |
| 5 | Reviewed from origin branch. 3 blockers / 7 minors reported; all verified and **fixed**. 56/56 executions byte-exact per reviewer. | fixed |

All reported defects were independently re-verified here (snippets executed,
traces recomputed) before fixing; every reported item was confirmed real.

### Fixes applied (commit on this branch)

Batch 1: binary-search q1 stem (added the logarithmic-time requirement so the
linear-scan distractor is genuinely wrong), q2/q8 distractor explains (false
two-pointer generalisation; wrong cube-root/square-root scales);
bit-manipulation whenToUse range (0..2^n−1), q7 "13 turns" explain, q10 OR
explain; linked-list middle-trace reveal rewritten (turn three does run),
merge stem (added single-pass requirement), delete-after stem (it crashes on
tails, it never drops extra nodes); sorting intro qualifier, q4 swap-count
explain (missing negation), q6 selection-sort trace corrected to the true
three swaps, bubble explain; four problem `mistake` fields rewritten
(odd-check, count-occurrences fence, set-bits loop count, selection-sort
stale-index).

Batch 2: recursion q11 snippet gained `if (n === 1) return x` so the buggy
`fast(2,3)` really returns 4 as the stem claims (verified by execution);
recursion q3 stem tightened ("prunes as it places"); sliding-window q10 stem
restated to the true claim (invariant broken, output coincidentally safe);
two primer.practice overclaims corrected (fixed-width window exception;
"four of the six" → depth counter in two).

Batch 5: sum-of-array-elements statement + mistake rewritten (max total is
exactly 1e9, inside 32 bits — overflow claim was false); beginner-problems
"million times slower" → thirty thousand, palindrome stem scoped to positive
numbers, reverse trace 0,0,2,21 (two places), queue → stack of digits; maths
"4 exceeds 13" → "4 squared exceeds 13", sieve-bug stem/fix now account for
0 and 1 surviving; hashing q1 frequency-map distractor replaced with a
genuinely wrong one (prefix-sum array).

### Systemic fix

Two reviewers noted every `answerIndex` was 0 (correct answer always listed
first; the quiz engine shuffles item order but not option order). All 19
draft topics now have deterministically permuted options (hash of item id),
distribution 66/68/55/58 across the four positions, quiz + section checks.
Live arrays content still has answerIndex 0 everywhere — see deferred items.

### Deferred items (live content — do NOT fix in a content turn)

These were reported by the two off-target reviews of the LIVE arrays content
and verified real, but fixing them touches precached/stamped files. Handle
them in the hybrid-split engineering turn (owner-gated):

1. `data/problems.json`: `linear-search` rank-1 resource URL points to
   LeetCode `reorganize-string` (unrelated). Fixing it changes a
   screenshot-stamp input and the link baseline — coordinate both.
2. Arrays problem statements don't state the exact stdin layout (n on line 1,
   values on line 2…). The drafts all do. Adding sentences now would bust the
   frozen 393,000 B precache cap (261 B headroom); after the split moves
   statements out of precache this is free.
3. `data/content/topics/arrays.json`: two quiz stems with arguably-valid
   distractors, one explain that misdescribes a sorted copy, and the
   `cp-algorithms.com/#arrays-bounds` check reference (fragment URL looks
   bogus; egress blocked from sandbox, verify by hand). Same budget caveat.
4. Option order for arrays quiz (answerIndex all 0) — either permute data or
   add option-shuffling to the quiz engine during the split turn.

## Round 2 — 2026-11-06 (batches 3 and 4, with the updated prompt)

Both reviewers successfully fetched the drafts from this branch this time.
Every claim was independently re-verified here before acting; this round had
reviewer errors, so several claims were **rejected with evidence**.

| Batch | Reported | Confirmed + fixed | Rejected |
| --- | --- | --- | --- |
| 3 | 0 blockers, 1 minor + 2 out-of-scope | 2 (check reference repointed; `违反` mojibake — the round-0 fix never reached the packaged copy) | 0 |
| 4 | 5 blockers, 8 minors | 4 real (1 blocker-class: grid 64-bit constraint; lps bug stem; 2^50 overclaim; 2 polish items) + README relabel | 5 |

### Fixes applied

- **batch 3 / heaps**: `quiz` option explain `"to违反."` → `"to violate."`
  (CJK scan now clean); section check reference repointed from the
  build-heap row to `check-if-an-array-represents-a-min-heap` — the row
  actually about array-index structure.
- **batch 4 / grid-unique-paths**: constraints said `m, n ≤ 100` AND "fits in
  64 bits" — false together (C(198,99) is 194 bits). Capped at `m, n ≤ 34`
  (C(66,33) ≈ 7.22e18 < 2^63, verified).
- **batch 4 / strings-advanced-algo**: lps bug stem now quotes the output the
  snippet actually produces (`0 1 0 1 2 0 0`, verified by execution); vague
  edge-case distractor explain rewritten.
- **batch 4 / dynamic-programming**: "near 2 to the 50 nodes" → "tens of
  billions of calls" (true count ≈ 4×10^10 ≈ 2^35).
- **batch 4 / graphs**: primer example explain now notes the grid is numeric
  rows (the runner problems feed character strings).
- **READMEs (batches 3/4/5)**: word-count column relabelled "prose
  (primer + sections)" — the numbers always included section text.

### Rejected claims (batch 4) — do not re-fix

1. *Stock dryrun explains inconsistent*: false — prices `7 1 5 3 6 4` map to
   days 1–6; "day 5's price 6" and "selling at 7 happens before the 1" are
   both correct readings. Reviewer misparsed prices vs day numbers.
2. *Trie search snippet throws TypeError*: false — `if (!node) return false`
   runs in the same iteration as the assignment, before any further
   dereference. Executed `search('xyz')`/`search('cxyz')`: returns false, no
   throw.
3. *reverse-every-word has no internal-spaces test*: false — the messy test
   is `"  hello   world  "`, which contains an internal triple space.
4. *count-and-say needs big integers*: false — terms are built and printed
   as strings; no arithmetic on them anywhere.
5. *graphs "V squared always" partly right*: the stem pins the adjacency-list
   representation, under which V+E is the only correct bill.

### Added to deferred live-content list

5. `data/problems.json` junk rank-1 practice URLs confirmed beyond
   linear-search: `n-meetings-in-one-room` → LC sum-of-two-integers,
   `build-heap-from-a-given-array` → LC add-digits, `heapify-algorithm` →
   LC factorial-trailing-zeroes. Same coordinated fix as item 1 (screenshot
   stamp + link baseline).

## Resolution — 2026-11-06 (hybrid precache split turn)

The owner closed the review gate ("no re-review needed") and ordered the
hybrid precache split. In that turn:

- **All 19 draft topics / 110 problems were promoted** into `data/content/`;
  the JSON copies were removed from the per-batch draft folders (each batch
  README records the promotion).
- **All 5 deferred live-content items were fixed**:
  1. `linear-search` rank-1 near drill → LC `richest-customer-wealth`
     (a pure linear-scan maximum drill).
  2. The six original arrays statements now open by naming the exact stdin
     layout, matching the draft convention (free post-split: statements left
     the precached shell).
  3. `arrays.json`: q2/q3 stems gained the missing efficiency/order criterion
     that made distractors arguably valid; the sorted-copy explain now states
     the real failure (cost + lost scan order); the bogus
     `cp-algorithms.com/#arrays-bounds` reference → the real MDN `Array` page.
  4. Arrays quiz options deterministically permuted (sha-256 of item id);
     answerIndex distribution now 2/2/2/6 across positions instead of all 0.
  5. Junk rank-1 LC URLs replaced: `n-meetings-in-one-room` →
     `non-overlapping-intervals`, `build-heap-from-a-given-array` →
     `kth-largest-element-in-an-array`, `heapify-algorithm` →
     `last-stone-weight`. Catalogue shards regenerated.

Nothing from the two review rounds remains open.
