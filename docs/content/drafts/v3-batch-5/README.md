# Learn-content drafts — batch 5 (v3) — catalogue complete

Fifth and final authoring batch, 2026-11-06. Parked here (not in
`data/content/`) per the hybrid-precache decision in
`docs/content/drafts/v3-batch-1/DECISION-MEMO.md`.

**This batch completes the draft catalogue: all 19 non-live topics are now
authored.** Together with the live `arrays` content, every one of the 20 Learn
topics has a primer, sections, quiz and problem statements.

## What's in this batch

| Topic | Prose words (primer + sections) | Sections (checks) | Quiz | learnOrder |
| --- | --- | --- | --- | --- |
| `beginner-problems` | 746 | The digit loop (`beginner-check-digit-loop`) · Pairs, halves and remainders | 12 | count-all-digits-of-a-number, reverse-a-number, palindrome-number, check-for-prime-number, gcd-of-two-numbers, sum-of-array-elements |
| `hashing` | 739 | Prefix sums meet maps (`hashing-check-prefix`) · Sets that spot starts | 12 | longest-consecutive-sequence-in-an-array, longest-subarray-with-sum-k, largest-subarray-with-sum-0, count-subarrays-with-given-sum, count-subarrays-with-given-xor-k |
| `maths` | 744 | The sieve (`maths-check-sieve`) · Divide it out | 12 | print-all-primes-till-n, prime-factorisation-of-a-number, count-primes-in-range-l-to-r |

### Decision taken in this batch (owner delegated)

Earlier batches used a 6-problem learnOrder by convention. `hashing` has only
5 non-theory rows and `maths` only 3, and the data contract
(`tools/validate_data.py`) only requires that learnOrder entries exist and
belong to the topic — so rather than deferring these two topics indefinitely,
they ship with **complete learnOrders of 5 and 3** covering every non-theory
row they have. `beginner-problems` has many rows; its learnOrder picks a
6-problem arc (digit loop → reversal → palindrome → primality → gcd →
array accumulator) that matches the primer's teaching line.

Batch totals: 3 primers, 36 quiz items, 14 problem statements, 42 runner
tests. All expected outputs were computed and asserted by script before
writing (digit/gcd/prime helpers, prefix-sum/XOR counting, sieve and
factorisation).

## How to stage for review

From the repo root:

```bash
cp docs/content/drafts/v3-batch-5/topics/*.json data/content/topics/
cp docs/content/drafts/v3-batch-5/problems/*.json data/content/problems/
npm run content:coverage
npm run test:data
```

With only this batch staged on top of the committed arrays content, the
expected coverage line is: **4 primer · 20 statements · 48 quiz items ·
42/42 theory MCQs** (validated green on 2026-11-06). Unstage with
`git checkout -- data/content/ docs/content/coverage.md` and
`git clean -fdq data/content/problems/`.

## Cumulative draft status — FINAL

Batches 1–5 hold **19 topics / 110 problem files**:

- batch 1: sorting, binary-search, linked-list, bit-manipulation
- batch 2: strings-basic-and-medium, recursion, stack-queues, sliding-window-2-pointer
- batch 3: binary-trees, binary-search-trees, heaps, greedy-algorithms
- batch 4: graphs, dynamic-programming, tries, strings-advanced-algo
- batch 5: beginner-problems, hashing, maths

Promoting everything adds **+19 primers, +110 statements, +228 quiz items,
+330 runner tests** on top of the live arrays content — a complete Learn tab.

Nothing remains to author. The two outstanding gates before promotion:

1. **Hybrid precache split** (engineering): primers/sections/quiz stay
   precached, per-problem statements become a lazy runtime-cached chunk
   (`vite.config.ts` + SW buckets). Decision recorded in `docs/DECISIONS.md`.
2. **Owner accuracy review**, batch by batch.


## Promoted

Promoted into `data/content/` on 2026-11-06 (v3 hybrid precache split turn),
after two owner-run accuracy-review rounds (`../REVIEW-TRIAGE.md`). The JSON
files were removed from this folder at promotion — `data/content/` is the
single source of truth; this memo stays as the batch record.
