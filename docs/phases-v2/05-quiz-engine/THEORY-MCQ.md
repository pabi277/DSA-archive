# Tasks & theory MCQs — practice only where practice is warranted

**Owner decision 2026-11-03:** *"don't jam the full learning into question–answer — add
a task where you think a question will be good, not everywhere — and only coding
questions; theory shows up as MCQs whose solution can be revealed."*

This document defines the **task** concept, the **placement rule** (where a check is
earned, where it is noise), and the **theory-as-MCQ** rule with its hard cap.

---

## 1. Three content objects, never confused

| Object | Question | Stored where | Appearance |
|---|---|---|---|
| **Coding task** | "solve it" — runs against authored tests (phase 07) | `problems.json` row + `tests[]` | problem page (primary) |
| **Theory MCQ** | "do you know this?" — 4 options, answer + explanation revealable | `data/content/topics/<id>.json → theory[]` | topic page + `#/theory` |
| **Drill** | "recognise it again" — an extra LeetCode problem for the same pattern | `data/practice-sets/*.json` | Practice tab / `#/practice` |

There is **no** free-text quiz, no "explain in your own words" grading, no long-answer
anything. Nothing needs an LLM to grade.

## 2. The placement rule (the important part)

Every problem gets **exactly one** primary action, chosen by its kind:

```
problem row → [↗ Solve]  (coding task: run, tests, verdict-by-you)
theory row  → [Check]    (MCQ: answer → reveal explanation)
```

A check is added **only** when all three are true:

1. **Something is actually checkable** — there is a fact, a trap or an output to verify.
2. **The learner has just met it** — it follows a primer section, a video stamp or a
   solved problem. Checks never precede the material.
3. **It changes behaviour** — getting it wrong points at a specific thing to re-read
   (`→ re-read "prefix sum" in the Arrays primer`), not a score.

Never added:
- A check on every row (no quiz spam).
- A check where the "answer" is a matter of taste.
- A check that duplicates a drill problem.
- A check that only tests memory of a title/name.

**Budget:** ≤3 checks per topic beside the primaries (the 12-item topic quiz), and ≤1
inline check per primer section. If a topic needs more, it needs a better primer.

## 3. Theory-as-MCQ (what replaces theory rows)

42 rows are `kind: "theory"` today (23 in Beginner Problems, 6 in Linked List, 2 in Graphs,
1 each in 9 other topics). They cannot be "solved", so the sheet currently just shows a
checkbox — the weakest part of the product.

They become **full MCQ cards**:

```jsonc
// data/content/topics/<topicId>.json → theory[]
{
  "id": "hashing-collision",
  "topicId": "hashing",
  "title": "Hash collisions",
  "resource": { "source": "cp-algorithms", "url": "…", "label": "Hash tables" },
  "question": "Two different keys land in the same bucket. What happens in a typical
               hash map?",
  "options": [
    { "text": "The older key is overwritten", "explain": "Only if you insert the same key." },
    { "text": "Both are stored in a bucket list / probed slot", "explain": "Correct — collision resolution keeps both." },
    { "text": "The map throws an error", "explain": "Java/C++ maps don't throw on collision." },
    { "text": "The map resizes immediately", "explain": "Resize is triggered by load factor, not a collision." }
  ],
  "answerIndex": 1,
  "reveal": "Collisions are normal. Maps store colliding entries in chains or open
             addressing; lookup degrades from O(1) toward O(n) only when too many keys pile up."
}
```

Rules:
- **4 options, exactly one correct**, every option has an `explain` ≤120 chars (so the
  learner learns from the wrong ones too).
- `reveal` is the solution explanation (≤400 chars) — **always available**, even before
  answering, behind `Show solution`. The owner's rule: *"theory questions asked will be
  MCQ that solution can be seen."*
- Answering is not gated by solving the theory row first; the MCQ *is* the row's action.
- Passing behaviour: answering correctly marks the row **done** with outcome `clean`;
  a wrong answer leaves it `todo` and offers `Try again` / `Show solution` →
  `Mark as read` (an honest escape hatch, logged as `o: "hint"`).
- A theory row with an MCQ stores **no new Firestore data** — it uses the normal progress
  entry. The answer chosen is kept in local state only (no attempt history, per the
  dropped-expensive-ideas decision).

## 4. Coverage of the 42 theory rows

| Topic | Theory rows | MCQ plan |
|---|---|---|
| Beginner Problems | 23 | 23 MCQs (programming basics: variables, loops, complexity vocabulary, flowcharts, dry-runs) |
| Linked List | 6 | 6 (node vs array trade-offs, dummy nodes, memory layout) |
| Graphs | 2 | 2 (adjacency list vs matrix, visited semantics) |
| 10 other topics | 1 each | 1 each (the concept row that precedes the problems) |
| **Total** | **42** | **42 theory MCQs + 12-item topic quizzes** |

Plus **reference links** from the multi-source policy (`cppreference`, USACO Guide,
cp-algorithms, Programiz) so "theory" is never a dead end.

## 5. Where the pieces live in the UI

```
#/topic/hashing
[ Learn ] [ Practice ] [ Quiz ]
Learn     primer sections, each ending with ≤1 inline MCQ ("Check: …") that reveals
          its explanation and the source link.
Practice  coding rows only (with drills toggle). Theory rows appear here too but with
          a [Check] action instead of [Solve] — one line, no modal.
Quiz      the 12-item topic quiz (pattern/dryrun/complexity/bug/edge).
```
No modal chains: the MCQ expands inline under the row (accordion), 4 radio options,
`Show solution` always visible in the footer.

## 6. Validation (`tools/validate_data.py`)

- Every `theory[]` entry: 4 options, `answerIndex` 0–3, all `explain` present,
  `reveal` ≤400 chars, `resource.source` in the allow-list, unique `id`.
- **Parity test:** every row in `problems.json` with `kind:"theory"` has exactly one MCQ in
  its topic file (no orphans either way).
- Placement budget test: ≤3 inline checks per primer, ≤1 per section.
- No `kind:"theory"` row may have a `tests[]` array; no `kind:"problem"` row may have an
  MCQ. Coding questions are coding; theory is MCQ — never mixed.

## 7. Acceptance

1. All 42 theory rows render as MCQ cards with a revealable solution and a source link.
2. Every coding row has `[Solve]` and no quiz; every theory row has `[Check]`.
3. Inline checks appear at most once per primer section, and each wrong answer points to
   the exact section to re-read.
4. Validator enforces parity + placement + option rules; CI green.
5. A learner can go Learn → inline check → Practice → topic quiz without ever seeing two
   question types in the same row.
