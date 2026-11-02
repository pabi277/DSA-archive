import rawCatalogue from '../data/problems.json'

export type Problem = {
  id: string
  title: string
  order: number
  level: 'basic' | 'core' | 'pro' | null
  kind: 'problem' | 'theory'
  links: Partial<Record<'practice' | 'article' | 'video' | 'leetcode', string>>
}

type Subtopic = { id: string; title: string; order: number; problems: Problem[] }
type Topic = { id: string; title: string; order: number; subtopics: Subtopic[] }
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
