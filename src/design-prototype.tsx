import { useState, type ReactNode } from 'react'
import { catalogue, summarizeCatalogue } from './catalogue'

const views = [
  ['sheet-signed-out', 'Sheet · signed out'],
  ['sheet-signed-in', 'Sheet · signed in'],
  ['sheet-expanded', 'Sheet · topic expanded'],
  ['sheet-empty-search', 'Sheet · no results'],
  ['topic-complete', 'Topic complete'],
  ['sign-in', 'Sign in · Google / error'],
  ['sync-offline', 'Sync · offline'],
  ['problem-no-note', 'Problem detail · no note'],
  ['problem-with-note', 'Problem detail · with note'],
  ['notes-filled', 'Notes · with notes'],
  ['notes-empty', 'Notes · empty'],
  ['lists-filled', 'Custom lists · list'],
  ['lists-empty', 'Custom lists · empty'],
  ['lists-editing', 'Custom lists · editing'],
  ['today-planned', 'Today · planned'],
  ['today-empty', 'Today · nothing planned'],
  ['today-goal', 'Today · goal met'],
  ['revision-due', 'Revision · due'],
  ['revision-clear', 'Revision · caught up'],
  ['stats', 'Stats'],
  ['friends-invite', 'Friends · invite'],
  ['friends-compare', 'Friends · compare'],
  ['friends-goal', 'Friends · weekly goal'],
  ['settings', 'Settings & account'],
  ['offline', 'Offline / not found'],
] as const

type View = (typeof views)[number][0]
type Theme = 'dark' | 'light'

const allProblems = catalogue.topics.flatMap((topic) =>
  topic.subtopics.flatMap((subtopic) => subtopic.problems),
)
const arraysTopic = catalogue.topics.find((topic) => topic.title === 'Arrays') ?? catalogue.topics[0]
const sampleRows = arraysTopic.subtopics.flatMap((subtopic) => subtopic.problems).slice(0, 3)
const sampleProblem = allProblems.find((problem) => problem.title === 'Two Sum') ?? sampleRows[0]
const summary = summarizeCatalogue()
const titleFor = (view: View) => views.find(([key]) => key === view)?.[1] ?? 'Sheet'

function Badge({ children }: { children: string }) {
  return <span className="level-badge">{children}</span>
}

function SectionCard({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`prototype-card ${className}`}>
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </section>
  )
}

function ProblemRow({ title, level, status = 'To do' }: { title: string; level: string; status?: string }) {
  return (
    <article className="problem-row">
      <button className="status-check" type="button" aria-label={`Mark ${title} ${status === 'Done' ? 'to do' : 'done'}`}>
        {status === 'Done' ? '✓' : ''}
      </button>
      <div className="problem-copy">
        <span className="problem-title">{title}</span>
        <span className="problem-meta">{status}</span>
      </div>
      <Badge>{level}</Badge>
      <button className="bookmark-button" type="button" aria-label={`Bookmark ${title}`}>☆</button>
      <div className="row-actions" role="group" aria-label={`Links for ${title}`}>
        <button type="button">Practice</button>
        <button type="button">Article</button>
        <button type="button">Video</button>
        <button type="button">LeetCode</button>
      </div>
    </article>
  )
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: string }) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true">—</span>
      <h2>{title}</h2>
      <p>{detail}</p>
      {action && <button className="button button-secondary" type="button">{action}</button>}
    </div>
  )
}

