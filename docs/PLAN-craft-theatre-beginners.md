# Locked plan: craft-first UI, in-app YouTube theatre, Notes → Code, beginner learning layer

**Date:** 2026-11-03 · **Status:** agreed direction, no code yet
**Owner decisions recorded this turn:**
1. **Drop the expensive ideas** — no FSRS, no attempt-history engine, no readiness/calibration/ETA analytics stack, no readiness blending.
2. **UI is the #1 priority** — it must be excellent, not "fixed later".
3. **YouTube plays inside our own screen** (official IFrame player). Ads are a non-issue: the owner uses **Brave** (no changes needed on our side — we never touch the player).
4. **Redesign scope must stay beginner-friendly** — every topic visible, problem statements in-app, quizzes to check understanding.
5. **Remove the Notes section; add a Code section saved to Firestore.**

Nothing in `src/` was touched. This replaces the earlier "smart layer" as the active plan;
`FEEDBACK-smart-layer.md` stays as parked reference (only the cheap items below survive).

---

## 1. What dies, what survives

| Parked (expensive / deferred) | Kept (cheap, and now core) |
|---|---|
| FSRS scheduler, retention math, workload forecast | Fixed 3 → 7 → 21 revision ladder (already built) |
| Attempt log with duration/confidence/mistake taxonomy | One-tap **outcome** on solve: `Clean / Hint / Couldn't` (single stored field) |
| Readiness score, calibration, ETA/trajectory, weak-pattern radar | **Reason chips** on Today (`overdue 2d`, `next in your path`) |
| Pattern tagging of all 495 problems | **Pattern tags only on the 20 topic headers** + quiz metadata |
| AI anything | Zero |

---

## 2. The core decision: pages, not tabs

The single biggest reason the UI reads as a generated template is the **seven-pill
tab strip** (`App.tsx:510-566`) and the absence of routing. The redesign is:

- **Real URLs** (hash router, zero dependency): `#/`, `#/topic/<id>`, `#/problem/<id>`,
  `#/code`, `#/review`, `#/quiz/<topicId>`, `#/search`.
- **Desktop:** 240px left sidebar (collapsible to 64px) — Today · Topics · Code · Review · Settings.
- **Phone:** 4-item bottom bar — Today · Topics · Code · Review, with the player docked above it.
- **Killed:** the eyebrow/hero/subtitle block, the 7-tab row, the bordered 2-column card grid.

Back button, bookmarks, shareable links and PWA shortcuts all start working as a
side effect — no extra feature work.

---

## 3. New IA — 20 topics as the spine (what beginners need)

```
#/                      Today        next 3 things, honest, one control (20/40 min)
#/topics                all 20 topics, always visible, each with:
                                      · % learned ring
                                      · N lessons · M problems · 1 quiz
                                      · difficulty ramp: Basic → Core → Pro
#/topic/<id>            the topic page (the beginner centrepiece — §6)
#/problem/<id>          the theatre + statement + code + outcome
#/code                   all your saved code, searchable by language
#/review                 the existing revision queue (unchanged logic)
#/quiz/<topicId>         check-your-understanding quiz (12 questions, pass 80%)
```

Rule: **no screen may require a scroll to find navigation**, and every screen states
in one line what it wants you to do next.

---

## 4. Design system v2 (this is the "super good" work)

Re-frozen once, deliberately, replacing the 2026-11-02 tokens.

**Layout** — 240px sidebar / 64px rail; content max 1,200px; 24px gutters;
one primary column, one 280px context rail only on wide screens.

**Type** — `Inter var` (UI) + `JetBrains Mono` (code/numbers/durations), self-hosted
subsets (~45 kB woff2 total, added to the CSS/asset budget on purpose). Scale
`11 / 12 / 13 / 14 / 16 / 20 / 28 / 40`, `tabular-nums` everywhere a number can change.

