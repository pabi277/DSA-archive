# Authoring guide — content track for v2

**Audience:** the owner (verifier) and the agent (drafter).
**Rule:** everything here is **our own writing**. No copied prose, no copied examples, no
paraphrase-close-to-source. Topic/problem *titles* and *outbound links* are the only
things that come from the sheet's structure (`rule.md` clean-room law).

---

## 1. What gets written, and in what order

| # | Batch | Volume | Words each | Priority | Unblocks |
|---|---|---|---|---|---|
| 1 | Topic primers | 20 | 600–900 | **P0** | Phase 02 Learn tab |
| 2 | Beginner statements | 120 (6/topic) | ~80 | **P0** | Phase 03 render, 06 page |
| 3 | Hints | 495 | ≤140 chars | **P0** for beginner rows | practice + problem page |
| 4 | Common mistakes | 495 | ≤140 chars | P0 for beginner rows | problem page |
| 5 | Quiz items | 240 (12/topic) | stem ≤180, options ≤90 | **P0** | Phase 05 |
| 6 | Runner test cases | 2–3 per beginner problem (~300) | tiny | P1 | Phase 07 |
| 7 | Remaining statements | ~375 | ~80 | P2 | long tail |
| 8 | Topic pattern labels | 20 × 3 | — | **P0** | cards, quiz stems |

Ship P0 complete → the beginner path works end-to-end. P1/P2 fill the tail; every screen
already renders a designed "coming" state.

---

## 2. Voice

- Second person, present tense, no exclamation marks, no emoji.
- Short sentences. One idea per sentence. Define a term the first time it appears.
- Assume a first-year student who knows loops and arrays, nothing more.
- Never say "simply", "obviously", "just". Never shame the reader.
- Numbers are concrete: `O(n log n)`, `10⁴`, `2 s`, not "fast".

---

## 3. Primer template (600–900 words)

```
intro        What it is, in 2–3 sentences, with one real-world framing.
whenToUse    3–5 bullets: the signals in a problem statement that point here.
mentalModel  The one picture to keep in your head (analogy allowed, ≤120 words).
mistakes     Exactly 3, each one line, each phrased as a trap + the fix.
example      One worked mini-example: 15–20 lines of C++ and 2–3 lines explaining why.
practice     One line: "Ready? Open Practice — start with <first problem title>."
```
Structural rules: no third-level headings, ≤1 code block, no images, no links except
in-app routes, no external URLs.

---

## 4. Statement template (per problem, ≤700 chars)

```
statement    What is being asked, in your own words. Include the shape of the input
             and what must be returned. Never restate a platform's exact wording.
constraints  2–4 bullets with real bounds (n, values, time/memory if relevant).
example      input (plain text), output (plain text), why (one line).
hint         One line that nudges the *approach*, not the answer. No spoilers.
mistake      The most common wrong turn, one line.
```

Rules: if the example is a classic one from the source page, **change the numbers**.
Never include a full solution or a complexity answer in the statement.

---

## 5. Quiz item template (5 kinds × distribution)

| Kind | Per topic | Stem shape | Options |
|---|---|---|---|
| `pattern` | 4 | "Which approach fits this problem?" + 2-line scenario | 4 pattern names, one correct |
| `dryrun` | 3 | "What does this print?" + ≤12 lines of code | 4 outputs |
| `complexity` | 2 | "Time complexity of this loop/approach?" | 4 Big-O forms |
| `bug` | 2 | "What's wrong here?" + ≤12 lines | 4 one-line diagnoses |
| `edge` | 1 | "Which input breaks a naive solution?" | 4 inputs |

Hard rules enforced by `tools/validate_data.py`:
- exactly 4 options, `answerIndex` 0–3, every option has an `explain` ≤120 chars;
- exactly one defensibly correct answer (no "all of the above");
- no negative stems; no "except" unless the kind is `bug`;
- `codeSnippet` is plain text, ≤12 lines, tabs → 2 spaces;
- ids are `topicId-qN`, sequential, never reused.

---

## 6. Test cases (runner, phase 07)

```json
{ "input": "5\n2 7 11 15 9\n", "expected": "0 1", "note": "sample" }
```
- ≤6 cases/problem; 2–3 for beginners (sample + edge + one more).
- stdin is plain text; expected is compared after trimming trailing whitespace per line.
- Never include an expected output you haven't verified by running the reference solution.
- No case may take >1 s of intended runtime.

---

## 7. Review workflow (how a batch becomes data)

1. **Draft** — agent writes a topic's batch into a ready-to-paste JSON block in chat.
2. **Owner verification** — accuracy check (is the claim true?), tone check, and a
   deliberate read of every example for copied phrasing.
3. **Land** — agent writes the JSON into `data/content/...`, updates the coverage table.
4. **Validate** — `npm run test:data` must pass; the coverage report prints the new totals.
5. **Record** — phase record appends `content: +1 primer, +6 statements, +12 quiz items`
   with the date, so the README's coverage table stays honest.

Batches should be small (one topic at a time) so review is a five-minute job, not a project.

---

## 8. Coverage table (kept in README, updated each batch)

| Topic | Primer | Statements | Hints | Quizzes | Tests |
|---|---|---|---|---|---|
| Beginner Problems | ☐ | 0/83 | 0/83 | 0/12 | — |
| Sorting | ☐ | 0/7 | 0/7 | 0/12 | — |
| Arrays | ☐ | 0/32 | 0/32 | 0/12 | — |
| Hashing | ☐ | 0/6 | 0/6 | 0/12 | — |
| Binary Search | ☐ | 0/32 | 0/32 | 0/12 | — |
| Strings (Basic/Medium) | ☐ | 0/7 | 0/7 | 0/12 | — |
| Recursion | ☐ | 0/22 | 0/22 | 0/12 | — |
| Linked List | ☐ | 0/49 | 0/49 | 0/12 | — |
| Bit Manipulation | ☐ | 0/14 | 0/14 | 0/12 | — |
| Greedy | ☐ | 0/14 | 0/14 | 0/12 | — |
| Sliding Window / 2-Pointer | ☐ | 0/13 | 0/13 | 0/12 | — |
| Stack / Queues | ☐ | 0/31 | 0/31 | 0/12 | — |
| Binary Trees | ☐ | 0/32 | 0/32 | 0/12 | — |
| BST | ☐ | 0/15 | 0/15 | 0/12 | — |
| Heaps | ☐ | 0/20 | 0/20 | 0/12 | — |
| Graphs | ☐ | 0/46 | 0/46 | 0/12 | — |
| Dynamic Programming | ☐ | 0/53 | 0/53 | 0/12 | — |
| Tries | ☐ | 0/7 | 0/7 | 0/12 | — |
| Strings (Advanced) | ☐ | 0/9 | 0/9 | 0/12 | — |
| Maths | ☐ | 0/3 | 0/3 | 0/12 | — |
| **Total** | 0/20 | 0/495 | 0/495 | 0/240 | 0/~300 |

---

## 9. What never ships

- Copied sentences from takeUforward / LeetCode / any blog or video transcript.
- Full solutions in a statement, hint or quiz explanation.
- Claims the app can't back up ("guaranteed interview ready", "master in 30 days").
- Time/difficulty promises in copy.
