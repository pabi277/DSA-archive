# Phase 08 — Light insight layer (cheap, honest, explainable)

**Folder:** `docs/phases-v2/08-insights-light/`
**Estimate:** 4–5 days · **Depends on:** 01, 02, 05 (quiz badge), 06 (stamps) · **Blocks:** nothing
**Owner decision:** the expensive analytics were dropped. This phase keeps only what is
cheap, deterministic and provable in one sentence.

---

## 1. Charter

Make the app explain itself. Every recommendation carries a reason from a fixed
vocabulary; every screen has at most one nudge that is arithmetic rather than a
judgement; the Today plan can show **how it was made**; the streak becomes a *momentum*
that tolerates rest. **No readiness score, no FSRS, no ETA model, no calibration.**

## 2. Current state (evidence)

| Fact | Evidence |
|---|---|
| Suggestions exist but give no reasons | `planner.ts:367` (`suggestedPicks`) |
| Streak punishes rest days | `planner.ts:240` (`streakInfo` — consecutive active days) |
| Today shows a goal but no pace/target | `planner.ts:339` (`todayTally`) |
| No target date, no target list setting | `settings.ts` (theme, goal, hideDone, largeText only) |
| Custom lists already exist (reusable as a target) | `library.ts` (`CustomList`) |

## 3. Scope

### In
1. **Reason vocabulary** (single source of truth, ~9 reasons):
   `overdue 2d` · `due today` · `first solve` · `next in your target` · `shaky —
   couldn't last time` · `weakest topic` · `not touched 41d` · `quiz to pass` ·
   `buddy of <problem>` (same subtopic, unsolved).
   `src/insights/reasons.ts` — pure function `reasonsFor(problemId, progress, plan,
   today, target)` → ordered reasons (max 2 shown, all in the tooltip/palette).
2. **Reason chips everywhere**: Today list, autopilot suggestion, topic practice rows
   (only where a reason exists), palette entries. Chip = text, muted, no colour meaning.
3. **"How this plan was made"** — a disclosure on Today showing the exact inputs
   (goal, due count, weakest topic, target list/date) and the four rules applied, in
   plain words. Also lists what would change it (`raise goal to 6`, `add a target date`).
4. **Momentum replaces the punitive streak**:
   ```
   momentum = round(10 × (Σ over last 14 days of 0.9^daysAgo × active(day)) / 10max, 1)
   perDay   = active days in last 7 (text)
   rest     = "rest day used" when 0 study days but the 7-day plan quota is met
   ```
   Displayed as `Momentum 7.2` + `4 study days this week` + optional `rest day earned`.
   No colour; no flame emoji; it decays slowly rather than resetting to zero.
5. **Trajectory, one line** (not a model):
   `pace = median(problems/day over last 14 active days)`; if a target date exists →
   `At 2.1/day you finish Nov 28 (6 days ahead of Dec 2)`, else
   `At 2.1/day you'll finish the sheet in ~7 months`. If pace is 0 for 5+ days:
   `Needs 3.4/day to hit Dec 2`. Deterministic, no forecast chart.
6. **Settings additions**: `targetDate` (optional ISO day), `targetListId` (optional —
   reuses phase-3 custom lists), both sanitised; used by reasons + trajectory + plan
   bias (deadline <14 days → the plan prefers unsolved target-list rows).
7. **Two honest detectors** (each one action):
   - **Forgotten done**: `6 problems marked done 30+ days ago and never revised` →
     "Add to this week" (writes plan slots, undoable).
   - **Stale code**: `3 saved solutions on problems you later marked "couldn't"` →
     "Open in Code" (filtered `#/code`).
8. **Plan vs reality, read-only**: `Planned 5 · completed 3 · median 2.9/day over 3 weeks`
   with a single optional action `Set goal to 3` (never automatic).

### Out (recorded so nobody re-adds them by accident)
Readiness score · FSRS/retention math · calibration · per-pattern time-to-solve ("par") ·
weak-pattern radar (needs full pattern tagging) · workload forecast · best-hours analysis
(no reliable time-of-day data yet) · any AI summary · charts beyond a 14-bar momentum
strip and the existing heatmap.

