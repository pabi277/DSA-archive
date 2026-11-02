import { describe, expect, it } from 'vitest'
import { catalogue } from './catalogue'
import type { ProgressByTopic } from './progress'
import {
  cloudShardFromFirestore,
  countCloudRows,
  isValidCloudEntry,
  nextCloudEntry,
  planGuestMerge,
  toUiProgress,
  type CloudProgressByTopic,
  type CloudProgressEntry,
} from './cloudProgress'

const arrays = catalogue.topics.find((topic) => topic.id === 'arrays')!
const ids = arrays.subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id))
const now = '2026-11-02T12:00:00.000Z'

function entry(overrides: Partial<CloudProgressEntry> = {}): CloudProgressEntry {
  return { s: 'done', b: false, a: 1, fd: now, lr: null, ...overrides }
}

describe('phase-2 cloud progress shape', () => {
  it('accepts only the five validated fields and rejects hostile values', () => {
    expect(isValidCloudEntry(entry())).toBe(true)
    expect(isValidCloudEntry({ ...entry(), extra: true })).toBe(false)
    expect(isValidCloudEntry({ ...entry(), s: 'hacked' })).toBe(false)
    expect(isValidCloudEntry({ ...entry(), a: 10001 })).toBe(false)
    expect(isValidCloudEntry({ ...entry(), fd: 'x'.repeat(41) })).toBe(false)
  })

  it('sanitizes a Firestore shard and maps future revision status for the UI', () => {
    const shard = cloudShardFromFirestore({
      [ids[0]]: entry({ s: 'revision', b: true, a: 3 }),
      updatedAt: 'server timestamp',
      broken: 5,
    })
    expect(shard).toEqual({ [ids[0]]: entry({ s: 'revision', b: true, a: 3 }) })
    expect(toUiProgress({ arrays: shard })).toEqual({
      arrays: { [ids[0]]: { s: 'todo', b: true } },
    })
    expect(countCloudRows({ arrays: shard })).toBe(1)
  })

  it('adds attempts/dates on the first done toggle and preserves them afterwards', () => {
    const first = nextCloudEntry(undefined, { s: 'done', b: false }, 's', now)
    expect(first).toEqual({ s: 'done', b: false, a: 1, fd: now, lr: now })
    const bookmark = nextCloudEntry(first, { s: 'done', b: true }, 'b', '2026-11-03T12:00:00.000Z')
    expect(bookmark).toEqual({ s: 'done', b: true, a: 1, fd: now, lr: now })
    const undone = nextCloudEntry(bookmark, { s: 'todo', b: true }, 's', '2026-11-04T12:00:00.000Z')
    expect(undone).toEqual({ s: 'todo', b: true, a: 1, fd: now, lr: '2026-11-04T12:00:00.000Z' })
  })
})

describe('explicit guest → signed-in merge plan', () => {
  const cloud: CloudProgressByTopic = {
    arrays: { [ids[1]]: entry({ a: 4 }) },
  }

  it('uses the newest per-topic timestamp and removes cloud-only rows when guest wins', () => {
    const guest: ProgressByTopic = { arrays: { [ids[0]]: { s: 'done', b: false } } }
    const plan = planGuestMerge(guest, cloud, { arrays: 2_000 }, { arrays: 1_000 }, now)
    expect(plan).toMatchObject({
      guestRows: 1,
      cloudRows: 1,
      guestWins: 1,
      cloudWins: 0,
      topicCount: 1,
    })
    expect(plan.writes).toContainEqual({
      topicId: 'arrays',
      problemId: ids[0],
      entry: entry({ a: 1, fd: now, lr: null }),
    })
    expect(plan.writes).toContainEqual({ topicId: 'arrays', problemId: ids[1], entry: null })
  })

  it('never overwrites a newer cloud shard; the user still sees the proposal', () => {
    const guest: ProgressByTopic = { arrays: { [ids[0]]: { s: 'done', b: false } } }
    const plan = planGuestMerge(guest, cloud, { arrays: 500 }, { arrays: 1_000 }, now)
    expect(plan.guestRows).toBe(1)
    expect(plan.cloudRows).toBe(1)
    expect(plan.guestWins).toBe(0)
    expect(plan.cloudWins).toBe(1)
    expect(plan.writes).toEqual([])
  })
})
