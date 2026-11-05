import { useMemo, useState, type KeyboardEvent } from 'react'
import { catalogue, type Problem, type Topic } from '../catalogue'
import type { CloudProgressByTopic } from '../cloudProgress'
import { ProblemRow, ageLabel } from '../design/row'
import { Button, Card, Empty, Ring, SegmentedControl, Tag } from '../design/primitives'
import { revisionQueue } from '../planner'
import { IconArrowLeft, IconArrowRight, IconSpark } from '../design/icons'
import { contentCoverage, getQuiz, getTheoryMcq, getTheoryMcqCount, getTopicContent, getTopicPatterns } from '../content/load'
import { PrimerView } from '../content/primer'
import { drillsForTopic, type Drill } from '../content/practice'
import { levelOf } from '../sheet'
import { isDone, type Outcome, type ProgressByTopic } from '../progress'
import { buildPath, navigate, openHref } from '../app/router'
import type { SnippetsById } from '../code/codeStore'
import { QUIZ_TARGET_COUNT, quizPassMark } from '../quiz/engine'
import { TheoryMcqCard } from '../quiz/mcqCard'
import type { QuizResult } from '../quiz/results'
import { learningOrderedSubtopics } from './learnOrder'
import type { Reason } from '../insights/reasons'

export type TopicTab = 'learn' | 'practice' | 'quiz'
export type PracticeFilter = 'all' | 'not-started' | 'shaky' | 'done'

export type TopicPageProps = {
  topicId: string
  /** Saved solutions, for the `⌨ has code` row badge (v2-04). */
  snippets?: SnippetsById
  tabQuery?: string
  sectionQuery?: string
  quizResult?: QuizResult
  progress: ProgressByTopic
  entries: CloudProgressByTopic
  today: string
  dueCount?: number
  /** Phase v2-08 reason chips for this topic's rows (empty when none apply). */
  reasons?: Record<string, Reason[]>
  disabled: boolean
  onToggleStatus: (topicId: string, problemId: string) => void
  onToggleBookmark: (topicId: string, problemId: string) => void
  onSetOutcome: (topicId: string, problemId: string, outcome: Outcome) => void
  onMarkDoneWithOutcome: (topicId: string, problemId: string, outcome: Outcome) => void
  onOpenProblem: (problemId: string) => void
  onPlan: (problemId: string) => void
}

function validTab(value?: string): TopicTab {
  return value === 'practice' || value === 'quiz' ? value : 'learn'
}

function topicCounts(topic: Topic, progress: ProgressByTopic) {
  const rows = topic.subtopics.flatMap((subtopic) => subtopic.problems)
  const shard = progress[topic.id] ?? {}
  const outcomes = { clean: 0, hint: 0, couldnt: 0 }
  let learned = 0
  for (const problem of rows) {
    const entry = shard[problem.id]
    if (entry?.s !== 'done') continue
    const outcome = entry.o ?? 'clean'
    outcomes[outcome] += 1
    if (outcome === 'clean') learned += 1
  }
  const levels = { basic: 0, core: 0, pro: 0, ungraded: 0 }
  for (const problem of rows) levels[levelOf(problem)] += 1
  return { total: rows.length, learned, outcomes, levels }
}

export function topicPageValue(topicId: string, progress: ProgressByTopic) {
  const topic = catalogue.topics.find((item) => item.id === topicId) ?? null
  if (!topic) return null
  return { topic, counts: topicCounts(topic, progress) }
}

