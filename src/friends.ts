/** Phase 5 summary model. Pure derivation only: no data is shared by this module. */
import { catalogue } from './catalogue'
import type { CloudProgressByTopic } from './cloudProgress'
import { dateFromDayKey, streakInfo, weeklyStats } from './planner'

/** Only aggregate fields may cross the friendship boundary. */
export type FriendSummary = {
  displayName: string
  solvedCount: number
  solvedByTopic: Record<string, number>
  currentStreak: number
  lastActiveDate: string | null
  weeklySolved: number
  /** Local day on which weeklySolved was computed; it is a rolling seven-day count. */
  asOf: string
}

export function makeFriendSummary(displayName: string, entries: CloudProgressByTopic, today: string): FriendSummary {
  // Use only catalogue rows in their correct shard, not arbitrary cached keys.
  const known: CloudProgressByTopic = {}
  const solvedByTopic: Record<string, number> = {}
  for (const topic of catalogue.topics) {
    const shard: CloudProgressByTopic[string] = {}
    let count = 0
    for (const problem of topic.subtopics.flatMap((subtopic) => subtopic.problems)) {
      const entry = entries[topic.id]?.[problem.id]
      if (!entry) continue
      shard[problem.id] = entry
      if (entry.s === 'done') count += 1
    }
    known[topic.id] = shard
    solvedByTopic[topic.id] = count
  }
  const streak = streakInfo(known, today)
  const weekly = weeklyStats(known, today)
  return {
    displayName,
    solvedCount: weekly.solvedTotal,
    solvedByTopic,
    currentStreak: streak.current,
    lastActiveDate: streak.lastActiveDay,
    weeklySolved: weekly.solvedThisWeek,
    asOf: today,
  }
}

/** A summary received from Firestore is untrusted input, even from a friend. */
export function parseFriendSummary(raw: unknown): FriendSummary | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const data = raw as Record<string, unknown>
  const keys = ['displayName', 'solvedCount', 'solvedByTopic', 'currentStreak', 'lastActiveDate', 'weeklySolved', 'asOf']
  if (Object.keys(data).length !== keys.length || !keys.every((key) => key in data)) return null
  if (typeof data.displayName !== 'string' || data.displayName.length < 1 || data.displayName.length > 80) return null
  if (!isDay(data.asOf) || (data.lastActiveDate !== null && !isDay(data.lastActiveDate))) return null
  if (data.lastActiveDate !== null && data.lastActiveDate > data.asOf) return null
  const catalogueSize = catalogue.topics.reduce((sum, topic) =>
    sum + topic.subtopics.reduce((subtotal, subtopic) => subtotal + subtopic.problems.length, 0), 0)
  if (!isCount(data.solvedCount, catalogueSize) || !isCount(data.weeklySolved, data.solvedCount) || !isCount(data.currentStreak, 100000)) return null
  if (typeof data.solvedByTopic !== 'object' || data.solvedByTopic === null || Array.isArray(data.solvedByTopic)) return null
  const topicCounts = data.solvedByTopic as Record<string, unknown>
  if (Object.keys(topicCounts).length !== catalogue.topics.length) return null
  const solvedByTopic: Record<string, number> = {}
  for (const topic of catalogue.topics) {
    const max = topic.subtopics.reduce((sum, subtopic) => sum + subtopic.problems.length, 0)
    const count = topicCounts[topic.id]
    if (!isCount(count, max)) return null
    solvedByTopic[topic.id] = count
  }
  if (Object.values(solvedByTopic).reduce((a, b) => a + b, 0) !== data.solvedCount) return null
  return {
    displayName: data.displayName,
    solvedCount: data.solvedCount,
    solvedByTopic,
    currentStreak: data.currentStreak,
    lastActiveDate: data.lastActiveDate,
    weeklySolved: data.weeklySolved,
    asOf: data.asOf,
  }
}

function isCount(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max
}

function isDay(value: unknown): value is string {
  return typeof value === 'string' && dateFromDayKey(value) !== null
}

export type RankedFriend = { uid: string; summary: FriendSummary }

/**
 * Rank only summaries computed for this local day. A rolling-week count from
 * yesterday cannot safely be compared with today's; omit rather than guess.
 * This accepts a caller-selected friend set, never queries a public directory.
 */
export function rankFriends(friends: RankedFriend[], today: string): RankedFriend[] {
  return friends
    .filter(({ summary }) => summary.asOf === today)
    .slice()
    .sort((a, b) => b.summary.weeklySolved - a.summary.weeklySolved ||
      a.summary.displayName.localeCompare(b.summary.displayName) || a.uid.localeCompare(b.uid))
}

/** Group total is partial whenever a friend has not published today's summary. */
export function groupWeeklyProgress(friends: RankedFriend[], today: string, goal: number) {
  const current = rankFriends(friends, today)
  const total = current.reduce((sum, friend) => sum + friend.summary.weeklySolved, 0)
  return {
    total,
    goal: Number.isFinite(goal) ? Math.max(1, Math.trunc(goal)) : 1,
    included: current.length,
    stale: friends.length - current.length,
  }
}
