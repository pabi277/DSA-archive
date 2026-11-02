# Data model — DSA Archive website (Firebase-backed)

> Plan-stage sketch (revised 2026-11-02 for the owner's Firebase
> direction). Frozen piece-by-piece as phases land; later changes are
> migrations recorded in phase records. Three worlds stay separate:
> **sheet data (git) · per-user data (Firestore) · local cache
> (browser)**. The copied page is a one-time extraction source, never
> a runtime input (`../rule.md` §5).

## 1. The three worlds

| World | Lives in | Who writes | Backup |
|---|---|---|---|
| **Sheet catalogue** (topics, problems, links) | `data/problems.json` in git, bundled at build | Owner/agent data edits (reviewed diffs) | Git history |
| **Per-user data** (progress, notes, plans, friends) | Cloud Firestore, `users/{uid}/…` (§3) | That signed-in user only (security rules) | Export/import JSON (phase 2) |
| **Local cache** | Firestore persistent cache + tiny settings in `localStorage` | The SDK / app automatically | Re-syncs from Firestore on login |

Catalogue ids are the join key everywhere. Progress never references
row positions, so reordering the sheet can't scramble anyone's data.

## 2. Sheet schema (`data/problems.json`, v1 sketch — unchanged by Firebase)

```jsonc
{
  "schemaVersion": 1,
  "generatedFrom": "one-time clean-room extraction from copy-web/index.html (phase 0)",
  // Owner's 10-row live-sheet spot-check remains a content-accuracy task.
  // Real values from the shipped file (verified 2026-11-02, phase 1);
  // this example used to be an invented sketch and disagreed with the
  // data on `level`, subtopic `title`/`order` and problem `order`.
  "topics": [{
    "id": "arrays", "title": "Arrays", "order": 30,
    "subtopics": [{
      "id": "arrays-faqs-medium", "title": "FAQs(Medium)", "order": 30,
      "problems": [{
        "id": "two-sum",                 // stable slug = Firestore key, never reused
        "title": "Two Sum", "order": 100,
        "level": "basic",                // basic | core | pro | null (source has no badge)
        "kind": "problem",               // problem | theory
        "links": {                       // outbound only; any may be absent
          "practice": "https://takeuforward.org/practice/dsa/two-sum",
          "article":  "https://takeuforward.org/blogs/data-structure-and-algorithm/two-sum",
          "leetcode": "https://leetcode.com/problems/two-sum/",
          "video":    "https://youtu.be/UXDSeD9mN-k"
        }
      }]
    }]
  }]
}
```

No problem statements/articles/solutions are stored — links point out.

## 3. Firestore schema (frozen at phase 2 — rules-tested)

Design driver: **Spark-quota frugality** (§4). One fat read on login
beats 495 small ones, so progress is sharded per topic (20 docs),
while notes (sparse, larger) get one doc each.

```text
users/{uid}                                  // profile + settings (1 doc)
  displayName, photoURL, createdAt,
  dailyGoal: 5, theme, hideDone,
  shareSummary: false,                       // friends opt-in switch (default OFF)
  friendCode: "…"                            // rotate-able invite code (phase 5)

users/{uid}/progressByTopic/{topicId}        // ≤20 docs — the login read set
  { "two-sum": { "s": "done",                // todo | done | revision
                 "b": true,                  // bookmarked
                 "a": 2,                     // attempts
                 "fd": "2026-…",             // firstDoneAt (drives 3/7/21-day dues)
                 "lr": "2026-…" }, … }       // lastRevisedAt
  updatedAt

users/{uid}/notes/{problemId}                // created only when a note exists
  markdown, snippet, updatedAt

users/{uid}/lists/{listId}                   // custom lists (phase 3)
  title, problemIds: […], updatedAt

users/{uid}/plans/{yyyy-mm-dd}               // daily planner (phase 4)
  problemIds: […], doneIds: […]

users/{uid}/friends/{friendUid}              // phase 5
  addedAt                                    // existence = friendship (both sides written client-side per rules)

users/{uid}/public/summary                   // phase 5, ONLY if shareSummary = true
  displayName, solvedCount, solvedByTopic: {…},
  currentStreak, lastActiveDate, weeklySolved
  // written by the owner's client whenever progress changes;
  // readable by friends only (rules); NEVER contains notes/snippets
```

### Security-rules principles (the actual protection — `rule.md` §5)

- Default deny. A user may read/write only under `users/{their uid}`.
- Sole exception: `public/summary` is readable by a signed-in user
  **iff** a `friends` doc links them **and** the owner's
  `shareSummary` is true (rules check both — the client toggle alone
  is never trusted).
- Validation in rules: field types + size caps (note length, list
  length) so a buggy/hostile client can't bloat the free quota.
- Rules are versioned in git, **proven by Emulator-Suite tests in CI**
  (stranger-read, friend-overreach, oversized-write cases) before any
  gated live deploy. No Admin SDK, no service-account keys anywhere:
  with no Cloud Functions (Spark), the client + rules are the system.
- Streaks, revision dues, weekly counts, leaderboard order: all
  **computed on-device** from the docs above. Nothing needs a server
  clock job; `serverTimestamp` is used where ordering matters.

