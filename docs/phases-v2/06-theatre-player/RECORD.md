# Phase v2-06 — Theatre player · Record

**Branch:** `arena/c2fd0a14-dsa-archive` (one PR, never `main`)
**Status:** implemented and **green on every local gate**. The shell cap was re-baselined
380 kB → 386 kB → **388 kB** gzip by the owner on 2026-11-04: the first figure left the build
exactly on the ceiling, so ordinary build variance (a few hundred bytes) failed CI. Measured
now at `386,000 B`-ish with real headroom; see the gate section. CI is the last step before
the merge gate.

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
**per topic** · **Stamp** at the playhead · captions (`c`) · `Skip to next stamp` ·
watched indicator (`62% seen · watched`).

Keys: `space`/`k` play-pause, `←`/`→` ±10 s, `c` captions, `s` stamp, `n` next problem —
never while typing, never while a dialog is open, never with ⌘/Ctrl/Alt.

**One contract item was dropped: `f` fill-screen.** It was built and shipped (a page-level
fixed overlay with the bar still under the frame), then removed: to be usable it needed a
block of overlay CSS that fought the 16:9 letterboxing, and YouTube's own player already has
a correct full-screen control that we must not shadow (§4.13). The honest version — a
button that rearranges our page around the same iframe — added ~0.4 kB gzip for a control
that is worse than the one already on the player. Recorded as a deviation rather than
silently kept.

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
| Client | `#/problem/<id>?tab=problem|stamps|code` — the tab is **URL state**, so the phase-04 "Open problem" row, a reload and the back button all keep their tab. The stamp button uses the playhead. |
| Client | New `src/theatre/` (`video.ts`, `oembed.ts`, `stamps.ts`, `speedMemory.ts`, `autoAdvance.ts`, `player.ts`, `stage.tsx`, `stampsList.tsx`, `miniPlayer.tsx`, `theatreSettings.ts`, `problemPage.tsx`). `src/app/problemScreen.tsx` (the pre-theatre page) deleted. `src/design/primitives.tsx` loses the unused `Skeleton`/`Field` primitives. |
| Build | The theatre **screens** lazy-load with the `content-ui` route chunk (they share `StatementCard`, `CodePanel`, `TheoryMcqCard`, and only `#/problem/<id>` needs any of them). Two separate chunks cost +1.4 kB gzip in duplicated UI, so they ship as one. Coverage projection slimmed to the four numbers the UI prints. |

---

## Validation (local, this branch)

- `npm run build` — clean, `0` TypeScript errors.
- `npm test` — **236 tests across 27 files** (was 194/22). New: `video.test.ts` (11),
  `stamps.test.ts` (13), `speedMemory.test.ts` (5), `autoAdvance.test.ts` (6),
  `tab.test.ts` (6); `backup.test.ts` moved to schema v7.
- `npm run test:data` — 495 rows / 20 topics, 42/42 theory MCQs, coverage current.
- `npm run check:rules` — `firestore.rules` matches the generator (20 topics, v8).
- `npm run check:dist` — 21 files, no `copy-web/` paths or assets.
- `npm run check:links` — 2 161 references, 1 157 unique URLs, **369 single-source video
  links untouched**, 0 stale.
- `npm run check:budgets` — **green** at `386.02 kB` gzip against the 388 kB cap
  (CSS 10.10 kB / 18, entry 32.9 / 55, largest chunk 129.9 / 520).
- Playwright: `e2e/theatre.spec.ts` added (**17 tests**, both widths, axe 0 on two theatre
  routes, plus an emulator-gated stamp round-trip); `code.spec.ts`, `library.spec.ts`,
  `planner.spec.ts`, `quiz.spec.ts` and `sync.spec.ts` moved to `schemaVersion: 7`.
  **Not run locally** (no Chromium/Java in the sandbox — CI is the browser, and run
  `41825858179` is green).

### What CI caught (and what was fixed)

The first four CI runs each exposed a real defect; none of them were test-only noise.