function SheetView({ view }: { view: View }) {
  const topic = catalogue.topics.find((item) => item.title === 'Arrays') ?? catalogue.topics[0]
  const expandedSubtopic = topic.subtopics[0]
  if (view === 'topic-complete') {
    return (
      <SectionCard title="Arrays complete">
        <div className="completion-mark" aria-hidden="true">✓</div>
        <p className="supporting-copy">A quiet milestone. Your progress stays yours.</p>
        <div className="metric-strip"><strong>32 / 32</strong><span>problems marked done</span></div>
        <button className="button button-secondary" type="button">Back to sheet</button>
      </SectionCard>
    )
  }
  if (view === 'sheet-empty-search') {
    return (
      <>
        <div className="search-field"><span aria-hidden="true">⌕</span><span>Search: “no matching problem”</span><button type="button">Clear</button></div>
        <SectionCard><EmptyState title="No problems found" detail="Try another title or clear the current filters." action="Clear search and filters" /></SectionCard>
      </>
    )
  }
  const signedIn = view !== 'sheet-signed-out'
  const expanded = view === 'sheet-expanded'
  return (
    <>
      {!signedIn && <div className="notice"><div><strong>Keep your progress in sync</strong><p>Browse the full sheet while signed out. Sign in only when you want to save.</p></div><button className="button button-primary" type="button">Sign in to save</button></div>}
      {signedIn && <div className="metric-grid">
        <div className="metric-tile"><span>Progress</span><strong>42 <small>/ {summary.problemCount}</small></strong></div>
        <div className="metric-tile"><span>This week</span><strong>8 <small>solved</small></strong></div>
        <div className="metric-tile"><span>Revision due</span><strong>3 <small>today</small></strong></div>
      </div>}
      <div className="toolbar">
        <label className="search-field"><span aria-hidden="true">⌕</span><span className="sr-only">Search problems</span><input aria-label="Search problems" placeholder="Search all problems" /></label>
        <button className="button button-secondary" type="button">Filters <span className="filter-count">2</span></button>
        <button className="button button-secondary" type="button">Pick random</button>
      </div>
      <div className="topic-list">
        {(expanded ? catalogue.topics.filter((item) => item.id === topic.id) : catalogue.topics).map((item) => {
          const count = item.subtopics.reduce((n, subtopic) => n + subtopic.problems.length, 0)
          const isExpanded = expanded && item.id === topic.id
          return (
            <details className="topic-card" key={item.id} open={isExpanded || undefined}>
              <summary>
                <span className="topic-chevron" aria-hidden="true">›</span>
                <span className="topic-name">{item.title}</span>
                <span className="topic-count">{item.id === topic.id && signedIn ? '12' : '0'} / {count}</span>
                <span className="topic-progress"><span style={{ width: item.id === topic.id && signedIn ? '38%' : '0%' }} /></span>
              </summary>
              {isExpanded && <div className="subtopic-content">
                <h3>{expandedSubtopic.title}</h3>
                {sampleRows.map((problem) => <ProblemRow key={problem.id} title={problem.title} level={problem.level ?? 'Unrated'} />)}
                <ProblemRow title={sampleProblem.title} level={sampleProblem.level ?? 'Unrated'} status="Done" />
              </div>}
            </details>
          )
        })}
      </div>
      {!expanded && <p className="quiet-note">Showing a design sample. The approved sheet view will contain all 20 topics.</p>}
    </>
  )
}

