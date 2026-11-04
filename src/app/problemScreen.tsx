/**
 * `#/problem/<id>` — Phase 03 statement surface for catalogue rows and the
 * synthetic `lc-<n>` drills, Phase 04 saved-solution panel, and Phase 05
 * 4-option concept MCQ card for theory rows (never on coding rows).
 */
import { locateProblem } from '../library'
import { isDrillId } from '../content/practice'
import { getTheoryMcq, getTopicContent } from '../content/load'
import { StatementCard } from '../content/statement'
import { Button, Empty, Tag } from '../design/primitives'
import { IconArrowLeft } from '../design/icons'
import { buildPath } from './router'
import { CodePanel, type CodeSync } from '../code/editor'
import type { Snippet, SnippetDraft } from '../code/codeStore'
import { TheoryMcqCard } from '../quiz/mcqCard'
import type { Outcome, ProblemProgress } from '../progress'

export function ProblemScreen({
  problemId,
  progress,
  snippet,
  signedIn,
  codeDisabled,
  codeSync,
  onMarkDoneWithOutcome,
  onSaveCode,
  onDeleteCode,
}: {
  problemId: string
  progress?: ProblemProgress
  snippet: Snippet | null
  signedIn: boolean
  codeDisabled: boolean
  codeSync: CodeSync
  onMarkDoneWithOutcome: (topicId: string, problemId: string, outcome: Outcome) => void
  onSaveCode: (draft: SnippetDraft) => void
  onDeleteCode: () => void
}) {
  const location = locateProblem(problemId)
  if (!location) {
    return (
      <Empty
        title="That problem does not exist"
        mark="?"
        testId="problem-missing"
        action={
          <Button variant="primary" onClick={() => { window.location.hash = buildPath('topics') }}>
            Browse all topics
          </Button>
        }
      >
        <code>{problemId}</code> is not in this archive or its practice sets.
      </Empty>
    )
  }

  const { problem, topicId, topicTitle, subtopicTitle } = location
  const drill = isDrillId(problemId)
  const theoryMcq = problem.kind === 'theory' && !drill ? getTheoryMcq(problem.id) : null
  const firstSection = getTopicContent(topicId)?.sections[0] ?? null

  return (
    <div className="problem-screen" data-testid="problem-screen">
      <a className="back-link" href={buildPath('topic', topicId, { tab: 'practice' })}>
        <IconArrowLeft size={14} /> {topicTitle}
      </a>
      {/* The shell owns the only h1; the problem title is level two. */}
      <h2 className="problem-screen-title">{problem.title}</h2>
      <p className="quiet-note">
        {subtopicTitle} · {drill ? 'Pattern drill' : problem.kind === 'theory' ? 'Theory' : 'Problem'} ·{' '}
        <span className="num">{problem.lcLabel}</span> ·{' '}
        <Tag tone={problem.lcMatch === 'theory' ? 'info' : 'neutral'}>{problem.lcMatch}</Tag>
      </p>

      <div className="problem-actions">
        <Button onClick={() => { window.location.hash = drill ? buildPath('practice') : buildPath('search', '', { q: problem.title }) }}>
          {drill ? 'Browse practice sets' : 'Find it in the sheet'}
        </Button>
        <Tag tone="neutral">Runner · Phase 07</Tag>
      </div>

      {theoryMcq ? (
        <TheoryMcqCard
          mcq={theoryMcq}
          topicTitle={topicTitle}
          progress={progress}
          rereadSection={firstSection ? { id: firstSection.id, title: firstSection.title } : null}
          onMarkClean={() => onMarkDoneWithOutcome(topicId, problem.id, 'clean')}
          onMarkReadWithHint={() => onMarkDoneWithOutcome(topicId, problem.id, 'hint')}
        />
      ) : null}

      <StatementCard problem={problem} />

      <CodePanel
        problemId={problemId}
        problemTitle={problem.title}
        snippet={snippet}
        signedIn={signedIn}
        disabled={codeDisabled}
        sync={codeSync}
        onSave={onSaveCode}
        onDelete={onDeleteCode}
      />
    </div>
  )
}
