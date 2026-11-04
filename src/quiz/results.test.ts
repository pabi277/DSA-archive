import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearGuestQuizResults,
  countGuestQuizTopics,
  loadGuestQuizResults,
  MAX_QUIZ_ATTEMPTS,
  mergeQuizResult,
  mergeQuizResults,
  QUIZ_STORAGE_KEY,
  quizResultsForBackup,
  quizResultsFromBackup,
  recordQuizAttempt,
  sanitizeQuizResult,
  saveGuestQuizResults,
} from './results'

describe('quiz results persistence, guest storage and merge', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists guest attempts under dsa-archive.quiz.v1, keeps bestScore and increments attempts', () => {
    let state = loadGuestQuizResults()
    expect(state).toEqual({})

    state = recordQuizAttempt(state, 'arrays', 8, 12, '2026-11-04T10:00:00.000Z')
    expect(state.arrays).toEqual({
      bestScore: 8,
      bestTotal: 12,
      attempts: 1,
      lastScore: 8,
      lastAt: '2026-11-04T10:00:00.000Z',
      passed: false,
    })

    state = recordQuizAttempt(state, 'arrays', 11, 12, '2026-11-04T10:05:00.000Z')
    expect(state.arrays).toEqual({
      bestScore: 11,
      bestTotal: 12,
      attempts: 2,
      lastScore: 11,
      lastAt: '2026-11-04T10:05:00.000Z',
      passed: true,
    })

    // A lower retake keeps bestScore=11 and passed=true while updating lastScore and attempts.
    state = recordQuizAttempt(state, 'arrays', 7, 12, '2026-11-04T10:10:00.000Z')
    expect(state.arrays).toEqual({
      bestScore: 11,
      bestTotal: 12,
      attempts: 3,
      lastScore: 7,
      lastAt: '2026-11-04T10:10:00.000Z',
      passed: true,
    })

    saveGuestQuizResults(state)
    expect(window.localStorage.getItem(QUIZ_STORAGE_KEY)).toBeTruthy()
    expect(loadGuestQuizResults()).toEqual(state)
    expect(countGuestQuizTopics(state)).toBe(1)

    clearGuestQuizResults()
    expect(loadGuestQuizResults()).toEqual({})
  })

  it('rejects out-of-range scores, unknown topics, and clamps attempts at 999', () => {
    expect(sanitizeQuizResult('unknown-topic', {
      bestScore: 10, bestTotal: 12, attempts: 1, lastScore: 10, lastAt: '2026-11-04T00:00:00Z', passed: true,
    })).toBeNull()
    expect(sanitizeQuizResult('arrays', {
      bestScore: 13, bestTotal: 12, attempts: 1, lastScore: 10, lastAt: '2026-11-04T00:00:00Z', passed: true,
    })).toBeNull()
    expect(sanitizeQuizResult('arrays', {
      bestScore: 10, bestTotal: 12, attempts: 1000, lastScore: 10, lastAt: '2026-11-04T00:00:00Z', passed: true,
    })).toBeNull()

    const maxed = recordQuizAttempt(
      {
        arrays: {
          bestScore: 10,
          bestTotal: 12,
          attempts: MAX_QUIZ_ATTEMPTS,
          lastScore: 10,
          lastAt: '2026-11-04T00:00:00.000Z',
          passed: true,
        },
      },
      'arrays',
      12,
      12,
    )
    expect(maxed.arrays.attempts).toBe(MAX_QUIZ_ATTEMPTS)
    expect(maxed.arrays.bestScore).toBe(12)
  })

  it('merges guest and cloud results with max-score-wins and round-trips through backup helpers', () => {
    const local = {
      bestScore: 11,
      bestTotal: 12,
      attempts: 2,
      lastScore: 11,
      lastAt: '2026-11-04T12:00:00.000Z',
      passed: true,
    }
    const remote = {
      bestScore: 9,
      bestTotal: 12,
      attempts: 3,
      lastScore: 9,
      lastAt: '2026-11-04T09:00:00.000Z',
      passed: false,
    }
    expect(mergeQuizResult(local, remote)).toEqual({
      bestScore: 11,
      bestTotal: 12,
      attempts: 5,
      lastScore: 11,
      lastAt: '2026-11-04T12:00:00.000Z',
      passed: true,
    })

    const mergedMap = mergeQuizResults({ arrays: remote }, { arrays: local, hashing: remote })
    const serialized = quizResultsForBackup(mergedMap)
    expect(serialized.map((entry) => entry.topicId)).toEqual(['arrays', 'hashing'])
    expect(quizResultsFromBackup(serialized)).toEqual(mergedMap)
  })
})