### Signed-out & merge behaviour (phase 2 acceptance detail — shipped)

- Signed out: sheet browsable and guest progress remains writable in
  `localStorage`; no account or network is required.
- Guest mode was **kept**, not cut. `src/progress.ts` still stores the
  phase-1 object sharded by topic id at `dsa-archive.progress.v1`, each
  row `{ s: 'todo'|'done', b: boolean }`. A second key
  `dsa-archive.progress.updatedAt.v1` holds per-topic guest timestamps;
  older phase-1 rows are backfilled once on read.
- `src/cloudProgress.ts` plans the merge: newest `updatedAt` wins per
  topic, guest `s`/`b` is combined with any cloud `a`/`fd`/`lr`, and
  cloud-only rows are deleted when the guest shard wins. The UI shows
  guest/cloud counts and per-topic winners and performs **no write**
  until the user chooses "Merge guest rows" or "Keep cloud only".
- Firestore Rules has no loops, so every progress write changes exactly
  one problem key plus `updatedAt: serverTimestamp()`. Import and merge
  apply sequences of these one-key writes; no Admin SDK is used.
- Settings (`theme`, `largeText`, `hideDone`) live under
  `dsa-archive.settings.v1` and map to the §3 profile fields
  `theme`/`hideDone`; `largeText` is local-only (an accessibility
  preference, not user data worth a Firestore field).

### Rules v1 validation (generated from `data/problems.json`)

`tools/generate-firestore-rules.mjs` emits the versioned `firestore.rules`
from the single validated catalogue: 20 topic whitelists, 495 unique
problem ids. Default deny; owner-only `get/list/create/update/delete`
under `users/{uid}`; profile field types and size caps; progress entry
fields `s` (`todo|done|revision`), `b`, `a` (0–10000), `fd`/`lr`
(≤40 chars or null); one changed problem key per write; top-level shard
size capped at the topic's row count + `updatedAt`. The emulator test
covers stranger read/write, unauthenticated access, invalid profile
fields, invalid progress fields, unknown ids, oversized writes and
owner deletion.

## 4. Spark quota budget (official limits checked 2026-11-02)

`https://firebase.google.com/pricing` (fetched 2026-11-02), Spark:
Firestore Standard **50K reads/day · 20K writes/day · 1 GiB stored** ·
Hosting **360 MB/day transfer**.

Rough day for owner + 5 friends, cache misses only (cache hits = 0):

| Action | Reads | Writes |
|---|---|---|
| Login / app open (profile + 20 topic docs + today plan) | ~22 | 0 |
| Solve/revise 10 problems (same 2–3 topics, batched per topic doc) | 0 | ≤10 |
| Notes: read 5, write 2 | 5 | 2 |
| Friends screen (6 summaries) | 6 | 0 (summary write rides the progress write, +1) |
| **Per user/day (3 sessions)** | **~100** | **~40** |
| **× 6 users** | **~600 / 50,000** | **~240 / 20,000** |

≈1% of the free quota, and real usage is lower (repeat opens hit the
persistent cache). Data stored: ~a few hundred KB/user ≪ 1 GiB.
Conclusion: **Spark is not a constraint at friend scale** — the real
constraints are the *absence* on Spark of Functions/Storage, which
this design never needs. Any future feature must re-run this table in
its phase record before it is built.

## 5. Phase-0 extraction plan (one-time, unchanged, still phase 0)

1. Parse the copied `copy-web/index.html` DOM once (script in `tools/`, never
   shipped): topic → subtopic → title, level, links by type.
2. Emit `data/problems.json` + count report reconciling `RESEARCH.md`
   §1: **495 rows**, per-topic sums, and unique links (practice 453 /
   articles 286 / LeetCode 273 / `youtu.be` 256). Phase 0's DOM
   re-count found exact difficulty badge counts **84/287/109** and
   **15 rows without a badge**; those levels stay `null`, not guessed.
   The older 85/288/110 badge tally is not reproducible from this
   snapshot. Extracted video URLs also include 65 unique `youtube.com`
   URLs beyond the 256 unique `youtu.be` URLs.
3. Owner spot-checks 10 random rows against the live sheet
   (content accuracy is the owner's job; pending owner review).
4. Schema/count validation becomes a permanent CI test.
5. Copied tree already lives in `copy-web/` (moved 2026-11-02 by
   owner command); keep it there, outside every build, and never as
   a runtime input.

## 6. Export / import (anti-lock-in, phase 2)

Export = one JSON file: `schemaVersion: 1`, `generatedBy`,
`exportedAt`, profile settings, all `progressByTopic` rows (with
`a`/`fd`/`lr`), empty `notes`/`lists`/`plans` arrays for phases 3–4,
and an `excluded` list naming friends/summary (they're social, not
study data). `src/backup.ts` validates schema version, catalogue ids,
field types and a 1 MB size cap; the UI previews row/topic/note/list/plan
counts and only then replaces. Invalid files show an explicit error.
Import deletes existing topic shards, replays one-key writes, and
restores profile settings. This is also the migration path off Firebase
if the owner ever wants one — powerful must never mean trapped.
