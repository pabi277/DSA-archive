import { describe, expect, it } from 'vitest'
import {
  MAX_REASONS_SHOWN,
  NO_TARGET,
  REASON_ORDER,
  STALE_REASON_DAYS,
  chipsOf,
  reasonLine,
  reasonsFor,
  reasonsForAll,
  type Target,
} from './reasons'
import { addDays, emptyPlan, type Plan } from '../planner'
import type { CloudProgressByTopic, CloudProgressEntry } from '../cloudProgress'
import { locateProblem } from '../library'

/**
 * The reason table. Every case names a real catalogue row and asserts the exact
 * chip text, because these strings are the UI — a test that only checked "some
 * reason" would let the vocabulary drift.
 *
 * Fixture rows come from `beginner-problems`: `breaking-the-myth` and
 * `programming-and-what-are-computers` share one subtopic, which is what the
 * `buddy of …` case needs.
 */

const TODAY = '2026-11-04'
const SIBLING = 'programming-and-what-are-computers'
const PROBLEM = 'breaking-the-myth'

function entry(overrides: Partial<CloudProgressEntry> = {}): CloudProgressEntry {
  return {
    s: 'todo',
    b: false,
    a: 1,
    fd: null,
    lr: null,
    rc: 0,
    ...overrides,
  }
}

function entries(rows: Record<string, CloudProgressEntry>): CloudProgressByTopic {
  return { 'beginner-problems': rows }
}

function plan(overrides: Partial<Plan> = {}): Plan {
  return { ...emptyPlan(TODAY), ...overrides }
}

const ids = (problemId: string, progress: CloudProgressByTopic, p: Plan | null = null, extra = {}, target: Target = NO_TARGET) =>
  reasonsFor(problemId, progress, p, TODAY, target, extra).map((reason) => reason.text)

describe('reasonsFor — the nine reasons', () => {
  it('says nothing about a catalogue id that does not exist', () => {
    expect(reasonsFor('not-a-row', {}, null, TODAY)).toEqual([])
  })

  it('first solve: an untouched row', () => {
    expect(ids(PROBLEM, {})).toEqual(['first solve'])
  })

  it('overdue 2d: a solved row whose revision is two days late', () => {
    const progress = entries({
      [PROBLEM]: entry({ s: 'done', fd: addDays(TODAY, -5), rc: 0 }),
    })
    expect(ids(PROBLEM, progress)).toEqual(['overdue 2d'])
  })

  it('due today: the revision lands today', () => {
    const progress = entries({
      [PROBLEM]: entry({ s: 'done', fd: addDays(TODAY, -3), rc: 0 }),
    })
    expect(ids(PROBLEM, progress)).toContain('due today')
  })

  it('next in your target: an unsolved row inside the target list', () => {
    const target: Target = { date: '2026-12-02', listId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', listProblemIds: [PROBLEM] }
    expect(ids(PROBLEM, {}, null, {}, target)).toContain('next in your target')
    const done = entries({ [PROBLEM]: entry({ s: 'done', fd: TODAY, rc: 3 }) })
    expect(ids(PROBLEM, done, null, {}, target)).not.toContain('next in your target')
  })

  it('shaky — couldn’t last time: the one outcome field we kept', () => {
    const progress = entries({ [PROBLEM]: entry({ s: 'done', fd: TODAY, rc: 3, o: 'couldnt' }) })
    expect(ids(PROBLEM, progress)).toEqual(['shaky — couldn’t last time'])
  })

  it('weakest topic: the caller’s weakest-topic id', () => {
    expect(ids(PROBLEM, {}, null, { weakestTopicId: 'beginner-problems' })).toContain('weakest topic')
    expect(ids(PROBLEM, {}, null, { weakestTopicId: 'arrays' })).not.toContain('weakest topic')
  })

  it('not touched 41d: an old row nobody came back to', () => {
    const progress = entries({ [PROBLEM]: entry({ s: 'todo', b: true, fd: addDays(TODAY, -41) }) })
    expect(ids(PROBLEM, progress)).toEqual(['not touched 41d'])
    const fresh = entries({ [PROBLEM]: entry({ s: 'todo', b: true, fd: addDays(TODAY, -(STALE_REASON_DAYS - 1)) }) })
    expect(ids(PROBLEM, fresh)).toEqual([])
  })

  it('quiz to pass: a failed attempt on this topic', () => {
    const extra = { quizResults: { 'beginner-problems': { passed: false } } }
    expect(ids(PROBLEM, {}, null, extra)).toContain('quiz to pass')
    const passed = { quizResults: { 'beginner-problems': { passed: true } } }
    expect(ids(PROBLEM, {}, null, passed)).not.toContain('quiz to pass')
  })

  it('buddy of <problem>: a solved neighbour in the same subtopic', () => {
    const siblingTitle = locateProblem(SIBLING)!.problem.title
    const progress = entries({ [SIBLING]: entry({ s: 'done', fd: TODAY, rc: 3 }) })
    expect(ids(PROBLEM, progress)).toContain(`buddy of ${siblingTitle}`)
  })

  it('orders the reasons by the fixed vocabulary, never by chance', () => {
    const progress = entries({
      [PROBLEM]: entry({ s: 'done', fd: addDays(TODAY, -40), rc: 0, o: 'couldnt' }),
      [SIBLING]: entry({ s: 'done', fd: TODAY, rc: 3 }),
    })
    const reasons = reasonsFor(PROBLEM, progress, null, TODAY, NO_TARGET, {
      weakestTopicId: 'beginner-problems',
      quizResults: { 'beginner-problems': { passed: false } },
    })
    expect(reasons.map((reason) => reason.id)).toEqual([
      'overdue',
      'shaky',
      'stale',
      'quiz',
    ])
    for (const reason of reasons) expect(REASON_ORDER.indexOf(reason.id)).toBeGreaterThanOrEqual(0)
  })

  it('says nothing about a row already ticked done today', () => {
    const progress = entries({ [PROBLEM]: entry({ s: 'done', fd: TODAY, rc: 3 }) })
    expect(ids(PROBLEM, progress, plan({ problemIds: [PROBLEM], doneIds: [PROBLEM] }))).toEqual([])
  })
})

describe('chips and lines', () => {
  it('shows at most two chips and keeps every reason in the tooltip line', () => {
    const progress = entries({
      [PROBLEM]: entry({ s: 'done', fd: addDays(TODAY, -6), rc: 0, o: 'couldnt' }),
    })
    const reasons = reasonsFor(PROBLEM, progress, null, TODAY, NO_TARGET, {
      quizResults: { 'beginner-problems': { passed: false } },
    })
    expect(reasons.length).toBeGreaterThan(MAX_REASONS_SHOWN)
    expect(chipsOf(reasons)).toHaveLength(MAX_REASONS_SHOWN)
    expect(reasonLine(reasons).split(' · ')).toHaveLength(reasons.length)
  })

  it('maps a set of rows and omits the ones with no reason', () => {
    const map = reasonsForAll([PROBLEM, SIBLING], {}, null, TODAY)
    expect(Object.keys(map).sort()).toEqual([PROBLEM, SIBLING].sort())
    const clean = entries({ [PROBLEM]: entry({ s: 'done', fd: TODAY, rc: 3 }) })
    expect(reasonsForAll([PROBLEM], clean, null, TODAY)).toEqual({})
  })
})
