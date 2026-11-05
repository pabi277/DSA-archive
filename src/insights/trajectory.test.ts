import { describe, expect, it } from 'vitest'
import { PACE_ACTIVE_DAYS, STALL_DAYS, median, paceOf, planVsReality, shortDay, trajectory } from './trajectory'
import { addDays } from '../planner'

const TODAY = '2026-11-04'
const TOTAL = 495

/** Day key → problems moved, from `[daysAgo, count]` pairs. */
function activityOf(pairs: readonly (readonly [number, number])[]): Map<string, number> {
  return new Map(pairs.map(([daysAgo, count]) => [addDays(TODAY, -daysAgo), count]))
}

describe('trajectory', () => {
  it('median handles odd, even and empty lists', () => {
    expect(median([])).toBe(0)
    expect(median([3])).toBe(3)
    expect(median([1, 5, 3])).toBe(3)
    expect(median([1, 2, 3, 10])).toBe(2.5)
  })

  it('paces from the median of the last 14 active days, not the mean', () => {
    // One heroic 30-problem day must not drag the pace up: median of the
    // 14 active days below is 2.
    const pairs: [number, number][] = [[1, 30]]
    for (let index = 2; index <= 14; index += 1) pairs.push([index, 2])
    expect(paceOf(activityOf(pairs))).toBe(2)
    expect(activityOf(pairs).size).toBe(PACE_ACTIVE_DAYS)
  })

  it('hand-computed example: 2/day with 20 rows left finishes in 10 days', () => {
    expect(
      trajectory({
        activity: activityOf([[1, 2], [2, 2], [3, 2]]),
        done: 475,
        total: TOTAL,
        today: TODAY,
        targetDate: null,
      }).sentence,
    ).toBe('At 2/day you’ll finish the sheet in 10 days')
  })

  it('states how far ahead of a target date that is', () => {
    const result = trajectory({
      activity: activityOf([[1, 2], [2, 2]]),
      done: 475,
      total: TOTAL,
      today: TODAY,
      targetDate: addDays(TODAY, 16),
    })
    expect(result.finishDay).toBe(addDays(TODAY, 10))
    expect(result.sentence).toBe(`At 2/day you finish ${shortDay(addDays(TODAY, 10))} (6 days ahead of ${shortDay(addDays(TODAY, 16))})`)
  })

  it('says "behind" when the target is closer than the pace allows', () => {
    const result = trajectory({
      activity: activityOf([[1, 1]]),
      done: 480,
      total: TOTAL,
      today: TODAY,
      targetDate: addDays(TODAY, 5),
    })
    expect(result.sentence).toContain(`10 days behind ${shortDay(addDays(TODAY, 5))}`)
  })

  it('after five quiet days asks for a rate instead of projecting', () => {
    const result = trajectory({
      activity: activityOf([[STALL_DAYS + 2, 3]]),
      done: 400,
      total: TOTAL,
      today: TODAY,
      targetDate: addDays(TODAY, 28),
    })
    expect(result.needsPerDay).toBe(3.4)
    expect(result.sentence).toBe(`Needs 3.4/day to hit ${shortDay(addDays(TODAY, 28))}`)
  })

  it('says so plainly with no work at all', () => {
    const result = trajectory({ activity: new Map(), done: 0, total: TOTAL, today: TODAY, targetDate: null })
    expect(result.pace).toBe(0)
    expect(result.sentence).toBe('495 rows left · no work in the last 5 days to pace from')
  })

  it('stops projecting when every row is solved', () => {
    const result = trajectory({ activity: activityOf([[1, 1]]), done: TOTAL, total: TOTAL, today: TODAY, targetDate: addDays(TODAY, 30) })
    expect(result.sentence).toBe('Every row is solved — nothing left to project.')
  })
})

describe('plan vs reality', () => {
  it('reports the plan, the completed count and the median over days worked', () => {
    const result = planVsReality({
      activity: activityOf([[0, 3], [1, 3], [2, 2], [3, 3]]),
      planned: 5,
      completed: 3,
      goal: 5,
      today: TODAY,
    })
    expect(result).toMatchObject({ planned: 5, completed: 3, medianPerDay: 3 })
  })

  it('suggests a lower goal only when reality is below it', () => {
    const activity = activityOf([[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2]])
    expect(planVsReality({ activity, planned: 5, completed: 2, goal: 6, today: TODAY }).suggestion).toBe(2)
    expect(planVsReality({ activity, planned: 5, completed: 2, goal: 2, today: TODAY }).suggestion).toBeNull()
    expect(planVsReality({ activity: new Map(), planned: 0, completed: 0, goal: 5, today: TODAY }).suggestion).toBeNull()
  })
})
