/**
 * `#/problem/<id>` — Phase 03 statement surface for catalogue rows and the
 * synthetic `lc-<n>` drills. Execution (quiz, theatre, runner) stays in its
 * own phase; this page never shows a dead primary control for it.
 */
import { locateProblem } from '../library'
import { isDrillId } from '../content/practice'
import { contentCoverage } from '../content/load'
import { StatementCard } from '../content/statement'
import { Button, Empty, Tag } from '../design/primitives'
import { IconArrowLeft } from '../design/icons'
import { buildPath } from './router'

export function ProblemScreen({ problemId }: { problemId: string }) {
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
  const theoryMcqs = contentCoverage().content.theoryMcqs

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

      {problem.kind === 'theory' && !drill ? (
        <p className="quiet-note" data-testid="theory-mcq-ready">
          4-option MCQ data is bundled with per-option explanations and an always-available solution reference · {theoryMcqs} theory cards · engine in Phase 05.
        </p>
      ) : null}

      <StatementCard problem={problem} />
    </div>
  )
}
