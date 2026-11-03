import { describe, expect, it } from 'vitest'
import { catalogue } from './catalogue'
import type { ProgressByTopic } from './progress'
import {
  cloudShardFromFirestore,
  countCloudRows,
  isValidCloudEntry,
  nextCloudEntry,
  nextRevisionEntry,
  planGuestMerge,
  toUiProgress,
  type CloudProgressByTopic,
  type CloudProgressEntry,
} from './cloudProgress'

const arrays = catalogue.topics.find((topic) => topic.id === 'arrays')!
const ids = arrays.subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id))
const now = '2026-11-02T12:00:00.000Z'

function entry(overrides: Partial<CloudProgressEntry> = {}): CloudProgressEntry {
  return { s: 'done', b: false, a: 1, fd: now, lr: null, rc: 0, ...overrides }
}

describe('phase-2 cloud progress shape', () => {
  it('accepts only the validated fields and rejects hostile values', () => {
    expect(isValidCloudEntry(entry())).toBe(true)
    expect(isValidCloudEntry(entry({ o: 'hint' }))).toBe(true)
    expect(isValidCloudEntry(entry({ o: 'bad' as never }))).toBe(false)
    expect(isValidCloudEntry(entry({ s: 'todo', o: 'clean' }))).toBe(false)
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
    expect(shard).toEqual({ [ids[0]]: entry({ s: 'revision', b: true, a: 3, o: 'clean' }) })
    expect(toUiProgress({ arrays: shard })).toEqual({
      arrays: { [ids[0]]: { s: 'todo', b: true } },
    })
    expect(countCloudRows({ arrays: shard })).toBe(1)
  })

  it('adds attempts/dates on the first done toggle and preserves them afterwards', () => {
    const first = nextCloudEntry(undefined, { s: 'done', b: false }, 's', now)
    expect(first).toEqual({ s: 'done', b: false, a: 1, fd: now, lr: now, rc: 0, o: 'clean' })
    const bookmark = nextCloudEntry(first, { s: 'done', b: true }, 'b', '2026-11-03T12:00:00.000Z')
    expect(bookmark).toEqual({ s: 'done', b: true, a: 1, fd: now, lr: now, rc: 0, o: 'clean' })
    const undone = nextCloudEntry(bookmark, { s: 'todo', b: true }, 's', '2026-11-04T12:00:00.000Z')
    expect(undone).toEqual({ s: 'todo', b: true, a: 1, fd: now, lr: '2026-11-04T12:00:00.000Z', rc: 0 })
  })

  it('records the chosen outcome and clears it when a solved row is undone', () => {
    const solved = nextCloudEntry(undefined, { s: 'done', b: false, o: 'clean' }, 's', now)
    const withHint = nextCloudEntry(solved, { s: 'done', b: false, o: 'hint' }, 'o', now)
    expect(withHint.o).toBe('hint')
    const undone = nextCloudEntry(withHint, { s: 'todo', b: false }, 's', now)
    expect(undone).not.toHaveProperty('o')
  })

  it('keeps the phase-4 revision counter across ordinary toggles', () => {
    const revised = entry({ rc: 2, lr: '2026-11-05T00:00:00.000Z' })
    expect(nextCloudEntry(revised, { s: 'done', b: true }, 'b', '2026-11-06T00:00:00.000Z').rc).toBe(2)
  })
})

describe('phase-4 entry contract (rc)', () => {
  it('accepts missing rc for phase-2/3 documents and defaults it to 0', () => {
    const legacy = { s: 'done', b: false, a: 1, fd: now, lr: null }
    expect(isValidCloudEntry(legacy)).toBe(true)
    expect(cloudShardFromFirestore({ [ids[0]]: legacy })[ids[0]].rc).toBe(0)
  })

  it('rejects a hostile revision counter', () => {
    expect(isValidCloudEntry(entry({ rc: -1 }))).toBe(false)
    expect(isValidCloudEntry(entry({ rc: 1.5 }))).toBe(false)
    expect(isValidCloudEntry(entry({ rc: 101 }))).toBe(false)
    expect(isValidCloudEntry({ ...entry(), rc: '2' })).toBe(false)
  })

  it('bumps the counter, stamps lr and keeps the row solved on a revision', () => {
    const first = nextRevisionEntry(entry({ rc: 0, lr: now }), '2026-11-09T09:00:00.000Z')
    expect(first).toEqual({
      s: 'done',
      b: false,
      a: 1,
      fd: now,
      lr: '2026-11-09T09:00:00.000Z',
      rc: 1,
      o: 'clean',
    })
    expect(nextRevisionEntry(first, '2026-11-16T09:00:00.000Z').rc).toBe(2)
    // A revision never invents an fd, and it stops at the rules' ceiling.
    expect(nextRevisionEntry(undefined, now)).toMatchObject({ fd: now, lr: now, rc: 1, s: 'done' })
    expect(nextRevisionEntry(entry({ rc: 100 }), now).rc).toBe(100)
  })
})

describe('explicit guest → signed-in merge plan', () => {
  const cloud: CloudProgressByTopic = {
    arrays: { [ids[1]]: entry({ a: 4 }) },
  }

  it('uses the newest per-topic timestamp and removes cloud-only rows when guest wins', () => {
    const guest: ProgressByTopic = { arrays: { [ids[0]]: { s: 'done', b: false, o: 'clean' } } }
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
      entry: entry({ a: 1, fd: now, lr: null, o: 'clean' }),
    })
    expect(plan.writes).toContainEqual({ topicId: 'arrays', problemId: ids[1], entry: null })
  })

  it('never overwrites a newer cloud shard; the user still sees the proposal', () => {
    const guest: ProgressByTopic = { arrays: { [ids[0]]: { s: 'done', b: false, o: 'clean' } } }
    const plan = planGuestMerge(guest, cloud, { arrays: 500 }, { arrays: 1_000 }, now)
    expect(plan.guestRows).toBe(1)
    expect(plan.cloudRows).toBe(1)
    expect(plan.guestWins).toBe(0)
    expect(plan.cloudWins).toBe(1)
    expect(plan.writes).toEqual([])
  })
})
