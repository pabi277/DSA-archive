import { describe, expect, it } from 'vitest'
import {
  MAX_REVISIONS,
  PLAN_MAX_PROBLEMS,
  activityByDay,
  addDays,
  clampGoal,
  continueWhereLeft,
  dateFromDayKey,
  dayKeyOf,
  dayKeyOfTimestamp,
  daysBetween,
  dueLabel,
  emptyPlan,
  heatmap,
  nextDue,
  revisionQueue,
  sanitizePlan,
  suggestedPicks,
  todayTally,
  weeklyStats,
  withDone,
  withProblem,
  withProblems,
  withoutProblem,
  streakInfo,
} from './planner'
import type { CloudProgressByTopic, CloudProgressEntry } from './cloudProgress'
import { catalogue } from './catalogue'

/** Noon local time: the local day is the same in every timezone. */
function iso(year: number, month: number, day: number, hour = 12) {
  return new Date(year, month - 1, day, hour).toISOString()
}

const TODAY = '2026-11-20'
/** 2026-11-20 is a Friday: index 25 of a 4-week Monday-aligned grid. */
const TODAY_INDEX = 25

function entry(overrides: Partial<CloudProgressEntry> = {}): CloudProgressEntry {
  return { s: 'done', b: false, a: 1, fd: iso(2026, 11, 20), lr: null, rc: 0, ...overrides }
}

