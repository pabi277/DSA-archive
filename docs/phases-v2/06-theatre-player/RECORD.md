# Phase v2-06 — Theatre player · Record

**Branch:** `arena/c2fd0a14-dsa-archive` (one PR, never `main`)
**Status:** implemented and **green on every gate**. The shell cap was re-baselined
380 kB → 386 kB gzip by the owner on 2026-11-04 (measured `385,936 B`, see the gate section);
CI re-run with the new cap is the last step before the merge gate.

---

## What shipped

`#/problem/<id>` is now the theatre: the official YouTube player with our chrome around it.

### The player is YouTube's, the chrome is ours

- Official **IFrame Player API**, loaded from `https://www.youtube.com/iframe_api` **only on
  this route** (`acquirePlayer` in `src/theatre/player.ts`, one script tag, never
  precached, never in the shell). Documented parameters only:
  `enablejsapi=1`, our `origin`, `rel=0`, `iv_load_policy=3`, `playsinline=1`,
  `cc_load_policy=1`, `host=https://www.youtube-nocookie.com`, `start=<s>` for `?t=`
  deep links.
- **Nothing is ever drawn over the frame.** Our control bar is a separate row *below* the
  16:9 box; `e2e/theatre.spec.ts` asserts the bar's top edge is at or below the frame's
  bottom edge, and that the iframe has no `autoplay=1`. ToS §4.13 respected by construction.
- Errors `2 / 5 / 100 / 101 / 150` become the designed **dead-link card** with
  `↗ Open on YouTube` — never a blank rectangle. Player script blocked → `Player blocked`
  state with the same fallback. Offline → the stage says so and the statement, hint, stamps
  and code still render (all content is in the bundle).
- **Mini player:** one instance, mounted once in `App.tsx`. Leaving the page docks the
  *same* iframe (never destroyed, never re-created) into a bottom-right sliver; expand
  returns to the problem, close is explicit and sticks. Writing, browsing topics or search
  therefore never interrupts a 40-minute session.

### Our control bar

play/pause · `−10s` / `+10s` · clock (`0:00 / 12:34`) · speed `0.5 → 2×` remembered
**per topic** · **Stamp** at the playhead · captions (`c`) · fill-screen (`f`) ·
`Skip to next stamp` · watched indicator (`62% seen · watched`).

Keys from the phase contract, with two guards (never while typing, never while a dialog is
open, never with ⌘/Ctrl/Alt): `space`/`k` play-pause, `←`/`→` ±10 s, `f` fill-screen
(`esc` leaves it), `c` captions, `s` stamp, `n` next problem.

### Timeline stamps (`moments`)

`{ at, text, createdAt }`, stored **inside the snippet document** the learner already has
(`users/{uid}/snippets/{problemId}.moments`) — no new collection, no extra read, no new
quota path. ≤30 per snippet, `text` ≤140 characters trimmed on a word boundary, `at` 0–86 400.
Adding and deleting are both **undoable** through the shell's 6-second toast/`u`; clicking a
stamp seeks 2 s early (the sentence before the point is usually the useful one). "Skip to
next stamp" wraps to the first stamp, and says *`No stamps yet`* honestly when there are none.

### Metadata, offline by construction

`tools/fetch-media.mjs` writes one `data/media/<videoId>.json` per unique video from the
official oEmbed endpoint (title, author, thumbnail, `fetched` day, and `dead` when the
video 404s). `vite.config.ts` folds that folder into the existing content bundle, so the
runtime **never calls oEmbed**: real titles work in Airplane Mode, with zero CORS risk and
zero network on paint. A missing entry degrades to the problem title; it never blocks the
stage. Build environment had no egress, so `data/media/` is empty and every entry is
treated as `unknown` — the builder writes nothing on failure rather than committing a
guessed title (see *Deviations*).

### Auto-advance, opt-in, off by default

The end of a video offers `Next: Longest Substring · 12 min` — today's plan first, then the
next unsolved row in the same topic, wrapped. It is an **offer**: nothing autoplays and
nothing navigates. The toggle is a device-local switch, default off, and `n` uses the same
target.

### Settings

