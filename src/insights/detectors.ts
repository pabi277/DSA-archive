/**
 * Phase v2-08 — two honest detectors, each with exactly one action.
 *
 * A detector is not an insight engine: it is a filtered count over data the
 * device already holds, with a threshold published as a constant, and a single
 * action the learner can undo. When nothing crosses the threshold the detector
 * says nothing at all.
 */
import { daysBetween, dayKeyOfTimestamp } from '../planner'
import type { CloudProgressByTopic } from '../cloudProgress'
import type { SnippetsById } from '../code/codeStore'
import { locateProblem } from '../library'

/** "Done a month ago and never revised again." */
export const FORGOTTEN_MIN_AGE_DAYS = 30
export const FORGOTTEN_THRESHOLD = 6
/** "Three solutions you later admitted you couldn't write." */
export const STALE_CODE_THRESHOLD = 3

export type DetectorId = 'forgotten-done' | 'stale-code'

export type Detector = {
  id: DetectorId
  /** The exact count behind the sentence. */
  count: number
  problemIds: string[]
  text: string
  /** The one action's label — the count is in it, never in a dialog. */
  action: string
}

export function forgottenDone(entries: CloudProgressByTopic, today: string): Detector | null {
  const problemIds: string[] = []
  for (const shard of Object.values(entries)) {
    for (const [problemId, entry] of Object.entries(shard)) {
      if (entry.s !== 'done') continue
      if (entry.rc > 0 || entry.lr) continue // revised at least once → not forgotten
      const solvedOn = dayKeyOfTimestamp(entry.fd)
      if (!solvedOn || daysBetween(solvedOn, today) < FORGOTTEN_MIN_AGE_DAYS) continue
      if (!locateProblem(problemId)) continue
      problemIds.push(problemId)
    }
  }
  if (problemIds.length < FORGOTTEN_THRESHOLD) return null
  problemIds.sort()
  return {
    id: 'forgotten-done',
    count: problemIds.length,
    problemIds,
    text: `${problemIds.length} problems marked done ${FORGOTTEN_MIN_AGE_DAYS}+ days ago and never revised`,
    action: `Add ${problemIds.length} to today`,
  }
}

export function staleCode(entries: CloudProgressByTopic, snippets: SnippetsById): Detector | null {
  const problemIds: string[] = []
  for (const snippet of Object.values(snippets)) {
    const location = locateProblem(snippet.problemId)
    if (!location) continue
    const entry = entries[location.topicId]?.[snippet.problemId]
    if (entry?.o !== 'couldnt') continue
    problemIds.push(snippet.problemId)
  }
  if (problemIds.length < STALE_CODE_THRESHOLD) return null
  problemIds.sort()
  return {
    id: 'stale-code',
    count: problemIds.length,
    problemIds,
    text: `${problemIds.length} saved solutions on problems you later marked “couldn’t”`,
    action: 'Open in Code',
  }
}

/** Both detectors, strongest first; empty when nothing crosses a threshold. */
export function detectors(
  entries: CloudProgressByTopic,
  snippets: SnippetsById,
  today: string,
): Detector[] {
  return [forgottenDone(entries, today), staleCode(entries, snippets)].filter(
    (detector): detector is Detector => detector !== null,
  )
}

/** The `#/code` filter a stale-code action opens: the shared topic when there is one. */
export function codeQueryForIds(problemIds: readonly string[]): Record<string, string> {
  const topics = new Set(problemIds.map((problemId) => locateProblem(problemId)?.topicId))
  if (topics.size === 1) {
    const [topicId] = [...topics]
    if (topicId) return { topic: topicId }
  }
  return {}
}

/**
 * "Hide for today" is per device and per day: one key holds the day and the ids
 * dismissed on it, so yesterday's dismissal never hides today's note.
 */
const DISMISS_KEY = 'dsa-archive.detectors.v1'

export function readDismissed(today: string): DetectorId[] {
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? 'null')
    if (!raw || raw.day !== today || !Array.isArray(raw.ids)) return []
    return raw.ids.filter((id: unknown): id is DetectorId => id === 'forgotten-done' || id === 'stale-code')
  } catch {
    return []
  }
}

export function dismissForToday(id: DetectorId, today: string): DetectorId[] {
  const next = [...new Set([...readDismissed(today), id])]
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ day: today, ids: next }))
  } catch {
    // Dismissing is a convenience; never break Today over storage.
  }
  return next
}
