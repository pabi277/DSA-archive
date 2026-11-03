# Phase 02 — The 20-topic spine (browse, topic pages, practice)

**Folder:** `docs/phases-v2/02-topics-browse/`
**Estimate:** 5–6 days (+ content from phase 03) · **Depends on:** 01 · **Blocks:** 05, 06
**Why:** a beginner needs a *map*, not a 495-row accordion. All 20 topics are always
visible; each has a page with three modes and an honest state of your own progress.

---

## 1. Charter

Build `#/topics` and `#/topic/<id>` — the navigation backbone of the product — and move
the sheet's practice rows onto the topic page in **learning order**. Content authored in
phase 03 fills these pages; this phase ships graceful "content coming" states so it can
merge before the content track finishes.

## 2. Current state (evidence)

| Fact | Evidence |
|---|---|
| Topics exist only as accordion headers | `SheetList.tsx:161` (`TopicAccordion`) |
| 20 topics / 495 problems / 84 basic · 287 core · 109 pro · 15 ungraded | `data/problems.json`, `docs/RESEARCH.md` §1 |
| Topic ordering comes from `order` field | `data/problems.json` (`order: 10, 20, …`) |
| No per-topic aggregate screen beyond a bar | `styles.css:197` (`.context-topic`) |
| Rows have no learning order (source order only) | `sheet.ts` filter/sort logic |

## 3. Scope

### In
1. **`#/topics`** — grid of 20 cards (1 col phone / 2 tablet / 3 desktop). Each card:
   topic name · `46 problems · 84 basic` style counts · **learned ring** (`tier≥2 / total`)
   · pattern chips (max 3) · state line (`14 clean · 6 hints · 4 couldn't`) ·
   quiz badge (`Quiz ✓ 11/12`) · next-due hint (`2 due`). One tap = topic page.
2. **`#/topic/<id>`** — header (name · counts · ring · patterns · your state) + three
   tabs: **Learn · Practice · Quiz** (`?tab=`).
   - **Learn**: primer (phase 03 data) rendered by a tiny, *safe* rich-text renderer;
     sections: what it is · when to reach for it · mental model · 3 mistakes · mini
     worked example · "ready? → Practice". Falls back to "primer coming — start with
     Practice" when absent.
   - **Practice**: subtopic groups in **learning order** (curated `learnOrder`, then
     difficulty ramp, then source order), the phase-01 row anatomy, filters
     (`all / not started / shaky / done`), and 3-way outcome control. A toggle
     `Core sheet (46) · Drills (+38)` switches to the extra LeetCode problems from
     `data/practice-sets/` (phase 03 data), grouped by pattern rung. **Theory rows show
     `[Check]` (MCQ) instead of `[Solve]`** — one action per row, never both.
   - **Quiz**: placeholder in this phase (engine lands in 05) showing the quiz count and
     a disabled CTA so the shape is visible and testable.
3. **3-way outcome on solve** (replaces the checkbox action when marking done):
   `Clean ✓` / `Hint` / `Couldn't` stored as one field `o` on the progress entry
   (`progress.ts` + `cloudProgress.ts` + rules v5 add `o` as an optional enum). Toggling
   undone clears it. This is the only data change in the phase and it is deliberately
   one field — no attempt history.