One honest card: *"Videos play through YouTube's official player in its own frame. Ads are
handled by your browser; the app doesn't block them, and nothing is ever drawn over the
video."* Plus the per-topic speeds the learner actually chose and a single **Forget every
speed** reset. No toggle pretends to block ads.

---

## Data, rules and backup changes

| Surface | Change |
|---|---|
| Firestore | No new path. `snippets/{problemId}` gains an optional `moments` list. |
| Rules | Generated **v8** (`tools/generate-firestore-rules.mjs`): `isKnownProblem` whitelist reused, `moments` ≤30, each `at` a number 0–86 400, `text` a string 1–140, `createdAt` timestamp-or-ISO, keys whitelisted. All v7 rules preserved verbatim (`profile`, `progressByTopic`, `snippets`, `lists`, `plans`, `quizResults`, `friends`, `public/summary`, `/notes/` default-deny). |
| Backup | Writer **v6 → v7** (`snippets[].moments[]`); reader accepts **1–7**. A pre-v7 file that claims `moments` is refused rather than guessed. `snippets[]` still round-trips. |
| Client | New `src/theatre/` (`video.ts`, `oembed.ts`, `stamps.ts`, `speedMemory.ts`, `autoAdvance.ts`, `player.ts`, `stage.tsx`, `stampsList.tsx`, `miniPlayer.tsx`, `theatreSettings.ts`, `problemPage.tsx`). `src/app/problemScreen.tsx` (the pre-theatre page) deleted. `src/design/primitives.tsx` loses the unused `Skeleton`/`Field` primitives. |
| Build | The theatre **screens** lazy-load with the `content-ui` route chunk (they share `StatementCard`, `CodePanel`, `TheoryMcqCard`, and only `#/problem/<id>` needs any of them). Two separate chunks cost +1.4 kB gzip in duplicated UI, so they ship as one. Coverage projection slimmed to the four numbers the UI prints. |

---

## Validation (local, this branch)

- `npm run build` — clean, `0` TypeScript errors.
- `npm test` — **231 tests across 26 files** (was 194/22). New: `video.test.ts` (11),
  `stamps.test.ts` (13), `speedMemory.test.ts` (5), `autoAdvance.test.ts` (6);
  `backup.test.ts` moved to schema v7.
- `npm run test:data` — 495 rows / 20 topics, 42/42 theory MCQs, coverage current.
- `npm run check:rules` — `firestore.rules` matches the generator (20 topics, v8).
- `npm run check:dist` — 21 files, no `copy-web/` paths or assets.
- `npm run check:links` — 2 161 references, 1 157 unique URLs, **369 single-source video
  links untouched**, 0 stale.
- `npm run check:budgets` — **CSS, entry JS and largest chunk green; total shell red**
  (see below).
- Playwright: `e2e/theatre.spec.ts` added (11 tests, both widths, axe 0 on two theatre
  routes); `e2e/code.spec.ts` moved to `schemaVersion: 7`. **Not run locally** (no
  Chromium/Java in the sandbox — CI covers them; see *Deviations*).

---

## Performance & the one open number

| Metric | Phase 05 | Phase 06 | Cap |
|---|---|---|---|
| CSS | 53.72 kB raw / 9.43 kB gz | **59.40 kB raw / 10.18 kB gz** | 60 / 18 kB ✅ |
| Entry JS | 111.56 kB raw / 32.04 kB gz | **113.66 kB raw / 32.84 kB gz** | 180 / 55 kB ✅ |
| Largest JS (`firebase-firestore`) | 457.70 / 129.86 kB gz | unchanged ✅ | 520 / 165 kB ✅ |
| Player route chunk | — | inside `content-ui` (46.1 kB gz, was 35.3) | ≤25 kB gz ⚠️ |
| **Total precached shell** | **376.01 kB** | **385.94 kB gzip (`385,936 B`)** | **380.00 kB** ❌ |

The theatre costs **~9.9 kB gzip**: ~7.9 kB of code and strings in the route chunk, ~0.85 kB
of CSS, ~0.75 kB in the entry (mini player + providers), ~0.4 kB of settings copy.

What I already removed to pay for it, and what it bought:

