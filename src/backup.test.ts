import { describe, expect, it } from 'vitest'
import { BackupError, createBackup, parseBackup } from './backup'
import type { CloudProgressEntry } from './cloudProgress'
import type { BackupList, BackupNote } from './library'
import type { BackupPlan } from './planner'

const now = '2026-11-02T12:00:00.000Z'
const cloudEntry: CloudProgressEntry = { s: 'done', b: true, a: 2, fd: now, lr: null, rc: 0 }
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
const plans: BackupPlan[] = [
  {
    date: '2026-11-03',
    problemIds: ['two-sum', 'linear-search'],
    doneIds: ['two-sum'],
    updatedAt: now,
  },
]
const input = {
  account: { displayName: 'CI Owner', email: 'ci.owner@example.test' },
  settings: { theme: 'dark' as const, largeText: false, hideDone: true },
  progressByTopic: { arrays: { 'two-sum': cloudEntry } },
  notes,
  lists,
  plans,
  dailyGoal: 7,
  exportedAt: now,
}

function copy() {
  return JSON.parse(createBackup(input))
}

function v1Copy() {
  const backup = copy()
  backup.schemaVersion = 1
  backup.notes = []
  backup.lists = []
  backup.plans = []
  return backup
}

function v2Copy() {
  const backup = copy()
  backup.schemaVersion = 2
  backup.plans = []
  // Phase-3 entries predate the revision counter.
  delete backup.progressByTopic.arrays['two-sum'].rc
  return backup
}

describe('JSON backup (schema v3, phases 2–4)', () => {
  it('round-trips profile, progress, notes, lists and plans with preview counts', () => {
    const parsed = parseBackup(createBackup(input))
    expect(parsed.counts).toEqual({ topics: 1, rows: 1, notes: 1, lists: 1, plans: 1 })
    expect(parsed.backup.schemaVersion).toBe(3)
    expect(parsed.backup.profile).toMatchObject({
      theme: 'dark',
      largeText: false,
      hideDone: true,
      dailyGoal: 7,
      shareSummary: false,
    })
    expect(parsed.backup.progressByTopic.arrays['two-sum']).toEqual(cloudEntry)
    expect(parsed.backup.notes).toEqual(notes)
    expect(parsed.backup.lists).toEqual(lists)
    expect(parsed.backup.plans).toEqual(plans)
    expect(parsed.backup.excluded).toContain('friends')
  })

  it('imports a phase-3 schemaVersion 2 file and defaults the missing revision counter', () => {
    const parsed = parseBackup(JSON.stringify(v2Copy()))
    expect(parsed.backup.schemaVersion).toBe(3)
    expect(parsed.counts).toEqual({ topics: 1, rows: 1, notes: 1, lists: 1, plans: 0 })
    expect(parsed.backup.progressByTopic.arrays['two-sum'].rc).toBe(0)
    expect(parsed.backup.plans).toEqual([])
  })

  it('still imports a phase-2 schemaVersion 1 file — the recorded migration', () => {
    const parsed = parseBackup(JSON.stringify(v1Copy()))
    expect(parsed.counts).toEqual({ topics: 1, rows: 1, notes: 0, lists: 0, plans: 0 })
    expect(parsed.backup.schemaVersion).toBe(3)
    expect(parsed.backup.notes).toEqual([])
    expect(parsed.backup.lists).toEqual([])
    expect(parsed.backup.plans).toEqual([])
  })

  it('refuses a v1 file that claims to carry notes, lists or plans', () => {
    const withNotes = v1Copy()
    withNotes.notes = notes
    expect(() => parseBackup(JSON.stringify(withNotes))).toThrowError(/cannot contain notes/)

    const withLists = v1Copy()
    withLists.lists = lists
    expect(() => parseBackup(JSON.stringify(withLists))).toThrowError(/cannot contain lists/)

    const v2WithPlans = v2Copy()
    v2WithPlans.plans = plans
    expect(() => parseBackup(JSON.stringify(v2WithPlans))).toThrowError(/cannot contain plans/)
  })

  it('rejects invalid JSON, unknown schema versions and oversized files', () => {
    expect(() => parseBackup('{not json')).toThrowError(BackupError)
    expect(() => parseBackup('{not json')).toThrowError(/not valid JSON/)
    expect(() => parseBackup(JSON.stringify({ ...copy(), schemaVersion: 9 }))).toThrowError(
      /unsupported schemaVersion/,
    )
    expect(() => parseBackup('x'.repeat(4_000_001))).toThrowError(/4 MB/)
  })

  it('rejects unknown catalogue ids and invalid progress entries', () => {
    const unknownTopic = copy()
    unknownTopic.progressByTopic = { 'not-a-topic': {} }
    expect(() => parseBackup(JSON.stringify(unknownTopic))).toThrowError(/unknown topic id/)

    const unknownProblem = copy()
    unknownProblem.progressByTopic.arrays['not-a-problem'] = cloudEntry
    expect(() => parseBackup(JSON.stringify(unknownProblem))).toThrowError(/unknown problem id/)

    const badAttempts = copy()
    badAttempts.progressByTopic.arrays['two-sum'].a = -1
    expect(() => parseBackup(JSON.stringify(badAttempts))).toThrowError(/invalid progress entry/)

    const badRevisionCount = copy()
    badRevisionCount.progressByTopic.arrays['two-sum'].rc = 500
    expect(() => parseBackup(JSON.stringify(badRevisionCount))).toThrowError(/invalid progress entry/)
  })

  it('validates every note: ids, sizes, emptiness and field set', () => {
    const base = copy

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
    const base = copy

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

  it('validates every plan day: date ids, subsets, sizes and field set', () => {
    const base = copy

    const badDate = base()
    badDate.plans[0].date = '03-11-2026'
    expect(() => parseBackup(JSON.stringify(badDate))).toThrowError(/invalid date/)

    const extra = base()
    extra.plans[0].goal = 5
    expect(() => parseBackup(JSON.stringify(extra))).toThrowError(/unexpected fields/)

    const unknownProblem = base()
    unknownProblem.plans[0].problemIds = ['two-sum', 'not-a-problem']
    expect(() => parseBackup(JSON.stringify(unknownProblem))).toThrowError(/not in this catalogue/)

    const notSubset = base()
    notSubset.plans[0].doneIds = ['linear-search']
    notSubset.plans[0].problemIds = ['two-sum']
    expect(() => parseBackup(JSON.stringify(notSubset))).toThrowError(/subset of its problemIds/)

    const tooMany = base()
    tooMany.plans[0].problemIds = Array.from({ length: 201 }, () => 'two-sum')
    expect(() => parseBackup(JSON.stringify(tooMany))).toThrowError(/more than 200/)

    const duplicateDay = base()
    duplicateDay.plans.push({ ...duplicateDay.plans[0] })
    expect(() => parseBackup(JSON.stringify(duplicateDay))).toThrowError(/duplicate plan/)

    const notArray = base()
    notArray.plans = { date: '2026-11-03' }
    expect(() => parseBackup(JSON.stringify(notArray))).toThrowError(/plans must be an array/)
  })
})
