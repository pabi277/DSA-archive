# Feedback report — why DSA Archive feels weak, and what to build next

**Date:** 2026-11-03 · **Branch reviewed:** `main` @ `a07cd62` (v1 complete, Phases 0–6)
**Scope:** discussion only — no code, no config, no commits changed by this report.
**Method:** source inspection (`file:line` evidence below) + external research on 2026
UI craft and spaced-repetition practice. I did **not** render the app (no
`node_modules`, no browser binary in this sandbox), so every visual claim is read
off `src/styles.css` and the TSX, not off a screenshot.

---

## 0. TL;DR — the honest read

You are not wrong, and it isn't a taste problem. Three things are true at once:

1. **The app is a well-engineered checklist, not a study tool.** It has 495 rows,
   filters, notes, lists, a planner and friends — but at no point does it *decide
   anything for you*. Every session starts with you scrolling and choosing.
   Power in a DSA tool is not "more features"; it's **"tell me what to do in the
   next 40 minutes, then run the loop for me."**
2. **The UI is generic because the design was frozen after one review of a
   phone-width mock, and the token freeze is a gate.** `src/styles.css:6` says the
   tokens are frozen and "changing one is a GATE". So the interface literally
   cannot improve without a deliberate decision to unfreeze. That is the root of
   "AI template with 0 work": the effort went into CI gates, not into craft.
3. **The ceiling is the data, not the code.** Each problem carries exactly six
   fields (`id, title, order, level, kind, links` — verified across all 495 rows).
   No pattern, no company, no LeetCode number, no prerequisites. No amount of UI
   polish can produce "show me everything that's monotonic stack" or "what does
   Google ask that I'm weak at" from that schema.

**The single highest-leverage move:** add one *default session screen* (one problem
at a time, timed, three outcomes) + a `⌘K` command palette + a pattern/company
layer on the catalogue. Those three convert this from "a sheet with checkboxes"
into something that feels like a product. Everything else in this report is
sequencing.

---

## 1. What the code actually says (evidence)

| # | Observation | Evidence |
|---|---|---|
| 1 | All 495 problem rows mount on first paint — `<details>` children are rendered in the DOM regardless of `open`, and there is no virtualization | `SheetList.tsx:161-209` (`TopicAccordion` maps rows unconditionally) |
| 2 | Each row has up to **8 interactive targets** (checkbox, star, 4 link chips, note, list) | `SheetList.tsx:45-127` |
| 3 | The row grid is `26px 1fr auto 34px`, actions wrap to a second line on phones → ~110px per row on a 390px screen | `styles.css:150`, `styles.css:277` |
| 4 | Only one keyboard shortcut exists in the entire app: `/` focuses search | `App.tsx:165-176` |
| 5 | There is **no routing** — the view is `useState`, filters aren't in the URL, back button does nothing, nothing is shareable/bookmarkable | `App.tsx:70-130` (no `history`/`pushState`/`hashchange` anywhere in `src/`) |
| 6 | The whole stylesheet contains **one** animated rule; zero `@keyframes` | `styles.css` (`grep -c "transition\|@keyframes\|animation"` → 1) |
| 7 | Tailwind is imported with `source(none)` and **zero utility classes are used** in any `.tsx`; daisyUI is a dependency but its components aren't used either — `.card`, `.btn`-equivalents etc. are hand-written | `styles.css:1`, `package.json:29-30`, all `className` occurrences are bespoke names |
| 8 | Revision is a fixed **3 → 7 → 21 day** ladder with a binary "Revised ✓" — no "I forgot", no rating, no time, no confidence | `planner.ts:24`, `PlannerViews.tsx:400-410` |
| 9 | "Attempts" (`a`) is only a counter incremented when a row *becomes* done; there is no attempt history, no timestamps, no outcome, no duration | `cloudProgress.ts:129,145,160` |
| 10 | Loading = a text line; empty states = a bordered glyph (`?`, `—`, `▤`); no skeletons, no toasts, no undo | `PlannerViews.tsx:163`, `App.tsx:407-410`, `styles.css:121` |
| 11 | Views are a 7-pill tab strip under a hero heading + 2-column card layout — the textbook "generated dashboard" grammar | `App.tsx:494-570`, `content-columns` `styles.css:126` |
| 12 | CI hard-caps CSS at 36 kB raw / 8.5 kB gzip and entry JS at 130 kB — adding a real interaction layer will fail CI | `tools/check-budgets.mjs:12-19` |
| 13 | Markdown renderer supports bold/italic/links/inline-code/lists/code-fence only — **no tables, ordered lists, task lists, blockquotes** | `markdown.ts:61-127` |
| 14 | Charts are plain CSS bars; heatmap is capped at 8 weeks and 390px wide | `styles.css:197-201`, README Phase 4 |

