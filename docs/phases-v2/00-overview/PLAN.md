# DSA Archive v2 — master plan & phase index

**Created:** 2026-11-03 · **Supersedes:** the v1 phase sequence for *future* work
(v1 phases 0–6 are complete and stay as history in `docs/phases/`)
**Owner decisions this plan implements** (recorded 2026-11-03 in `docs/DECISIONS.md`):

1. Drop expensive ideas — no FSRS, no attempt-history engine, no readiness/calibration/ETA analytics, no AI.
2. **UI craft is priority #1** — the redesign is not "polish later", it is Phase 01.
3. YouTube plays **inside our own screen** (official IFrame player); ads are the browser's business (owner uses Brave), we never modify the player.
4. Beginner-friendly: **all 20 topics visible**, in-app **problem statements**, **quizzes** to check understanding.
5. **Remove the Notes section; add a Code section** saved to Firestore.
6. C++ **runs in the browser** (local wasm runner), no server, no judge.

---

## Phase map

| # | Folder | Phase | Ships | ~Days |
|---|---|---|---|---|
| 00 | `00-overview/` | this index | — | — |
| 01 | `01-foundation-router-shell/` | Router, shell, design system v2 | URLs, sidebar/bottom bar, tokens, type, colour, density, rows, motion, states, ⌘K, undo | 9–11 |
| 02 | `02-topics-browse/` | The 20-topic spine | `#/topics`, topic pages (Learn/Practice/Quiz tabs), rings, learning order | 5–6 |
| 03 | `03-content-pipeline/` | Content data + authoring + validation | statements, hints, mistakes, primers, quizzes, tests — schema, tooling, CI | 5–7 (build) + authoring track |
| 04 | `04-code-notebooks/` | Notes → Code | `snippets` collection, rules v5, backup v4, `#/code`, editor, peek/reveal | 5–6 |
| 05 | `05-quiz-engine/` | Quiz engine + results | runner, scoring, explanations, quiz home, results sync + offline | 5–6 |
| 06 | `06-theatre-player/` | Video theatre | player stage, mini player, stamps, speed memory, oEmbed, dead links | 7–9 |
| 07 | `07-browser-runner/` | Local C++/Py/JS runner | wasm worker, Run, tests, predict-output, storage control | 5–7 |
| 08 | `08-insights-light/` | Cheap, honest insight layer | reason chips everywhere, momentum, trajectory vs target, "how this plan was made" | 4–5 |
| 09 | `09-pwa-accessibility-hardening/` | Quality gate | budgets re-baseline, a11y, offline, snapshots, perf | 4–5 |
| 10 | `10-release-v2/` | Docs, runbook, release | README, screenshots, changelog, deploy runbook | 2–3 |

**Sequential estimate:** ~55–65 build days. Phases 02 and 03 can run in parallel once
01 lands; 04–07 are independent of each other and can be re-ordered after 03.

---

## Dependency graph

```
01 (router+shell+design v2)
 ├── 02 (topics)  ──┬── 05 (quiz engine)
 │                  │
 └── 03 (content) ──┴── 06 (theatre) ── 07 (runner)
        │
        ├── 04 (code)  ── (needs 06? no; needs 01 only)
        └── 08 (insights) needs 01 + 02 + progress data (exists)
09 (hardening) needs all; 10 (release) needs 09.
```

Hard rules carried from `rule.md`: one phase per chat, one PR per phase, owner merges,
nothing deploys without an explicit command, and any change to a **recorded answer**
is a gate.

---

## Cross-cutting architecture decisions (apply to every phase)

### A1. Routing without a dependency
Hash router (`#/...`) written in ~120 lines, because Firebase Hosting serves static
files and `cleanUrls:false` (`firebase.json`) — hashes need zero config, work offline,
and survive the existing Service Worker. Routes:

```
#/                        Today
#/topics                  all 20 topics (grid)
#/topic/<topicId>         topic page  (?tab=learn|practice|quiz)
#/problem/<problemId>     problem page (?t=<seconds>&lang=<code-lang>)
#/code                    saved solutions (?lang=&topic=&q=)
#/practice                pattern × practice-set drills (phase 03 data)
#/review                  revision queue
#/quiz                    quiz home (all topics, progress)
#/insights                light insight screen (phase 08)
#/settings                settings
#/not-found               friendly 404
```
Query-string state (filters, tabs, video time, code language) makes every screen
bookmarkable and back-button-correct. **`view` state in `App.tsx:86-130` is deleted.**

### A2. Module layout
`src/App.tsx` (988 lines) is split; each phase adds its own module:

```
src/
  app/           router.tsx, shell.tsx, commandPalette.tsx, toast.tsx, undo.ts
  design/        tokens.css, primitives.tsx (Button, Chip, Ring, Card, Sheet, Empty)
  topics/        topicList.tsx, topicPage.tsx, primers.ts
  content/       types.ts, load.ts (validated JSON), quiz data access
  code/          codeStore.ts, codeScreen.tsx, editor.tsx, highlight.ts
  quiz/          engine.ts, quizScreen.tsx, results.ts
  theatre/       player.tsx, miniPlayer.tsx, stamps.ts, oembed.ts
  runner/        worker client, runPanel.tsx
  insights/      metrics.ts, insightsScreen.tsx
```
`catalogue.ts`, `progress.ts`, `cloudProgress.ts`, `accountData.ts`, `planner.ts`,
`friends*.ts`, `backup.ts`, `pwa.ts`, `settings.ts` stay where they are and are
*consumed*, not rewritten (except `backup.ts` in 04 and `App.tsx` in 01).

