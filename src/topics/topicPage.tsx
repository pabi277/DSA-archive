import { useMemo, useState, type KeyboardEvent } from 'react'
import { catalogue, type Problem, type Topic } from '../catalogue'
import type { CloudProgressByTopic } from '../cloudProgress'
import { ProblemRow, ageLabel } from '../design/row'
import { Button, Card, Empty, Ring, Tag } from '../design/primitives'
import { revisionQueue } from '../planner'
import { IconArrowLeft, IconArrowRight, IconSpark } from '../design/icons'
import { levelOf } from '../sheet'
import type { Outcome, ProgressByTopic } from '../progress'
import { buildPath, navigate } from '../app/router'
import { learningOrderedSubtopics } from './learnOrder'

export type TopicTab = 'learn' | 'practice' | 'quiz'
export type PracticeFilter = 'all' | 'not-started' | 'shaky' | 'done'

export type TopicPageProps = {
  topicId: string
  tabQuery?: string
  progress: ProgressByTopic
  entries: CloudProgressByTopic
  today: string
  dueCount?: number
  disabled: boolean
  onToggleStatus: (topicId: string, problemId: string) => void
  onToggleBookmark: (topicId: string, problemId: string) => void
  onSetOutcome: (topicId: string, problemId: string, outcome: Outcome) => void
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
            {topic.subtopics.slice(0, 3).map((subtopic) => <Tag key={subtopic.id} tone="neutral">{subtopic.title}</Tag>)}
            {topic.subtopics.length > 3 ? <span className="quiet-note">+{topic.subtopics.length - 3}</span> : null}
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
        {tab === 'learn' ? <LearnPanel topic={topic} onPractice={() => selectTab('practice')} /> : null}
        {tab === 'practice' ? <PracticePanel {...props} topic={topic} /> : null}
        {tab === 'quiz' ? <QuizPanel topic={topic} /> : null}
      </section>

      <nav className="topic-neighbours" aria-label="Adjacent topics">
        {previous ? <a className="btn btn-secondary" href={buildPath('topic', previous.id, { tab })}><IconArrowLeft size={14} /> {previous.title}</a> : <span />}
        {next ? <a className="btn btn-secondary" href={buildPath('topic', next.id, { tab })}>{next.title} <IconArrowRight size={14} /></a> : <span />}
      </nav>
    </div>
  )
}

function LearnPanel({ topic, onPractice }: { topic: Topic; onPractice: () => void }) {
  return (
    <div className="topic-learn-panel">
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
      <Empty title="The primer is being prepared" mark={<IconSpark size={20} />} testId="topic-primer-pending" action={
        <Button variant="primary" onClick={onPractice}>Start with Practice</Button>
      }>
        This topic’s beginner-friendly primer will explain what the idea is, when to use it, a mental model, common mistakes, and a worked example. Until then, you can explore the problems in learning order.
      </Empty>
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

function PracticePanel(props: TopicPageProps & { topic: Topic }) {
  const [filter, setFilter] = useState<PracticeFilter>('all')
  const subtopics = useMemo(() => learningOrderedSubtopics(props.topic), [props.topic])
  const visibleCount = subtopics.reduce((sum, subtopic) => sum + subtopic.problems.filter((problem) => passesFilter(problem, props.topic.id, props.progress, filter)).length, 0)

  return (
    <div className="topic-practice-panel">
      <div className="practice-toolbar">
        <p className="quiet-note">Problems are ordered from fundamentals toward harder ideas.</p>
        <div className="segmented" role="group" aria-label="Filter practice problems">
          {(['all', 'not-started', 'shaky', 'done'] as const).map((item) => (
            <button key={item} type="button" className={filter === item ? 'segmented-item is-on' : 'segmented-item'} aria-pressed={filter === item} onClick={() => setFilter(item)}>
              {item === 'not-started' ? 'Not started' : item === 'shaky' ? 'Shaky' : item === 'all' ? 'All' : 'Done'}
            </button>
          ))}
        </div>
      </div>
      <p className="quiet-note num" data-testid="practice-match-count">{visibleCount} of {props.topic.subtopics.reduce((sum, subtopic) => sum + subtopic.problems.length, 0)} problems</p>
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
                      canEditNotes={false}
                      hasNote={false}
                      listCount={0}
                      onToggleStatus={props.onToggleStatus}
                      onToggleBookmark={props.onToggleBookmark}
                      onSetOutcome={props.onSetOutcome}
                      onOpen={(problemId) => props.onOpenProblem(problemId)}
                      onOpenPanel={() => {}}
                      onPlan={props.onPlan}
                      onFocus={() => {}}
                      listPosition={index + 1}
                      listSize={problems.length}
                      panel={null}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function QuizPanel({ topic }: { topic: Topic }) {
  return (
    <Empty title="Topic quizzes arrive in Phase 05" mark={<IconSpark size={20} />} testId="topic-quiz-pending" action={
      <Button disabled data-testid="topic-quiz-start">Start {topic.title} quiz</Button>
    }>
      No quiz questions have been authored for {topic.title} yet. The quiz engine arrives in Phase 05; this start button stays disabled until questions are ready.
    </Empty>
  )
}
