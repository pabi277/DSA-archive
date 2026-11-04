import { useEffect, useState } from 'react'
import { buildPath } from '../app/router'
import type { PrimerSection } from '../content/types'
import { Button, Card, Ring, Tag } from '../design/primitives'
import { QUIZ_KIND_LABELS, type QuizSummary } from './engine'
import type { QuizResult } from './results'

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const

function sectionForMissed(sections: readonly PrimerSection[], index: number): PrimerSection | null {
  if (sections.length === 0) return null
  return sections[index % sections.length] ?? sections[0]
}

export function ResultScreen({
  topicId,
  topicTitle,
  summary,
  savedResult,
  primerSections,
  onRetake,
}: {
  topicId: string
  topicTitle: string
  summary: QuizSummary
  savedResult?: QuizResult
  primerSections: readonly PrimerSection[]
  onRetake: () => void
}) {
  const [showAllMissed, setShowAllMissed] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const verdictLabel =
    summary.verdict === 'passed' ? 'Passed' : summary.verdict === 'almost' ? 'Almost' : 'Try again'
  const verdictTone =
    summary.verdict === 'passed' ? 'success' : summary.verdict === 'almost' ? 'caution' : 'danger'

  const visibleMissed = showAllMissed ? summary.missed : summary.missed.slice(0, 3)

  const toggleExplain = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) {
        return
      }
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        onRetake()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onRetake])

  return (
    <div className="quiz-result" data-testid="quiz-result-screen">
      <Card className="quiz-result-hero">
        <div className="quiz-result-summary">
          <Ring
            value={summary.score}
            total={summary.total}
            size={84}
            thickness={6}
            label={`${summary.score} of ${summary.total} correct`}
          />
          <div className="quiz-result-copy">
            <div className="quiz-result-tags">
              <Tag tone={verdictTone} data-testid="quiz-verdict-badge">
                {verdictLabel}
              </Tag>
              {summary.bankIncomplete ? (
                <Tag tone="caution" data-testid="quiz-bank-incomplete">
                  bank incomplete
                </Tag>
              ) : null}
            </div>
            <h2 className="quiz-result-heading num">
              {summary.score} / {summary.total} correct (pass mark {summary.passMark}/{summary.total})
            </h2>
            <p className="quiet-note num">
              {savedResult
                ? `Best ${savedResult.bestScore}/${savedResult.bestTotal} · attempt #${savedResult.attempts}`
                : `${topicTitle} check completed`}
            </p>
          </div>
        </div>

        <div className="quiz-kind-strip" aria-label="Score by question kind" data-testid="quiz-kind-breakdown">
          {summary.byKind.map((entry) => (
            <span key={entry.kind} className="quiz-kind-pill num">
              <span>{QUIZ_KIND_LABELS[entry.kind]}</span>
              <strong>
                {entry.correct}/{entry.total}
              </strong>
            </span>
          ))}
        </div>

        <div className="inline-actions">
          <Button variant="primary" data-testid="quiz-retake" onClick={onRetake}>
            Retake
          </Button>
          <a
            className="btn btn-secondary"
            href={buildPath('topic', topicId, { tab: 'quiz' })}
            data-testid="quiz-back-topic"
          >
            Back to topic
          </a>
        </div>
      </Card>

      {summary.missed.length > 0 ? (
        <Card title="Questions to revisit" className="quiz-missed-card">
          <p className="quiet-note">
            Open any missed item to compare your pick against the right explanation, then re-read its primer section.
          </p>
          <ul className="quiz-missed-list" data-testid="quiz-missed-list">
            {visibleMissed.map((missed, idx) => {
              const expanded = Boolean(expandedIds[missed.item.id])
              const section = sectionForMissed(primerSections, missed.number - 1 + idx)
              const learnHref = section
                ? buildPath('topic', topicId, { tab: 'learn', section: section.id })
                : buildPath('topic', topicId, { tab: 'learn' })
              const answerOption = missed.item.options[missed.item.answerIndex]
              const chosenOption = missed.chosen !== null ? missed.item.options[missed.chosen] : null

              return (
                <li key={missed.item.id} className="quiz-missed-item">
                  <button
                    type="button"
                    className="quiz-missed-toggle"
                    aria-expanded={expanded}
                    data-testid={`quiz-missed-toggle-${missed.item.id}`}
                    onClick={() => toggleExplain(missed.item.id)}
                  >
                    <span className="num quiz-missed-num">Q{missed.number}</span>
                    <span className="quiz-missed-prompt">{missed.item.prompt}</span>
                    <span className="quiet-note">{expanded ? 'Hide' : 'Why'}</span>
                  </button>
                  {expanded ? (
                    <div className="quiz-missed-detail" data-testid={`quiz-missed-detail-${missed.item.id}`}>
                      {chosenOption && missed.chosen !== null ? (
                        <p className="quiz-missed-wrong">
                          <strong>✗ Your choice ({OPTION_KEYS[missed.chosen]}):</strong> {chosenOption.text} —{' '}
                          {chosenOption.explain}
                        </p>
                      ) : null}
                      <p className="quiz-missed-right">
                        <strong>✓ Correct ({OPTION_KEYS[missed.item.answerIndex]}):</strong> {answerOption.text} —{' '}
                        {answerOption.explain}
                      </p>
                    </div>
                  ) : null}
                  <div className="quiz-missed-links">
                    <a className="text-link" href={learnHref} data-testid={`quiz-missed-primer-${missed.item.id}`}>
                      → Re-read {section ? `“${section.title}”` : `${topicTitle} primer`}
                    </a>
                  </div>
                </li>
              )
            })}
          </ul>
          {summary.missed.length > 3 ? (
            <button
              type="button"
              className="text-link"
              data-testid="quiz-missed-more"
              onClick={() => setShowAllMissed((prev) => !prev)}
            >
              {showAllMissed
                ? 'Show top 3 missed questions'
                : `Show all ${summary.missed.length} missed questions`}
            </button>
          ) : null}
        </Card>
      ) : (
        <Card title="Clean sweep">
          <p className="quiet-note">
            Every question answered cleanly on this run. Retake any time with a fresh question order.
          </p>
        </Card>
      )}
    </div>
  )
}
