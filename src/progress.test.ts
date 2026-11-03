import { beforeEach, describe, expect, it } from 'vitest'
import { catalogue } from './catalogue'
import {
  clearProgress,
  countProgressRows,
  getGuestTimestamps,
  getProgressSnapshot,
  isBookmarked,
  isDone,
  markBookmarked,
  markDone,
  resetProgressStoreForTests,
  subscribeProgress,
  tallyCatalogue,
  tallyTopic,
} from './progress'

const STORAGE_KEY = 'dsa-archive.progress.v1'
const arrays = catalogue.topics.find((topic) => topic.id === 'arrays')!

beforeEach(() => {
  localStorage.clear()
  resetProgressStoreForTests()
})

describe('local guest progress', () => {
  it('starts empty and marks a row done, then back to todo', () => {
    expect(getProgressSnapshot()).toEqual({})
    expect(tallyCatalogue(getProgressSnapshot()).done).toBe(0)

    markDone('arrays', 'two-sum')
    expect(isDone(getProgressSnapshot(), 'arrays', 'two-sum')).toBe(true)
    expect(tallyCatalogue(getProgressSnapshot())).toMatchObject({ done: 1, total: 495, percent: 0 })

    markDone('arrays', 'two-sum')
    expect(isDone(getProgressSnapshot(), 'arrays', 'two-sum')).toBe(false)
    expect(tallyCatalogue(getProgressSnapshot()).done).toBe(0)
  })

  it('keeps a bookmark on its own, without a done status', () => {
    markBookmarked('arrays', 'two-sum')
    expect(isBookmarked(getProgressSnapshot(), 'arrays', 'two-sum')).toBe(true)
    expect(isDone(getProgressSnapshot(), 'arrays', 'two-sum')).toBe(false)
    expect(tallyCatalogue(getProgressSnapshot())).toMatchObject({ done: 0, bookmarked: 1 })
  })

  it('drops empty shards so stored JSON stays small', () => {
    markDone('arrays', 'two-sum')
    markDone('arrays', 'two-sum')
    expect(getProgressSnapshot()).toEqual({})
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('persists to localStorage in the DATA-MODEL §3 shard shape', () => {
    markDone('arrays', 'two-sum')
    markBookmarked('arrays', 'two-sum')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      arrays: { 'two-sum': { s: 'done', b: true, o: 'clean' } },
    })
    // A fresh store instance reads the same rows back.
    resetProgressStoreForTests()
    expect(isDone(getProgressSnapshot(), 'arrays', 'two-sum')).toBe(true)
    expect(isBookmarked(getProgressSnapshot(), 'arrays', 'two-sum')).toBe(true)
  })

  it('notifies subscribers on every change', () => {
    let calls = 0
    const unsubscribe = subscribeProgress(() => {
      calls += 1
    })
    markDone('arrays', 'two-sum')
    markBookmarked('arrays', 'two-sum')
    expect(calls).toBe(2)
    unsubscribe()
    markDone('arrays', 'two-sum')
    expect(calls).toBe(2)
  })

  it('ignores corrupt or hostile stored values instead of throwing', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    resetProgressStoreForTests()
    expect(getProgressSnapshot()).toEqual({})

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ arrays: { 'two-sum': { s: 'hacked', b: 'yes' } }, junk: 5 }))
    resetProgressStoreForTests()
    // s is coerced to a known status, b to a boolean, and a no-op entry is dropped.
    expect(getProgressSnapshot()).toEqual({})

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ arrays: { 'two-sum': { s: 'done', b: 'yes' } } }))
    resetProgressStoreForTests()
    expect(getProgressSnapshot()).toEqual({ arrays: { 'two-sum': { s: 'done', b: false, o: 'clean' } } })
  })

  it('clears everything on request', () => {
    markDone('arrays', 'two-sum')
    clearProgress()
    expect(getProgressSnapshot()).toEqual({})
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('keeps per-topic guest timestamps for the visible phase-2 merge', () => {
    markDone('arrays', 'two-sum')
    const times = getGuestTimestamps()
    expect(Number.isFinite(times.arrays)).toBe(true)
    expect(countProgressRows(getProgressSnapshot())).toBe(1)

    // A phase-1 install has rows but no timestamp key: backfill once.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ arrays: { 'two-sum': { s: 'done', b: false, o: 'clean' } } }))
    localStorage.removeItem('dsa-archive.progress.updatedAt.v1')
    resetProgressStoreForTests()
    expect(Number.isFinite(getGuestTimestamps().arrays)).toBe(true)

    clearProgress()
    expect(getGuestTimestamps()).toEqual({})
  })
})

describe('topic tallies', () => {
  it('counts done, bookmarked and total rows for one topic', () => {
    const total = arrays.subtopics.reduce((sum, subtopic) => sum + subtopic.problems.length, 0)
    expect(tallyTopic({}, arrays)).toEqual({ done: 0, bookmarked: 0, total, percent: 0 })

    markDone('arrays', 'two-sum')
    markBookmarked('arrays', 'two-sum')
    const tally = tallyTopic(getProgressSnapshot(), arrays)
    expect(tally).toMatchObject({ done: 1, bookmarked: 1, total })
    expect(tally.percent).toBe(Math.round((1 / total) * 100))
  })

  it('sums to the whole catalogue', () => {
    markDone('arrays', 'two-sum')
    const overall = tallyCatalogue(getProgressSnapshot())
    expect(overall.total).toBe(495)
    expect(overall.done).toBe(1)
    expect(overall.percent).toBe(0)
  })
})
