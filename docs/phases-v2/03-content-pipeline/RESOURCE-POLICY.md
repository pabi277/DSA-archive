# Resource policy — multi-source, no single source of truth

**Owner decision 2026-11-03:** *"articles are only from one source — make it the best
source, not a single truth of source"*.

This document defines how resources are chosen, stored, ranked and displayed so the app
never depends on one publisher, one video channel or one platform's availability.

---

## 1. The problem we are fixing (measured)

| Fact | Number |
|---|---|
| Rows with an `article` link | 289 — **100 % takeuforward.org** |
| Rows with a `practice` link | 453 — **100 % takeuforward.org** |
| Rows with a `video` link | 369 — 276 `youtu.be` + 93 `www.youtube.com` (one channel family) |
| Rows with a `leetcode` link | 289 (273 unique URLs) |
| Rows with **no** LeetCode mapping at all | 206 (mostly theory + beginner rows) |
| Duplicate LeetCode slugs across rows | 13 slugs, e.g. `course-schedule` ×3, `subsets` ×3 |

One publisher, one channel, one platform — a single point of failure for every row.

## 2. Target: a ranked, multi-source resource set per problem

```jsonc
"resources": [
  { "type": "practice",  "source": "leetcode",        "url": "…/problems/two-sum/", "label": "Two Sum · LeetCode 1", "verified": "2026-11-03" },
  { "type": "practice",  "source": "neetcode",        "url": "…", "label": "Two Sum · NeetCode" },
  { "type": "article",   "source": "cp-algorithms",   "url": "…", "label": "Hash table lookups" },
  { "type": "article",   "source": "geeksforgeeks",   "url": "…", "label": "Two Sum — approaches" },
  { "type": "video",     "source": "neetcode",        "url": "…", "label": "Two Sum (11 min)" },
  { "type": "video",     "source": "takeuforward",    "url": "…", "label": "Two Sum — Striver" },
  { "type": "reference", "source": "cppreference",    "url": "…", "label": "std::unordered_map" }
]
```

Rules:
1. **Every problem has ≥1 practice link and ≥1 primary learning resource.**
2. **No source may be the only option** for a row — at least two publishers per row,
   except where a problem is uniquely hosted (rare; then say so in the label).
3. **Ranking is editorial, not automated:** `rank` field 1..n, lower = better.
   The UI shows the top-ranked resource as the primary action and the rest under
   `More sources`.
4. **`verified` is a date**, not a promise. `tools/check-links.mjs` re-checks every URL
   (HTTP status + oEmbed for video) and the badge disappears when a link is stale >180 d.
5. **The 4 chip labels stop existing.** The UI shows: `↗ Practice` (top-ranked),
   `📖 Read`, `▶ Watch`, `⋯ More sources` — each opening a small sheet listing all
   sources with their publisher name, so the user always knows where they are going.

## 3. Approved source registry (with why)