function ScreenContent({ view, setView }: { view: View; setView: (view: View) => void }) {
  if (view.startsWith('sheet-') || view === 'topic-complete') return <SheetView view={view} />

  if (view === 'sign-in') return (
    <div className="sign-in-layout">
      <SectionCard title="Your sheet, wherever you study">
        <p className="supporting-copy">Sign in to keep your progress and notes in sync. The catalogue stays browsable without an account.</p>
        <button className="button button-primary button-wide" type="button"><span className="google-mark" aria-hidden="true">G</span> Continue with Google</button>
        <p className="fine-print">No password to create. Your notes stay private.</p>
      </SectionCard>
      <div className="notice notice-error" role="alert"><strong>Couldn’t sign in</strong><span>Check your connection and try again.</span><button className="button button-secondary" type="button">Try again</button></div>
    </div>
  )

  if (view === 'sync-offline') return (
    <>
      <div className="notice notice-warning"><div><strong>You’re offline</strong><p>Changes are saved on this device and will sync when you’re back online.</p></div><span className="status-chip">Offline</span></div>
      <SectionCard title="Sync status">
        <div className="settings-row"><div><strong>Last synced</strong><p>Today at 9:42 AM</p></div><span className="status-chip">Waiting to sync</span></div>
        <div className="settings-row"><div><strong>Pending changes</strong><p>2 progress updates</p></div><span className="count-pill">2</span></div>
      </SectionCard>
      <SectionCard title="What still works offline"><p className="supporting-copy">Browse the catalogue, review cached notes and mark progress. Nothing is blocked by a connection warning.</p></SectionCard>
    </>
  )

  if (view === 'problem-no-note' || view === 'problem-with-note') return (
    <>
      <button className="back-link" onClick={() => setView('sheet-expanded')} type="button">← Back to Arrays</button>
      <SectionCard title={sampleProblem.title}>
        <div className="problem-heading-meta"><Badge>{sampleProblem.level ?? 'Unrated'}</Badge><span>Arrays · {sampleProblem.kind === 'theory' ? 'Learning' : 'Problem'}</span></div>
        <div className="action-grid"><button type="button">Practice</button><button type="button">Article</button><button type="button">Video</button><button type="button">LeetCode</button></div>
        <div className="settings-row"><strong>My progress</strong><button className="button button-secondary" type="button">Mark done</button></div>
        <div className="settings-row"><strong>Attempts</strong><button className="button button-secondary" type="button">− &nbsp; 2 &nbsp; +</button></div>
        <div className="settings-row"><strong>Bookmark</strong><button className="button button-secondary" type="button">Save bookmark</button></div>
      </SectionCard>
      <SectionCard title="My note">
        {view === 'problem-with-note' ? <><p className="note-preview">Remember to check the input constraints and test a duplicate-value case.</p><pre className="code-preview"><code>const seen = new Set()</code></pre></> : <EmptyState title="No note yet" detail="Capture your own approach or a reminder for next time." />}
        <label className="field-label" htmlFor="note-draft">Private note preview</label><textarea id="note-draft" placeholder="Write a note for yourself…" rows={3} />
      </SectionCard>
    </>
  )

  if (view === 'notes-filled' || view === 'notes-empty') return (
    <>
      <div className="toolbar"><label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Search notes" placeholder="Search my notes" /></label><button className="button button-secondary" type="button">All topics</button></div>
      <SectionCard title={view === 'notes-filled' ? 'Recently updated' : 'Your notes'}>
        {view === 'notes-empty' ? <EmptyState title="No notes yet" detail="Notes you add to a problem will appear here." action="Browse the sheet" /> : sampleRows.slice(0, 2).map((problem) => <article className="list-row" key={problem.id}><div><strong>{problem.title}</strong><p>My approach · updated today</p></div><span>Arrays</span></article>)}
      </SectionCard>
    </>
  )

  if (view.startsWith('lists-')) return (
    <>
      <div className="toolbar"><p className="supporting-copy">Group problems your way. Lists are private to your account.</p><button className="button button-primary" type="button">＋ New list</button></div>
      {view === 'lists-empty' ? <SectionCard><EmptyState title="No custom lists" detail="Create a list for a goal, topic or revision session." action="Create your first list" /></SectionCard> : <>
        <div className="list-tabs"><button className="active-tab" type="button">Interview prep <span>12</span></button><button type="button">Weekend review <span>6</span></button></div>
        <SectionCard title={view === 'lists-editing' ? 'Edit list' : 'Interview prep'}>
          {view === 'lists-editing' && <><label className="field-label" htmlFor="list-title">List name</label><input id="list-title" defaultValue="Interview prep" /></>}
          {sampleRows.map((problem) => <article className="list-row" key={problem.id}><div><strong>{problem.title}</strong><p>Arrays · {problem.level ?? 'Unrated'}</p></div><button className="button button-secondary" type="button">{view === 'lists-editing' ? 'Remove' : 'Open'}</button></article>)}
          {view === 'lists-editing' && <button className="button button-primary" type="button">Save list</button>}
        </SectionCard>
      </>}
    </>
  )

  if (view.startsWith('today-')) {
    if (view === 'today-empty') return <SectionCard><EmptyState title="Nothing planned yet" detail="Add a few problems from your sheet when you’re ready." action="Choose problems" /></SectionCard>
    return (
      <>
        <SectionCard title={view === 'today-goal' ? 'Daily goal reached' : 'Your plan for today'}>
          <div className="goal-line"><strong>{view === 'today-goal' ? '5 / 5' : '2 / 5'}</strong><span>problems toward today’s goal</span></div>
          <div className="goal-track"><span style={{ width: view === 'today-goal' ? '100%' : '40%' }} /></div>
          {sampleRows.slice(0, view === 'today-goal' ? 3 : 2).map((problem, index) => <ProblemRow key={problem.id} title={problem.title} level={problem.level ?? 'Unrated'} status={index === 0 ? 'Done' : 'Planned'} />)}
        </SectionCard>
        <button className="button button-secondary" type="button">Add from sheet</button>
      </>
    )
  }

  if (view === 'revision-due' || view === 'revision-clear') return (
    <>
      <SectionCard title={view === 'revision-clear' ? 'You’re all caught up' : 'Due for a quick revisit'}>
        {view === 'revision-clear' ? <EmptyState title="No revisions due" detail="Your next review will appear here when it’s time." /> : <>{sampleRows.slice(0, 2).map((problem) => <ProblemRow key={problem.id} title={problem.title} level={problem.level ?? 'Unrated'} status="Due today" />)}<div className="quiet-note">Review intervals: 3 · 7 · 21 days</div></>}
      </SectionCard>
      {view === 'revision-due' && <button className="button button-primary" type="button">Mark revised</button>}
    </>
  )

  if (view === 'stats') return (
    <>
      <div className="metric-grid"><div className="metric-tile"><span>Solved</span><strong>42 <small>/ 495</small></strong></div><div className="metric-tile"><span>Current streak</span><strong>4 <small>days</small></strong></div><div className="metric-tile"><span>This week</span><strong>8 <small>solved</small></strong></div></div>
      <SectionCard title="Progress by topic">{catalogue.topics.slice(0, 5).map((topic, index) => <div className="bar-row" key={topic.id}><span>{topic.title}</span><div className="goal-track"><span style={{ width: `${[48, 26, 18, 10, 5][index]}%` }} /></div><strong>{[12, 3, 1, 0, 0][index]}</strong></div>)}</SectionCard>
      <SectionCard title="Level split">{[['Basic', 18], ['Core', 21], ['Pro', 3]].map(([label, count]) => <div className="bar-row" key={label}><span>{label}</span><div className="goal-track"><span style={{ width: `${Number(count) / 42 * 100}%` }} /></div><strong>{count}</strong></div>)}</SectionCard>
      <SectionCard title="Recent activity"><div className="heatmap" role="img" aria-label="Example 4-week activity heatmap">{Array.from({ length: 28 }, (_, index) => <span key={index} className={`heat-cell heat-${(index * 7 + 3) % 4}`} />)}</div><p className="quiet-note">Example activity · last 4 weeks</p><div className="week-strip"><span>Mon <strong>2</strong></span><span>Tue <strong>1</strong></span><span>Wed <strong>0</strong></span><span>Thu <strong>3</strong></span><span>Fri <strong>2</strong></span><span>Sat <strong>0</strong></span><span>Sun <strong>0</strong></span></div></SectionCard>
    </>
  )

  if (view.startsWith('friends-')) {
    if (view === 'friends-invite') return <SectionCard title="Study alongside friends"><EmptyState title="Your circle starts here" detail="Invite a friend. Your progress stays private unless you turn on summary sharing." action="Copy invite link" /></SectionCard>
    if (view === 'friends-compare') return <SectionCard title="Friends’ summaries"><div className="privacy-note">Only opted-in summaries are shown. Notes and snippets are always private.</div>{['Aarav', 'Mira'].map((name, index) => <article className="friend-row" key={name}><div className="avatar-placeholder" aria-hidden="true">{name[0]}</div><div className="friend-copy"><strong>{name}</strong><p>{index ? '31' : '48'} solved · summary shared</p></div><span className="count-pill">{index ? '31' : '48'}</span></article>)}</SectionCard>
    return <SectionCard title="This week’s shared goal"><div className="goal-line"><strong>18 / 25</strong><span>problems solved together</span></div><div className="goal-track"><span style={{ width: '72%' }} /></div><article className="list-row"><strong>1 · Aarav</strong><span>8 this week</span></article><article className="list-row"><strong>2 · You</strong><span>6 this week</span></article><article className="list-row"><strong>3 · Mira</strong><span>4 this week</span></article></SectionCard>
  }

  if (view === 'settings') return (
    <>
      <SectionCard title="Account"><div className="profile-row"><div className="avatar-placeholder" aria-hidden="true">P</div><div><strong>Pabi (demo)</strong><p>Signed in · sample state</p></div><button className="button button-secondary" type="button">Sign out</button></div></SectionCard>
      <SectionCard title="Preferences"><div className="settings-row"><div><strong>Daily goal</strong><p>Problems to work on each day</p></div><button className="button button-secondary" type="button">5</button></div><div className="settings-row"><div><strong>Hide completed</strong><p>Keep the sheet focused on what’s next</p></div><input type="checkbox" aria-label="Hide completed problems" /></div><div className="settings-row"><div><strong>Share summary</strong><p>Share counts and streak only; off by default</p></div><input type="checkbox" aria-label="Share summary" /></div></SectionCard>
      <SectionCard title="Your data"><div className="action-grid"><button type="button">Export backup</button><button type="button">Import backup</button><button type="button">Delete my data</button></div><p className="fine-print">Deleting data is permanent and always requires confirmation.</p></SectionCard>
    </>
  )

  return <SectionCard title={view === 'offline' ? 'You’re offline' : 'Page not found'}><EmptyState title={view === 'offline' ? 'The sheet still works' : 'This page isn’t here'} detail={view === 'offline' ? 'Your cached catalogue is available. Changes can sync later.' : 'Return to the sheet to keep studying.'} action="Go to sheet" /></SectionCard>
}