### A3. Design system v2 = "tokens v2"
Re-frozen **once** in phase 01 (a recorded gate re-opening). Every later phase consumes
it. `docs/UI-REFERENCE.md` gets a v2 tokens table; the v1 table stays as history.
Non-negotiables: one accent reserved for action · colour never the only signal ·
one hero number per screen · every stat has a denominator · no emoji, gradients,
glass or card-in-card · every mutation undoable · every view has a URL · tabular
numbers everywhere a number changes.

### A4. Performance budgets (re-baselined in 01, enforced in 09)
```
CSS raw 60 kB · CSS gzip 18 kB
entry JS raw 180 kB · entry JS gzip 55 kB
single chunk raw 520 kB · single chunk gzip 165 kB
app shell gzip 380 kB
runtime assets (compiler 14 MB, fonts 45 kB) = SEPARATE bucket, never precached
```

### A5. Testing contract per phase
Every phase lands with: unit tests (Vitest, pure modules), one Playwright spec
(390×844 phone **and** 1440×900 desktop), axe audit with 0 violations, and
screenshots committed as visual baselines. Firebase-touching phases (04, 05) also add
emulator rules tests via `npm run test:rules`.

### A6. Content is data, not code
All learner content lives in `data/` as JSON validated by `tools/validate_data.py`:

```
data/problems.json                      (existing) + level/kind/links + resources[]
data/content/topics/<topicId>.json      primer, patterns, theory MCQs, quiz bank
data/content/problems/<problemId>.json  statement, hint, mistake, tests[]
data/content/patterns.json              ~34 pattern labels (taxonomy)
data/practice-sets/<pattern>.json       drills: +120–140 extra LeetCode problems
data/media/<videoId>.json               oEmbed metadata (title/author/thumb/dead)
```
Split-per-file keeps diffs reviewable and lets phases 02/03 ship before content is
complete (every screen has a "content coming" state).

### A7. What is explicitly out (unchanged from the owner's decisions)
FSRS · attempt history · readiness score · calibration · ETA math beyond a single
line · pattern tagging of all 495 problems · AI · transcripts/scraping · remote
judge · code IDE with full language support · public signup/leaderboards ·
Cloud Functions/Storage/Realtime DB.

---

## Owner additions 2026-11-03 (batch 2) — folded into this programme

| Ask | Where it lands | Detail doc |
|---|---|---|
| **Add more LeetCode problems** | Phase 03 — `data/practice-sets/*.json`, `#/practice` route, drills toggle on the topic Practice tab | [`03-content-pipeline/PRACTICE-SETS.md`](../03-content-pipeline/PRACTICE-SETS.md) |
| **No single source of truth for articles/videos** | Phase 03 — `resources[]` per problem, ranked, multi-publisher, verified dates; UI shows publisher names under `⋯ More sources` | [`03-content-pipeline/RESOURCE-POLICY.md`](../03-content-pipeline/RESOURCE-POLICY.md) |
| **Don't jam learning into Q&A; tasks only where a check earns its place; coding = code, theory = MCQ with revealable solution** | Phase 03 (schema) + Phase 05 (runner) — `theory[]` MCQ cards for the 42 theory rows, the placement rule, `[Solve]` vs `[Check]` | [`05-quiz-engine/THEORY-MCQ.md`](../05-quiz-engine/THEORY-MCQ.md) |

Resulting catalogue targets: **≈400 distinct LeetCode problems** (273 now + drills),
**≥2 publishers per row**, **42 theory MCQs**, **240 topic-quiz items**, zero question
spam. These are acceptance criteria in phases 03 and 05, not aspirations.

## Records & gates

- Each phase folder holds `PLAN.md` (this document's per-phase contract). When the
  phase is executed, its chat appends `RECORD.md` next to it with CI run id, tip sha,
  `site-preview` bytes, what is visible, and deviations. Mirrors the v1 convention in
  `docs/phases/NN-*.md`.
- Gates this programme re-opens once, in phase 01 (record them in `DECISIONS.md`):
  frozen tokens v1 → v2, "system fonts only", CI budgets, unused Tailwind/daisyUI
  decision, and the CSS-only styling rule (utility classes may now be used *if* they
  survive the budget).
- Gates that stay closed: money, Blaze, new Firebase products, public visibility,
  analytics, AI, scraping, deploy.

## Definition of done for the whole programme

1. A first-year student opens `#/topics`, picks Arrays, reads the primer, practices,
   passes the quiz, writes and **runs** C++, watches the video in-app, and comes back
   tomorrow to a Today screen that reasons about them — all on a phone, offline after
   first load, with zero "what do I click" moments.
2. Every screen has a URL, a designed empty state, an undo path for destructive
   actions, and 0 axe violations at 390 px and 1440 px in dark and light.
3. Bundles inside the re-baselined budgets; compiler cached separately; app opens in
   Airplane Mode.
4. No notes code, no dead routes, no `.md` in the UI; rules v5 + backup v4 verified by
   emulator tests; README/screenshots truthful.
