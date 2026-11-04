import { describe, expect, it } from 'vitest'
import { nextLine, nextUp, planMinutes, readAutoAdvance, writeAutoAdvance } from './autoAdvance'

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    dump: () => Object.fromEntries(store),
  }
}

describe('auto-advance is opt-in and off by default', () => {
  it('reads off unless the learner turned it on', () => {
    expect(readAutoAdvance(fakeStorage())).toBe(false)
    expect(readAutoAdvance(undefined)).toBe(false)
    expect(readAutoAdvance(fakeStorage({ 'dsa-archive.theatre.autoadvance.v1': 'off' }))).toBe(false)
    expect(readAutoAdvance(fakeStorage({ 'dsa-archive.theatre.autoadvance.v1': 'on' }))).toBe(true)
  })

  it('writes on/off and leaves no stale "off" key behind', () => {
    const storage = fakeStorage()
    writeAutoAdvance(true, storage)
    expect(storage.dump()).toEqual({ 'dsa-archive.theatre.autoadvance.v1': 'on' })
    writeAutoAdvance(false, storage)
    expect(storage.dump()).toEqual({})
  })
})

describe('the end-of-video offer', () => {
  // Real ids from `data/problems.json` → graphs → graphs-theory-and-traversals.
  const topicRows = ['introduction-to-graph', 'traversal-techniques', 'connected-components']

  it('prefers today’s plan, skipping the current problem and solved rows', () => {
    const target = nextUp({
      currentId: 'introduction-to-graph',
      planProblemIds: ['introduction-to-graph', 'connected-components'],
      topicRows,
      isDone: () => false,
      minutesFor: () => 12,
    })
    expect(target).not.toBeNull()
    expect(target?.problemId).toBe('connected-components')
    expect(target?.reason).toBe('in today’s plan')
    expect(target?.minutes).toBe(12)
    expect(nextLine(target!)).toBe(`Next: ${target!.title} · 12 min`)
  })

  it('falls back to the next unsolved problem in the topic', () => {
    const target = nextUp({
      currentId: 'introduction-to-graph',
      planProblemIds: [],
      topicRows,
      isDone: (problemId) => problemId === 'traversal-techniques',
    })
    expect(target?.problemId).toBe('connected-components')
    expect(target?.reason).toBe('next in this topic')
    expect(target?.minutes).toBeNull()
    expect(nextLine(target!)).toBe(`Next: ${target!.title}`)
  })

  it('wraps around the topic and returns null when there is nothing to offer', () => {
    const wrapped = nextUp({ currentId: 'connected-components', planProblemIds: [], topicRows, isDone: () => false })
    expect(wrapped?.problemId).toBe('introduction-to-graph')
    const allDone = nextUp({
      currentId: 'introduction-to-graph',
      planProblemIds: [],
      topicRows,
      isDone: () => true,
    })
    expect(allDone).toBeNull()
  })

  it('ignores plan rows that are no longer in the catalogue', () => {
    const target = nextUp({
      currentId: 'introduction-to-graph',
      planProblemIds: ['a-problem-that-was-removed'],
      topicRows,
      isDone: () => false,
    })
    expect(target?.problemId).toBe('traversal-techniques')
    expect(target?.reason).toBe('next in this topic')
  })

  it('reads a positive plan estimate only', () => {
    expect(planMinutes({ problemIds: [], minutes: { 'connected-components': 12 } }, 'connected-components')).toBe(12)
    expect(planMinutes({ problemIds: [], minutes: { 'connected-components': 0 } }, 'connected-components')).toBeNull()
    expect(planMinutes({ problemIds: [] }, 'connected-components')).toBeNull()
    expect(planMinutes(null, 'connected-components')).toBeNull()
  })
})
