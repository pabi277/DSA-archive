# The "smart" layer — features that make it feel intelligent (and look it)

**Date:** 2026-11-03 · **Status:** discussion only (no code changed)
**Companion to:** `FEEDBACK-v2-REPORT.md` (craft + power), `FEEDBACK-video-theatre.md` (media)

---

## 0. The rule this whole document follows

> **Smart = it knew something about you that you hadn't computed, and it can prove it
> in one sentence. No chat box, no "AI insights", no spinner labelled "thinking".**

Three constraints that make it *actually* smart instead of "AI-flavoured":

1. **Deterministic.** Every number is a pure function of your own progress entries.
   Same data in → same answer out. No model drift, no key, no cost, no Blaze.
2. **Explainable.** Every recommendation carries its reason, in ≤12 words, from a
   fixed vocabulary: *overdue · failed 3× · prerequisite gap · your slowest pattern ·
   untouched 41 days · next in your target list*.
3. **Computed on-device.** Prerequisite: your `CloudProgressByTopic` already holds
   `s, b, a, fd, lr, rc`. Everything below derives from that + timestamps. **Zero
   extra Firestore reads/writes**, works offline, honest when offline.

That is the difference between "looks smart" and "is decorative".

---

## 1. The one number: **Readiness** (0–100)

The screen hero. Not a streak, not a percentage of 495.

```
coverage   = solved_weight / total_weight              // weight: basic 1, core 1.5, pro 2
mastery    = Σ tier_weight(solved) / Σ weight(solved)   // tier 0–5, see §2
retention  = mean predicted_recall(today) over solved  // FSRS forgetting curve
consistency= active_days_last_28 / 28                  // capped, penalises gaps not rest
─────────────
readiness  = 100 × (0.35·coverage + 0.30·mastery + 0.25·retention + 0.10·consistency)
```

Display as a ring with the number inside, and underneath **one line of the biggest
drag** — not a paragraph:

> `Readiness 62 · biggest drag: retention 41% on Graphs (you solved 18, recall 9)`

Why it works: it's the only number that goes *down* when you stop revising, which
makes it feel alive rather than a counter. And because it's a weighted blend, a user
can read why it moved: `+3 · solved 4 core problems`, `−2 · nothing revised in 9 days`.

**Sub-line variants by state** (the copy is the feature):
- New user: `Readiness 8 · 12 of 495 solved, no revisions yet — start the 14-day plan`
- Plateau: `Readiness 58 · flat 11 days — 4 patterns still untested`
- Crunch: `Readiness 74 · 9 days to your target date · 96% on track`

---

## 2. **Mastery tiers** (0–5) instead of a checkbox

| Tier | Name | Earned when |
|---|---|---|
| 0 | Untouched | — |
| 1 | Seen | opened the article/video or attempted once |
| 2 | Solved | marked solved once |
| 3 | Independent | solved clean (no hint) at least once |
| 4 | Retained | passed a *cold recall* 7+ days later (tier never decays from 4) |
| 5 | Durable | passed 2 cold recalls ≥21 days apart **and** a different problem with the same pattern |

Every row shows a 5-segment tick, not a checkbox. Every tier change is logged with
the reason. This single change is why the app can say "you've solved it but you don't
know it" — the exact thing that makes a tracker feel dumb today.

**Cold recall gate** = the honest test: notes hidden, timer running, ≥7 days since
last touch. Passing it is the only path to tier 4+.

---

## 3. **Trajectory** — "when will I actually finish?"

```
pace        = median problems/day over the last 14 active days
remaining   = target_total − tier≥2 count
eta_days    = remaining / pace
finish_by   = today + eta_days
on_track    = finish_by ≤ target_date
```

Shown as a tiny 14-day sparkline + `ETA Nov 28 · 4 days ahead of your Dec 2 target`.
If pace is 0 for 5+ days: `Pace 0 — you need 3.4/day to hit Dec 2`. No nagging, no
exclamation marks, just the arithmetic. Users trust a number that will tell them
they're behind.

Add the **workload forecast** (from FSRS): a 14-bar mini chart of *reviews due per
day*. The single most "this thing is thinking" element in the entire app — reviewers
plan their week around it.

---

## 4. **Weak-pattern radar** (needs pattern tags, main report Part C)

Rank patterns by a single weakness score:

```
weakness = 0.4·fail_rate + 0.3·(1 − timed_pass_rate) + 0.2·forget_rate + 0.1·untouched_days/30
```

Show the top 3 as chips with a reason: `Monotonic stack — failed 3 of 4 · 2 leeches`.
Click → that pattern's problems, sorted by "most likely to teach you something".

