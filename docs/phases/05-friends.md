# Phase 5 — Friends (opt-in)

## Implementation

- Friends view: a 128-bit random invite code (not a URL), rotation, add and
  remove. A code is a bearer capability: anyone signed in who knows it may
  establish friendship, so share it privately and rotate it after removing
  somebody who knows it. Rotation prevents future use of the old code but
  does not remove existing friends. Friendships are reciprocal; either party
  may remove both records. Backups remain schema v3 and exclude social data.
- Sharing defaults off. Turning it on publishes a counts-only summary; turning
  it off changes the profile before deleting the summary, so rules deny future
  server reads even if the deletion fails. Firestore's persistent cache cannot
  erase a copy already observed by a friend; no client or rule can retract
  knowledge already disclosed. This client does not show cached summaries
  without server confirmation and clears them on permission errors.
- Summary has display name, total and per-topic counts, streak, last active
  date, rolling seven-day solves and the local day `asOf`. No notes, snippets,
  bookmarks, row ids or progress detail. Publication occurs when owner
  progress or local day changes; the reader validates the exact shape. Retry
  of denied friend listeners uses exponential backoff (2 seconds to one minute), not for healthy listeners.
- The ranking includes only available summaries calculated on the viewer's
  current local day. Stale and unavailable friends are reported, not counted
  as zero. The group goal is a **viewer-local, session-only target** over these
  rolling-seven-day counts, not a synchronized shared goal or calendar week.
  Time zone differences can make otherwise recent summaries appear stale.
- Firestore rules v4 use a direct-get-only `invites/{randomCode}`, plus
  `users/{uid}/friends/{friendUid}`. Acceptance creates both documents in a
  single atomic batch; rules verify the invite, both parties and `getAfter`
  reciprocal record. A unilateral owner-written friend record is denied.
  Summary reads check both relationship records and the target's current
  sharing flag (three document accesses; within Firestore's ten-per-request
  limit). Summary writes validate an exact field allowlist, every catalogue
  topic and its bounds. Friends cannot read each other's profiles, notes,
  lists or progress details. The optional `friendCode` field preserves old
  profile creates and merge-style updates.
- Reused existing React, Firebase, pure planner stats and approved styles;
  no dependency was added. No copied `copy-web/` material was used. Frozen
  design tokens are unchanged. The existing tab strip adds Friends; bottom
  navigation stays deferred. No live Firebase project or service was changed.

## Verification

- Local: 118 unit tests, catalogue validation, generated-rules check,
  emulator-configured production build, dist and link checks passed.
- CI [run 41528159501](https://github.com/pabi277/DSA-archive/actions/runs/41528159501)
  passed at `3218933`: includes emulator rules and a two-context phone
  acceptance test that adds a friend, sees an opted-in summary, observes the
  leaderboard update after a solve, revokes sharing and removes friendship.
  `site-preview` artifact: 330,678 bytes. A follow-up run exposed an acknowledgement race; the fix and axe audit require another green CI run before treating the phase as done.
- The sandbox has no Java or installed browser; CI is the emulator and browser
  authority. The phone screenshot is captured by CI but cannot be downloaded
  in this sandbox for direct visual comparison. No claim of visual review is
  made; the owner should compare the preview against the approved mock.

## Preview and gate

The emulator-configured preview shows the new Friends tab. Signed-out visitors
can browse the sheet and see a sign-in explanation. With two emulator accounts,
Friends shows code creation, sharing switch, list, per-topic comparison,
leaderboard and a viewer-local goal. A static preview without running Firebase
emulators cannot exercise social actions. Stop at the merge gate: no PR,
merge or deploy without a fresh explicit owner command.
