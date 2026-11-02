import { useSyncExternalStore } from 'react'
import { catalogue, type Topic } from './catalogue'

/**
 * Local (guest) progress for phase 1, kept in phase 2 as the merge source.
 *
 * Shape deliberately mirrors `docs/DATA-MODEL.md` §3
 * `users/{uid}/progressByTopic/{topicId}` — `{ [problemId]: { s, b } }` —
 * so phase 2 can merge guest rows into Firestore without a data migration.
 * The richer cloud-only fields (a/fd/lr/updatedAt) live in cloudProgress.ts.
 * Catalogue ids are the join key; row positions are never stored.
 */

export type Status = 'todo' | 'done'
export type ProblemProgress = { s: Status; b: boolean }
export type TopicProgress = Record<string, ProblemProgress>
export type ProgressByTopic = Record<string, TopicProgress>
export type GuestTimestamps = Record<string, number>

const STORAGE_KEY = 'dsa-archive.progress.v1'
const TIME_KEY = 'dsa-archive.progress.updatedAt.v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Drop anything that is not a well-formed entry: never trust stored JSON. */
function sanitize(raw: unknown): ProgressByTopic {
  if (!isRecord(raw)) return {}
  const next: ProgressByTopic = {}
  for (const [topicId, entries] of Object.entries(raw)) {
    if (!isRecord(entries)) continue
    const kept: TopicProgress = {}
    for (const [problemId, entry] of Object.entries(entries)) {
      if (!isRecord(entry)) continue
      const status: Status = entry.s === 'done' ? 'done' : 'todo'
      const bookmarked = entry.b === true
      if (status === 'todo' && !bookmarked) continue
      kept[problemId] = { s: status, b: bookmarked }
    }
    if (Object.keys(kept).length > 0) next[topicId] = kept
  }
  return next
}

function readStorage(): ProgressByTopic {
  try {
    return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
  } catch {
    return {}
  }
}

function writeStorage(progress: ProgressByTopic) {
  try {
    if (Object.keys(progress).length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Private-mode/quota failures must never break browsing the sheet.
  }
}

function readGuestTimestamps(): GuestTimestamps {
  try {
    const raw = JSON.parse(localStorage.getItem(TIME_KEY) ?? '{}')
    if (!isRecord(raw)) return {}
    const result: GuestTimestamps = {}
    for (const [topicId, value] of Object.entries(raw)) {
      if (typeof value === 'number' && Number.isFinite(value)) result[topicId] = value
    }
    return result
  } catch {
    return {}
  }
}

function writeGuestTimestamps(times: GuestTimestamps) {
  try {
    if (Object.keys(times).length === 0) localStorage.removeItem(TIME_KEY)
    else localStorage.setItem(TIME_KEY, JSON.stringify(times))
  } catch {
    // Timestamps are merge metadata; browsing must still work without them.
  }
}

/**
 * Per-topic guest `updatedAt` values for the visible merge. Phase-1 rows had
 * no timestamps, so missing ones are backfilled once with the current time.
 */
export function getGuestTimestamps(): GuestTimestamps {
  const progress = current()
  const stored = readGuestTimestamps()
  const result: GuestTimestamps = {}
  const now = Date.now()
  let changed = false
  for (const topicId of Object.keys(progress)) {
    if (typeof stored[topicId] === 'number' && Number.isFinite(stored[topicId])) {
      result[topicId] = stored[topicId]
    } else {
      result[topicId] = now
      changed = true
    }
  }
  if (changed || Object.keys(stored).length !== Object.keys(result).length) {
    writeGuestTimestamps(result)
  }
  return result
}

let cached: ProgressByTopic | null = null
const listeners = new Set<() => void>()

function current(): ProgressByTopic {
  if (cached === null) cached = readStorage()
  return cached
}

function commit(next: ProgressByTopic, topicId?: string) {
  cached = next
  writeStorage(next)
  if (topicId) {
    const times = readGuestTimestamps()
    times[topicId] = Date.now()
    const pruned: GuestTimestamps = {}
    for (const id of Object.keys(next)) pruned[id] = times[id] ?? Date.now()
    writeGuestTimestamps(pruned)
  } else if (Object.keys(next).length === 0) {
    writeGuestTimestamps({})
  }
  for (const listener of listeners) listener()
}

function entryAt(progress: ProgressByTopic, topicId: string, problemId: string): ProblemProgress {
  return progress[topicId]?.[problemId] ?? { s: 'todo', b: false }
}

function toggle(
  progress: ProgressByTopic,
  topicId: string,
  problemId: string,
  field: 's' | 'b',
): ProgressByTopic {
  const entry = entryAt(progress, topicId, problemId)
  const nextEntry: ProblemProgress = {
    s: field === 's' ? (entry.s === 'done' ? 'todo' : 'done') : entry.s,
    b: field === 'b' ? !entry.b : entry.b,
  }
  const topicShard = { ...(progress[topicId] ?? {}) }
  if (nextEntry.s === 'todo' && !nextEntry.b) delete topicShard[problemId]
  else topicShard[problemId] = nextEntry

  const next = { ...progress }
  if (Object.keys(topicShard).length === 0) delete next[topicId]
  else next[topicId] = topicShard
  return next
}

export function subscribeProgress(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getProgressSnapshot(): ProgressByTopic {
  return current()
}

export function useProgress(): ProgressByTopic {
  return useSyncExternalStore(subscribeProgress, getProgressSnapshot, getProgressSnapshot)
}

export function isDone(progress: ProgressByTopic, topicId: string, problemId: string) {
  return entryAt(progress, topicId, problemId).s === 'done'
}

export function isBookmarked(progress: ProgressByTopic, topicId: string, problemId: string) {
  return entryAt(progress, topicId, problemId).b
}

export function markDone(topicId: string, problemId: string) {
  commit(toggle(current(), topicId, problemId, 's'), topicId)
}

export function markBookmarked(topicId: string, problemId: string) {
  commit(toggle(current(), topicId, problemId, 'b'), topicId)
}

export function clearProgress() {
  commit({})
}

/** Test/review helper: forget stored rows without touching the UI. */
export function resetProgressStoreForTests() {
  cached = null
}

export function countProgressRows(progress: ProgressByTopic) {
  return Object.values(progress).reduce((total, shard) => total + Object.keys(shard).length, 0)
}

export type Tally = { done: number; bookmarked: number; total: number; percent: number }

function percent(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

export function tallyTopic(progress: ProgressByTopic, topic: Topic): Tally {
  const shard = progress[topic.id] ?? {}
  let done = 0
  let bookmarked = 0
  let total = 0
  for (const subtopic of topic.subtopics) {
    for (const problem of subtopic.problems) {
      total += 1
      const entry = shard[problem.id]
      if (!entry) continue
      if (entry.s === 'done') done += 1
      if (entry.b) bookmarked += 1
    }
  }
  return { done, bookmarked, total, percent: percent(done, total) }
}

export function tallyCatalogue(progress: ProgressByTopic, data: Topic[] = catalogue.topics): Tally {
  let done = 0
  let bookmarked = 0
  let total = 0
  for (const topic of data) {
    const tally = tallyTopic(progress, topic)
    done += tally.done
    bookmarked += tally.bookmarked
    total += tally.total
  }
  return { done, bookmarked, total, percent: percent(done, total) }
}