Nothing here is *broken*. It's all competent, tested, accessible, offline-first.
It's just that every decision optimised for "correct", and none optimised for
"feels like someone who studies built this".

---

## 2. Why it reads as "AI template with 0 work"

**Product layer**

- **No default action.** Opening the app lands you on a 495-row accordion. The
  strongest screen (Today) is tab #2 and is a *list of suggestions*, not a flow.
- **Binary state everywhere.** done / not done, revised / not revised. Real skill
  is a gradient: solved clean, solved with a hint, solved after 40 minutes,
  solved then forgot. The app can't tell the difference, so it can't coach.
- **Stats that can't say anything.** Streak + weekly counts + per-topic bars are
  *activity* metrics. They never answer "am I actually retaining this?"
- **Zero personalisation.** No target date, no target list, no company target, no
  hours/week. Nothing to be *ready* for, so no readiness score is possible.

**Interaction layer**

- No `⌘K`, no `j/k/x` triage, no bulk select, no saved views, no sort (not by
  difficulty, not by LeetCode number, not by "longest since revised"), no
  multi-select "move 12 problems into Monday".
- No undo. A mis-tap is permanent-ish and silent.
- No URL state → no bookmarkable "my Graphs queue", no back button, no share.

**Visual layer**

- One accent colour (`--accent`) is used simultaneously for primary buttons,
  "done" checks, progress bars and the heatmap. Colour therefore carries **zero
  information** — the classic tell of a generated UI.
- Every element is the same weight: 1px `#343a38` border, 12–16px radius, same
  padding. No elevation, no hairline-vs-solid distinction, no density change.
- Typography is `system-ui` at 15px with no type scale, no tabular numbers for
  stats (numbers jitter), no mono for levels/dates.
- No motion, no designed focus states, no skeletons.
- Copy is template voice: "DSA ARCHIVE · PERSONAL STUDY", "Your progress",
  "Loading today's plan…".

**The 2026 "this was generated" checklist — you currently trip 6 of 12**

Hero heading + eyebrow + subtitle · horizontal pill tab row · 2-column
content + sidebar card · identical bordered cards · one accent colour doing four
jobs · emoji/glyph placeholders in empty states · KPI tiles of equal weight ·
purple-blue gradient · glassmorphism everywhere · floating AI chat bubble ·
generic "Welcome back 👋" · no keyboard shortcuts.

Fixing 6, 7, 8, 11, 12 and 13 below is roughly a two-week craft sprint and it
changes more than any feature you could add.

---

## 3. The rethink — one sentence of positioning

> **Stop being a sheet you browse. Become an interview-readiness console that
> tells you what to do now, runs the loop, and proves you're retaining it.**

Three design principles that follow from it:

1. **One screen, one decision.** Today's default view is *one problem*, not 495
   rows. You can always open the full sheet — it's the reference, not the home.
2. **Every state is a gradient, not a checkbox.** Solved clean / hinted / failed;
   timed; rated. The data model should record reality so the scheduler and the
   insights have something to chew on.
