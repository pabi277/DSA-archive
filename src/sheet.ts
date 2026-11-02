import { catalogue, type Problem, type Topic } from './catalogue'
import { tallyTopic, type ProgressByTopic } from './progress'

/**
 * Sheet query logic for phase 1 (roadmap 1.2): search + topic/level/link-type
 * filters + random pick + weakest-topic hint. Pure and unit-tested; the UI in
 * `App.tsx` only renders what these functions return.
 */

export const LEVEL_LABELS = {
  basic: 'Basic',
  core: 'Core',
  pro: 'Pro',
  ungraded: 'Ungraded',
} as const

export const LINK_LABELS = {
  practice: 'Practice',
  article: 'Article',
  video: 'Video',
  leetcode: 'LeetCode',
} as const

export type LevelFilter = keyof typeof LEVEL_LABELS
export type LinkFilter = keyof typeof LINK_LABELS
export const LEVEL_FILTERS = Object.keys(LEVEL_LABELS) as LevelFilter[]
export const LINK_FILTERS = Object.keys(LINK_LABELS) as LinkFilter[]

export type SheetQuery = {
  search: string
  /** '' means every topic. */
  topicId: string
  levels: LevelFilter[]
  linkTypes: LinkFilter[]
  hideDone: boolean
}

export const emptyQuery: SheetQuery = {
  search: '',
  topicId: '',
  levels: [],
  linkTypes: [],
  hideDone: false,
}

export function levelOf(problem: Problem): LevelFilter {
  return problem.level ?? 'ungraded'
}

export function normalize(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** A row matches when its own title, its subtopic or its topic matches. */
function matchesSearch(needle: string, problem: Problem, subtopicTitle: string, topicTitle: string) {
  return (
    normalize(problem.title).includes(needle) ||
    normalize(subtopicTitle).includes(needle) ||
    normalize(topicTitle).includes(needle)
  )
}

function matchesLinkTypes(problem: Problem, linkTypes: LinkFilter[]) {
  if (linkTypes.length === 0) return true
  return linkTypes.some((linkType) => Boolean(problem.links[linkType]))
}

export type FilteredSubtopic = { id: string; title: string; problems: Problem[] }
export type FilteredTopic = {
  id: string
  title: string
  order: number
  subtopics: FilteredSubtopic[]
  /** Rows matching the current query inside this topic. */
  matchCount: number
  /** Whole-topic progress, unaffected by the query (the `n/m` header). */
  done: number
  total: number
  percent: number
}
export type FilteredSheet = {
  topics: FilteredTopic[]
  matchCount: number
  totalCount: number
  topicCount: number
  filtering: boolean
}

export function isFiltering(query: SheetQuery) {
  return (
    query.search.trim() !== '' ||
    query.topicId !== '' ||
    query.levels.length > 0 ||
    query.linkTypes.length > 0 ||
    query.hideDone
  )
}

export function activeFilterCount(query: SheetQuery) {
  return (
    (query.topicId === '' ? 0 : 1) + query.levels.length + query.linkTypes.length +
    (query.hideDone ? 1 : 0)
  )
}

export function applySheetQuery(
  query: SheetQuery,
  progress: ProgressByTopic,
  topics: Topic[] = catalogue.topics,
): FilteredSheet {
  const needle = normalize(query.search)
  const filtering = isFiltering(query)
  const filteredTopics: FilteredTopic[] = []
  let matchCount = 0

  for (const topic of topics) {
    if (query.topicId !== '' && topic.id !== query.topicId) continue
    const tally = tallyTopic(progress, topic)
    const subtopics: FilteredSubtopic[] = []
    let topicMatches = 0

    for (const subtopic of topic.subtopics) {
      const problems = subtopic.problems.filter((problem) => {
        if (query.levels.length > 0 && !query.levels.includes(levelOf(problem))) return false
        if (!matchesLinkTypes(problem, query.linkTypes)) return false
        if (query.hideDone && progress[topic.id]?.[problem.id]?.s === 'done') return false
        if (needle !== '' && !matchesSearch(needle, problem, subtopic.title, topic.title)) return false
        return true
      })
      if (problems.length === 0) continue
      subtopics.push({ id: subtopic.id, title: subtopic.title, problems })
      topicMatches += problems.length
    }

    if (topicMatches === 0) continue
    matchCount += topicMatches
    filteredTopics.push({
      id: topic.id,
      title: topic.title,
      order: topic.order,
      subtopics,
      matchCount: topicMatches,
      done: tally.done,
      total: tally.total,
      percent: tally.percent,
    })
  }

  const totalCount = topics.reduce(
    (sum, topic) => sum + topic.subtopics.reduce((inner, subtopic) => inner + subtopic.problems.length, 0),
    0,
  )

  return { topics: filteredTopics, matchCount, totalCount, topicCount: topics.length, filtering }
}

export type RandomPick = { topicId: string; topicTitle: string; problem: Problem }

/** Uniform pick over the currently visible rows; `rng` is injectable for tests. */
export function pickRandom(sheet: FilteredSheet, rng: () => number = Math.random): RandomPick | null {
  const pool: Array<{ topicId: string; topicTitle: string; problem: Problem }> = []
  for (const topic of sheet.topics) {
    for (const subtopic of topic.subtopics) {
      for (const problem of subtopic.problems) {
        pool.push({ topicId: topic.id, topicTitle: topic.title, problem })
      }
    }
  }
  if (pool.length === 0) return null
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(rng() * pool.length)))
  return pool[index]
}

export type WeakestHint = {
  topicId: string
  title: string
  done: number
  total: number
  remaining: number
  percent: number
}

/**
 * Weakest-topic hint (roadmap 1.2).
 *
 * Rule, recorded in the phase-1 record: consider only topics the user has
 * touched (a row done or bookmarked), rank by the lowest done ratio, break
 * ties by the most rows remaining and then by sheet order. With nothing
 * touched yet there is no evidence to rank, so it returns `null` and the UI
 * says so instead of guessing. Phase 2 can refine this with attempts and
 * revision dates without changing the call site.
 */
export function weakestTopic(progress: ProgressByTopic, topics: Topic[] = catalogue.topics): WeakestHint | null {
  let best: WeakestHint | null = null
  let bestRatio = Number.POSITIVE_INFINITY
  let bestOrder = Number.POSITIVE_INFINITY

  for (const topic of topics) {
    const tally = tallyTopic(progress, topic)
    if (tally.total === 0) continue
    if (tally.done === 0 && tally.bookmarked === 0) continue
    const ratio = tally.done / tally.total
    const remaining = tally.total - tally.done
    if (
      ratio < bestRatio ||
      (ratio === bestRatio && best !== null && (remaining > best.remaining ||
        (remaining === best.remaining && topic.order < bestOrder)))
    ) {
      best = { topicId: topic.id, title: topic.title, done: tally.done, total: tally.total, remaining, percent: tally.percent }
      bestRatio = ratio
      bestOrder = topic.order
    }
  }

  return best
}
