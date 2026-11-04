import { describe, expect, it } from 'vitest'
import { getQuiz } from '../content/load'
import type { QuizItem, QuizKind } from '../content/types'
import {
  advanceQuiz,
  canGoBack,
  createQuizSession,
  goBack,
  isQuizPassed,
  pickWeakestQuizTopic,
  quizPassMark,
  quizVerdict,
  selectOption,
  shuffleQuizItems,
  submitCurrent,
  summarizeQuizSession,
} from './engine'

function makeItem(index: number, kind: QuizKind = 'pattern', answerIndex: 0 | 1 | 2 | 3 = 0): QuizItem {
  return {
    id: `q-${index}`,
    kind,
    prompt: `Question ${index}?`,
    codeSnippet: null,
    options: [
      { text: 'Option A', explain: 'Explain A' },
      { text: 'Option B', explain: 'Explain B' },
      { text: 'Option C', explain: 'Explain C' },
      { text: 'Option D', explain: 'Explain D' },
    ],
    answerIndex,
  }
}

describe('quiz engine scoring, seeding and state machine', () => {
  it('enforces the >=80% pass mark (9/12 fails, 10/12 passes) and scales to incomplete banks', () => {
    expect(quizPassMark(12)).toBe(10)
    expect(isQuizPassed(9, 12)).toBe(false)
    expect(isQuizPassed(10, 12)).toBe(true)
    expect(quizVerdict(10, 12)).toBe('passed')
    expect(quizVerdict(9, 12)).toBe('almost')
    expect(quizVerdict(6, 12)).toBe('try-again')

    // Incomplete bank: 5 items -> ceil(4.0) = 4; 7 items -> ceil(5.6) = 6.
    expect(quizPassMark(5)).toBe(4)
    expect(isQuizPassed(3, 5)).toBe(false)
    expect(isQuizPassed(4, 5)).toBe(true)
    expect(quizPassMark(7)).toBe(6)
    expect(isQuizPassed(5, 7)).toBe(false)
    expect(isQuizPassed(6, 7)).toBe(true)
  })

  it('keeps authored order at seed 0 and deterministically shuffles on positive seeds', () => {
    const bank = getQuiz('arrays')
    expect(bank).toHaveLength(12)
    expect(shuffleQuizItems(bank, 0).map((item) => item.id)).toEqual(bank.map((item) => item.id))

    const retakeOneA = shuffleQuizItems(bank, 1).map((item) => item.id)
    const retakeOneB = shuffleQuizItems(bank, 1).map((item) => item.id)
    const retakeTwo = shuffleQuizItems(bank, 2).map((item) => item.id)

    expect(retakeOneA).toEqual(retakeOneB)
    expect(retakeOneA).not.toEqual(bank.map((item) => item.id))
    expect(retakeTwo).not.toEqual(retakeOneA)
    expect([...retakeOneA].sort()).toEqual(bank.map((item) => item.id).sort())
  })

  it('prevents changing an answer or going back after submit, while allowing Back before submit', () => {
    const items = [makeItem(1, 'pattern', 1), makeItem(2, 'complexity', 2), makeItem(3, 'edge', 0)]
    let session = createQuizSession('arrays', items, 0)
    expect(session.bankIncomplete).toBe(true)
    expect(canGoBack(session)).toBe(false)

    // Cannot submit before selecting an option.
    expect(submitCurrent(session)).toBe(session)

    session = selectOption(session, 1)
    session = submitCurrent(session)
    // Cannot change option or go back after submit.
    expect(selectOption(session, 3).answers[0]).toBe(1)
    expect(canGoBack(session)).toBe(false)

    session = advanceQuiz(session)
    expect(session.index).toBe(1)
    // Before submitting Q2, Back is allowed!
    expect(canGoBack(session)).toBe(true)
    const reviewed = goBack(session)
    expect(reviewed.index).toBe(0)
    // Q1 stays locked while viewing it, and Continue returns to Q2.
    expect(selectOption(reviewed, 0).answers[0]).toBe(1)
    expect(advanceQuiz(reviewed).index).toBe(1)

    // Wrong answer on Q2, then submit -> Back immediately disabled.
    session = selectOption(session, 0)
    session = submitCurrent(session)
    expect(canGoBack(session)).toBe(false)

    session = advanceQuiz(session)
    session = selectOption(session, 0)
    session = submitCurrent(session)
    session = advanceQuiz(session)
    expect(session.finished).toBe(true)

    const summary = summarizeQuizSession(session)
    expect(summary).toMatchObject({
      score: 2,
      total: 3,
      passMark: 3,
      passed: false,
      verdict: 'almost',
      bankIncomplete: true,
    })
    expect(summary.byKind).toEqual([
      { kind: 'pattern', label: 'Pattern', correct: 1, total: 1 },
      { kind: 'complexity', label: 'Complexity', correct: 0, total: 1 },
      { kind: 'edge', label: 'Edge case', correct: 1, total: 1 },
    ])
    expect(summary.missed).toHaveLength(1)
    expect(summary.missed[0]).toMatchObject({ number: 2, chosen: 0 })
  })

  it('picks the weakest available topic for Start a 4-minute check', () => {
    const topics = [
      { id: 'arrays', order: 1 },
      { id: 'hashing', order: 2 },
      { id: 'graphs', order: 3 },
    ]
    const counts: Record<string, number> = { arrays: 12, hashing: 12, graphs: 0 }
    const countFor = (id: string) => counts[id] ?? 0

    // Untaken bank wins over already passed bank; empty bank is ignored.
    expect(
      pickWeakestQuizTopic(topics, countFor, {
        arrays: { bestScore: 11, bestTotal: 12, attempts: 1, passed: true },
      }),
    ).toBe('hashing')

    // Once all available banks are taken, lowest score wins.
    expect(
      pickWeakestQuizTopic(topics, countFor, {
        arrays: { bestScore: 11, bestTotal: 12, attempts: 2, passed: true },
        hashing: { bestScore: 8, bestTotal: 12, attempts: 1, passed: false },
      }),
    ).toBe('hashing')
  })
})
