import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RATE,
  PLAYBACK_RATES,
  clampRate,
  forgetTopic,
  memorisedTopics,
  rateForTopic,
  rateLabel,
  readSpeeds,
  rememberRate,
  sanitizeSpeeds,
  SPEED_TOPIC_LIMIT,
  writeSpeeds,
} from './speedMemory'

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    dump: () => Object.fromEntries(store),
  }
}

describe('playback speed remembered per topic', () => {
  it('only accepts the seven documented rates', () => {
    expect(PLAYBACK_RATES).toEqual([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2])
    expect(clampRate(2)).toBe(2)
    expect(clampRate('1.5')).toBe(1.5)
    expect(clampRate(3)).toBe(DEFAULT_RATE)
    expect(clampRate(undefined)).toBe(DEFAULT_RATE)
    expect(clampRate(Number.NaN)).toBe(DEFAULT_RATE)
  })

  it('labels every rate', () => {
    expect(rateLabel(1)).toBe('1×')
    expect(rateLabel(1.25)).toBe('1.25×')
  })

  it('remembers per topic and answers 1× for a topic it has never seen', () => {
    let speeds = rememberRate({}, 'graphs', 1.5)
    speeds = rememberRate(speeds, 'arrays', 0.75)
    expect(rateForTopic(speeds, 'graphs')).toBe(1.5)
    expect(rateForTopic(speeds, 'arrays')).toBe(0.75)
    expect(rateForTopic(speeds, 'dp')).toBe(DEFAULT_RATE)
    // Choosing 1× means "forget my speed here", so nothing stale is stored.
    speeds = rememberRate(speeds, 'graphs', 1)
    expect(rateForTopic(speeds, 'graphs')).toBe(DEFAULT_RATE)
    expect(Object.keys(speeds)).toEqual(['arrays'])
    expect(forgetTopic(speeds, 'arrays')).toEqual({})
    expect(memorisedTopics(speeds)).toEqual([{ topicId: 'arrays', rate: 0.75 }])
  })

  it('round-trips through storage and survives a corrupted value', () => {
    const storage = fakeStorage()
    writeSpeeds({ graphs: 1.5 }, storage)
    expect(readSpeeds(storage)).toEqual({ graphs: 1.5 })
    const broken = fakeStorage({ 'dsa-archive.speed.v1': '{not json' })
    expect(readSpeeds(broken)).toEqual({})
    expect(readSpeeds(undefined)).toEqual({})
  })

  it('sanitizes what it reads even when storage was hand-edited', () => {
    // Only the seven documented rates survive; anything else is dropped rather
    // than silently coerced to 1×, so a hand-edited store cannot fake a preference.
    expect(sanitizeSpeeds({ graphs: 1.5, bad: 3, 'UPPER CASE': 2, arrays: '1.25' })).toEqual({ graphs: 1.5 })
    expect(sanitizeSpeeds([])).toEqual({})
    expect(sanitizeSpeeds(null)).toEqual({})
    const many: Record<string, number> = {}
    for (let index = 0; index < SPEED_TOPIC_LIMIT + 5; index += 1) many[`topic-${index}`] = 1.5
    expect(Object.keys(sanitizeSpeeds(many))).toHaveLength(SPEED_TOPIC_LIMIT)
  })
})
