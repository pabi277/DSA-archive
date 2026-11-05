/**
 * Phase 4 pure model: the daily plan, the spaced-revision schedule and the
 * on-device stats that phase 4 promises (`docs/ROADMAP.md` row 4).
 *
 * No Firebase and no React imports here — every function is deterministic and
 * unit-tested. Dates are handled as **local** `YYYY-MM-DD` day keys so a phone
 * that syncs from another timezone still sees the day it is living in, while
 * the Firestore documents keep `serverTimestamp()` for ordering.
 *
 * Revision status is **derived**, never stored in `s`: a solved problem is due
 * again 3, then 7, then 21 days after its last revision. `rc` (revision count)
 * is the only field phase 4 adds to a progress entry, which is why
 * `firestore.rules` moves to v3 (recorded in `DECISIONS.md`).
 */
import { catalogue, type Problem } from './catalogue'
import { locateProblem } from './library'
import type { CloudProgressByTopic } from './cloudProgress'

/** `users/{uid}/plans/{yyyy-mm-dd}` — the day key doubles as the doc id. */
export const PLAN_ID_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/
/** Kept in sync with the generated rules for plan documents. */
export const PLAN_MAX_PROBLEMS = 200
/** 3 → 7 → 21 days, exactly the roadmap's schedule. */
export const REVISION_INTERVALS = [3, 7, 21] as const
/** After the third revision a problem is graduated: no longer scheduled. */
export const MAX_REVISIONS = REVISION_INTERVALS.length
export const DEFAULT_DAILY_GOAL = 5
export const DAILY_GOAL_MIN = 1
export const DAILY_GOAL_MAX = 100
const DAY_MS = 86_400_000

export type Plan = {
  date: string
  problemIds: string[]
  doneIds: string[]
  /** ISO string from the Firestore server timestamp; null when unreadable. */
  updatedAt: string | null
}

export type BackupPlan = {
  date: string
  problemIds: string[]
  doneIds: string[]
  updatedAt: string | null
}

export type RevisionItem = {
  problemId: string
  topicId: string
  problem: Problem
  /** Day the problem was last worked on (first solve, else last revision). */
  lastDay: string
  dueDay: string
  /** 0 = first revision, 1 = second, 2 = third; ≥3 is graduated. */
  stage: number
  overdueDays: number
}

export type RevisionQueue = {
  due: RevisionItem[]
  upcoming: RevisionItem[]
  graduated: number
  scheduled: number
}

export type StreakInfo = {
  current: number
  longest: number
  lastActiveDay: string | null
  activeDays: number
}

export type HeatCell = { date: string; count: number; level: 0 | 1 | 2 | 3 }

export type WeeklyStats = {
  week: { date: string; label: string; count: number }[]
  solvedThisWeek: number
  revisedThisWeek: number
  solvedTotal: number
  activeDaysThisWeek: number
}

