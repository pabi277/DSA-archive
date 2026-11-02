import { describe, expect, it } from 'vitest'
import { catalogue, type Topic } from './catalogue'
import type { ProgressByTopic } from './progress'
import {
  LEVEL_FILTERS,
  LINK_FILTERS,
  activeFilterCount,
  applySheetQuery,
  emptyQuery,
  isFiltering,
  levelOf,
  normalize,
  pickRandom,
  weakestTopic,
} from './sheet'

const fixture: Topic[] = [
  {
    id: 'alpha',
    title: 'Alpha',
    order: 10,
    subtopics: [
      {
        id: 'alpha-one',
        title: 'One',
        order: 10,
        problems: [
          { id: 'a1', title: 'Two Sum', order: 10, level: 'core', kind: 'problem', links: { practice: 'https://example.test/p/1', leetcode: 'https://example.test/l/1' } },
          { id: 'a2', title: 'Best Time to Buy', order: 20, level: 'basic', kind: 'problem', links: { article: 'https://example.test/a/2' } },
          { id: 'a3', title: 'Reading Notes', order: 30, level: null, kind: 'theory', links: { video: 'https://example.test/v/3' } },
        ],
      },
    ],
  },
  {
    id: 'beta',
    title: 'Beta',
    order: 20,
    subtopics: [
      {
        id: 'beta-one',
        title: 'Sliding window',
        order: 10,
        problems: [
          { id: 'b1', title: 'Two Pointers Intro', order: 10, level: 'pro', kind: 'problem', links: {} },
        ],
      },
    ],
  },
]

const noProgress: ProgressByTopic = {}
const rows = (sheet: ReturnType<typeof applySheetQuery>) =>
  sheet.topics.flatMap((topic) => topic.subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id)))

describe('sheet query basics', () => {
  it('treats an empty query as the whole sheet', () => {
    const sheet = applySheetQuery(emptyQuery, noProgress, fixture)
    expect(sheet.filtering).toBe(false)
    expect(sheet.matchCount).toBe(4)
    expect(sheet.totalCount).toBe(4)
    expect(sheet.topics).toHaveLength(2)
    expect(isFiltering(emptyQuery)).toBe(false)
  })

  it('normalizes search text', () => {
    expect(normalize('  Two   SUM ')).toBe('two sum')
  })

  it('maps a missing source badge to ungraded instead of inventing a level', () => {
    expect(levelOf(fixture[0].subtopics[0].problems[2])).toBe('ungraded')
    expect(LEVEL_FILTERS).toEqual(['basic', 'core', 'pro', 'ungraded'])
    expect(LINK_FILTERS).toEqual(['practice', 'article', 'video', 'leetcode'])
  })
})

describe('search', () => {
  it('matches across topics, not just the open one', () => {
    const sheet = applySheetQuery({ ...emptyQuery, search: 'two' }, noProgress, fixture)
    expect(rows(sheet).sort()).toEqual(['a1', 'b1'])
    expect(sheet.topics.map((topic) => topic.id)).toEqual(['alpha', 'beta'])
  })

  it('matches subtopic and topic titles as well as row titles', () => {
    expect(rows(applySheetQuery({ ...emptyQuery, search: 'sliding' }, noProgress, fixture))).toEqual(['b1'])
    expect(rows(applySheetQuery({ ...emptyQuery, search: 'beta' }, noProgress, fixture))).toEqual(['b1'])
  })

  it('returns no topics when nothing matches', () => {
    const sheet = applySheetQuery({ ...emptyQuery, search: 'zzz-no-such-row' }, noProgress, fixture)
    expect(sheet.topics).toEqual([])
    expect(sheet.matchCount).toBe(0)
    expect(sheet.filtering).toBe(true)
  })
})

describe('filters', () => {
  it('filters by level, including ungraded rows', () => {
    expect(rows(applySheetQuery({ ...emptyQuery, levels: ['basic'] }, noProgress, fixture))).toEqual(['a2'])
    expect(rows(applySheetQuery({ ...emptyQuery, levels: ['ungraded'] }, noProgress, fixture))).toEqual(['a3'])
  })

  it('treats several levels as OR and several link types as OR', () => {
    expect(rows(applySheetQuery({ ...emptyQuery, levels: ['basic', 'pro'] }, noProgress, fixture)).sort()).toEqual(['a2', 'b1'])
    expect(rows(applySheetQuery({ ...emptyQuery, linkTypes: ['practice', 'video'] }, noProgress, fixture)).sort()).toEqual(['a1', 'a3'])
  })

  it('keeps rows with no outbound links when no link filter is on, drops them when one is', () => {
    expect(rows(applySheetQuery(emptyQuery, noProgress, fixture))).toContain('b1')
    expect(rows(applySheetQuery({ ...emptyQuery, linkTypes: ['leetcode'] }, noProgress, fixture))).toEqual(['a1'])
  })

  it('narrows to one topic and hides done rows on request', () => {
    expect(rows(applySheetQuery({ ...emptyQuery, topicId: 'beta' }, noProgress, fixture))).toEqual(['b1'])
    const progress: ProgressByTopic = { alpha: { a1: { s: 'done', b: false } } }
    expect(rows(applySheetQuery({ ...emptyQuery, hideDone: true }, progress, fixture))).toEqual(['a2', 'a3', 'b1'])
  })

  it('filters the sheet by a custom list and counts it as one filter', () => {
    const sheet = applySheetQuery(
      { ...emptyQuery, listProblemIds: new Set(['a1', 'b1']) },
      noProgress,
      fixture,
    )
    expect(rows(sheet).sort()).toEqual(['a1', 'b1'])
    expect(sheet.filtering).toBe(true)
    expect(isFiltering({ ...emptyQuery, listProblemIds: new Set(['a1']) })).toBe(true)
    expect(activeFilterCount({ ...emptyQuery, listProblemIds: new Set(['a1']) })).toBe(1)

    const combined = applySheetQuery(
      { ...emptyQuery, listProblemIds: new Set(['a1', 'b1']), levels: ['core'] },
      noProgress,
      fixture,
    )
    expect(rows(combined)).toEqual(['a1'])
  })

  it('combines search with filters', () => {
    const sheet = applySheetQuery({ ...emptyQuery, search: 'two', levels: ['core'] }, noProgress, fixture)
    expect(rows(sheet)).toEqual(['a1'])
    expect(activeFilterCount({ ...emptyQuery, topicId: 'beta', levels: ['core', 'pro'], linkTypes: ['video'], hideDone: true })).toBe(5)
  })

  it('reports whole-topic progress in the header even while filtering', () => {
    const progress: ProgressByTopic = { alpha: { a1: { s: 'done', b: false }, a2: { s: 'done', b: true } } }
    const sheet = applySheetQuery({ ...emptyQuery, levels: ['basic'] }, progress, fixture)
    const alpha = sheet.topics.find((topic) => topic.id === 'alpha')
    expect(alpha).toMatchObject({ matchCount: 1, done: 2, total: 3, percent: 67 })
  })
})