export function TopicPage(props: TopicPageProps) {
  const value = topicPageValue(props.topicId, props.progress)
  if (!value) {
    return (
      <Empty title="That topic does not exist" mark="?" testId="topic-missing" action={
        <a className="btn btn-primary" href={buildPath('topics')}>Browse all 20 topics</a>
      }>
        <code>{props.topicId}</code> is not one of the topics in this archive.
      </Empty>
    )
  }

  const { topic, counts } = value
  const dueCount = revisionQueue(props.entries, props.today).due.filter((item) => item.topicId === topic.id).length
  const tab = validTab(props.tabQuery)
  const orderedTopics = [...catalogue.topics].sort((a, b) => a.order - b.order)
  const topicIndex = orderedTopics.findIndex((item) => item.id === topic.id)
  const previous = orderedTopics[topicIndex - 1]
  const next = orderedTopics[topicIndex + 1]

  const selectTab = (nextTab: TopicTab) => navigate('topic', topic.id, { tab: nextTab })
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const keys = ['learn', 'practice', 'quiz'] as const
    const index = keys.indexOf(tab)
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % keys.length
      : event.key === 'ArrowLeft' ? (index + keys.length - 1) % keys.length : -1
    if (nextIndex < 0) return
    event.preventDefault()
    selectTab(keys[nextIndex])
    requestAnimationFrame(() => document.getElementById(`topic-tab-${keys[nextIndex]}`)?.focus())
  }

  return (
    <div className="topic-page" data-testid="topic-page">
      <div className="topic-page-heading">
        <div>
          <a className="back-link" href={buildPath('topics')}><IconArrowLeft size={14} /> All topics</a>
          <h2 className="topic-page-title">{topic.title}</h2>
          <p className="quiet-note num">
            {counts.total} problems · {counts.levels.basic} Basic · {counts.levels.core} Core · {counts.levels.pro} Pro · {counts.levels.ungraded} ungraded
          </p>
          <p className="quiet-note" data-testid="topic-outcome-summary">
            {counts.outcomes.clean} clean · {counts.outcomes.hint} hints · {counts.outcomes.couldnt} couldn’t · {dueCount} due
          </p>
          <div className="topic-patterns topic-page-patterns" aria-label="Patterns">
            {getTopicPatterns(topic.id).map((pattern) => <Tag key={pattern} tone="neutral">{pattern}</Tag>)}
          </div>
        </div>
        <Ring value={counts.learned} total={counts.total} size={56} thickness={5} label={`${topic.title}: ${counts.learned} confidently learned of ${counts.total}`} />
      </div>

      <nav className="topic-tabs" role="tablist" aria-label={`${topic.title} sections`}>
        {(['learn', 'practice', 'quiz'] as const).map((item) => (
          <button
            key={item}
            id={`topic-tab-${item}`}
            type="button"
            role="tab"
            aria-selected={tab === item}
            aria-controls={`topic-panel-${item}`}
            tabIndex={tab === item ? 0 : -1}
            className={tab === item ? 'topic-tab is-active' : 'topic-tab'}
            onClick={() => selectTab(item)}
            onKeyDown={onTabKeyDown}
          >
            {item === 'learn' ? 'Learn' : item === 'practice' ? 'Practice' : 'Quiz'}
          </button>
        ))}
      </nav>

      <section id={`topic-panel-${tab}`} role="tabpanel" aria-labelledby={`topic-tab-${tab}`} className="topic-tab-panel" tabIndex={0}>
        {tab === 'learn' ? <LearnPanel topic={topic} activeSectionId={props.sectionQuery} onPractice={() => selectTab('practice')} /> : null}
        {tab === 'practice' ? <PracticePanel {...props} topic={topic} /> : null}
        {tab === 'quiz' ? <QuizPanel topic={topic} quizResult={props.quizResult} /> : null}
      </section>

      <nav className="topic-neighbours" aria-label="Adjacent topics">
        {previous ? <a className="btn btn-secondary" href={buildPath('topic', previous.id, { tab })}><IconArrowLeft size={14} /> {previous.title}</a> : <span />}
        {next ? <a className="btn btn-secondary" href={buildPath('topic', next.id, { tab })}>{next.title} <IconArrowRight size={14} /></a> : <span />}
      </nav>
    </div>
  )
}

function LearnPanel({ topic, activeSectionId, onPractice }: { topic: Topic; activeSectionId?: string; onPractice: () => void }) {
  return (
    <div className="topic-learn-panel">
      <PrimerView topicId={topic.id} topicTitle={topic.title} activeSectionId={activeSectionId} />
      <Card title="Your learning path">
        <ol className="topic-order">
          {learningOrderedSubtopics(topic).map((subtopic, index) => (
            <li key={subtopic.id}>
              <span className="num topic-order-rank">{index + 1}</span>
              <span><strong>{subtopic.title}</strong><span className="quiet-note"> · {subtopic.problems.length} rows</span></span>
            </li>
          ))}
        </ol>
      </Card>
      <Button variant="primary" onClick={onPractice} data-testid="topic-practice-cta">Start with Practice</Button>
    </div>
  )
}

function passesFilter(problem: Problem, topicId: string, progress: ProgressByTopic, filter: PracticeFilter) {
  const row = progress[topicId]?.[problem.id]
  if (filter === 'all') return true
  if (filter === 'not-started') return !row || (row.s !== 'done' && !row.b)
  if (filter === 'done') return row?.s === 'done'
  return row?.s === 'done' && (row.o ?? 'clean') !== 'clean'
}

type PracticeView = 'core' | 'drills'

