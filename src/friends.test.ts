import { describe, expect, it } from 'vitest'
import { catalogue } from './catalogue'
import type { CloudProgressEntry } from './cloudProgress'
import { makeFriendSummary } from './friends'

const done: CloudProgressEntry = {
  s: 'done', b: true, a: 4,
  fd: new Date(2026, 10, 20, 12).toISOString(), lr: null, rc: 0,
}

describe('friend summary derivation', () => {
  it('contains aggregate fields only and ignores unknown or misplaced rows', () => {
    const first = catalogue.topics[0]
    const second = catalogue.topics[1]
    const id = first.subtopics[0].problems[0].id
    const otherId = second.subtopics[0].problems[0].id
    const summary = makeFriendSummary('Ada', {
      [first.id]: { [id]: done, [otherId]: done, unknown: done },
      [second.id]: { [otherId]: { ...done, s: 'todo' } },
      unknown: { [id]: done },
    }, '2026-11-20')
    expect(summary.solvedCount).toBe(1)
    expect(summary.solvedByTopic[first.id]).toBe(1)
    expect(summary.solvedByTopic[second.id]).toBe(0)
    expect(summary.weeklySolved).toBe(1)
    expect(summary.currentStreak).toBe(1)
    expect(summary.lastActiveDate).toBe('2026-11-20')
    expect(Object.keys(summary).sort()).toEqual([
      'asOf', 'currentStreak', 'displayName', 'lastActiveDate', 'solvedByTopic', 'solvedCount', 'weeklySolved',
    ])
    expect(JSON.stringify(summary)).not.toContain(id)
    expect(JSON.stringify(summary)).not.toContain('bookmark')
  })

  it('provides zero counts for an empty account', () => {
    const summary = makeFriendSummary('Ada', {}, '2026-11-20')
    expect(summary.solvedCount).toBe(0)
    expect(summary.weeklySolved).toBe(0)
    expect(summary.currentStreak).toBe(0)
    expect(summary.lastActiveDate).toBeNull()
    expect(Object.keys(summary.solvedByTopic)).toHaveLength(catalogue.topics.length)
  })
})

import { groupWeeklyProgress, parseFriendSummary, rankFriends } from './friends'

describe('untrusted friend summaries', () => {
  const summary = makeFriendSummary('Ada', {}, '2026-11-20')

  it('accepts the exact aggregate shape and copies topic counts', () => {
    const parsed = parseFriendSummary(summary)
    expect(parsed).toEqual(summary)
    expect(parsed?.solvedByTopic).not.toBe(summary.solvedByTopic)
  })

  it('rejects extra private fields, malformed dates and impossible counts', () => {
    expect(parseFriendSummary({ ...summary, notes: 'private' })).toBeNull()
    expect(parseFriendSummary({ ...summary, asOf: '2026-02-30' })).toBeNull()
    expect(parseFriendSummary({ ...summary, lastActiveDate: '2026-11-21' })).toBeNull()
    expect(parseFriendSummary({ ...summary, weeklySolved: 1 })).toBeNull()
    expect(parseFriendSummary({ ...summary, solvedByTopic: { ...summary.solvedByTopic, other: 0 } })).toBeNull()
    expect(parseFriendSummary({ ...summary, solvedCount: 1 })).toBeNull()
    expect(parseFriendSummary(null)).toBeNull()
  })
})

describe('friend-only weekly comparison', () => {
  const base = makeFriendSummary('Ada', {}, '2026-11-20')
  it('sorts by weekly count and deterministic name, excludes stale summaries', () => {
    const friends = [
      { uid: 'z', summary: { ...base, displayName: 'Zoe', weeklySolved: 3 } },
      { uid: 'a', summary: { ...base, displayName: 'Ada', weeklySolved: 3 } },
      { uid: 'b', summary: { ...base, displayName: 'Bob', weeklySolved: 9, asOf: '2026-11-19' } },
    ]
    expect(rankFriends(friends, '2026-11-20').map((friend) => friend.uid)).toEqual(['a', 'z'])
    expect(groupWeeklyProgress(friends, '2026-11-20', 10)).toEqual({ total: 6, goal: 10, included: 2, stale: 1 })
    expect(friends.map((friend) => friend.uid)).toEqual(['z', 'a', 'b'])
  })
})
