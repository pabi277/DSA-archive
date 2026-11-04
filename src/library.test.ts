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
  removeProblemFromList,
  sanitizeList,
  timestampToIso,
  type CustomList,
} from './library'

const listId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const now = '2026-11-02T12:00:00.000Z'

function list(overrides: Partial<CustomList> = {}): CustomList {
  return { id: listId, title: 'Interview warmup', problemIds: ['two-sum'], updatedAt: now, ...overrides }
}

describe('catalogue lookup (shared by lists and saved solutions)', () => {
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

  it('builds backup list arrays sorted by title', () => {
    const lists = { [listId]: list(), bbbb: list({ id: 'bbbb-1111-4111-8111-bbbbbbbbbbbb', title: 'Arrays drill' }) }
    expect(listsForBackup(lists).map((entry) => entry.title)).toEqual(['Arrays drill', 'Interview warmup'])
    expect(listsForBackup(lists)[0]).toMatchObject({ listId: 'bbbb-1111-4111-8111-bbbbbbbbbbbb' })
  })
})

describe('custom lists', () => {
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
