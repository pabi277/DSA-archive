# Changelog

All notable changes to **DSA Archive**. This file is written for the person *using*
the app, not for the build log: what you can now do, what changed under you, and
what was deliberately left out. Version numbers refer to the whole v2 programme
(phases 01–10 in [`docs/phases-v2/`](phases-v2/README.md)); dates are the day the
phase closed.

- **Rules / backup versions shipped at 2.0.0:** Firestore security rules **v9**,
  backup schema **v8** (schemas 1–7 still import).
- Nothing in this release was deployed. Deploying is the owner's command; the steps
  are in [`RELEASE-RUNBOOK.md`](RELEASE-RUNBOOK.md).

---

## 2.0.0 — v2 "beginner-first workspace" (2026-11-05)

v2 keeps everything v1 had (495 rows, 20 topics, Google sign-in, synced progress,
planner, revision, friends, offline PWA) and turns the app around the beginner:
every topic is a page you can read, every problem can be run on your own machine-
class toolchain, every quiz explains itself, and every recommendation says why.

### Today — a plan that reasons instead of scoring you

- **Momentum replaces the streak.** `Momentum 5.9 · 5 study days this week` is
  `Σ 0.9^daysAgo × active(day)` over 14 days, scaled to 10. It decays and never
  resets to zero, so one missed day is not a punishment. A rest day is *earned* —
  stated only when you have 0 solves today **and** ≥5 study days in the last 7.
- **Reason chips on every recommendation.** At most two quiet chips per row, from a
  fixed nine-item vocabulary: `overdue 2d`, `due today`, `first solve`,
  `next in your target`, `shaky — couldn't last time`, `weakest topic`,
  `not touched 41d`, `quiz to pass`, `buddy of <problem>`. The tooltip carries the
  rest. The same chips appear on the suggested picks, the topic Practice rows and
  every ⌘K result.
- **"How this plan was made"** is a disclosure under Today's picks: the four rules
  that shaped the list and the real inputs (goal, weakest topic, the revision queue).
- **Plan vs reality, with one tap.** `Planned 3 · completed 1 · median 1.0/day over 3
  weeks`, plus a single `Set goal to 1` suggestion when reality is under the plan.
- **Two detectors, both honest and both dismissible for the day:** six problems
  marked done 30+ days ago and never revised → one action (`Add 6 to today`) with one
  undo; three saved solutions gone stale → `Open in Code`, already filtered.

### Topics — all 20 visible, from day one

- `#/topics` lists every topic with a progress ring, its subtopics, and a plain
  sentence about what the topic is for. Nothing is locked or hidden behind "Basic".
- Topic pages have **Learn · Practice · Quiz** tabs. Learn holds our own primer (and
  inline checks where a check earns its place), Practice holds the three-way outcome
  (`Clean` / `Hint` / `Couldn't`) and the drill set, Quiz shows your pass state.
- `#/search` groups the full 495-row sheet by topic and remembers filters in the URL.

### Problems — a statement, a hint, a mistake, and a video that stays inside the app

- **Our own statements** for the rows that are authored so far (see the coverage
  table): what's asked, constraints, one worked example with a *why*, the number of
  bundled local tests, a hint that is never tracked, and a common mistake.
- **The theatre** plays the official YouTube player on `#/problem/<id>` only, with
  our control bar *below* the frame: play/pause, ±10 s, clock, per-topic speed
  (0.5–2×), **Stamp**, captions (`c`), skip to next stamp, and a watched ≥60% flag.
  Keys: `space`/`k`, `←`/`→`, `c`, `s`, `n`. One mini player survives route changes.
  A dead video shows `Open on YouTube` instead of a broken frame.
- We never modify, overlay or block the player (YouTube ToS §4.13). Ads are your
  browser's business — that is a permanent limit, not a TODO.

### Code — a notebook that replaced Notes

- **Notes are gone.** One saved solution per problem (`users/{uid}/snippets/…`),
  with language, a ≤500-character plain-text reminder, the outcome you recorded, and
  the video stamps. `#/code` searches and filters by language and topic and reads
  from cache offline.
- **Peek for recall** hides your own solution until you say you have attempted the
  problem again, and copy-out is one click.

### Run — code that runs on your device, not on a server

- **C/C++ (Clang 22 on WebAssembly, 29 MB), Python (Pyodide, 13.5 MB), JavaScript
  (no download).** Each toolchain is an **opt-in download per language**, announced
  with its real size, cached in `dsa-archive-runtime-v1`, and reported/cleared in
  Settings. JavaScript needs nothing.
- `Run ▸` runs your program with optional `stdin`; `Run tests ▸ N` runs the authored
  cases and answers `✓ 3/3` or `✗ 2/3 — case 3 differs` with a ≤10-line first diff.
  Compile diagnostics show the first line plus `N more`. **Stop** is a worker
  `terminate()`, so a runaway loop stops instantly. `⌘↵` runs, `Esc` stops.
- Out of scope on purpose: Java/Go/Rust/TypeScript get a reason and copy-out rather
  than a dead Run button. There is no server, no judge, no hidden test suite, and no
  verdict is ever invented. Your code never leaves the device, and the network is off
  while a program runs.

### Quiz — checks that teach, not question spam

