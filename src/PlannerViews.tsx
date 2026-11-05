import { useEffect, useMemo, useState } from 'react'
import { catalogue, type Problem } from './catalogue'
import { LEVEL_LABELS, levelOf } from './sheet'
import { locateProblem } from './library'
import type { CloudProgressByTopic } from './cloudProgress'
import { ReasonChips, MomentumLine, DetectorRow, PlanRealityLine } from './insights/bits'
import { HowPlanWasMade } from './insights/howPlanWasMade'
import type { Momentum } from './insights/momentum'
import type { PlanReality } from './insights/trajectory'
import type { Detector } from './insights/detectors'
import type { Reason } from './insights/reasons'
import {
  DAILY_GOAL_MAX,
  DAILY_GOAL_MIN,
  REVISION_INTERVALS,
  dateFromDayKey,
  dueLabel,
  type Plan,
  type RevisionItem,
  type TodayTally,
} from './planner'

/**
 * 4.1 — Today: the daily goal, the planned rows and one-tap progress.
 *
 * The plan is personal data, so signed out the view explains why an account is
 * needed (the same rule phases 2–3 used for notes and lists) instead of showing
 * a control that cannot save. Everything is text-labelled; no new token,
 * colour or icon was introduced.
 */
export function TodayView({
  signedIn,
  ready,
  today,
  plan,
  goal,
  tally,
  suggestions,
  reasons,
  momentum,
  reality,
  detectors,
  dueCount,
  weakestTitle,
  targetDate,
  targetListTitle,
  onDetectorAction,
  onDetectorDismiss,
  continuePick,
  disabled,
  onAdd,
  onRemove,
  onDone,
  onOpen,
  onSetGoal,
  onSuggest,
}: {
  signedIn: boolean
  ready: boolean
  today: string
  plan: Plan | null
  goal: number
  tally: TodayTally
  suggestions: string[]
  reasons: Record<string, Reason[]>
  momentum: Momentum
  reality: PlanReality
  detectors: Detector[]
  dueCount: number
  weakestTitle: string | null
  targetDate: string | null
  targetListTitle: string | null
  onDetectorAction: (detector: Detector) => void
  onDetectorDismiss: (detector: Detector) => void
  continuePick: { problemId: string; day: string } | null
  disabled: boolean
  onAdd: (problemId: string) => void
  onRemove: (problemId: string) => void
  onDone: (problemId: string) => void
  onOpen: (problemId: string) => void
  onSetGoal: (goal: number) => void
  onSuggest: () => void
}) {
  const [query, setQuery] = useState('')
  const [goalDraft, setGoalDraft] = useState(String(goal))

  useEffect(() => {
    setGoalDraft(String(goal))
  }, [goal])

  const planned = plan?.problemIds ?? []
  const doneIds = plan?.doneIds ?? []

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '') return []
    const found: { problem: Problem; topicTitle: string }[] = []
    for (const topic of catalogue.topics) {
      for (const subtopic of topic.subtopics) {
        for (const problem of subtopic.problems) {
          if (!problem.title.toLowerCase().includes(needle)) continue
          found.push({ problem, topicTitle: topic.title })
          if (found.length >= 6) return found
        }
      }
    }
    return found
  }, [query])

  if (!signedIn) {
    return (
      <section className="library-view" data-testid="today-view" aria-label="Today">
        <div className="empty-state">
          <span className="empty-mark" aria-hidden="true">◷</span>
          <h2>Today needs an account</h2>
          <p>
            The daily goal and the Today list follow your Google account and sync across devices. Sign in
            to plan a day, and the sheet stays fully browsable either way.
          </p>
        </div>
      </section>
    )
  }

  const todayDate = (() => {
    const date = dateFromDayKey(today)
    return date
      ? date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
      : today
  })()
  const goalValue = Number(goalDraft)
  const goalInvalid = !Number.isFinite(goalValue) || goalValue < DAILY_GOAL_MIN || goalValue > DAILY_GOAL_MAX

  return (
    <section className="library-view" data-testid="today-view" aria-label="Today">
      {continuePick && (
        <div className="card context-card" data-testid="continue-card">
          <h2 className="card-title">Continue where you left off</h2>
          <div className="context-stat">
            <strong>{locateProblem(continuePick.problemId)?.problem.title ?? continuePick.problemId}</strong>
            <span>last touched {continuePick.day}</span>
          </div>
          <button
            type="button"
            className="text-button"
            data-testid="continue-open"
            onClick={() => onOpen(continuePick.problemId)}
          >
            Open in the sheet →
          </button>
        </div>
      )}

      <div className="library-head">
        <h2 className="card-title">Today</h2>
        <p className="quiet-note">
          {todayDate} · your local day
        </p>
        <p className="quiet-note" data-testid="today-goal-status">
          {tally.movedToday}/{tally.goal} moved today · {tally.planned} planned ·{' '}
          {tally.goalMet ? 'goal met' : `${Math.max(0, tally.goal - tally.movedToday)} to go`}
        </p>
        <MomentumLine momentum={momentum} />
      </div>

      <div className="goal-line">
        <strong>{tally.movedToday}</strong>
        <span className="goal-track" aria-hidden="true">
          <span style={{ width: `${Math.min(100, Math.round((tally.movedToday / tally.goal) * 100))}%` }} />
        </span>
        <span>of {tally.goal}</span>
      </div>

      <div className="card context-card">
        <h2 className="card-title">Daily goal</h2>
        <div className="inline-form">
          <label className="field-label" htmlFor="goal-input">Problems per day (1–100)</label>
          <input
            id="goal-input"
            data-testid="goal-input"
            type="number"
            min={DAILY_GOAL_MIN}
            max={DAILY_GOAL_MAX}
            inputMode="numeric"
            value={goalDraft}
            disabled={disabled}
            onChange={(event) => setGoalDraft(event.target.value)}
          />
          <button
            type="button"
            className="button button-secondary"
            data-testid="goal-save"
            disabled={disabled || goalInvalid || goalValue === goal}
            onClick={() => onSetGoal(goalValue)}
          >
            Save goal
          </button>
        </div>
        <p className="fine-print">
          Counting is honest: a problem counts once a day, whether you solve it in the sheet or tick it
          here.
        </p>
      </div>

      <div className="card context-card">
        <h2 className="card-title">Today’s picks</h2>
        {detectors.map((detector) => (
          <DetectorRow
            key={detector.id}
            detector={detector}
            onAction={onDetectorAction}
            onDismiss={onDetectorDismiss}
          />
        ))}
        {!ready ? (
          <p className="fine-print" data-testid="today-loading">Loading today’s plan…</p>
        ) : planned.length === 0 ? (
          <div className="empty-state" data-testid="today-empty">
            <span className="empty-mark" aria-hidden="true">＋</span>
            <h2>Nothing planned for today</h2>
            <p>Add a few rows below, or let the archive suggest the next five from your weakest topic.</p>
            <button
              type="button"
              className="button button-primary"
              data-testid="today-suggest"
              disabled={disabled}
              onClick={onSuggest}
            >
              Add 5 suggested picks
            </button>
          </div>
        ) : (
          <ul className="list-problems" data-testid="today-list">
            {planned.map((problemId) => {
              const location = locateProblem(problemId)
              const done = doneIds.includes(problemId)
              return (
                <li key={problemId} data-testid={`today-item-${problemId}`}>
                  <button type="button" className="text-button" onClick={() => onOpen(problemId)}>
                    {location?.problem.title ?? problemId}
                  </button>
                  {location && <span className="level-badge">{LEVEL_LABELS[levelOf(location.problem)]}</span>}
                  <span className="fine-print" data-testid={`today-state-${problemId}`}>
                    {done ? 'Done today' : 'Planned'}
                  </span>
                  <ReasonChips reasons={reasons[problemId]} testId={`today-reasons-${problemId}`} />
                  <button
                    type="button"
                    className="button button-secondary"
                    data-testid={`today-done-${problemId}`}
                    aria-pressed={done}
                    disabled={disabled || done}
                    onClick={() => onDone(problemId)}
                  >
                    {done ? 'Done ✓' : 'Mark done'}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    data-testid={`today-remove-${problemId}`}
                    aria-label={`Remove ${location?.problem.title ?? problemId} from today`}
                    disabled={disabled}
                    onClick={() => onRemove(problemId)}
                  >
                    Remove
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {planned.length > 0 && (
          <p className="fine-print" data-testid="today-planned-count">
            {planned.length} planned · {tally.done} ticked here · {doneIds.length} marked done today.
          </p>
        )}
        <PlanRealityLine reality={reality} goal={goal} onSetGoal={onSetGoal} />
        <HowPlanWasMade
          goal={goal}
          due={dueCount}
          weakest={weakestTitle}
          targetDate={targetDate}
          targetList={targetListTitle}
          nextGoal={Math.min(DAILY_GOAL_MAX, goal + 1)}
        />
      </div>

      {suggestions.length > 0 && (
        <div className="card context-card">
          <h2 className="card-title">Suggested next</h2>
          <p className="fine-print">
            From the topic with the lowest completion, in sheet order. Suggestions never overwrite a plan.
          </p>
          <ul className="list-problems">
            {suggestions.map((problemId) => {
              const location = locateProblem(problemId)
              const already = planned.includes(problemId)
              return (
                <li key={problemId}>
                  <button type="button" className="text-button" onClick={() => onOpen(problemId)}>
                    {location?.problem.title ?? problemId}
                  </button>
                  <span className="fine-print">{location?.topicTitle ?? ''}</span>
                  <ReasonChips reasons={reasons[problemId]} testId={`suggest-reasons-${problemId}`} />
                  <button
                    type="button"
                    className="button button-secondary"
                    data-testid={`today-add-${problemId}`}
                    disabled={disabled || already}
                    onClick={() => onAdd(problemId)}
                  >
                    {already ? 'Added' : 'Add'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="card context-card">
        <h2 className="card-title">Add a problem</h2>
        <div className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            data-testid="today-add-search"
            aria-label="Search problems to add to today"
            placeholder="Search the sheet"
            value={query}
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query !== '' && (
            <button type="button" aria-label="Clear today search" onClick={() => setQuery('')}>✕</button>
          )}
        </div>
        {query.trim() !== '' && matches.length === 0 && (
          <p className="fine-print" data-testid="today-no-matches">No row matches “{query.trim()}”.</p>
        )}
        {matches.length > 0 && (
          <ul className="list-problems" data-testid="today-matches">
            {matches.map(({ problem, topicTitle }) => {
              const already = planned.includes(problem.id)
              return (
                <li key={problem.id}>
                  <span className="fine-print">{problem.title}</span>
                  <span className="fine-print">{topicTitle}</span>
                  <button
                    type="button"
                    className="button button-secondary"
                    data-testid={`today-add-${problem.id}`}
                    disabled={disabled || already || planned.length >= 200}
                    onClick={() => onAdd(problem.id)}
                  >
                    {already ? 'Added' : 'Add'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

    </section>
  )
}

/**
 * 4.2 — the spaced revision queue. Due rows first (most overdue at the top),
 * one tap marks a row revised and pushes it to the next interval, and the
 * schedule is always explained in words: 3 → 7 → 21 days.
 */
export function RevisionView({
  signedIn,
  today,
  due,
  upcoming,
  graduated,
  scheduled,
  disabled,
  onRevised,
  onOpen,
}: {
  signedIn: boolean
  today: string
  due: RevisionItem[]
  upcoming: RevisionItem[]
  graduated: number
  scheduled: number
  disabled: boolean
  onRevised: (topicId: string, problemId: string) => void
  onOpen: (problemId: string) => void
}) {
  if (!signedIn) {
    return (
      <section className="library-view" data-testid="revision-view" aria-label="Revision">
        <div className="empty-state">
          <span className="empty-mark" aria-hidden="true">↻</span>
          <h2>Revision needs an account</h2>
          <p>
            The queue is computed from your own solve and revision dates, so it needs the account that
            holds them. Sign in and solved problems come back after {REVISION_INTERVALS[0]},{' '}
            {REVISION_INTERVALS[1]} and {REVISION_INTERVALS[2]} days.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="library-view" data-testid="revision-view" aria-label="Revision">
      <div className="library-head">
        <h2 className="card-title">Revision queue</h2>
        <p className="quiet-note" data-testid="revision-count">
          {due.length} due today · {scheduled} scheduled · {graduated} graduated
        </p>
        <p className="fine-print">
          Schedule: a solved row returns after {REVISION_INTERVALS[0]} days, then{' '}
          {REVISION_INTERVALS[1]}, then {REVISION_INTERVALS[2]}; three revisions graduate it.
        </p>
      </div>

      {due.length === 0 ? (
        <div className="empty-state" data-testid="revision-empty">
          <span className="empty-mark" aria-hidden="true">✓</span>
          <h2>Caught up</h2>
          <p>
            Nothing is due today. Solve something in the sheet and it comes back here after{' '}
            {REVISION_INTERVALS[0]} days.
          </p>
        </div>
      ) : (
        <ul className="list-problems" data-testid="due-list">
          {due.map((item) => (
            <li key={item.problemId} data-testid={`due-item-${item.problemId}`}>
              <button type="button" className="text-button" onClick={() => onOpen(item.problemId)}>
                {item.problem.title}
              </button>
              <span className="level-badge">{LEVEL_LABELS[levelOf(item.problem)]}</span>
              <span className="fine-print" data-testid={`due-label-${item.problemId}`}>
                {dueLabel(item.dueDay, today)} · revision {item.stage + 1} of {REVISION_INTERVALS.length}
              </span>
              <button
                type="button"
                className="button button-primary"
                data-testid={`revised-${item.problemId}`}
                disabled={disabled}
                onClick={() => onRevised(item.topicId, item.problemId)}
              >
                Revised ✓
              </button>
            </li>
          ))}
        </ul>
      )}

      {upcoming.length > 0 && (
        <div className="card context-card">
          <h2 className="card-title">Next up</h2>
          <ul className="list-problems" data-testid="upcoming-list">
            {upcoming.map((item) => (
              <li key={item.problemId}>
                <button type="button" className="text-button" onClick={() => onOpen(item.problemId)}>
                  {item.problem.title}
                </button>
                <span className="fine-print">
                  {dueLabel(item.dueDay, today)} · revision {item.stage + 1} of {REVISION_INTERVALS.length}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/**
 * 4.3 — stats: streak heatmap, weekly strip, per-topic bars and solved-by-level.
 * Everything is derived from the owner's own progress entries; nothing is
 * computed on a server and no extra document is stored.
 */
export function StatsView({
  signedIn,
  entries,
  streak,
  weekly,
  heat,
}: {
  signedIn: boolean
  entries: CloudProgressByTopic
  streak: { current: number; longest: number; lastActiveDay: string | null; activeDays: number }
  weekly: {
    week: { date: string; label: string; count: number }[]
    solvedThisWeek: number
    revisedThisWeek: number
    solvedTotal: number
    activeDaysThisWeek: number
  }
  heat: { date: string; count: number; level: 0 | 1 | 2 | 3 }[]
}) {
  if (!signedIn) {
    return (
      <section className="library-view" data-testid="stats-view" aria-label="Stats">
        <div className="empty-state">
          <span className="empty-mark" aria-hidden="true">▤</span>
          <h2>Stats need an account</h2>
          <p>
            Streaks and weekly counts are computed from your own dates, so they appear once you sign in.
            The sheet and its search keep working signed out.
          </p>
        </div>
      </section>
    )
  }

  const totalRows = catalogue.topics.reduce(
    (total, topic) => total + topic.subtopics.reduce((sum, subtopic) => sum + subtopic.problems.length, 0),
    0,
  )

  const topics = catalogue.topics.map((topic) => {
    const problems = topic.subtopics.flatMap((subtopic) => subtopic.problems)
    const done = problems.filter((problem) => entries[topic.id]?.[problem.id]?.s === 'done').length
    return {
      id: topic.id,
      title: topic.title,
      done,
      total: problems.length,
      percent: problems.length === 0 ? 0 : Math.round((done / problems.length) * 100),
    }
  })

  const levels = (['basic', 'core', 'pro', 'ungraded'] as const).map((level) => {
    let done = 0
    let total = 0
    for (const topic of catalogue.topics) {
      for (const subtopic of topic.subtopics) {
        for (const problem of subtopic.problems) {
          if (levelOf(problem) !== level) continue
          total += 1
          if (entries[topic.id]?.[problem.id]?.s === 'done') done += 1
        }
      }
    }
    return { level, done, total }
  })

  const activeCells = heat.filter((cell) => cell.count > 0).length

  return (
    <section className="library-view" data-testid="stats-view" aria-label="Stats">
      <div className="library-head">
        <h2 className="card-title">Stats</h2>
        <p className="quiet-note">
          Computed on this device from your own progress · no extra documents are stored
        </p>
      </div>

      <div className="metric-grid">
        <div className="metric-tile">
          <span>Solved</span>
          <strong data-testid="stat-solved">{weekly.solvedTotal}</strong>
          <small>of {totalRows} rows</small>
        </div>
        <div className="metric-tile">
          <span>This week</span>
          <strong data-testid="stat-week">{weekly.solvedThisWeek}</strong>
          <small>{weekly.revisedThisWeek} revised</small>
        </div>
        <div className="metric-tile">
          <span>Streak</span>
          <strong data-testid="stat-streak">{streak.current}</strong>
          <small>best {streak.longest} · {streak.activeDays} active days</small>
        </div>
      </div>

      {weekly.solvedTotal === 0 ? (
        <div className="empty-state" data-testid="stats-empty">
          <span className="empty-mark" aria-hidden="true">▤</span>
          <h2>No solved rows yet</h2>
          <p>Mark a problem done in the sheet and the streak, the heatmap and the topic bars start here.</p>
        </div>
      ) : (
        <>
          <div className="card context-card">
            <h2 className="card-title">Last 8 weeks</h2>
            <p className="fine-print" data-testid="heatmap-summary">
              {activeCells} active day{activeCells === 1 ? '' : 's'} in the last 8 weeks
              {streak.lastActiveDay ? ` · last active ${streak.lastActiveDay}` : ''}
            </p>
            <div className="heatmap" aria-hidden="true" data-testid="heatmap">
              {heat.map((cell) => (
                <span
                  key={cell.date}
                  className={`heat-cell${cell.count > 0 ? ` heat-${cell.level}` : ''}`}
                  data-testid={`heat-${cell.date}`}
                  title={cell.count > 0 ? `${cell.count} on ${cell.date}` : `${cell.date}: nothing`}
                />
              ))}
            </div>
            <div className="week-strip" data-testid="week-strip">
              {weekly.week.map((day) => (
                <span key={day.date}>
                  <strong>{day.count}</strong>
                  {day.label}
                </span>
              ))}
            </div>
            <p className="fine-print">
              {weekly.activeDaysThisWeek} active day{weekly.activeDaysThisWeek === 1 ? '' : 's'} this week ·
              the numbers under the strip are what the shading means.
            </p>
          </div>

          <div className="card context-card">
            <h2 className="card-title">By topic</h2>
            <div data-testid="topic-bars">
              {topics.map((topic) => (
                <div className="bar-row" key={topic.id} data-testid={`bar-${topic.id}`}>
                  <span>{topic.title}</span>
                  <span className="topic-progress" aria-hidden="true">
                    <span style={{ width: `${topic.percent}%` }} />
                  </span>
                  <strong>{topic.done}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card context-card">
            <h2 className="card-title">By level</h2>
            <div data-testid="level-split">
              {levels.map((entry) => (
                <div className="context-stat" key={entry.level}>
                  <strong>{LEVEL_LABELS[entry.level]}</strong>
                  <span>{entry.done} of {entry.total} solved</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
