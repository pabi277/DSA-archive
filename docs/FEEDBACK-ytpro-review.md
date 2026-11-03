# Review: `prateek-chaubey/YTPro` — what it is, what we can steal, what we must not

**Date:** 2026-11-03 · **Status:** discussion only (no code changed)
**Sources checked:** repository metadata + source files read on 2026-11-03
(`scripts/script.js` 76.5 kB, `scripts/innertube.js` 34 kB, `scripts/bgplay.js`,
`YTProWebViewClient.java`, `WebAppInterface.java`, `DownloadUtils.java`,
`AndroidManifest.xml`, `settings.gradle`).

---

## 1. What it actually is (facts)

| Fact | Value |
|---|---|
| Type | **Android app** (Gradle, `app/`), not a web app and not a library you can `import` |
| Size | ~105 files, 25.6 MB repo, **389 commits**, last push **2026-10-17**, script v4.0.0 (last edited 2026-09-26) |
| Licence | **MIT** (so copying code is legal — the *behaviour* is what's constrained) |
| Stars / forks | 2,719 / 226 — genuinely popular |
| Architecture | A `WebView` pointed at **m.youtube.com**, plus a **76 kB injected userscript** (`scripts/script.js`) that AOSP-ships as an npm package (`ytpro@4.0.0`) loaded from jsDelivr |
| Its own words | README *Disclaimer*: "an educational project aimed at showcasing javascript injection into a webview" |
| Third-party deps at runtime | `youtubei.js@18.0.0`, `googlevideo@4.1.1`, `bgutils-js@4.0.3` (all loaded from CDN/ESM), SponsorBlock API, Return-YouTube-Dislike API |
| Native side | `AndroidManifest` declares `com.google.android.youtube.pro` with a `ForegroundService`; a `@JavascriptInterface` bridge (`showToast`, `downvid`, `fullscreen`, `muxVideoAudio`, `requestBinaryPort`, …) |

**The key architectural sentence:** YTPro is a **replacement YouTube client** that
runs *inside YouTube's own origin*. Everything clever in it depends on that one
fact. Our app is a **companion** running on our own origin. That difference decides
which of its 20 features we can have.

---

## 2. How its headline features actually work (with the code)

### 2.1 "Ads Blocker" — it rewrites YouTube's own API responses

`scripts/script.js` patches `window.fetch` and, for YouTube's internal
`/youtubei/v1/*` calls, **deletes the ad payload from the JSON before the player
ever sees it**:

```js
// inside the patched fetch, on /youtubei/v1/player | /next responses
if (…preloadMessageNames?.[0] == "adSlotRenderer" ||
    …preloadMessageNames?.[0] == "shortsAdsRenderer"){ data = {}; }
delete data?.adSlots;
delete data?.playerAds;
delete data?.adPlacements;
delete data?.adBreakHeartbeatParams;
delete data?.[0]?.playerResponse?.adSlots;      // "newer version update: 09 Feb 2026"
```

Three things had to be true for that to work, and **none of them is true for us**:

1. The script runs **in the page's own JS context on `youtube.com`** (MAIN world) —
   same origin as the player, so it can patch the player's `fetch`.
2. `YTProWebViewClient.shouldInterceptRequest()` **re-fetches the watch page
   natively, strips `Content-Security-Policy` headers and `<meta>` CSP tags**, and
   re-serves it to the WebView — otherwise the injection would be blocked.
3. The client already has the user's cookies, so the responses are authentic.

Our theatre runs in an **`<iframe>` on `youtube.com`**: cross-origin, no DOM access,
no fetch interception, no CSP stripping. Our code literally cannot reach the ad
data. Plus ToS §4.13: *"you may not modify, build upon, or block any portion or
functionality of the Embeddable Player."*

> **Verdict: ❌ cannot port, should not port.** The `09 Feb 2026` patch note is the
> tell: this is a permanent cat-and-mouse maintenance load, in a repo whose licence
> is fine but whose activity is entirely bypass-driven.

### 2.2 "Captions Downloader" → this is the transcript answer

`scripts/innertube.js` (`updateCaptions()`) reads
`info.captions.caption_tracks[].base_url` and offers the raw timedtext URL in
`fmt=srt|vtt|sbv|ttml|srv1` — but it does **not** fetch it in JS. It hands the URL
to the native layer:

```js
Android.downvid(title + ext, cap.base_url + "&fmt=srt", "plain/text")
```

…and `DownloadUtils.java` enqueues it in Android's `DownloadManager`
(`downloadManager.enqueue(new DownloadManager.Request(Uri.parse(url)))`) — i.e. a
**native HTTP GET outside the browser**, with the device's cookies.

So the real recipe is exactly what my earlier note said, now confirmed by a working
implementation:

| Step | Their tool | Available to us in a browser? |
|---|---|---|
| Get `captionTracks[].baseUrl` | InnerTube `/player` via `youtubei.js` | ❌ needs BotGuard + PoToken + no-CORS |
| Mint the PoToken | `bgutils-js` (`BotGuardClient`, `WebPoMinter`) | only same-origin, and it's circumvention |
| Fetch the caption body | native `DownloadManager` | ❌ CORS; `timedtext` sends no `Access-Control-Allow-Origin` |

Their `scripts/innertube.js` also shows the full download chain
(`youtubei.js` → `googlevideo` SABR stream → `bgutils-js` PoToken →
`/videoplayback`), which is why a "video downloader" is even possible there. Every
one of those steps needs a non-browser HTTP client. **A PWA cannot do this
safely, legally, or durably.** My earlier recommendation (timeline stamps +
paste-your-own transcript + official captions on) stands unchanged, and this repo
is the strongest available evidence for it.

### 2.3 Background play — intercepts the platform, not the player

`scripts/bgplay.js` shims `MediaMetadata`, `navigator.mediaSession` and
`HTMLMediaElement.prototype.pause` (the userscript even keeps a comment: *"save the
original pause function"*), then drives a native `ForegroundService`.

Portable idea, legally: browsers already do this natively — **Media Session API +
`document.pictureInPictureEnabled` + our mini player**. We don't need the hack; we
need the metadata wiring (`navigator.mediaSession.metadata`) so the OS shows
"Topological Sort · DSA Archive".

### 2.4 Gemini summaries — hardcoded internal model IDs

`script.js` carries a table of internal model identifiers
(`"3.1 Pro": '[1,null,null,null,"9d8ca3786ebdfbea",…]'`) and calls Google's
internal batchexecute endpoint with the user's own session. Clever, undocumented,
and it breaks whenever Google rotates IDs. **Not a pattern to copy** (and `rule.md`
gates AI products anyway).

### 2.5 SponsorBlock skipping — CC BY-NC-SA + player modification

`checkSponsors()` fetches `sponsor.ajay.app/api/skipSegments?videoID=…` and skips
dynamically while the video plays. Two blockers for us: SponsorBlock's **API and
database are CC BY-NC-SA 4.0** (attribution + share-alike + non-commercial, per
sponsor.ajay.app/database), and skipping segments *inside* the embed is again
"modifying the player". Our planned "skip the intro to my first stamp" is the
defensible version of the same feeling.

---

## 3. Feature-by-feature: can DSA Archive have it?

| YTPro feature | Us? | How we'd get the same *feeling* legitimately |
|---|---|---|
| Ads blocker | ❌ | Can't reach inside a cross-origin player; ToS. Instead: no ads of ours, `rel=0`, no annotations, no recommendation wall, clean stage → most of the annoyance disappears |
| Skip sponsors | ❌ | "Skip to my first stamp" + 2× speed + auto-advance |
| Captions **downloader** (.srt/.vtt) | ❌ | Official captions ON (`cc_load_policy=1`) + paste-your-own importer + your timeline stamps |
| Video / Shorts / thumbnail downloader | ❌ | Not a media library. Thumbnails **are** legit via `oEmbed` (already planned) |
| Background audio | ✅ pattern | Media Session API + mini player + `playsinline` |
| Picture-in-Picture | ⚠️ partial | Document PiP for our theatre shell (Chromium); browser auto-PiP for the iframe. Not the YT API |
| Minimise video | ✅ | Our docked mini player (planned) |
| Gesture volume/brightness | ✅ pattern | Wheel/drag over our stage → `setVolume()`, dim overlay; never the iframe's own UI |
| Up to 10× speed | ⚠️ 2× max | IFrame API `setPlaybackRate` supports **0.25–2**; per-topic memory |
| Shows dislike count | ❌ | Skip — third-party API, no value for DSA |
| Custom heart (bookmark) | ✅ | Already have bookmarks |
| Hide Shorts / force zoom / codecs | n/a | No feed, no shorts, no codec control in an embed |
| Gemini summaries | ❌ (gate) | "Explain it in your words" prompt → stored note → FSRS review. Your words beat a summary |
| Auto-update, adaptive icon, tiny APK | n/a | Our equivalent: PWA update flow + SW versioning (already built) |
| "Almost 0 internal dependencies" | ✅ philosophy | Good reminder for the redesign: **no** UI kit, no chart lib, hand-rolled SVG |

**Net: 0 of its 6 headline "power" features are portable; ~6 of its UX ideas are.**

---

## 4. The one genuinely new idea worth considering

Their whole trick is *"inject a companion UI into the site you're already on."*
We can invert that **without** modifying YouTube: a **save-to-archive companion** —

- A **bookmarklet** or a tiny browser extension ("Add to DSA Archive"): on any
  `youtube.com/watch` page it shows a small panel → pick a problem from your sheet,
  stamp the current second, save. It talks to our app through a normal link or the
  clipboard, and the page itself is untouched.
- Or the web-native version with zero install: **share-target + paste-a-URL
  importer** already in the PWA, plus the in-app theatre.

Cost/risk: a bookmarklet is ~1 day and legal-ish (it's the user running their own
tool on a page they're viewing — same category as a notes extension); a full
extension is a second codebase and a review burden. **Recommendation: ship the
"add by URL" flow inside the PWA first, bookmarklet only if you actually miss it
while studying.**

---

## 5. Why I would not build DSA-archive this way (risk table)

| Risk | If we copied YTPro's approach |
|---|---|
| **Repo / account** | Your Firebase project and GitHub account carry the blast radius; a ToS-violating client on a Google-linked identity is a bad trade for ad-skipping |
| **It breaks constantly** | Their ad patch is dated *09 Feb 2026*, their caption code *19 Sep 2026*, script bumps monthly. Every YouTube deploy can break us — and a study tool you can't trust is worse than the YouTube app |
| **No mobile parity** | Their technique needs a WebView shell with CSP stripping + native bridge. On iOS/desktop browsers it's impossible; you'd be maintaining two products |
| **Offline/PWA promise dies** | The "Airplane-Mode open works" guarantee you already shipped (Phase 6) is incompatible with a media pipeline that must call Google on every load |
| **Scope** | A downloader/muxer/adblock is a second product. Your actual gap is *training loop + craft*, per the main report — this would be the biggest possible distraction |
| **Clean-room law** | `rule.md` says learning content is reached by **linking out**. A transcript/download pipeline is precisely what that law forbids — you'd be re-opening a gate you set for good reasons |

---

## 6. Verdict

**YTPro is a well-executed, MIT, 2.7-k-famous *replacement client*. It proves the
ad-block works — and simultaneously proves it requires being a modified client.**
It cannot be a dependency, a library, or an inspiration for the *mechanism*; the web
platform and YouTube's ToS both close that door, and the closed door is why the
repo has to chase YouTube forever.

What we take from it: **the UX instincts**. One clean stage, no feed noise, speed
memory, background audio done properly via Media Session, a docked mini player, a
power panel attached to the thing you're watching, and the "almost zero
dependencies" taste.

What we do instead of transcripts: **you write the transcript by pressing a key.**

Nothing in the repository was changed by this review. Recommended next action is
still the scope letter from `docs/FEEDBACK-video-theatre.md` (**A / B / C**) — the
bookmarklet is a small add-on to any of them, not a fourth option.
