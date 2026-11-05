/**
 * Phase v2-08 — one line of trajectory, arithmetic only.
 *
 * Pace is the **median** problems-per-day over the last 14 days that had any
 * work, so one heroic afternoon cannot move the line and one empty week cannot
 * fake a collapse. From that, one sentence: when the sheet ends at this pace,
 * and — if the learner set a target date — how far ahead or behind that is.
 *
 * This is not a forecast model. There is no chart, no confidence band and no
 * stored value: change the data and the sentence changes on the next render.
 */
import { addDays, daysBetween, dateFromDayKey } from '../planner'

/** Pace looks at the last 14 days that had work, not the last 14 calendar days. */
export const PACE_ACTIVE_DAYS = 14
/** Five quiet days mean "start again", not "you failed". */
export const STALL_DAYS = 5

export type TrajectoryInput = {
  /** Day key → problems moved that day (`activityByDay`). */
  activity: Map<string, number>
  /** Catalogue rows solved (drills are excluded from the denominator). */
  done: number
  /** Catalogue rows in the sheet (495). */
  total: number
  today: string
  /** `YYYY-MM-DD` target, or null. */
  targetDate: string | null
}

export type Trajectory = {
  pace: number
  remaining: number
  /** The single sentence a screen shows. */
  sentence: string
  /** Day key the sheet finishes at this pace, or null when it cannot be said. */
  finishDay: string | null
  /** Whole days from today to the finish line, or null. */
  daysToFinish: number | null
  /** Problems per day a target date would demand, or null. */
  needsPerDay: number | null
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/** Median of a numeric list; 0 for an empty list. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

/** "28 Nov" — short, locale-independent enough for one sentence. */
export function shortDay(key: string): string {
  const date = dateFromDayKey(key)
  if (!date) return key
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Median problems/day over the last `PACE_ACTIVE_DAYS` active days. */
export function paceOf(activity: Map<string, number>): number {
  const activeDays = [...activity.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-PACE_ACTIVE_DAYS)
    .map(([, count]) => count)
  return round1(median(activeDays))
}

export function trajectory({ activity, done, total, today, targetDate }: TrajectoryInput): Trajectory {
  const pace = paceOf(activity)
  const remaining = Math.max(0, total - done)
  const lastActive = [...activity.entries()]
    .filter(([, count]) => count > 0)
    .map(([day]) => day)
    .sort()
    .pop()
  const quietFor = lastActive ? daysBetween(lastActive, today) : Infinity
  const stalled = pace === 0 || quietFor >= STALL_DAYS
  const daysToTarget = targetDate ? daysBetween(today, targetDate) : null

  if (remaining === 0) {
    return {
      pace,
      remaining,
      sentence: 'Every row is solved — nothing left to project.',
      finishDay: null,
      daysToFinish: null,
      needsPerDay: null,
    }
  }

  // A target date that can no longer be met by the current pace is stated as
  // what it would take — one number, no colour, no banner.
  if (stalled && targetDate && daysToTarget !== null && daysToTarget >= 1) {
    const needsPerDay = round1(remaining / daysToTarget)
    return {
      pace,
      remaining,
      sentence: `Needs ${needsPerDay}/day to hit ${shortDay(targetDate)}`,
      finishDay: null,
      daysToFinish: null,
      needsPerDay,
    }
  }

  if (pace === 0) {
    return {
      pace,
      remaining,
      sentence: `${remaining} row${remaining === 1 ? '' : 's'} left · no work in the last ${STALL_DAYS} days to pace from`,
      finishDay: null,
      daysToFinish: null,
      needsPerDay: null,
    }
  }

  const daysToFinish = Math.ceil(remaining / pace)
  const finishDay = addDays(today, daysToFinish)

  if (targetDate && daysToTarget !== null) {
    const difference = daysBetween(finishDay, targetDate)
    const verdict =
      difference > 0
        ? `${difference} day${difference === 1 ? '' : 's'} ahead of ${shortDay(targetDate)}`
        : difference < 0
          ? `${-difference} day${difference === -1 ? '' : 's'} behind ${shortDay(targetDate)}`
          : `right on ${shortDay(targetDate)}`
    return {
      pace,
      remaining,
      sentence: `At ${pace}/day you finish ${shortDay(finishDay)} (${verdict})`,
      finishDay,
      daysToFinish,
      needsPerDay: null,
    }
  }

  const months = Math.round(daysToFinish / 30.44)
  const horizon = daysToFinish <= 45 ? `${daysToFinish} days` : `~${Math.max(1, months)} months`
  return {
    pace,
    remaining,
    sentence: `At ${pace}/day you’ll finish the sheet in ${horizon}`,
    finishDay,
    daysToFinish,
    needsPerDay: null,
  }
}

/**
 * §3.8 — plan versus reality, read-only.
 *
 * The plan is one document per day, and the app subscribes to today only, so
 * this comparison never asks Firestore for history: "reality" is the median of
 * problems moved on the days that had work over the last three weeks, derived
 * from progress the device already has. Counting empty days would make every
 * honest learner look idle, so the window is days worked — the sentence names
 * it. The one action is a *suggestion* (`Set goal to 3`); nothing changes the
 * goal on its own.
 */
export const REALITY_WINDOW_DAYS = 21

export type PlanReality = {
  planned: number
  completed: number
  /** Median problems moved per day over the window, one decimal. */
  medianPerDay: number
  /** A rounded-down goal worth suggesting, or null when reality is ≥ the goal. */
  suggestion: number | null
}

export function planVsReality({
  activity,
  planned,
  completed,
  goal,
  today,
}: {
  activity: Map<string, number>
  planned: number
  completed: number
  goal: number
  today: string
}): PlanReality {
  const counts: number[] = []
  for (let daysAgo = REALITY_WINDOW_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const moved = activity.get(addDays(today, -daysAgo)) ?? 0
    if (moved > 0) counts.push(moved)
  }
  const medianPerDay = round1(median(counts))
  const realistic = Math.max(1, Math.round(medianPerDay))
  return {
    planned,
    completed,
    medianPerDay,
    suggestion: medianPerDay > 0 && realistic < goal ? realistic : null,
  }
}