| Run | Failure | Fix |
|---|---|---|
| `41804124853` | Budget step only. | Owner re-baselined to 386 kB. |
| `41806360046`, `41807701890` | Emulator stage failed with **no diagnostics at all** — the workflow's summariser only understood Playwright blocks, so a rules failure produced an empty annotation set. | The summariser now falls back to `node --test` TAP blocks and the log tail. This is how the next two failures became visible. |
| `41807928868` | `firestore.rules` v8 **did not compile**: `moments.all(function (moment) {...})` is a lambda, and Firestore Rules have no lambdas. | Unrolled per-index clauses emitted by the generator. |
| `41808350018` | `PERMISSION_DENIED` — *"the maximum of 1000 expressions to evaluate has been reached"*: 30 full shape checks is simply too many. | Every index now gets one cheap key check; the two boundary stamps get the full `validStamp`; the list must be ≤30, sorted and inside 0–86400. The client always writes the whole sorted list, so an add moves the last element and a delete re-exposes a boundary one. |
| `41808733081` | Rules green; Playwright found four regressions: `label-content-name-mismatch` on our glyph buttons, `heading-order` on `#/problem/<id>` (h1 → h3), the phase-04 "Open problem" row landing on a page without the code panel, and stale `schemaVersion: 6` assertions in four specs. | Glyphs are `aria-hidden` under complete labels; the phone layout renders the problem `h2`; the tab became URL state (`?tab=code`); the four specs moved to 7. |
| `41811776493` … `41821337671` | Repeated reds in the browser stage while the rules stayed green. Each was traced before being touched; nothing was retried into a pass. | See *The last four reds* below — two were product bugs. |
| **`41825858179`** | **Green.** Every step, rules and browser acceptance included. | — |

### The last four reds

The tail of this phase was a reminder that a red browser step is evidence, not noise. One
trap had to be undone in the product before the specs could be honest:

- **The "visually hidden but clickable" tab strip.** Parked at 1×1 with `clip-path` so the
  desktop strip stayed keyboard-operable, it still intercepted pointer events — Playwright
  named the nav and title as the interceptors. A control that is invisible but in the way is
  worse than no control. The strip is now `display: none` above 1080 px (the rail carries the
  same two destinations there) and the tab remains reachable at every width because it is a
  URL. The specs moved to the rail's own controls.
- **`problem-panel-problem` has no title.** It renders the statement body only; the heading
  above the stage carries the title. The offline test asserts the authored copy instead of a
  string the panel never contained.
- **The tab did not follow the address (product bug).** The screen re-read `?tab=` only when
  `problemId` changed, so a same-document hash navigation — back/forward, a pasted deep link,
  a bookmark — left the previous panel on screen. The tab *is* the address in this phase, so
  the screen now listens for `hashchange`, and the parser lives in `theatre/tab.ts` with six
  unit tests.
- **Every save remounted the code editor (product bug).** `CodePanel` keyed the editor by
  `problemId-updatedAt`; each save writes a fresh server timestamp, so saving discarded
  anything typed afterwards and, against a slow snapshot, unmounted the panel under the
  reader. Keyed by problem identity now.
- **The offline-flush assertion stops trusting a label.** It reads the emulator document with
  the owner token (the access `planner.spec.ts` already used), so it proves the write reached
  the server, then confirms the read side from the second browser profile.

Two runtime defects were found by reading the hand-off path while waiting for CI, both of
which would have made the mini player never work with the real player:

1. `adoptPlayer` moved the `YT.Player` **object** into the DOM, but that object is not a
   Node — only `getIframe()` is. It also must move the *wrapper* div, because re-parenting
   an iframe directly reloads it and kills playback.
2. `miniPlayer` only rendered its holder once `visible` was true, and `visible` could only
   become true after adopting into that same holder — a deadlock. Rendering is now gated by
   `claimed` and adoption retries once the holder exists.

The stage's cleanup also *paused* on unmount and left its slot in place; it now calls
`releaseSlot('stage')` without pausing, which is what lets the dock take over seamlessly.

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

**Follow-up the same day:** the 386 kB figure left the build *exactly* on the ceiling
(`386,000 B` at one point), so a few hundred bytes of ordinary build variance failed the CI
gate while the same tree passed locally. Two rounds of genuine trimming (dead exports,
`nextSeekTarget`/`formatSeek`/`muteVideo`/`watchFlagFor`/`resetTopicRate`/`planMinutes`/
`stepRate` and their tests, dead CSS) recovered only ~120 B — there is no dead weight left.
The owner therefore chose **388 kB**, which restores real headroom (measured `386,00× B`,
~2 kB) without dropping a contract item. Phase v2-09 still owns the next review.

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

Owner reviewed this record, the CI run on `arena/c2fd0a14-dsa-archive` and the `site-preview`
artifact, then explicitly commanded the merge on 2026-11-04.

**Merged to `main` via PR [#17](https://github.com/pabi277/DSA-archive/pull/17)** — merge
commit `d44b55a`. Branch CI: `41826722515` green on every step. Merge commit on `main`:
`41827690926` green. **No deploy** and no live Firebase command was run; Phase v2-07 starts
only on the owner's next instruction.
