import { describe, expect, it } from 'vitest'
import {
  contentCoverage,
  getHint,
  getPracticeSets,
  getPrimer,
  getQuiz,
  getStatement,
  getTests,
  getTopicPatterns,
  sanitizeCoverage,
  sanitizePracticeSet,
  sanitizeQuizItem,
  sanitizeStatement,
  sanitizeTopicContent,
} from './load'

describe('shape-sanitised learner content', () => {
  it('tolerates garbage without throwing or leaking unsafe shapes', () => {
    for (const garbage of [null, undefined, 42, 'text', [], {}, { statement: 1 }]) {
      expect(sanitizeStatement(garbage)).toBeNull()
    }
    expect(sanitizeQuizItem(null)).toBeNull()
    expect(sanitizePracticeSet({ patternId: 'x' })).toBeNull()
    const topic = sanitizeTopicContent({ topicId: 'arrays', quiz: 'not-an-array', primer: 7 })
    expect(topic?.quiz).toEqual([])
    expect(topic?.primer).toBeNull()
    const coverage = sanitizeCoverage({ resources: 'broken' })
    expect(coverage.asOf).toBe('unknown')
    expect(coverage.catalogue.rows).toBe(0)
  })

  it('enforces exactly four explained options and an in-range answerIndex', () => {
    const option = (text: string) => ({ text, explain: `Because ${text}` })
    const base = {
      id: 'arrays-q1',
      kind: 'pattern',
      prompt: 'Which pattern fits?',
      codeSnippet: null,
      options: [option('a'), option('b'), option('c'), option('d')],
      answerIndex: 2,
    }
    expect(sanitizeQuizItem(base)).toMatchObject({ answerIndex: 2, options: expect.any(Array) })
    expect(sanitizeQuizItem({ ...base, options: base.options.slice(0, 3) })).toBeNull()
    expect(sanitizeQuizItem({ ...base, answerIndex: 4 })).toBeNull()
    expect(sanitizeQuizItem({ ...base, options: [{ text: 'x' }, ...base.options.slice(1)] })).toBeNull()
  })
})

describe('coverage maths and authored sample', () => {
  it('reports the checked Phase 03 totals', () => {
    const report = contentCoverage()
    expect(report.asOf).toBe('2026-11-03')
    expect(report.catalogue.rows).toBe(495)
    expect(report.resources.rowsWithResources).toBe(495)
    expect(report.resources.multiPublisherRows).toBe(495)
    expect(report.resources.leetcodeExactOrNear).toBe(420)
    expect(report.resources.theoryLabelled).toBe(75)
    expect(report.content.theoryMcqs).toBe(42)
    expect(report.practice.patterns).toBe(34)
    expect(report.practice.drills).toBe(136)
    expect(report.practice.uniqueSlugs).toBe(136)
    expect(report.practice.contiguousSets).toBe(true)
    expect(report.byTopic.reduce((sum, topic) => sum + topic.theoryMcqs, 0)).toBe(42)
    expect(report.byTopic.reduce((sum, topic) => sum + topic.quizItems, 0)).toBe(12)
    expect(report.content.fullyAuthoredTopics).toContain('arrays')
  })

  it('loads one fully authored topic end to end and leaves missing content designed', () => {
    expect(getTopicPatterns('arrays')).toHaveLength(3)
    expect(getPrimer('arrays')).not.toBeNull()
    expect(getPrimer('sorting')).toBeNull()
    expect(getQuiz('arrays')).toHaveLength(12)
    expect(getQuiz('arrays').every((item) => item.options.length === 4 && item.options.every((option) => option.explain))).toBe(true)
    expect(getQuiz('sorting')).toEqual([])

    const statement = getStatement('linear-search')
    expect(statement).not.toBeNull()
    expect(statement!.statement.length).toBeLessThanOrEqual(700)
    expect(statement!.example.input).toBeTruthy()
    expect(statement!.example.output).toBeTruthy()
    expect(statement!.example.why).toBeTruthy()
    expect(getHint('linear-search')?.hint).toBe(statement!.hint)
    expect(getTests('linear-search').length).toBeGreaterThanOrEqual(2)
    expect(getStatement('two-sum')).toBeNull()
    expect(getHint('two-sum')).toBeNull()
    expect(getTests('two-sum')).toEqual([])
  })

  it('keeps practice-set ids unique and set numbers contiguous', () => {
    const sets = getPracticeSets()
    expect(sets).toHaveLength(34)
    expect(sets.every((set) => set.problems.map((problem) => problem.set).every((value, index) => value === index + 1))).toBe(true)
    const ids = sets.flatMap((set) => set.problems.map((problem) => `lc-${problem.lc}`))
    expect(new Set(ids).size).toBe(136)
  })
})
