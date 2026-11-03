/**
 * Hash router (phase v2-01, §3.1 + `00-overview/PLAN.md` §A1).
 *
 * ~150 lines, zero dependencies, because Firebase Hosting serves static files
 * with `cleanUrls: false`: a hash route needs no server rewrite, works offline
 * behind the Service Worker, and survives a cold boot from a precached shell.
 *
 * The URL is the state. Every screen — and every filter, tab, video time and
 * code language — is bookmarkable and back-button correct:
 *
 *   #/                       Today
 *   #/topics                 all 20 topics
 *   #/topic/<topicId>        ?tab=learn|practice|quiz
 *   #/problem/<problemId>    ?t=<seconds>&lang=<code-lang>
 *   #/code                   ?lang=&topic=&q=
 *   #/practice               pattern drills (data lands in phase 03)
 *   #/review                 revision queue
 *   #/quiz                   quiz home
 *   #/insights               light insight screen (phase 08)
 *   #/settings               settings
 *   #/search?q=…             full-sheet search (the v1 sheet, re-chromed)
 *   #/lists, #/notes, #/friends, #/stats   carried over from v1
 *   #/not-found              friendly 404 — also the parse fallback
 */

export const ROUTE_NAMES = [
  'today',
  'topics',
  'topic',
  'problem',
  'code',
  'search',
  'practice',
  'review',
  'quiz',
  'insights',
  'settings',
  'lists',
  'notes',
  'friends',
  'stats',
  'not-found',
] as const

export type RouteName = (typeof ROUTE_NAMES)[number]

export type Route = {
  name: RouteName
  /** Dynamic segment (`topic/<id>`, `problem/<id>`); '' when not applicable. */
  param: string
  /** Parsed query string; repeated keys keep their first value. */
  query: Record<string, string>
  /** Canonical `#/…` form of this route, used by links and `navigate`. */
  path: string
}

/** Nav order used by the sidebar, bottom bar and the `g`-prefixed shortcuts. */
export const PRIMARY_ROUTES = ['today', 'topics', 'code', 'review'] as const

const KNOWN_PATHS: Record<string, RouteName> = {
  today: 'today',
  topics: 'topics',
  topic: 'topic',
  problem: 'problem',
  code: 'code',
  search: 'search',
  practice: 'practice',
  review: 'review',
  quiz: 'quiz',
  insights: 'insights',
  settings: 'settings',
  lists: 'lists',
  notes: 'notes',
  friends: 'friends',
  stats: 'stats',
  'not-found': 'not-found',
}

const SEGMENT_PARAM: Partial<Record<RouteName, boolean>> = {
  topic: true,
  problem: true,
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** `?a=1&b=2` → `{ a: '1', b: '2' }` (first value wins, `+` is a space). */
export function parseQuery(search: string): Record<string, string> {
  const out: Record<string, string> = {}
  const raw = search.startsWith('?') ? search.slice(1) : search
  if (!raw) return out
  for (const piece of raw.split('&')) {
    if (!piece) continue
    const index = piece.indexOf('=')
    const key = safeDecode(index === -1 ? piece : piece.slice(0, index)).trim()
    if (!key || key in out) continue
    const value = index === -1 ? '' : piece.slice(index + 1).replaceAll('+', ' ')
    out[key] = safeDecode(value)
  }
  return out
}

/** `{ a: '1', b: '' }` → `a=1&b=`; empty/undefined values are dropped. */
export function buildQuery(query: Record<string, string | number | boolean | null | undefined>) {
  const parts: string[] = []
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    // `encodeURIComponent` escapes spaces as %20; a URL that reads `q=two+sum`
    // is easier to share and matches what a search box produces.
    const encoded = encodeURIComponent(String(value)).replaceAll('%20', '+')
    parts.push(`${encodeURIComponent(key)}=${encoded}`)
  }
  return parts.join('&')
}

export function buildPath(name: RouteName, param = '', query: Record<string, string> = {}) {
  const base = name === 'today' ? '#/' : `#/${name}`
  const segment = param ? `/${encodeURIComponent(param)}` : ''
  const search = buildQuery(query)
  return `${base}${segment}${search ? `?${search}` : ''}`
}

