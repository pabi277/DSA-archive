/**
 * Phase v2-08 — the reason vocabulary.
 *
 * Every recommendation the app makes carries one or two reasons drawn from this
 * fixed list of nine. The list is the single source of truth: the Today rows,
 * the suggested picks, the topic practice rows and the ⌘K palette all read it
 * from here, so a chip can never be invented at a call site.
 *
 * No scoring, no weights, no model. A reason is a *fact* about one row that the
 * learner can verify by looking at their own data (a due date, a quiz score, an
 * outcome, an age), which is the whole point of the owner's "cheap and honest"
 * decision (`docs/DECISIONS.md`, 2026-11-03).
 */
import { locateProblem, subtopicNeighbours } from '../library'
import {
  daysBetween,
  dayKeyOfTimestamp,
  nextDue,
  type Plan,
} from '../planner'
import type { CloudProgressByTopic } from '../cloudProgress'

export type ReasonId =
  | 'overdue'
  | 'due'
  | 'first'
  | 'target'
  | 'shaky'
  | 'weakest'
  | 'stale'
  | 'quiz'
  | 'buddy'

export type Reason = {
  id: ReasonId
  /** What the chip shows. Always short, always lowercase, never an emoji. */
  text: string
}

/** Fixed display order: the strongest fact first, the softest last. */
export const REASON_ORDER: ReasonId[] = [
  'overdue',
  'due',
  'first',
  'target',
  'shaky',
  'weakest',
  'stale',
  'quiz',
  'buddy',
]

/** At most two chips per row (the rest stay in the tooltip/palette detail). */
export const MAX_REASONS_SHOWN = 2
/** A row untouched for this long earns `not touched 41d`. */
export const STALE_REASON_DAYS = 30

export type Target = {
  /** `YYYY-MM-DD` the learner wants the sheet finished by, or null. */
  date: string | null
  /** A custom list id used as the finish line, or null. */
  listId: string | null
  /** The resolved ids of that list (empty when the list is gone). */
  listProblemIds: readonly string[]
}

export const NO_TARGET: Target = { date: null, listId: null, listProblemIds: [] }

export type ReasonExtra = {
  /** `weakestTopic()` from the sheet module, computed once per render. */
  weakestTopicId?: string | null
  /** Per-topic quiz results; a failed attempt earns `quiz to pass`. */
  quizResults?: Record<string, { passed: boolean }>
}

function push(list: Reason[], id: ReasonId, text: string) {
  if (!list.some((reason) => reason.id === id)) list.push({ id, text })
}

/**
 * The reasons for one row, strongest first. Pure: every input is a value.
 *
 * `reasonsFor` never looks at the network, the clock or a random seed — the same
 * progress + plan + day always yields the same chips, which is what makes the
 * unit table below meaningful.
 */
export function reasonsFor(
  problemId: string,
  entries: CloudProgressByTopic,
  plan: Plan | null,
  today: string,
  target: Target = NO_TARGET,
  extra: ReasonExtra = {},
): Reason[] {
  const location = locateProblem(problemId)
  if (!location) return []
  // Rows ticked done today need no explanation — a chip there would be noise.
  if (plan?.doneIds.includes(problemId)) return []
  const entry = entries[location.topicId]?.[problemId]
  const done = entry?.s === 'done' || entry?.s === 'revision'
  const reasons: Reason[] = []

  // 1/2 — the revision queue speaks first: an overdue row is a promise broken.
  // Only solved rows are on the schedule (`revisionQueue` says the same).
  if (entry && done) {
    const due = nextDue(entry)
    if (due.dueDay && due.dueDay <= today) {
      const late = daysBetween(due.dueDay, today)
      if (late > 0) push(reasons, 'overdue', `overdue ${late}d`)
      else push(reasons, 'due', 'due today')
    }
  }

  // 3 — never touched at all.
  if (!entry) push(reasons, 'first', 'first solve')

  // 4 — inside the learner's own finish line.
  if (!done && target.listProblemIds.includes(problemId)) push(reasons, 'target', 'next in your target')

  // 5 — the one `o` field we kept: you told us it was shaky.
  if (done && entry?.o === 'couldnt') push(reasons, 'shaky', 'shaky — couldn’t last time')

  // 6 — the topic with the lowest completion.
  if (!done && extra.weakestTopicId === location.topicId) push(reasons, 'weakest', 'weakest topic')

  // 7 — an old row that nobody has come back to.
  if (entry) {
    const touched = dayKeyOfTimestamp(entry.lr ?? entry.fd)
    const age = touched ? daysBetween(touched, today) : 0
    if (touched && age >= STALE_REASON_DAYS) push(reasons, 'stale', `not touched ${age}d`)
  }

  // 8 — a quiz you tried and did not pass.
  if (extra.quizResults?.[location.topicId] && !extra.quizResults[location.topicId].passed) {
    push(reasons, 'quiz', 'quiz to pass')
  }

  // 9 — you solved its neighbour in the same subtopic.
  if (!done) {
    for (const neighbourId of subtopicNeighbours(location)) {
      if (neighbourId === problemId) continue
      const sibling = entries[location.topicId]?.[neighbourId]
      if (sibling?.s !== 'done' && sibling?.s !== 'revision') continue
      const title = locateProblem(neighbourId)?.problem.title
      if (title) push(reasons, 'buddy', `buddy of ${title}`)
      break
    }
  }

  return reasons.sort((a, b) => REASON_ORDER.indexOf(a.id) - REASON_ORDER.indexOf(b.id))
}

/** Reasons for a set of rows, for the Today list, suggestions and the palette. */
export function reasonsForAll(
  problemIds: readonly string[],
  entries: CloudProgressByTopic,
  plan: Plan | null,
  today: string,
  target: Target = NO_TARGET,
  extra: ReasonExtra = {},
): Record<string, Reason[]> {
  const map: Record<string, Reason[]> = {}
  for (const problemId of problemIds) {
    const reasons = reasonsFor(problemId, entries, plan, today, target, extra)
    if (reasons.length > 0) map[problemId] = reasons
  }
  return map
}

/** The chips a row shows; the rest live in the tooltip. */
export function chipsOf(reasons: readonly Reason[]): string[] {
  return reasons.slice(0, MAX_REASONS_SHOWN).map((reason) => reason.text)
}

/** Every reason as one line — the `title` tooltip and the palette detail. */
export function reasonLine(reasons: readonly Reason[]): string {
  return reasons.map((reason) => reason.text).join(' · ')
}