**Colour — one accent, five roles** (the current single `--accent` doing four jobs is
the #1 template tell):
`--action` (one per screen) · `--success` (solved clean) · `--caution` (hint / due) ·
`--danger` (couldn't) · `--chart-1..3`. Dark-first, light parity, all pairs ≥4.5:1,
state always also carried by a label.

**Density** — Compact 38px / Comfortable 48px / Roomy 62px, remembered per user.

**Row anatomy (topics and problems)** — one line: status edge-mark · title ·
mono `#207` · level bar (3px, text label on hover) · age (`12d`) · hover cluster
(`✓ ⏱ ★ ↗ ⋯`). Links collapse from four 11px chips into `↗ Solve` + `⋯`.

**Motion** — 120–180ms ease-out, `startViewTransition` for list↔detail and topic→topic,
checkmark bloom on complete, all behind `prefers-reduced-motion`.

**States** — skeletons shaped like the real layout, designed empties with exactly one
action, **undo toast on every mutation** (cheapest maturity win in the app), real focus
rings, 404 with a useful way back.

**Craft rules** — one hero metric per screen · colour means something · no emoji ·
no gradients · no glassmorphism · no card-in-card · facts not cheerleading.

---

## 5. The notes → code swap

**Remove:** `NotesView.tsx`, `NoteEditor.tsx`, `markdown.ts` (+ tests), the `notes`
subcollection and its rules block (`firestore.rules:1235-1241`), the notes tab, the
`noteTotal` chips, and notes from backup v4.

**Add:** `users/{uid}/snippets/{problemId}`

```
{ language: 'cpp'|'java'|'python'|'js'|'ts'|'go'|'rs'|'other',
  code: string,            // ≤ 8,000 chars, sanitised like today's snippet
  notes: string,           // optional ≤ 500 chars, plain text (kept so knowledge isn't lost)
  updatedAt: serverTimestamp() }
```

- Rules: owner-only get/list/create/update/delete, id must match a catalogue slug,
  field whitelist, size caps — same pattern as today's `validNote`.
- Backup: **schema v4** (v1–v3 import still works, v3 `notes` mapped into `snippets.notes`).
- Generate + check via the existing `tools/generate-firestore-rules.mjs` and its tests.
- **`#/code` screen:** every saved solution, searchable, filter by language/topic,
  copy button, "shows a saved solution" badge on rows, and a "peek" reveal so the
  code functions as active recall instead of dead text.

**Editor (deliberately small, budget-safe):** monospace textarea + line numbers +
tab/shift-tab indent + a small language chip row. **No** syntax-highlight library, no
CodeMirror/Monaco (breaks the 36 kB CSS / 130 kB entry-JS budgets and the offline promise).
View mode renders `<pre>` with a tiny hand-rolled tokenizer if it fits the budget.

---

## 6. The beginner centrepiece — the topic page

Every one of the 20 topics gets this page, whatever its size (Maths with 3 rows still
gets a real page; the page scales, it doesn't look empty):

```
┌ Topic header ────────────────────────────────────────────────────┐
│ Arrays                            46 problems · Basic 12 · Core 24 · Pro 10 │
│ [learned ring 34%]   Patterns: two-pointers · prefix-sum · sliding-window │
│ Your state: 14 clean · 6 with hints · 4 couldn't · next due in 2 days    │
└──────────────────────────────────────────────────────────────────┘
[ Learn ]  [ Practice ]  [ Quiz ]            ← three modes, one per tab

LEARN      a 60–90s primer written for a beginner: what it is, when to
           reach for it, the mental model, the 3 mistakes people make,
           one worked mini-example. 500–900 words, ours, clean-room.

PRACTICE   the existing rows, in learning order (not alphabetical), with
           reason chips and the 3-segment outcome control.

QUIZ       12 questions, 80% to pass: recognise-the-pattern (4),
           dry-run-the-code (3), complexity (2), spot-the-bug (2),
           edge cases (1).
```

**Problem statements, in-app.** Written by us in 3 lines — constraints · example in/out
· what's really being asked — plus the outbound links as *further reading*. We never copy
LeetCode/Striver text (clean-room law); we paraphrase behaviour. Every problem page also
gets one **hint** and one **common mistake**, expandable.

**Quizzes.** Multiple choice, instant feedback with a one-line explanation per option,
stored per attempt (best score only), offline-capable, and no leaderboard. A topic shows
`Quiz ✓ 11/12` once passed and the Today screen can suggest `Quiz: Arrays — 4 min` as a
light session item.

**Why quizzes matter here:** the app currently cannot tell "watched the video" from
"understands". A 4-minute quiz is the cheapest, most beginner-appropriate proof — and
it gives the whole product something honest to celebrate.

---

## 7. Theatre mode (YouTube inside the app)

Full-bleed stage inside `#/problem/<id>`; player 16:9; right rail = statement, hint,
code, outcome; footer = `Solved clean · With a hint · Couldn't · Next`.

**Params:** `enablejsapi=1` + `origin`, `rel=0`, `iv_load_policy=3`, `playsinline=1`,
`cc_load_policy=1`, `host=youtube-nocookie.com`. Our chrome only — branding, captions,
quality, speed and ads stay YouTube's. **Ads: nothing to do.** The owner browses in Brave,
so ad filtering is the browser's business; our code never touches the player (that also
keeps ToS §4.13 intact).

**Controls we own:** play/pause, seek, rate **0.75–2×** remembered per topic, "skip to
first stamp", auto-advance to the next problem in today's plan, and a **mini player**
docked bottom-right while browsing (single instance, survives route changes).

**Keys:** `space` · `←/→` 5s · `f` · `c` · `s` stamp · `n` next · `/` search · `⌘K` palette.

**Two small, cheap smart touches (kept from the parked list):**
- **Timeline stamps** — `s` → `02:14 · "shrink from the left"`, click to seek, stored with
  the snippet. No transcript, no scraping, no keys.
- **oEmbed metadata** — real title/channel/thumbnail for the 369 video rows + a dead-link
  badge in `tools/check-links.mjs`.

---

## 8. Firestore / CI impact

| Item | Change |
|---|---|
| Rules | **v5** — drop `notes`, add `snippets` (owner-only, field whitelist, size caps, slug id). Generator + `npm run check:rules` + 2–3 new emulator tests |
| Backup | **v4** — `snippets[]`; v1–v3 import preserved, v3 notes → `snippets.notes` |
| Quota | unchanged in shape (one doc read per saved solution, same as notes today) — still far inside Spark |
| Budgets | **re-baseline on purpose**: CSS 60 kB raw / 18 kB gzip · entry JS 180 kB raw / 55 kB gzip · single chunk 520 kB · shell 380 kB gzip. Recorded with a rationale, not quietly bumped |
| Tests | add Playwright visual snapshots (phone/desktop × dark/light) as the redesign guardrail; delete notes specs (`e2e/library.spec.ts` trimmed), add `code.spec.ts` + `topic.spec.ts` (quiz pass path) |

**Content work is the long pole:** 20 primers (500–900 words), ~120 problem statements
for the beginner half of each topic, statements for the rest later, and 20 × 12 quiz
questions = 240 items. That's *authoring*, not coding — plan it as a separate track
(§10) and make every screen tolerate missing content with a "statement coming" state.

---

## 9. Build order

**Phase A — Craft (≈8–10 days).** Router + sidebar/bottom-bar shell · design tokens v2 ·
type + colour roles · density · row anatomy v2 · motion · skeletons/empties/undo ·
`⌘K` palette · keyboard triage. *Acceptance:* every screen reachable by URL and back
button; no scroll needed to navigate; all actions undoable; snapshots baselined.

**Phase B — Notes → Code (≈4–5 days).** Remove notes end-to-end; add `snippets`
collection + rules v5 + backup v4; `#/code` screen; small editor; peek/recall reveal.
*Acceptance:* a saved snippet appears in a second browser profile; rules tests prove a
stranger can't read it; v3 backup imports cleanly.

**Phase C — Beginner layer (≈8–12 days + authoring).** Topic pages (Learn / Practice /
Quiz) · topic list always visible with rings · problem statements + hint + mistake
patterns · 240 quiz items · quiz results stored. *Acceptance:* a new user can go
`Topics → Arrays → Learn → Practice → Quiz` and pass, offline after first load.

**Phase D — Theatre (≈6–8 days).** Player stage + mini player + stamps + speed memory +
outcome footer + oEmbed cards + dead-link badge. *Acceptance:* one 40-minute session runs
entirely inside the app with no YouTube page ever opened; player survives route changes.

**Phase E — Polish (≈3 days).** Copy pass, empty/error/offline states, a11y re-audit,
final snapshot set, README/screenshots.

---

## 10. Content track (runs parallel, agent-draftable, you verify)

| Batch | Volume | Notes |
|---|---|---|
| Topic primers | 20 × 600 words | Written for a first-year student; mental model + 3 mistakes + mini example |
| Beginner problem statements | 120 (6 per topic) | 3 lines each: ask · constraints · example |
| Remaining statements | ~375 | Later; pages show "statement coming" |
| Hints + common mistakes | 495 + 495 | One line each, high value, cheap |
| Quiz bank | 240 items | 4 options + explanation per option |
| Pattern labels on topics | 20 × 3 | The only taxonomy we need now |

Everything is ours (clean-room), stored as JSON next to `data/problems.json`, validated
by `tools/validate_data.py`, and versioned in git.

---

## 11. Non-negotiables (so the UI doesn't regress again)

1. One accent colour, reserved for action. Colour never the only signal.
2. One hero number per screen; every stat has a denominator.
3. No emoji, no gradients, no glass, no card-in-card, no 7-equal-tabs.
4. Every mutation has undo. Every empty state has one action.
5. Every view has a URL. Back button always works.
6. Offline still opens: the theatre is the only online-only surface, and it says so.
7. Budgets are a contract: a change that breaks them needs a recorded re-baseline.
8. No notes, no transcripts, no scraping, no AI, no third-party UI kit.
9. Snapshots + axe + rules tests stay green at phone and desktop.
10. Beginner test: a first-year student opens `#/topic/arrays` and knows what to do
    in under 5 seconds without reading a paragraph.

---

*No code was written and nothing in `src/` changed. Confirm this plan (or mark
phases A–E with priorities) and I'll start with Phase A, one phase per PR, gates intact.*
