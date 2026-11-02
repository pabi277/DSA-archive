import { useEffect, useMemo, useRef, useState } from 'react'
import { catalogue, summarizeCatalogue } from './catalogue'
import { clearProgress, tallyCatalogue, useProgress } from './progress'
import { toggleHideDone, toggleLargeText, toggleTheme, useSettings } from './settings'
import {
  LEVEL_FILTERS,
  LEVEL_LABELS,
  LINK_FILTERS,
  LINK_LABELS,
  activeFilterCount,
  applySheetQuery,
  levelOf,
  pickRandom,
  weakestTopic,
  type LevelFilter,
  type LinkFilter,
  type RandomPick,
  type SheetQuery,
} from './sheet'
import { TopicAccordion } from './SheetList'

const summary = summarizeCatalogue()
const levelSplit = LEVEL_FILTERS.map((level) => `${LEVEL_LABELS[level]} ${summary.levels[level] ?? 0}`).join(' · ')

type Filters = Omit<SheetQuery, 'hideDone'>
const noFilters: Filters = { search: '', topicId: '', levels: [], linkTypes: [] }

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView?.({ block: 'center' })
}

function chipClass(on: boolean) {
  return on ? 'chip is-on' : 'chip'
}

/**
 * Phase 1 sheet core (roadmap 1.1–1.3): the whole catalogue in topic/subtopic
 * accordions, browsable signed out, with instant search, topic/level/link-type
 * filters, hide-done, a random pick and a weakest-topic hint. Rows link out;
 * progress is local until phase 2 (`src/progress.ts`).
 */