## 4. Design spec

```
Today
┌ Today · 5 problems · ≈2h 10m ────────────────────── Momentum 7.2 ─┐
│ 1  Course Schedule      overdue 2d · couldn't last time           │
│ 2  Longest Substring    next in your target                       │
│ 3  Word Break           due today · quiz to pass                  │
│ …                                                                  │
│ ▸ How this plan was made                                           │
│ At 2.1/day you finish Nov 28 · 6 days ahead of Dec 2              │
└────────────────────────────────────────────────────────────────────┘
```
"How this plan was made" panel: 4 numbered rules + the inputs, monospace numbers,
no prose. Detectors appear as a single muted row above the list, dismissible for the day.

## 5. File plan

```
NEW  src/insights/reasons.ts        vocabulary + reasonsFor() (pure, tested)
NEW  src/insights/reasons.test.ts   table-driven cases
NEW  src/insights/momentum.ts       momentum + perDay + rest (pure)
NEW  src/insights/trajectory.ts     pace, finish line, "needs X/day" (pure)
NEW  src/insights/detectors.ts      forgotten-done, stale-code (pure)
NEW  src/insights/insightsScreen.tsx  #/insights (momentum strip, trajectory, detectors)
NEW  src/insights/howPlanWasMade.tsx  disclosure component
EDIT src/planner.ts                 suggestedPicks returns reasons; no behaviour change to schedule
EDIT src/PlannerViews.tsx           chips, momentum, disclosure, detectors row
EDIT src/settings.ts                targetDate, targetListId (+ sanitise + defaults)
EDIT src/topics/practiceList.tsx    chips where a reason exists
EDIT src/app/commandPalette.tsx     show reasons in results
EDIT src/backup.ts (v4 field pass)  targetDate/targetListId ride along in settings
NEW  e2e/insights.spec.ts
```

## 6. Data model
`users/{uid}` profile settings gain two optional fields (`targetDate`,
`targetListId`). No new collections, **no extra reads** — everything is derived from
progress already in memory. Rules v5 already validate a settings whitelist; extend it
with the two fields and add one emulator test each (valid, malformed rejected).

## 7. Accessibility & performance
- Chips are plain text in a `<span>` (not buttons) unless they open something.
- Momentum strip: `role="img"` + a text equivalent sentence.
- The disclosure is a native `<details>`; keyboard reachable; state announced.
- All derivations memoised per progress-version; O(solved rows) ≈ 500 — microseconds.
- Detectors compute once per mount, never in render loops.

## 8. Tests
| Kind | What |
|---|---|
| Unit | reasonsFor table (9 reasons × edge cases) · momentum with gaps/rest · trajectory with 0/1/median pace · detectors thresholds |
| Playwright | chips visible on Today · disclosure opens and lists inputs · detector action writes plan slots + undo · goal suggestion appears only when reality < plan |
| Rules (emulator) | targetDate/targetListId accepted, malformed rejected |
| Visual | Today with chips, disclosure open, #/insights |

## 9. Risks
| Risk | Mitigation |
|---|---|
| Reason chips become noise | Max 2 per row; only when a reason exists; muted styling |
| Momentum feels like a streak in disguise | Decays instead of resetting, and shows "rest day earned" |
| Target date creates nagging | One line, arithmetic only, no colour, no banners |
| Detector actions cause bulk surprise writes | Preview count in the action label, single undo group |
| Scope creep back into analytics | The "Out" list above is part of the acceptance test |

## 10. Acceptance
Every Today row shows ≤2 reasons from the fixed vocabulary · "How this plan was made"
lists the real inputs · momentum never resets to zero on a rest day · trajectory is one
sentence and matches a hand-computed example in tests · both detectors work with undo ·
no readiness/FSRS/calibration code exists anywhere · 0 axe violations.

## 11. Exit
Owner confirms the copy reads like a person ("facts, not cheerleading"), merges.
