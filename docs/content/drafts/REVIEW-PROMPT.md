# Accuracy-review prompt for parked Learn-content batches

Owner workflow: open a **new chat** on this repository, paste the prompt below,
and set the batch number. Review one batch per chat. When the reviewer
finishes, copy its final defect table back into the authoring session so the
defects can be fixed there. This review is the accuracy gate recorded in
`docs/DECISIONS.md`; a batch may only be promoted after it passes.

---

## The prompt (copy everything below the line, set N)

You are an independent technical reviewer. Review the draft learning content
in `docs/content/drafts/v3-batch-N/` (set N = 1–5) for FACTUAL ACCURACY ONLY.
You did not write this content. Be adversarial: your job is to find errors,
not to approve. Style, tone and word choice are OUT of scope — flag only
things that are wrong, misleading, or broken.

IMPORTANT — where the content lives: the drafts exist ONLY on the branch
`arena/996c8efe-dsa-archive`. Your session branch is probably cut from `main`,
which has no `docs/content/drafts/` directory. If the path is missing in your
checkout, do NOT review any other content as a substitute, and do NOT switch
branches. Instead run:

    git fetch origin arena/996c8efe-dsa-archive
    mkdir -p /home/user/review-scratch
    git archive origin/arena/996c8efe-dsa-archive docs/content/drafts/v3-batch-N \
      | tar -x -C /home/user/review-scratch

and review that read-only copy (compare against your checkout's
`data/problems.json`, which is identical). Delete the scratch directory when
done. If you still cannot find the batch, STOP and report that — reviewing
different content is a failed review.

Context: each batch contains `topics/*.json` (a primer, sections with one
inline check question, and a 12-item quiz per topic) and `problems/*.json`
(statement, constraints, worked example, hint, mistake, and stdin/stdout test
cases per problem). The catalogue of problems is `data/problems.json`.

Do ALL of the following, mechanically, and show your work:

1. **Re-derive every test case.** For every file in `problems/`, write a
   reference solution yourself (any language), run it against each test's
   `input`, and compare with `expected` byte-for-byte (expected outputs have
   no trailing newline). Do not eyeball — actually execute code. Also check
   the worked `example` in each statement agrees with the stated
   input/output/why.
2. **Verify every quiz item.** For each topic's quiz and each section
   `check`: confirm the option at `answerIndex` is genuinely and uniquely
   correct, and that each of the other three options is genuinely wrong.
   For `dryrun` items, compute the trace yourself. For `bug` items, confirm
   the snippet really contains the named bug and the named fix is right.
   Also verify every `explain` string — a wrong explanation on a correct
   option is still a defect.
3. **Fact-check the prose.** In primers, sections, statements, hints and
   mistakes: verify every complexity claim, every numeric example, every
   algorithmic assertion (e.g. where a sieve starts marking, what an lps
   array contains, which direction a trie XOR walk prefers). Verify the
   `reveal.solution` text of each section check.
4. **Cross-check identity.** Every `problemId` must exist in
   `data/problems.json` under the topic that lists it in `learnOrder`; the
   check's `reveal.reference` URL must come from that row's `resources[]`.
5. **Consistency.** Constraints must be consistent with the tests shown
   (no test may violate a stated constraint); statements must describe the
   exact input format the tests use.

Rules: do NOT modify any file in `docs/content/drafts/` or `data/`. Work in
scratch files outside the repo tree or delete them afterwards.

Output, in this order:
- A per-file verdict table: file → PASS / FAIL.
- A defect table: file · JSON path (e.g. `quiz[3].options[1].explain`) ·
  severity (**blocker** = factually wrong content a learner would absorb,
  **minor** = imprecise but defensible) · what is wrong · suggested fix.
- A final line: `BATCH N: X files, Y blockers, Z minors`.
- Then repeat the defect table alone in a fenced code block for easy
  copy-paste back to the authoring session.

If you find zero defects, say so explicitly and state what you executed to
convince yourself (which solutions you ran, which traces you computed).
