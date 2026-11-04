/**
 * `matchMedia` as a hook, with a safe default for jsdom and SSR.
 *
 * The theatre uses one breakpoint (1080 px) to decide whether the rail is a
 * column beside the stage or a tabbed sheet under it. CSS handles the visual
 * layout; this hook only decides which *controls* exist, so a phone never gets a
 * duplicated stamps list and a desktop never gets a tab it cannot see.
 */
import { useEffect, useState } from 'react'

export const WIDE_QUERY = '(min-width: 1080px)'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    try {
      return window.matchMedia(query).matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    let list: MediaQueryList
    try {
      list = window.matchMedia(query)
    } catch {
      return
    }
    const sync = (event: MediaQueryListEvent | MediaQueryList) => setMatches(event.matches)
    sync(list)
    if (typeof list.addEventListener === 'function') {
      list.addEventListener('change', sync)
      return () => list.removeEventListener('change', sync)
    }
    // Safari < 14 spelling.
    list.addListener(sync)
    return () => list.removeListener(sync)
  }, [query])

  return matches
}

/** True on a desktop stage+rail layout (≥1080 px). */
export function useWideLayout(): boolean {
  return useMediaQuery(WIDE_QUERY)
}
