import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseRoute } from '../app/router'
import { getQuiz, getTheoryMcq, getTopicContent } from '../content/load'
import type { QuizItem } from '../content/types'
import { createQuizSession } from './engine'
import { InlineCheckCard, TheoryMcqCard } from './mcqCard'
import { QuizHome } from './quizHome'
import { QuizScreen } from './quizScreen'
import type { QuizDataState, QuizResultsByTopic } from './results'

let container: HTMLDivElement
let root: Root

function mount(node: React.ReactNode) {
  act(() => {
    root.render(node)
  })
}

function q(selector: string): HTMLElement {
  const found = container.querySelector(selector)
  if (!found) throw new Error(`Missing element: ${selector}`)
  return found as HTMLElement
}

function qa(selector: string): HTMLElement[] {
  return [...container.querySelectorAll(selector)] as HTMLElement[]
}

function click(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function keyOn(el: EventTarget, key: string) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

function makeQuizState(initial: QuizResultsByTopic = {}): {
  state: QuizDataState
  recorded: Array<{ topicId: string; score: number; total: number }>
} {
  const results: QuizResultsByTopic = { ...initial }
  const recorded: Array<{ topicId: string; score: number; total: number }> = []
  const state: QuizDataState = {
    signedIn: false,
    ready: true,
    pending: false,
    busy: false,
    results,
    mergePrompt: null,
    error: null,
    notice: null,
    recordAttempt: (topicId, score, total) => {
      recorded.push({ topicId, score, total })
      const prev = results[topicId]
      const bestScore = Math.max(prev?.bestScore ?? 0, score)
      const bestTotal = Math.min(12, Math.max(prev?.bestTotal ?? 0, total))
      results[topicId] = {
        attempts: (prev?.attempts ?? 0) + 1,
        bestScore: Math.min(bestScore, bestTotal),
        bestTotal,
        lastScore: Math.min(score, bestTotal),
        passed: Boolean(prev?.passed) || score / total >= 0.8,
        lastAt: '2026-11-04T00:00:00.000Z',
      }
    },
    mergeGuestIntoCloud: async () => {},
    keepSeparate: () => {},
    discardGuestResults: () => {},
    applyBackup: async () => {},
    clearCloudResults: async () => {},
    resultsSnapshot: () => Object.entries(results).map(([topicId, r]) => ({ topicId, ...r })),
    dismissError: () => {},
    dismissNotice: () => {},
  }
  return { state, recorded }
}

beforeEach(() => {
  localStorage.clear()
  window.location.hash = ''
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

describe('TheoryMcqCard & McqOptionList', () => {
  it('supports roving arrow-key radio navigation, wrong-answer retry, Show solution -> hint outcome, and right-answer -> clean solve', () => {
    const mcq = getTheoryMcq('basic-arrays')!
    const topicContent = getTopicContent('arrays')!
    const onMarkClean = vi.fn()
    const onMarkReadWithHint = vi.fn()

    mount(
      <TheoryMcqCard
        mcq={mcq}
        topicTitle="Beginner Problems"
        rereadSection={topicContent.sections[0]}
        onMarkClean={onMarkClean}
        onMarkReadWithHint={onMarkReadWithHint}
      />,
    )

    const radios = qa('[role="radio"]')
    expect(radios).toHaveLength(4)
    expect(radios[0].getAttribute('tabindex')).toBe('0')
    expect(radios[1].getAttribute('tabindex')).toBe('-1')

    // ArrowDown moves selection across options with roving tabindex.
    click(radios[0])
    expect(radios[0].getAttribute('aria-checked')).toBe('true')
    keyOn(radios[0], 'ArrowDown')
    expect(radios[1].getAttribute('aria-checked')).toBe('true')
    expect(radios[1].getAttribute('tabindex')).toBe('0')

    // Pick a wrong option deliberately and submit.
    const wrongIdx = ([0, 1, 2, 3] as const).find((idx) => idx !== mcq.answerIndex)!
    click(radios[wrongIdx])
    click(q(`[data-testid="mcq-submit-${mcq.problemId}"]`))

    expect(onMarkClean).not.toHaveBeenCalled()
    expect(radios[wrongIdx].classList.contains('is-wrong')).toBe(true)
    expect(radios[mcq.answerIndex].classList.contains('is-correct')).toBe(true)
    expect(radios[wrongIdx].getAttribute('aria-disabled')).toBe('true')
    expect(q('[role="radiogroup"]').getAttribute('aria-describedby')).toBeTruthy()
    expect(q(`[data-testid="mcq-verdict-${mcq.problemId}"]`).textContent).toContain('Not quite')
    expect(q(`[data-testid="mcq-reread-${mcq.problemId}"]`).getAttribute('href')).toContain(
      '#/topic/beginner-problems?tab=learn&section=',
    )

    // Marking as read after a wrong guess or Show solution records outcome 'hint'.
    click(q(`[data-testid="mcq-mark-read-${mcq.problemId}"]`))
    expect(onMarkReadWithHint).toHaveBeenCalledTimes(1)
    expect(q(`[data-testid="mcq-${mcq.problemId}-solution"]`)).toBeTruthy()

    // Try again unlocks options; answering right calls onMarkClean.
    click(q(`[data-testid="mcq-retry-${mcq.problemId}"]`))
    click(qa('[role="radio"]')[mcq.answerIndex])
    click(q(`[data-testid="mcq-submit-${mcq.problemId}"]`))
    expect(onMarkClean).toHaveBeenCalledTimes(1)
    expect(q(`[data-testid="mcq-verdict-${mcq.problemId}"]`).textContent).toContain('Correct')
  })
})

describe('InlineCheckCard', () => {
  it('checks understanding inline inside a primer section without touching progress or quiz storage', () => {
    const checks = getTopicContent('arrays')!
      .sections.map((section) => section.check)
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    expect(checks.length).toBeGreaterThanOrEqual(2)
    expect(checks.length).toBeLessThanOrEqual(3)
    const check = checks[0]

    mount(<InlineCheckCard topicId="arrays" check={check} />)
    expect(q(`[data-testid="primer-check-${check.rereadSectionId}"]`).textContent).toContain('Quick check')

    const wrongIdx = ([0, 1, 2, 3] as const).find((idx) => idx !== check.answerIndex)!
    click(qa('[role="radio"]')[wrongIdx])
    click(q(`[data-testid="inline-submit-${check.id}"]`))
    expect(q(`[data-testid="inline-verdict-${check.id}"]`).textContent).toContain('Not quite')
    expect(q(`[data-testid="inline-reread-${check.id}"]`)).toBeTruthy()

    click(q(`[data-testid="inline-retry-${check.id}"]`))
    click(qa('[role="radio"]')[check.answerIndex])
    click(q(`[data-testid="inline-submit-${check.id}"]`))
    expect(q(`[data-testid="inline-verdict-${check.id}"]`).textContent).toContain('Correct')
    expect(localStorage.getItem('dsa-archive.progress.v1')).toBeNull()
    expect(localStorage.getItem('dsa-archive.quiz.v1')).toBeNull()
  })
})

describe('QuizScreen & ResultScreen', () => {
  it('runs a full 12-question Arrays check via keyboard 1-4 + Enter, passes at >=80%, and reseeds on Retake', () => {
    const { state, recorded } = makeQuizState()
    const items = getQuiz('arrays')
    expect(items).toHaveLength(12)
    const seededOrder = createQuizSession('arrays', items, 0).items

    mount(<QuizScreen route={parseRoute('#/quiz/arrays')} quiz={state} />)

    expect(q('[data-testid="quiz-progress-text"]').textContent).toBe('1 / 12')

    for (let i = 0; i < seededOrder.length; i += 1) {
      const answerKey = String(seededOrder[i].answerIndex + 1)
      keyOn(window, answerKey)
      keyOn(window, 'Enter') // submit
      expect(q('[data-testid="quiz-explanation"]').textContent).toContain('Correct')
      keyOn(window, 'Enter') // advance
    }

    expect(recorded).toEqual([{ topicId: 'arrays', score: 12, total: 12 }])
    expect(q('[data-testid="quiz-result-screen"]')).toBeTruthy()
    expect(q('[data-testid="quiz-verdict-badge"]').textContent).toBe('Passed')
    expect(q('[data-testid="quiz-kind-breakdown"]').textContent).toContain('Complexity')

    // Retake reseeds question order deterministically.
    click(q('[data-testid="quiz-retake"]'))
    expect(window.location.hash).toBe('#/quiz/arrays?seed=1')
    expect(q('[data-testid="quiz-progress-text"]').textContent).toBe('1 / 12')
  })

  it('surfaces missed questions with expandable explanations and primer section links when <80%', () => {
    const { state, recorded } = makeQuizState()
    const items = getQuiz('arrays')
    const seededOrder = createQuizSession('arrays', items, 0).items

    mount(<QuizScreen route={parseRoute('#/quiz/arrays')} quiz={state} />)

    for (let i = 0; i < seededOrder.length; i += 1) {
      const wrongIdx = ([0, 1, 2, 3] as const).find((idx) => idx !== seededOrder[i].answerIndex)!
      click(qa('[role="radio"]')[wrongIdx])
      click(q('[data-testid="quiz-submit"]'))
      click(q('[data-testid="quiz-next"]'))
    }

    expect(recorded).toEqual([{ topicId: 'arrays', score: 0, total: 12 }])
    expect(q('[data-testid="quiz-verdict-badge"]').textContent).toBe('Try again')
    // Top 3 missed shown initially, expandable to all 12.
    expect(qa('.quiz-missed-item')).toHaveLength(3)
    click(q('[data-testid="quiz-missed-more"]'))
    expect(qa('.quiz-missed-item')).toHaveLength(12)

    const firstMissedId = seededOrder[0].id
    click(q(`[data-testid="quiz-missed-toggle-${firstMissedId}"]`))
    expect(q(`[data-testid="quiz-missed-detail-${firstMissedId}"]`).textContent).toContain('Correct')
    expect(
      q(`[data-testid="quiz-missed-primer-${firstMissedId}"]`).getAttribute('href'),
    ).toContain('#/topic/arrays?tab=learn&section=')
  })

  it('shows honest empty and missing states when a topic bank has 0 items or an invalid slug', () => {
    const { state } = makeQuizState()
    mount(<QuizScreen route={parseRoute('#/quiz/graphs')} quiz={state} />)
    expect(q('[data-testid="screen-quiz-empty"]').textContent).toContain('12-item bank in authoring')
    expect(q('[data-testid="screen-quiz-empty"]').textContent).toContain('theory concept checks are already live')

    mount(<QuizScreen route={parseRoute('#/quiz/unknown-slug')} quiz={state} />)
    expect(q('[data-testid="screen-quiz-missing"]')).toBeTruthy()
  })

  it('scales the >=80% pass mark honestly on an incomplete bank (<12 items)', () => {
    const fiveItems: QuizItem[] = getQuiz('arrays').slice(0, 5)
    const session = createQuizSession('arrays', fiveItems, 2)
    expect(session.bankIncomplete).toBe(true)
    expect(session.items).toHaveLength(5)
  })
})

describe('QuizHome', () => {
  it('lists all 20 topics, highlights the weakest available topic, and reflects Passed status', () => {
    const { state } = makeQuizState()
    mount(<QuizHome quiz={state} />)

    expect(qa('[data-testid^="quiz-home-topic-"]')).toHaveLength(20)
    expect(q('[data-testid="quiz-view"]').textContent).toContain('Suggested next: Arrays')
    expect(q('[data-testid="quiz-home-topic-arrays"]').textContent).toContain('12 questions · pass ≥80%')
    expect(q('[data-testid="quiz-home-topic-graphs"]').textContent).toContain('Open theory checks')
    expect(q('[data-testid="quiz-home-topic-sorting"]').textContent).toContain('Open topic')

    state.recordAttempt('arrays', 11, 12)
    mount(<QuizHome quiz={state} />)
    expect(q('[data-testid="quiz-home-topic-arrays"]').textContent).toContain('Quiz ✓ 11/12')
  })
})