Its pair is the **leech detector**: any problem you've failed twice is flagged and
rescheduled differently (shorter interval, shown with the *reason*, and offered a
"watch first" alternative). Anki users know leeches; nobody expects a DSA sheet to
have them. That's the flex.

**Prerequisite gap detector:** if you're attempting DP but `Recursion` is tier ≤2,
say so *once*, inline, before the problem — `DP assumes recursion — 6 of 22 recursion
rows are tier ≤2`. Not a blocker, just a fact you didn't compute yourself.

---

## 5. **"Why this?" — the trust move**

Every suggestion, every row in the queue, every plan slot gets a reason chip from
the fixed vocabulary. And a **"Why?" disclosure** on the whole plan:

```
Today · 5 problems · 2h 10m estimated
1. Course Schedule          overdue 2d · graph pattern, 3rd fail
2. Longest Substring        next in your target list
3. Word Break               cold recall due (21d)
4. 3Sum                     pattern buddy — you failed its sibling
5. Clone Graph              weak pattern top-up
```

Plus a hidden-ish **"How this plan was made"** panel (in Settings or behind `?`):
the exact weights, the exact inputs, and what would change the plan. Nobody else in
your friend group will have an app that admits its own reasoning. It also kills the
"AI magic" aftertaste, because everything is auditable.

---

## 6. **Session autopilot** — what to do with the next N minutes

One control at the top of Today: `20 min · 40 min · 90 min`. The app then answers:

| Time | Plan |
|---|---|
| **20 min** | 2 due reviews + 1 new basic (estimated 19 min) |
| **40 min** | 3 reviews, 1 core, 1 pattern top-up (38 min) |
| **90 min** | 2 reviews, 1 pro, mock-mode pair, 15 min notes pass (88 min) |

Rules that make it feel intelligent, all deterministic:
- Never two problems of the same pattern in a row (**interleaving**).
- Front-load overdue (they decay fastest) but cap overdue at 40% of the session.
- Deadline-aware: if `target_date` is < 14 days away, bias to target-list coverage.
- **Energy-aware** (optional, one toggle): if your historical solve rate after 22:00
  is < half your morning rate, prefer lightweight rows at night. Show the evidence
  line: `your evening solve rate is 38% vs 71% in the morning`.

---

## 7. **Personal par** — "you are 2.3× slower here than usual"

From the attempt log (main report B4):
```
par(pattern) = median time-to-solve for you in that pattern
score        = solved_time / par(pattern)
```
Show on solve: `Solved in 18m · your par for Graphs 12m (1.5×)`.
Over time: the **time-to-solve trend** per pattern with a fitted line — the single
most motivating chart a serious prep tool can show, and it's trivially honest.

---

## 8. **Calibration** — the feature nobody has

You estimate before you attempt (`this'll take 15m`, `confidence: high`) and the app
compares to reality over 20 attempts:

> `You underestimate pro problems by 42% and overestimate your DP confidence by 2 tiers.`

This is a genuine skill, it's measurable, and it's *the* interview-relevant signal.
Three taps per attempt, one chart, enormous perceived intelligence. It's also the
perfect "smart screen" payload — a calibration scatter/curve is visually striking
(predicted vs actual diagonal, points hugging or drifting off it).

---

## 9. **Streak that respects rest** (replaces the punitive one)

```
integrity = completed_plan_slots / planned_slots   (7-day window, min 3 planned)
momentum  = decayed activity: Σ 0.9^(days_ago) per active day
```
Displayed as **Momentum 7.2 / 10** + `4 study days this week · 1 rest day earned`.
A rest-day budget (e.g. 1 per 6 active) removes the "streak anxiety" that makes
people abandon trackers, while still rewarding consistency. Copy does the work:
`Rest day used · momentum holds at 6.8`.

---

## 10. Small smart surfaces (cheap, high density of "oh, nice")

| Surface | Behaviour |
|---|---|
| **Similar problems** | "Problems like this" — same pattern, adjacent difficulty, not yet mastered (`5 siblings · 2 mastered`) |
| **Forgotten-done detector** | `You marked 6 problems done in July and never revised them.` One button: "Put them in this week" |
| **Stale notes** | `3 notes older than 60 days on patterns you've since failed` → flagged for a rewrite pass |
| **Best window** | `Your best solve window is 09:00–11:00 (68% clean)` → Today offers "Plan for 09:30" |
| **Plan vs reality** | `Planned 5, completed 3, average 2.9/day for 3 weeks` → auto-suggests goal 3 |
| **Goal auto-tune** | If goal > 1.4× your 21-day median, quietly propose lowering it (opt-in) |
| **Duplicate-topic guard** | `You've spent 12 of 14 days on Graphs — 16 patterns untouched` |
| **Target-date math** | `At 3/day you finish Nov 28; at 2/day, Dec 9 (7 days past target)` |
| **Jump-back** | "You were here 3 days ago: 3Sum, note open, video at 09:12" (deep link) |
| **Cold-start intelligence** | Day 1 has no data, so it says so: `Pick 3 topics to start — we'll learn your pace from there` (and actually does) |

