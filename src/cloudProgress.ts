/**
 * Pure phase-2 cloud-progress shapes and merge planning. No Firebase imports:
 * these functions are unit-tested and reused by the account-data hook.
 *
 * Firestore's `progressByTopic/{topicId}` doc adds a/fd/lr to the phase-1
 * {s,b} row shape; `updatedAt` is a serverTimestamp on the doc, not the row.
 */
import type { ProblemProgress, ProgressByTopic, TopicProgress } from './progress'

export type CloudStatus = 'todo' | 'done' | 'revision'
export type CloudProgressEntry = {
  s: CloudStatus
  b: boolean
  a: number
  fd: string | null
  lr: string | null
  /**
   * Phase 4: how many times this problem has been revised (0 = never). It is
   * the only field phase 4 adds, and rules v3 requires it on every entry
   * write; readers default a missing value to 0 so phase-2/3 documents and
   * schema-v1/v2 backups still load unchanged.
   */
  rc: number
}
export type CloudTopicProgress = Record<string, CloudProgressEntry>
export type CloudProgressByTopic = Record<string, CloudTopicProgress>
export type CloudWrite = {
  topicId: string
  problemId: string
  entry: CloudProgressEntry | null
}

export type MergePlan = {
  writes: CloudWrite[]
  guestRows: number
  cloudRows: number
  guestWins: number
  cloudWins: number
  topicCount: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoLike(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 40
}

export function isValidCloudEntry(raw: unknown): raw is CloudProgressEntry {
  if (!isRecord(raw)) return false
  return (
    (raw.s === 'todo' || raw.s === 'done' || raw.s === 'revision') &&
    typeof raw.b === 'boolean' &&
    typeof raw.a === 'number' &&
    Number.isInteger(raw.a) &&
    raw.a >= 0 &&
    raw.a <= 10000 &&
    (raw.fd === null || isIsoLike(raw.fd)) &&
    (raw.lr === null || isIsoLike(raw.lr)) &&
    (raw.rc === undefined ||
      (typeof raw.rc === 'number' && Number.isInteger(raw.rc) && raw.rc >= 0 && raw.rc <= 100)) &&
    Object.keys(raw).every((key) => ['s', 'b', 'a', 'fd', 'lr', 'rc'].includes(key))
  )
}

/** Reads from Firestore are sanitized: a corrupt row cannot break the sheet. */
export function sanitizeCloudEntry(raw: unknown): CloudProgressEntry | null {
  if (!isRecord(raw)) return null
  const s: CloudStatus =
    raw.s === 'done' || raw.s === 'revision' || raw.s === 'todo' ? raw.s : 'todo'
  const a =
    typeof raw.a === 'number' && Number.isInteger(raw.a) && raw.a >= 0 && raw.a <= 10000
      ? raw.a
      : 0
  const rc =
    typeof raw.rc === 'number' && Number.isInteger(raw.rc) && raw.rc >= 0 && raw.rc <= 100
      ? raw.rc
      : 0
  return {
    s,
    b: raw.b === true,
    a,
    fd: isIsoLike(raw.fd) ? raw.fd : null,
    lr: isIsoLike(raw.lr) ? raw.lr : null,
    rc,
  }
}

export function cloudShardFromFirestore(data: Record<string, unknown>): CloudTopicProgress {
  const shard: CloudTopicProgress = {}
  for (const [problemId, value] of Object.entries(data)) {
    if (problemId === 'updatedAt') continue
    const entry = sanitizeCloudEntry(value)
    if (entry) shard[problemId] = entry
  }
  return shard
}

export function toUiProgress(cloud: CloudProgressByTopic): ProgressByTopic {
  const result: ProgressByTopic = {}
  for (const [topicId, shard] of Object.entries(cloud)) {
    const uiShard: TopicProgress = {}
    for (const [problemId, entry] of Object.entries(shard)) {
      // `revision` is stored for phase 4 but phase 2's row control is binary.
      const status: ProblemProgress['s'] = entry.s === 'done' ? 'done' : 'todo'
      uiShard[problemId] = { s: status, b: entry.b }
    }
    result[topicId] = uiShard
  }
  return result
}

export function countCloudRows(cloud: CloudProgressByTopic) {
  return Object.values(cloud).reduce((total, shard) => total + Object.keys(shard).length, 0)
}

/** Add the phase-2 metadata fields on a user toggle. */
export function nextCloudEntry(
  old: CloudProgressEntry | undefined,
  next: ProblemProgress,
  field: 's' | 'b',
  now: string,
): CloudProgressEntry {
  const becameDone = field === 's' && next.s === 'done' && old?.s !== 'done'
  return {
    s: next.s,
    b: next.b,
    a: (old?.a ?? 0) + (becameDone ? 1 : 0),
    fd: old?.fd ?? (next.s === 'done' ? now : null),
    lr: field === 's' ? now : (old?.lr ?? null),
    rc: old?.rc ?? 0,
  }
}

/**
 * 4.2 one-tap "revised": keep the problem solved, bump the revision count and
 * stamp `lr`. The schedule lives in `planner.ts` (3/7/21 days from `fd`/`lr`),
 * so a revision needs no other field and no extra document.
 */
export function nextRevisionEntry(old: CloudProgressEntry | undefined, now: string): CloudProgressEntry {
  return {
    s: 'done',
    b: old?.b ?? false,
    a: old?.a ?? 0,
    fd: old?.fd ?? now,
    lr: now,
    rc: Math.min(100, (old?.rc ?? 0) + 1),
  }
}

function guestEntryToCloud(
  old: CloudProgressEntry | undefined,
  guest: ProblemProgress,
  now: string,
): CloudProgressEntry {
  return {
    s: guest.s,
    b: guest.b,
    a: old?.a ?? (guest.s === 'done' ? 1 : 0),
    fd: old?.fd ?? (guest.s === 'done' ? now : null),
    lr: old?.lr ?? null,
    rc: old?.rc ?? 0,
  }
}

/**
 * Newest per-topic updatedAt wins. Guest timestamps are backfilled by
 * progress.ts; cloud timestamps come from each doc's server updatedAt.
 * The returned writes are one problem key per Firestore write, matching the
 * strict rules validation (Firestore Rules has no loops).
 */
export function planGuestMerge(
  guest: ProgressByTopic,
  cloud: CloudProgressByTopic,
  guestTimes: Record<string, number>,
  cloudTimes: Record<string, number>,
  now: string,
): MergePlan {
  const writes: CloudWrite[] = []
  const topicIds = new Set([...Object.keys(guest), ...Object.keys(cloud)])
  let guestRows = 0
  let cloudRows = 0
  let guestWins = 0
  let cloudWins = 0

  for (const topicId of topicIds) {
    const guestShard = guest[topicId] ?? {}
    const cloudShard = cloud[topicId] ?? {}
    const guestIds = Object.keys(guestShard)
    const cloudIds = Object.keys(cloudShard)
    guestRows += guestIds.length
    cloudRows += cloudIds.length
    if (guestIds.length === 0) continue

    const guestTime = guestTimes[topicId] ?? 0
    const cloudTime = cloudTimes[topicId] ?? 0
    if (cloudIds.length > 0 && cloudTime > guestTime) {
      cloudWins += 1
      continue
    }

    guestWins += 1
    for (const problemId of guestIds) {
      writes.push({
        topicId,
        problemId,
        entry: guestEntryToCloud(cloudShard[problemId], guestShard[problemId], now),
      })
    }
    // Guest shard is the newest whole-topic version, so remove cloud-only rows.
    for (const problemId of cloudIds) {
      if (!(problemId in guestShard)) writes.push({ topicId, problemId, entry: null })
    }
  }

  return {
    writes,
    guestRows,
    cloudRows,
    guestWins,
    cloudWins,
    topicCount: topicIds.size,
  }
}