- `#/quiz` shows every topic's pass state; `#/quiz/<topic>` runs a 12-question,
  Mulberry32-seeded quiz (`1`–`4`, `Enter`, `r`) that passes at **≥80%** and gives a
  per-kind breakdown plus links back to the primer section to re-read.
- The 42 theory rows are **MCQ cards** with a per-option explanation and an
  always-available `Show solution`; one action per row (`[Solve]` for coding,
  `[Check]` for theory). Inline checks are capped at ≤1 per primer section and ≤3
  per topic.
- Results sync (`users/{uid}/quizResults/{topicId}`), work offline, and a guest's
  scores merge only when you say so.

### Insights — `#/insights`

Momentum (number + strip + one sentence), **one** trajectory sentence computed from
the median pace of your last 14 active days (`At 1/day you finish 11 Mar`), both
detectors, and an optional **finish line** (a target date and/or a target list) that
biases Today's picks inside 14 days. No chart, no confidence band, no score.

### Privacy, offline and install

- **Only your data.** Rules v9 give you read/write over your own `users/{uid}` tree;
  friends see an opted-in summary of counts and streak only.
- **Delete my data** in Settings → *Account & backup*: one two-step action that
  removes progress, saved code, quiz results, lists, plans, the profile, both sides of
  each friend link, the invite capability and the opt-in public summary, plus this
  device's guest study records. Device preferences (theme, finish line) are kept. It
  cannot be undone, so export a backup first.
- **Backup and restore** is schema v8; every older file (v1 → v7) still imports, with
  the notes migration (v2-04) explaining what it dropped instead of guessing.
- **Installable PWA** with a real cold offline open on all 18 routes, a Service Worker
  that never touches YouTube, and a **"New version ready — Reload"** toast instead of
  a silent swap.
- **No analytics, no tag manager, no ad SDK, no telemetry, no third-party font or CDN,
  no error exporter.** The only third-party request in the whole app is YouTube's own
  player on a problem page that has a video. A Content-Security-Policy header is
  enforced at Hosting, and `e2e/csp.spec.ts` proves both the report-only and enforce
  stages in Chromium.

### Deliberately absent (owner decisions, not omissions)

Notes (replaced by Code) · video transcripts, fetched or pasted · ad-blocking or any
modification of the YouTube player · a remote judge (Judge0/Piston) · AI of any kind ·
FSRS/attempt-history/readiness scoring · public signup or leaderboards · Cloud
Functions, Storage, Realtime Database, Analytics, FCM · a CMS for the catalogue
(it stays a git file) · a hand-maintained second copy of the sheet.

### Fixed in this release

- **A preference you just changed could be reverted by your own cloud profile.** The
  profile snapshot was applied over local state on every delivery, so a read that
  started before a theme tap could land after it and put the old theme back — and the
  reverted value was then saved, making the next boot agree with the revert. Found
  while generating the light-theme screenshots (3 of 6 cold boots reverted), fixed by
  applying cloud preferences only when this device has not changed one since the load
  began, and pinned in `src/settings.test.ts`.
- **Build history leaked into the UI.** The statement's test-case line read
  "Bundled for the Phase 07 runner"; it now reads "Bundled for the local runner —
  nothing runs until you press Run", and `e2e/content.spec.ts` fails if a phase name
  ever reaches that card again.
- **The Today shortcut hint no longer wraps into an orphan button** on a phone (the
  example "Open Two Sum" link is a desktop affordance now).
- **Accessibility and contrast defects found by the phase-09 matrix** were fixed
  rather than waived: the command palette's highlighted row (`--subtle` on
  `--action-soft`, 3.73:1 → `--muted`, 5.34:1) and the runner output `<pre>`
  (`aria-prohibited-attr` → a named `role="region"`).

### Budgets at 2.0.0

Shell **392,739 B gzip** against the owner's frozen **393,000 B** cap (261 B of
headroom, and any further growth is a gate, not a re-baseline). CSS 60,523 B raw /
10,364 B gzip. Entry JS 128,007 B raw / 36,981 B gzip. One 457,704 B chunk (the
Firestore SDK). Toolchains live in their own bucket (1.3 MB worker + 42.5 MB packs),
are never precached, and are downloaded only if you ask for a language.

---

## 1.x — v1 "the sheet" (2026-11-02 → 2026-11-03)

Kept for history; the v1 phase records are in [`docs/phases/`](phases/).

| # | What shipped |
|---|---|
| 0 | MIT licence for our own code and the extracted catalogue; clean-room data extraction (495 rows / 20 topics) |
| 1 | The sheet: search, filters, random pick, weakest-topic hint, outbound links, fully browsable signed out |
| 2 | Google sign-in, topic-sharded cloud progress with an offline cache, explicit guest→cloud merge, JSON export/import |
| 3 | Notes (markdown) and code snippets, custom lists — **notes were removed again in v2-04** |
| 4 | Daily goal + Today plan, 3 → 7 → 21-day revision queue, heatmap, streak, per-topic progress |
| 5 | Opt-in friends comparison: rotatable 128-bit invite codes, summary-only sharing, group goal |
| 6 | Installable PWA, airplane-mode cold open, friendly 404/offline pages, code-split budgets, rules/quota audit |
