# Phase 5 — friends (work in progress, not a phase record)

Phase 5 is **not complete**. There is no social UI, no friend access to
Firestore, no emulator proof and no phase-5 CI artifact yet. Default-deny
rules remain unchanged. The pure `src/friends.ts` module derives and
validates counts-only summaries, ranks summaries and calculates a rolling
seven-day group total; it is not wired into the application.

## Security design to implement and verify

The phase-4 schema's shorthand "existence = friendship (both sides written
client-side per rules)" needs an authorization protocol, not simply an
owner-writable friend document. If Alice may put any UID into her own friends
collection, then a rule checking only Alice's friend document lets her read
any opted-in person's summary without an invitation. Tests must reject that
attack, as well as one-sided and fabricated reciprocal friendships.

A candidate implementation is a high-entropy, revocable bearer invite held in
a direct-get-only invite document; a signed-in recipient uses it to establish
both membership documents atomically. Rules must validate the invite owner and
recipient, the reciprocal writes, and the allowed document shape using
`getAfter`, and allow either party to revoke the relationship. The precise
rules, collision handling, invite rotation, concurrent acceptance and get-call
budget need emulator tests before this is safe to connect. An invite link is a
bearer secret: avoid leaking it in logs, analytics, referrers or backups.

Summary reads must be limited to mutually linked friends while the target's
profile currently opts in. An owner can revoke sharing immediately even if an
old summary document remains cached; clients must discard stale state on
permission errors. Notes, snippets, progress and profiles remain private.
Do not deploy or change the default-deny rules without the security tests.

## Summary semantics under development

- Only the catalogue's known rows in their correct shards contribute.
- `asOf` records the local day on which a rolling seven-day count was derived.
  Counts with different dates must not silently be compared or added; the
  current helper omits stale summaries and reports their number. This is not a
  live, server-calculated group total, and time zones can differ.
- The parser refuses unknown fields, malformed dates, impossible counts and
  mismatched topic totals. Security rules must independently enforce the
  summary allowlist; a client parser is not an access control.
- Backup schema remains v3; no invite, friendship or summary is exported.

## Remaining

Implement and emulator-test invitation, reciprocal membership, opt-in summary
rules, revocation, private-data denial and hostile writes; add two-account
browser coverage, UI and snapshot updates, then finish phase documentation and
CI/preview verification. This file is a working note and does not close the
phase or substitute for the required phase record.
