/**
 * `#/search` — the sheet, re-chromed for v2 (phase v2-01 §3.6 + §3.12).
 *
 * Everything the v1 sheet could do still works (search, topic/level/link
 * filters, list filter, random pick, weakest-topic hint, note/list panels). What
 * changes is the shell around it: the query lives in the URL, rows use the v2
 * anatomy (`src/design/row.tsx`), and only a *window* of rows is mounted per open
 * topic.
 *
 * Windowing (acceptance #12): all topics closed ⇒ zero rows in the DOM; an open
 * topic mounts its first `WINDOW_SIZE` rows plus one "Show more rows" control.
 * A revealed row (random pick, deep link from Today) forces its own window open,
 * so nothing targetable is ever missing.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { catalogue, summarizeCatalogue } from '../catalogue'
import { tallyCatalogue, tallyTopic, type ProgressByTopic } from '../progress'
import {
  LEVEL_FILTERS,
  LEVEL_LABELS,
  LINK_FILTERS,
  LINK_LABELS,
  activeFilterCount,
  type FilteredTopic,
  type FilteredSheet,
  type LevelFilter,
  type LinkFilter,
  type RandomPick,
  type SheetQuery,
} from '../sheet'
import { ProblemRow, ageLabel } from '../design/row'
import { setTriageFocus } from './triage'
import { Button, Chip, Empty, Ring, Tag } from '../design/primitives'
import { IconChevron, IconClose, IconFilter, IconSearch } from '../design/icons'
import type { CloudProgressByTopic } from '../cloudProgress'
import { sortLists, type CustomList, type ListsById, type NotesById } from '../library'
import { locateProblem } from '../library'

export const WINDOW_SIZE = 40

const summary = summarizeCatalogue()

export function SheetScreen({
  filters,
  onFiltersChange,
  query,
  sheet,
  progress,
  entries,
  today,
  progressDisabled,
  openTopics,
  onToggleTopic,
  onClearAll,
  randomPick,
  revealed,
  onRandomPick,
  onDismissPick,
  rowPanel,
  onTogglePanel,
  renderPanel,
  notes,
  lists,
  signedIn,
  onToggleStatus,
  onToggleBookmark,
  onOpenProblem,
  onPlan,
  searchSignal,
  triageFocus,
  children,
}: {
  filters: Omit<SheetQuery, 'hideDone' | 'listProblemIds'>
  onFiltersChange: (next: Omit<SheetQuery, 'hideDone' | 'listProblemIds'>) => void
  query: SheetQuery
  sheet: FilteredSheet
  progress: ProgressByTopic
  entries: CloudProgressByTopic
  today: string
  progressDisabled: boolean
  openTopics: ReadonlySet<string>
  onToggleTopic: (topicId: string, open: boolean) => void
  onClearAll: () => void
  randomPick: RandomPick | null
  revealed: string | null
  onRandomPick: () => void
  onDismissPick: () => void
  rowPanel: { problemId: string; kind: 'note' | 'lists' } | null
  onTogglePanel: (problemId: string, kind: 'note' | 'lists') => void
  renderPanel: (problemId: string, kind: 'note' | 'lists') => ReactNode
  notes: NotesById
  lists: ListsById
  signedIn: boolean
  onToggleStatus: (topicId: string, problemId: string) => void
  onToggleBookmark: (topicId: string, problemId: string) => void
  onOpenProblem: (problemId: string) => void
  onPlan: (problemId: string) => void
  searchSignal: number
  triageFocus: string | null
  children?: ReactNode
}) {
  const searchRef = useRef<HTMLInputElement>(null)
  const filterCount = activeFilterCount(query)
  const listChoices = useMemo(() => sortLists(lists), [lists])
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const activeList: CustomList | null = activeListId ? (lists[activeListId] ?? null) : null

  // `/` and the palette bump `searchSignal` to put the caret in this field.
  useEffect(() => {
    if (searchSignal === 0) return
    searchRef.current?.focus()
    searchRef.current?.select()
  }, [searchSignal])

  // A deep link (`#/problem/<id>` in the palette, a Today row, an undo focus)
  // must land on a visible row: open its topic once per reveal.
  const autoOpened = useRef<string | null>(null)
  useEffect(() => {
    if (!revealed || autoOpened.current === revealed) return
    autoOpened.current = revealed
    const owner = sheet.topics.find((topic) =>
      topic.subtopics.some((subtopic) => subtopic.problems.some((problem) => problem.id === revealed)),
    )
    if (owner && !openTopics.has(owner.id)) onToggleTopic(owner.id, true)
  }, [revealed, sheet.topics, openTopics, onToggleTopic])

  const toggleLevel = (level: LevelFilter) =>
    onFiltersChange({
      ...filters,
      levels: filters.levels.includes(level)
        ? filters.levels.filter((entry) => entry !== level)
        : [...filters.levels, level],
    })

  const toggleLink = (link: LinkFilter) =>
    onFiltersChange({
      ...filters,
      linkTypes: filters.linkTypes.includes(link)
        ? filters.linkTypes.filter((entry) => entry !== link)
        : [...filters.linkTypes, link],
    })

  return (
    <div className="sheet-screen" data-triage="sheet">
      <div className="toolbar">
        <div className="search-field">
          <IconSearch size={16} />
          <input
            ref={searchRef}
            type="search"
            value={filters.search}
            placeholder="Search 495 rows by title, subtopic or topic"
            aria-label="Search problems"
            data-testid="sheet-search"
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          />
          {filters.search !== '' && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => onFiltersChange({ ...filters, search: '' })}
            >
              <IconClose size={14} />
            </button>
          )}
        </div>
        <Button onClick={onRandomPick} data-testid="random-pick">
          Random pick
        </Button>
        {filterCount > 0 && (
          <Button onClick={onClearAll} data-testid="clear-all">
            Clear {filterCount} filter{filterCount === 1 ? '' : 's'}
          </Button>
        )}
      </div>

      <div className="filter-row">
        <div className="chip-group" role="group" aria-label="Filter by level">
          {LEVEL_FILTERS.map((level) => (
            <Chip
              key={level}
              on={filters.levels.includes(level)}
              onClick={() => toggleLevel(level)}
              data-testid={`level-chip-${level}`}
            >
              {LEVEL_LABELS[level]}
            </Chip>
          ))}
        </div>
        <div className="chip-group" role="group" aria-label="Filter by link type">
          {LINK_FILTERS.map((linkType) => (
            <Chip
              key={linkType}
              on={filters.linkTypes.includes(linkType)}
              onClick={() => toggleLink(linkType)}
              data-testid={`link-chip-${linkType}`}
            >
              {LINK_LABELS[linkType]}
            </Chip>
          ))}
        </div>
        <label className="select-wrap">
          <span className="visually-hidden">Filter by topic</span>
          <select
            className="select-field"
            aria-label="Filter by topic"
            value={filters.topicId}
            onChange={(event) => onFiltersChange({ ...filters, topicId: event.target.value })}
          >
            <option value="">All 20 topics</option>
            {catalogue.topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
        </label>
        {listChoices.length > 0 && (
          <div className="chip-group" role="group" aria-label="Filter by list">
            {listChoices.map((list) => (
              <Chip
                key={list.id}
                on={activeListId === list.id}
                data-testid={`list-chip-${list.id}`}
                onClick={() => setActiveListId((current) => (current === list.id ? null : list.id))}
              >
                List · {list.title} ({list.problemIds.length})
              </Chip>
            ))}
          </div>
        )}
      </div>

      <p className="quiet-note" data-testid="match-count">
        Showing {sheet.matchCount} of {sheet.totalCount} problems across {sheet.topics.length} of{' '}
        {sheet.topicCount} topics
        {filterCount > 0 ? ` · ${filterCount} filter${filterCount === 1 ? '' : 's'} on` : ''}
        {activeList ? ` · list “${activeList.title}”` : ''}
        {filters.search.trim() === '' ? ' · press / to search' : ''}
      </p>

      {randomPick && (
        <div className="banner banner-action" role="status" data-testid="random-notice">
          <div className="banner-copy">
            <strong>Random pick · {randomPick.problem.title}</strong>
            <span>
              {randomPick.topicTitle} · {LEVEL_LABELS[randomPick.problem.level ?? 'ungraded']}
            </span>
          </div>
          <div className="banner-actions">
            <Button size="sm" onClick={onRandomPick}>
              Pick another
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismissPick}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {sheet.topics.length === 0 ? (
        <Empty
          title="No matching problems"
          mark={<IconFilter size={20} />}
          testId="sheet-empty"
          action={
            <Button variant="primary" onClick={onClearAll}>
              Clear search and filters
            </Button>
          }
        >
          Nothing in the {summary.problemCount}-row sheet matches
          {filters.search.trim() !== '' ? ` “${filters.search.trim()}”` : ' those filters'}.
        </Empty>
      ) : (
        <>
          {children}
          <div className="topic-list" data-testid="topic-list">
          {sheet.topics.map((topic) => (
            <TopicGroup
              key={topic.id}
              topic={topic}
              open={openTopics.has(topic.id) || filters.search.trim() !== ''}
              onToggle={(open) => onToggleTopic(topic.id, open)}
              progress={progress}
              entries={entries}
              today={today}
              progressDisabled={progressDisabled}
              revealed={revealed}
              rowPanel={rowPanel}
              onTogglePanel={onTogglePanel}
              renderPanel={renderPanel}
              notes={notes}
              lists={lists}
              signedIn={signedIn}
              onToggleStatus={onToggleStatus}
              onToggleBookmark={onToggleBookmark}
              onOpenProblem={onOpenProblem}
              onPlan={onPlan}
              triageFocus={triageFocus}
            />
          ))}
          </div>
        </>
      )}
    </div>
  )
}

function TopicGroup({
  topic,
  open,
  onToggle,
  progress,
  entries,
  today,
  progressDisabled,
  revealed,
  rowPanel,
  onTogglePanel,
  renderPanel,
  notes,
  lists,
  signedIn,
  onToggleStatus,
  onToggleBookmark,
  onOpenProblem,
  onPlan,
  triageFocus,
}: {
  topic: FilteredTopic
  open: boolean
  onToggle: (open: boolean) => void
  progress: ProgressByTopic
  entries: CloudProgressByTopic
  today: string
  progressDisabled: boolean
  revealed: string | null
  rowPanel: { problemId: string; kind: 'note' | 'lists' } | null
  onTogglePanel: (problemId: string, kind: 'note' | 'lists') => void
  renderPanel: (problemId: string, kind: 'note' | 'lists') => ReactNode
  notes: NotesById
  lists: ListsById
  signedIn: boolean
  onToggleStatus: (topicId: string, problemId: string) => void
  onToggleBookmark: (topicId: string, problemId: string) => void
  onOpenProblem: (problemId: string) => void
  onPlan: (problemId: string) => void
  triageFocus: string | null
}) {
  const total = topic.subtopics.reduce((sum, subtopic) => sum + subtopic.problems.length, 0)


  const revealedIndex = useMemo(() => {
    if (!revealed) return -1
    let index = 0
    for (const subtopic of topic.subtopics) {
      for (const problem of subtopic.problems) {
        if (problem.id === revealed) return index
        index += 1
      }
    }
    return -1
  }, [revealed, topic.subtopics])

  const [windowSize, setWindowSize] = useState(WINDOW_SIZE)
  useEffect(() => {
    if (revealedIndex >= windowSize) {
      setWindowSize(Math.ceil((revealedIndex + 1) / WINDOW_SIZE) * WINDOW_SIZE)
    }
  }, [revealedIndex, windowSize])

  const visible = useMemo(() => {
    const out: { id: string; title: string; problems: typeof topic.subtopics[number]['problems'] }[] = []
    let index = 0
    for (const subtopic of topic.subtopics) {
      const problems = []
      for (const problem of subtopic.problems) {
        if (index < windowSize) problems.push(problem)
        index += 1
      }
      if (problems.length > 0) out.push({ id: subtopic.id, title: subtopic.title, problems })
    }
    return out
  }, [topic.subtopics, windowSize])

  const remaining = Math.max(0, total - windowSize)

  return (
    <details
      id={`topic-${topic.id}`}
      className="topic-card"
      open={open}
    >
      <summary
        onClick={(event) => {
          // React owns the controlled open state; cancel the native toggle so it
          // cannot race the state update and close the disclosure again.
          event.preventDefault()
          onToggle(!open)
        }}
      >
        <span className="topic-chevron" aria-hidden="true">
          <IconChevron size={16} />
        </span>
        <span className="topic-name">{topic.title}</span>
        <span className="topic-count num" data-testid={`topic-count-${topic.id}`}>
          {topic.done}/{topic.total}
          {topic.matchCount !== total ? ` · ${topic.matchCount} shown` : ''}
        </span>
        <span className="topic-ring">
          <Ring value={topic.done} total={topic.total} size={34} thickness={3} />
        </span>
      </summary>
      {/* Rows mount only while the topic is open: 495 rows never sit in the DOM
          behind a closed <details>, which is the whole point of §3.12. */}
      {open ? (
      <div className="topic-body">
        {visible.map((subtopic) => (
          <section key={subtopic.id} aria-labelledby={`subtopic-${subtopic.id}`}>
            <h2 className="subtopic-title" id={`subtopic-${subtopic.id}`}>
              {subtopic.title}
            </h2>
            {subtopic.problems.map((problem) => {
              const panelKind = rowPanel?.problemId === problem.id ? rowPanel.kind : null
              const entry = entries[topic.id]?.[problem.id]
              return (
                <ProblemRow
                  key={problem.id}
                  topicId={topic.id}
                  topicTitle={topic.title}
                  problem={problem}
                  progress={progress}
                  disabled={progressDisabled}
                  revealed={revealed === problem.id}
                  focused={triageFocus === problem.id}
                  age={ageLabel(entry?.lr ?? entry?.fd ?? null, today)}
                  canEditNotes={signedIn}
                  hasNote={Boolean(notes[problem.id])}
                  listCount={Object.values(lists).filter((list) => list.problemIds.includes(problem.id)).length}
                  onToggleStatus={onToggleStatus}
                  onToggleBookmark={onToggleBookmark}
                  onOpen={(problemId, mode) => (mode === 'problem' ? onOpenProblem(problemId) : onOpenProblem(problemId))}
                  onOpenPanel={(problemId) => onTogglePanel(problemId, 'note')}
                  onPlan={onPlan}
                  onFocus={(problemId) => setTriageFocus(problemId)}
                  panel={panelKind ? renderPanel(problem.id, panelKind) : null}
                />
              )
            })}
          </section>
        ))}
        {remaining > 0 ? (
          <button
            type="button"
            className="window-more"
            data-testid={`window-more-${topic.id}`}
            onClick={() => setWindowSize((size) => size + WINDOW_SIZE)}
          >
            <span>
              Show {Math.min(remaining, WINDOW_SIZE)} more {remaining === 1 ? 'row' : 'rows'}
            </span>
            <span className="window-more-note num">
              {remaining} of {total} still folded
            </span>
          </button>
        ) : null}
      </div>
      ) : null}
    </details>
  )
}

/** Whole-topic tally for context rails (`done/total`, ring value). */
export function topicRingValue(progress: ProgressByTopic, topicId: string) {
  const topic = catalogue.topics.find((entry) => entry.id === topicId)
  if (!topic) return { done: 0, total: 0, percent: 0, title: topicId }
  const tally = tallyTopic(progress, topic)
  return { done: tally.done, total: tally.total, percent: tally.percent, title: topic.title }
}

export function sheetTally(progress: ProgressByTopic) {
  return tallyCatalogue(progress)
}

/** Deep link target for a row: its topic id, or null when unknown. */
export function topicOfProblem(problemId: string) {
  return locateProblem(problemId)?.topicId ?? null
}

export { Tag }