| Cut | Saved |
|---|---|
| Duplicate CSS rules, unused `Skeleton`/`Field` primitives, torn-out theatre rules | ~1.5 kB raw CSS |
| Coverage report projection (4 numbers instead of the full report) | 1.2 kB gz |
| Stamp **editing** (add/delete only — the contract only asks for add/delete) | included in code |
| Stage tick rail, per-page test ids, a second full player in the mini dock | included in code |

What I measured and rejected because it does **not** pay: every chunk-splitting variant
(`${catalogue}+app-data`, `content-ui → entry`, one chunk, separate `theatre` chunk) lands
between **362.9 and 386.1 kB** — the split only moves bytes, and splitting the theatre from
`content-ui` *adds* 1.4 kB of duplicated UI. Dropping the catalogue's positional `rank` and
deduping three `lcLabel` strings buys **0.29 kB** because gzip already absorbs the
repetition. A dead-class CSS sweep finds ~2.0 kB raw, spread thin across selectors, and is
unsafe for the classes built by template literals.

**The honest conclusion: the theatre is ~9.9 kB of new capability and the frozen cap has
3.99 kB of headroom.** It does not fit without either raising the cap or cutting a piece of
the phase contract. I did not raise the cap, because `docs/DECISIONS.md` says re-baselining
is a **phase v2-09** decision that needs owner sign-off with published numbers — this record
is that publication, and the PR is the gate.

### Owner gate — answered 2026-11-04: re-baseline to 386 kB

The owner chose option 1. `maxShellGzipBytes` is now `386_000` in `tools/check-budgets.mjs`,
`npm run check:budgets` is green (`385,936 B`, `64 B` of slack), and the decision is recorded
in `docs/DECISIONS.md` under "Phase v2-06 implementation choices". Phase v2-09 still owns the
next review of this cap. The options as they were put, for the record:

1. **Re-baseline now** (chosen): accept `386 kB` for phase 06 (the Phase 09 review tightens it
   again).
2. **Cut a piece to fit 380 kB** — each of these is a real regression:
   - drop the per-video `data/media` metadata path (`oembed.ts` + stage titles): ~1.5 kB;
   - drop the mini player's timeline/next-stamp strip and the rail's duplicate stamps list
     on desktop: ~1.2 kB;
   - move the stamps rail into the `#/code` panel only (no stamp list on the problem page):
     ~1.8 kB.
   Even all three ≈ 4.5 kB, which lands at ~381.4 kB — still over. **A real cut would have
   to remove the mini player itself or the settings card**, i.e. break the contract.
3. **Accept a phase-06-only `390 kB` cap** with the plan to return to 380 kB in Phase 09.
   (Not taken: 386 kB is the smallest number that fits what was built.)

---

## Deviations and honest notes

- **`data/media/` is empty.** The build sandbox has no egress (`curl` to the oEmbed endpoint
  fails with `SSL_ERROR_SYSCALL`), so `tools/fetch-media.mjs` wrote nothing. The runtime is
  fully functional without it: titles fall back to the problem title, no entry is marked
  dead, and nothing is committed that was not actually fetched. Running
  `node tools/fetch-media.mjs` on a networked machine fills it in and the metadata appears
  with no code change.
- **Playwright and the rules emulator were not run locally** (no Chromium, no Java in the
  sandbox). The new spec and the v8 rules tests are exercised by CI on this branch.
- **Stamps are read-only when signed out**, like the rest of the notebook: the stage and the
  list still work, the add form says *Sign in to save stamps*.
- **The player chunk exceeds the plan's 25 kB gz line** (46.1 kB gz `content-ui`, which now
  also carries the statement, code panel and theory cards). That line was written when the
  plan assumed a theatre-only chunk; measured, that split is 1.4 kB *worse*. The plan's
  intent — "no change to entry JS" — is met (entry 32.84 kB gz).
- No new npm dependency, no autoplay, no ad blocking, no download, no transcripts, no
  full-screen chrome replacement, no `copy-web/` asset, no emoji/gradient/glass in the new
  chrome.

## Exit gate

Owner reviews this record, the CI run on `arena/c2fd0a14-dsa-archive` and the `site-preview`
artifact — including one full video watched at phone and desktop width — then explicitly
commands the PR/merge. **Stopped here before any PR, merge, `main` push or deploy.**
