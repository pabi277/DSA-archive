import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { catalogue, summarizeCatalogue } from './catalogue'
import { getProgressSnapshot, replaceGuestProgress, tallyCatalogue, tallyTopic } from './progress'
import {
  setDensity,
  setTheme,
  toggleHideDone,
  toggleLargeText,
  toggleRail,
  useSettings,
  type Density,
  type Theme,
} from './settings'
import {
  applySheetQuery,
  fromQueryParams,
  pickRandom,
  toQueryParams,
  weakestTopic,
  type RandomPick,
  type SheetQuery,
} from './sheet'
import { NoteEditor } from './NoteEditor'
import { NotesView } from './NotesView'
import { ListsView } from './ListsView'
import { ListPicker } from './ListPicker'
import { locateProblem, sortLists } from './library'
import { useAccount } from './account'
import { useLibrary } from './libraryData'
import { useAccountData } from './accountData'
import { usePlanner } from './plannerData'
import { useFriends } from './friendsData'
import { FriendsView } from './FriendsView'
import { useInstallPrompt } from './pwa'
import { RevisionView, StatsView, TodayView } from './PlannerViews'
import {
  continueWhereLeft,
  heatmap,
  revisionQueue,
  streakInfo,
  suggestedPicks,
  todayTally,
  weeklyStats,
} from './planner'
import { navigate, onRouteChange, rememberScrollMaybe, type Route, type RouteName } from './app/router'
import { installShortcuts, ShortcutsSheet } from './app/shortcuts'
import { FeedbackProvider, useFeedback } from './app/feedback'
import { CommandPalette } from './app/commandPalette'
import { getTriageFocus, moveTriageFocus, setTriageFocus, useTriageFocus } from './app/triage'
import { Banner, BottomBar, NavSidebar, PageHeader, TopBar } from './app/shell'
import { SheetScreen, WINDOW_SIZE, topicRingValue } from './app/sheetScreen'
import { TopicsScreen } from './app/topicsScreen'
import {
  CodeScreen,
  InsightsScreen,
  NotFoundScreen,
  PracticeScreen,
  ProblemScreen,
  QuizHome,
  SettingsScreen,
  TopicScreen,
} from './app/placeholderScreens'
import { Button, Card, Ring, Stat } from './design/primitives'
import { IconArrowRight, IconCheck, IconSearch, IconSpark } from './design/icons'

const summary = summarizeCatalogue()

type Filters = Omit<SheetQuery, 'hideDone' | 'listProblemIds'>

function initials(name: string) {
  const pieces = name.trim().split(/\s+/).filter(Boolean)
  return (pieces.length > 1 ? `${pieces[0][0]}${pieces[1][0]}` : pieces[0]?.slice(0, 2) ?? 'DS').toUpperCase()
}

const ROUTE_TITLES: Record<RouteName, string> = {
  today: 'Today',
  topics: 'Topics',
  topic: 'Topic',
  problem: 'Problem',
  code: 'Code',
  search: 'Search the sheet',
  practice: 'Practice drills',
  review: 'Review',
  quiz: 'Quizzes',
  insights: 'Insights',
  settings: 'Settings',
  lists: 'My lists',
  notes: 'Notes',
  friends: 'Friends',
  stats: 'Stats',
  'not-found': 'Page not found',
}

/**
 * The application root (phase v2-01): one shell, one router, one feedback host.
 *
 * `view` state is gone — the URL is the only source of truth for *which* screen
 * is showing, and the query string carries each screen's filters, tab and
 * search text. Data hooks (`useAccountData`, `useLibrary`, `usePlanner`,
 * `useFriends`) are unchanged from v1; this file only consumes them.
 */
export function App() {
  return (
    <FeedbackProvider>
      <AppShell />
    </FeedbackProvider>
  )
}