| Category | Sources | Why approved | Watch-outs |
|---|---|---|---|
| Practice | **LeetCode**, **NeetCode 150/250** | The de-facto standard; NeetCode adds curated order | LC slug drift; NeetCode pages link out to LC |
| Practice (alternates) | **Codeforces** (problem-set mirrors), **HackerRank**, **CodeChef** | Broader coverage where LC has no exact twin | Difficulty scales differ — never compare levels across platforms |
| Articles | **cp-algorithms**, **GeeksforGeeks**, **USACO Guide**, **CPH (Competitive Programmer's Handbook)**, **NeetCode blog**, **Programiz** | Editorial quality + stable URLs + no paywall | GFG has SEO spam duplicates — pick the canonical page |
| Articles (fallback) | **takeuforward blogs** | Already mapped for 289 rows; keep, but demote to *one source among several* | Never the only source |
| Video | **NeetCode**, **Striver (takeUforward)**, **Abdul Bari** (algorithms), **William Fiset** (graphs), **Back To Back SWE**, **MIT 6.006 lectures** (topic level) | Different teaching angles; some learners need the second explanation | YouTube availability; we never re-host or proxy |
| Reference | **cppreference**, **Python docs**, **MDN** | For language details a beginner needs; stable | Not learning content, just reference |
| Docs/roadmap (topic level only) | **roadmap.sh/dsa**, **USACO Guide topic pages** | Structural "what to learn in what order" | Only for topic primers, never per-problem |

Explicitly **not** used as sources: paywalled platforms, scraped aggregator sites,
AI-generated solution dumps, anything that re-hosts another site's text.

## 4. Ranking rubric (how the primary is chosen)

Score each candidate 1–5 and take the highest; ties → lower `verified` age → alphabetical:

```
correctness & editorial quality   30%   (is it right, is it maintained)
beginner readability              25%   (does a first-year student finish it?)
coverage of the actual problem    20%   (exact problem, not a chapter)
stability of URL / longevity      15%
independence from other sources   10%   (prefer a different publisher from the primary)
```

The rubric is applied by the owner (or agent draft → owner approve), recorded per row in
`resources[].rank`, and reviewed when a link dies.

## 5. Expanding LeetCode coverage (206 rows currently unmapped)

Order of work, per row:

1. **Exact twin exists** → map it, mark `match: "exact"`.
2. **Near twin exists** (same pattern, different numbers) → map the twin, label
   `near — same pattern`, and keep our statement as the source of truth.
3. **No LC equivalent** (genuine theory or language basics) → **do not invent one.**
   The row becomes theory and gets an MCQ set instead (see
   [`../05-quiz-engine/THEORY-MCQ.md`](../05-quiz-engine/THEORY-MCQ.md)), with a
   reference link (cppreference / USACO Guide / cp-algorithms).
4. **Batch size:** 25 rows per batch, each batch lands with `verified` dates and a
   `check:links` run. Never a bulk auto-map — a wrong LeetCode slug teaches the wrong
   problem.

Target after the pass: **≥420 of 495 rows with an exact or near LeetCode twin**, and every
remaining row explicitly labelled `theory` with a reference + MCQ set.

## 6. Data model

```jsonc
// data/problems.json — additive, schemaVersion 2
"links": { "practice": "…", "article": "…", "video": "…", "leetcode": "…" },  // kept for back-compat
"resources": [
  { "type": "practice|article|video|reference|docs",
    "source": "leetcode|neetcode|cp-algorithms|gfg|usaco|takeuforward|abdul-bari|…",
    "url": "https://…",
    "label": "short human label ≤60 chars",
    "rank": 1,
    "match": "exact|near|chapter",         // practice/article only
    "verified": "2026-11-03" }
]
```
Loader: `resources` wins when present; `links` is the fallback so the app never renders an
empty row during the migration. `tools/validate_data.py` enforces: ≥1 practice + ≥1
learning resource for every non-theory row, unique URLs, valid `type`, `rank` unique per
type, `verified` an ISO day, allow-listed `source`.

## 7. UI behaviour

```
Problem page
┌ Two Sum · Core · Arrays · #LC 1 ─────────────────────────────┐
│ [↗ Practice ↗]  [📖 Read]  [▶ Watch]  [⋯ More sources (5)]     │
└───────────────────────────────────────────────────────────────┘
More sources sheet (bottom sheet on phone)
  Practice   LeetCode        Two Sum · LC 1            verified 2026-11-03
             NeetCode       Two Sum · NeetCode 1      verified 2026-11-03
  Read       cp-algorithms   Hash tables
             GeeksforGeeks  Two Sum — 4 approaches
  Watch      NeetCode        Two Sum (11 min)
             Striver         Two Sum — A2Z
  Reference  cppreference    std::unordered_map
```
- Publisher names are always visible — no anonymous links.
- Every outbound link keeps `rel="noopener noreferrer"` and opens a new tab.
- Offline: the sheet renders (data is bundled); clicking explains it needs the network.
- Nothing is embedded from these sources — links only (clean-room law, no re-hosting).

## 8. Acceptance for this policy (part of phase 03)

1. Schema + validator green; no row is left with an empty resource set.
2. ≥2 distinct `source` values on ≥80 % of the migrated rows.
3. LeetCode coverage ≥420/495 (exact or near), the rest labelled `theory` with a reference.
4. `check:links` reports dead links and stale (>180 d) links per source.
5. UI shows the publisher name for every link; top-ranked primary action per problem.
6. Record in the phase `RECORD.md`: rows migrated, sources used, dead links found.
