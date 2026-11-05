/**
 * Phase 6.1 PWA shell helpers: route validation (so unknown paths render the
 * approved Not Found state online and offline), optional install prompt hook,
 * and production Service Worker registration. Phase v2-09 adds the two pure
 * helpers behind the hash-versioned "New version ready — Reload" update flow.
 */
import { useCallback, useEffect, useState } from 'react'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface ServiceWorkerContainerLike {
  register: (scriptURL: string, options?: { scope?: string }) => Promise<unknown>
}

/** SW v2 message names (tools/build-sw.mjs emits the same literals). */
export const SW_UPDATE_READY = 'DSA_UPDATE_READY'
export const SW_SKIP_WAITING = 'SKIP_WAITING'

/**
 * A first install must activate immediately so an airplane-mode cold open
 * works; it is not an "update" and must not interrupt the learner. Only a
 * controlled tab that already has a live shell is offered Reload.
 */
export function shouldAnnounceUpdate(hasController: boolean): boolean {
  return hasController
}

/** Accept only the message our own Service Worker posts, never arbitrary data. */
export function isUpdateReadyMessage(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === SW_UPDATE_READY
  )
}

/**
 * DSA Archive is a single-page sheet at `/` (or `/index.html` when opened
 * directly from a static build). Any other pathname renders the friendly 404
 * state with a one-tap return to the sheet.
 */
export function isAppRoute(pathname: string): boolean {
  const normalized = pathname.trim() || '/'
  return normalized === '/' || normalized === '/index.html'
}

export async function registerServiceWorker(
  serviceWorker: ServiceWorkerContainerLike | undefined = typeof navigator !== 'undefined'
    ? navigator.serviceWorker
    : undefined,
  enabled: boolean = import.meta.env.PROD,
  protocol: string = typeof window !== 'undefined' ? window.location.protocol : 'https:',
): Promise<boolean> {
  if (!enabled || !serviceWorker) return false
  if (protocol !== 'https:' && protocol !== 'http:') return false
  try {
    await serviceWorker.register('/sw.js', { scope: '/' })
    return true
  } catch {
    // Browsers in strict private modes may block Service Workers; the sheet and
    // localStorage / Firestore fallback still run normally without throwing.
    return false
  }
}

export function useAppPathname() {
  const [pathname, setPathname] = useState(() =>
    typeof window === 'undefined' ? '/' : window.location.pathname,
  )

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const goHome = useCallback(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState(null, '', '/')
    }
    setPathname('/')
  }, [])

  return { pathname, isKnownRoute: isAppRoute(pathname), goHome }
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent
      if (typeof promptEvent.preventDefault === 'function') promptEvent.preventDefault()
      setDeferred(promptEvent)
    }
    const onInstalled = () => setDeferred(null)
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return false
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      setDeferred(null)
      return choice.outcome === 'accepted'
    } catch {
      setDeferred(null)
      return false
    }
  }, [deferred])

  return { canInstall: deferred !== null, install }
}