function AppShell() {
  const settings = useSettings()
  const feedback = useFeedback()
  const installPrompt = useInstallPrompt()
  const account = useAccount()
  const library = useLibrary(account)
  const planner = usePlanner(account)
  const data = useAccountData(account, library, planner)
  const friends = useFriends(account, data.entries, data.cloudReady, planner.today)
  const { progress, settings: syncedSettings } = data
  void syncedSettings

  const [route, setRoute] = useState<Route>(() => ({
    name: 'today',
    param: '',
    query: {},
    path: '#/',
  }))
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [searchSignal, setSearchSignal] = useState(0)
  const [rowPanel, setRowPanel] = useState<{ problemId: string; kind: 'note' | 'lists' } | null>(null)
  const [openTopics, setOpenTopics] = useState<ReadonlySet<string>>(() => new Set())
  const [pick, setPick] = useState<RandomPick | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(null)
  const [noteQuery, setNoteQuery] = useState('')
  const triageFocus = useTriageFocus()

  /* --- routing ----------------------------------------------------------- */

  useEffect(() => {
    let last = ''
    const unsubscribe = onRouteChange((next) => {
      const previous = last
      last = next.path
      setRoute(next)
      rememberScrollMaybe()
      // Leaving #/search and coming back should restore the query from the URL,
      // not from a stale component state: the search screen reads `route.query`.
      if (next.name !== 'search') setPick(null)
      if (previous !== next.path) {
        setRowPanel(null)
        setTriageFocus(null)
        try {
          window.scrollTo?.({ top: 0 })
        } catch {
          // jsdom has no layout.
        }
      }
    })
    return unsubscribe
  }, [])

  // Old v1 bookmarks were path-based (`/notes`); translate them to hash routes.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const path = window.location.pathname.replace(/\/+$/, '')
    if (path && path !== '' && path !== '/index.html' && !window.location.hash) {
      const map: Record<string, RouteName> = {
        '/notes': 'notes',
        '/lists': 'lists',
        '/today': 'today',
        '/sheet': 'search',
        '/stats': 'stats',
        '/friends': 'friends',
      }
      const target = map[path]
      navigate(target ?? 'not-found', '', {}, true)
    }
  }, [])

  /* --- derived data ------------------------------------------------------ */

  const filters = useMemo<Filters>(() => fromQueryParams(route.query), [route.query])
  const query = useMemo<SheetQuery>(
    () => ({ ...filters, hideDone: false, listProblemIds: null }),
    [filters],
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
  const today = planner.today
  const queue = useMemo(() => revisionQueue(data.entries, today), [data.entries, today])
  const dayTally = useMemo(() => todayTally(data.entries, planner.plan, today, data.dailyGoal), [data.entries, planner.plan, today, data.dailyGoal])
  const streak = useMemo(() => streakInfo(data.entries, today), [data.entries, today])
  const weekly = useMemo(() => weeklyStats(data.entries, today), [data.entries, today])
  const heat = useMemo(() => heatmap(data.entries, today), [data.entries, today])
  const suggestions = useMemo(() => suggestedPicks(data.entries, planner.plan, 5), [data.entries, planner.plan])
  const continuePick = useMemo(() => continueWhereLeft(data.entries), [data.entries])

  const signedIn = account.status === 'signed-in'
  const progressDisabled = (signedIn && !data.cloudReady) || data.busy
  const error = data.error ?? planner.error ?? library.error
  const notice = data.notice ?? planner.notice ?? library.notice
  const syncLabel = data.syncState === 'synced' && library.pending ? 'Changes pending' : data.syncLabel
  const syncTone =
    data.syncState === 'error'
      ? 'danger'
      : data.syncState === 'offline' || data.syncState === 'local-offline'
        ? 'warn'
        : data.syncState === 'synced'
          ? 'ok'
          : data.syncState === 'local'
            ? 'muted'
            : 'warn'

  const listChoices = useMemo(() => sortLists(library.lists), [library.lists])

  /* --- mutations with undo (acceptance #5) ------------------------------- */

  /**
   * The undo contract: capture the *exact* prior state of the field, perform the
   * mutation, then offer a 6 s revert through the toast host. Guest rows are
   * restored from a snapshot of local storage; signed-in rows are written back
   * through the same `toggleStatus`/`toggleBookmark` call that changed them.
   */
  const undoStatus = useCallback(
    (topicId: string, problemId: string, wasDone: boolean) => {
      const title = locateProblem(problemId)?.problem.title ?? problemId
      feedback.undoable({
        key: `progress:${topicId}:${problemId}:s`,
        message: wasDone ? `Marked “${title}” to do` : `Marked “${title}” done`,
        revert: () => {
          if (signedIn) {
            data.toggleStatus(topicId, problemId)
            return
          }
          const snapshot = getProgressSnapshot()
          const shard = { ...(snapshot[topicId] ?? {}) }
          if (wasDone) shard[problemId] = { s: 'done', b: shard[problemId]?.b ?? false }
          else delete shard[problemId]
          replaceGuestProgress({ ...snapshot, [topicId]: shard })
        },
      })
    },
    [data, feedback, signedIn],
  )

  const undoBookmark = useCallback(
    (topicId: string, problemId: string, wasBookmarked: boolean) => {
      const title = locateProblem(problemId)?.problem.title ?? problemId
      feedback.undoable({
        key: `progress:${topicId}:${problemId}:b`,
        message: wasBookmarked ? `Removed bookmark · ${title}` : `Bookmarked · ${title}`,
        revert: () => {
          if (signedIn) {
            data.toggleBookmark(topicId, problemId)
            return
          }
          const snapshot = getProgressSnapshot()
          const shard = { ...(snapshot[topicId] ?? {}) }
          const current = shard[problemId] ?? { s: 'todo' as const, b: false }
          shard[problemId] = { s: current.s, b: wasBookmarked }
          replaceGuestProgress({ ...snapshot, [topicId]: shard })
        },
      })
    },
    [data, feedback, signedIn],
  )

  const onToggleStatus = useCallback(
    (topicId: string, problemId: string) => {
      const wasDone = progress[topicId]?.[problemId]?.s === 'done'
      data.toggleStatus(topicId, problemId)
      undoStatus(topicId, problemId, wasDone)
      if (!wasDone) saveSessionDrawer(topicId)
    },
    [data, progress, undoStatus],
  )

  const onToggleBookmark = useCallback(
    (topicId: string, problemId: string) => {
      const wasBookmarked = progress[topicId]?.[problemId]?.b === true
      data.toggleBookmark(topicId, problemId)
      undoBookmark(topicId, problemId, wasBookmarked)
    },
    [data, progress, undoBookmark],
  )

  function saveSessionDrawer(topicId: string) {
    // Placeholder hook for phase 08's reason chips: keep the callback shape
    // stable so adding `o: clean|hint|couldnt` later does not touch call sites.
    void topicId
  }

  const onPlan = useCallback(
    (problemId: string) => {
      planner.addToToday(problemId)
      feedback.notify('Added to Today', locateProblem(problemId)?.problem.title)
    },
    [feedback, planner],
  )

  const completeToday = useCallback(
    (problemId: string) => {
      const location = locateProblem(problemId)
      if (!location) return
      const wasDone = progress[location.topicId]?.[problemId]?.s === 'done'
      planner.markTodayDone(problemId)
      data.markDone(location.topicId, problemId)
      if (!wasDone) undoStatus(location.topicId, problemId, false)
    },
    [data, planner, progress, undoStatus],
  )

  /* --- keyboard layer (acceptance: full keyboard path) ------------------- */

  const openProblem = useCallback((problemId: string | undefined) => {
    if (!problemId) return
    navigate('problem', problemId)
  }, [])

  useEffect(
    () =>
      installShortcuts({
        onPalette: () => setPaletteOpen(true),
        onSearch: () => {
          if (route.name !== 'search') navigate('search')
          setSearchSignal((value) => value + 1)
        },
        onShortcuts: () => setShortcutsOpen(true),
        onUndo: () => {
          const undone = feedback.undoLast()
          if (!undone) feedback.notify('Nothing to undo', 'Changes are undoable for 6 seconds.')
        },
        onNavigate: (key) => {
          const map: Record<string, RouteName> = {
            t: 'today',
            p: 'topics',
            c: 'code',
            r: 'review',
            s: 'stats',
            ',': 'settings',
          }
          const target = map[key]
          if (target) navigate(target)
        },
      }),
    [feedback, route.name],
  )

  useTriage(
    {
      onStatus: onToggleStatus,
      onBookmark: onToggleBookmark,
      onOpen: openProblem,
    },
    route.name,
  )

  /* --- panel renderers --------------------------------------------------- */

  const renderPanel = (problemId: string, kind: 'note' | 'lists') => {
    const location = locateProblem(problemId)
    if (!location) return null
    if (kind === 'note') {
      const note = library.notes[problemId] ?? null
      return (
        <NoteEditor
          key={`${problemId}-${note?.updatedAt ?? 'new'}`}
          problemId={problemId}
          problemTitle={location.problem.title}
          note={note}
          disabled={library.busy || !library.signedIn}
          onSave={(markdown, snippet) => {
            void library.saveNote(problemId, markdown, snippet)
          }}
          onDelete={() => {
            void library.deleteNote(problemId)
          }}
          onClose={() => setRowPanel(null)}
        />
      )
    }
    return (
      <ListPicker
        problemId={problemId}
        problemTitle={location.problem.title}
        lists={library.lists}
        disabled={library.busy || !library.signedIn}
        onToggle={(listId) => {
          void library.toggleProblemInList(listId, problemId)
        }}
        onCreate={(title) => {
          void library.createList(title, problemId)
        }}
        onClose={() => setRowPanel(null)}
      />
    )
  }

  /* --- per-route props --------------------------------------------------- */

  const navCounts = {
    today: `${dayTally.movedToday}/${dayTally.goal}`,
    topics: `${tally.done}/${tally.total}`,
    code: undefined,
    review: queue.due.length > 0 ? String(queue.due.length) : undefined,
  }

  const accountForMenu = account.user
    ? {
        displayName: account.user.displayName,
        email: account.user.email,
        initials: initials(account.user.displayName),
      }
    : null

  const setFilters = (next: Filters) => navigate('search', '', { ...toQueryParams(next) }, true)

  const clearFilters = () => {
    setPick(null)
    setRevealed(null)
    navigate('search', '', {}, true)
  }

  const randomPickNow = () => {
    const next = pickRandom(sheet)
    if (!next) return
    setPick(next)
    setRevealed(next.problem.id)
    setOpenTopics((current) => new Set(current).add(next.topicId))
  }

  const openSearchFor = (params: Record<string, string>) => navigate('search', '', params)

  const pageContext = contextFor(route, {
    tally,
    summary,
    queue: queue.due.length,
    hint,
    dayTally,
  })

  return (
    <div
      className={settings.largeText ? 'app-root large-text' : 'app-root'}
      data-theme={settings.theme}
      data-density={settings.density}
      data-rail={settings.railCollapsed ? 'collapsed' : 'expanded'}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className="app-layout">
        <NavSidebar route={route} counts={navCounts} />

        <div className="app-body">
          <TopBar
            settings={settings}
            account={accountForMenu}
            syncLabel={syncLabel}
            syncTone={syncTone}
            onOpenPalette={() => setPaletteOpen(true)}
            onOpenShortcuts={() => setShortcutsOpen(true)}
            onOpenSearch={() => {
              navigate('search')
              setSearchSignal((value) => value + 1)
            }}
            installable={installPrompt.canInstall}
            onInstall={() => void installPrompt.install()}
            onSignIn={() => void account.signIn()}
            onSignOut={() => void account.signOut()}
            onOpenAccount={() => navigate('settings')}
            busy={account.busy}
          />

          <main id="main-content" className="app-main" tabIndex={-1}>
            <PageHeader
              title={ROUTE_TITLES[route.name]}
              context={pageContext}
              testId="page-header"
              action={
                <span className="progress-pill num" data-testid="progress-pill">
                  {tally.done}/{tally.total} done
                </span>
              }
            />

            {error ? (
              <Banner
                tone="danger"
                role="alert"
                testId={error.startsWith('Invalid backup:') ? 'backup-error' : 'account-error'}
                title="Something needs attention"
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      data.dismissError()
                      planner.dismissError()
                      library.dismissError()
                    }}
                  >
                    Dismiss
                  </Button>
                }
              >
                {error}
              </Banner>
            ) : null}

            {notice ? (
              <Banner
                tone="neutral"
                testId="account-notice"
                title={notice}
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      data.dismissNotice()
                      planner.dismissNotice()
                      library.dismissNotice()
                    }}
                  >
                    Dismiss
                  </Button>
                }
              />
            ) : null}

            {data.mergeProposal ? (
              <Banner
                tone="action"
                testId="merge-notice"
                title="Merge guest progress?"
                action={
                  <>
                    <Button size="sm" variant="primary" disabled={data.busy} onClick={data.mergeGuestProgress}>
                      Merge guest rows
                    </Button>
                    <Button size="sm" disabled={data.busy} onClick={data.keepCloudProgress}>
                      Keep cloud only
                    </Button>
                  </>
                }
              >
                {data.mergeProposal.guestRows} guest row{data.mergeProposal.guestRows === 1 ? '' : 's'} and{' '}
                {data.mergeProposal.cloudRows} cloud row{data.mergeProposal.cloudRows === 1 ? '' : 's'} found. Guest
                rows are newer on {data.mergeProposal.guestWins} topic{data.mergeProposal.guestWins === 1 ? '' : 's'};
                cloud is newer on {data.mergeProposal.cloudWins}. Nothing is merged until you choose.
              </Banner>
            ) : null}

            {/* The v1 app showed a persistent account banner in both states,
                and every signed-in e2e flow anchors on it ("CI Owner"). v2 keeps
                the same two test ids so the flows stay honest about who is
                signed in, in one compact line. */}
            {signedIn && account.user ? (
              <Banner
                tone="action"
                testId="signed-in-banner"
                title={`Signed in as ${account.user.displayName}`}
              >
                Progress, notes and lists follow this account · offline changes sync on reconnect
              </Banner>
            ) : null}

            {!signedIn && account.status !== 'loading' ? (
              <Banner
                tone="neutral"
                testId="sign-in-banner"
                title="Sign in to save progress"
                action={
                  <>
                    <Button size="sm" variant="primary" disabled={account.busy} onClick={() => void account.signIn()}>
                      Sign in with Google
                    </Button>
                    {account.canUseTestGoogle ? (
                      <Button
                        size="sm"
                        data-testid="emulator-sign-in"
                        disabled={account.busy}
                        onClick={() => void account.signInWithTestGoogle()}
                      >
                        Use CI Google account
                      </Button>
                    ) : null}
                  </>
                }
              >
                Guest rows stay on this device until you choose to merge them. Browse and search signed out —
                progress, notes and lists follow an account.
              </Banner>
            ) : null}

            {route.name === 'today' ? (
              <TodayScreen
                signedIn={signedIn}
                tally={dayTally}
                streak={streak}
                dueCount={queue.due.length}
                hint={hint}
                sessionMinutes={sessionMinutes}
                onStartSession={() => setSessionMinutes(20)}
                onStopSession={() => setSessionMinutes(null)}
                onBrowseTopics={() => navigate('topics')}
                onOpen={(problemId) => openProblem(problemId)}
                onSuggest={() => planner.addManyToToday(suggestions)}
                onStartSessionWith={(problemId) => {
                  setSessionMinutes(20)
                  openProblem(problemId)
                }}
              >
                <TodayView
                  signedIn={signedIn}
                  ready={planner.ready}
                  today={today}
                  plan={planner.plan}
                  goal={data.dailyGoal}
                  tally={dayTally}
                  suggestions={suggestions}
                  continuePick={continuePick}
                  disabled={planner.busy || (signedIn && !data.cloudReady)}
                  onAdd={(problemId) => planner.addToToday(problemId)}
                  onRemove={(problemId) => planner.removeFromToday(problemId)}
                  onDone={completeToday}
                  onOpen={(problemId) => openProblem(problemId)}
                  onSetGoal={data.setDailyGoal}
                  onSuggest={() => planner.addManyToToday(suggestions)}
                />
              </TodayScreen>
            ) : null}

            {route.name === 'search' ? (
              <SheetScreen
                filters={filters}
                onFiltersChange={setFilters}
                query={query}
                sheet={sheet}
                progress={progress}
                entries={data.entries}
                today={today}
                progressDisabled={progressDisabled}
                openTopics={openTopics}
                onToggleTopic={(topicId, open) =>
                  setOpenTopics((current) => {
                    const next = new Set(current)
                    if (open) next.add(topicId)
                    else next.delete(topicId)
                    return next
                  })
                }
                onClearAll={clearFilters}
                randomPick={pick}
                revealed={revealed}
                onRandomPick={randomPickNow}
                onDismissPick={() => {
                  setPick(null)
                  setRevealed(null)
                }}
                rowPanel={rowPanel}
                onTogglePanel={(problemId, kind) =>
                  setRowPanel((current) =>
                    current && current.problemId === problemId && current.kind === kind
                      ? null
                      : { problemId, kind },
                  )
                }
                renderPanel={renderPanel}
                notes={library.notes}
                lists={library.lists}
                signedIn={library.signedIn}
                onToggleStatus={onToggleStatus}
                onToggleBookmark={onToggleBookmark}
                onOpenProblem={(problemId) => openProblem(problemId)}
                onPlan={onPlan}
                searchSignal={searchSignal}
                triageFocus={triageFocus}
              >
                {completedTopics.length > 0 ? (
                  <Banner tone="action" testId="topic-complete" title="Quiet win · topic complete">
                    {completedTopics.map((topic) => topic.title).join(' · ')} — every row is marked done.
                  </Banner>
                ) : null}
              </SheetScreen>
            ) : null}

            {route.name === 'topics' ? <TopicsScreen progress={progress} /> : null}
            {route.name === 'topic' ? <TopicScreen topicId={route.param} progress={progress} /> : null}
            {route.name === 'problem' ? <ProblemScreen problemId={route.param} /> : null}
            {route.name === 'code' ? <CodeScreen signedIn={signedIn} /> : null}
            {route.name === 'practice' ? <PracticeScreen /> : null}
            {route.name === 'quiz' ? <QuizHome signedIn={signedIn} /> : null}
            {route.name === 'insights' ? <InsightsScreen signedIn={signedIn} /> : null}

            {route.name === 'review' ? (
              <RevisionView
                signedIn={signedIn}
                today={today}
                due={queue.due}
                upcoming={queue.upcoming}
                graduated={queue.graduated}
                scheduled={queue.scheduled}
                disabled={!data.cloudReady || data.busy}
                onRevised={data.markRevised}
                onOpen={(problemId) => openProblem(problemId)}
              />
            ) : null}

            {route.name === 'stats' ? (
              <StatsView signedIn={signedIn} entries={data.entries} streak={streak} weekly={weekly} heat={heat} />
            ) : null}

            {route.name === 'lists' ? (
                <ListsView
                  signedIn={library.signedIn}
                  lists={library.lists}
                  disabled={library.busy}
                  onCreate={(title) => {
                    void library.createList(title)
                  }}
                  onRename={(listId, title) => {
                    void library.renameList(listId, title)
                  }}
                  onDelete={(listId) => {
                    void library.deleteList(listId)
                  }}
                  onRemove={(listId, problemId) => {
                    void library.toggleProblemInList(listId, problemId)
                  }}
                  onFilterSheet={(listId) => {
                    const list = library.lists[listId]
                    if (!list) return
                    openSearchFor({ q: '' })
                    feedback.notify('Filtering the sheet by list', list.title)
                  }}
                  onOpenProblem={(problemId) => openProblem(problemId)}
                />
            ) : null}

            {/* Searchable notes keep their own URL in v2 (`#/notes`) even though
                the v1 tab strip showed them beside lists. Nothing about the data
                moved — only where the two lists are addressed. */}
            {route.name === 'notes' ? (
                <NotesView
                  signedIn={library.signedIn}
                  notes={library.notes}
                  query={noteQuery}
                  onQueryChange={setNoteQuery}
                  onEdit={(problemId) => {
                    navigate('search', '', { q: locateProblem(problemId)?.problem.title ?? '' })
                    setRowPanel({ problemId, kind: 'note' })
                  }}
                  onOpen={(problemId) => openProblem(problemId)}
                />
            ) : null}

            {route.name === 'friends' ? <FriendsView friends={friends} today={today} /> : null}

            {route.name === 'settings' ? (
              <SettingsScreen
                theme={settings.theme}
                density={settings.density}
                largeText={settings.largeText}
                railCollapsed={settings.railCollapsed}
                onTheme={(theme: Theme) => setTheme(theme)}
                onDensity={(density: Density) => setDensity(density)}
                onLargeText={toggleLargeText}
                onRail={toggleRail}
              />
            ) : null}

            {route.name === 'settings' && account.user ? (
              <AccountPanel
                account={account}
                data={data}
                noteTotal={Object.keys(library.notes).length}
                listTotal={listChoices.length}
              />
            ) : null}

            {route.name === 'not-found' ? <NotFoundScreen path={route.path} /> : null}
          </main>

          <footer className="app-footer">
            DSA Archive · clean-room personal study archive (MIT for our own code &amp; data; outbound links belong
            to their authors) · installable offline-first PWA · no live deploy without an explicit owner command.
          </footer>
        </div>
      </div>

      <BottomBar route={route} counts={navCounts} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        route={route}
        settings={settings}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onToggleHideDone={toggleHideDone}
        onRunSession={() => {
          setSessionMinutes(20)
          navigate('today')
        }}
        onSignIn={() => void account.signIn()}
      />
      <ShortcutsSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}


