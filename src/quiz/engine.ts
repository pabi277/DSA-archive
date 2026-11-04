import type { Topic } from '../catalogue'
import type { QuizItem, QuizKind } from '../content/types'

export const QUIZ_PASS_RATIO = 0.8
export const QUIZ_ALMOST_RATIO = 0.6
export const QUIZ_TARGET_COUNT = 12

export const QUIZ_KIND_ORDER: readonly QuizKind[] = ['pattern', 'dryrun', 'complexity', 'bug', 'edge']

export const QUIZ_KIND_LABELS: Record<QuizKind, string> = {
  pattern: 'Pattern',
  dryrun: 'Dry run',
  complexity: 'Complexity',
  bug: 'Find bug',
  edge: 'Edge case',
}

export type QuizChoice = 0 | 1 | 2 | 3
export type QuizVerdict = 'passed' | 'almost' | 'try-again'

export type QuizKindBreakdown = {
  kind: QuizKind
  label: string
  correct: number
  total: number
}

export type MissedQuestion = {
  number: number
  item: QuizItem
  chosen: QuizChoice | null
}

export type QuizSummary = {
  score: number
  total: number
  passMark: number
  passed: boolean
  verdict: QuizVerdict
  bankIncomplete: boolean
  byKind: QuizKindBreakdown[]
  missed: MissedQuestion[]
}

export type QuizSession = {
  topicId: string
  seed: number
  items: QuizItem[]
  index: number
  answers: (QuizChoice | null)[]
  submitted: boolean[]
  finished: boolean
  bankIncomplete: boolean
}

export type TopicScoreSnapshot = {
  bestScore: number
  bestTotal: number
  attempts: number
  passed: boolean
}

/** Deterministic 32-bit PRNG (Mulberry32) so seeded retakes are reproducible. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Seed 0 keeps the authored order (initial run). Positive seeds deterministically
 * permute items for retakes while keeping all items intact.
 */
export function shuffleQuizItems(items: readonly QuizItem[], seed: number): QuizItem[] {
  const copy = [...items]
  if (copy.length <= 1 || !Number.isFinite(seed) || seed <= 0) return copy
  const rand = mulberry32(Math.floor(seed))
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

export function quizPassMark(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.ceil(Math.floor(total) * QUIZ_PASS_RATIO)
}

export function isQuizPassed(score: number, total: number): boolean {
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return false
  return score >= quizPassMark(total)
}

export function quizVerdict(score: number, total: number): QuizVerdict {
  if (total <= 0) return 'try-again'
  if (isQuizPassed(score, total)) return 'passed'
  if (score >= Math.ceil(total * QUIZ_ALMOST_RATIO)) return 'almost'
  return 'try-again'
}

export function createQuizSession(topicId: string, rawItems: readonly QuizItem[], seed = 0): QuizSession {
  const safeSeed = Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : 0
  const capped = rawItems.slice(0, QUIZ_TARGET_COUNT)
  const items = shuffleQuizItems(capped, safeSeed)
  return {
    topicId,
    seed: safeSeed,
    items,
    index: 0,
    answers: Array<QuizChoice | null>(items.length).fill(null),
    submitted: Array<boolean>(items.length).fill(false),
    finished: false,
    bankIncomplete: items.length > 0 && items.length < QUIZ_TARGET_COUNT,
  }
}

export function selectOption(session: QuizSession, choice: QuizChoice): QuizSession {
  if (session.finished || session.items.length === 0) return session
  if (session.submitted[session.index]) return session
  if (choice < 0 || choice > 3 || !Number.isInteger(choice)) return session
  if (session.answers[session.index] === choice) return session
  const answers = [...session.answers]
  answers[session.index] = choice
  return { ...session, answers }
}

export function submitCurrent(session: QuizSession): QuizSession {
  if (session.finished || session.items.length === 0) return session
  if (session.submitted[session.index]) return session
  if (session.answers[session.index] === null) return session
  const submitted = [...session.submitted]
  submitted[session.index] = true
  return { ...session, submitted }
}

/** Back is allowed only before submitting the current question. */
export function canGoBack(session: QuizSession): boolean {
  return !session.finished && session.index > 0 && !session.submitted[session.index]
}

export function goBack(session: QuizSession): QuizSession {
  if (!canGoBack(session)) return session
  return { ...session, index: session.index - 1 }
}

export function advanceQuiz(session: QuizSession): QuizSession {
  if (session.finished || session.items.length === 0) return session
  if (!session.submitted[session.index]) return session
  if (session.index + 1 < session.items.length) {
    return { ...session, index: session.index + 1 }
  }
  return { ...session, finished: true }
}

export function summarizeQuizSession(session: QuizSession): QuizSummary {
  const total = session.items.length
  let score = 0
  const missed: MissedQuestion[] = []
  const kindCounts = new Map<QuizKind, { correct: number; total: number }>()

  session.items.forEach((item, idx) => {
    const chosen = session.submitted[idx] ? session.answers[idx] : null
    const correct = chosen === item.answerIndex
    if (correct) {
      score += 1
    } else {
      missed.push({ number: idx + 1, item, chosen })
    }
    const bucket = kindCounts.get(item.kind) ?? { correct: 0, total: 0 }
    bucket.total += 1
    if (correct) bucket.correct += 1
    kindCounts.set(item.kind, bucket)
  })

  const byKind: QuizKindBreakdown[] = []
  for (const kind of QUIZ_KIND_ORDER) {
    const bucket = kindCounts.get(kind)
    if (bucket && bucket.total > 0) {
      byKind.push({
        kind,
        label: QUIZ_KIND_LABELS[kind],
        correct: bucket.correct,
        total: bucket.total,
      })
    }
  }

  return {
    score,
    total,
    passMark: quizPassMark(total),
    passed: isQuizPassed(score, total),
    verdict: quizVerdict(score, total),
    bankIncomplete: session.bankIncomplete,
    byKind,
    missed,
  }
}

/**
 * Picks the weakest available topic for "Start a 4-minute check":
 * untaken first, then unpassed, then lowest best-score ratio, then fewest attempts.
 */
export function pickWeakestQuizTopic(
  topics: readonly Pick<Topic, 'id' | 'order'>[],
  getQuizCount: (topicId: string) => number,
  results: Readonly<Record<string, TopicScoreSnapshot | undefined>>,
): string | null {
  const available = topics.filter((topic) => getQuizCount(topic.id) > 0)
  if (available.length === 0) return null

  const ranked = [...available].sort((left, right) => {
    const a = results[left.id]
    const b = results[right.id]
    const aTaken = a && a.attempts > 0 ? 1 : 0
    const bTaken = b && b.attempts > 0 ? 1 : 0
    if (aTaken !== bTaken) return aTaken - bTaken
    if (!a || !b) return left.order - right.order

    const aPassed = a.passed ? 1 : 0
    const bPassed = b.passed ? 1 : 0
    if (aPassed !== bPassed) return aPassed - bPassed

    const aRatio = a.bestTotal > 0 ? a.bestScore / a.bestTotal : 0
    const bRatio = b.bestTotal > 0 ? b.bestScore / b.bestTotal : 0
    if (aRatio !== bRatio) return aRatio - bRatio

    if (a.attempts !== b.attempts) return a.attempts - b.attempts
    return left.order - right.order
  })

  return ranked[0]?.id ?? null
}
