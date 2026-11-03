# Phase 06 — Theatre: the YouTube player inside our screen

**Folder:** `docs/phases-v2/06-theatre-player/`
**Estimate:** 7–9 days · **Depends on:** 01, 02, 03 (statement block) · **Blocks:** 07 (shares the problem-page rail)
**Owner decision:** videos play **in our own screen**; ads are the browser's business
(owner uses Brave), and we **never** modify, overlay or block anything inside the player.

---

## 1. Charter

A crafted video stage inside `#/problem/<id>`: our chrome, YouTube's official player,
zero page noise (no recommendations wall, no comments, no rabbit hole), our controls,
our notes-as-stamps, and a mini player that survives navigation. 369 rows already carry a
`links.video`; this phase makes them feel native instead of a new tab.

## 2. Current state (evidence)

| Fact | Evidence |
|---|---|
| Video is just an external link chip | `SheetList.tsx:117-123` (`target="_blank"`) |
| 369 of 495 rows have a video | `data/problems.json` (measured 2026-11-03) |
| Hosts: `youtu.be`, `www.youtube.com` | same |
| No player, no metadata, no duration stored | `grep -ri "iframe\|player" src` → none |
| CSP/frame policy not configured | `firebase.json` headers |

## 3. Scope

### In
1. **Problem page shell** (`#/problem/<id>`): two columns on desktop (stage + rail),
   stacked on phone. Rail = statement (phase 03) · outcome control · code panel entry
   (phase 04/07) · stamps list · `↗ Solve on LeetCode` · `⌨ Code` · `Add to today`.
2. **Player** — official IFrame Player API:
   `enablejsapi=1` + our `origin`, `rel=0`, `iv_load_policy=3`, `playsinline=1`,
   `cc_load_policy=1`, `host=https://www.youtube-nocookie.com`, `start=<s>` for deep links.
   Loaded from `https://www.youtube.com/iframe_api` **only on this route** (never in the
   shell bundle, never precached). Player events: ready, stateChange, error
   (`2/5/100/101/150` → dead-link UI).
3. **Our controls** (a small custom bar under the stage): play/pause, `−10s/+10s`,
   speed `0.5 / 0.75 / 1 / 1.25 / 1.5 / 1.75 / 2` (remembered **per topic**),
   **skip to first stamp**, `f` fill-screen, `c` captions, `s` stamp, `n` next problem,
   and a **watched** indicator (`getCurrentTime()/getDuration()` ≥ 60% → soft "watched"
   state, no data written beyond a local flag).
