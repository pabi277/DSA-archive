/**
 * `#/insights` — the whole insight layer on one screen (phase v2-08).
 *
 * Four cheap, provable things: momentum, one line of trajectory, two detectors
 * and plan-versus-reality. Plus the two settings that make the trajectory mean
 * something (a target date and a target list). There is deliberately no score,
 * no radar, no chart beyond the 14-day strip and no stored derived value.
 */
import { Button, Card, Empty, Tag } from '../design/primitives'
import { IconSpark } from '../design/icons'
import { MomentumLine, MomentumStrip, DetectorRow, PlanRealityLine } from './bits'
import type { Momentum } from './momentum'
import type { PlanReality, Trajectory } from './trajectory'
import type { Detector } from './detectors'

export type InsightsScreenProps = {
  signedIn: boolean
  momentum: Momentum
  trajectory: Trajectory
  reality: PlanReality
  goal: number
  onSetGoal: (goal: number) => void
  detectors: Detector[]
  onDetectorAction: (detector: Detector) => void
  onDetectorDismiss: (detector: Detector) => void
  targetDate: string | null
  targetListId: string | null
  lists: { id: string; title: string }[]
  onTargetDate: (date: string | null) => void
  onTargetList: (listId: string | null) => void
}

export function InsightsScreen({
  signedIn,
  momentum,
  trajectory,
  reality,
  goal,
  onSetGoal,
  detectors,
  onDetectorAction,
  onDetectorDismiss,
  targetDate,
  targetListId,
  lists,
  onTargetDate,
  onTargetList,
}: InsightsScreenProps) {
  if (!signedIn) {
    return (
      <div className="insights-screen" data-testid="insights-view">
        <Empty
          title="Insights need an account"
          mark={<IconSpark size={20} />}
          testId="insights-signed-out"
          action={
            <a className="btn btn-primary" href="#/topics">
              Browse all 20 topics
            </a>
          }
        >
          Momentum, the trajectory and the detectors are computed from your own solve dates, so they appear
          once you sign in. Nothing here is a score.
        </Empty>
      </div>
    )
  }

  return (
    <div className="insights-screen" data-testid="insights-view">
      <Card title="Momentum">
        <p className="insight-hero num" data-testid="insights-momentum">
          {momentum.value.toFixed(1)}
          <span className="insight-hero-of">/10</span>
        </p>
        <MomentumLine momentum={momentum} />
        <MomentumStrip momentum={momentum} />
        <p className="fine-print">
          The last 14 days, each weighted 0.9× the day after it. It decays and never resets to zero.
        </p>
      </Card>

      <Card title="Trajectory">
        <p data-testid="insights-trajectory">{trajectory.sentence}</p>
        <p className="quiet-note num">
          {trajectory.remaining} row{trajectory.remaining === 1 ? '' : 's'} left · pace is a median over the last
          14 study days
        </p>
      </Card>

      <Card title="Target">
        <div className="inline-form">
          <label className="field-label" htmlFor="target-date">
            Finish the sheet by
          </label>
          <input
            id="target-date"
            data-testid="target-date"
            type="date"
            value={targetDate ?? ''}
            onChange={(event) => onTargetDate(event.target.value || null)}
          />
          {targetDate ? (
            <Button size="sm" variant="ghost" data-testid="target-date-clear" onClick={() => onTargetDate(null)}>
              Clear
            </Button>
          ) : null}
        </div>
        <div className="inline-form">
          <label className="field-label" htmlFor="target-list">
            Target list
          </label>
          <select
            id="target-list"
            className="select-field"
            data-testid="target-list"
            value={targetListId ?? ''}
            onChange={(event) => onTargetList(event.target.value || null)}
          >
            <option value="">No list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.title}
              </option>
            ))}
          </select>
        </div>
        <p className="fine-print">
          Optional, synced with your account. A target inside 14 days makes Today prefer unsolved rows from that
          list.
        </p>
      </Card>

      <Card title="Worth a look">
        {detectors.length === 0 ? (
          <p className="quiet-note" data-testid="detectors-empty">
            Nothing crosses a threshold today.
          </p>
        ) : (
          detectors.map((detector) => (
            <DetectorRow
              key={detector.id}
              detector={detector}
              onAction={onDetectorAction}
              onDismiss={onDetectorDismiss}
            />
          ))
        )}
      </Card>

      <Card title="Plan vs reality">
        <PlanRealityLine reality={reality} goal={goal} onSetGoal={onSetGoal} />
        <p className="fine-print">
          Median problems moved on the days you worked over the last three weeks. The suggestion is
          arithmetic; your goal never changes on its own.
        </p>
      </Card>

      <p className="quiet-note">
        <Tag tone="neutral">Not here, on purpose</Tag> readiness score, FSRS, calibration, forecast chart, AI.
      </p>
    </div>
  )
}
