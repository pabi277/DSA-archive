import { catalogue, type Problem, type Topic } from './catalogue'
import { tallyTopic, type ProgressByTopic } from './progress'

/**
 * Sheet query logic for phase 1 (roadmap 1.2): search + topic/level/link-type
 * filters + random pick + weakest-topic hint. Pure and unit-tested; the screens
 * only render what these functions return.
 *
 * v2-01: the query is also expressed in the URL (`#/search?q=&level=&topic=`)
 * so a search survives a reload, a bookmark and the back button. `toQueryParams`
 * / `fromQueryParams` are the only place that mapping exists.
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
  /** Phase 3: restrict the sheet to a custom list's problems. */
  listProblemIds: ReadonlySet<string> | null
}

export const emptyQuery: SheetQuery = {
  search: '',
  topicId: '',
  levels: [],
  linkTypes: [],
  hideDone: false,
  listProblemIds: null,
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
    query.hideDone ||
    query.listProblemIds !== null
  )
}

export function activeFilterCount(query: SheetQuery) {
  return (
    (query.search.trim() !== '' ? 1 : 0) +
    (query.topicId !== '' ? 1 : 0) +
    query.levels.length +
    query.linkTypes.length +
    (query.hideDone ? 1 : 0) +
    (query.listProblemIds !== null ? 1 : 0)
  )
}

/** URL ⇄ query. Only real filters are written, so URLs stay short and shareable. */
export function toQueryParams(filters: Omit<SheetQuery, 'hideDone' | 'listProblemIds'>) {
  return {
    q: filters.search.trim(),
    topic: filters.topicId,
    level: filters.levels.join(','),
    link: filters.linkTypes.join(','),
  }
}

export function fromQueryParams(params: Record<string, string>): Omit<SheetQuery, 'hideDone' | 'listProblemIds'> {
  const levels = (params.level ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is LevelFilter => (LEVEL_FILTERS as string[]).includes(value))
  const linkTypes = (params.link ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is LinkFilter => (LINK_FILTERS as string[]).includes(value))
  return {
    search: params.q ?? '',
    topicId: catalogue.topics.some((topic) => topic.id === params.topic) ? (params.topic ?? '') : '',
    levels,
    linkTypes,
  }
}

export function applySheetQuery(query: SheetQuery, progress: ProgressByTopic, data: Topic[] = catalogue.topics): FilteredSheet {
  const needle = normalize(query.search)
  const topics: FilteredTopic[] = []
  let matchCount = 0

  for (const topic of data) {
    if (query.topicId !== '' && topic.id !== query.topicId) continue
    const tally = tallyTopic(progress, topic)
    const subtopics: FilteredSubtopic[] = []
    let topicMatches = 0

    for (const subtopic of topic.subtopics) {
      const problems = subtopic.problems.filter((problem) => {
        if (query.listProblemIds && !query.listProblemIds.has(problem.id)) return false
        if (query.hideDone && progress[topic.id]?.[problem.id]?.s === 'done') return false
        if (query.levels.length > 0 && !query.levels.includes(levelOf(problem))) return false
        if (!matchesLinkTypes(problem, query.linkTypes)) return false
        if (needle !== '' && !matchesSearch(needle, problem, subtopic.title, topic.title)) return false
        return true
      })
      if (problems.length === 0) continue
      topicMatches += problems.length
      subtopics.push({ id: subtopic.id, title: subtopic.title, problems })
    }

    if (subtopics.length === 0) continue
    matchCount += topicMatches
    topics.push({
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

  const totalCount = data.reduce(
    (sum, topic) => sum + topic.subtopics.reduce((inner, subtopic) => inner + subtopic.problems.length, 0),
    0,
  )

  return {
    topics,
    matchCount,
    totalCount,
    topicCount: data.length,
    filtering: isFiltering(query),
  }
}

export type RandomPick = { topicId: string; topicTitle: string; problem: Problem }

/**
 * Uniformly random over the *visible* rows, then localised back to its topic.
 * `rng` is injectable so the pick is deterministic under test.
 */
export function pickRandom(sheet: FilteredSheet, rng: () => number = Math.random): RandomPick | null {
  const rows: { topicId: string; topicTitle: string; problem: Problem }[] = []
  for (const topic of sheet.topics) {
    for (const subtopic of topic.subtopics) {
      for (const problem of subtopic.problems) {
        rows.push({ topicId: topic.id, topicTitle: topic.title, problem })
      }
    }
  }
  if (rows.length === 0) return null
  return rows[Math.min(rows.length - 1, Math.floor(rng() * rows.length))]
}

export type WeakestTopic = {
  topicId: string
  title: string
  done: number
  total: number
  remaining: number
  percent: number
}

/**
 * The weakest topic is the one with the lowest completion **among the topics
 * that have been touched at all** — suggesting Arrays to somebody who has only
 * opened Graphs would be noise, not a hint. Rows without any progress return
 * `null` rather than guessing (the approved 0-D empty state).
 */
export function weakestTopic(progress: ProgressByTopic, data: Topic[] = catalogue.topics): WeakestTopic | null {
  let best: WeakestTopic | null = null
  for (const topic of data) {
    const tally = tallyTopic(progress, topic)
    if (tally.done + tally.bookmarked === 0) continue
    if (tally.total === 0) continue
    const candidate: WeakestTopic = {
      topicId: topic.id,
      title: topic.title,
      done: tally.done,
      total: tally.total,
      remaining: tally.total - tally.done,
      percent: tally.percent,
    }
    if (
      best === null ||
      candidate.percent < best.percent ||
      (candidate.percent === best.percent && candidate.remaining > best.remaining)
    ) {
      best = candidate
    }
  }
  return best
}