describe('local day keys (the planner is phone-time, not UTC)', () => {
  it('formats, parses and shifts local days', () => {
    expect(dayKeyOf(new Date(2026, 10, 3, 23, 59))).toBe('2026-11-03')
    expect(dayKeyOf(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01')
    expect(dateFromDayKey('2026-11-03')?.getDate()).toBe(3)
    expect(dateFromDayKey('2026-02-30')).toBeNull()
    expect(dateFromDayKey('03-11-2026')).toBeNull()
    expect(dateFromDayKey('2026-13-01')).toBeNull()
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(daysBetween('2026-11-01', '2026-11-20')).toBe(19)
    expect(daysBetween('2026-11-20', '2026-11-01')).toBe(-19)
  })

  it('reads ISO strings, Firestore-style stubs and garbage timestamps', () => {
    expect(dayKeyOfTimestamp(iso(2026, 11, 3))).toBe('2026-11-03')
    expect(dayKeyOfTimestamp({ seconds: Math.floor(new Date(2026, 10, 3, 12).getTime() / 1000) })).toBe(
      '2026-11-03',
    )
    expect(dayKeyOfTimestamp(null)).toBeNull()
    expect(dayKeyOfTimestamp('')).toBeNull()
    expect(dayKeyOfTimestamp('not a date')).toBeNull()
  })
})

describe('spaced revision schedule (4.2)', () => {
  it('schedules 3, 7 and 21 days from the right baseline', () => {
    const solved = iso(2026, 11, 1)
    // Stage 0 counts from the first solve, not from a later toggled lr.
    expect(nextDue({ fd: solved, lr: iso(2026, 11, 19), rc: 0 })).toEqual({
      dueDay: '2026-11-04',
      stage: 0,
    })
    // Later stages count from the last revision.
    expect(nextDue({ fd: solved, lr: iso(2026, 11, 10), rc: 1 }).dueDay).toBe('2026-11-17')
    expect(nextDue({ fd: solved, lr: iso(2026, 11, 10), rc: 2 }).dueDay).toBe('2026-12-01')
  })

  it('graduates after three revisions and refuses to schedule unsolved rows', () => {
    expect(nextDue({ fd: iso(2026, 11, 1), lr: iso(2026, 11, 2), rc: MAX_REVISIONS })).toEqual({
      dueDay: null,
      stage: MAX_REVISIONS,
    })
    expect(nextDue({ fd: null, lr: null, rc: 0 })).toEqual({ dueDay: null, stage: 0 })
  })

  it('builds the queue: overdue first, then due, plus upcoming and graduated counts', () => {
    const entries: CloudProgressByTopic = {
      arrays: {
        'two-sum': entry({ fd: iso(2026, 11, 18), lr: iso(2026, 11, 18) }), // due 21 Nov
        'linear-search': entry({ fd: iso(2026, 11, 10), lr: iso(2026, 11, 10) }), // due 13 Nov (7 overdue)
        'binary-search': entry({ s: 'todo', fd: null, lr: null }),
        'bubble-sort': entry({ fd: iso(2026, 10, 1), lr: iso(2026, 10, 2), rc: 3 }), // graduated
      },
    }
    const queue = revisionQueue(entries, TODAY)
    expect(queue.scheduled).toBe(2)
    expect(queue.graduated).toBe(1)
    expect(queue.due.map((item) => item.problemId)).toEqual(['linear-search'])
    expect(queue.due[0].overdueDays).toBe(7)
    expect(queue.due[0].stage).toBe(0)
    expect(queue.upcoming.map((item) => item.problemId)).toEqual(['two-sum'])
    expect(queue.upcoming[0].dueDay).toBe('2026-11-21')
  })

  it('labels a due day in words rather than a raw timestamp', () => {
    expect(dueLabel('2026-11-20', TODAY)).toBe('Due today')
    expect(dueLabel('2026-11-19', TODAY)).toBe('Due yesterday')
    expect(dueLabel('2026-11-13', TODAY)).toBe('Overdue 7 days')
    expect(dueLabel('2026-11-25', TODAY)).toContain('Due ')
  })
})

describe('streaks and activity (4.3)', () => {
  const entries: CloudProgressByTopic = {
    arrays: {
      'two-sum': entry({ fd: iso(2026, 11, 18), lr: iso(2026, 11, 20), rc: 1 }),
      'linear-search': entry({ fd: iso(2026, 11, 19), lr: iso(2026, 11, 19) }),
    },
  }

  it('counts a problem once per day even when solved and revised that day', () => {
    const activity = activityByDay(entries)
    expect(activity.get('2026-11-18')).toBe(1)
    expect(activity.get('2026-11-19')).toBe(1)
    expect(activity.get('2026-11-20')).toBe(1)
  })

  it('ignores an lr bump on a row that is no longer solved', () => {
    const undone: CloudProgressByTopic = {
      arrays: { 'two-sum': entry({ s: 'todo', lr: iso(2026, 11, 20) }) },
    }
    expect(activityByDay(undone).size).toBe(0)
  })

  it('measures the current streak from today or yesterday and remembers the best run', () => {
    const streak = streakInfo(entries, TODAY)
    expect(streak.current).toBe(3)
    expect(streak.longest).toBe(3)
    expect(streak.lastActiveDay).toBe(TODAY)
    // A day of grace: yesterday still counts as "current" before today's work.
    expect(streakInfo(entries, '2026-11-21').current).toBe(3)
    // Two days of nothing ends it.
    expect(streakInfo(entries, '2026-11-22').current).toBe(0)
  })

  it('draws a Monday-aligned 7-column heatmap with future padding', () => {
    const cells = heatmap(entries, TODAY, 4)
    expect(cells).toHaveLength(28)
    // Column 1 is always a Monday and the grid ends with this week's Sunday.
    expect(dateFromDayKey(cells[0].date)?.getDay()).toBe(1)
    expect(cells[cells.length - 1].date).toBe('2026-11-22')
    expect(cells[TODAY_INDEX]).toMatchObject({ date: TODAY, count: 1, level: 1 })
    // Days after today are padding, never counted as activity.
    expect(cells.slice(TODAY_INDEX + 1).every((cell) => cell.count === -1)).toBe(true)
    const active = cells.filter((cell) => cell.count > 0)
    expect(active).toHaveLength(3)
    expect(active.every((cell) => cell.level >= 1)).toBe(true)
  })

  it('reports this week, this week’s revisions and the total solved', () => {
    const weekly = weeklyStats(entries, TODAY)
    expect(weekly.week).toHaveLength(7)
    expect(weekly.week[6].date).toBe(TODAY)
    expect(weekly.solvedThisWeek).toBe(2)
    expect(weekly.revisedThisWeek).toBe(1)
    expect(weekly.solvedTotal).toBe(2)
    expect(weekly.activeDaysThisWeek).toBe(3)
  })
})

describe('today’s goal tally (4.1)', () => {
  const entries: CloudProgressByTopic = {
    arrays: {
      'two-sum': entry({ fd: iso(2026, 11, 20), lr: iso(2026, 11, 20) }),
      'linear-search': entry({ fd: iso(2026, 11, 19), lr: iso(2026, 11, 19) }),
    },
  }

  it('counts today’s solves and revisions once each', () => {
    const plan = { ...emptyPlan(TODAY), problemIds: ['two-sum', 'binary-search'] }
    const tally = todayTally(entries, plan, TODAY, 3)
    expect(tally.movedToday).toBe(1)
    expect(tally.planned).toBe(2)
    expect(tally.done).toBe(1)
    expect(tally.goalMet).toBe(false)
  })

  it('counts a ticked plan row that is not solved in the sheet yet, without double counting', () => {
    const plan = { ...emptyPlan(TODAY), problemIds: ['two-sum', 'binary-search'], doneIds: ['binary-search'] }
    const tally = todayTally(entries, plan, TODAY, 2)
    expect(tally.done).toBe(2)
    expect(tally.movedToday).toBe(2)
    expect(tally.goalMet).toBe(true)
  })

  it('clamps a hostile goal and treats a missing plan as an empty day', () => {
    expect(todayTally({}, null, TODAY, 0).goal).toBe(1)
    expect(todayTally({}, null, TODAY, 500).goal).toBe(100)
    expect(clampGoal(Number.NaN)).toBe(5)
    expect(clampGoal(7.9)).toBe(7)
  })

  it('finds the most recently touched problem for "continue where you left"', () => {
    expect(continueWhereLeft(entries)).toEqual({ problemId: 'two-sum', day: TODAY })
    expect(continueWhereLeft({})).toBeNull()
  })
})

describe('plan documents', () => {
  it('starts from the top of the sheet when nothing is touched', () => {
    const firstTopic = catalogue.topics[0]
    const expected = firstTopic.subtopics
      .flatMap((subtopic) => subtopic.problems.map((problem) => problem.id))
      .slice(0, 5)
    expect(suggestedPicks({}, null, 5)).toEqual(expected)
  })

  it('suggests unsolved rows from the weakest touched topic, skipping the plan', () => {
    const entries: CloudProgressByTopic = {
      arrays: { 'two-sum': entry({ s: 'done' }) },
    }
    const picks = suggestedPicks(entries, null, 3)
    expect(picks).toHaveLength(3)
    expect(picks).not.toContain('two-sum')
    const planned = { ...emptyPlan(TODAY), problemIds: [picks[0]] }
    expect(suggestedPicks(entries, planned, 3)).not.toContain(picks[0])
    // Deterministic: same input, same picks.
    expect(suggestedPicks(entries, null, 3)).toEqual(picks)
  })

  it('offers target-list rows first when a deadline passes them (v2-08)', () => {
    // Without a focus list the picks start at the top of the sheet, so naming a
    // row from the middle of Arrays as the target must move it to the front.
    const focus = 'largest-element'
    const plain = suggestedPicks({}, null, 5)
    expect(plain[0]).not.toBe(`${focus}`)
    expect(suggestedPicks({}, null, 5, [focus])[0]).toBe(focus)
    // A solved or already-planned focus row is skipped, never duplicated.
    const entries: CloudProgressByTopic = { arrays: { [focus]: entry({ s: 'done' }) } }
    expect(suggestedPicks(entries, null, 5, [focus])).not.toContain(focus)
    const planned = { ...emptyPlan(TODAY), problemIds: [focus] }
    const picks = suggestedPicks({}, planned, 5, [focus])
    expect(picks).not.toContain(focus)
    expect(new Set(picks).size).toBe(picks.length)
  })

  it('adds, removes and ticks problems while keeping doneIds a subset', () => {
    const base = emptyPlan(TODAY)
    const added = withProblem(base, 'two-sum')!
    expect(added.problemIds).toEqual(['two-sum'])
    expect(withProblem(added, 'two-sum')!.problemIds).toEqual(['two-sum'])
    expect(withProblem(added, 'not-a-problem')).toBeNull()

    const ticked = withDone(added, 'two-sum')
    expect(ticked.doneIds).toEqual(['two-sum'])
    expect(withDone(ticked, 'two-sum').doneIds).toEqual(['two-sum'])
    expect(withDone(added, 'linear-search').doneIds).toEqual([])

    const removed = withoutProblem(ticked, 'two-sum')
    expect(removed.problemIds).toEqual([])
    expect(removed.doneIds).toEqual([])

    const batch = withProblems(ticked, ['two-sum', 'linear-search', 'breaking-the-myth'])!
    expect(batch.problemIds).toEqual(['two-sum', 'linear-search', 'breaking-the-myth'])
    expect(batch.doneIds).toEqual(['two-sum'])
    expect(withProblems(ticked, ['two-sum', 'not-a-problem'])).toBeNull()
  })

  it('refuses to grow a day past the rules’ limit', () => {
    const full = { ...emptyPlan(TODAY), problemIds: Array.from({ length: PLAN_MAX_PROBLEMS }, () => 'two-sum') }
    expect(withProblem(full, 'two-sum')).toBe(full)
    expect(withProblem(full, 'linear-search')).toBeNull()
  })

  it('sanitizes a Firestore plan defensively', () => {
    const plan = sanitizePlan('2026-11-20', {
      problemIds: ['two-sum', 'not-a-problem', 'two-sum', 7],
      doneIds: ['two-sum', 'linear-search'],
      updatedAt: { toDate: () => new Date(2026, 10, 20, 12) },
    })
    expect(plan).toMatchObject({ date: '2026-11-20', problemIds: ['two-sum'], doneIds: ['two-sum'] })
    expect(plan?.updatedAt).toBeTruthy()

    expect(sanitizePlan('20-11-2026', { problemIds: [] })).toBeNull()
    expect(sanitizePlan('2026-11-20', null)).toBeNull()
    expect(sanitizePlan('2026-11-20', { problemIds: 'two-sum' })?.problemIds).toEqual([])
  })
})
