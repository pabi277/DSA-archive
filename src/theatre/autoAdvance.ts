/**
 * Phase v2-06 — "next problem" for the end-of-video card.
 *
 * `Auto-advance` is an **opt-in** setting that starts off (default off, as the
 * phase contract requires). When it is on and today's plan has a next row, the
 * end of a video offers one line: `Next: Longest Substring · 12 min →`.
 * The offer is an offer — nothing auto-plays and nothing auto-navigates.
 *
 * The same function answers "what is the next row?" for a problem page even
 * when the plan is empty, so the card always has something honest to say.
 */
import { locateProblem } from '../library'

export type NextTarget = {
  problemId: string
  title: string
  /** Estimated minutes from the plan target or the drill's own estimate. */
  minutes: number | null
  /** One of the two honest reasons this row is next. */
  reason: 'in today’s plan' | 'next in this topic'
}

const AUTO_ADVANCE_KEY = 'dsa-archive.theatre.autoadvance.v1'

export function readAutoAdvance(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): boolean {
  if (!storage) return false
  try {
    return storage.getItem(AUTO_ADVANCE_KEY) === 'on'
  } catch {
    return false
  }
}

export function writeAutoAdvance(on: boolean, storage: Pick<Storage, 'setItem' | 'removeItem'> | undefined = globalThis.localStorage) {
  if (!storage) return
  try {
    if (on) storage.setItem(AUTO_ADVANCE_KEY, 'on')
    else storage.removeItem(AUTO_ADVANCE_KEY)
  } catch {
    // Storage is a convenience here; the toggle still works for this render.
  }
}

/** Minutes the plan recorded for a row, when it recorded any. */
export function planMinutes(plan: { problemIds: string[]; minutes?: Record<string, number> } | null | undefined, problemId: string): number | null {
  const value = plan?.minutes?.[problemId]
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null
}

/**
 * Today's plan first (the plan is the learner's own intent), then the next
 * unsolved row in the same topic. Returns null when there is nothing at all —
 * callers render nothing rather than an empty promise.
 */
export function nextUp(options: {
  currentId: string
  planProblemIds: readonly string[]
  topicRows: readonly string[]
  isDone: (problemId: string) => boolean
  minutesFor?: (problemId: string) => number | null
}): NextTarget | null {
  const { currentId, planProblemIds, topicRows, isDone, minutesFor } = options
  const describe = (problemId: string, reason: NextTarget['reason']): NextTarget | null => {
    if (problemId === currentId) return null
    const location = locateProblem(problemId)
    if (!location) return null
    const minutes = minutesFor?.(problemId) ?? null
    return { problemId, title: location.problem.title, minutes, reason }
  }

  const planned = planProblemIds.find((problemId) => problemId !== currentId && !isDone(problemId))
  if (planned) {
    const target = describe(planned, 'in today’s plan')
    if (target) return target
    // Planned but not in the catalogue any more: fall through to the topic row.
  }

  const currentIndex = topicRows.indexOf(currentId)
  const ordered = currentIndex >= 0
    ? [...topicRows.slice(currentIndex + 1), ...topicRows.slice(0, currentIndex)]
    : [...topicRows]
  for (const problemId of ordered) {
    if (isDone(problemId)) continue
    const target = describe(problemId, 'next in this topic')
    if (target) return target
  }
  return null
}

/** `Next: Longest Substring · 12 min →` — the exact card sentence. */
export function nextLine(target: NextTarget): string {
  return `Next: ${target.title}${target.minutes ? ` · ${target.minutes} min` : ''}`
}
