import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { catalogue, summarizeCatalogue } from './catalogue'
import { getProgressSnapshot, replaceGuestProgress, tallyCatalogue, tallyTopic } from './progress'
import {
  setDensity,
  setTargetDate,
  setTargetList,
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
import { ListsView } from './ListsView'
import { ListPicker } from './ListPicker'
import { locateProblem, sortLists } from './library'
import { useAccount } from './account'
import { useLibrary } from './libraryData'
import { useCode } from './code/codeData'
import { CodeScreen } from './code/codeScreen'
import { CodePanel } from './code/editor'
import { useAccountData } from './accountData'
import { usePlanner } from './plannerData'
import { useFriends } from './friendsData'
import { FriendsView } from './FriendsView'
import { useInstallPrompt } from './pwa'
import { RevisionView, StatsView, TodayView } from './PlannerViews'
import {
  activityByDay,
  continueWhereLeft,
  daysBetween,
  heatmap,
  revisionQueue,
  streakInfo,
  suggestedPicks,
  todayTally,
  weeklyStats,
} from './planner'
import { reasonsForAll, reasonLine, type Target } from './insights/reasons'
import { momentum as momentumOf } from './insights/momentum'
import { planVsReality, trajectory } from './insights/trajectory'
import { codeQueryForIds, detectors as detectorsOf, dismissForToday, readDismissed } from './insights/detectors'
import type { Detector } from './insights/detectors'
import { navigate, onRouteChange, rememberScrollMaybe, type Route, type RouteName } from './app/router'
import { installShortcuts, ShortcutsSheet } from './app/shortcuts'
import { FeedbackProvider, useFeedback } from './app/feedback'
import { CommandPalette } from './app/commandPalette'
import { getTriageFocus, moveTriageFocus, setTriageFocus, useTriageFocus } from './app/triage'
import { Banner, BottomBar, NavSidebar, PageHeader, TopBar } from './app/shell'
import { SheetScreen, WINDOW_SIZE, topicRingValue } from './app/sheetScreen'
import { TopicsScreen } from './app/topicsScreen'
import { TopicPage } from './topics/topicPage'
import { InsightsScreen } from './insights/insightsScreen'
import { NotFoundScreen, SettingsScreen } from './app/placeholderScreens'
import { ServiceWorkerUpdateToast } from './app/swUpdate'
// The theatre's *screens* are a lazy route chunk (phase v2-06 §7): the
// problem page is the only route that needs the player, and the shell must not
// pay for it. Models + the mini player stay eager, because a video that keeps
// playing has to dock on any route.
const ProblemScreen = lazy(() => import('./theatre/problemPage').then((mod) => ({ default: mod.ProblemScreen })))
// Phase v2-09: destructive account tools are an installed add-on, never
// precached, so the owner's frozen 393 kB shell cap is untouched.
const DeleteDataCard = lazy(() => import('./app/deleteDataCard'))
import { MiniPlayer } from './theatre/miniPlayer'
import { PracticeScreen } from './app/practiceScreen'
import { getTests, getTheoryMcq, getTopicContent } from './content/load'
import { TheoryMcqCard } from './quiz/mcqCard'
import { QuizHome } from './quiz/quizHome'
import { QuizScreen } from './quiz/quizScreen'
import { useQuizResults } from './quiz/results'
import { Button, Card, Ring, Stat, ToastHost } from './design/primitives'
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
  const code = useCode(account)
  const codeSync = { busy: code.busy, pending: code.pending, online: code.online }
  const codeCount = Object.keys(code.snippets).length
  const planner = usePlanner(account)
  const quiz = useQuizResults(account)
  const data = useAccountData(account, library, code, planner, quiz)
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
  const [rowPanel, setRowPanel] = useState<{ problemId: string; kind: 'code' | 'lists' | 'theory' } | null>(null)
  const [openTopics, setOpenTopics] = useState<ReadonlySet<string>>(() => new Set())
  const [pick, setPick] = useState<RandomPick | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [sessionMinutes, setSessionMinutes] = useState<number | null>(null)
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

  // Old v1 bookmarks were path-based (`/lists`); translate them to hash routes.
  // `/notes` is deliberately absent: that feature was deleted in v2-04.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const path = window.location.pathname.replace(/\/+$/, '')
    if (path && path !== '' && path !== '/index.html' && !window.location.hash) {
      const map: Record<string, RouteName> = {
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
  /* --- phase v2-08: the insight layer (all derived, nothing stored) ------ */
  const targetListIds = useMemo(
    () => (settings.targetListId ? (library.lists[settings.targetListId]?.problemIds ?? []) : []),
    [library.lists, settings.targetListId],
  )
  const targetListTitle = settings.targetListId
    ? (library.lists[settings.targetListId]?.title ?? null)
    : null
  const target = useMemo<Target>(
    () => ({ date: settings.targetDate, listId: settings.targetListId, listProblemIds: targetListIds }),
    [settings.targetDate, settings.targetListId, targetListIds],
  )
  // A deadline inside two weeks is the one thing that reorders the picks.
  const targetImminent = Boolean(
    settings.targetDate && daysBetween(today, settings.targetDate) <= 14 && daysBetween(today, settings.targetDate) >= 0,
  )
  const suggestions = useMemo(
    () => suggestedPicks(data.entries, planner.plan, 5, targetImminent ? targetListIds : []),
    [data.entries, planner.plan, targetImminent, targetListIds],
  )
  const insightExtra = useMemo(
    () => ({ weakestTopicId: hint?.topicId ?? null, quizResults: quiz.results }),
    [hint?.topicId, quiz.results],
  )
  const todayReasons = useMemo(
    () =>
      reasonsForAll(
        [...(planner.plan?.problemIds ?? []), ...suggestions],
        data.entries,
        planner.plan,
        today,
        target,
        insightExtra,
      ),
    [data.entries, planner.plan, suggestions, today, target, insightExtra],
  )
  const paletteReasons = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(todayReasons).map(([problemId, list]) => [problemId, reasonLine(list)]),
      ),
    [todayReasons],
  )
  const practiceReasons = useMemo(() => {
    if (route.name !== 'topic') return {}
    const topic = catalogue.topics.find((item) => item.id === route.param)
    if (!topic) return {}
    return reasonsForAll(
      topic.subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id)),
      data.entries,
      planner.plan,
      today,
      target,
      insightExtra,
    )
  }, [route.name, route.param, data.entries, planner.plan, today, target, insightExtra])
  const activity = useMemo(() => activityByDay(data.entries), [data.entries])
  const momentumNow = useMemo(() => momentumOf(data.entries, today), [data.entries, today])
  const trajectoryNow = useMemo(
    () =>
      trajectory({
        activity,
        done: tally.done,
        total: tally.total,
        today,
        targetDate: settings.targetDate,
      }),
    [activity, tally.done, tally.total, today, settings.targetDate],
  )
  const reality = useMemo(
    () => planVsReality({ activity, planned: dayTally.planned, completed: dayTally.done, goal: data.dailyGoal, today }),
    [activity, dayTally.planned, dayTally.done, data.dailyGoal, today],
  )
  const foundDetectors = useMemo(
    () => detectorsOf(data.entries, code.snippets, today),
    [data.entries, code.snippets, today],
  )
  const [dismissedDetectors, setDismissedDetectors] = useState<string[]>(() => readDismissed(today))
  const visibleDetectors = useMemo(
    () => foundDetectors.filter((detector) => !dismissedDetectors.includes(detector.id)),
    [foundDetectors, dismissedDetectors],
  )
  const runDetectorAction = useCallback(
    (detector: Detector) => {
      if (detector.id === 'stale-code') {
        navigate('code', '', codeQueryForIds(detector.problemIds))
        return
      }
      const added = detector.problemIds
      planner.addManyToToday(added)
      feedback.undoable({
        key: `detector:${detector.id}`,
        message: `Added ${added.length} forgotten rows to today`,
        revert: () => added.forEach((problemId) => planner.removeFromToday(problemId)),
      })
    },
    [feedback, planner],
  )
  const dismissDetector = useCallback(
    (detector: Detector) => setDismissedDetectors(dismissForToday(detector.id, today)),
    [today],
  )
  const continuePick = useMemo(() => continueWhereLeft(data.entries), [data.entries])

  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const signedIn = account.status === 'signed-in'
  const progressDisabled = (signedIn && !data.cloudReady) || data.busy
  const error = data.error ?? planner.error ?? library.error ?? code.error ?? quiz.error
  const notice = data.notice ?? planner.notice ?? library.notice ?? code.notice ?? quiz.notice
  const syncLabel =
    data.syncState === 'synced' && (library.pending || code.pending || quiz.pending)
      ? 'Changes pending'
      : data.syncLabel
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

  const onMarkDoneWithOutcome = useCallback(
    (topicId: string, problemId: string, outcome: 'clean' | 'hint' | 'couldnt') => {
      const wasDone = progress[topicId]?.[problemId]?.s === 'done'
      data.markDoneWithOutcome(topicId, problemId, outcome)
      if (!wasDone) undoStatus(topicId, problemId, false)
    },
    [data, progress, undoStatus],
  )

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

  /**
   * Open a problem, optionally on one of its tabs. The tab is URL state
   * (phase v2-06), and `navigate` is a no-op when the hash is unchanged — so the
   * code screen's row link must carry `?tab=code` for the page to land there.
   */
  const openProblem = useCallback((problemId: string | undefined, tab?: 'code') => {
    if (!problemId) return
    navigate('problem', problemId, tab ? { tab } : {})
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

  const renderPanel = (problemId: string, kind: 'code' | 'lists' | 'theory') => {
    const location = locateProblem(problemId)
    if (!location) return null
    if (kind === 'theory') {
      const mcq = getTheoryMcq(problemId)
      if (!mcq) return null
      const firstSection = getTopicContent(location.topicId)?.sections[0] ?? null
      return (
        <TheoryMcqCard
          mcq={mcq}
          topicTitle={location.topicTitle}
          progress={progress[location.topicId]?.[problemId]}
          rereadSection={firstSection ? { id: firstSection.id, title: firstSection.title } : null}
          onMarkClean={() => onMarkDoneWithOutcome(location.topicId, problemId, 'clean')}
          onMarkReadWithHint={() => onMarkDoneWithOutcome(location.topicId, problemId, 'hint')}
        />
      )
    }
    if (kind === 'code') {
      const snippet = code.snippets[problemId] ?? null
      return (
        <CodePanel
          key={`${problemId}-${snippet?.updatedAt ?? 'new'}`}
          problemId={problemId}
          problemTitle={location.problem.title}
          snippet={snippet}
          signedIn={code.signedIn}
          disabled={code.busy || !code.signedIn}
          sync={codeSync}
          cases={getTests(problemId)}
          initialMode="edit"
          onSave={(draft) => {
            void code.saveSnippet(problemId, draft)
          }}
          onDelete={() => {
            void code.deleteSnippet(problemId)
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
    code: codeCount > 0 ? String(codeCount) : undefined,
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
                      code.dismissError()
                      quiz.dismissError()
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
                      code.dismissNotice()
                      quiz.dismissNotice()
                    }}
                  >
                    Dismiss
                  </Button>
                }
              />
            ) : null}

            {quiz.mergePrompt ? (
              <Banner
                tone="action"
                testId="quiz-merge-notice"
                title="Merge guest quiz scores?"
                action={
                  <>
                    <Button
                      size="sm"
                      disabled={quiz.busy}
                      data-testid="quiz-merge-confirm"
                      onClick={() => void quiz.mergeGuestIntoCloud()}
                    >
                      Merge quiz scores
                    </Button>
                    <Button size="sm" variant="ghost" onClick={quiz.keepSeparate}>
                      Keep separate
                    </Button>
                    <Button size="sm" variant="ghost" onClick={quiz.discardGuestResults}>
                      Discard guest scores
                    </Button>
                  </>
                }
              >
                {quiz.mergePrompt.topicCount} guest quiz score
                {quiz.mergePrompt.topicCount === 1 ? '' : 's'} found on this browser. Merging keeps the higher best
                score per topic. Nothing changes until you choose.
              </Banner>
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
                Progress, saved code and lists follow this account · offline changes sync on reconnect
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
                progress, saved code and lists follow an account.
              </Banner>
            ) : null}

            {route.name === 'today' ? (
              <TodayScreen
                signedIn={signedIn}
                tally={dayTally}
                momentum={momentumNow}
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
                  reasons={todayReasons}
                  momentum={momentumNow}
                  reality={reality}
                  detectors={visibleDetectors}
                  dueCount={queue.due.length}
                  weakestTitle={hint?.title ?? null}
                  targetDate={settings.targetDate}
                  targetListTitle={targetListTitle}
                  onDetectorAction={runDetectorAction}
                  onDetectorDismiss={dismissDetector}
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
                snippets={code.snippets}
                lists={library.lists}
                signedIn={library.signedIn}
                onToggleStatus={onToggleStatus}
                onToggleBookmark={onToggleBookmark}
                onSetOutcome={data.setOutcome}
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

            {route.name === 'topics' ? (
              <TopicsScreen
                progress={progress}
                entries={data.entries}
                today={today}
                quizResults={quiz.results}
              />
            ) : null}
            {route.name === 'topic' ? (
              <TopicPage
                snippets={code.snippets}
                topicId={route.param}
                tabQuery={route.query.tab}
                sectionQuery={route.query.section}
                quizResult={quiz.results[route.param]}
                reasons={practiceReasons}
                progress={progress}
                entries={data.entries}
                today={today}
                dueCount={queue.due.filter((item) => item.topicId === route.param).length}
                disabled={progressDisabled}
                onToggleStatus={data.toggleStatus}
                onToggleBookmark={data.toggleBookmark}
                onSetOutcome={data.setOutcome}
                onMarkDoneWithOutcome={onMarkDoneWithOutcome}
                onOpenProblem={(problemId) => openProblem(problemId)}
                onPlan={onPlan}
              />
            ) : null}
            {route.name === 'problem' ? (
              <Suspense fallback={<Banner tone="neutral" testId="theatre-loading" title="Opening the theatre…">The player loads only on this route.</Banner>}>
              <ProblemScreen
                problemId={route.param}
                progress={(() => {
                  const loc = locateProblem(route.param)
                  return loc ? progress[loc.topicId]?.[route.param] : undefined
                })()}
                snippet={code.snippets[route.param] ?? null}
                signedIn={code.signedIn}
                codeDisabled={code.busy || !code.signedIn}
                codeSync={codeSync}
                planProblemIds={planner.plan?.problemIds ?? []}
                online={online}
                onMarkDoneWithOutcome={onMarkDoneWithOutcome}
                onSetOutcome={data.setOutcome}
                onPlan={onPlan}
                onSaveCode={(draft) => {
                  void code.saveSnippet(route.param, draft)
                }}
                onDeleteCode={() => {
                  void code.deleteSnippet(route.param)
                }}
                onUndoable={feedback.undoable}
                onNotify={feedback.notify}
              />
              </Suspense>
            ) : null}
            {route.name === 'code' ? (
              <CodeScreen
                signedIn={code.signedIn}
                ready={code.ready}
                snippets={code.snippets}
                query={route.query}
                onOpenProblem={(problemId) => openProblem(problemId, 'code')}
              />
            ) : null}
            {route.name === 'practice' ? (
              <PracticeScreen
                progress={progress}
                disabled={progressDisabled}
                onToggleStatus={data.toggleStatus}
                onPlan={onPlan}
                onOpenProblem={(problemId) => openProblem(problemId)}
              />
            ) : null}
            {route.name === 'quiz' ? (
              route.param ? <QuizScreen route={route} quiz={quiz} /> : <QuizHome quiz={quiz} />
            ) : null}
            {route.name === 'insights' ? (
              <InsightsScreen
                signedIn={signedIn}
                momentum={momentumNow}
                trajectory={trajectoryNow}
                reality={reality}
                goal={data.dailyGoal}
                onSetGoal={data.setDailyGoal}
                detectors={visibleDetectors}
                onDetectorAction={runDetectorAction}
                onDetectorDismiss={dismissDetector}
                targetDate={settings.targetDate}
                targetListId={settings.targetListId}
                lists={listChoices.map((list) => ({ id: list.id, title: list.title }))}
                onTargetDate={setTargetDate}
                onTargetList={setTargetList}
              />
            ) : null}

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
                codeTotal={codeCount}
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

      {/* One mini player for the whole app: leaving a video's page keeps it playing. */}
      <MiniPlayer onOpen={(problemId) => openProblem(problemId)} />

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
        reasons={paletteReasons}
      />
      <ShortcutsSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ToastHost toasts={feedback.messages} onDismiss={feedback.dismiss}>
        <ServiceWorkerUpdateToast />
      </ToastHost>
    </div>
  )
}


/* --- Today ---------------------------------------------------------------- */

function TodayScreen({
  children,
  signedIn,
  tally,
  momentum,
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
  momentum: ReturnType<typeof momentumOf>
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
          <Stat
            value={momentum.value.toFixed(1)}
            label="momentum"
            detail={`${momentum.studyDaysThisWeek} study days this week`}
            tone="action"
          />
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

      {hint ? (
        <Card title="Weakest topic" className="focus-card">
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
        <Card title="Weakest topic" className="focus-card">
          <p className="quiet-note">
            Mark a few problems done and the topic with the lowest completion is suggested here. Until then,
            nothing is guessed.
          </p>
        </Card>
      )}
      <p className="today-footer-note quiet-note">
        <IconSearch size={14} /> Press <kbd className="kbd">⌘K</kbd> to jump to any problem, or{' '}
        <kbd className="kbd">g</kbd> <kbd className="kbd">p</kbd> for topics.
        {/* A shortcut hint is one line, not a paragraph: this sentence used to
            wrap on a phone and then put a bare "Open Two Sum" button under the
            footer, where it read as stray text (phase v2-10 screenshots). */}
        <span className="today-footer-extra">
          <button type="button" className="text-link" onClick={() => onOpen('two-sum')}>
            Open Two Sum
          </button>
        </span>
      </p>
    </div>
  )
}

/* --- context rail & account panel ---------------------------------------- */

function AccountPanel({
  account,
  data,
  codeTotal,
  listTotal,
}: {
  account: ReturnType<typeof useAccount>
  data: ReturnType<typeof useAccountData>
  codeTotal: number
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
        {data.guestRows === 1 ? '' : 's'} · {codeTotal} saved solution{codeTotal === 1 ? '' : 's'} · {listTotal} list
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
      {account.user ? (
        <Suspense fallback={null}>
          <DeleteDataCard
            uid={account.user.uid}
            onDeleted={() => {
              data.clearGuestProgress()
              void account.signOut()
            }}
          />
        </Suspense>
      ) : null}
      {data.importPreview ? (
        <div className="banner banner-action" role="status" data-testid="import-preview">
          <div className="banner-copy">
            <strong>Backup looks valid</strong>
            <span>
              {data.importPreview.counts.rows} row{data.importPreview.counts.rows === 1 ? '' : 's'} across{' '}
              {data.importPreview.counts.topics} topic{data.importPreview.counts.topics === 1 ? '' : 's'} · saved
              solutions {data.importPreview.counts.snippets} · lists {data.importPreview.counts.lists} · plans{' '}
              {data.importPreview.counts.plans} · quizzes {data.importPreview.counts.quizResults}. Replacing happens only after confirmation.
              {data.importPreview.warnings.map((warning) => (
                <span key={warning} className="import-warning" data-testid="import-warning">
                  {' '}
                  {warning}
                </span>
              ))}
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
    case 'quiz':
      return route.param ? '4-minute topic check · pass at ≥80%' : '12-question checks across the 20 topics'
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
