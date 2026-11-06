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

## Still open

- Batches 3 and 4: re-run reviewer chats with the updated REVIEW-PROMPT.md
  (it now tells the reviewer how to fetch the drafts from this branch).
- Owner may optionally re-run batches 1/2/5 after the fixes for a clean pass.