---

## 11. What makes it *look* smart (craft rules, not features)

| Rule | Do | Don't |
|---|---|---|
| One hero metric | Readiness ring + delta + drag line | 4 equal KPI cards |
| Numbers | `font-variant-numeric: tabular-nums`, mono for units, right-aligned columns | proportional digits that jitter on update |
| Deltas | `▲ 3 vs last week` with an arrow + text, colour secondary to the glyph | green/red only |
| Charts | sparkline under the number, 1px baseline, no gridlines, no legend for <3 series | pie charts, gradients, drop shadows |
| Explanations | one short reason chip (`overdue 2d`) | tooltip-only reasoning |
| Density | 38–44px rows, one line each, expand for detail | cards inside cards |
| Emphasis | colour = meaning only; one accent for action | accent on 4 roles |
| Copy | facts and arithmetic (`0.8/day needed`) | cheerleading (`You got this! 🔥`) |
| Emoji | none (except a single ✓) | 🔥💪🚀 |
| Motion | 120–180ms, only to explain a change | decorative animation |
| Trust | "How this was made" panel | black-box "AI power" |
| Loading | skeletons shaped like the result | spinners |
| Empty states | one fact + one action | illustration with no next step |

**The "smart" screenshot test:** cover the logo. Can a stranger tell *which* product
this is and *what* it thinks about them? If yes, the design is smart. Currently:
seven equal tabs and a "Your progress" card → no.

---

## 12. Screens that carry the intelligence (surface map)

| Screen | Smart elements |
|---|---|
| **Today** | Time-budget autopilot, plan with reason chips, "How this plan was made", jump-back |
| **Next (focus)** | One problem, timer vs par, estimate prompt, cold-recall gate, outcome buttons |
| **Review** | Workload forecast (14 days), leeches section, retention column, one-tap grading (Again/Hard/Good/Easy) |
| **Insights** | Readiness breakdown, trajectory + ETA, weak-pattern radar, calibration chart, time-to-solve trends, retention heat |
| **Sheet** | Mastery ticks (0–5), stale/leech badges, similarity drawer, prerequisite warning |
| **Settings** | Retention target slider (85/90/95 → shows the workload trade-off live), calibration on/off, rest-day budget |

---

## 13. Guardrails — how this fails

- **Fake precision.** Never show 3 decimals, never a % without a denominator. Round,
  and say `≈`.
- **Advice without action.** Every insight chip must be clickable to the exact rows
  it's talking about. No dead metrics.
- **Nagging.** At most one nudge per screen, and it must be arithmetic, not a
  judgement (`2.1/day needed`, not `Falling behind`).
- **Data starvation.** Everything must degrade gracefully with <7 days of data —
  that's most of a new user's first week. Cold-start copy is part of the feature.
- **Timezone.** Day keys already local (`planner.ts:100`). Keep every derived metric
  on local day keys, never UTC, or "today" lies at 5:30am IST.
- **Recompute cost.** All of §1–§10 is O(solved rows) ≈ 500 items — microseconds.
  Memoise per progress-version; never recompute in render loops.

---

## 14. Build order (fits the existing 3 sprints)

| Sprint | Add | New work |
|---|---|---|
| 1 (craft) | Mastery ticks + reason chips + tabular numbers + readiness ring *shell* | small; uses existing fields |
| 2 (train) | Attempt log → cold-recall gate, par, calibration, leech detector, session autopilot | medium; needs B4 not FSRS-first |
| 3 (know) | Readiness blend, trajectory/ETA, weak-pattern radar (needs tags), workload forecast (needs FSRS), insights screen | the payoff sprint |

**Cheapest first three if you want quick wins:** reason chips on the plan (½ day) →
mastery ticks (1 day) → trajectory + ETA (1 day). All three are visible on day one,
all three need no new data.

---

## 15. The five to add first

1. **Mastery tiers 0–5** — replaces the checkbox that makes everything feel like a
   to-do list.
2. **Reason chips + "How this plan was made"** — trust, and the cheapest "it thinks"
   illusion that is actually true.
3. **Readiness ring with the biggest-drag line** — one number that moves.
4. **Trajectory / ETA vs your target date** — turns a sheet into a plan.
5. **Session autopilot (20/40/90)** — the whole product in one control.

Everything after that is depth: calibration, par, leeches, workload forecast,
prerequisite gaps.

---

*Nothing in the repository changed. Say which of §15 you want and I'll write the
phase plan (formulas frozen, acceptance tests, data deltas) — still no product code
until you say go.*
