import { useEffect, useId, useRef, useState } from 'react'
import { buildPath, openHref, type Route } from '../app/router'
import { catalogue } from '../catalogue'
import { getQuiz, getTheoryMcqCount, getTopicContent } from '../content/load'
import { IconArrowLeft } from '../design/icons'
import { Button, Card, Empty, Tag } from '../design/primitives'
import {
  advanceQuiz,
  canGoBack,
  createQuizSession,
  goBack,
  QUIZ_KIND_LABELS,
  quizPassMark,
  selectOption,
  submitCurrent,
  summarizeQuizSession,
  type QuizChoice,
} from './engine'
import { McqOptionList } from './mcqCard'
import type { QuizDataState } from './results'
import { ResultScreen } from './resultScreen'

function parseSeed(raw: string | undefined): number {
  const num = Number.parseInt(raw ?? '0', 10)
  return Number.isFinite(num) && num > 0 ? num : 0
}

export function QuizScreen({
  route,
  quiz,
}: {
  route: Route
  quiz: QuizDataState
}) {
  const topic = catalogue.topics.find((entry) => entry.id === route.param)
  const items = topic ? getQuiz(topic.id) : []
  const topicContent = topic ? getTopicContent(topic.id) : null
  const initialSeed = parseSeed(route.query.seed)

  const [session, setSession] = useState(() =>
    createQuizSession(topic?.id ?? '', items, initialSeed),
  )
  const recordedRef = useRef(false)
  const uid = useId()

  useEffect(() => {
    recordedRef.current = false
    setSession(createQuizSession(topic?.id ?? '', topic ? getQuiz(topic.id) : [], initialSeed))
  }, [topic?.id, initialSeed])

  useEffect(() => {
    if (!session.finished || recordedRef.current || !topic || session.items.length === 0) return
    recordedRef.current = true
    const summary = summarizeQuizSession(session)
    quiz.recordAttempt(topic.id, summary.score, summary.total)
  }, [session, topic, quiz])

  useEffect(() => {
    if (!topic || items.length === 0 || session.finished) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) {
        return
      }
      if (event.key >= '1' && event.key <= '4') {
        event.preventDefault()
        const choice = (Number(event.key) - 1) as QuizChoice
        setSession((prev) => selectOption(prev, choice))
        return
      }
      if (event.key === 'Enter') {
        if (target && (target.tagName === 'BUTTON' || target.tagName === 'A')) return
        event.preventDefault()
        setSession((prev) => {
          if (prev.finished) return prev
          if (prev.submitted[prev.index]) return advanceQuiz(prev)
          return submitCurrent(prev)
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [topic, items.length, session.finished])

  if (!topic) {
    return (
      <Empty
        title="That quiz topic does not exist"
        mark="?"
        testId="screen-quiz-missing"
        action={
          <a className="btn btn-primary" href={buildPath('quiz')}>
            All quizzes
          </a>
        }
      >
        Choose one of the 20 topics from Quizzes to start a check.
      </Empty>
    )
  }

  if (items.length === 0) {
    const theoryCount = getTheoryMcqCount(topic.id)
    return (
      <div className="quiz-runner-screen" data-testid="screen-quiz-empty">
        <a className="back-link" href={buildPath('quiz')}>
          <IconArrowLeft size={14} /> All quizzes
        </a>
        <Empty
          title="Coming soon — 12-item bank in authoring"
          mark="?"
          testId="quiz-empty-state"
          action={
            <a
              className="btn btn-primary"
              href={buildPath('topic', topic.id, { tab: theoryCount > 0 ? 'practice' : 'learn' })}
            >
              Back to {topic.title}
            </a>
          }
        >
          {theoryCount > 0
            ? `This topic's 12-question bank is still being authored, and ${theoryCount} theory concept check${theoryCount === 1 ? ' is' : 's are'} already live in Practice.`
            : "This topic's 12-question bank is in the authoring queue. Partial progress is never faked."}
        </Empty>
      </div>
    )
  }

  const total = session.items.length
  const passMark = quizPassMark(total)

  const handleAdvance = () => {
    setSession((prev) => advanceQuiz(prev))
  }

  const handleRetake = () => {
    const nextSeed = Math.max(session.seed + 1, quiz.results[topic.id]?.attempts ?? 1)
    recordedRef.current = false
    openHref(buildPath('quiz', topic.id, { seed: String(nextSeed) }), true)
    setSession(createQuizSession(topic.id, items, nextSeed))
  }

  if (session.finished) {
    const summary = summarizeQuizSession(session)
    return (
      <div className="quiz-runner-screen" data-testid="screen-quiz-runner">
        <a className="back-link" href={buildPath('quiz')}>
          <IconArrowLeft size={14} /> All quizzes
        </a>
        <ResultScreen
          topicId={topic.id}
          topicTitle={topic.title}
          summary={summary}
          savedResult={quiz.results[topic.id]}
          primerSections={topicContent?.sections ?? []}
          onRetake={handleRetake}
        />
      </div>
    )
  }

  const currentItem = session.items[session.index]
  const currentChoice = session.answers[session.index]
  const currentSubmitted = session.submitted[session.index]
  const isCorrect = currentSubmitted && currentChoice === currentItem.answerIndex
  const promptId = `quiz-q-prompt-${currentItem.id}-${uid}`
  const explainId = `quiz-q-explain-${currentItem.id}-${uid}`

  return (
    <div className="quiz-runner-screen" data-testid="screen-quiz-runner">
      <div className="quiz-runner-top">
        <a className="back-link" href={buildPath('quiz')}>
          <IconArrowLeft size={14} /> {topic.title} · Quizzes
        </a>
        <a
          className="btn btn-ghost btn-sm"
          href={buildPath('topic', topic.id, { tab: 'quiz' })}
          data-testid="quiz-exit"
        >
          Exit
        </a>
      </div>

      <div className="quiz-runner-layout">
        <aside className="quiz-rail" aria-label="Quiz progress summary">
          <div className="quiz-rail-top">
            <strong className="num" data-testid="quiz-progress-text">
              {session.index + 1} / {total}
            </strong>
            {session.bankIncomplete ? (
              <Tag tone="caution" data-testid="quiz-bank-incomplete">
                bank incomplete
              </Tag>
            ) : (
              <span className="quiet-note num">Pass {passMark}/{total}</span>
            )}
          </div>
          <div
            role="progressbar"
            aria-label="Quiz progress"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={session.index + 1}
            className="quiz-progress-track"
            data-testid="quiz-progressbar"
          >
            <span
              className="quiz-progress-fill"
              style={{ width: `${Math.round(((session.index + 1) / total) * 100)}%` }}
            />
          </div>
          <ol className="quiz-step-dots" aria-hidden="true">
            {session.items.map((item, idx) => {
              const done = session.submitted[idx]
              const right = done && session.answers[idx] === item.answerIndex
              return (
                <li
                  key={item.id}
                  className={[
                    'quiz-step-dot num',
                    idx === session.index && 'is-current',
                    done && (right ? 'is-right' : 'is-missed'),
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {idx + 1}
                </li>
              )
            })}
          </ol>
          <p className="quiet-note quiz-shortcut-hint">
            Keys <kbd className="kbd">1</kbd>–<kbd className="kbd">4</kbd> pick · <kbd className="kbd">↵</kbd> submit / next
          </p>
        </aside>

        <Card className="quiz-question-card" data-testid="quiz-question-card">
          <div className="quiz-question-meta">
            <Tag tone="info">{QUIZ_KIND_LABELS[currentItem.kind]}</Tag>
            <span className="quiet-note num">Question {session.index + 1} of {total}</span>
          </div>

          <h2 id={promptId} className="quiz-question-prompt" data-testid="quiz-question-prompt">
            {currentItem.prompt}
          </h2>

          {currentItem.codeSnippet ? (
            <pre className="code-block mcq-code" data-testid="quiz-code-snippet">
              <code>{currentItem.codeSnippet}</code>
            </pre>
          ) : null}

          <McqOptionList
            groupId="quiz-current"
            labelledBy={promptId}
            describedBy={currentSubmitted ? explainId : undefined}
            options={currentItem.options}
            selected={currentChoice}
            answerIndex={currentItem.answerIndex}
            locked={currentSubmitted}
            onSelect={(choice) => setSession((prev) => selectOption(prev, choice))}
          />

          <div className="quiz-runner-actions">
            <Button
              variant="ghost"
              disabled={!canGoBack(session)}
              data-testid="quiz-back"
              onClick={() => setSession((prev) => goBack(prev))}
            >
              Back
            </Button>

            {!currentSubmitted ? (
              <Button
                variant="primary"
                disabled={currentChoice === null}
                data-testid="quiz-submit"
                onClick={() => setSession((prev) => submitCurrent(prev))}
              >
                Submit answer
              </Button>
            ) : (
              <Button variant="primary" data-testid="quiz-next" onClick={handleAdvance}>
                {session.index + 1 < total ? 'Continue →' : 'See results →'}
              </Button>
            )}
          </div>

          <div id={explainId} aria-live="polite" className="mcq-feedback-wrap">
            {currentSubmitted ? (
              <div
                className={`mcq-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`}
                data-testid="quiz-explanation"
              >
                <strong>{isCorrect ? '✓ Correct' : '✗ Not quite'}</strong>
                <span>{currentItem.options[currentItem.answerIndex].explain}</span>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  )
}
