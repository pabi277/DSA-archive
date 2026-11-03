import partA from '../data/catalogue/catalogue-a.json'
import partB from '../data/catalogue/catalogue-b.json'
import partC from '../data/catalogue/catalogue-c.json'
import partD from '../data/catalogue/catalogue-d.json'

export type ResourceType = 'practice' | 'article' | 'video' | 'reference' | 'docs'
export type ResourceSource =
  | 'leetcode'
  | 'neetcode'
  | 'takeuforward'
  | 'geeksforgeeks'
  | 'programiz'
  | 'cp-algorithms'
  | 'usaco'
  | 'cppreference'
  | 'python-docs'
  | 'mdn'
  | 'roadmap-sh'
  | 'youtube'
export type Resource = {
  type: ResourceType
  source: ResourceSource
  url: string
  label: string
  rank: number
  verified: string
  match?: 'exact' | 'near' | 'chapter'
}

export type Problem = {
  id: string
  title: string
  order: number
  /** Optional author-curated study sequence used by phase 02. */
  learnOrder?: number
  level: 'basic' | 'core' | 'pro' | null
  kind: 'problem' | 'theory'
  links: Partial<Record<'practice' | 'article' | 'video' | 'leetcode', string>>
  /** Phase 03 ranked, multi-publisher resource set; legacy fixtures may omit it. */
  resources?: Resource[]
  /** Editorial LeetCode mapping: exact, near twin, or a theory-labelled row. */
  lcMatch?: 'exact' | 'near' | 'theory'
  lcLabel?: string
  /** Duplicate sheet slugs point at the first row that already covers them. */
  coveredBy?: string
}

export type Subtopic = { id: string; title: string; order: number; learnOrder?: number; problems: Problem[] }
export type Topic = { id: string; title: string; order: number; subtopics: Subtopic[] }
export type Catalogue = {
  schemaVersion: 2
  generatedFrom: string
  topics: Topic[]
}

/**
 * The runtime catalogue is four build-time JSON shards rather than one large
 * `problems.json`. The source file remains the validation/authoring master and
 * is never fetched; the shards are parsed at build time and code-split by Vite.
 */
const parts = [partA, partB, partC, partD] as unknown as { generatedFrom: string; topics: Topic[] }[]

export const catalogue: Catalogue = {
  schemaVersion: 2,
  generatedFrom: parts[0].generatedFrom,
  topics: parts.flatMap((part) => part.topics),
}

export const catalogueProblems = catalogue.topics.flatMap((topic) =>
  topic.subtopics.flatMap((subtopic) => subtopic.problems),
)

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
