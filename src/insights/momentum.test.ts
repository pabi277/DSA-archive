import { describe, expect, it } from 'vitest'
import {
  MOMENTUM_DECAY,
  MOMENTUM_MAX,
  MOMENTUM_WINDOW_DAYS,
  WEEK_QUOTA_DAYS,
  momentum,
} from './momentum'
import { addDays } from '../planner'
import type { CloudProgressByTopic } from '../cloudProgress'

const TODAY = '2026-11-04'

/** One solved row per requested day — enough to make `activityByDay` count it. */
function worked(daysAgo: readonly number[]): CloudProgressByTopic {
  const rows: CloudProgressByTopic = {}
  daysAgo.forEach((offset, index) => {
    const day = addDays(TODAY, -offset)
    rows.arrays = rows.arrays ?? {}
    rows.arrays[`row-${index}`] = {
      s: 'done',
      b: false,
      a: 1,
      fd: `${day}T09:00:00.000Z`,
      lr: null,
      rc: 0,
    }
  })
  return rows
}

describe('momentum', () => {
  it('is zero with no work at all — and never negative', () => {
    expect(momentum({}, TODAY).value).toBe(0)
  })

  it('tops out at 10.0 with every day of the window active', () => {
    const all = Array.from({ length: MOMENTUM_WINDOW_DAYS }, (_, index) => index)
    expect(momentum(worked(all), TODAY).value).toBe(MOMENTUM_MAX)
  })

  it('decays instead of resetting: one empty day costs less than a lost week', () => {
    const full = Array.from({ length: MOMENTUM_WINDOW_DAYS }, (_, index) => index)
    const oneMissed = full.filter((offset) => offset !== 0)
    const weekOff = full.filter((offset) => offset > 6)
    const missed = momentum(worked(oneMissed), TODAY).value
    const week = momentum(worked(weekOff), TODAY).value
    expect(missed).toBeLessThan(MOMENTUM_MAX)
    expect(missed).toBeGreaterThan(week)
    expect(week).toBeGreaterThan(0)
  })

  it('matches the published formula by hand', () => {
    // Three active days: today, one day ago, two days ago.
    const expected = Math.round(
      (MOMENTUM_MAX * (1 + MOMENTUM_DECAY + MOMENTUM_DECAY ** 2)) /
        Array.from({ length: MOMENTUM_WINDOW_DAYS }, (_, index) => MOMENTUM_DECAY ** index).reduce(
          (sum, weight) => sum + weight,
          0,
        ) *
        10,
    ) / 10
    expect(momentum(worked([0, 1, 2]), TODAY).value).toBe(expected)
  })

  it('counts study days this week and earns the rest day only after the quota', () => {
    const five = [1, 2, 3, 4, 5]
    const rest = momentum(worked(five), TODAY)
    expect(rest.studyDaysThisWeek).toBe(WEEK_QUOTA_DAYS)
    expect(rest.restDayEarned).toBe(true)
    expect(rest.summary).toContain('rest day earned')

    const shortWeek = momentum(worked([1, 2, 3]), TODAY)
    expect(shortWeek.restDayEarned).toBe(false)
    expect(shortWeek.studyDaysThisWeek).toBe(3)
  })

  it('does not earn a rest day on a day that was worked', () => {
    const workedToday = momentum(worked([0, 1, 2, 3, 4, 5]), TODAY)
    expect(workedToday.restDayEarned).toBe(false)
  })

  it('exposes a 14-cell strip with a sentence instead of colour', () => {
    const value = momentum(worked([0, 3, 9]), TODAY)
    expect(value.strip).toHaveLength(MOMENTUM_WINDOW_DAYS)
    expect(value.strip[value.strip.length - 1]).toEqual({ date: TODAY, active: true })
    expect(value.summary).toMatch(/of 10 · \d+ study days? this week/)
  })
})
