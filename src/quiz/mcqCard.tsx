import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { buildPath, openHref } from '../app/router'
import { publisherName } from '../content/resources'
import type { InlineCheck, QuizOption, TheoryMcq, TheoryReveal } from '../content/types'
import { Button, Tag } from '../design/primitives'
import type { ProblemProgress } from '../progress'
import type { QuizChoice } from './engine'

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const

export function McqOptionList({
  groupId,
  labelledBy,
  describedBy,
  options,
  selected,
  answerIndex,
  locked,
  onSelect,
}: {
  groupId: string
  labelledBy: string
  describedBy?: string
  options: readonly [QuizOption, QuizOption, QuizOption, QuizOption]
  selected: QuizChoice | null
  answerIndex: QuizChoice
  locked: boolean
  onSelect: (choice: QuizChoice) => void
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const activeTabStop = selected ?? 0

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      nextIndex = (index + 1) % 4
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      nextIndex = (index + 3) % 4
    }
    if (nextIndex !== null) {
      event.preventDefault()
      refs.current[nextIndex]?.focus()
      if (!locked) onSelect(nextIndex as QuizChoice)
    }
  }

  return (
    <div
      id={groupId}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="mcq-options"
    >
      {options.map((option, index) => {
        const choice = index as QuizChoice
        const isSelected = selected === choice
        const isAnswer = answerIndex === choice
        const showRight = locked && isAnswer
        const showWrongPick = locked && isSelected && !isAnswer
        return (
          <button
            key={OPTION_KEYS[index]}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-disabled={locked || undefined}
            tabIndex={activeTabStop === index ? 0 : -1}
            data-testid={`${groupId}-option-${index}`}
            onClick={() => {
              if (!locked) onSelect(choice)
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={[
              'mcq-option',
              isSelected && 'is-selected',
              showRight && 'is-correct',
              showWrongPick && 'is-wrong',
              locked && 'is-locked',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="mcq-option-head">
              <span className="mcq-option-key" aria-hidden="true">
                {OPTION_KEYS[index]}
              </span>
              <span className="mcq-option-text">{option.text}</span>
              {showRight ? <span className="mcq-option-badge is-correct">✓ Answer</span> : null}
              {showWrongPick ? <span className="mcq-option-badge is-wrong">✗ Your choice</span> : null}
            </span>
            {locked ? <span className="mcq-option-explain">{option.explain}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

function RevealBlock({
  testIdPrefix,
  reveal,
  open,
}: {
  testIdPrefix: string
  reveal: TheoryReveal
  open: boolean
}) {
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null)
  if (!open) return null
  return (
    <div className="mcq-reveal" data-testid={`${testIdPrefix}-solution`}>
      <p className="mcq-reveal-copy">{reveal.solution}</p>
      <div className="mcq-reveal-meta">
        <a
          className="text-link"
          href={reveal.reference.url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`${testIdPrefix}-reference`}
          onClick={(event) => {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
              event.preventDefault()
              setOfflineNotice(
                `${publisherName(reveal.reference.source)} opens outside DSA Archive and needs a connection.`,
              )
            } else {
              setOfflineNotice(null)
            }
          }}
        >
          {reveal.reference.label} ({publisherName(reveal.reference.source)}) ↗
        </a>
      </div>
      {offlineNotice ? (
        <p className="quiet-note" role="status">
          {offlineNotice}
        </p>
      ) : null}
    </div>
  )
}

export function TheoryMcqCard({
  mcq,
  topicTitle,
  progress,
  rereadSection,
  onMarkClean,
  onMarkReadWithHint,
}: {
  mcq: TheoryMcq
  topicTitle: string
  progress?: ProblemProgress
  rereadSection?: { id: string; title: string } | null
  onMarkClean: () => void
  onMarkReadWithHint: () => void
}) {
  const uid = useId()
  const promptId = `mcq-prompt-${mcq.problemId}-${uid}`
  const explainId = `mcq-explain-${mcq.problemId}-${uid}`
  const groupId = `mcq-${mcq.problemId}`

  const [selected, setSelected] = useState<QuizChoice | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [solutionOpen, setSolutionOpen] = useState(false)

  const isCorrect = submitted && selected === mcq.answerIndex
  const isDone = progress?.s === 'done'
  const explainVisible = submitted || solutionOpen

  const handleSubmit = () => {
    if (selected === null || submitted) return
    setSubmitted(true)
    if (selected === mcq.answerIndex) {
      onMarkClean()
    }
  }

  const handleRetry = () => {
    setSelected(null)
    setSubmitted(false)
  }

  const rereadHref = rereadSection
    ? buildPath('topic', mcq.topicId, { tab: 'learn', section: rereadSection.id })
    : buildPath('topic', mcq.topicId, { tab: 'learn' })

  return (
    <section
      className="mcq-card"
      aria-labelledby={promptId}
      data-testid={`theory-mcq-${mcq.problemId}`}
    >
      <header className="mcq-card-head">
        <div className="mcq-card-tags">
          <Tag tone="info">Concept check</Tag>
          {isDone ? (
            <Tag tone={progress?.o === 'hint' ? 'caution' : 'success'}>
              {progress?.o === 'hint' ? 'Read with solution' : 'Checked'}
            </Tag>
          ) : null}
        </div>
        <button
          type="button"
          className="text-link"
          aria-expanded={solutionOpen}
          data-testid={`mcq-show-solution-${mcq.problemId}`}
          onClick={() => setSolutionOpen((prev) => !prev)}
        >
          {solutionOpen ? 'Hide solution' : 'Show solution'}
        </button>
      </header>

      <p id={promptId} className="mcq-prompt">
        {mcq.prompt}
      </p>
      {mcq.codeSnippet ? (
        <pre className="code-block mcq-code">
          <code>{mcq.codeSnippet}</code>
        </pre>
      ) : null}

      <McqOptionList
        groupId={groupId}
        labelledBy={promptId}
        describedBy={explainVisible ? explainId : undefined}
        options={mcq.options}
        selected={selected}
        answerIndex={mcq.answerIndex}
        locked={submitted}
        onSelect={setSelected}
      />

      <div className="mcq-actions">
        {!submitted ? (
          <Button
            size="sm"
            disabled={selected === null}
            data-testid={`mcq-submit-${mcq.problemId}`}
            onClick={handleSubmit}
          >
            Check answer
          </Button>
        ) : !isCorrect ? (
          <Button size="sm" data-testid={`mcq-retry-${mcq.problemId}`} onClick={handleRetry}>
            Try again
          </Button>
        ) : null}

        {(solutionOpen || (submitted && !isCorrect)) && !isDone ? (
          <Button
            size="sm"
            variant="ghost"
            data-testid={`mcq-mark-read-${mcq.problemId}`}
            onClick={() => {
              setSolutionOpen(true)
              onMarkReadWithHint()
            }}
          >
            Mark as read
          </Button>
        ) : null}
      </div>

      <div id={explainId} aria-live="polite" className="mcq-feedback-wrap">
        {submitted ? (
          <div
            className={`mcq-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`}
            data-testid={`mcq-verdict-${mcq.problemId}`}
          >
            <strong>{isCorrect ? '✓ Correct' : '✗ Not quite'}</strong>
            <span>
              {isCorrect
                ? 'Marked done. Each option above shows why it holds or fails.'
                : `${mcq.options[mcq.answerIndex].explain} This row stays open so you can try again or read the solution.`}
            </span>
            {!isCorrect ? (
              <a
                className="text-link"
                href={rereadHref}
                data-testid={`mcq-reread-${mcq.problemId}`}
              >
                → Re-read {rereadSection ? `“${rereadSection.title}”` : `${topicTitle} primer`}
              </a>
            ) : null}
          </div>
        ) : null}
        <RevealBlock testIdPrefix={`mcq-${mcq.problemId}`} reveal={mcq.reveal} open={solutionOpen} />
      </div>
    </section>
  )
}

export function InlineCheckCard({
  topicId,
  check,
}: {
  topicId: string
  check: InlineCheck
}) {
  const uid = useId()
  const promptId = `inline-prompt-${check.id}-${uid}`
  const explainId = `inline-explain-${check.id}-${uid}`
  const groupId = `inline-check-${check.id}`

  const [selected, setSelected] = useState<QuizChoice | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [solutionOpen, setSolutionOpen] = useState(false)

  const isCorrect = submitted && selected === check.answerIndex
  const explainVisible = submitted || solutionOpen

  const jumpToSection = () => {
    openHref(buildPath('topic', topicId, { tab: 'learn', section: check.rereadSectionId }), true)
    const target = document.getElementById(`primer-section-${check.rereadSectionId}`)
    if (target) {
      target.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
      target.focus?.({ preventScroll: true })
    }
  }

  return (
    <aside
      className="mcq-card mcq-inline-check"
      aria-labelledby={promptId}
      data-testid={`primer-check-${check.rereadSectionId}`}
    >
      <header className="mcq-card-head">
        <div className="mcq-card-tags">
          <Tag tone={isCorrect ? 'success' : 'neutral'}>
            {isCorrect ? 'Checked' : 'Quick check'}
          </Tag>
        </div>
        <button
          type="button"
          className="text-link"
          aria-expanded={solutionOpen}
          data-testid={`inline-show-solution-${check.id}`}
          onClick={() => setSolutionOpen((prev) => !prev)}
        >
          {solutionOpen ? 'Hide solution' : 'Show solution'}
        </button>
      </header>

      <p id={promptId} className="mcq-prompt">
        {check.prompt}
      </p>
      {check.codeSnippet ? (
        <pre className="code-block mcq-code">
          <code>{check.codeSnippet}</code>
        </pre>
      ) : null}

      <McqOptionList
        groupId={groupId}
        labelledBy={promptId}
        describedBy={explainVisible ? explainId : undefined}
        options={check.options}
        selected={selected}
        answerIndex={check.answerIndex}
        locked={submitted}
        onSelect={setSelected}
      />

      <div className="mcq-actions">
        {!submitted ? (
          <Button
            size="sm"
            disabled={selected === null}
            data-testid={`inline-submit-${check.id}`}
            onClick={() => {
              if (selected !== null) setSubmitted(true)
            }}
          >
            Check answer
          </Button>
        ) : !isCorrect ? (
          <Button
            size="sm"
            data-testid={`inline-retry-${check.id}`}
            onClick={() => {
              setSelected(null)
              setSubmitted(false)
            }}
          >
            Try again
          </Button>
        ) : null}
      </div>

      <div id={explainId} aria-live="polite" className="mcq-feedback-wrap">
        {submitted ? (
          <div
            className={`mcq-feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`}
            data-testid={`inline-verdict-${check.id}`}
          >
            <strong>{isCorrect ? '✓ Correct' : '✗ Not quite'}</strong>
            <span>
              {isCorrect
                ? check.options[check.answerIndex].explain
                : `${check.options[check.answerIndex].explain}`}
            </span>
            {!isCorrect ? (
              <button
                type="button"
                className="text-link"
                data-testid={`inline-reread-${check.id}`}
                onClick={jumpToSection}
              >
                → Re-read “{check.rereadSectionTitle}”
              </button>
            ) : null}
          </div>
        ) : null}
        <RevealBlock testIdPrefix={`inline-${check.id}`} reveal={check.reveal} open={solutionOpen} />
      </div>
    </aside>
  )
}
