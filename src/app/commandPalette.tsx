/**
 * ⌘K command palette (phase v2-01, §3.10).
 *
 * One fuzzy list over everything the app can reach: every route, all 20 topics,
 * every problem by title, and the shell/settings actions. Keyboard-only
 * operable end to end — `↑ ↓` move, `↵` runs, `esc` closes — with the result
 * count announced politely. Nothing here mutates study data directly; actions
 * call the same handlers the visible UI calls.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { catalogue } from '../catalogue'
import { navigate, type Route } from './router'
import { ROUTE_ICONS } from '../design/icons'
import { Kbd, Sheet } from '../design/primitives'
import { DENSITY_LABELS, cycleDensity, setDensity, toggleTheme, type Settings } from '../settings'

export type PaletteAction = {
  id: string
  label: string
  detail?: string
  group: 'Go to' | 'Topic' | 'Problem' | 'Action'
  /** Phase v2-08: the reasons for a row, shown beside it and never scored. */
  reason?: string
  keywords?: string
  run: () => void
  /** Recently visited routes float to the top of an empty query. */
  recentKey?: string
}

const RECENT_KEY = 'dsa-archive.palette-recent.v1'
const MAX_RESULTS = 40

export function readRecents(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string').slice(0, 8) : []
  } catch {
    return []
  }
}

export function pushRecent(label: string) {
  try {
    const next = [label, ...readRecents().filter((item) => item !== label)].slice(0, 8)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Recents are a convenience.
  }
}

/**
 * Subsequence match with a preference for word-start hits, so "ts" finds
 * "Two Sum" and "bs" finds "Binary Search". Returns a score or -1.
 */