function PracticePanel(props: TopicPageProps & { topic: Topic }) {
  const [filter, setFilter] = useState<PracticeFilter>('all')
  const [view, setView] = useState<PracticeView>('core')
  const [expandedTheoryId, setExpandedTheoryId] = useState<string | null>(null)
  const subtopics = useMemo(() => learningOrderedSubtopics(props.topic), [props.topic])
  const primerSection = getTopicContent(props.topic.id)?.sections[0] ?? null
  const total = props.topic.subtopics.reduce((sum, subtopic) => sum + subtopic.problems.length, 0)
  const visibleCount = subtopics.reduce((sum, subtopic) => sum + subtopic.problems.filter((problem) => passesFilter(problem, props.topic.id, props.progress, filter)).length, 0)
  const drills = drillsForTopic(props.topic.id)

  return (
    <div className="topic-practice-panel">
      <div className="practice-toolbar">
        <p className="quiet-note">Problems are ordered from fundamentals toward harder ideas.</p>
        <SegmentedControl
          label="Practice source"
          value={view}
          options={[
            { value: 'core', label: 'Core sheet', testId: 'practice-view-core' },
            { value: 'drills', label: `Drills (${drills.length})`, testId: 'practice-view-drills' },
          ]}
          onChange={setView}
        />
        {view === 'core' ? (
          <div className="segmented" role="group" aria-label="Filter practice problems">
            {(['all', 'not-started', 'shaky', 'done'] as const).map((item) => (
              <button key={item} type="button" className={filter === item ? 'segmented-item is-on' : 'segmented-item'} aria-pressed={filter === item} onClick={() => setFilter(item)}>
                {item === 'not-started' ? 'Not started' : item === 'shaky' ? 'Shaky' : item === 'all' ? 'All' : 'Done'}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {view === 'core' ? (
        <>
          <p className="quiet-note num" data-testid="practice-match-count">{visibleCount} of {total} problems</p>
          {visibleCount === 0 ? <Empty title="No problems in this filter">Try another practice filter.</Empty> : null}
          <div className="topic-practice-list">
            {subtopics.map((subtopic) => {
              const problems = subtopic.problems.filter((problem) => passesFilter(problem, props.topic.id, props.progress, filter))
              if (problems.length === 0) return null
              return (
                <section key={subtopic.id} aria-label={subtopic.title}>
                  <h3 className="subtopic-title">{subtopic.title}</h3>
                  <div role="list" aria-label={`${subtopic.title} practice problems`}>
                    {problems.map((problem, index) => {
                      const entry = props.entries[props.topic.id]?.[problem.id]
                      const isTheoryOpen = problem.kind === 'theory' && expandedTheoryId === problem.id
                      const mcq = isTheoryOpen ? getTheoryMcq(problem.id) : null
                      return (
                        <ProblemRow
                          key={problem.id}
                          topicId={props.topic.id}
                          topicTitle={props.topic.title}
                          problem={problem}
                          progress={props.progress}
                          disabled={props.disabled}
                          revealed={false}
                          focused={false}
                          age={ageLabel(entry?.lr ?? entry?.fd, props.today)}
                          canEditCode={false}
                          hasCode={Boolean(props.snippets?.[problem.id])}
                          listCount={0}
                          reason={props.reasons?.[problem.id]?.[0]?.text ?? null}
                          theoryExpanded={isTheoryOpen}
                          onToggleStatus={props.onToggleStatus}
                          onToggleBookmark={props.onToggleBookmark}
                          onSetOutcome={props.onSetOutcome}
                          onOpen={(problemId) => props.onOpenProblem(problemId)}
                          onOpenPanel={(problemId, kind) => {
                            if (kind === 'theory') {
                              setExpandedTheoryId((current) => (current === problemId ? null : problemId))
                            }
                          }}
                          onPlan={props.onPlan}
                          onFocus={() => {}}
                          listPosition={index + 1}
                          listSize={problems.length}
                          panel={
                            mcq ? (
                              <TheoryMcqCard
                                mcq={mcq}
                                topicTitle={props.topic.title}
                                progress={props.progress[props.topic.id]?.[problem.id]}
                                rereadSection={primerSection ? { id: primerSection.id, title: primerSection.title } : null}
                                onMarkClean={() => props.onMarkDoneWithOutcome(props.topic.id, problem.id, 'clean')}
                                onMarkReadWithHint={() => props.onMarkDoneWithOutcome(props.topic.id, problem.id, 'hint')}
                              />
                            ) : null
                          }
                        />
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </>
      ) : (
        <DrillsPanel
          drills={drills}
          progress={props.progress}
          topicId={props.topic.id}
          disabled={props.disabled}
          onToggle={(drill) => props.onToggleStatus(props.topic.id, drill.id)}
          onPlan={(drill) => props.onPlan(drill.id)}
          onOpen={(drill) => props.onOpenProblem(drill.id)}
        />
      )}
    </div>
  )
}

function DrillsPanel({
  drills,
  progress,
  topicId,
  disabled,
  onToggle,
  onPlan,
  onOpen,
}: {
  drills: Drill[]
  progress: ProgressByTopic
  topicId: string
  disabled: boolean
  onToggle: (drill: Drill) => void
  onPlan: (drill: Drill) => void
  onOpen: (drill: Drill) => void
}) {
  if (drills.length === 0) {
    return (
      <Empty title="No drills for this topic yet" mark="?" testId="topic-drills-empty">
        The pattern grid on <code>#/practice</code> lists every authored drill. Core sheet rows remain available.
      </Empty>
    )
  }
  return (
    <div className="drill-panel" data-testid="topic-drills-panel">
      <p className="quiet-note num" data-testid="topic-drill-count">{drills.length} synthetic drills · lc-&lt;n&gt; · no new collection</p>
      <ol className="drill-list">
        {drills.map((drill) => {
          const done = isDone(progress, topicId, drill.id)
          return (
            <li key={drill.id} className="drill-row" data-testid={`topic-drill-${drill.id}`}>
              <div className="drill-row-main">
                <strong>{drill.patternTitle} · set {drill.set} · {drill.title}</strong>
                <span className="quiet-note">{drill.why} · ~{drill.estMinutes} min · LeetCode {drill.lc}</span>
              </div>
              <div className="drill-actions">
                <Button size="sm" disabled={disabled} aria-pressed={done} onClick={() => onToggle(drill)}>
                  {done ? 'Done ✓' : 'Mark done'}
                </Button>
                <a className="btn btn-secondary btn-sm" href={drill.url} target="_blank" rel="noopener noreferrer">↗ LeetCode</a>
                <Button size="sm" disabled={disabled} onClick={() => onPlan(drill)}>+ Today</Button>
                <Button size="sm" onClick={() => onOpen(drill)}>Detail</Button>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function QuizPanel({ topic, quizResult }: { topic: Topic; quizResult?: QuizResult }) {
  const authored = getQuiz(topic.id).length
  const theory = getTheoryMcqCount(topic.id)
  const bank = contentCoverage().quizItems
  if (authored === 0) {
    return (
      <Empty
        title="Coming soon — 12-item bank in authoring"
        mark={<IconSpark size={20} />}
        testId="topic-quiz-pending"
        action={
          <Button disabled data-testid="topic-quiz-start">
            Start {topic.title} quiz
          </Button>
        }
      >
        <span data-testid="topic-quiz-count">
          {authored}/12 topic quiz items · {theory} theory MCQs · {bank}/240 bank items
        </span>
        . {theory > 0 ? 'Concept checks are already live under Practice.' : 'This topic quiz bank is in the authoring queue.'}
      </Empty>
    )
  }

  const passMark = quizPassMark(authored)
  const incomplete = authored < QUIZ_TARGET_COUNT
  const nextSeed = quizResult?.attempts ?? 0

  return (
    <Card
      title={`${topic.title} check`}
      action={
        quizResult ? (
          <Tag tone={quizResult.passed ? 'success' : 'caution'}>
            {quizResult.passed
              ? `Quiz ✓ ${quizResult.bestScore}/${quizResult.bestTotal}`
              : `Best ${quizResult.bestScore}/${quizResult.bestTotal}`}
          </Tag>
        ) : (
          <Tag tone="neutral">Not taken</Tag>
        )
      }
      data-testid="topic-quiz-ready"
    >
      <p className="quiet-note num" data-testid="topic-quiz-count">
        {authored}/12 topic quiz items · {theory} theory MCQs · {bank}/240 bank items · pass mark {passMark}/{authored} (≥80%)
        {incomplete ? ' · bank incomplete' : ''}
      </p>
      {quizResult ? (
        <p className="quiet-note num">
          Attempts: {quizResult.attempts} · last score {quizResult.lastScore}/{quizResult.bestTotal}. Retaking shuffles the question order.
        </p>
      ) : (
        <p className="quiet-note">
          4-minute check: instant per-option explanations after every submit, with primer links on anything you miss.
        </p>
      )}
      <div className="inline-actions">
        <Button
          variant="primary"
          data-testid="topic-quiz-start"
          onClick={() =>
            openHref(buildPath('quiz', topic.id, nextSeed > 0 ? { seed: String(nextSeed) } : {}))
          }
        >
          {quizResult ? `Retake ${topic.title} quiz` : `Start ${topic.title} quiz`}
        </Button>
        <a className="btn btn-secondary" href={buildPath('quiz')}>
          All quizzes
        </a>
      </div>
    </Card>
  )
}