3. **Quiet chrome, loud data.** Linear/Vercel/Stripe are the 2026 consensus for a
   tool you open daily: near-monochrome surfaces, one accent reserved for
   *action*, colour reserved for *meaning*, density as a user setting, keyboard
   before mouse. ([artofstyleframe](https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/), [adminlte](https://adminlte.io/blog/saas-dashboard-design-examples/))

---

## 4. What to add

### Part A — UI & craft rework (this is what fixes "outdated")

**A1. Replace the top-tab dashboard shell.** Desktop: 240px sidebar (collapsible
to 64px) with 5 primary destinations — *Today · Sheet · Review · Insights ·
Library* — plus Settings at the bottom. Mobile: a 4-item thumb-zone bottom bar.
Top bar keeps only the wordmark, sync state and the account avatar. Kill the
eyebrow/hero/subtitle stack and the 7-pill tab row (`App.tsx:494-570`) entirely.
*Why:* the current shell separates 7 peer tabs of wildly different weight, and
burns ~200px above the fold on every screen.

**A2. Type system.** Two families, self-hosted subsets: a variable UI sans
(Inter/Geist/Satoshi) and a mono (JetBrains Mono/Geist Mono) for numbers, dates,
levels and code. Introduce a real scale (11/12/13/14/16/20/28/40), `tabular-nums`
on every statistic, and 1.15–1.25 line-height for data rows. ~45 kB woff2 for the
UI subset. **This is a gate** — the frozen tokens say "system fonts only"
(`docs/UI-REFERENCE.md` Tokens). Worth re-opening: typography is 70% of the
"designed vs generated" judgement.

**A3. Semantic colour roles.** Split the single accent into five tokens:
`--action` (one saturated accent, only on the primary button per screen),
`--success` (solved), `--caution` (due/overdue), `--danger` (lapsed/again),
`--chart-1..3`. Keep dark-first, keep ≥4.5:1. Add 3 elevation levels and use
*low-alpha hairlines* for row separators instead of a solid `#343a38` grid.

**A4. Density setting.** Compact / Comfortable / Roomy, persisted per user
(38 / 48 / 62px rows). Power users demand it and it's the cheapest way to make
495 rows stop feeling like a phone book. ([adminlte](https://adminlte.io/blog/admin-dashboard-design/): "density is a user setting, not a philosophy")

**A5. Row anatomy v2.** One line, 38–44px: status edge-mark · title (single
line, ellipsis) · `#LC 207` monospace · pattern chip · level as a 3px coloured
bar (not a pill) · "12d" age · hover/focus cluster (`✓ ⏱ ★ ↗ ⋯`). Move
Practice/Article/Video/LeetCode from four 11px chips into one `⋯` menu + a
primary `↗ Solve`. Keep notes/lists in the `⋯` menu.

**A6. Motion with a job.** 120–180ms ease-out on state change; a real checkmark
animation on mark-done; `document.startViewTransition` for row↔detail and
tab↔tab; skeleton shimmer matching the real layout; all of it behind
`prefers-reduced-motion`. Currently: one transition in 355 lines.

**A7. Crafted states.** Skeleton loaders per screen (rows, cards, charts), designed
empty states with exactly one primary action and real illustrations (your own
SVG set — 6–8 glyphs), an undo toast on every destructive/marking action
(`Marked done · Undo`), inline field-level validation, and a designed 404 with a
useful link back. **Undo alone will make the app feel 10× more mature.**

**A8. Chart layer.** Hand-rolled SVG (budget-safe) or a ~10 kB micro-lib:
365-day contribution graph (not 8 weeks), forgetting curve per pattern, time-to-solve
trend line, time-of-day heat strip, per-topic radial or "mastery ribbon". No
chart should be a progress bar pretending.

**A9. A face.** Wordmark lockup + monogram + a real favicon set and OG image; a
short, human "why this exists" section; a changelog page. Cheap; hugely affects
the "someone built this deliberately" read.

---

### Part B — Power features, ranked

| # | Feature | Why it makes it powerful | Effort | Impact |
|---|---|---|---|---|
| **B1** | **Focus session ("Next")** — one problem, big; modes Learn / Practice / Review / Random; timer; outcomes *Solved clean · With a hint · Couldn't*; notes drawer; auto-advance | Removes the "what do I do now" cliff; it's the Anki/Duolingo loop and the reason those tools are sticky | 4–6 d | ★★★★★ |
| **B2** | **⌘K command palette** — jump to any problem/topic/view, run every action, "mark done", "start 30-min session", "filter: pro graphs" | The 2026 baseline for a pro tool; cheapest possible "this is real software" signal ([saasui.design](https://www.saasui.design/blog/7-saas-ui-design-trends-2026)) | 2–3 d | ★★★★★ |
| **B3** | **Pattern + company layer** — ~30 patterns per problem, LC number/slug, company tags, prerequisite edges | Unlocks pattern-first navigation, mastery scoring, pattern quizzes, company prep sets. The highest-leverage *data* change you can make | 5–8 d (mostly tagging) | ★★★★★ |
| **B4** | **Attempt log** — duration, outcome, confidence, mistake taxonomy (TLE / edge case / wrong pattern / off-by-one / complexity / syntax) | Turns "done" into evidence; feeds every insight and the scheduler | 3–4 d | ★★★★★ |
| **B5** | **FSRS scheduler** — 4-button grading (Again/Hard/Good/Easy), per-problem stability & difficulty, desired-retention slider, workload forecast | Fixed 3/7/21 ignores the problem's difficulty and your recall; FSRS is empirically ~20–30% fewer reviews at equal retention (~5.3% vs ~16.2% RMSE) ([ABC of FSRS](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS), [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)) | 4–6 d | ★★★★★ |
| **B6** | **Readiness score + plan** — target list + target date + hours/week → coverage × mastery × predicted retention × consistency, "days to finish at current pace", "next 20 recommended" | This is the number that makes the app *the* app. Needs B3+B4+B5 to be honest | 4–5 d | ★★★★☆ |
| **B7** | **URL state + deep links** — `#/t/graphs`, `#/p/topological-sort`, `#/review?due=today` | Back button, bookmarks, shareable queues, PWA shortcuts. Fixes a structural UX hole | 2–3 d | ★★★★☆ |
| **B8** | **Interview / mock mode** — pick 2 problems by company+pattern, 45-min timer, notes hidden, then a debrief form | Converts tracker → trainer; the thing people actually want from an interview-prep app | 3–4 d | ★★★★☆ |
| **B9** | **Weekly pattern test** — for each pattern you practised, one *different* problem that uses it; "which pattern is this?" quiz + solve report | Spaced *transfer* rather than spaced *repetition* — genuinely differentiates you ([shivangi00/dsa-tracker](https://github.com/shivangi00/dsa-tracker)) | 4–5 d | ★★★★☆ |
| **B10** | **Snippet review with active recall** — mask your saved code until you've attempted; language chips; syntax highlighting | You already store `snippet` (8 kB); make it a recall asset instead of dead text | 2–3 d | ★★★☆☆ |
| **B11** | **Notes → knowledge base** — template (Insight/Approach/Complexity/Pitfalls/Related), wiki-links between problems, backlinks, tags, search operators (`topic:graphs level:pro has:note is:stale`), extended markdown (tables, ordered lists, checkboxes, quotes) | The current renderer is 6 constructs (`markdown.ts:61-127`); power users write in these | 4–5 d | ★★★★☆ |
| **B12** | **Saved views / smart filters** — "Overdue & Pro", "Graphs I solved 30+ days ago", "Bookmarked but never attempted" as one-click chips | Turns the filter row into a workspace | 2 d | ★★★☆☆ |
| **B13** | **Bulk actions + multi-select** — shift-click range, `x` to toggle, "add 12 to Monday", "reset revision" | With 495 rows people plan in batches, not singles | 2–3 d | ★★★★☆ |
| **B14** | **Keyboard triage** — `j/k` move, `x` done, `s` star, `enter` open, `g t` go today, `?` shortcuts sheet | Same reason as B2 | 1–2 d | ★★★★☆ |
| **B15** | **Multi-curriculum targets** — A2Z 495 (default) + NeetCode 150 + Blind 75 + company sets + your own custom lists as first-class curricula with separate progress | One fixed sheet is limiting; readiness must be relative to a target | 3–4 d | ★★★★☆ |
| **B16** | **Insights that are true** — slowest patterns, "you're 2.3× slower on DP than your own baseline", leeches ("failed 4×"), retention by topic, best study hours, "hardest 20 you've never revised" | Activity metrics → learning metrics | 3–4 d | ★★★★☆ |
| **B17** | **Onboarding wizard** — pick target/timeline/hours → generates the first plan | First-run is currently a 495-row wall; this is where a product earns trust | 2 d | ★★★☆☆ |
| **B18** | **Import** — CSV / JSON (you have JSON), plus a "LeetCode slug list" importer; *avoid* scraping LeetCode (ToS + anti-bot) | Reduces switching cost | 1–2 d | ★★★☆☆ |
| **B19** | **Streak that means something** — "study integrity" (planned vs completed sessions), recovery days, no punitive resets | Current streak punishes rest days, which is why people quit trackers | 1–2 d | ★★★☆☆ |

---

### Part C — Data layer (do this before B3/B6/B9, it blocks them)

Extend each row in `data/problems.json` (schema v2, additive, backups stay
compatible):

```json
{
  "id": "topological-sort", "title": "…", "level": "pro",
  "lc": { "number": 207, "slug": "course-schedule" },
  "patterns": ["graph-topological-sort", "graph-cycle-detection"],
  "companies": ["google", "amazon"],
  "prereqs": ["bfs-dfs-traversal"],
  "estMinutes": 35,
  "tags": ["classic", "must-do"]
}
```

Practicalities: keep `data/problems.json` as the single git-managed source (it
already is); bump `schemaVersion` to 2 and add a validator rule in
`tools/validate_data.py`; **tag incrementally** — start with the ~120 "must-do"
problems, which is enough for pattern views, quizzes and readiness to feel alive.
Pattern taxonomy should be yours (~30 canonical patterns: two-pointers, sliding
window, prefix-sum, binary-search-on-answer, monotonic stack, heap/top-k,
intervals, backtracking, tree DFS/BFS, BST invariants, trie, union-find,
topo-sort, dijkstra, MST, 1-D DP, knapsack, LIS, interval DP, bitmask DP,
greedy-exchange, math/number-theory, …). Company tags are factual metadata — fine
to derive from public interview lists, but treat them as *approximate* and label
them so (they drift year to year).

Also: split the monolith. `App.tsx` is 988 lines and holds views, filters,
keyboard, panels and layout. With B1/B2/B7 added it becomes unmaintainable —
introduce routes + per-view modules first.

---

### Part D — Learning science the app is currently ignoring

- **Active recall > re-reading.** Hiding your own note/solution during review is
  the single biggest multiplier you're not using (you store the solution in
  `snippet` and always show it).
- **Desirable difficulty / interleaving.** Review queues should mix patterns, not
  run topic-by-topic. "Today" currently suggests by weakness score only.
- **Rating-based scheduling.** A binary "Revised ✓" can't distinguish "instant"
  from "barely". Four ratings cost two extra buttons and buy a real model.
- **Workload forecasting.** Show tomorrow's review count *before* it happens;
  retention 90% vs 95% roughly doubles the load — make that trade-off explicit
  (Anki/FSRS practice).
- **Cold recall gate.** Only call a problem "mastered" when solved *unaided, from
  scratch, after a gap* — otherwise you're measuring familiarity, not skill.

---

### Part E — Platform / quality

- **Performance:** virtualize the sheet (or let `<details>` render lazily) — today
  all 495 rows mount. Target <2s TTI on a mid-range phone and instant filter
  keystroke→paint.
- **Optimistic writes + undo queue** — you already have IndexedDB persistence;
  surface it as confidence instead of a "syncing" dot.
- **Search:** fuzzy + operators + recents; today it's a substring match on title/
  subtopic/topic (`sheet.ts:52-60`).
- **Offline:** already excellent — keep it; add "offline mode" affordance and
  "your queue is available offline" on the Today screen.
- **PWA shortcuts / share target** — long-press the icon → *Review due · Random ·
  Today*.
- **Testing:** add Playwright visual snapshots (phone/desktop × dark/light) as the
  guardrail for the redesign; keep the axe + rules suites as-is.
- **CI budgets must be re-baselined** on purpose (see §7), not quietly raised.

---

## 5. What NOT to add (protect the scope)

- **A code judge / in-browser IDE.** Enormous surface, zero differentiation, and
  it's already parked in the roadmap for good reason.
- **An AI chat bubble.** It is the #1 "generated app" tell in 2026, needs Blaze or
  a key to be real, and would sit on top of a UI that hasn't earned it. If AI ever
  lands, make it a **designed surface** (e.g. "explain my wrong approach" inside
  the debrief, with citations to your own notes), not a floating widget.
- **Public leaderboards / social feeds / signup at scale.** Invited friends only —
  that decision is right; keep it.
- **Glassmorphism, gradient heroes, 4 equal KPI cards, emoji iconography.**
- **Cloud Functions / Storage / Realtime DB** — still a gate; the client-side
  FSRS + sharded docs design means you don't need them.

---

## 6. Proposed v2 roadmap (3 sprints, ~5 weeks)

**Sprint 1 — "It feels like software" (≈10–12 days).** No new domain logic.
A1 shell · A2 type · A3 colour · A4 density · A5 rows · A6 motion · A7 states/undo
· B2 ⌘K · B7 URL state · B14 keyboard triage · visual snapshots in CI.
*Acceptance:* open on a phone → one primary destination, no scroll-to-find
navigation; every action undoable; `⌘K` reaches every view and action; the sheet
scrolls at 60fps with all topics closed; screenshots baseline committed.

**Sprint 2 — "It trains you" (≈10–14 days).**
B1 focus session · B4 attempt log · B5 FSRS (client-side `ts-fsrs`, MIT) ·
B10 snippet recall · B3 (first 120 problems tagged).
*Acceptance:* a full session runs start→finish without touching the sheet; every
attempt stores duration/outcome/mistake; the review queue is generated by FSRS
with a visible forecast; "again" reschedules to tomorrow, "easy" pushes out.

**Sprint 3 — "It knows you" (≈10–12 days).**
B6 readiness + plan · B16 insights · B9 weekly pattern test · B8 mock mode ·
B12 saved views · B15 curricula · B17 onboarding.
*Acceptance:* one composite readiness number with a visible breakdown; a "next 20"
list that a user would actually follow; the weekly test pulls *different* problems
for the same pattern; onboarding produces a plan from target + date + hours.

Deliberately deferred: B11 (notes KB), B13 (bulk), B18, B19 — they're additive and
lower leverage than the three themes above.

---

## 7. Gates you must consciously re-open (this is why it stalled)

Your `rule.md` treats all of these as GATEs, which is why the UI never improved:

| Gate | Why it matters | Suggested decision |
|---|---|---|
| **Frozen design tokens** (`styles.css:6`, `UI-REFERENCE.md`) | Blocks A2/A3/A4/A5 wholesale | Re-freeze **v2** tokens once, after a proper multi-screen mock review — not per-value gates |
| **System fonts only** | Blocks the single biggest "designed" upgrade | Allow 2 self-hosted variable subsets (~45 kB); add to the CSS/asset budget explicitly |
| **CI budgets** (`check-budgets.mjs:12-19`) | Every UI improvement fails CI | Re-baseline to ~60 kB CSS raw / 18 kB gzip, entry JS 180 kB raw / 55 kB gzip, with a rationale recorded |
| **Tailwind/daisyUI in `package.json` but unused** | Two design systems, neither used | Decide: either go all-in on utilities (and then use them) or drop both and keep the bespoke token CSS. Right now it's the worst of both |
| **"No AI" clause** | Fine — but it also blocks the *good* version | Keep AI out; if it returns, scope it to one designed debrief surface with a free-tier-safe key story |
| **One phase per chat + PR per phase** | Process overhead per increment is why craft never happened | Allow one "craft sprint" PR where the acceptance test is *feel*, not a feature count |

---

## 8. Risks

- **Tagging is the real cost.** ~495 × patterns/companies is days of work. Mitigate:
  ship patterns for the must-do 120 first; make the UI degrade gracefully when
  metadata is absent.
- **FSRS migration.** Existing rows only have `rc: 0..3`. Map `rc` → initial
  stability so nobody loses their schedule; keep the old ladder as a fallback for
  rows without FSRS state.
- **Schema churn.** Backups are at v3; a v4 with `attempts`/`fsrs` needs an import
  path (you already did this for v1→v3 — keep the pattern).
- **Scope creep into an IDE.** The focus session must stay "open LeetCode in a new
  tab, log the outcome here". The moment you host code, the project dies.
- **Redesign without a visual baseline.** Add Playwright screenshot baselines
  *before* Sprint 1, or you'll regress accessibility/dark-light silently.

---

## 9. The five things to do first, in order

1. **Undo + toasts + skeletons** (2 days) — cheapest perceived-quality jump.
2. **Shell redesign + type scale + semantic colour** (4 days) — this is the
   "outdated" fix.
3. **⌘K + URL state + `j/k/x`** (4 days) — this is the "not powerful" fix, part 1.
4. **Focus session + attempt log + timer** (6 days) — this is the "not powerful"
   fix, part 2, and the reason people come back daily.
5. **FSRS + pattern tags on 120 problems + readiness score** (10 days) — this is
   what nobody else in your friend group will have.

Everything after that is depth.

---

## 10. Sources

- 2026 dashboard/layout consensus (sidebar shell, density, colour = meaning):
  [artofstyleframe — dashboard patterns](https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/),
  [adminlte — SaaS dashboard trends](https://adminlte.io/blog/saas-dashboard-design-examples/),
  [adminlte — admin dashboard principles](https://adminlte.io/blog/admin-dashboard-design/)
- 2026 interaction expectations (command palette, keyboard-first, dark-first,
  AI-native surfaces): [saasui.design](https://www.saasui.design/blog/7-saas-ui-design-trends-2026),
  [gleamstudio — UI trends 2026](https://www.gleamstudio.design/blog-post/ui-design-trends-2026)
- FSRS vs SM-2, retention targets, workload: [ABC of FSRS](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS),
  [deckbase FSRS guide](https://www.deckbase.co/resources/fsrs-guide)
- Client-side FSRS in TypeScript (MIT, no server — Spark-safe): [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- Prior art worth studying for feature shape (not code): [shivangi00/dsa-tracker](https://github.com/shivangi00/dsa-tracker)
  (weekly pattern transfer tests, adaptive SRS), [Dhruv-1309/dsa-tracker](https://github.com/Dhruv-1309/dsa-tracker)
  (attempt logging, mistake taxonomy), [452Harsh/patternwise](https://github.com/452Harsh/patternwise)
  (pattern workspace, readiness score, mock interviews)

---

*This report changes nothing in the repository. Say the word and I'll turn any
slice of it into a gated phase plan (scope, data-model delta, acceptance test,
gates to re-open) before a single line is written.*
