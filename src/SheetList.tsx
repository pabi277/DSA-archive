import { LINK_LABELS, LEVEL_LABELS, levelOf, type FilteredTopic, type LinkFilter } from './sheet'
import { isBookmarked, isDone, type ProgressByTopic } from './progress'
import type { Problem } from './catalogue'

const linkTypes = Object.keys(LINK_LABELS) as LinkFilter[]

/**
 * One sheet row (roadmap 1.1 + 1.3): status control, title, text-labelled
 * level badge, bookmark, and the outbound links that exist for that row.
 * Phase 2 passes progress actions in from the account-data hook so the same
 * row works for guest localStorage and signed-in Firestore progress.
 */
export function ProblemRow({
  topicId,
  problem,
  progress,
  revealed,
  disabled,
  onToggleStatus,
  onToggleBookmark,
}: {
  topicId: string
  problem: Problem
  progress: ProgressByTopic
  revealed: boolean
  disabled: boolean
  onToggleStatus: (topicId: string, problemId: string) => void
  onToggleBookmark: (topicId: string, problemId: string) => void
}) {
  const done = isDone(progress, topicId, problem.id)
  const bookmarked = isBookmarked(progress, topicId, problem.id)
  const links = linkTypes.filter((linkType) => Boolean(problem.links[linkType]))

  return (
    <article className={revealed ? 'problem-row is-revealed' : 'problem-row'} id={`problem-${problem.id}`}>
      <button
        type="button"
        className="status-check"
        disabled={disabled}
        aria-pressed={done}
        aria-label={`Mark ${problem.title} ${done ? 'to do' : 'done'}`}
        onClick={() => onToggleStatus(topicId, problem.id)}
      >
        {done ? '✓' : ''}
      </button>
      <div className="problem-copy">
        <span className="problem-title">{problem.title}</span>
        <span className="problem-meta">
          {problem.kind === 'theory' ? 'Theory' : 'Problem'} · {done ? 'Done' : 'To do'}
        </span>
      </div>
      <span className="level-badge">{LEVEL_LABELS[levelOf(problem)]}</span>
      <button
        type="button"
        className="bookmark-button"
        disabled={disabled}
        aria-pressed={bookmarked}
        aria-label={`${bookmarked ? 'Remove bookmark from' : 'Bookmark'} ${problem.title}`}
        onClick={() => onToggleBookmark(topicId, problem.id)}
      >
        {bookmarked ? '★' : '☆'}
      </button>
      {links.length > 0 && (
        <div className="row-actions" role="group" aria-label={`Outbound links for ${problem.title}`}>
          {links.map((linkType) => (
            <a key={linkType} href={problem.links[linkType]} target="_blank" rel="noopener noreferrer">
              {LINK_LABELS[linkType]}
            </a>
          ))}
        </div>
      )}
    </article>
  )
}

/**
 * Topic accordion (roadmap 1.1). The header count is always the whole-topic
 * `done/total`; while a query is active it also reports how many rows matched,
 * so filtering never misreports progress.
 */
export function TopicAccordion({
  topic,
  progress,
  filtering,
  open,
  onOpenChange,
  revealedProblemId,
  progressDisabled,
  onToggleStatus,
  onToggleBookmark,
}: {
  topic: FilteredTopic
  progress: ProgressByTopic
  filtering: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  revealedProblemId: string | null
  progressDisabled: boolean
  onToggleStatus: (topicId: string, problemId: string) => void
  onToggleBookmark: (topicId: string, problemId: string) => void
}) {
  return (
    <details
      id={`topic-${topic.id}`}
      className="topic-card"
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary>
        <span className="topic-chevron" aria-hidden="true">›</span>
        <span className="topic-name">{topic.title}</span>
        <span className="topic-count" data-testid={`topic-count-${topic.id}`}>
          {topic.done}/{topic.total}
          {filtering ? ` · ${topic.matchCount} shown` : ''}
        </span>
        <span className="topic-progress" aria-hidden="true">
          <span style={{ width: `${topic.percent}%` }} />
        </span>
      </summary>
      <div className="subtopic-content">
        {topic.subtopics.map((subtopic) => (
          <section key={subtopic.id} aria-labelledby={`subtopic-${subtopic.id}`}>
            {/* h2, not h3: topic names live in <summary> (not a heading), so an
                h3 here would skip a level and fail the axe heading-order rule. */}
            <h2 className="subtopic-title" id={`subtopic-${subtopic.id}`}>{subtopic.title}</h2>
            {subtopic.problems.map((problem) => (
              <ProblemRow
                key={problem.id}
                topicId={topic.id}
                problem={problem}
                progress={progress}
                revealed={revealedProblemId === problem.id}
                disabled={progressDisabled}
                onToggleStatus={onToggleStatus}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </section>
        ))}
      </div>
    </details>
  )
}
