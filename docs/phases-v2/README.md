# v2 phase package

One folder per phase. Each `PLAN.md` is a complete, self-contained contract: charter,
evidence, scope (in/out), design spec, file plan, data model, accessibility &
performance targets, tests, risks, acceptance criteria, and exit gate.

| # | Phase | Estimate | Depends on |
|---|---|---|---|
| — | [`00-overview/`](00-overview/PLAN.md) — master plan, architecture, cross-cutting rules | — | — |
| 01 | [`01-foundation-router-shell/`](01-foundation-router-shell/PLAN.md) — router, shell, design system v2 | 9–11 d | — |
| 02 | [`02-topics-browse/`](02-topics-browse/PLAN.md) — the 20-topic spine, topic pages, outcomes | 5–6 d | 01 |
| 03 | [`03-content-pipeline/`](03-content-pipeline/PLAN.md) — statements, hints, primers, quiz bank, tests (+ [`AUTHORING.md`](03-content-pipeline/AUTHORING.md)) | 5–7 d + authoring | 01 |
| 04 | [`04-code-notebooks/`](04-code-notebooks/PLAN.md) — notes → code, `snippets`, rules v5, backup v4 | 5–6 d | 01 |
| 05 | [`05-quiz-engine/`](05-quiz-engine/PLAN.md) — quiz runner, scoring, results | 5–6 d | 02, 03 |
| 06 | [`06-theatre-player/`](06-theatre-player/PLAN.md) — in-app YouTube theatre, mini player, stamps | 7–9 d | 01, 02, 03 |
| 07 | [`07-browser-runner/`](07-browser-runner/PLAN.md) — run C++/Python/JS locally in the browser | 5–7 d | 04, 03 |
| 08 | [`08-insights-light/`](08-insights-light/PLAN.md) — reason chips, momentum, trajectory (cheap only) | 4–5 d | 01, 02, 05 |
| 09 | [`09-pwa-accessibility-hardening/`](09-pwa-accessibility-hardening/PLAN.md) — budgets, a11y, offline, CSP | 4–5 d | 01–08 |
| 10 | [`10-release-v2/`](10-release-v2/PLAN.md) — docs, screenshots, runbook, deploy gate | 2–3 d | 09 |

**Sequential total:** ~55–65 build days, plus the content track in
[`03-content-pipeline/AUTHORING.md`](03-content-pipeline/AUTHORING.md) which runs in
parallel from phase 02 onwards.

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
