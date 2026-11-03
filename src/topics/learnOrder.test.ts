import { describe, expect, it } from 'vitest'
import { catalogue } from '../catalogue'
import type { LevelFilter } from '../sheet'
import { learningOrderedSubtopics, problemsInLearningOrder } from './learnOrder'

describe('topic learning order', () => {
  it('covers every catalogue row exactly once and is deterministic', () => {
    const topic = catalogue.topics.find((item) => item.id === 'arrays')!
    const ids = problemsInLearningOrder(topic).map(({ problem }) => problem.id)
    expect(ids).toHaveLength(topic.subtopics.reduce((sum, subtopic) => sum + subtopic.problems.length, 0))
    expect(new Set(ids).size).toBe(ids.length)
    expect(problemsInLearningOrder(topic).map(({ problem }) => problem.id)).toEqual(ids)
  })

  it('uses the stable source order as a tie-break inside the difficulty ramp', () => {
    const topic = catalogue.topics.find((item) => item.id === 'arrays')!
    const ordered = problemsInLearningOrder(topic)
    const firstGroup = ordered.filter(({ subtopic }) => subtopic.id === ordered[0].subtopic.id)
    const ranks: { level: LevelFilter; order: number }[] = firstGroup.map(({ problem }) => ({
      level: problem.level ?? 'ungraded',
      order: problem.order,
    }))
    expect(ranks).toEqual([...ranks].sort((a, b) => {
      const rank: Record<LevelFilter, number> = { basic: 0, core: 1, pro: 2, ungraded: 3 }
      return rank[a.level] - rank[b.level] || a.order - b.order
    }))
  })

  it('honors optional curated row and subtopic learnOrder values', () => {
    const base = catalogue.topics.find((item) => item.id === 'arrays')!
    const topic = {
      ...base,
      subtopics: [
        { ...base.subtopics[0], order: 1, learnOrder: 2, problems: [
          { ...base.subtopics[0].problems[0], order: 1, learnOrder: 2 },
          { ...base.subtopics[0].problems[1], order: 2, learnOrder: 1 },
        ] },
        { ...base.subtopics[1], order: 2, learnOrder: 1, problems: [] },
      ],
    }
    const ordered = learningOrderedSubtopics(topic)
    expect(ordered[0].id).toBe(base.subtopics[1].id)
    expect(ordered[1].problems.map((problem) => problem.learnOrder)).toEqual([1, 2])
  })
})
