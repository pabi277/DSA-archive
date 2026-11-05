# v2 phase package

One folder per phase. Each `PLAN.md` is a complete, self-contained contract: charter,
evidence, scope (in/out), design spec, file plan, data model, accessibility &
performance targets, tests, risks, acceptance criteria, and exit gate.

| # | Phase | Estimate | Depends on |
|---|---|---|---|
| — | [`00-overview/`](00-overview/PLAN.md) — master plan, architecture, cross-cutting rules | — | — |
| 01 | [`01-foundation-router-shell/`](01-foundation-router-shell/PLAN.md) — router, shell, design system v2 | 9–11 d | — |
| 02 | [`02-topics-browse/`](02-topics-browse/PLAN.md) — the 20-topic spine, topic pages, outcomes | 5–6 d | 01 |
| 03 | [`03-content-pipeline/`](03-content-pipeline/PLAN.md) — statements, hints, primers, quiz bank, tests · [`RESOURCE-POLICY.md`](03-content-pipeline/RESOURCE-POLICY.md) (multi-source, no single truth) · [`PRACTICE-SETS.md`](03-content-pipeline/PRACTICE-SETS.md) (+120–140 LeetCode drills) · [`AUTHORING.md`](03-content-pipeline/AUTHORING.md) | 7–9 d + authoring | 01 |
| 04 | [`04-code-notebooks/`](04-code-notebooks/PLAN.md) — notes → code, `snippets`, rules v6, backup v5 (after the Phase 02 v5/v4 baseline) | 5–6 d | 01 |
| 05 | [`05-quiz-engine/`](05-quiz-engine/PLAN.md) — theory MCQs with revealable solutions ([`THEORY-MCQ.md`](05-quiz-engine/THEORY-MCQ.md)), quiz runner, scoring, results | 6–7 d | 02, 03 |
| 06 | [`06-theatre-player/`](06-theatre-player/PLAN.md) — in-app YouTube theatre, mini player, stamps | 7–9 d | 01, 02, 03 |
| 07 | [`07-browser-runner/`](07-browser-runner/PLAN.md) — run C++/Python/JS locally in the browser | 5–7 d | 04, 03 |
| 08 | [`08-insights-light/`](08-insights-light/PLAN.md) — reason chips, momentum, trajectory (cheap only) | 4–5 d | 01, 02, 05 |
| 09 | [`09-pwa-accessibility-hardening/`](09-pwa-accessibility-hardening/PLAN.md) — budgets, a11y, offline, CSP | 4–5 d | 01–08 |
| 10 | [`10-release-v2/`](10-release-v2/PLAN.md) — docs, screenshots, runbook, deploy gate | 2–3 d | 09 |

**Sequential total:** ~57–69 build days, plus the content track in
[`03-content-pipeline/AUTHORING.md`](03-content-pipeline/AUTHORING.md) which runs in
parallel from phase 02 onwards.


**Execution status (2026-11-05, phase 08):** Phase 07 was reviewed and merged by the owner
(PR #18, `ace2289`; post-merge CI fix in PR #19, `79c6099`). Phase 08 is implemented on
`arena/d4a6c3b3-dsa-archive` and stopped at the owner's PR/merge gate: the nine-reason
vocabulary, momentum instead of a punitive streak, one trajectory sentence, "How this plan
was made", two undoable detectors and `#/insights`, with optional `targetDate`/`targetListId`
under rules v9 / backup v8 — see [`08-insights-light/RECORD.md`](08-insights-light/RECORD.md).
The owner re-baselined the shell cap to **393 kB gzip** and CSS raw to **61 kB** (measured
391,193 B gzip / 60,238 B raw), because the insight layer lives on Today and must be
precached. Latest *merged* versions on `main` remain rules v8 / backup v7; phase 08 advances
them to rules v9 / backup v8 on its branch, and phase 09 owns the cap review.

**Earlier status (2026-11-04, phase 07):** Phase 06 was reviewed and merged by the owner
(PR #17, `d44b55a`). Phase 07 is implemented on `arena/435eaa93-dsa-archive` and stopped at the
owner's PR/merge gate: local C/C++ (Clang 22 on wasm) and Python (Pyodide) runners as an
opt-in download per language, JavaScript with no download, authored test cases with a
first-diff, instant Stop, network off while a program runs, and a Settings card that
reports and clears the cache — see [`07-browser-runner/RECORD.md`](07-browser-runner/RECORD.md).
Latest *merged* versions on `main` are rules v8 / backup v7 (phase 06); phase 07 changes no
Firestore shape, so those stand.

**Earlier status (2026-11-04):** Phases 01–04 are merged to `main` (PR #12 `558a25f`, PR #13 `bd9350b`, PR #14 `e51695a`, PR #15 `f4fa993` with CI run `41782795154` green). Phase 05 is implemented on `arena/6327674f-dsa-archive` with CI run [`41794873495`](https://github.com/pabi277/DSA-archive/actions/runs/41794873495) (`cac1c7f`) green across 194 unit tests, 18 emulator rules v7 tests, 94 Playwright + axe checks, 64 visual baselines, `site-preview` (435,685 B), and 376.01 kB / 380 kB gzip shell precache; its record is [`05-quiz-engine/RECORD.md`](05-quiz-engine/RECORD.md). Opening a PR and merging remain gated on the owner's explicit command. Latest *merged* versions on `main` are rules v6 / backup v5; Phase 05 advances them to rules v7 / backup v6 on its branch. The listed sequence continues 05 → 06 → 07 → 08 → 09 → 10.

## Owner additions 2026-11-03 (batch 2)

| Ask | Doc |
|---|---|
| Add more LeetCode problems (drills per pattern) | [`03-content-pipeline/PRACTICE-SETS.md`](03-content-pipeline/PRACTICE-SETS.md) |
| Best source per topic, not one publisher | [`03-content-pipeline/RESOURCE-POLICY.md`](03-content-pipeline/RESOURCE-POLICY.md) |
| Tasks only where a check earns its place; coding = code, theory = MCQ with a revealable solution | [`05-quiz-engine/THEORY-MCQ.md`](05-quiz-engine/THEORY-MCQ.md) |

## How to run a phase

1. Read `00-overview/PLAN.md` (architecture + cross-cutting rules) and the phase folder.
2. One phase per chat, one PR per phase, owner merges.
3. On completion, add `RECORD.md` in the phase folder: CI run id, tip sha,
   `site-preview` bytes, what is now visible, deviations, and content added.
4. Update `docs/ROADMAP.md` status and `docs/DECISIONS.md` if anything was decided.

## Standing gates (unchanged)

PR · merge · `main` push · deploy · repo visibility · money/Blaze · new Firebase products
· analytics · AI · publishing anything derived from the copied page · changing a recorded
owner answer. `rule.md` §3 remains the source of truth.
