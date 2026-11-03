# Video theatre & "no ads" — feasibility + design note

**Date:** 2026-11-03 · **Status:** discussion only (no code changed)
**Question:** Can videos open inside our own screen instead of youtube.com? Can we
block the ads? And what else is cool?

---

## 0. Answers up front (short)

| Ask | Verdict | One-line reason |
|---|---|---|
| Auto-fetch the transcripts | **Out of scope by your call (2026-11-03).** No transcript/caption fetch, no paste-your-own importer. | Dropped from the plan; the analysis that produced it is kept in `docs/FEEDBACK-ytpro-review.md` §2.2 for the record. |
| Open videos in *our* screen, not youtube.com | **Yes — fully supported and it looks great.** Official IFrame Player API inside our own "Theatre" layout. | That is exactly what the Embeddable Player is for; branding stays YouTube's, the chrome is ours. |
| Block the ads in that player | **No — I won't build that, and it can't be done from our code anyway.** | YouTube ToS §4.13 forbids modifying/blocking any part of the Embeddable Player, YouTube Help states ad-blocking violates ToS, and the player is cross-origin — our JS cannot see or touch ad requests. |
| Other cool features | **Yes — §5**, ten of them, ranked, all legal and all cheap because they reuse your existing notes/progress/planner plumbing. | |

The rest of this note is the evidence, the design, and a recommended build order.

---

## 1. Transcripts — dropped, and what replaces them

**Decision (owner, 2026-11-03): no transcript work.** No auto-fetching, and no
paste-your-own importer either. The technical and ToS analysis that led there is
archived in `docs/FEEDBACK-ytpro-review.md` §2.2 — short version: `timedtext` is
CORS-dead, needs a video-bound PoToken that only a non-browser client can mint, and
ToS §4 forbids reading content outside the player. Not revisited unless you ask.

**What still goes in the theatre, and is not a transcript:**

### 1a. Timeline stamps (your own words, one keypress)
While the video plays, `s` (or a button) drops a **stamp**: current second + your
one-line insight — "02:14 the trick is to shrink from the left". Click a stamp and
the player seeks there (`seekTo(sec)`). This is a *note with a timestamp*, not
extracted video text: nothing is read from YouTube, nothing is stored from the
video, and it works offline.

Why it's the right shape:
- It's **yours** — it sits inside the note you already store, so it syncs through
  `library.ts`/Firestore like everything else.
- It's **short** — 6 stamps beat 4,000 auto-generated lines you'd never scroll.
- It's **free and durable** — no keys, no proxies, no PoToken, nothing to break
  when YouTube ships a new player.
- It feeds revision: FSRS can resurface "you wrote this 21 days ago — still true?"
  with a jump-to-moment link.

Data is a small extension of the existing note record:
`{ problemId, markdown, snippet, moments: [{ at: 134, text, createdAt }] }`.

### 1b. Captions on screen (YouTube's own, untouched)
`cc_load_policy=1` + the IFrame API's `setOption('captions', 'track', …)` turns the
official caption track on. We render none of it, store none of it — the words stay
inside YouTube's player, which is exactly what ToS allows. Good enough to read
along while you stamp.

### 1c. Metadata enrichment (nice, cheap, official)
`https://www.youtube.com/oembed?url=<video>&format=json` is a documented, keyless,
public endpoint returning **title, author, thumbnail** for a video. Used at build
time (or runtime with a cache) it upgrades 369 bare "Video" chips into real cards:
"Striver · *Sliding Window — Longest Substring* · 18 min · thumbnail". It also gives
you a **dead-link detector** — the endpoint 404s for removed/private videos, so the
build can badge "video removed" instead of sending you to a broken embed.
*(Verify its CORS header during the first implementation phase; if it isn't
CORS-open, fetch it in the existing `tools/` build step instead — same result,
zero runtime cost.)* Duration isn't in oEmbed: capture it once via
`player.getDuration()` on first play and store it, then the "video time per topic"
budget fills itself in.

---

## 2. Theatre mode — video inside our screen (the part that's easy)

The official **IFrame Player API** exists for exactly this. Design:

**Layout.** Full-bleed dark stage: the player fills the width (16:9), and a right
rail (desktop) / bottom sheet (phone) holds: level + pattern chips, your timeline
stamps, the note editor, and a footer action bar — `Mark solved · Couldn't · Add to
plan · Next`. Our UI is the *frame*; branding, captions, quality, speed and ads
stay YouTube's, untouched.

