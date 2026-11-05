/**
 * Phase v2-08 — momentum instead of a punitive streak.
 *
 * The owner dropped score-like analytics but kept *momentum*: a number that
 * decays instead of resetting to zero, so a rest day costs a little and a lost
 * week does not erase a month of work. There is no target, no bonus, no colour
 * and no flame — just a weighted count with the weights published here.
 *
 *   weighted = Σ over the last 14 days of 0.9^daysAgo × active(day)
 *   momentum = round(10 × weighted / Σ 0.9^d, 1)
 *
 * With all 14 days active the divisor is exactly the sum of the weights, so the
 * scale tops out at 10.0 and is directly comparable between learners.
 */
import { addDays, activityByDay } from '../planner'
import type { CloudProgressByTopic } from '../cloudProgress'

export const MOMENTUM_WINDOW_DAYS = 14
export const MOMENTUM_DECAY = 0.9
/** A week with five study days has met its quota; the sixth and seventh may rest. */
export const WEEK_QUOTA_DAYS = 5
export const MOMENTUM_MAX = 10

export type Momentum = {
  /** 0–10, one decimal. Never negative, never NaN, never a judgement. */
  value: number
  /** Study days in the last seven, including today. */
  studyDaysThisWeek: number
  /** True when today is empty but the week's quota is already met. */
  restDayEarned: boolean
  /** The 14-day strip: oldest first, today last. */
  strip: { date: string; active: boolean }[]
  /** The sentence a screen reader gets instead of the strip. */
  summary: string
}

function maxWeight(): number {
  let total = 0
  for (let daysAgo = 0; daysAgo < MOMENTUM_WINDOW_DAYS; daysAgo += 1) {
    total += MOMENTUM_DECAY ** daysAgo
  }
  return total
}

const MAX_WEIGHT = maxWeight()

export function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function momentum(entries: CloudProgressByTopic, today: string): Momentum {
  const activity = activityByDay(entries)
  const strip: Momentum['strip'] = []
  let weighted = 0
  for (let daysAgo = MOMENTUM_WINDOW_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const date = addDays(today, -daysAgo)
    const active = (activity.get(date) ?? 0) > 0
    if (active) weighted += MOMENTUM_DECAY ** daysAgo
    strip.push({ date, active })
  }

  let studyDaysThisWeek = 0
  for (let daysAgo = 0; daysAgo < 7; daysAgo += 1) {
    if ((activity.get(addDays(today, -daysAgo)) ?? 0) > 0) studyDaysThisWeek += 1
  }

  const activeToday = (activity.get(today) ?? 0) > 0
  // "Rest day earned": today is empty, but the seven-day quota is already met.
  const restDayEarned = !activeToday && studyDaysThisWeek >= WEEK_QUOTA_DAYS
  const value = round1((MOMENTUM_MAX * weighted) / MAX_WEIGHT)

  const summary =
    `${value.toFixed(1)} of 10 · ${studyDaysThisWeek} study day${studyDaysThisWeek === 1 ? '' : 's'} this week` +
    (restDayEarned ? ' · rest day earned' : '')

  return { value, studyDaysThisWeek, restDayEarned, strip, summary }
}
