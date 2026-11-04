/**
 * Phase v2-06 — `#/problem/<id>` becomes the theatre: stage + rail.
 *
 * Desktop ≥1080 px: the official player (max 880 px, 16:9) with our control bar
 * on the left, a 360 px rail on the right holding the title, outcome control,
 * stamps, `↗ Solve on LeetCode`, `⌨ Code` and `Add to today`.
 * Phone: the same content stacked, with a three-tab sheet (`Problem · Stamps ·
 * Code`) so 495 rows stay readable on a 390 px screen.
 *
 * Everything from phases 03–05 is reused, not rewritten: `StatementCard` (with
 * its hint and ranked sources), `TheoryMcqCard` (theory rows only) and
 * `CodePanel`. The theatre adds the stage, the stamps, the speed memory and the
 * mini player hand-off; it removes nothing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { catalogue, type Topic } from '../catalogue'
import { locateProblem } from '../library'
import { isDrillId } from '../content/practice'
import { getTests, getTheoryMcq, getTopicContent } from '../content/load'
import { mediaFor } from '../content/load'
import { StatementCard } from '../content/statement'
import { Button, Empty, Tag } from '../design/primitives'
import { IconArrowLeft, IconCode, IconExternal } from '../design/icons'
import { buildPath, navigate } from '../app/router'
import { useWideLayout } from '../app/useMediaQuery'
import { CodePanel, type CodeSync } from '../code/editor'
import type { Snippet, SnippetDraft } from '../code/codeStore'
import { TheoryMcqCard } from '../quiz/mcqCard'
import type { Outcome, ProblemProgress } from '../progress'
import { TheatreStage } from './stage'
import { StampsList } from './stampsList'
import { nextUp, nextLine as nextLineText } from './autoAdvance'
import { parseVideoId, formatClock } from './video'
import { addMoment, removeMoment, momentsOf, rememberMoments, undoMoments } from './stamps'
import { setTopicRate, useTheatreSettings, markWatched, setAutoAdvance } from './theatreSettings'
import { seek } from './player'
import { tabFromHash, tabHref, type ProblemTab } from './tab'
import { rateLabel } from './speedMemory'

export function ProblemScreen({
  problemId,
  progress,
  snippet,
  signedIn,
  codeDisabled,
  codeSync,
  planProblemIds,
  online,
  onMarkDoneWithOutcome,
  onSetOutcome,
  onPlan,
  onSaveCode,
  onDeleteCode,
  onUndoable,
  onNotify,
}: {
  problemId: string
  progress?: ProblemProgress
  snippet: Snippet | null
  signedIn: boolean
  codeDisabled: boolean
  codeSync: CodeSync
  planProblemIds: readonly string[]
  online: boolean
  onMarkDoneWithOutcome: (topicId: string, problemId: string, outcome: Outcome) => void
  onSetOutcome: (topicId: string, problemId: string, outcome: Outcome) => void
  onPlan: (problemId: string) => void
  onSaveCode: (draft: SnippetDraft) => void
  onDeleteCode: () => void
  /** Toast with a 6 s undo, owned by the shell's feedback host. */
  onUndoable: (request: { key: string; message: string; revert: () => void }) => void
  onNotify: (message: string, detail?: string) => void
}) {
  const location = locateProblem(problemId)
  const settings = useTheatreSettings()
  const wide = useWideLayout()
  // `?tab=code` is a real address, so the tab is URL state: deep link, reload and
  // back button all land on the tab they name.
  const [tab, setTabState] = useState<ProblemTab>(readTab)
  const [live, setLive] = useState({ current: 0, duration: 0 })
  const [, setComposing] = useState<number | null>(null)
  const railRef = useRef<HTMLElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)

  // The tab *is* the address, so it has to follow the address: a hash navigation
  // that changes only `?tab=` (back/forward, a pasted deep link, a bookmark) is
  // the same document and does not remount this screen. Watching `problemId`
  // alone left the panel on the previous tab, which made the back button lie.
  useEffect(() => {
    const sync = () => setTabState(readTab())
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [problemId])

  const setTab = useCallback(
    (next: ProblemTab) => {
      setTabState(next)
      window.history.replaceState(null, '', tabHref(problemId, next))
    },
    [problemId],
  )

  const moments = useMemo(() => momentsOf(snippet), [snippet])
  // Phase v2-07: the authored `{input, expected}` pairs (phase 03) drive the
  // Run panel's "Run tests" button on this same page.
  const cases = useMemo(() => getTests(problemId), [problemId])

  const addStamp = useCallback(
    (at: number, text: string) => {
      if (!signedIn) {
        onNotify('Sign in to keep stamps', 'Stamps live beside your saved code, so they follow your account.')
        return
      }
      const result = addMoment(moments, at, text)
      if (result.error) {
        onNotify(result.error)
        return
      }
      rememberMoments(problemId, moments)
      onSaveCode({ ...(snippet ?? { language: 'cpp', code: '', notes: '' }), moments: result.moments })
      onUndoable({
        key: `stamps:${problemId}`,
        message: `Stamped ${formatClock(at)}`,
        revert: () => {
          const before = undoMoments(problemId)
          if (!before) return
          onSaveCode({ ...(snippet ?? { language: 'cpp', code: '', notes: '' }), moments: before })
        },
      })
    },
    [moments, onNotify, onSaveCode, onUndoable, problemId, signedIn, snippet],
  )

  const deleteStamp = useCallback(
    (index: number) => {
      rememberMoments(problemId, moments)
      const next = removeMoment(moments, index)
      onSaveCode({ ...(snippet ?? { language: 'cpp', code: '', notes: '' }), moments: next })
      onUndoable({
        key: `stamps:${problemId}`,
        message: 'Stamp deleted',
        revert: () => {
          const before = undoMoments(problemId)
          if (!before) return
          onSaveCode({ ...(snippet ?? { language: 'cpp', code: '', notes: '' }), moments: before })
        },
      })
    },
    [moments, onSaveCode, onUndoable, problemId, snippet],
  )

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
  const videoId = parseVideoId(problem.links.video)
  const media = videoId ? mediaFor(videoId) : null
  const rate = settings.speeds[topicId] ?? 1
  // "Done" for the offer: the plan already drops rows you completed, and this
  // page only knows this row's own progress — so a planned row counts as open,
  // and a same-topic row counts as open unless it is this one.
  const doneRows = new Set<string>(progress?.s === 'done' ? [problemId] : [])
  const target = nextUp({
    currentId: problemId,
    planProblemIds,
    topicRows: topicRowIds(topicId),
    isDone: (id) => doneRows.has(id),
  })
  const nextText = target ? nextLineText(target) : null
  const watchedFlag = videoId ? settings.watched[videoId] ?? null : null

  const seekTo = (at: number) => {
    seek(at)
    setLive((value) => ({ ...value, current: at }))
    // On a phone the stamps live in the sheet below the stage: bring the player
    // back into view so the learner sees the jump they just asked for.
    if (!wide) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="problem-screen theatre-page" data-testid="problem-screen">
      <a className="back-link" href={buildPath('topic', topicId, { tab: 'practice' })}>
        <IconArrowLeft size={14} /> {topicTitle}
      </a>

      <div className="theatre-layout">
        <div className="theatre-main" ref={anchorRef}>
          <h2 className="problem-screen-title theatre-title">{problem.title}</h2>

          <div className="theatre-tabs" role="tablist" aria-label="Problem page sections">
            {([
              ['problem', 'Problem'],
              ['stamps', `Stamps${moments.length ? ` · ${moments.length}` : ''}`],
              ['code', 'Code'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                id={`problem-tab-${value}-button`}
                aria-selected={tab === value}
                aria-controls="problem-panel"
                className="theatre-tab"
                data-testid={`problem-tab-${value}`}
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <TheatreStage
            problemTitle={problem.title}
            videoId={videoId}
            media={media}
            stamps={moments}
            rate={rate}
            topicLabel={topicTitle}
            nextLine={settings.autoAdvance ? nextText : null}
            onNext={() => {
              if (target) navigate('problem', target.problemId)
            }}
            onRate={(next) => setTopicRate(topicId, next)}
            onStamp={(at) => {
              if (at < 0) {
                // "Skip to next stamp": seek to the first stamp ahead of the playhead.
                const ahead = moments.find((moment) => moment.at > live.current + 1) ?? moments[0]
                if (ahead) seekTo(ahead.at)
                else onNotify('No stamps yet', 'Press s or Stamp below the stage to add one.')
                return
              }
              setTab('stamps')
              setComposing(at)
              window.setTimeout(() => document.getElementById('stamp-new')?.focus(), 40)
            }}
            onSkipStamp={() => {
              // "Skip to next stamp": the first stamp ahead of the playhead,
              // else the first one — the same rule as the rail's stamp rows.
              const ahead = moments.find((moment) => moment.at > live.current + 1) ?? moments[0]
              if (ahead) seekTo(ahead.at)
              else onNotify('No stamps yet', 'Press Stamp below the stage to add one.')
            }}
            onNextProblem={() => {
              // `n` and the end-of-video button agree, and both are honest when
              // nothing is queued.
              if (target) navigate('problem', target.problemId)
              else onNotify('Nothing queued yet', 'Add a row to today and it appears as the next problem.')
            }}
            onWatched={(id, percent) => markWatched(id, percent)}
            onDeadLink={() => onNotify('This video cannot be embedded', 'Use Open on YouTube — the row itself is unchanged.')}
            online={online}
            watchFlag={watchedFlag}
          >
            <StatusRail
              problem={problem}
              topicTitle={topicTitle}
              subtopicTitle={subtopicTitle}
              drill={drill}
              progress={progress}
              onSetOutcome={(outcome) => onSetOutcome(topicId, problemId, outcome)}
              onPlan={() => onPlan(problemId)}
              onCode={() => setTab('code')}
              planProblemIds={planProblemIds}
              problemId={problemId}
            />
          </TheatreStage>

          {/* One region for all three tabs: only the selected view is mounted,
              so a per-tab id would leave two dangling `aria-controls` targets. */}
          <div
            className="theatre-panel"
            role="tabpanel"
            id="problem-panel"
            aria-labelledby={`problem-tab-${tab}-button`}
            data-testid={`problem-panel-${tab}`}
          >
            {tab === 'problem' ? (
              <>
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
              </>
            ) : null}
            {tab === 'stamps' ? (
              <StampsList
                stamps={moments}
                disabledReason={
                  signedIn ? null : 'Sign in to save stamps — they ride along with your saved code.'
                }
                currentTime={live.current}
                onSeek={(moment) => seekTo(moment.at)}
                onAdd={(at, text) => {
                  addStamp(at, text)
                  setComposing(null)
                }}
                onDelete={deleteStamp}
              />
            ) : null}
            {tab === 'code' ? (
              <CodePanel
                problemId={problemId}
                problemTitle={problem.title}
                snippet={snippet}
                signedIn={signedIn}
                disabled={codeDisabled}
                sync={codeSync}
                cases={cases}
                onSave={onSaveCode}
                onDelete={() => {
                  if (moments.length > 0 && !snippet?.code.trim() && !snippet?.notes.trim()) {
                    onNotify(
                      'Stamps kept',
                      'Deleting the solution keeps its stamps; clear them in the Stamps tab.',
                    )
                  }
                  onDeleteCode()
                }}
              />
            ) : null}
          </div>
        </div>

        {wide ? (
        <aside className="theatre-rail" aria-label="Problem rail" ref={railRef}>
          <div className="theatre-rail-head">
            <p className="problem-screen-title">{problem.title}</p>
            <p className="quiet-note">
              {subtopicTitle} · {drill ? 'Pattern drill' : problem.kind === 'theory' ? 'Theory' : 'Problem'} ·{' '}
              <span className="num">{problem.lcLabel}</span> ·{' '}
              <Tag tone={problem.lcMatch === 'theory' ? 'info' : 'neutral'}>{problem.lcMatch}</Tag>
            </p>
          </div>
          <StampsList
            stamps={moments}
            disabledReason={signedIn ? null : 'Sign in to save stamps — they ride along with your saved code.'}
            currentTime={live.current}
            onSeek={(moment) => seekTo(moment.at)}
            onAdd={(at, text) => addStamp(at, text)}
            onDelete={deleteStamp}
          />
          <div className="theatre-rail-actions">
            <OutboundAction problem={problem} />
            <Button data-testid="rail-code" onClick={() => setTab('code')}>
              <IconCode size={14} /> Code
            </Button>
            <Button data-testid="rail-today" onClick={() => onPlan(problemId)}>
              Add to today
            </Button>
          </div>
          <AutoAdvanceToggle
            on={settings.autoAdvance}
            nextText={nextText}
            onChange={(on) => {
              setAutoAdvance(on)
              onNotify(on ? 'Auto-advance on' : 'Auto-advance off', on ? 'The end of a video offers the next row.' : 'Nothing will be offered at the end of a video.')
            }}
          />
          <p className="quiet-note theatre-rail-foot">
            Speed {rateLabel(rate)} is remembered for {topicTitle}.
          </p>
        </aside>
        ) : null}
      </div>
    </div>
  )
}

function StatusRail({
  problem,
  topicTitle,
  subtopicTitle,
  drill,
  progress,
  onSetOutcome,
  onPlan,
  onCode,
  planProblemIds,
  problemId,
}: {
  problem: { title: string }
  topicTitle: string
  subtopicTitle: string
  drill: boolean
  progress?: ProblemProgress
  onSetOutcome: (outcome: Outcome) => void
  onPlan: () => void
  onCode: () => void
  planProblemIds: readonly string[]
  problemId: string
}) {
  const done = progress?.s === 'done'
  const outcome = progress?.o ?? 'clean'
  return (
    <div className="theatre-status" data-testid="theatre-status">
      <span className="quiet-note">
        {topicTitle} · {subtopicTitle}
        {drill ? ' · drill' : ''}
      </span>
      <div className="theatre-outcome" role="group" aria-label={`Result for ${problem.title}`}>
        {([
          ['clean', 'Clean'],
          ['hint', 'Hint'],
          ['couldnt', "Couldn't"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`segmented-item${done && outcome === value ? ' is-on' : ''}`}
            aria-pressed={done && outcome === value}
            data-testid={`rail-outcome-${value}`}
            onClick={() => onSetOutcome(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="theatre-status-actions">
        <Button size="sm" variant="ghost" onClick={onCode} data-testid="rail-code-top">
          <IconCode size={13} /> Code
        </Button>
        <Button size="sm" variant="ghost" onClick={onPlan} data-testid="rail-today-top">
          {planProblemIds.includes(problemId) ? 'In today ✓' : 'Add to today'}
        </Button>
      </div>
    </div>
  )
}

/** `↗ Solve on LeetCode` — the single outbound link the rail always offers. */
function OutboundAction({ problem }: { problem: { links: { leetcode?: string } } }) {
  const href = problem.links.leetcode
  return href ? (
    <a className="btn btn-secondary" href={href} target="_blank" rel="noopener noreferrer" data-testid="rail-leetcode">
      Solve on LeetCode <IconExternal size={13} />
    </a>
  ) : (
    <Button disabled data-testid="rail-leetcode">
      No LeetCode twin <IconExternal size={13} />
    </Button>
  )
}

function AutoAdvanceToggle({ on, nextText, onChange }: { on: boolean; nextText: string | null; onChange: (on: boolean) => void }) {
  return (
    <div className="theatre-auto">
      <label className="theatre-auto-label">
        <input type="checkbox" checked={on} data-testid="auto-advance" onChange={(event) => onChange(event.currentTarget.checked)} />
        <span>
          Offer the next problem at the end of a video
          <span className="quiet-note">Default off · {nextText ?? 'nothing queued yet'}</span>
        </span>
      </label>
    </div>
  )
}

/* --- helpers -------------------------------------------------------------- */

/** `#/problem/two-sum?tab=code` opens the Code tab directly (see `./tab`). */
function readTab(): ProblemTab {
  return tabFromHash(typeof window === 'undefined' ? '' : window.location.hash)
}

/**
 * Every catalogue row of one topic, in study order — the "next in this topic"
 * list. Built once per topic id (495 rows are not re-flattened on every
 * keystroke of a stamp draft).
 */
const topicRowsCache = new Map<string, string[]>()
function topicRowIds(topicId: string): string[] {
  const cached = topicRowsCache.get(topicId)
  if (cached) return cached
  const topic: Topic | undefined = catalogue.topics.find((entry) => entry.id === topicId)
  const rows = topic ? topic.subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id)) : []
  topicRowsCache.set(topicId, rows)
  return rows
}