**Player parameters that matter**
`enablejsapi=1` + `origin=<our origin>` (required for JS control) ·
`rel=0` (don't suggest unrelated third-party channels) ·
`iv_load_policy=3` (no annotations/cards) ·
`cc_load_policy=1` (captions **on** by default — this is the *official* way to read
the words on screen) ·
`playsinline=1` (iOS doesn't hijack fullscreen) ·
`start=<sec>` and `#t=` deep links ·
`host=https://www.youtube-nocookie.com` for the privacy-enhanced domain.

**Controls we own** via the API: play/pause, seek, `getCurrentTime()` (for stamps),
`getDuration()` (for progress/`watched` %), playback rate **0.75–2×** remembered
per topic, "skip intro" (seek to your first stamp), auto-advance to the next
problem in today's plan, and a **mini player** that stays docked bottom-right while
you browse the sheet (single instance, moves between routes) — PiP-style without
touching a byte of YouTube's UI.

**Keyboard:** `space` play/pause · `←/→` 5 s · `shift+←/→` 1 s frame-ish nudge ·
`f` fill screen · `c` captions · `s` stamp · `n` next problem.

**Wiring into what you already have:** watching ≥60% emits a soft "watched" flag;
the footer writes the same progress entry the sheet writes, so a video session can
feed the planner's `movedToday` and the FSRS first-solve date. Deep link
`#/p/<problem>/video?t=142` (pairs with the URL-state work in the main report).

**Bits of plumbing this touches:** the Service Worker must not try to precache or
intercept the iframe (`youtube.com`, `googlevideo.com`), and if you later add a CSP
it needs `frame-src https://www.youtube.com https://www.youtube-nocookie.com`.

---

## 3. "Block the ads" — why I'm saying no, and what I'll do instead

**It is a ToS floor, not a taste call.** YouTube's Embeddable Player terms:
*"you may not modify, build upon, or block any portion or functionality of the
Embeddable Player, including but not limited to links back to the YouTube
website."* YouTube Help separately states that blocking ads violates the Terms of
Service, and 2024→2026 enforcement is real: playback gets interrupted or blocked
for users who block. ([ToS](https://www.tldrlegal.com/license/youtube-terms-of-service),
[policy explainer with dates](https://www.itechguides.com/google-is-pushing-ad-blockers-violate-youtubes-terms-of-service-banners-on-youtube-what-the-warning-means/))

**It is also technically impossible from where we sit.** The player is a
cross-origin iframe. Our CSS can't reach inside it, our JS can't read its DOM, and
ad requests are issued *by the player's own scripts* straight to Google's servers.
Only a browser-level extension or a DNS/proxy layer can filter them — that's a
different product, and the usual "hacks" (overlaying a div, muting and CSS-hiding
the iframe) either do nothing or break playback so the video stops loading.

**What I will do instead — honest friction removal:**
1. **Zero ads of our own.** The app stays ad-free, tracker-free, analytics-free
   (already true, and `rule.md` keeps it that way).
2. **Strip everything that isn't the video.** No YouTube page, no recommendation
   wall, no comments, no "next up" autoplay rabbit-hole: `rel=0`, no annotations,
   our own stage, one video at a time. Most of what people hate about the YouTube
   experience is the *page*, and that we can delete.
3. **Skip what's skippable, legally:** start at your first stamp (skip the intro
   teaser), remember 1.5–2× speed per topic, and auto-advance so you never sit
   through a second pre-roll by accident.
4. **A read-first path.** Many rows already have an `article` link (286 unique
   blogs in the original audit). Offer "read instead of watch" with your own
   one-paragraph summary saved as a note — no video, no ads at all.
5. **Be straight with the user:** one line in Settings — *"Videos play through
   YouTube's official player; ads there fund the creators. We don't block them."*
   If ads are the dealbreaker, YouTube Premium (student tier) is the supported
   answer and it also makes the in-app experience smoother.

That framing actually reads *more* professional than an ad-blocker: a crafted
player that removes the noise, instead of a hack that breaks in a month.

---

## 4. The note layer, final shape (no transcript anywhere)

| Layer | Source | Legal | Works offline | Feels like |
|---|---|---|---|---|
| **Timeline stamps** (default) | you, in-app, per second | ✅ your content | ✅ | ⭐⭐⭐⭐⭐ |
| Captions on screen | YouTube's own CC (`cc_load_policy=1`) | ✅ authorized, untouched | ❌ | ⭐⭐⭐⭐ |
| Metadata cards | oEmbed (official) | ✅ | ✅ (cached) | ⭐⭐⭐⭐ |
| ~~Auto-fetched transcripts~~ | — | ❌ ToS + breaks | — | **dropped** |
| ~~Paste-your-own transcript~~ | — | — | — | **dropped** |

Product line: **"Watch inside the app. Your own words land where you paused."**

---

## 5. Other cool features (video-adjacent first, then general)

| # | Feature | Why it's cool | Effort |
|---|---|---|---|
| V1 | **Timeline stamps → seekable notes** (§1a) | Watching becomes owned, searchable knowledge; the best note format you'll ever get | 3–4 d |
| V2 | **Theatre mode + mini player** (§2) | Kills the youtube.com tab-juggling; the single most visible upgrade | 3–4 d |
| V3 | **Watch → solve bridge** — footer `Solved clean / With a hint / Couldn't` right in the player | Watching finally moves the needle instead of being a detour | 1–2 d |
| V4 | **Studying playlist** — today's plan plays back-to-back; per-problem checklist, auto-advance, "next up: Topological Sort · 12 min" | One 40-minute session without touching the sheet | 2 d |
| V5 | **Moments library** — every stamp across all problems, searchable ("sliding window trick") | Your own highlight reel; unique to you | 2 d |
| V7 | **Video health pass** — oEmbed check in `tools/check-links.mjs`, badge dead videos, auto-suggest replacement | 369 links *will* rot; you'd be the only tracker that notices | 1 d |
| V8 | **Time budget** — sum of durations per topic ("Graphs = 4 h 20 m of video"), fits your weekly hours | Turns "watch everything" into a plan | 1–2 d |
| V9 | **Speed memory + skip-intro** | Small, and people love it | 0.5 d |
| V10 | **Watch-later queue that survives offline** (metadata + your notes only, never the video file) | Airplane-mode planning without touching ToS | 1–2 d |
| G1 | **"Explain it in your words" prompt** after a solve/watch → saved as note → FSRS item | The cheapest active-recall win in the whole app | 1 d |
| G2 | **Clip/screenshot-free whiteboard** — a tiny scratch canvas per problem, stored as vectors | Sketch the pattern without leaving the app | 2–3 d |
| G3 | **Focus mode** — sheet dims to the current problem, timer in the corner, everything else hidden | (from the main report, sits naturally next to the theatre) | 2 d |

**Explicitly not doing:** downloading videos (`yt-dlp`-style — ToS, and it forces
storage costs), proxying the player through our domain (breaks auth, breaks ads,
gets blocked), scraping captions, or anything that "unlocks" Premium features.

---

## 6. Recommended build order

1. **V2 Theatre + mini player** — the visible win; everything else hangs off it.
2. **V1 Timeline stamps** — turns watching into owned, searchable knowledge.
3. **V3 + V4** — close the loop: watch → outcome → next problem, automatically.
4. **V7 + V8 + V9** — data hygiene and planning; cheap and immediately felt.
5. **V5** — the "power user" layer: moments library, once there are stamps to search.
6. Meanwhile in the main roadmap: undo/skeletons, shell redesign, ⌘K, focus
   session, FSRS.

**Gates this would re-open:** new dependency (none needed — the IFrame API is a
remote script, so decide whether that's acceptable under the "no third-party
runtime" instinct), a CSP/`frame-src` decision, Service-Worker exclusions, and one
sentence of ToS copy in Settings. Nothing Firebase, nothing paid, no Blaze.

---

## 7. What I need from you before building anything

Transcripts are off the table (your call, 2026-11-03), so there are only two scopes:

- **A — Theatre core (recommended).** Theatre + mini player, timeline stamps,
  watch→solve bridge, speed memory, dead-link badge. ~7–9 days.
- **B — A + the full media layer.** Adds studying playlist, moments library, video
  time budget, offline watch-later. ~+5–6 days.

Reply with the letter (and anything to drop), and I'll turn it into a gated phase
plan with the data-model delta, acceptance tests and the CI additions — still
without writing product code until you say go.
