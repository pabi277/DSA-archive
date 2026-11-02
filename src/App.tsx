import { useEffect, useMemo, useRef, useState } from 'react'
import { catalogue, summarizeCatalogue } from './catalogue'
import { tallyCatalogue, tallyTopic } from './progress'
import { toggleHideDone, toggleLargeText, toggleTheme } from './settings'
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
import { useAccountData } from './accountData'

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

function initials(name: string) {
  const pieces = name.trim().split(/\s+/).filter(Boolean)
  return (pieces.length > 1 ? `${pieces[0][0]}${pieces[1][0]}` : pieces[0]?.slice(0, 2) ?? 'DS').toUpperCase()
}

/**
 * Phase 2 sheet: the phase-1 catalogue UI keeps working signed out, while the
 * header, banner, account panel and progress actions now use Auth/Firestore.
 * Frozen 0-D tokens are unchanged.
 */
export function App() {
  const data = useAccountData()
  const { account, progress, settings } = data
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
  const completedTopics = useMemo(
    () =>
      catalogue.topics.filter((topic) => {
        const topicTally = tallyTopic(progress, topic)
        return topicTally.total > 0 && topicTally.done === topicTally.total
      }),
    [progress],
  )
  const filterCount = activeFilterCount(query)
  const signedIn = account.status === 'signed-in'
  const avatarInitials = account.user ? initials(account.user.displayName) : ''
  const progressDisabled = (signedIn && !data.cloudReady) || data.busy
  const errorTestId = data.error?.startsWith('Invalid backup:') ? 'backup-error' : 'account-error'

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
          <span className="sync-pill" data-testid="sync-pill" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            {data.syncLabel}
          </span>
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
          {account.user && (
            <details className="profile-menu">
              <summary className="profile-button" aria-label={`Open ${avatarInitials} account menu`}>
                {avatarInitials}
              </summary>
              <div className="profile-menu-panel">
                <strong>{account.user.displayName}</strong>
                <p>{account.user.email}</p>
                <a href="#account-panel">Account &amp; backup</a>
                <button type="button" data-testid="menu-sign-out" onClick={() => void account.signOut()}>
                  Sign out
                </button>
              </div>
            </details>
          )}
        </div>
      </header>

      {signedIn && account.user ? (
        <aside className="app-banner" data-testid="signed-in-banner" aria-label="Account and storage status">
          <strong>Signed in as {account.user.displayName}</strong>
          <span>Progress and settings follow this account · offline changes sync on reconnect</span>
        </aside>
      ) : (
        <aside className="app-banner" data-testid="sign-in-banner" aria-label="Account and storage status">
          <div className="banner-copy">
            <strong>Sign in to save progress</strong>
            <span>Guest rows stay on this device until you choose to merge them · Google sign-in enables cloud sync</span>
          </div>
          <div className="banner-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={account.busy}
              onClick={() => void account.signIn()}
            >
              Sign in with Google
            </button>
            {account.canUseTestGoogle && (
              <button
                type="button"
                className="button button-secondary"
                data-testid="emulator-sign-in"
                disabled={account.busy}
                onClick={() => void account.signInWithTestGoogle()}
              >
                Use CI Google account
              </button>
            )}
          </div>
        </aside>
      )}

      <main id="sheet-content" className="content-area">
        {data.error && (
          <div className="notice notice-error" role="alert" data-testid={errorTestId}>
            <div>
              <strong>Something needs attention</strong>
              <p>{data.error}</p>
            </div>
            <button type="button" className="button button-secondary" onClick={data.dismissError}>
              Dismiss
            </button>
          </div>
        )}

        {data.notice && (
          <div className="notice" role="status" data-testid="account-notice">
            <div><strong>{data.notice}</strong></div>
            <button type="button" className="button button-secondary" onClick={data.dismissNotice}>
              Dismiss
            </button>
          </div>
        )}

        {data.mergeProposal && (
          <section className="notice notice-warning" data-testid="merge-notice" aria-labelledby="merge-title">
            <div>
              <strong id="merge-title">Merge guest progress?</strong>
              <p>
                {data.mergeProposal.guestRows} guest row{data.mergeProposal.guestRows === 1 ? '' : 's'} and{' '}
                {data.mergeProposal.cloudRows} cloud row{data.mergeProposal.cloudRows === 1 ? '' : 's'} found.
                Guest rows are newer on {data.mergeProposal.guestWins} topic{data.mergeProposal.guestWins === 1 ? '' : 's'};
                cloud is newer on {data.mergeProposal.cloudWins}. Nothing is merged until you choose.
              </p>
            </div>
            <div className="heading-actions">
              <button
                type="button"
                className="button button-primary"
                disabled={data.busy}
                onClick={data.mergeGuestProgress}
              >
                Merge guest rows
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={data.busy}
                onClick={data.keepCloudProgress}
              >
                Keep cloud only
              </button>
            </div>
          </section>
        )}

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
              {signedIn ? 'Saved in your account' : 'Saved on this device'}
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

        {completedTopics.length > 0 && (
          <div className="notice" role="status" data-testid="topic-complete">
            <div>
              <strong>Quiet win · topic complete</strong>
              <p>{completedTopics.map((topic) => topic.title).join(' · ')} — every row is marked done.</p>
            </div>
          </div>
        )}

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
                    progressDisabled={progressDisabled}
                    onToggleStatus={data.toggleStatus}
                    onToggleBookmark={data.toggleBookmark}
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
              <p className="fine-print">
                {tally.percent}% of {tally.total} rows ·{' '}
                {signedIn ? 'synced to your account with an offline cache' : 'stored on this device'}
              </p>
              {!signedIn && tally.done + tally.bookmarked > 0 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => { data.clearGuestProgress(); setPick(null); setRevealed(null) }}
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

            {account.user && (
              <section className="card context-card" id="account-panel" data-testid="account-panel" aria-labelledby="account-title">
                <h2 className="card-title" id="account-title">Account &amp; backup</h2>
                <div className="profile-row">
                  <span className="avatar-placeholder" aria-hidden="true">{initials(account.user.displayName)}</span>
                  <div className="profile-copy">
                    <strong>{account.user.displayName}</strong>
                    <p>{account.user.email}</p>
                  </div>
                </div>
                <p className="fine-print">
                  {data.cloudRows} cloud row{data.cloudRows === 1 ? '' : 's'} · {data.guestRows} guest row{data.guestRows === 1 ? '' : 's'} ·
                  friends and summaries are excluded from backups.
                </p>
                <div className="action-grid">
                  <button type="button" className="button button-secondary" onClick={data.exportBackup}>
                    Export backup JSON
                  </button>
                  <label className="button button-secondary file-label">
                    Import JSON
                    <input
                      className="file-input"
                      type="file"
                      accept=".json,application/json"
                      aria-label="Import backup JSON"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0]
                        if (file) void data.chooseImportFile(file)
                        event.currentTarget.value = ''
                      }}
                    />
                  </label>
                  <button type="button" className="button button-secondary" data-testid="sign-out" onClick={() => void account.signOut()}>
                    Sign out
                  </button>
                </div>
                {data.importPreview && (
                  <div className="notice" role="status" data-testid="import-preview">
                    <div>
                      <strong>Backup looks valid</strong>
                      <p>
                        {data.importPreview.counts.rows} row{data.importPreview.counts.rows === 1 ? '' : 's'} across{' '}
                        {data.importPreview.counts.topics} topic{data.importPreview.counts.topics === 1 ? '' : 's'} ·
                        notes {data.importPreview.counts.notes} · lists {data.importPreview.counts.lists} · plans{' '}
                        {data.importPreview.counts.plans}. Replacing happens only after confirmation.
                      </p>
                    </div>
                    <div className="heading-actions">
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={data.busy || !data.profileReady}
                        onClick={data.confirmImport}
                      >
                        Replace my progress
                      </button>
                      <button type="button" className="button button-secondary" onClick={data.cancelImport}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

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
        Phase 2 · Google sign-in, offline-first cloud progress, guest merge, Firestore rules and JSON backup —
        emulator-tested in CI; no live project is configured or deployed.
      </footer>
    </div>
  )
}