export function fuzzyScore(query: string, text: string): number {
  const needle = query.trim().toLowerCase()
  if (needle === '') return 0
  const haystack = text.toLowerCase()
  let index = 0
  let score = 0
  let lastHit = -2
  for (const char of needle) {
    const found = haystack.indexOf(char, index)
    if (found === -1) return -1
    const wordStart = found === 0 || /[\s\-/(]/.test(haystack[found - 1] ?? '')
    score += wordStart ? 6 : 1
    if (found === lastHit + 1) score += 1
    lastHit = found
    index = found + 1
  }
  // Earlier matches win ties: "two" beats "how to …".
  score += Math.max(0, 10 - haystack.indexOf(needle[0]))
  if (haystack.startsWith(needle)) score += 12
  return score
}

export function rankActions(actions: PaletteAction[], query: string, recents: string[] = []): PaletteAction[] {
  const ordered = [...actions]
  if (query.trim() === '') {
    const recentSet = new Map(recents.map((label, index) => [label, index]))
    ordered.sort((a, b) => {
      const ra = recentSet.get(a.label)
      const rb = recentSet.get(b.label)
      if (ra !== undefined && rb !== undefined) return ra - rb
      if (ra !== undefined) return -1
      if (rb !== undefined) return 1
      return a.label.localeCompare(b.label)
    })
    // The empty state is a launcher, not the whole catalogue: routes and actions
    // first, then topics, then the first problems in catalogue order.
    const grouped = (group: PaletteAction['group']) => ordered.filter((action) => action.group === group)
    return [
      ...grouped('Go to'),
      ...grouped('Action'),
      ...grouped('Topic'),
      ...grouped('Problem'),
    ].slice(0, MAX_RESULTS)
  }
  return ordered
    .map((action) => {
      const score = Math.max(
        fuzzyScore(query, action.label),
        action.keywords ? fuzzyScore(query, action.keywords) - 2 : -1,
        action.detail ? fuzzyScore(query, action.detail) - 3 : -1,
      )
      return { action, score }
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.action.label.localeCompare(b.action.label))
    .slice(0, MAX_RESULTS)
    .map((item) => item.action)
}

export type PaletteConfig = {
  route: Route
  settings: Settings
  onOpenShortcuts: () => void
  onToggleHideDone: () => void
  onSetDensity: (density: Settings['density']) => void
  onRunSession: () => void
  onSignIn: () => void
  /** problemId → one reason line (only rows that have a reason appear). */
  reasons?: Record<string, string>
}

export function buildActions(config: PaletteConfig): PaletteAction[] {
  const routes: { label: string; name: Parameters<typeof navigate>[0]; detail: string }[] = [
    { label: 'Today', name: 'today', detail: 'Planned rows and the daily goal' },
    { label: 'Topics', name: 'topics', detail: 'All 20 topics' },
    { label: 'Code', name: 'code', detail: 'Your saved solutions, searchable' },
    { label: 'Review', name: 'review', detail: 'Revision queue' },
    { label: 'Search the sheet', name: 'search', detail: 'Search and filter 495 rows' },
    { label: 'My lists', name: 'lists', detail: 'Custom lists' },
    { label: 'Stats', name: 'stats', detail: 'Streak and weekly counts' },
    { label: 'Friends', name: 'friends', detail: 'Opt-in summaries' },
    { label: 'Insights', name: 'insights', detail: 'Momentum, trajectory, detectors' },
    { label: 'Settings', name: 'settings', detail: 'Theme, density, backup' },
  ]

  const actions: PaletteAction[] = routes.map((route) => ({
    id: `route:${route.name}`,
    label: route.label,
    detail: route.detail,
    group: 'Go to',
    keywords: `go open ${route.name}`,
    run: () => navigate(route.name),
  }))

  for (const topic of catalogue.topics) {
    actions.push({
      id: `topic:${topic.id}`,
      label: topic.title,
      detail: 'Topic',
      group: 'Topic',
      keywords: topic.id.replaceAll('-', ' '),
      run: () => navigate('topic', topic.id),
    })
    for (const subtopic of topic.subtopics) {
      for (const problem of subtopic.problems) {
        actions.push({
          id: `problem:${problem.id}`,
          label: problem.title,
          detail: `${topic.title}${subtopic.title ? ` · ${subtopic.title}` : ''}`,
          group: 'Problem',
          keywords: `${problem.id} ${problem.kind}`,
          reason: config.reasons?.[problem.id],
          run: () => navigate('problem', problem.id),
        })
      }
    }
  }

  actions.push({
    id: 'action:theme',
    label: `Theme: switch to ${config.settings.theme === 'dark' ? 'light' : 'dark'}`,
    detail: 'Appearance',
    group: 'Action',
    keywords: 'theme dark light appearance',
    run: toggleTheme,
  })

  actions.push(
    {
      id: 'action:quiz',
      label: 'Start a 4-minute quiz check',
      detail: 'Quizzes',
      group: 'Action',
      keywords: 'quiz check test topic',
      run: () => navigate('quiz'),
    },
    {
      id: 'action:shortcuts',
      label: 'Keyboard shortcuts',
      detail: 'Press ?',
      group: 'Action',
      keywords: 'help keys',
      run: config.onOpenShortcuts,
    },
    {
      id: 'action:hide-done',
      label: `${config.settings.hideDone ? 'Show' : 'Hide'} done rows`,
      detail: 'Sheet filter',
      group: 'Action',
      keywords: 'filter done hide show',
      run: config.onToggleHideDone,
    },
    {
      id: 'action:session',
      label: 'Start a 20-minute session',
      detail: 'Today',
      group: 'Action',
      keywords: 'pomodoro focus timer session',
      run: config.onRunSession,
    },
    {
      id: 'action:density-cycle',
      label: `Density: ${DENSITY_LABELS[config.settings.density]} → next`,
      detail: 'Row height',
      group: 'Action',
      keywords: 'density compact comfortable roomy rows',
      run: cycleDensity,
    },
    {
      id: 'action:sign-in',
      label: 'Sign in with Google',
      detail: 'Sync progress',
      group: 'Action',
      keywords: 'account login login google',
      run: config.onSignIn,
    },
  )

  for (const density of ['compact', 'comfortable', 'roomy'] as const) {
    actions.push({
      id: `action:density:${density}`,
      label: `Density: ${DENSITY_LABELS[density]}`,
      detail: 'Row height',
      group: 'Action',
      keywords: `density ${density} rows`,
      run: () => config.onSetDensity(density),
    })
  }

  for (const level of ['basic', 'core', 'pro'] as const) {
    actions.push({
      id: `action:filter:${level}`,
      label: `Filter: ${level}`,
      detail: 'Open the sheet filtered by level',
      group: 'Action',
      keywords: `filter level ${level}`,
      run: () => navigate('search', '', { level }),
    })
  }

  return actions
}

export function CommandPalette({
  open,
  onClose,
  route,
  settings,
  onOpenShortcuts,
  onToggleHideDone,
  onRunSession,
  onSignIn,
  reasons,
}: {
  open: boolean
  onClose: () => void
  route: Route
  settings: Settings
  onOpenShortcuts: () => void
  onToggleHideDone: () => void
  onRunSession: () => void
  onSignIn: () => void
  reasons?: Record<string, string>
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const actions = useMemo(
    () =>
      buildActions({
        route,
        settings,
        onOpenShortcuts,
        onToggleHideDone,
        onSetDensity: setDensity,
        onRunSession,
        onSignIn,
        reasons,
      }),
    [route, settings, onOpenShortcuts, onToggleHideDone, onRunSession, onSignIn, reasons],
  )
  const results = useMemo(() => rankActions(actions, query, readRecents()), [actions, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    setActive((current) => Math.min(current, Math.max(0, results.length - 1)))
  }, [open, results.length])

  const run = (action: PaletteAction | undefined) => {
    if (!action) return
    pushRecent(action.label)
    onClose()
    action.run()
  }

  return (
    <Sheet open={open} onClose={onClose} label="Command palette" placement="top" className="palette">
      <div className="palette-head">
        <input
          ref={inputRef}
          className="palette-input"
          type="search"
          placeholder="Jump to a route, topic or problem…"
          aria-label="Command palette search"
          aria-describedby={`${listId}-hint`}
          data-testid="palette-input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((current) => Math.min(current + 1, results.length - 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((current) => Math.max(current - 1, 0))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              run(results[active])
            } else if (event.key === 'Escape') {
              event.preventDefault()
              onClose()
            }
          }}
        />
        <span className="palette-hint" id={`${listId}-hint`}>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> move · <Kbd>↵</Kbd> open
        </span>
      </div>
      <p className="visually-hidden" aria-live="polite" data-testid="palette-count">
        {results.length} result{results.length === 1 ? '' : 's'}.
        {results[active] ? ` Selected: ${results[active].label}.` : ''}
      </p>
      {results.length === 0 ? (
        <p className="palette-empty" data-testid="palette-empty">
          Nothing matches “{query}”. Try a topic name or a problem title.
        </p>
      ) : (
        <ul className="palette-list" ref={listRef} data-testid="palette-list">
          {results.map((action, index) => {
            const groupIcon = action.group === 'Topic' ? 'topics' : action.group === 'Problem' ? 'problem' : 'search'
            const Icon = ROUTE_ICONS[groupIcon]
            const previous = results[index - 1]
            const showGroup = !previous || previous.group !== action.group
            return (
              <li key={action.id}>
                {showGroup ? <p className="palette-group">{action.group}</p> : null}
                <button
                  type="button"
                  className={index === active ? 'palette-item is-active' : 'palette-item'}
                  data-testid="palette-option"
                  aria-current={index === active ? 'true' : undefined}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onClick={() => run(action)}
                >
                  <Icon size={16} />
                  <span className="palette-item-label">{action.label}</span>
                  {action.detail ? <span className="palette-item-detail">{action.detail}</span> : null}
                  {action.reason ? <span className="palette-item-reason">{action.reason}</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