/* --- Today ---------------------------------------------------------------- */

function TodayScreen({
  children,
  signedIn,
  tally,
  streak,
  dueCount,
  hint,
  sessionMinutes,
  onStartSession,
  onStopSession,
  onBrowseTopics,
  onOpen,
}: {
  children: ReactNode
  signedIn: boolean
  tally: ReturnType<typeof todayTally>
  streak: ReturnType<typeof streakInfo>
  dueCount: number
  hint: ReturnType<typeof weakestTopic>
  sessionMinutes: number | null
  onStartSession: () => void
  onStartSessionWith: (problemId: string) => void
  onStopSession: () => void
  onBrowseTopics: () => void
  onOpen: (problemId: string) => void
  onSuggest: () => void
}) {
  return (
    <div className="today-screen">
      <section className="hero" aria-label="Today at a glance">
        <div className="hero-main">
          <p className="hero-kicker">Your move</p>
          <p className="hero-number num" data-testid="hero-progress">
            {tally.movedToday}
            <span className="hero-of">/{tally.goal}</span>
          </p>
          <p className="hero-caption">
            {tally.goalMet
              ? 'Goal met. Revision still counts, and so does stopping.'
              : tally.movedToday === 0
                ? 'Nothing moved yet — one row is enough to count.'
                : `${tally.goal - tally.movedToday} to go. One row at a time.`}
          </p>
        </div>
        <div className="hero-side">
          <Stat value={streak.current} label="day streak" detail={`longest ${streak.longest}`} tone="action" />
          <Stat value={dueCount} label="due for revision" detail={dueCount === 0 ? 'queue clear' : 'open review'} />
          <div className="hero-actions">
            {sessionMinutes === null ? (
              <Button variant="primary" onClick={onStartSession} data-testid="start-session">
                <IconSpark size={16} /> Start a 20-minute session
              </Button>
            ) : (
              <Button variant="primary" onClick={onStopSession} data-testid="stop-session">
                <IconCheck size={16} /> {sessionMinutes}-minute session · stop
              </Button>
            )}
            <Button onClick={onBrowseTopics} data-testid="browse-topics">
              Browse topics <IconArrowRight size={14} />
            </Button>
          </div>
        </div>
      </section>

      {hint ? (
        <Card title="Focus next" className="focus-card">
          <div className="focus-row">
            <Ring value={hint.done} total={hint.total} size={48} />
            <div>
              <strong>{hint.title}</strong>
              <p className="quiet-note num">
                {hint.done}/{hint.total} done · {hint.remaining} left · lowest completion among the topics you have
                touched
              </p>
            </div>
            <a className="btn btn-secondary" href={`#/topic/${hint.topicId}`}>
              Open topic
            </a>
          </div>
        </Card>
      ) : (
        <Card title="Focus next" className="focus-card">
          <p className="quiet-note">
            Mark a few problems done and the topic with the lowest completion is suggested here. Until then,
            nothing is guessed.
          </p>
        </Card>
      )}

      {!signedIn ? (
        <Card title="The planner needs an account" className="planner-card">
          <p className="quiet-note">
            Today's plan, the revision queue and stats are computed from your own solve dates. Sign in from the top
            bar and they appear here; the sheet and its search keep working signed out.
          </p>
          <a className="btn btn-secondary" href="#/topics">
            Browse all 20 topics
          </a>
        </Card>
      ) : null}
      {children}
      <p className="today-footer-note quiet-note">
        <IconSearch size={14} /> Press <kbd className="kbd">⌘K</kbd> to jump to any problem, or{' '}
        <kbd className="kbd">g</kbd> <kbd className="kbd">p</kbd> for topics.
        <button type="button" className="text-link" onClick={() => onOpen('two-sum')}>
          Open Two Sum
        </button>
      </p>
    </div>
  )
}

