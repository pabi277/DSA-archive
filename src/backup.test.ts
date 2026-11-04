import { describe, expect, it } from 'vitest'
import { BackupError, createBackup, parseBackup } from './backup'
import type { CloudProgressEntry } from './cloudProgress'
import type { BackupSnippet } from './code/codeStore'
import type { BackupList } from './library'
import type { BackupPlan } from './planner'
import type { BackupQuizResult } from './quiz/results'

const now = '2026-11-02T12:00:00.000Z'
const cloudEntry: CloudProgressEntry = { s: 'done', b: true, a: 2, fd: now, lr: null, rc: 0, o: 'clean' }
const snippets: BackupSnippet[] = [
  {
    problemId: 'two-sum',
    language: 'cpp',
    code: 'unordered_map<int, int> seen;',
    notes: 'Store the complement.',
    verdict: 'hint',
    updatedAt: now,
  },
]
/** The pre-v5 shape: one markdown body + one code field per problem. */
const legacyNotes = [
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
const quizResults: BackupQuizResult[] = [
  {
    topicId: 'arrays',
    bestScore: 11,
    bestTotal: 12,
    attempts: 2,
    lastScore: 10,
    lastAt: now,
    passed: true,
  },
]
const input = {
  account: { displayName: 'CI Owner', email: 'ci.owner@example.test' },
  settings: {
    theme: 'dark' as const,
    largeText: false,
    hideDone: true,
    density: 'compact' as const,
    railCollapsed: true,
  },
  progressByTopic: { arrays: { 'two-sum': cloudEntry } },
  snippets,
  lists,
  plans,
  quizResults,
  dailyGoal: 7,
  exportedAt: now,
}

function copy() {
  return JSON.parse(createBackup(input))
}

function v1Copy() {
  const backup = copy()
  backup.schemaVersion = 1
  delete backup.snippets
  delete backup.quizResults
  backup.notes = []
  backup.lists = []
  backup.plans = []
  return backup
}

function v4Copy() {
  const backup = copy()
  backup.schemaVersion = 4
  delete backup.snippets
  delete backup.quizResults
  backup.notes = legacyNotes.map((entry) => ({ ...entry }))
  return backup
}

function v5Copy() {
  const backup = copy()
  backup.schemaVersion = 5
  delete backup.quizResults
  return backup
}

describe('JSON backup (schema v6, reading 1–5)', () => {
  it('round-trips profile, progress, snippets, lists, plans and quizResults with preview counts', () => {
    const parsed = parseBackup(createBackup(input))
    expect(parsed.counts).toEqual({ topics: 1, rows: 1, snippets: 1, lists: 1, plans: 1, quizResults: 1 })
    expect(parsed.warnings).toEqual([])
    expect(parsed.backup.schemaVersion).toBe(6)
    expect(parsed.backup.profile).toMatchObject({
      theme: 'dark',
      largeText: false,
      hideDone: true,
      dailyGoal: 7,
      shareSummary: false,
    })
    expect(parsed.backup.progressByTopic.arrays['two-sum']).toEqual(cloudEntry)
    expect(parsed.backup.snippets).toEqual(snippets)
    expect(parsed.backup.lists).toEqual(lists)
    expect(parsed.backup.plans).toEqual(plans)
    expect(parsed.backup.quizResults).toEqual(quizResults)
    expect(parsed.backup.excluded).toContain('friends')
    // v2-01 device preferences ride along without a schema bump of their own.
    expect(parsed.backup.profile).toMatchObject({ density: 'compact', railCollapsed: true })
    // The exported file has no top-level notes array (the ≤500 `notes` field
    // *inside* a snippet is part of the new schema, not the removed feature).
    expect('notes' in JSON.parse(createBackup(input))).toBe(false)
  })

  it('defaults density and the rail on files written before v2-01 (device prefs are not data)', () => {
    const legacy = copy()
    delete legacy.profile.density
    delete legacy.profile.railCollapsed
    const parsed = parseBackup(JSON.stringify(legacy))
    expect(parsed.backup.profile).toMatchObject({ density: 'comfortable', railCollapsed: false })

    const malformed = { ...legacy, profile: { ...legacy.profile, density: 'enormous', railCollapsed: 'yes' } }
    expect(parseBackup(JSON.stringify(malformed)).backup.profile).toMatchObject({
      density: 'comfortable',
      railCollapsed: false,
    })
  })

  it('migrates a schemaVersion 4 backup: code kept exactly, markdown shortened with a named warning', () => {
    const parsed = parseBackup(JSON.stringify(v4Copy()))
    expect(parsed.backup.schemaVersion).toBe(6)
    expect(parsed.counts).toEqual({ topics: 1, rows: 1, snippets: 1, lists: 1, plans: 1, quizResults: 0 })
    expect(parsed.backup.snippets).toEqual([
      {
        problemId: 'two-sum',
        language: 'other',
        code: 'const seen = new Map()',
        notes: 'Two sum Use a hash map and store the complement.',
        updatedAt: now,
      },
    ])
    expect(parsed.warnings).toHaveLength(1)
    expect(parsed.warnings[0]).toContain('two-sum')
    expect(parsed.warnings[0]).toContain('markdown dropped')
    // Progress normalization from earlier schemas is unchanged.
    expect(parsed.backup.progressByTopic.arrays['two-sum'].rc).toBe(0)
    expect(parsed.backup.progressByTopic.arrays['two-sum'].o).toBe('clean')
  })

  it('imports a schemaVersion 5 backup cleanly with empty quizResults', () => {
    const parsed = parseBackup(JSON.stringify(v5Copy()))
    expect(parsed.backup.schemaVersion).toBe(6)
    expect(parsed.counts).toEqual({ topics: 1, rows: 1, snippets: 1, lists: 1, plans: 1, quizResults: 0 })
    expect(parsed.backup.snippets).toEqual(snippets)
    expect(parsed.backup.quizResults).toEqual([])
  })

  it('migrates a code-only legacy note without a warning', () => {
    const legacy = v4Copy()
    legacy.notes = [{ problemId: 'two-sum', markdown: '', snippet: 'int main() {}', updatedAt: now }]
    const parsed = parseBackup(JSON.stringify(legacy))
    expect(parsed.warnings).toEqual([])
    expect(parsed.backup.snippets[0]).toMatchObject({ code: 'int main() {}', notes: '' })
  })

  it('still imports a phase-2 schemaVersion 1 file — the recorded migration', () => {
    const parsed = parseBackup(JSON.stringify(v1Copy()))
    expect(parsed.counts).toEqual({ topics: 1, rows: 1, snippets: 0, lists: 0, plans: 0, quizResults: 0 })
    expect(parsed.backup.schemaVersion).toBe(6)
    expect(parsed.backup.snippets).toEqual([])
    expect(parsed.backup.lists).toEqual([])
    expect(parsed.backup.plans).toEqual([])
    expect(parsed.backup.quizResults).toEqual([])
  })

  it('refuses cross-generation library claims instead of guessing', () => {
    const v1WithNotes = v1Copy()
    v1WithNotes.notes = legacyNotes
    expect(() => parseBackup(JSON.stringify(v1WithNotes))).toThrowError(/cannot contain notes/)

    const v1WithLists = v1Copy()
    v1WithLists.lists = lists
    expect(() => parseBackup(JSON.stringify(v1WithLists))).toThrowError(/cannot contain lists/)

    const v4WithSnippets = v4Copy()
    v4WithSnippets.snippets = snippets
    expect(() => parseBackup(JSON.stringify(v4WithSnippets))).toThrowError(/cannot contain snippets/)

    const v6WithNotes = copy()
    v6WithNotes.notes = legacyNotes
    expect(() => parseBackup(JSON.stringify(v6WithNotes))).toThrowError(/cannot contain notes/)

    const v5WithQuizzes = v5Copy()
    v5WithQuizzes.quizResults = quizResults
    expect(() => parseBackup(JSON.stringify(v5WithQuizzes))).toThrowError(/cannot contain quizResults/)

    const v2WithPlans = v4Copy()
    v2WithPlans.schemaVersion = 2
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

  it('validates every snippet: ids, languages, verdicts, sizes, emptiness and field set', () => {
    const base = copy

    const unknown = base()
    unknown.snippets[0].problemId = 'not-a-problem'
    expect(() => parseBackup(JSON.stringify(unknown))).toThrowError(/does not name a problem/)

    const badLanguage = base()
    badLanguage.snippets[0].language = 'cobol'
    expect(() => parseBackup(JSON.stringify(badLanguage))).toThrowError(/not a supported language/)

    const badVerdict = base()
    badVerdict.snippets[0].verdict = 'lucky-guess'
    expect(() => parseBackup(JSON.stringify(badVerdict))).toThrowError(/clean, hint or couldnt/)

    const oversizedCode = base()
    oversizedCode.snippets[0].code = 'x'.repeat(8001)
    expect(() => parseBackup(JSON.stringify(oversizedCode))).toThrowError(/over 8000/)

    const oversizedNotes = base()
    oversizedNotes.snippets[0].notes = 'x'.repeat(501)
    expect(() => parseBackup(JSON.stringify(oversizedNotes))).toThrowError(/over 500/)

    const empty = base()
    empty.snippets[0].code = '   '
    empty.snippets[0].notes = ''
    expect(() => parseBackup(JSON.stringify(empty))).toThrowError(/is empty/)

    const extra = base()
    extra.snippets[0].colour = 'red'
    expect(() => parseBackup(JSON.stringify(extra))).toThrowError(/unexpected fields/)

    const duplicate = base()
    duplicate.snippets.push({ ...duplicate.snippets[0] })
    expect(() => parseBackup(JSON.stringify(duplicate))).toThrowError(/duplicate snippet/)

    const badStamp = base()
    badStamp.snippets[0].updatedAt = 'x'.repeat(41)
    expect(() => parseBackup(JSON.stringify(badStamp))).toThrowError(/ISO timestamp/)

    const notArray = base()
    notArray.snippets = 'two-sum'
    expect(() => parseBackup(JSON.stringify(notArray))).toThrowError(/snippets must be an array/)
  })

  it('validates legacy notes before migrating them', () => {
    const oversized = v4Copy()
    oversized.notes[0].markdown = 'x'.repeat(5001)
    expect(() => parseBackup(JSON.stringify(oversized))).toThrowError(/over 5000/)

    const empty = v4Copy()
    empty.notes[0].markdown = '   '
    empty.notes[0].snippet = ''
    expect(() => parseBackup(JSON.stringify(empty))).toThrowError(/is empty/)

    const duplicate = v4Copy()
    duplicate.notes.push({ ...duplicate.notes[0] })
    expect(() => parseBackup(JSON.stringify(duplicate))).toThrowError(/duplicate note/)
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

  it('validates every quizResult: topicId, score bounds, attempts cap and field set', () => {
    const base = copy

    const badTopic = base()
    badTopic.quizResults[0].topicId = 'not-a-topic'
    expect(() => parseBackup(JSON.stringify(badTopic))).toThrowError(/does not name a topic/)

    const scoreOverTotal = base()
    scoreOverTotal.quizResults[0].bestScore = 12
    scoreOverTotal.quizResults[0].bestTotal = 10
    expect(() => parseBackup(JSON.stringify(scoreOverTotal))).toThrowError(/0 to bestTotal/)

    const totalOverCap = base()
    totalOverCap.quizResults[0].bestTotal = 13
    expect(() => parseBackup(JSON.stringify(totalOverCap))).toThrowError(/1 to 12/)

    const attemptsOverCap = base()
    attemptsOverCap.quizResults[0].attempts = 1000
    expect(() => parseBackup(JSON.stringify(attemptsOverCap))).toThrowError(/1 to 999/)

    const duplicate = base()
    duplicate.quizResults.push({ ...duplicate.quizResults[0] })
    expect(() => parseBackup(JSON.stringify(duplicate))).toThrowError(/duplicate quiz result/)

    const extra = base()
    extra.quizResults[0].seed = 1
    expect(() => parseBackup(JSON.stringify(extra))).toThrowError(/unexpected fields/)

    const notArray = base()
    notArray.quizResults = { arrays: 11 }
    expect(() => parseBackup(JSON.stringify(notArray))).toThrowError(/quizResults must be an array/)
  })
})
