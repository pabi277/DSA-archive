/**
 * `#/practice` — pattern grid + drill progress. Synthetic `lc-<n>` ids are
 * written through the existing `toggleStatus(topicId, id)` path, so Today,
 * Review, friends summaries and backups all see drills without a new schema.
 */
import { useState } from 'react'
import { contentCoverage } from '../content/load'
import { DRILLS, PRACTICE_SETS, type Drill } from '../content/practice'
import { isDone, type ProgressByTopic } from '../progress'
import { Button, Card, Empty, Ring, Stat } from '../design/primitives'
import { buildPath } from './router'

export type PracticeScreenProps = {
  progress: ProgressByTopic
  disabled: boolean
  onToggleStatus: (topicId: string, problemId: string) => void
  onPlan: (problemId: string) => void
  onOpenProblem: (problemId: string) => void
}

export function PracticeScreen({ progress, disabled, onToggleStatus, onPlan, onOpenProblem }: PracticeScreenProps) {
  const coverage = contentCoverage()
  const [activePattern, setActivePattern] = useState<string | null>(PRACTICE_SETS[0]?.patternId ?? null)
  const doneCount = DRILLS.filter((drill) => isDone(progress, drill.topicId, drill.id)).length
  const active = PRACTICE_SETS.find((set) => set.patternId === activePattern) ?? null
  const activeDrills = active
    ? DRILLS.filter((drill) => drill.patternId === active.patternId)
    : []

  if (PRACTICE_SETS.length === 0) {
    return (
      <Empty title="No practice sets yet" mark="?" testId="practice-empty">
        Pattern files land in <code>data/practice-sets/</code>. The 495-row sheet remains unchanged.
      </Empty>
    )
  }

  return (
    <div className="practice-screen" data-testid="practice-screen">
      <Card title="Practice by pattern">
        <div className="stat-row">
          <Stat value={PRACTICE_SETS.length} label="patterns" detail="3–4 rungs each" />
          <Stat value={`${doneCount}/${DRILLS.length}`} label="drills done" detail={`report ${coverage.drills}`} />
          <Stat value={coverage.leetcodeTwins} label="LC twins" detail="of 495 sheet rows" />
        </div>
        <p className="quiet-note" data-testid="practice-progress">
          {doneCount} of {DRILLS.length} drills done · progress uses <code>lc-&lt;n&gt;</code> keys in the same topic shards.
        </p>
        <div className="practice-grid" data-testid="practice-grid">
          {PRACTICE_SETS.map((set) => {
            const drills = DRILLS.filter((drill) => drill.patternId === set.patternId)
            const done = drills.filter((drill) => isDone(progress, drill.topicId, drill.id)).length
            const selected = set.patternId === activePattern
            return (
              <button
                key={set.patternId}
                type="button"
                className={selected ? 'practice-card is-on' : 'practice-card'}
                aria-expanded={selected}
                aria-controls={selected ? `practice-pattern-${set.patternId}` : undefined}
                data-testid={`practice-pattern-${set.patternId}`}
                onClick={() => setActivePattern(set.patternId)}
              >
                <span className="practice-card-head">
                  <strong>{set.title}</strong>
                  <Ring value={done} total={drills.length} size={44} />
                </span>
                <span className="quiet-note">{set.summary}</span>
                <span className="quiet-note num">{done}/{drills.length} drills · {set.topicId}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {active ? (
        <Card
          title={active.title}
          action={
            <Button variant="primary" onClick={() => { window.location.hash = buildPath('topic', active.topicId, { tab: 'practice' }) }}>
              Open in {active.topicId}
            </Button>
          }
        >
          <div id={`practice-pattern-${active.patternId}`} data-testid="practice-pattern-detail">
            <p className="quiet-note">Verified {active.verified} · canonical LeetCode URLs · set {active.problems.map((problem) => problem.set).join(', ')}.</p>
            <ol className="drill-list">
              {activeDrills.map((drill) => (
                <DrillRow
                  key={drill.id}
                  drill={drill}
                  done={isDone(progress, drill.topicId, drill.id)}
                  disabled={disabled}
                  onToggle={() => onToggleStatus(drill.topicId, drill.id)}
                  onPlan={() => onPlan(drill.id)}
                  onOpen={() => onOpenProblem(drill.id)}
                />
              ))}
            </ol>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function DrillRow({
  drill,
  done,
  disabled,
  onToggle,
  onPlan,
  onOpen,
}: {
  drill: Drill
  done: boolean
  disabled: boolean
  onToggle: () => void
  onPlan: () => void
  onOpen: () => void
}) {
  return (
    <li className="drill-row" data-testid={`drill-${drill.id}`}>
      <div className="drill-row-main">
        <strong className="num">Set {drill.set} · {drill.title}</strong>
        <span className="quiet-note">{drill.why} · ~{drill.estMinutes} min · LeetCode {drill.lc}</span>
      </div>
      <div className="drill-actions">
        <Button size="sm" disabled={disabled} aria-pressed={done} onClick={onToggle} data-testid={`drill-status-${drill.id}`}>
          {done ? 'Done ✓' : 'Mark done'}
        </Button>
        <a className="btn btn-secondary btn-sm" href={drill.url} target="_blank" rel="noopener noreferrer">
          ↗ LeetCode · {drill.lc}
        </a>
        <Button size="sm" disabled={disabled} onClick={onPlan} data-testid={`drill-today-${drill.id}`}>+ Today</Button>
        <Button size="sm" onClick={onOpen}>Detail</Button>
      </div>
    </li>
  )
}
