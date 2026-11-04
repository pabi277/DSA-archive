import { describe, expect, it } from 'vitest'
import { catalogue, catalogueProblems } from '../catalogue'
import {
  contentCoverage,
  getAllTheoryMcqs,
  getHint,
  getPracticeSets,
  getPrimer,
  getQuiz,
  getStatement,
  getTests,
  getTheoryMcq,
  getTheoryMcqsByTopic,
  getTopicContent,
  getTopicPatterns,
  sanitizeCoverage,
  sanitizeInlineCheck,
  sanitizePracticeSet,
  sanitizeQuizItem,
  sanitizeStatement,
  sanitizeTheoryMcq,
  sanitizeTopicContent,
} from './load'

describe('shape-sanitised learner content', () => {
  it('tolerates garbage without throwing or leaking unsafe shapes', () => {
    for (const garbage of [null, undefined, 42, 'text', [], {}, { statement: 1 }]) {
      expect(sanitizeStatement(garbage)).toBeNull()
      expect(sanitizeTheoryMcq(garbage)).toBeNull()
      expect(sanitizeInlineCheck(garbage)).toBeNull()
    }
    expect(sanitizeQuizItem(null)).toBeNull()
    expect(sanitizePracticeSet({ patternId: 'x' })).toBeNull()
    const topic = sanitizeTopicContent({ topicId: 'arrays', quiz: 'not-an-array', primer: 7 })
    expect(topic?.quiz).toEqual([])
    expect(topic?.primer).toBeNull()
    const coverage = sanitizeCoverage({ resources: 'broken' })
    expect(coverage.asOf).toBe('unknown')
    expect(coverage.leetcodeTwins).toBe(0)
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

describe('coverage facts and authored sample', () => {
  it('carries the four published numbers the screens show', () => {
    // The full report (per-topic rows, source lists) stays in
    // `data/content/coverage.json` + `docs/content/coverage.md`, checked by
    // `npm run check:content`; only these four values enter the shell.
    const facts = contentCoverage()
    expect(facts.asOf).toBe('2026-11-03')
    expect(facts.leetcodeTwins).toBe(420)
    expect(facts.drills).toBe(136)
    expect(facts.quizItems).toBe(12)
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

  it('loads all 42 theory MCQs with strict coding/theory parity and enforces the placement budget', () => {
    expect(getAllTheoryMcqs()).toHaveLength(42)
    expect(getTheoryMcq('basic-arrays')?.topicId).toBe('beginner-problems')
    expect(getTheoryMcqsByTopic('beginner-problems')).toHaveLength(23)
    expect(getTheoryMcq('two-sum')).toBeNull()

    for (const problem of catalogueProblems) {
      if (problem.kind === 'theory') {
        const mcq = getTheoryMcq(problem.id)
        expect(mcq, `missing theory MCQ for ${problem.id}`).not.toBeNull()
        expect(mcq!.reveal.alwaysAvailable).toBe(true)
        expect(mcq!.reveal.solution.length).toBeGreaterThan(0)
        expect(mcq!.reveal.reference.url.startsWith('https://')).toBe(true)
        expect(getTests(problem.id), `theory row ${problem.id} must never carry coding tests`).toEqual([])
      } else {
        expect(getTheoryMcq(problem.id), `coding row ${problem.id} must never carry a theory MCQ`).toBeNull()
      }
    }

    for (const topic of catalogue.topics) {
      const content = getTopicContent(topic.id)
      if (!content) continue
      const sectionIds = new Set(content.sections.map((section) => section.id))
      const checks = content.sections.map((section) => section.check).filter((check) => check !== null)
      // Placement budget: <=1 inline check per section and <=3 per topic beyond the 12-item quiz.
      expect(checks.length).toBeLessThanOrEqual(3)
      for (const check of checks) {
        expect(sectionIds.has(check.rereadSectionId)).toBe(true)
        expect(check.reveal.alwaysAvailable).toBe(true)
        expect(check.reveal.reference.url.startsWith('https://')).toBe(true)
      }
    }
    expect(getTopicContent('arrays')?.sections.every((section) => section.check !== null)).toBe(true)
  })
})