4. **Home (`#/`) redesign**: three blocks — *Continue* (last problem you touched, with
   time-in-video if applicable), *Today* (existing planner picks with reason chips from
   phase 08's vocabulary, computed here in its simplest form), *Weakest topic* card.
5. **Search** (`#/search?q=`): existing `sheet.ts` search across topics/subtopics/
   problems, with result grouping by topic and keyboard navigation.
6. **Breadcrumbs + prev/next topic** on the topic page; deep links preserved.
7. **Empty/edge handling**: topics with 3 problems (Maths) render a full page, not a
   stub; topics with no content show the "coming" state; 0-progress ring = 0.

### Out
Quiz execution (05) · video (06) · code panel (04) · statement text rendering lives in
03 (this phase renders it) · pattern-level tagging of individual problems.

## 4. Design spec

```
Topic card (comfortable density, desktop)
┌───────────────────────────────────────────────┐
│ Arrays                          ◔ 34%        │   ring 40px, tabular %
│ 46 problems · 12 Basic · 24 Core · 10 Pro     │
│ ⬤ two-pointers  ⬤ prefix sum  ⬤ sliding win. │   chips, muted
│ 14 clean · 6 hints · 4 couldn't · 2 due       │   state line
└───────────────────────────────────────────────┘
Phone: full-bleed card, ring inline right, chips wrap to one row with +N.
```

Topic header (desktop): title 28 px · subtitle counts · ring 56 px on the right ·
segmented control `Learn · Practice · Quiz` directly under the header, sticky on scroll.

Practice row (unchanged from 01) plus: outcome control appears on hover/focus for
not-done rows; done rows show the outcome glyph (`✓`/`◐`/`✗`) with the level bar.

## 5. File plan

```
NEW  src/topics/topicList.tsx        #/topics grid + card
NEW  src/topics/topicPage.tsx        #/topic/<id> header + tabs
NEW  src/topics/practiceList.tsx     learning-ordered rows, filters
NEW  src/topics/primerView.tsx       safe rich-text renderer (headings, lists, code, callouts)
NEW  src/topics/learnOrder.ts        ordering rules (pure, tested)
NEW  src/topics/searchScreen.tsx     #/search
NEW  src/app/homeScreen.tsx          Continue / Today / Weakest
EDIT src/sheet.ts                    expose groupByTopic + learningOrder + counts
EDIT src/progress.ts                 `o` field (clean|hint|couldnt) in the row shape
EDIT src/cloudProgress.ts            map `o` through merge + write
EDIT src/accountData.ts              markOutcome(topicId, problemId, outcome)
EDIT src/SheetList.tsx               outcome control, keep accessibility
EDIT src/App.tsx                     delete sheet-as-home; wire new routes
NEW  utils/firestore-rules + generator: allow `o`
NEW  e2e/topics.spec.ts, e2e/search.spec.ts
NEW  src/topics/*.test.ts
```

## 6. Data model change (one field)

```
users/{uid}/progressByTopic/{topicId}
  { [problemId]: { s: 'todo'|'done', b: bool, a, fd, lr, rc, o?: 'clean'|'hint'|'couldnt' } }
```
Rules v5: `o` optional, must be one of the three literals when present; absent when
`s === 'todo'`. Reader defaults missing `o` to `clean` for legacy rows. Backup v4
carries it; v1–v3 import unchanged.

## 7. Accessibility & performance
- Topic grid is a real list (`ul/li`) with links, not divs with click handlers.
- Ring has `role="img"` + `aria-label="Arrays: 34% learned"`; the percentage is also text.
- Tabs are a proper `tablist` with `aria-selected`, arrow-key roving focus.
- Learning-ordered practice list keeps `aria-posinset/aria-setsize` per subtopic group.
- Topic page LCP < 1.5 s on the mid-range profile with primaries inlined as static data.

## 8. Tests

| Kind | What |
|---|---|
| Unit | learningOrder determinism · counts per topic match `problems.json` (495) · outcome mapping · search grouping |
| Playwright | topics grid shows 20 · open Arrays → Learn · Practice filters · mark `Hint` → persists in a second profile (emulator) · quiz tab disabled state · search from `/` · breadcrumb back |
| Rules (emulator) | `o` accepted for the three literals, rejected for anything else, rejected when `s==='todo'` |
| Visual | topics grid + topic header + practice list × 2 viewports × 2 themes |

## 9. Risks
| Risk | Mitigation |
|---|---|
| Content missing at merge time | "coming" states designed first; every test asserts them |
| One-field change touching rules + backup | Do it in this PR with emulator tests; keep it optional so old clients never break |
| Learning order disputes | Ordering is a data field (`learnOrder`), not code — owner can edit JSON |
| Topic page becomes a kitchen sink | Hard cap: header + 3 tabs, nothing else |

## 10. Acceptance
`#/topics` shows all 20 with rings and counts · topic page has working Learn/Practice/
Quiz tabs · practice rows are in learning order with 3-way outcome · outcome survives a
fresh browser profile via emulator · search groups by topic · 0 axe violations ·
snapshots committed · 495-problem integrity test still green.

## 11. Exit
Owner approves the topic page as the beginner entry point; merges; phase 05 can start on
top of the placeholder tab while phase 03 content lands.