4. **Mini player**: one instance, docks bottom-right on desktop / above the bottom bar on
   phone, survives route changes, keeps playing while browsing `#/topics` or `#/code`,
   has close + expand, and is focus-trap-free (it's a region, not a dialog).
5. **Timeline stamps** (`moments`): `s` captures `getCurrentTime()` + a text field →
   `{ at, text, createdAt }` stored **in the snippet document** (`snippets[id].moments`,
   ≤30 stamps, ≤140 chars each). Clicking a stamp seeks. Stamps render in the rail and in
   the phase-04 code screen ("3 moments").
6. **oEmbed enrichment** (`tools/` build step, cached JSON in `data/media/<videoId>.json`):
   title, author, thumbnail, and a **dead-link flag** when oEmbed 404s. Used for real
   titles on rows, a thumbnail card on the problem page, and `tools/check-links.mjs`
   reports dead videos. Runtime never calls oEmbed (offline-first, zero CORS risk).
7. **Auto-advance**: when today's plan has a next problem, the end of the video offers
   `Next: Longest Substring · 12 min →` (opt-in toggle, default off).
8. **Empty states**: no video → the article/resource path instead (no broken embed);
   embed-disabled video → clear message + `Open on YouTube` fallback link.
9. **Settings**: one honest line — *"Videos play through YouTube's official player. Ads
   are handled by your browser; the app doesn't block them."* Plus per-topic speed reset.

### Out (explicitly, with reasons)
| Not doing | Why |
|---|---|
| Ad blocking / overlay tricks | Cross-origin iframe; ToS §4.13; breaks playback |
| Autoplay on load, background audio | Surprising; and the IFrame API can't play audio outside the page |
| Downloading video/audio | ToS + storage + money |
| Transcripts (fetch or paste) | Owner decision 2026-11-03 |
| Full-screen chrome replacement | Only `f` → our fill-screen; YouTube's own controls stay usable |

## 4. Design spec

```
#/problem/course-schedule  (desktop ≥1280)
┌ Stage (16:9, max 880px) ─────────────────────────┬─ Rail 360px ────────────┐
│                                                   │ Course Schedule          │
│            [YouTube official player]              │ Pro · Graphs · #LC 207   │
│                                                   │ ▸ What's asked …         │
├───────────────────────────────────────────────────┤ ▸ Hint  ▸ Mistake        │
│ ▶  −10 +10   1.5×   ⚑ stamp   CC   ⛶   watched 62%│ ───────────────────────  │
├───────────────────────────────────────────────────┤ Stamps (3)               │
│ 02:14  shrink from the left        ↗              │ 02:14 shrink from left   │
│ 09:40  pitfall: empty string       ↗              │ 09:40 empty string       │
└───────────────────────────────────────────────────┘ Outcome: ✓ ◐ ✗          │
                                                      [Code ⌨] [Add to today]  │
```
Phone: stage full-bleed at top (sticky on scroll while playing), rail becomes a bottom
sheet with three tabs (`Problem · Stamps · Code`); mini player 64 px tall above the bar.

## 5. File plan

```
NEW  src/theatre/player.tsx        iframe API loader + events + controls
NEW  src/theatre/miniPlayer.tsx    docked instance + route survival
NEW  src/theatre/stamps.ts         pure model (cap 30, validation, seek helpers)
NEW  src/theatre/stampsList.tsx    rail list + add/edit/delete with undo
NEW  src/theatre/problemPage.tsx   the shell (stage + rail + phone sheet)
NEW  src/theatre/oembed.ts         build-time data access (no runtime fetch)
NEW  src/theatre/speedMemory.ts    per-topic rate in settings/localStorage
NEW  data/media/<videoId>.json     generated by tools/fetch-media.mjs
NEW  tools/fetch-media.mjs         oEmbed → title/author/thumbnail/dead flag
EDIT tools/check-links.mjs         include media dead-link report
EDIT src/code/codeStore.ts         `moments` field (cap/validation)
EDIT tools/generate-firestore-rules.mjs, firestore.rules   moments caps in snippets
EDIT src/app/router.tsx            #/problem/:id (?t=, ?lang=)
EDIT src/app/toast.tsx             stamp add/delete undo
EDIT src/pwa.ts / build-sw.mjs     never intercept youtube.com / googlevideo / iframe_api
EDIT firebase.json                 CSP frame-src (only if a CSP is added; document decision)
NEW  e2e/theatre.spec.ts
NEW  src/theatre/*.test.ts
```

## 6. Data model

```
snippets/{problemId}  … { moments: [{ at: number ≥0 ≤ 86400, text ≤140, createdAt }] ≤30 }
```
Rules v8 additions: `moments` is a list ≤30, each map has `at` (number, bounded), `text`
(string ≤140), `createdAt` (timestamp or ISO string) — validated in the generator's shape
check and enforced by a runtime rules test. No new collection, no new reads beyond the
snippet doc you already read in phase 04.

## 7. Accessibility & performance
- The iframe has `title="Video: <problem title>"`; our control bar is a `toolbar` with
  labelled buttons; speed is a `select` on phone.
- Keyboard: all controls reachable; `space/k` play-pause only when focus is not in a text
  field; the mini player's buttons are in tab order after the page's main content.
- Captions ON by default (`cc_load_policy=1`) so the video is usable muted and by deaf
  users; no reliance on audio for any flow.
- The IFrame API script (~small, remote) is loaded lazily on this route only; the route
  still renders the statement fully without it (and says "video unavailable offline").
- Offline: the page shows the statement + code; the stage shows a designed offline state
  with "open on YouTube when online".
- Budget: no change to entry JS; the player code is a lazy route chunk (≤25 kB gz).

## 8. Tests
| Kind | What |
|---|---|
| Unit | stamps model (caps, seek target maths, ordering) · speed memory · oembed data mapping · dead-link flag |
| Playwright | open problem → player iframe present with our params · stamp add/seek/delete+undo · mini player survives navigation · dead-video fallback (fixture) · offline state |
| Rules (emulator) | moments caps enforced (31 rejected), text length, at bounds |
| Visual | desktop stage+rail, phone stage+sheet, mini player, offline state |

## 9. Risks
| Risk | Mitigation |
|---|---|
| YouTube changes/breaks embed behaviour | Official API only; error codes handled; `Open on YouTube` always available |
| Embeds disabled on specific videos | oEmbed/dead-link data + graceful fallback; owner can swap links in `problems.json` |
| Service worker interference | Explicit bypass list + a test that the player loads offline-guarded |
| Mini player + route changes cause double instances | Single-portal pattern with a ref-count; test proves exactly one iframe |
| Scope creep into an ad-blocker | Written in the phase record: never modify the player; owner uses Brave |

## 10. Acceptance
A full 40-minute session runs inside the app without ever opening youtube.com · the
player keeps playing while navigating (mini player) · stamps seek correctly and persist ·
speed memory per topic · dead videos show a fallback, not a broken frame · offline page
still shows statement + code · 0 axe violations · budgets unchanged for the shell.

## 11. Exit
Owner watches one full video in the preview on phone and desktop, merges. Phase 07 then
adds the Run button to the same rail.
