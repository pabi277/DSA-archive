import { describe, expect, it } from 'vitest'
import { BackupError, createBackup, parseBackup } from './backup'
import type { CloudProgressEntry } from './cloudProgress'
import type { BackupList, BackupNote } from './library'

const now = '2026-11-02T12:00:00.000Z'
const cloudEntry: CloudProgressEntry = { s: 'done', b: true, a: 2, fd: now, lr: null }
const notes: BackupNote[] = [
  {
    problemId: 'two-sum',
    markdown: '# Two sum\nUse a **hash map** and store the complement.',
    snippet: 'const seen = new Map()',
    updatedAt: now,
  },
]
const lists: BackupList[] = [
  {
    listId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    title: 'Interview warmup',
    problemIds: ['two-sum', 'linear-search'],
    updatedAt: now,
  },
]
const input = {
  account: { displayName: 'CI Owner', email: 'ci.owner@example.test' },
  settings: { theme: 'dark' as const, largeText: false, hideDone: true },
  progressByTopic: { arrays: { 'two-sum': cloudEntry } },
  notes,
  lists,
  exportedAt: now,
}

function v1Copy() {
  const backup = JSON.parse(createBackup(input))
  backup.schemaVersion = 1
  backup.notes = []
  backup.lists = []
  return backup
}

describe('phase-3 JSON backup (schema v2)', () => {
  it('round-trips profile, progress, notes and lists with preview counts', () => {
    const text = createBackup(input)
    const parsed = parseBackup(text)
    expect(parsed.counts).toEqual({ topics: 1, rows: 1, notes: 1, lists: 1, plans: 0 })
    expect(parsed.backup.schemaVersion).toBe(2)
    expect(parsed.backup.profile).toMatchObject({
      theme: 'dark',
      largeText: false,
      hideDone: true,
      dailyGoal: 5,
      shareSummary: false,
    })
    expect(parsed.backup.progressByTopic.arrays['two-sum']).toEqual(cloudEntry)
    expect(parsed.backup.notes).toEqual(notes)
    expect(parsed.backup.lists).toEqual(lists)
    expect(parsed.backup.excluded).toContain('friends')
  })

  it('still imports a phase-2 schemaVersion 1 file — the recorded migration', () => {
    const parsed = parseBackup(JSON.stringify(v1Copy()))
    expect(parsed.counts).toEqual({ topics: 1, rows: 1, notes: 0, lists: 0, plans: 0 })
    expect(parsed.backup.schemaVersion).toBe(2)
    expect(parsed.backup.notes).toEqual([])
    expect(parsed.backup.lists).toEqual([])
  })

  it('rejects a v1 file that claims to carry notes or lists instead of guessing', () => {
    const withNotes = v1Copy()
    withNotes.notes = notes
    expect(() => parseBackup(JSON.stringify(withNotes))).toThrowError(/cannot contain notes/)
    const withLists = v1Copy()
    withLists.lists = lists
    expect(() => parseBackup(JSON.stringify(withLists))).toThrowError(/cannot contain lists/)
  })

  it('rejects invalid JSON, unknown schema versions and oversized files', () => {
    expect(() => parseBackup('{not json')).toThrowError(BackupError)
    expect(() => parseBackup('{not json')).toThrowError(/not valid JSON/)
    expect(() => parseBackup(JSON.stringify({ ...JSON.parse(createBackup(input)), schemaVersion: 9 }))).toThrowError(
      /unsupported schemaVersion/,
    )
    expect(() => parseBackup('x'.repeat(4_000_001))).toThrowError(/4 MB/)
  })

  it('rejects unknown catalogue ids and invalid progress entries', () => {
    const backup = JSON.parse(createBackup(input))
    backup.progressByTopic = { 'not-a-topic': {} }
    expect(() => parseBackup(JSON.stringify(backup))).toThrowError(/unknown topic id/)

    const backup2 = JSON.parse(createBackup(input))
    backup2.progressByTopic.arrays['not-a-problem'] = cloudEntry
    expect(() => parseBackup(JSON.stringify(backup2))).toThrowError(/unknown problem id/)

    const backup3 = JSON.parse(createBackup(input))
    backup3.progressByTopic.arrays['two-sum'].a = -1
    expect(() => parseBackup(JSON.stringify(backup3))).toThrowError(/invalid progress entry/)
  })

  it('validates every note: ids, sizes, emptiness and field set', () => {
    const base = () => JSON.parse(createBackup(input))

    const unknown = base()
    unknown.notes[0].problemId = 'not-a-problem'
    expect(() => parseBackup(JSON.stringify(unknown))).toThrowError(/does not name a problem/)

    const oversized = base()
    oversized.notes[0].markdown = 'x'.repeat(5001)
    expect(() => parseBackup(JSON.stringify(oversized))).toThrowError(/over 5000/)

    const empty = base()
    empty.notes[0].markdown = '   '
    empty.notes[0].snippet = ''
    expect(() => parseBackup(JSON.stringify(empty))).toThrowError(/is empty/)

    const extra = base()
    extra.notes[0].colour = 'red'
    expect(() => parseBackup(JSON.stringify(extra))).toThrowError(/unexpected fields/)

    const duplicate = base()
    duplicate.notes.push({ ...duplicate.notes[0] })
    expect(() => parseBackup(JSON.stringify(duplicate))).toThrowError(/duplicate note/)

    const badStamp = base()
    badStamp.notes[0].updatedAt = 'x'.repeat(41)
    expect(() => parseBackup(JSON.stringify(badStamp))).toThrowError(/ISO timestamp/)

    const notArray = base()
    notArray.notes = 'two-sum'
    expect(() => parseBackup(JSON.stringify(notArray))).toThrowError(/notes must be an array/)
  })

  it('validates every list: ids, titles, sizes and known problems', () => {
    const base = () => JSON.parse(createBackup(input))

    const badId = base()
    badId.lists[0].listId = 'abc'
    expect(() => parseBackup(JSON.stringify(badId))).toThrowError(/invalid listId/)

    const noTitle = base()
    noTitle.lists[0].title = '   '
    expect(() => parseBackup(JSON.stringify(noTitle))).toThrowError(/no title/)

    const longTitle = base()
    longTitle.lists[0].title = 'x'.repeat(61)
    expect(() => parseBackup(JSON.stringify(longTitle))).toThrowError(/over 60/)

    const unknownProblem = base()
    unknownProblem.lists[0].problemIds = ['two-sum', 'not-a-problem']
    expect(() => parseBackup(JSON.stringify(unknownProblem))).toThrowError(/not in this catalogue/)

    const tooMany = base()
    tooMany.lists[0].problemIds = Array.from({ length: 201 }, () => 'two-sum')
    expect(() => parseBackup(JSON.stringify(tooMany))).toThrowError(/more than 200/)

    const extra = base()
    extra.lists[0].colour = 'red'
    expect(() => parseBackup(JSON.stringify(extra))).toThrowError(/unexpected fields/)

    const notArray = base()
    notArray.lists = { a: 1 }
    expect(() => parseBackup(JSON.stringify(notArray))).toThrowError(/lists must be an array/)
  })
})
