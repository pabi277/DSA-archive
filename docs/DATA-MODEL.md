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
  { "two-sum": { "s": "done",                // todo | done (revision allowed, unused)
                 "b": true,                  // bookmarked
                 "a": 2,                     // attempts
                 "fd": "2026-…",             // firstDoneAt (drives 3/7/21-day dues)
                 "lr": "2026-…",             // lastRevisedAt
                 "rc": 1 }, … }              // phase 4: revisions done (0–100)
  updatedAt

users/{uid}/notes/{problemId}                // phase 3 — created only when a note exists
  markdown: "…",                             // ≤ 5,000 chars
  snippet: "…",                              // ≤ 8,000 chars
  updatedAt                                  // serverTimestamp, enforced by rules

users/{uid}/lists/{listId}                   // phase 3 — custom lists
  title: "…",                                // 1–60 chars
  problemIds: […],                           // ≤ 200 known catalogue ids
  updatedAt                                  // serverTimestamp, enforced by rules

users/{uid}/plans/{yyyy-mm-dd}               // phase 4 — today's plan (1 doc read/day)
  problemIds: […],                           // ≤200 solved-or-planned catalogue ids
  doneIds: […],                              // ticked in Today; always ⊆ problemIds
  updatedAt                                  // serverTimestamp, enforced by rules

users/{uid}/friends/{friendUid}              // phase 5
  code, addedAt                              // reciprocal pair created atomically using invite

users/{uid}/public/summary                   // phase 5, ONLY if shareSummary = true
  displayName, solvedCount, solvedByTopic: {…},
  currentStreak, lastActiveDate, weeklySolved, asOf
  // written by the owner's client whenever progress changes;
  // readable by friends only (rules); NEVER contains notes/snippets
```

### Phase 5 implementation detail (rules v4)

`invites/{code}` maps a 128-bit random bearer code to its owner; direct get is
allowed to signed-in code holders, listing is denied. A recipient atomically
creates both friend documents; rules verify the invite owner, requester and
reciprocal `getAfter` state. Either party can remove the link. Summary reads
require both friend documents and the target profile's opt-in flag; profile,
notes and progress remain private. The optional profile `friendCode` tracks the
current code for rotation. Backups exclude invites, friend documents and
summaries and do not restore sharing. Summary `asOf` is the author's local day;
weekly counts are rolling seven days, and stale summaries are excluded from
ranking and the viewer-local session goal. Active listeners cost one initial
summary read per visible friend plus reads for updates; denied listeners retry
at most once a minute while the app is open. Cache cannot retract previously
observed data.

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

### Rules validation (generated from `data/problems.json`)

`tools/generate-firestore-rules.mjs` emits the versioned `firestore.rules`
from the single validated catalogue: 20 topic whitelists, 495 unique
problem ids. Default deny; owner-only `get/list/create/update/delete`
under `users/{uid}`; profile field types and size caps; progress entry
fields `s` (`todo|done|revision`), `b`, `a` (0–10000), `fd`/`lr`
(≤40 chars or null); one changed problem key per write; top-level shard
size capped at the topic's row count + `updatedAt`.

**Rules v2 (phase 3)** adds two owner-only collections without touching the
phase-2 rules above:

- `notes/{problemId}` — readable/listed/deletable by the owner; writes need a
  catalogue-shaped doc id (`^[a-z0-9][a-z0-9-]{0,79}$`), exactly
  `markdown`/`snippet`/`updatedAt`, string types, 5,000/8,000 caps, a
  non-empty note, and `updatedAt == request.time`.
- `lists/{listId}` — readable/listed/deletable by the owner; writes need an id
  matching `^[a-z0-9-]{8,40}$`, exactly `title`/`problemIds`/`updatedAt`, a
  1–60 character title, a list of ≤200 ids whose joined text is ≤12,000
  characters, and `updatedAt == request.time`.

**Rules v3 (phase 4)** adds the planner and the revision counter without
touching anything above except the entry field list:

- `plans/{date}` — owner `get/list/delete`; `create/update` require a day-key doc
  id (`^[0-9]{4}-[0-9]{2}-[0-9]{2}$`), exactly `problemIds`/`doneIds`/`updatedAt`,
  two lists of ≤200 ids with joined text ≤12,000, `doneIds` a subset of
  `problemIds`, and `updatedAt == request.time`.
- Progress entries now have exactly `s`, `b`, `a`, `fd`, `lr`, **`rc`** (int
  0–100). Phase-2/3 documents and v1/v2 backup entries without `rc` still load
  (readers default it to 0) and the backup parser normalizes it on import,
  because every v3 write must carry it.

Rules have no loops and only 1,000 evaluated expressions per request, so
catalogue membership for these two collections is enforced by the client and
the backup parser (recorded in `DECISIONS.md`), while the rules bound every
document's shape and size. The emulator suite (10 tests) covers stranger and
unauthenticated denial on both collections, invalid/oversized fields, unknown
extra keys, a non-server `updatedAt`, malformed note/list ids, over-long
titles, >200 ids, oversized joined id text, plus owner create/update/delete, and — since phase 4 — owner-only plan days,
day-id/field/size/subset validation and stranger denial on `plans`, with
`friends`/`public/summary` still proving that unknown collections stay denied.

## 4. Spark quota budget (official limits checked 2026-11-02)

`https://firebase.google.com/pricing` (fetched 2026-11-02), Spark:
Firestore Standard **50K reads/day · 20K writes/day · 1 GiB stored** ·
Hosting **360 MB/day transfer**.

Rough day for owner + 5 friends, cache misses only (cache hits = 0):

| Action | Reads | Writes |
|---|---|---|
| Login / app open (profile + 20 topic docs + notes/lists collections + today's plan) | ~24 | 0 |
| Solve/revise 10 problems (same 2–3 topics, batched per topic doc) | 0 | ≤10 |
| Notes: read 5, write 2 | 5 | 2 |
| Planner: tick 3 rows, revise 2 (plan writes + 2 progress writes) | 0 | ~5 |
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

## 6. Export / import (anti-lock-in — schema v3 since phase 4)

Export = one JSON file: `schemaVersion: 3`, `generatedBy`, `exportedAt`,
profile settings (including the real `dailyGoal`), all `progressByTopic` rows
(with `a`/`fd`/`lr` and `rc`), the real `notes[]` array (`problemId`,
`markdown`, `snippet`, `updatedAt`), the real `lists[]` array (`listId`,
`title`, `problemIds`, `updatedAt`), the real `plans[]` array (`date`,
`problemIds`, `doneIds`, `updatedAt` — every day, read on demand at export), and
an `excluded` list naming friends/summary
(they're social, not study data). `src/backup.ts` validates schema version,
catalogue ids, field types, per-note/per-list caps and a 4 MB file cap; the UI
previews row/topic/note/list/plan counts and only then replaces. Invalid files
show an explicit error. Import deletes existing topic shards, replays one-key
writes, restores profile settings (and the daily goal), then replaces notes,
lists and plan days one document per item.

**Recorded migration:** `parseBackup` accepts **schema 1, 2 and 3**. Phase-2
files wrote empty `notes`/`lists`/`plans` arrays, so they import unchanged and
simply restore none of them; a v1 or v2 file that claims note/list/plan content
is refused rather than guessed. A missing `rc` in a v1/v2 entry is normalized
to 0 before the restore writes it. This is also the migration path off Firebase if the owner
ever wants one — powerful must never mean trapped.