export type TodayTally = {
  planned: number
  done: number
  movedToday: number
  goal: number
  goalMet: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/** Local calendar day of a Date as `YYYY-MM-DD`. */
export function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey(now: Date = new Date()): string {
  return dayKeyOf(now)
}

/** Day key → Date at local midnight, or null for a malformed key. */
export function dateFromDayKey(key: string): Date | null {
  if (!PLAN_ID_PATTERN.test(key)) return null
  const year = Number(key.slice(0, 4))
  const month = Number(key.slice(5, 7))
  const day = Number(key.slice(8, 10))
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

export function addDays(key: string, days: number): string {
  const date = dateFromDayKey(key)
  if (!date) return key
  date.setDate(date.getDate() + days)
  return dayKeyOf(date)
}

/** Whole days from `from` to `to`; negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  const a = dateFromDayKey(from)
  const b = dateFromDayKey(to)
  if (!a || !b) return 0
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

/** An ISO timestamp (or a Firestore Timestamp stub) → local day key. */
export function dayKeyOfTimestamp(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const date = new Date(trimmed)
    return Number.isNaN(date.getTime()) ? null : dayKeyOf(date)
  }
  if (isRecord(value)) {
    const candidate = value as { toDate?: () => Date; seconds?: number }
    if (typeof candidate.toDate === 'function') {
      const date = candidate.toDate()
      return Number.isNaN(date.getTime()) ? null : dayKeyOf(date)
    }
    if (typeof candidate.seconds === 'number') {
      return dayKeyOf(new Date(candidate.seconds * 1000))
    }
  }
  return null
}

/**
 * Which day a problem is due again, and at which stage.
 *
 * Stage 0 uses `fd` (first solved) as the baseline — a re-toggled `lr` must not
 * silently push the first revision around. Later stages use `lr`, the last time
 * the problem was actually revised.
 */
export function nextDue(entry: { fd: string | null; lr: string | null; rc?: number }): {
  dueDay: string | null
  stage: number
} {
  const stage = Math.max(0, Math.min(MAX_REVISIONS, Math.trunc(entry.rc ?? 0)))
  if (stage >= MAX_REVISIONS) return { dueDay: null, stage }
  const baseline = stage === 0 ? (entry.fd ?? entry.lr) : (entry.lr ?? entry.fd)
  const day = dayKeyOfTimestamp(baseline)
  if (!day) return { dueDay: null, stage }
  return { dueDay: addDays(day, REVISION_INTERVALS[stage]), stage }
}

/**
 * 4.2 — the spaced revision queue. Only solved rows enter it; a row is due when
 * its scheduled day has arrived. Overdue rows come first, then today's.
 */
export function revisionQueue(entries: CloudProgressByTopic, today: string): RevisionQueue {
  const due: RevisionItem[] = []
  const upcoming: RevisionItem[] = []
  let graduated = 0
  let scheduled = 0

  for (const [topicId, shard] of Object.entries(entries)) {
    for (const [problemId, entry] of Object.entries(shard)) {
      if (entry.s !== 'done') continue
      const location = locateProblem(problemId)
      if (!location) continue
      const { dueDay, stage } = nextDue(entry)
      if (!dueDay) {
        if (stage >= MAX_REVISIONS) graduated += 1
        continue
      }
      scheduled += 1
      const item: RevisionItem = {
        problemId,
        topicId,
        problem: location.problem,
        lastDay: dayKeyOfTimestamp(stage === 0 ? (entry.fd ?? entry.lr) : (entry.lr ?? entry.fd)) ?? today,
        dueDay,
        stage,
        overdueDays: daysBetween(dueDay, today),
      }
      if (dueDay <= today) due.push(item)
      else upcoming.push(item)
    }
  }

  const byDue = (a: RevisionItem, b: RevisionItem) =>
    a.dueDay === b.dueDay ? a.problem.title.localeCompare(b.problem.title) : a.dueDay.localeCompare(b.dueDay)

  due.sort((a, b) => (a.overdueDays === b.overdueDays ? byDue(a, b) : b.overdueDays - a.overdueDays))
  upcoming.sort(byDue)

  return { due, upcoming: upcoming.slice(0, 6), graduated, scheduled }
}

/** Every day on which the user solved or revised something (dedup per day). */
export function activityByDay(entries: CloudProgressByTopic): Map<string, number> {
  const activity = new Map<string, number>()
  for (const shard of Object.values(entries)) {
    for (const entry of Object.values(shard)) {
      const seen = new Set<string>()
      const solved = entry.s === 'done' || entry.rc > 0 ? dayKeyOfTimestamp(entry.fd) : null
      const revised = dayKeyOfTimestamp(entry.lr)
      if (solved) seen.add(solved)
      // `lr` is also written when a row is un-done, so only count it as work
      // when the row is currently done.
      if (revised && entry.s === 'done') seen.add(revised)
      for (const day of seen) activity.set(day, (activity.get(day) ?? 0) + 1)
    }
  }
  return activity
}

/** 4.3 — current streak (today or yesterday may start it), longest, active days. */
export function streakInfo(entries: CloudProgressByTopic, today: string): StreakInfo {
  const activity = activityByDay(entries)
  const days = [...activity.keys()].sort()
  let current = 0
  if (days.length > 0) {
    let cursor = activity.has(today) ? today : addDays(today, -1)
    while (activity.has(cursor)) {
      current += 1
      cursor = addDays(cursor, -1)
    }
  }

  let longest = 0
  let run = 0
  let previous: string | null = null
  for (const day of days) {
    run = previous && daysBetween(previous, day) === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = day
  }

  return {
    current,
    longest,
    lastActiveDay: days.length > 0 ? days[days.length - 1] : null,
    activeDays: days.length,
  }
}

function heatLevel(count: number): HeatCell['level'] {
  if (count <= 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  return 3
}

/**
 * 4.3 heatmap: Monday-aligned weeks ending with the current week (the approved
 * 7-column `.heatmap`). Padding cells before the first day use `count: -1`.
 */
export function heatmap(entries: CloudProgressByTopic, today: string, weeks = 8): HeatCell[] {
  const activity = activityByDay(entries)
  const todayDate = dateFromDayKey(today) ?? new Date()
  const weekday = (todayDate.getDay() + 6) % 7 // Monday = 0
  const start = addDays(today, -(weeks * 7 - 1) + (6 - weekday))
  const cells: HeatCell[] = []
  for (let index = 0; index < weeks * 7; index += 1) {
    const date = addDays(start, index)
    if (date > today) {
      cells.push({ date, count: -1, level: 0 })
      continue
    }
    const count = activity.get(date) ?? 0
    cells.push({ date, count, level: heatLevel(count) })
  }
  return cells
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** 4.3 weekly strip + the numbers the metric tiles show. */
export function weeklyStats(entries: CloudProgressByTopic, today: string): WeeklyStats {
  const activity = activityByDay(entries)
  const week: WeeklyStats['week'] = []
  let solvedThisWeek = 0
  let revisedThisWeek = 0
  let activeDaysThisWeek = 0
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset)
    const dateObject = dateFromDayKey(date)
    const count = activity.get(date) ?? 0
    if (count > 0) activeDaysThisWeek += 1
    week.push({ date, label: dateObject ? WEEKDAY_LABELS[dateObject.getDay()] : '', count })
  }

  let solvedTotal = 0
  for (const shard of Object.values(entries)) {
    for (const entry of Object.values(shard)) {
      if (entry.s !== 'done') continue
      solvedTotal += 1
      const solvedDay = dayKeyOfTimestamp(entry.fd)
      if (solvedDay && daysBetween(solvedDay, today) >= 0 && daysBetween(solvedDay, today) < 7) {
        solvedThisWeek += 1
      }
      const revisedDay = dayKeyOfTimestamp(entry.lr)
      if (entry.rc > 0 && revisedDay && daysBetween(revisedDay, today) >= 0 && daysBetween(revisedDay, today) < 7) {
        revisedThisWeek += 1
      }
    }
  }

  return { week, solvedThisWeek, revisedThisWeek, solvedTotal, activeDaysThisWeek }
}

/**
 * 4.1 tally. "Moved today" is every problem solved or revised today plus every
 * planned row ticked in Today — one problem counts once, so the goal can never
 * be met by double-ticking the same row.
 */
export function todayTally(entries: CloudProgressByTopic, plan: Plan | null, today: string, goal: number): TodayTally {
  const moved = new Set<string>()
  for (const shard of Object.values(entries)) {
    for (const [problemId, entry] of Object.entries(shard)) {
      if (entry.s !== 'done') continue
      if (dayKeyOfTimestamp(entry.fd) === today) moved.add(problemId)
      if (entry.rc > 0 && dayKeyOfTimestamp(entry.lr) === today) moved.add(problemId)
    }
  }
  const planned = plan?.problemIds ?? []
  const doneIds = plan?.doneIds ?? []
  for (const problemId of doneIds) moved.add(problemId)
  const done = planned.filter((problemId) => doneIds.includes(problemId) || moved.has(problemId)).length
  const safeGoal = Math.max(DAILY_GOAL_MIN, Math.min(DAILY_GOAL_MAX, goal))
  return {
    planned: planned.length,
    done,
    movedToday: moved.size,
    goal: safeGoal,
    goalMet: moved.size >= safeGoal,
  }
}

/**
 * Deterministic "suggested picks": the touched topic with the lowest completion
 * first (the phase-1 weakest-topic rule), then untouched topics in sheet order.
 * Only unsolved, not-already-planned rows are offered.
 */
export function suggestedPicks(
  entries: CloudProgressByTopic,
  plan: Plan | null,
  limit = 5,
  /**
   * Phase v2-08: ids from the learner's target list. When a target date is
   * inside 14 days the caller passes them here, and they are offered first —
   * the otherwise-unchanged weakest-topic order fills the rest.
   */
  focusIds: readonly string[] = [],
): string[] {
  const excluded = new Set(plan?.problemIds ?? [])
  const scored = catalogue.topics.map((topic, order) => {
    const problems = topic.subtopics.flatMap((subtopic) => subtopic.problems)
    let done = 0
    let touched = 0
    for (const problem of problems) {
      const entry = entries[topic.id]?.[problem.id]
      if (!entry) continue
      touched += 1
      if (entry.s === 'done') done += 1
    }
    return {
      topicId: topic.id,
      order,
      touched: touched > 0,
      ratio: problems.length === 0 ? 1 : done / problems.length,
      remaining: problems.length - done,
    }
  })

  scored.sort((a, b) => {
    if (a.touched !== b.touched) return a.touched ? -1 : 1
    if (a.touched) {
      if (a.ratio !== b.ratio) return a.ratio - b.ratio
      if (a.remaining !== b.remaining) return b.remaining - a.remaining
    }
    // Untouched topics start from the top of the sheet, so the suggestion is
    // predictable instead of "whichever topic happens to be the biggest".
    return a.order - b.order
  })

  const picks: string[] = []
  for (const problemId of focusIds) {
    if (picks.length >= limit) return picks
    if (excluded.has(problemId) || picks.includes(problemId)) continue
    const location = locateProblem(problemId)
    if (!location) continue
    if (entries[location.topicId]?.[problemId]?.s === 'done') continue
    picks.push(problemId)
  }
  for (const topic of scored) {
    const problems = catalogue.topics[topic.order].subtopics.flatMap((subtopic) => subtopic.problems)
    for (const problem of problems) {
      if (picks.length >= limit) return picks
      if (excluded.has(problem.id) || picks.includes(problem.id)) continue
      if (entries[topic.topicId]?.[problem.id]?.s === 'done') continue
      picks.push(problem.id)
    }
  }
  return picks
}

/** 4.3 "continue where I left": the most recently worked-on solved problem. */
export function continueWhereLeft(entries: CloudProgressByTopic): { problemId: string; day: string } | null {
  let best: { problemId: string; day: string; stamp: number } | null = null
  for (const shard of Object.values(entries)) {
    for (const [problemId, entry] of Object.entries(shard)) {
      if (!entry.lr && !entry.fd) continue
      const stamp = Date.parse(entry.lr ?? entry.fd ?? '')
      if (Number.isNaN(stamp)) continue
      const day = entry.lr ? dayKeyOfTimestamp(entry.lr) : dayKeyOfTimestamp(entry.fd)
      if (!day) continue
      if (!best || stamp > best.stamp) best = { problemId, day, stamp }
    }
  }
  return best ? { problemId: best.problemId, day: best.day } : null
}

/** Read one plan document defensively; unknown ids are dropped, never guessed. */
export function sanitizePlan(date: string, raw: unknown): Plan | null {
  if (!isRecord(raw) || !PLAN_ID_PATTERN.test(date)) return null
  const readIds = (value: unknown): string[] => {
    const ids: string[] = []
    if (!Array.isArray(value)) return ids
    for (const candidate of value) {
      if (typeof candidate !== 'string' || !locateProblem(candidate)) continue
      if (ids.includes(candidate)) continue
      ids.push(candidate)
      if (ids.length >= PLAN_MAX_PROBLEMS) break
    }
    return ids
  }
  const problemIds = readIds(raw.problemIds)
  const doneIds = readIds(raw.doneIds).filter((problemId) => problemIds.includes(problemId))
  const stamp = raw.updatedAt
  let updatedAt: string | null = null
  if (typeof stamp === 'string') updatedAt = stamp.slice(0, 40)
  else {
    const record = stamp as { toDate?: () => Date; seconds?: number } | undefined
    if (record && typeof record.toDate === 'function') {
      const parsed = record.toDate()
      if (!Number.isNaN(parsed.getTime())) updatedAt = parsed.toISOString()
    } else if (record && typeof record.seconds === 'number') {
      updatedAt = new Date(record.seconds * 1000).toISOString()
    }
  }
  return { date, problemIds, doneIds, updatedAt }
}

export function sanitizePlans(raw: unknown): Record<string, Plan> {
  if (!isRecord(raw)) return {}
  const plans: Record<string, Plan> = {}
  for (const [date, value] of Object.entries(raw)) {
    const plan = sanitizePlan(date, value)
    if (plan) plans[date] = plan
  }
  return plans
}

/** Add/remove problems in a plan, keeping `doneIds` a subset of `problemIds`. */
export function withProblem(plan: Plan, problemId: string): Plan | null {
  if (!locateProblem(problemId)) return null
  if (plan.problemIds.includes(problemId)) return plan
  if (plan.problemIds.length >= PLAN_MAX_PROBLEMS) return null
  return { ...plan, problemIds: [...plan.problemIds, problemId] }
}

/** Add a batch of problems atomically so "Suggest 5" emits one write, not five. */
export function withProblems(plan: Plan, problemIds: readonly string[]): Plan | null {
  let current: Plan = plan
  for (const problemId of problemIds) {
    const next = withProblem(current, problemId)
    if (!next) return null
    current = next
  }
  return current
}

export function withoutProblem(plan: Plan, problemId: string): Plan {
  if (!plan.problemIds.includes(problemId)) return plan
  return {
    ...plan,
    problemIds: plan.problemIds.filter((id) => id !== problemId),
    doneIds: plan.doneIds.filter((id) => id !== problemId),
  }
}

export function withDone(plan: Plan, problemId: string): Plan {
  if (!plan.problemIds.includes(problemId) || plan.doneIds.includes(problemId)) return plan
  return { ...plan, doneIds: [...plan.doneIds, problemId] }
}

export function emptyPlan(date: string): Plan {
  return { date, problemIds: [], doneIds: [], updatedAt: null }
}

export function plansForBackup(plans: Record<string, Plan>): BackupPlan[] {
  return Object.values(plans)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((plan) => ({
      date: plan.date,
      problemIds: [...plan.problemIds],
      doneIds: [...plan.doneIds],
      updatedAt: plan.updatedAt,
    }))
}

export function clampGoal(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DAILY_GOAL
  return Math.max(DAILY_GOAL_MIN, Math.min(DAILY_GOAL_MAX, Math.trunc(value)))
}

/** Short human label for a due day, e.g. "Today", "Yesterday", "6 Nov". */
export function dueLabel(dueDay: string, today: string): string {
  const delta = daysBetween(dueDay, today)
  if (delta === 0) return 'Due today'
  if (delta === 1) return 'Due yesterday'
  if (delta > 1) return `Overdue ${delta} days`
  const date = dateFromDayKey(dueDay)
  if (!date) return dueDay
  return `Due ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
}

export function stageLabel(stage: number): string {
  if (stage >= MAX_REVISIONS) return 'Graduated'
  return `Revision ${stage + 1} of ${MAX_REVISIONS} · after ${REVISION_INTERVALS[stage]} days`
}
