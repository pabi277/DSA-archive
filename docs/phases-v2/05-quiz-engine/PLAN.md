# Phase 05 — Quiz engine (check your understanding)

**Folder:** `docs/phases-v2/05-quiz-engine/`
**Estimate:** 5–6 days · **Depends on:** 02 (topic tabs) + 03 (bank schema) · **Blocks:** 08 (a light session item)
**Why:** the app can't distinguish "watched the video" from "understands". A 4-minute
quiz is the cheapest, most beginner-appropriate proof of understanding.

---

## 1. Charter

Run the phase-03 quiz banks: a clean one-question-at-a-time runner, instant explanations,
pass/fail at 80%, per-topic results stored in Firestore (best score only), offline-capable,
and honest about missing content. No timers, no leaderboards, no anti-cheat.

## 2. Current state
No quiz code exists (`grep -ri quiz src` → none). Phase 02 ships a disabled Quiz tab;
phase 03 ships the data schema and validator.

## 3. Scope

### In
1. **`#/quiz`** — quiz home: 20 topics with `Quiz ✓ 11/12` / `Not taken` / `Coming soon`,
   a "Start a 4-minute check" primary action (weakest topic first, simple heuristic:
   lowest take-count or lowest score).
2. **`#/quiz/<topicId>`** — runner:
   - 12 questions, fixed order (deterministic shuffle by seed for re-takes);
   - **one question per screen** on phone, one card per question on desktop with a
     sticky progress rail (`3 / 12`), keyboard `1-4` to select, `Enter` next;
   - selection is instant, but **submitting reveals the explanation** (correct + why the
     others are wrong, one line each);
   - no going back after submit (button "Back" allowed only before submit → simpler
     state machine, less anxiety);
   - `Exit` always available; partial progress is **not** saved (a quiz is 4 minutes).
3. **Scoring**: 12 questions × 1 point; pass = ≥10 (80%). Result screen: score, per-kind
   breakdown (`pattern 3/4 · complexity 2/2 …`), the three questions you missed with
   links to their primer sections, and two actions: `Retake` / `Back to topic`.
4. **Persistence** (`users/{uid}/quizResults/{topicId}`):
   ```
   { bestScore: 0-12, bestTotal: 12, attempts: number ≤ 999,
     lastScore, lastAt: serverTimestamp, passed: bool }
   ```
   Only **one doc per topic**, best score kept, attempts counter incremented. Guest users
   get localStorage results (same shape) and a merge-on-sign-in prompt following the
   existing progress-merge pattern.
5. **Rules v5**: owner-only, `bestScore ≤ bestTotal ≤ 12`, `attempts` bounded, `passed`
   is a bool. Emulator tests included.
6. **Offline**: the whole runner works offline (data is bundled); results queue locally
   and sync on reconnect with the existing optimistic-write plumbing.
7. **Home/Today/insights hooks**: `Quiz: Arrays — 4 min` can appear as a light session
   item (phase 08 wires it), and a topic card shows its quiz badge (phase 02 surface).
8. **Admin-safety**: a topic whose bank is short (<12) renders what exists and passes at
   80% of the available count, with a visible `bank incomplete` note.

### Out
Timed quizzes, leaderboards, sharing results with friends, question types beyond the
five defined in phase 03, adaptive difficulty.

## 4. Design spec

```
Runner (phone)                       Explanation (after submit)
┌───────────────────────────┐        ┌───────────────────────────┐
│ Arrays · 4 / 12   ────○   │        │ ✓ Correct                  │
│ Which pattern fits a      │        │ Prefix sums let you answer │
│ running-sum range query?  │        │ any range in O(1)…         │
│ ○ Two pointers            │        │ ✗ Two pointers — needs a   │
│ ○ Prefix sums             │        │ contiguous window…         │
│ ○ Backtracking            │        │ ───────────────────────    │
│ ○ Union-find              │        │ [Continue  →]              │
└───────────────────────────┘        └───────────────────────────┘
```
Result screen: score ring 0–12 with `Passed` / `Almost` / `Try again`, the missed-question
list (tap → explanation again), and `Retake` (reseeded order).

## 5. File plan

```
NEW  src/quiz/engine.ts        pure state machine + scoring + seeding (unit-tested)
NEW  src/quiz/quizScreen.tsx   runner + question + explanation
NEW  src/quiz/quizHome.tsx     #/quiz list
NEW  src/quiz/results.ts       local (guest) + Firestore (signed-in) result model
NEW  src/quiz/resultScreen.tsx score, breakdown, missed list
EDIT src/app/router.tsx        #/quiz, #/quiz/:topicId
EDIT src/topics/topicPage.tsx  Quiz tab → real entry (phase 02 placeholder)
EDIT src/accountData.ts        quizResults read/write + merge on sign-in
EDIT tools/generate-firestore-rules.mjs, firestore.rules   quizResults block
EDIT tools/firestore-rules.test.mjs                        +3 tests
EDIT src/backup.ts             schema 4 gains quizResults[]
NEW  e2e/quiz.spec.ts
NEW  src/quiz/*.test.ts
```

## 6. Data model

| Aspect | Value |
|---|---|
| Doc | `users/{uid}/quizResults/{topicId}` (one per topic) |
| Fields | `bestScore`, `bestTotal`, `attempts`, `lastScore`, `lastAt`, `passed` |
| Cap | `bestTotal ≤ 12`, `attempts ≤ 999`, `bestScore ≤ bestTotal` |
| Guest | localStorage `dsa-archive.quiz.v1`, merged on sign-in (max score wins) |
| Backup | v4 `quizResults[]`; absent in v1–v3 without breaking import |
| Privacy | results never leave the owner; friends' summaries unchanged |
| Deletion | "delete my data" removes the subcollection |

## 7. Accessibility & performance
- Options are a real `radiogroup` with roving arrow-key focus and `aria-describedby`
  pointing at the explanation region (announced politely after submit).
- Colour never the only signal: `✓ Correct` / `✗ Not quite` labels; the chosen wrong
  option keeps a 2 px outline, not just red.
- Progress rail has `aria-valuenow/min/max`; the count `4 / 12` is also text.
- No layout shift between question states; question/answers pre-rendered from bundled
  data (<50 ms on route change).
- `prefers-reduced-motion` disables the continue transition.

## 8. Tests
| Kind | What |
|---|---|
| Unit | scoring, pass boundary (9 vs 10), reseed determinism, incomplete-bank maths, guest merge |
| Playwright | full run on phone: answer 12, pass, retake reseeds, results persist after reload, offline run then reconnect |
| Rules (emulator) | owner-only · caps · stranger denied · delete |
| Visual | question state, explanation state, result pass, result fail |

## 9. Risks
| Risk | Mitigation |
|---|---|
| Content quality is the real risk, not code | Phase 03 validator enforces 4 options + explanations; owner verifies the first bank |
| Users "quiz" by guessing | Explanations for every option + `Almost/Try again` copy; no score bragging |
| Result sync edge cases (offline + guest merge) | Reuse the phase-2 merge pattern, test both paths |
| Bank incompleteness at merge | Incomplete-bank mode designed and tested |

## 10. Acceptance
A learner can run a 12-question quiz end-to-end offline, pass at ≥10, see per-kind
breakdown, and find the best score persisted in a second browser profile · guest results
merge once on sign-in · rules tests green · 0 axe violations · snapshots committed.

## 11. Exit
Owner passes one quiz themselves in the preview (that's the acceptance), merges, and
phase 08 may use quizzes as a session item.
