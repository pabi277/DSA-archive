import { describe, expect, it } from 'vitest'
import {
  embedFailureMessage,
  embedUrl,
  formatClock,
  isDeadLinkError,
  isWatched,
  mergeWatchFlag,
  parseStart,
  parseVideoId,
  playerState,
  sanitizeWatchFlags,
  watchUrl,
  watchedPercent,
  WATCH_FLAG_LIMIT,
} from './video'

describe('video links (single-source, never rewritten)', () => {
  it('reads ids from every documented YouTube URL shape', () => {
    expect(parseVideoId('https://youtu.be/qbwJ1U6I-IU')).toBe('qbwJ1U6I-IU')
    expect(parseVideoId('https://www.youtube.com/watch?v=qbwJ1U6I-IU')).toBe('qbwJ1U6I-IU')
    expect(parseVideoId('https://www.youtube.com/watch?v=qbwJ1U6I-IU&t=42s')).toBe('qbwJ1U6I-IU')
    expect(parseVideoId('https://www.youtube.com/embed/qbwJ1U6I-IU')).toBe('qbwJ1U6I-IU')
    expect(parseVideoId('https://youtu.be/qbwJ1U6I-IU?t=754')).toBe('qbwJ1U6I-IU')
    expect(parseVideoId('https://www.youtube-nocookie.com/embed/qbwJ1U6I-IU')).toBe('qbwJ1U6I-IU')
  })

  it('rejects non-video links instead of guessing', () => {
    expect(parseVideoId(undefined)).toBeNull()
    expect(parseVideoId('')).toBeNull()
    expect(parseVideoId('not a url')).toBeNull()
    expect(parseVideoId('https://vimeo.com/12345')).toBeNull()
    expect(parseVideoId('https://youtu.be/short')).toBeNull()
    expect(parseVideoId('https://www.youtube.com/watch?v=')).toBeNull()
    expect(parseVideoId('https://www.youtube.com/playlist?list=PL123')).toBeNull()
  })

  it('builds the official embed URL with our documented parameters', () => {
    const url = new URL(embedUrl('qbwJ1U6I-IU', { origin: 'https://dsa.example', start: 754 }))
    expect(url.origin + url.pathname).toBe('https://www.youtube-nocookie.com/embed/qbwJ1U6I-IU')
    expect(url.searchParams.get('enablejsapi')).toBe('1')
    expect(url.searchParams.get('origin')).toBe('https://dsa.example')
    expect(url.searchParams.get('rel')).toBe('0')
    expect(url.searchParams.get('iv_load_policy')).toBe('3')
    expect(url.searchParams.get('playsinline')).toBe('1')
    expect(url.searchParams.get('cc_load_policy')).toBe('1')
    expect(url.searchParams.get('host')).toBe('https://www.youtube-nocookie.com')
    expect(url.searchParams.get('start')).toBe('754')
    // No start parameter at 0 (the default), so a plain visit reads cleanly.
    expect(new URL(embedUrl('qbwJ1U6I-IU')).searchParams.has('start')).toBe(false)
  })

  it('deep links accept digits only and never exceed 24 hours', () => {
    expect(parseStart('754')).toBe(754)
    expect(parseStart('754s')).toBe(754)
    expect(parseStart(undefined)).toBe(0)
    expect(parseStart('')).toBe(0)
    expect(parseStart('-5')).toBe(0)
    expect(parseStart('12:34')).toBe(0)
    expect(parseStart('86400')).toBe(86_400)
    // Five digits is the shape; a larger number clamps to the 24 h ceiling.
    expect(parseStart('99999')).toBe(86_400)
    expect(parseStart('999999')).toBe(0)
  })

  it('formats clock values without negative or fractional seconds', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(-9)).toBe('0:00')
    expect(formatClock(9.9)).toBe('0:09')
    expect(formatClock(754)).toBe('12:34')
    expect(formatClock(3723)).toBe('1:02:03')
    expect(formatClock(Number.NaN)).toBe('0:00')
  })

  it('always offers the watch URL as the fallback path', () => {
    expect(watchUrl('qbwJ1U6I-IU')).toBe('https://www.youtube.com/watch?v=qbwJ1U6I-IU')
  })
})

describe('player states and documented error codes', () => {
  it('maps IFrame API state numbers', () => {
    expect(playerState(-1)).toBe('unstarted')
    expect(playerState(0)).toBe('ended')
    expect(playerState(1)).toBe('playing')
    expect(playerState(2)).toBe('paused')
    expect(playerState(3)).toBe('buffering')
    expect(playerState(5)).toBe('cued')
    expect(playerState(99)).toBe('unknown')
    expect(playerState(null)).toBe('unknown')
  })

  it('treats 2/5/100/101/150 as a dead link with a plain sentence', () => {
    for (const code of [2, 5, 100, 101, 150]) {
      expect(isDeadLinkError(code)).toBe(true)
      expect(embedFailureMessage(code)).toMatch(/video|embed/i)
    }
    expect(isDeadLinkError(42)).toBe(false)
    expect(isDeadLinkError(null)).toBe(false)
    expect(embedFailureMessage(101)).toContain('does not allow this video to be embedded')
  })
})

describe('watched flags (local only, honest)', () => {
  it('counts 60% of the runtime as watched', () => {
    expect(isWatched(599, 1000)).toBe(false)
    expect(isWatched(600, 1000)).toBe(true)
    expect(isWatched(0, 0)).toBe(false)
    expect(watchedPercent(250, 1000)).toBe(25)
    expect(watchedPercent(5000, 1000)).toBe(100)
    expect(watchedPercent(Number.NaN, 100)).toBe(0)
  })

  it('keeps the highest percentage across rewatches and caps the store', () => {
    let flags = mergeWatchFlag({}, 'qbwJ1U6I-IU', 61, new Date('2026-11-04T10:00:00Z'))
    expect(flags['qbwJ1U6I-IU'].percent).toBe(61)
    flags = mergeWatchFlag(flags, 'qbwJ1U6I-IU', 12, new Date('2026-11-05T10:00:00Z'))
    expect(flags['qbwJ1U6I-IU'].percent).toBe(61)
    expect(mergeWatchFlag(flags, 'not-an-id', 90)).toEqual(flags)

    let many = {}
    for (let index = 0; index < WATCH_FLAG_LIMIT + 5; index += 1) {
      const id = `video-${String(index).padStart(5, '0')}`.slice(0, 11)
      many = mergeWatchFlag(many, id, 70, new Date(2026, 0, 1 + index))
    }
    expect(Object.keys(many)).toHaveLength(WATCH_FLAG_LIMIT)
  })

  it('sanitizes a corrupted flag store instead of throwing', () => {
    expect(sanitizeWatchFlags(null)).toEqual({})
    expect(sanitizeWatchFlags([])).toEqual({})
    expect(sanitizeWatchFlags({ 'qbwJ1U6I-IU': { percent: 140, at: 'x'.repeat(60) } })).toEqual({
      'qbwJ1U6I-IU': { percent: 100, at: 'x'.repeat(40) },
    })
    expect(sanitizeWatchFlags({ bad: { percent: 10 } })).toEqual({})
  })
})
