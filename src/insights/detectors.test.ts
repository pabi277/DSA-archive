import { afterEach, describe, expect, it } from 'vitest'
import {
  FORGOTTEN_MIN_AGE_DAYS,
  FORGOTTEN_THRESHOLD,
  STALE_CODE_THRESHOLD,
  codeQueryForIds,
  detectors,
  dismissForToday,
  forgottenDone,
  readDismissed,
  staleCode,
} from './detectors'
import { addDays } from '../planner'
import type { CloudProgressByTopic, CloudProgressEntry } from '../cloudProgress'
import type { SnippetsById } from '../code/codeStore'
import { catalogue } from '../catalogue'

const TODAY = '2026-11-04'

const beginnerIds = catalogue.topics
  .find((topic) => topic.id === 'beginner-problems')!
  .subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id))

function entriesFor(ids: readonly string[], overrides: Partial<CloudProgressEntry> = {}): CloudProgressByTopic {
  const rows: Record<string, CloudProgressEntry> = {}
  for (const id of ids) {
    rows[id] = { s: 'done', b: false, a: 1, fd: addDays(TODAY, -40), lr: null, rc: 0, ...overrides }
  }
  return { 'beginner-problems': rows }
}

function snippet(problemId: string): SnippetsById {
  return {
    [problemId]: {
      problemId,
      language: 'cpp',
      code: 'int main() {}',
      notes: '',
      updatedAt: `${TODAY}T09:00:00.000Z`,
    },
  }
}

afterEach(() => {
  localStorage.clear()
})

describe('forgotten done', () => {
  it('is silent below the threshold', () => {
    expect(forgottenDone(entriesFor(beginnerIds.slice(0, FORGOTTEN_THRESHOLD - 1)), TODAY)).toBeNull()
  })

  it('names the count and offers exactly one action at the threshold', () => {
    const found = forgottenDone(entriesFor(beginnerIds.slice(0, FORGOTTEN_THRESHOLD)), TODAY)!
    expect(found.count).toBe(FORGOTTEN_THRESHOLD)
    expect(found.text).toBe(
      `${FORGOTTEN_THRESHOLD} problems marked done ${FORGOTTEN_MIN_AGE_DAYS}+ days ago and never revised`,
    )
    expect(found.action).toBe(`Add ${FORGOTTEN_THRESHOLD} to today`)
  })

  it('ignores recent solves, revised rows and rows that are not done', () => {
    const recent = forgottenDone(entriesFor(beginnerIds.slice(0, 9), { fd: addDays(TODAY, -2) }), TODAY)
    expect(recent).toBeNull()
    const revised = forgottenDone(entriesFor(beginnerIds.slice(0, 9), { lr: addDays(TODAY, -1), rc: 1 }), TODAY)
    expect(revised).toBeNull()
    const todo = forgottenDone(entriesFor(beginnerIds.slice(0, 9), { s: 'todo', fd: null }), TODAY)
    expect(todo).toBeNull()
  })
})

describe('stale code', () => {
  it('counts saved solutions on rows later marked “couldn’t”', () => {
    const ids = beginnerIds.slice(0, STALE_CODE_THRESHOLD)
    const entries = entriesFor(ids, { s: 'done', o: 'couldnt', fd: addDays(TODAY, -2) })
    const snippets: SnippetsById = Object.assign({}, ...ids.map((id) => snippet(id)))
    const found = staleCode(entries, snippets)!
    expect(found.count).toBe(STALE_CODE_THRESHOLD)
    expect(found.action).toBe('Open in Code')
    expect(found.problemIds).toEqual([...ids].sort())
  })

  it('ignores rows whose current outcome is clean', () => {
    const ids = beginnerIds.slice(0, STALE_CODE_THRESHOLD)
    const entries = entriesFor(ids, { s: 'done', o: 'clean', fd: addDays(TODAY, -2) })
    const snippets: SnippetsById = Object.assign({}, ...ids.map((id) => snippet(id)))
    expect(staleCode(entries, snippets)).toBeNull()
  })

  it('filters #/code by the shared topic when there is one', () => {
    expect(codeQueryForIds(beginnerIds.slice(0, 3))).toEqual({ topic: 'beginner-problems' })
    expect(codeQueryForIds([])).toEqual({})
  })
})

describe('detectors together', () => {
  it('returns both, strongest first, and nothing when nothing crosses', () => {
    const ids = beginnerIds.slice(0, FORGOTTEN_THRESHOLD)
    const snippets: SnippetsById = Object.assign({}, ...ids.map((id) => snippet(id)))
    const entries = entriesFor(ids, { o: 'couldnt' })
    expect(detectors(entries, snippets, TODAY).map((detector) => detector.id)).toEqual([
      'forgotten-done',
      'stale-code',
    ])
    expect(detectors({}, {}, TODAY)).toEqual([])
  })
})

describe('hide for today', () => {
  it('remembers the day and forgets yesterday', () => {
    expect(readDismissed(TODAY)).toEqual([])
    localStorage.setItem('dsa-archive.detectors.v1', JSON.stringify({ day: addDays(TODAY, -1), ids: ['stale-code'] }))
    expect(readDismissed(TODAY)).toEqual([])
    expect(dismissForToday('stale-code', TODAY)).toEqual(['stale-code'])
    expect(readDismissed(TODAY)).toEqual(['stale-code'])
  })

  it('survives a corrupt blob', () => {
    localStorage.setItem('dsa-archive.detectors.v1', '{nope')
    expect(readDismissed(TODAY)).toEqual([])
  })
})
