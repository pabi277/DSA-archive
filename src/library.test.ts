import { describe, expect, it } from 'vitest'
import {
  LIST_ID_PATTERN,
  LIST_MAX_PROBLEMS,
  addProblemToList,
  isKnownProblemId,
  listsContaining,
  listsForBackup,
  locateProblem,
  newListId,
  notesForBackup,
  removeProblemFromList,
  sanitizeList,
  sanitizeNote,
  searchNotes,
  sortNotes,
  timestampToIso,
  type CustomList,
  type Note,
  type NotesById,
} from './library'

const listId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const now = '2026-11-02T12:00:00.000Z'

function note(problemId: string, overrides: Partial<Note> = {}): Note {
  return { problemId, markdown: '', snippet: '', updatedAt: now, ...overrides }
}

function list(overrides: Partial<CustomList> = {}): CustomList {
  return { id: listId, title: 'Interview warmup', problemIds: ['two-sum'], updatedAt: now, ...overrides }
}

describe('phase-3 note model', () => {
  it('locates catalogue problems and rejects unknown ids', () => {
    expect(locateProblem('two-sum')).toMatchObject({ topicId: 'arrays', topicTitle: 'Arrays' })
    expect(locateProblem('linear-search')?.problem.title).toBe('Linear Search')
    expect(isKnownProblemId('not-a-problem')).toBe(false)
    expect(locateProblem('not-a-problem')).toBeNull()
  })

  it('reads Firestore timestamps, seconds stubs and ISO strings', () => {
    const date = new Date(now)
    expect(timestampToIso({ toDate: () => date })).toBe(now)
    expect(timestampToIso({ seconds: date.getTime() / 1000 })).toBe(now)
    expect(timestampToIso(now)).toBe(now)
    expect(timestampToIso(null)).toBeNull()
    expect(timestampToIso({ toDate: () => new Date('nonsense') })).toBeNull()
  })

  it('sanitizes notes, clamps sizes and treats an empty note as absent', () => {
    expect(sanitizeNote('two-sum', null)).toBeNull()
    expect(sanitizeNote('two-sum', { markdown: '   ', snippet: '' })).toBeNull()
    expect(sanitizeNote('two-sum', { markdown: 42, snippet: '' })).toBeNull()

    const read = sanitizeNote('two-sum', {
      markdown: '# Hash map',
      snippet: 'const seen = new Map()',
      updatedAt: { toDate: () => new Date(now) },
    })
    expect(read).toEqual({
      problemId: 'two-sum',
      markdown: '# Hash map',
      snippet: 'const seen = new Map()',
      updatedAt: now,
    })

    const clamped = sanitizeNote('two-sum', { markdown: 'x'.repeat(6000), snippet: 'y'.repeat(9000) })
    expect(clamped?.markdown.length).toBe(5000)
    expect(clamped?.snippet.length).toBe(8000)
  })

  it('sorts notes newest first and searches markdown, snippet, title and topic', () => {
    const notes: NotesById = {
      'two-sum': note('two-sum', { markdown: 'Hash map trick', updatedAt: '2026-11-01T00:00:00.000Z' }),
      'linear-search': note('linear-search', { snippet: 'for (i...)', updatedAt: now }),
      'merge-sort': note('merge-sort', { markdown: 'Divide and conquer' }),
    }
    // Newest first; equal timestamps fall back to the problem title.
    expect(sortNotes(Object.values(notes)).map((entry) => entry.problemId)).toEqual([
      'linear-search',
      'merge-sort',
      'two-sum',
    ])

    expect(searchNotes(notes, 'hash map').map((entry) => entry.problemId)).toEqual(['two-sum'])
    expect(searchNotes(notes, 'linear').map((entry) => entry.problemId)).toEqual(['linear-search'])
    // Topic-title matching: Two Sum + Linear Search live in Arrays.
    expect(searchNotes(notes, 'arrays').length).toBe(2)
    expect(searchNotes(notes, '')).toHaveLength(3)
    expect(searchNotes(notes, 'nothing-here')).toEqual([])
  })

  it('builds backup arrays sorted by title and recency', () => {
    const notes: NotesById = {
      'two-sum': note('two-sum', { markdown: 'a', updatedAt: '2026-11-01T00:00:00.000Z' }),
      'linear-search': note('linear-search', { markdown: 'b', updatedAt: now }),
    }
    expect(notesForBackup(notes).map((entry) => entry.problemId)).toEqual(['linear-search', 'two-sum'])

    const lists = { [listId]: list(), bbbb: list({ id: 'bbbb-1111-4111-8111-bbbbbbbbbbbb', title: 'Arrays drill' }) }
    expect(listsForBackup(lists).map((entry) => entry.title)).toEqual(['Arrays drill', 'Interview warmup'])
    expect(listsForBackup(lists)[0]).toMatchObject({ listId: 'bbbb-1111-4111-8111-bbbbbbbbbbbb' })
  })
})

describe('phase-3 custom lists', () => {
  it('sanitizes Firestore lists, dropping unknown or duplicate problems', () => {
    expect(sanitizeList('short', { title: 'x', problemIds: [] })).toBeNull()
    expect(sanitizeList(listId, { title: '   ', problemIds: [] })).toBeNull()
    expect(sanitizeList(listId, null)).toBeNull()

    const read = sanitizeList(listId, {
      title: '  Warm up  ',
      problemIds: ['two-sum', 'two-sum', 'not-a-problem', 'linear-search'],
      updatedAt: now,
    })
    expect(read).toEqual({
      id: listId,
      title: 'Warm up',
      problemIds: ['two-sum', 'linear-search'],
      updatedAt: now,
    })
  })

  it('caps a list at 200 problems when reading', () => {
    const ids = Array.from({ length: LIST_MAX_PROBLEMS + 25 }, () => 'two-sum')
    const read = sanitizeList(listId, { title: 'Big', problemIds: ids })
    expect(read?.problemIds).toEqual(['two-sum'])
  })

  it('adds and removes problems idempotently and refuses unknown ids', () => {
    const base = list()
    expect(addProblemToList(base, 'linear-search').problemIds).toEqual(['two-sum', 'linear-search'])
    expect(addProblemToList(base, 'two-sum')).toBe(base)
    expect(addProblemToList(base, 'nope')).toBe(base)
    expect(removeProblemFromList(base, 'two-sum').problemIds).toEqual([])
    expect(removeProblemFromList(base, 'nope')).toBe(base)

    const full = list({ problemIds: Array.from({ length: LIST_MAX_PROBLEMS }, () => 'two-sum') })
    expect(addProblemToList(full, 'linear-search')).toBe(full)
  })

  it('finds the lists that contain a problem', () => {
    const lists = {
      [listId]: list(),
      bbbb: list({ id: 'bbbb-1111-4111-8111-bbbbbbbbbbbb', title: 'Arrays drill' }),
    }
    expect(listsContaining(lists, 'two-sum').map((entry) => entry.title)).toEqual([
      'Arrays drill',
      'Interview warmup',
    ])
    expect(listsContaining(lists, 'linear-search')).toEqual([])
  })

  it('generates list ids the Firestore rules accept', () => {
    for (let index = 0; index < 50; index += 1) {
      expect(newListId()).toMatch(LIST_ID_PATTERN)
    }
    const fallback = newListId(() => 0.42)
    expect(fallback).toMatch(LIST_ID_PATTERN)
  })
})