/* --- context rail & account panel ---------------------------------------- */

function AccountPanel({
  account,
  data,
  noteTotal,
  listTotal,
}: {
  account: ReturnType<typeof useAccount>
  data: ReturnType<typeof useAccountData>
  noteTotal: number
  listTotal: number
}) {
  return (
    <Card title="Account & backup" className="account-panel" id="account-panel" data-testid="account-panel">
      <div className="account-identity">
        <strong>{account.user?.displayName}</strong>
        <span className="quiet-note">{account.user?.email}</span>
      </div>
      <p className="quiet-note">
        {data.cloudRows} cloud row{data.cloudRows === 1 ? '' : 's'} · {data.guestRows} guest row
        {data.guestRows === 1 ? '' : 's'} · {noteTotal} note{noteTotal === 1 ? '' : 's'} · {listTotal} list
        {listTotal === 1 ? '' : 's'} · friends and summaries are excluded from backups.
      </p>
      <div className="inline-actions">
        <Button onClick={() => void data.exportBackup()}>Export backup JSON</Button>
        <label className="btn btn-secondary file-label">
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
        <Button data-testid="sign-out" onClick={() => void account.signOut()}>
          Sign out
        </Button>
      </div>
      {data.importPreview ? (
        <div className="banner banner-action" role="status" data-testid="import-preview">
          <div className="banner-copy">
            <strong>Backup looks valid</strong>
            <span>
              {data.importPreview.counts.rows} row{data.importPreview.counts.rows === 1 ? '' : 's'} across{' '}
              {data.importPreview.counts.topics} topic{data.importPreview.counts.topics === 1 ? '' : 's'} · notes{' '}
              {data.importPreview.counts.notes} · lists {data.importPreview.counts.lists} · plans{' '}
              {data.importPreview.counts.plans}. Replacing happens only after confirmation.
            </span>
          </div>
          <div className="banner-actions">
            <Button size="sm" variant="primary" disabled={data.busy || !data.profileReady} onClick={data.confirmImport}>
              Replace my progress
            </Button>
            <Button size="sm" variant="ghost" onClick={data.cancelImport}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

/* --- helpers -------------------------------------------------------------- */

function contextFor(
  route: Route,
  facts: {
    tally: ReturnType<typeof tallyCatalogue>
    summary: ReturnType<typeof summarizeCatalogue>
    queue: number
    hint: ReturnType<typeof weakestTopic>
    dayTally: ReturnType<typeof todayTally>
  },
) {
  switch (route.name) {
    case 'today':
      return `Today · ${facts.dayTally.movedToday}/${facts.dayTally.goal} planned rows moved`
    case 'topics':
      return `${facts.summary.topicCount} topics · ${facts.tally.total} rows · ${facts.tally.percent}% done`
    case 'search':
      return 'All 495 rows, searchable — press / to focus the field'
    case 'review':
      return `${facts.queue} due now · 3 → 7 → 21 day schedule`
    case 'code':
      return 'One snippet per problem, synced and backed up'
    case 'settings':
      return 'Appearance, density and your data'
    case 'topic':
    case 'problem':
      return null
    default:
      return null
  }
}

/**
 * Roving keyboard triage (acceptance #11, §3.11): `j`/`k` move one focus ring
 * over the mounted rows, `x` toggles done, `s` stars, `↵` opens. The focus id
 * lives in `src/app/triage.ts` so a re-render (or a mutation) keeps the ring in
 * place. Keys never fire while a field has the caret.
 */
function useTriage(
  handlers: {
    onStatus: (topicId: string, problemId: string) => void
    onBookmark: (topicId: string, problemId: string) => void
    onOpen: (problemId: string) => void
  },
  routeName: RouteName,
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (routeName !== 'search' && routeName !== 'today') return
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key
      if (key === 'j' || key === 'k') {
        event.preventDefault()
        const id = moveTriageFocus(key === 'j' ? 1 : -1)
        if (id) document.getElementById(`problem-${id}`)?.focus()
        return
      }
      if (key !== 'x' && key !== 's' && key !== 'Enter') return
      const focused = getTriageFocus()
      if (!focused) return
      const location = locateProblem(focused)
      if (!location) return
      if (key === 'x') {
        event.preventDefault()
        handlersRef.current.onStatus(location.topicId, focused)
      } else if (key === 's') {
        event.preventDefault()
        handlersRef.current.onBookmark(location.topicId, focused)
      } else {
        event.preventDefault()
        handlersRef.current.onOpen(focused)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [routeName])
}

export { WINDOW_SIZE, topicRingValue }