export function DesignPrototype() {
  const [view, setView] = useState<View>('sheet-signed-out')
  const [theme, setTheme] = useState<Theme>('dark')
  const [largeText, setLargeText] = useState(false)
  const [online, setOnline] = useState(true)
  const groupedTopics = catalogue.topics.slice(0, 5)

  const navigate = (next: View) => setView(next)
  const isNavActive = (label: string, next: View) => view === next ||
    (label === 'Sheet' && view.startsWith('sheet-')) ||
    (label === 'Today' && view.startsWith('today-')) ||
    (label === 'Revision' && view.startsWith('revision-')) ||
    (label === 'Notes' && view.startsWith('notes-')) ||
    (label === 'Lists' && view.startsWith('lists-')) ||
    (label === 'Friends' && view.startsWith('friends-'))
  const majorNav: Array<[string, View]> = [
    ['Sheet', 'sheet-signed-out'], ['Today', 'today-planned'], ['Revision', 'revision-due'],
    ['Stats', 'stats'], ['Notes', 'notes-filled'], ['Lists', 'lists-filled'], ['Friends', 'friends-invite'], ['Settings', 'settings'],
  ]

  return (
    <div className={`prototype-root ${largeText ? 'large-text' : ''}`} data-theme={theme}>
      <a className="skip-link" href="#prototype-content">Skip to content</a>
      <div className="prototype-shell">
        <aside className="desktop-rail" aria-label="Main navigation">
          <div className="wordmark">DSA Archive</div>
          <p className="rail-label">STUDY</p>
          <nav className="rail-nav">
            {majorNav.map(([label, next]) => <button className={isNavActive(label, next) ? 'nav-item is-active' : 'nav-item'} key={label} onClick={() => navigate(next)} type="button"><span className="nav-glyph" aria-hidden="true">{label.slice(0, 1)}</span>{label}</button>)}
          </nav>
          <div className="rail-footer"><span className="status-dot" />{online ? 'All changes synced' : 'Offline · changes saved'}</div>
        </aside>

        <div className="prototype-main">
          <header className="topbar">
            <div className="mobile-wordmark">DSA Archive</div>
            <div className="prototype-breadcrumb"><span>Prototype</span><span aria-hidden="true">/</span><strong>{titleFor(view)}</strong></div>
            <div className="topbar-actions">
              <button className="icon-button" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} appearance`}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
              <button className="icon-button font-toggle" type="button" onClick={() => setLargeText(!largeText)} aria-pressed={largeText}>Aa</button>
              <button className="profile-button" type="button" onClick={() => navigate('settings')} aria-label="Open demo account settings">P</button>
            </div>
          </header>

          <div className="prototype-banner"><span className="draft-indicator">DESIGN PREVIEW</span><span>Fake account and progress · no Firebase connection</span><label className="network-toggle"><input type="checkbox" checked={online} onChange={(event) => setOnline(event.target.checked)} /> {online ? 'Online' : 'Offline'}</label></div>

          <main id="prototype-content" className="content-area">
            <div className="page-heading">
              <div><p className="eyebrow">DSA ARCHIVE · {view.startsWith('friends') ? 'YOUR CIRCLE' : 'PERSONAL STUDY'}</p><h1>{titleFor(view)}</h1><p className="page-subtitle">{view.startsWith('sheet-') ? `${summary.problemCount} problems · ${summary.topicCount} topics · available signed out` : 'A focused space for your own practice, progress and review.'}</p></div>
              <div className="heading-actions"><span className="sync-pill"><span className="status-dot" />{online ? 'Synced' : 'Offline'}</span><button className="button button-primary" type="button" onClick={() => navigate('sign-in')}>Sign in</button></div>
            </div>

            <div className="prototype-controls">
              <label htmlFor="view-picker">Preview screen</label>
              <select id="view-picker" value={view} onChange={(event) => setView(event.target.value as View)}>
                {views.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
              </select>
            </div>

            <div className="content-columns">
              <div className="screen-column"><ScreenContent view={view} setView={navigate} /></div>
              <aside className="context-column" aria-label="Design notes">
                {view === 'sheet-signed-out' ? <SectionCard title="Catalogue at a glance" className="context-card">
                  <div className="context-stat"><strong>{summary.problemCount}</strong><span>learning rows</span></div>
                  <div className="context-stat"><strong>{summary.topicCount}</strong><span>topics</span></div>
                  <p className="fine-print">The sheet is available without an account.</p>
                </SectionCard> : <SectionCard title="Your study at a glance" className="context-card">
                  <div className="context-stat"><strong>42</strong><span>marked done</span></div>
                  <div className="context-stat"><strong>3</strong><span>revisions due</span></div>
                  <div className="context-progress"><span style={{ width: `${Math.round(42 / summary.problemCount * 100)}%` }} /></div>
                  <p className="fine-print">Sample values only. This demo is not connected to an account.</p>
                </SectionCard>}
                <SectionCard title="Topics" className="context-card">
                  {groupedTopics.slice(0, 4).map((topic) => <div className="context-topic" key={topic.id}><span>{topic.title}</span><span>{topic.subtopics.reduce((n, subtopic) => n + subtopic.problems.length, 0)}</span></div>)}
                  <button className="text-button" onClick={() => navigate('sheet-signed-out')} type="button">Browse the sheet →</button>
                </SectionCard>
                <div className="prototype-note"><strong>Draft design directions</strong><ul><li>Dark first · light alternative</li><li>Neutral, text-labelled levels</li><li>Comfortable phone spacing; broader desktop layout</li><li>Text-only wordmark</li></ul><p>These are candidate choices, not frozen design tokens.</p></div>
              </aside>
            </div>
          </main>

          <nav className="mobile-nav" aria-label="Bottom navigation">
            {majorNav.filter(([label]) => ['Sheet', 'Today', 'Revision', 'Friends'].includes(label)).map(([label, next]) => <button className={isNavActive(label, next) ? 'mobile-nav-item is-active' : 'mobile-nav-item'} key={label} onClick={() => navigate(next)} type="button"><span aria-hidden="true">{label.slice(0, 1)}</span>{label}</button>)}
            <button className="mobile-nav-item" onClick={() => navigate('settings')} type="button"><span aria-hidden="true">⋯</span>More</button>
          </nav>
        </div>
      </div>
      <footer className="prototype-footer">Phase 0-D prototype · no account, progress or notes are saved</footer>
    </div>
  )
}