export function App() {
  const progress = useProgress()
  const settings = useSettings()
  const [filters, setFilters] = useState<Filters>(noFilters)
  const [openTopics, setOpenTopics] = useState<ReadonlySet<string>>(() => new Set())
  const [pick, setPick] = useState<RandomPick | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [scrollTarget, setScrollTarget] = useState<{ id: string; nonce: number } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const scrollNonce = useRef(0)

  const query = useMemo<SheetQuery>(
    () => ({ ...filters, hideDone: settings.hideDone }),
    [filters, settings.hideDone],
  )
  const sheet = useMemo(() => applySheetQuery(query, progress), [query, progress])
  const tally = useMemo(() => tallyCatalogue(progress), [progress])
  const hint = useMemo(() => weakestTopic(progress), [progress])
  const filterCount = activeFilterCount(query)

  // Search narrows instantly: expand every topic that still has matches. The
  // dependency is the *signature* of matching topic ids, so ticking a row done
  // never re-expands a topic the user just collapsed.
  const openSignature = sheet.filtering ? sheet.topics.map((topic) => topic.id).join('|') : ''
  useEffect(() => {
    if (!sheet.filtering) return
    setOpenTopics(new Set(openSignature.split('|').filter(Boolean)))
  }, [openSignature, sheet.filtering])

  useEffect(() => {
    if (scrollTarget) scrollToId(scrollTarget.id)
  }, [scrollTarget])

  // Desktop keyboard shortcut: "/" focuses search (0-D component inventory).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // The nonce makes the scroll effect re-run when the same row is picked twice.
  const focus = (id: string) => {
    scrollNonce.current += 1
    setScrollTarget({ id, nonce: scrollNonce.current })
  }

  const toggleLevel = (level: LevelFilter) =>
    setFilters((current) => ({
      ...current,
      levels: current.levels.includes(level)
        ? current.levels.filter((entry) => entry !== level)
        : [...current.levels, level],
    }))

  const toggleLinkType = (linkType: LinkFilter) =>
    setFilters((current) => ({
      ...current,
      linkTypes: current.linkTypes.includes(linkType)
        ? current.linkTypes.filter((entry) => entry !== linkType)
        : [...current.linkTypes, linkType],
    }))

  const clearFilters = () => {
    setFilters(noFilters)
    if (settings.hideDone) toggleHideDone()
    setPick(null)
    setRevealed(null)
  }

  const openTopic = (topicId: string) => {
    setFilters(noFilters)
    setPick(null)
    setRevealed(null)
    setOpenTopics((current) => new Set(current).add(topicId))
    focus(`topic-${topicId}`)
  }

  const randomPick = () => {
    const next = pickRandom(sheet)
    if (!next) return
    setPick(next)
    setRevealed(next.problem.id)
    setOpenTopics((current) => new Set(current).add(next.topicId))
    focus(`problem-${next.problem.id}`)
  }

  return (
    <div className={settings.largeText ? 'app-root large-text' : 'app-root'} data-theme={settings.theme}>
      <a className="skip-link" href="#sheet-content">Skip to sheet</a>

      <header className="topbar">
        <div className="wordmark">DSA Archive</div>
        <div className="topbar-actions">
          <span className="count-pill" data-testid="progress-pill">{tally.done}/{tally.total} done</span>
          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} appearance`}
          >
            {settings.theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={toggleLargeText}
            aria-pressed={settings.largeText}
            aria-label="Toggle large text"
          >
            Aa
          </button>
        </div>
      </header>

      <aside className="app-banner" aria-label="Account and storage status">
        <strong>Sign in to save progress</strong>
        <span>Phase 1 keeps progress on this device only · Google sign-in and cloud sync arrive in phase 2</span>
      </aside>

      <main id="sheet-content" className="content-area">
        <div className="page-heading">
          <div>
            <p className="eyebrow">DSA ARCHIVE · PERSONAL STUDY</p>
            <h1>Your learning sheet</h1>
            <p className="page-subtitle">
              {summary.problemCount} problems · {summary.topicCount} topics · browsable signed out
            </p>
          </div>
          <div className="heading-actions">
            <span className="status-chip">
              <span className="status-dot" aria-hidden="true" />
              Saved on this device
            </span>
          </div>
        </div>

        <div className="toolbar">
          {/* div, not label: a clear button inside a <label> would nest
              interactive content in the labelled control. */}
          <div className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              ref={searchRef}
              type="search"
              value={filters.search}
              placeholder="Search all problems"
              aria-label="Search problems"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
            {filters.search !== '' && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setFilters((current) => ({ ...current, search: '' }))}
              >
                ✕
              </button>
            )}
          </div>
          <button type="button" className="button button-secondary" onClick={randomPick} data-testid="random-pick">
            Random pick
          </button>
          {sheet.filtering && (
            <button type="button" className="button button-secondary" onClick={clearFilters}>
              Clear all
            </button>
          )}
        </div>

        <div className="chip-row">
          <select
            className="select-field"
            aria-label="Filter by topic"
            value={filters.topicId}
            onChange={(event) => setFilters((current) => ({ ...current, topicId: event.target.value }))}
          >
            <option value="">All topics</option>
            {catalogue.topics.map((topic) => (
              <option key={topic.id} value={topic.id}>{topic.title}</option>
            ))}
          </select>
          <div className="chip-group" role="group" aria-label="Filter by level">
            {LEVEL_FILTERS.map((level) => (
              <button
                key={level}
                type="button"
                className={chipClass(filters.levels.includes(level))}
                aria-pressed={filters.levels.includes(level)}
                onClick={() => toggleLevel(level)}
              >
                {LEVEL_LABELS[level]}
              </button>
            ))}
          </div>
          <div className="chip-group" role="group" aria-label="Filter by link type">
            {LINK_FILTERS.map((linkType) => (
              <button
                key={linkType}
                type="button"
                className={chipClass(filters.linkTypes.includes(linkType))}
                aria-pressed={filters.linkTypes.includes(linkType)}
                onClick={() => toggleLinkType(linkType)}
              >
                {LINK_LABELS[linkType]}
              </button>
            ))}
            <button
              type="button"
              className={chipClass(settings.hideDone)}
              aria-pressed={settings.hideDone}
              onClick={toggleHideDone}
            >
              Hide done
            </button>
          </div>
        </div>

        <p className="quiet-note" data-testid="match-count">
          Showing {sheet.matchCount} of {sheet.totalCount} problems across {sheet.topics.length} of{' '}
          {sheet.topicCount} topics
          {filterCount > 0 ? ` · ${filterCount} filter${filterCount === 1 ? '' : 's'} on` : ''}
          {filters.search.trim() === '' ? ' · press / to search' : ''}
        </p>

        {pick && (
          <div className="notice" role="status" data-testid="random-notice">
            <div>
              <strong>Random pick · {pick.problem.title}</strong>
              <p>{pick.topicTitle} · {LEVEL_LABELS[levelOf(pick.problem)]}</p>
            </div>
            <div className="heading-actions">
              <button type="button" className="button button-secondary" onClick={randomPick}>
                Pick another
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => { setPick(null); setRevealed(null) }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="content-columns">
          <div className="sheet-column">
            {sheet.topics.length === 0 ? (
              <div className="empty-state">
                <span className="empty-mark" aria-hidden="true">—</span>
                <h2>No matching problems</h2>
                <p>
                  Nothing in the {summary.problemCount}-row sheet matches
                  {filters.search.trim() !== '' ? ` “${filters.search.trim()}”` : ' those filters'}.
                </p>
                <button type="button" className="button button-secondary" onClick={clearFilters}>
                  Clear search and filters
                </button>
              </div>
            ) : (
              <div className="topic-list" data-testid="topic-list">
                {sheet.topics.map((topic) => (
                  <TopicAccordion
                    key={topic.id}
                    topic={topic}
                    progress={progress}
                    filtering={sheet.filtering}
                    open={openTopics.has(topic.id)}
                    onOpenChange={(open) =>
                      setOpenTopics((current) => {
                        const next = new Set(current)
                        if (open) next.add(topic.id)
                        else next.delete(topic.id)
                        return next
                      })
                    }
                    revealedProblemId={revealed}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="context-column" aria-label="Progress and catalogue summary">
            <section className="card context-card">
              <h2 className="card-title">Your progress</h2>
              <div className="context-stat"><strong>{tally.done}</strong><span>marked done</span></div>
              <div className="context-stat"><strong>{tally.bookmarked}</strong><span>bookmarked</span></div>
              <div className="context-progress" aria-hidden="true">
                <span style={{ width: `${tally.percent}%` }} />
              </div>
              <p className="fine-print">{tally.percent}% of {tally.total} rows · stored on this device</p>
              {tally.done + tally.bookmarked > 0 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => { clearProgress(); setPick(null); setRevealed(null) }}
                >
                  Clear local progress
                </button>
              )}
            </section>

            <section className="card context-card" data-testid="weakest-topic">
              <h2 className="card-title">Focus next</h2>
              {hint ? (
                <>
                  <div className="context-stat">
                    <strong>{hint.title}</strong>
                    <span>{hint.done}/{hint.total} done</span>
                  </div>
                  <p className="fine-print">
                    {hint.remaining} row{hint.remaining === 1 ? '' : 's'} left · lowest completion among the
                    topics you have touched
                  </p>
                  <button type="button" className="text-button" onClick={() => openTopic(hint.topicId)}>
                    Open topic →
                  </button>
                </>
              ) : (
                <p className="fine-print">
                  Mark a few problems done and the topic with the lowest completion is suggested here.
                </p>
              )}
            </section>

            <section className="card context-card">
              <h2 className="card-title">Catalogue</h2>
              <div className="context-stat"><strong>{summary.problemCount}</strong><span>rows</span></div>
              <div className="context-stat"><strong>{summary.topicCount}</strong><span>topics</span></div>
              <p className="fine-print">Levels: {levelSplit}</p>
              <p className="fine-print">
                Bundled from <code>data/problems.json</code>. Every row links out to its source; no copied
                articles, solutions or assets are stored here.
              </p>
            </section>
          </aside>
        </div>
      </main>

      <footer className="app-footer">
        Phase 1 · sheet core — all {summary.problemCount} rows, search, filters and outbound links.
        Progress stays on this device until phase 2 adds Google sign-in and sync.
      </footer>
    </div>
  )
}