describe('random pick', () => {
  it('picks from the visible rows only and accepts an injected rng', () => {
    const sheet = applySheetQuery(emptyQuery, noProgress, fixture)
    expect(pickRandom(sheet, () => 0)).toMatchObject({ topicId: 'alpha', problem: { id: 'a1' } })
    expect(pickRandom(sheet, () => 0.999)).toMatchObject({ topicId: 'beta', problem: { id: 'b1' } })
    const filtered = applySheetQuery({ ...emptyQuery, levels: ['pro'] }, noProgress, fixture)
    expect(pickRandom(filtered, () => 0.5)?.problem.id).toBe('b1')
  })

  it('returns null when the sheet is empty', () => {
    expect(pickRandom(applySheetQuery({ ...emptyQuery, search: 'nope' }, noProgress, fixture), () => 0)).toBeNull()
  })
})

describe('weakest-topic hint', () => {
  it('refuses to guess before the user has touched anything', () => {
    expect(weakestTopic(noProgress, fixture)).toBeNull()
  })

  it('ranks touched topics by the lowest done ratio', () => {
    const progress: ProgressByTopic = {
      alpha: { a1: { s: 'done', b: false } },
      beta: { b1: { s: 'done', b: false } },
    }
    expect(weakestTopic(progress, fixture)).toMatchObject({ topicId: 'alpha', done: 1, total: 3, remaining: 2, percent: 33 })
  })

  it('counts a bookmark as touched and never suggests an untouched topic', () => {
    const bookmarkedOnly: ProgressByTopic = { beta: { b1: { s: 'todo', b: true } } }
    expect(weakestTopic(bookmarkedOnly, fixture)).toMatchObject({ topicId: 'beta', done: 0, remaining: 1 })
  })
})

describe('the real bundled catalogue', () => {
  it('shows all 495 rows across 20 topics with no query', () => {
    const sheet = applySheetQuery(emptyQuery, noProgress)
    expect(sheet.matchCount).toBe(495)
    expect(sheet.totalCount).toBe(495)
    expect(sheet.topics).toHaveLength(20)
    expect(sheet.topicCount).toBe(20)
  })

  it('level and link-type counts match the validated data file', () => {
    expect(applySheetQuery({ ...emptyQuery, levels: ['basic'] }, noProgress).matchCount).toBe(84)
    expect(applySheetQuery({ ...emptyQuery, levels: ['core'] }, noProgress).matchCount).toBe(287)
    expect(applySheetQuery({ ...emptyQuery, levels: ['pro'] }, noProgress).matchCount).toBe(109)
    expect(applySheetQuery({ ...emptyQuery, levels: ['ungraded'] }, noProgress).matchCount).toBe(15)
    expect(applySheetQuery({ ...emptyQuery, linkTypes: ['leetcode'] }, noProgress).matchCount).toBe(289)
    expect(applySheetQuery({ ...emptyQuery, linkTypes: ['practice'] }, noProgress).matchCount).toBe(453)
  })

  it('finds a known row by title', () => {
    const sheet = applySheetQuery({ ...emptyQuery, search: 'two sum' }, noProgress)
    expect(rows(sheet)).toContain('two-sum')
    expect(sheet.topics.map((topic) => topic.title)).toContain('Arrays')
  })

  it('keeps every catalogue id globally unique so DOM ids cannot collide', () => {
    const problemIds = catalogue.topics.flatMap((topic) =>
      topic.subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id)),
    )
    const subtopicIds = catalogue.topics.flatMap((topic) => topic.subtopics.map((subtopic) => subtopic.id))
    const topicIds = catalogue.topics.map((topic) => topic.id)
    expect(new Set(problemIds).size).toBe(problemIds.length)
    expect(new Set(subtopicIds).size).toBe(subtopicIds.length)
    expect(new Set(topicIds).size).toBe(topicIds.length)
  })
})