function notFound(path: string): Route {
  return { name: 'not-found', param: '', query: {}, path }
}

/**
 * Parse a location hash. Accepts `#/topics`, `#topics`, `/#/topics?q=a` and a
 * bare pathname (`/topics`) so a pasted URL still lands somewhere sensible.
 * Anything unrecognised — unknown route, missing dynamic segment, malformed
 * escape — becomes `#/not-found` rather than a blank screen.
 */
export function parseRoute(hash: string): Route {
  let raw = (hash ?? '').trim()
  if (raw.includes('#')) raw = raw.slice(raw.indexOf('#') + 1)
  raw = raw.replace(/^!?\/?/, '')
  raw = raw === '' ? '' : `/${raw}`

  const [pathPart = '', searchPart = ''] = raw.split('?', 2)
  const segments = pathPart.split('/').filter(Boolean).map(safeDecode)
  if (segments.length === 0) return { name: 'today', param: '', query: {}, path: '#/' }

  const [head, second, ...rest] = segments
  const name = KNOWN_PATHS[head]
  if (!name) return notFound('#/not-found')
  if (rest.length > 0) return notFound('#/not-found')
  if (SEGMENT_PARAM[name]) {
    if (!second) return notFound('#/not-found')
    const query = parseQuery(searchPart)
    return { name, param: second, query, path: buildPath(name, second, query) }
  }
  if (second) return notFound('#/not-found')
  const query = parseQuery(searchPart)
  return { name, param: '', query, path: buildPath(name, '', query) }
}

/** Current hash, normalised to a `#/…` string ('' when absent). */
export function currentHash(): string {
  if (typeof window === 'undefined') return ''
  return window.location.hash || ''
}

export function navigate(name: RouteName, param = '', query: Record<string, string> = {}, replace = false) {
  if (typeof window === 'undefined') return
  const href = buildPath(name, param, query)
  if (replace) {
    window.history.replaceState(null, '', `${window.location.pathname}${href}`)
    window.dispatchEvent(new Event('hashchange'))
    return
  }
  if (window.location.hash === href) {
    window.dispatchEvent(new Event('hashchange'))
    return
  }
  window.location.hash = href
}

/** Navigate to an arbitrary in-app href (`#/topic/arrays?tab=learn`). */
export function openHref(href: string, replace = false) {
  if (typeof window === 'undefined' || !href.startsWith('#')) return
  if (replace) {
    window.history.replaceState(null, '', `${window.location.pathname}${href}`)
    window.dispatchEvent(new Event('hashchange'))
    return
  }
  if (window.location.hash === href) {
    window.dispatchEvent(new Event('hashchange'))
    return
  }
  window.location.hash = href
}

/** Scroll position per history entry, restored on back/forward. */
const scrollMemory = new Map<number, number>()
let memoryIndex = 0

/**
 * Subscribe to route changes. The listener receives the parsed route and runs
 * once immediately so the first paint already knows its URL. Scroll behaviour:
 * a new route starts at the top, and cached state (search box, filters) is
 * owned by the caller, so back/forward always re-renders the previous URL.
 */
export function onRouteChange(listener: (route: Route) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const emit = () => {
    listener(parseRoute(window.location.hash))
    const top = scrollMemory.get(memoryIndex) ?? 0
    memoryIndex += 1
    window.requestAnimationFrame?.(() => {
      try {
        window.scrollTo({ top, behavior: 'auto' })
      } catch {
        // jsdom has no layout; scrolling is a browser-only nicety.
      }
    })
  }
  const onHash = () => emit()
  window.addEventListener('hashchange', onHash)
  emit()
  return () => window.removeEventListener('hashchange', onHash)
}

/** Remember where the reader is before they leave the current route. */
export function rememberScrollMaybe(top = window.scrollY) {
  scrollMemory.set(memoryIndex - 1, top)
}

export function resetScrollMemoryForTests() {
  scrollMemory.clear()
  memoryIndex = 0
}
