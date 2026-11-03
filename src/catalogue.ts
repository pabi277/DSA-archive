import rawCatalogue from '../data/problems.json'

export type Problem = {
  id: string
  title: string
  order: number
  /** Optional author-curated study sequence used by phase 02. */
  learnOrder?: number
  level: 'basic' | 'core' | 'pro' | null
  kind: 'problem' | 'theory'
  links: Partial<Record<'practice' | 'article' | 'video' | 'leetcode', string>>
}

export type Subtopic = { id: string; title: string; order: number; learnOrder?: number; problems: Problem[] }
export type Topic = { id: string; title: string; order: number; subtopics: Subtopic[] }
export type Catalogue = {
  schemaVersion: number
  generatedFrom: string
  topics: Topic[]
}

export const catalogue = rawCatalogue as Catalogue

export function summarizeCatalogue(data: Catalogue = catalogue) {
  const allProblems = data.topics.flatMap((topic) =>
    topic.subtopics.flatMap((subtopic) => subtopic.problems),
  )

  return {
    topicCount: data.topics.length,
    problemCount: allProblems.length,
    levels: allProblems.reduce<Record<string, number>>((counts, problem) => {
      const level = problem.level ?? 'ungraded'
      counts[level] = (counts[level] ?? 0) + 1
      return counts
    }, {}),
  }
}
