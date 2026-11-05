/**
 * Phase v2-08 — the three pieces of furniture the insight layer reuses.
 *
 * All of it is plain text: chips are `<span className="tag">`, never buttons;
 * the momentum strip is one `role="img"` with a sentence behind it; a detector
 * is a single muted row with one action and one "hide for today".
 */
import { Button, Tag } from '../design/primitives'
import { chipsOf, reasonLine, type Reason } from './reasons'
import type { Momentum } from './momentum'
import type { PlanReality } from './trajectory'
import type { Detector } from './detectors'

/** At most two muted chips per row; the rest stay in the tooltip. */
export function ReasonChips({ reasons, testId }: { reasons?: readonly Reason[]; testId?: string }) {
  if (!reasons || reasons.length === 0) return null
  return (
    <span className="reason-chips" title={reasonLine(reasons)} data-testid={testId}>
      {chipsOf(reasons).map((text) => (
        <Tag key={text} tone="neutral" className="reason-chip">
          {text}
        </Tag>
      ))}
    </span>
  )
}

/** `Momentum 7.2 · 4 study days this week` — a line, not a hero number. */
export function MomentumLine({ momentum }: { momentum: Momentum }) {
  return (
    <p className="quiet-note momentum-line" data-testid="momentum-line">
      Momentum <strong className="num">{momentum.value.toFixed(1)}</strong> ·{' '}
      {momentum.studyDaysThisWeek} study day{momentum.studyDaysThisWeek === 1 ? '' : 's'} this week
      {momentum.restDayEarned ? ' · rest day earned' : ''}
    </p>
  )
}

/** The 14-day strip: one image, one sentence, no colour meaning. */
export function MomentumStrip({ momentum }: { momentum: Momentum }) {
  return (
    <div className="momentum-strip" role="img" aria-label={momentum.summary} data-testid="momentum-strip">
      {momentum.strip.map((day) => (
        <span
          key={day.date}
          className={day.active ? 'momentum-bar is-active' : 'momentum-bar'}
          title={`${day.date}: ${day.active ? 'worked' : 'rest'}`}
        />
      ))}
    </div>
  )
}

/** One detector: the count, the one action, and a way to hide it for the day. */
export function DetectorRow({
  detector,
  onAction,
  onDismiss,
}: {
  detector: Detector
  onAction: (detector: Detector) => void
  onDismiss: (detector: Detector) => void
}) {
  return (
    <div className="detector-row" role="status" data-testid={`detector-${detector.id}`}>
      <span className="detector-text">{detector.text}</span>
      <button
        type="button"
        className="button button-secondary"
        data-testid={`detector-action-${detector.id}`}
        onClick={() => onAction(detector)}
      >
        {detector.action}
      </button>
      <button
        type="button"
        className="text-link"
        aria-label="Hide this note for today"
        data-testid={`detector-dismiss-${detector.id}`}
        onClick={() => onDismiss(detector)}
      >
        Hide for today
      </button>
    </div>
  )
}

/** `Planned 5 · completed 3 · median 2.9/day over 3 weeks` plus one suggestion. */
export function PlanRealityLine({
  reality,
  goal,
  onSetGoal,
}: {
  reality: PlanReality
  goal: number
  onSetGoal: (goal: number) => void
}) {
  return (
    <p className="quiet-note num" data-testid="plan-reality">
      Planned {reality.planned} · completed {reality.completed} · median{' '}
      {reality.medianPerDay.toFixed(1)}/day over 3 weeks
      {reality.suggestion !== null ? (
        <>
          {' '}
          <Button
            size="sm"
            data-testid="plan-reality-set-goal"
            onClick={() => onSetGoal(reality.suggestion as number)}
          >
            Set goal to {reality.suggestion}
          </Button>
        </>
      ) : null}
      {reality.suggestion === null ? ` · goal ${goal} is within reach` : null}
    </p>
  )
}
