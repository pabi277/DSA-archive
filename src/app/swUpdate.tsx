/**
 * Phase v2-09 — the visible half of SW v2's update flow.
 *
 * `tools/build-sw.mjs` versions the shell cache from the sha-256 of the built
 * files. An update no longer calls `skipWaiting()` by itself: it posts
 * `DSA_UPDATE_READY` to open tabs, and this toast offers one action. Only a
 * learner's click sends `SKIP_WAITING`; `controllerchange` then reloads once.
 *
 * It renders inside the existing ToastHost (one fixed stack, one live region)
 * and reuses the existing toast classes, so the frozen shell cap is barely
 * touched. See `src/pwa.ts` for the two pure helpers and their unit tests.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { IconClose } from '../design/icons'
import { isUpdateReadyMessage, shouldAnnounceUpdate, SW_SKIP_WAITING } from '../pwa'

export function ServiceWorkerUpdateToast() {
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const reloadOnControllerChange = useRef(false)

  useEffect(() => {
    const container = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined
    if (!container) return
    let mounted = true
    const announce = (hasController: boolean) => {
      if (mounted && shouldAnnounceUpdate(hasController)) setReady(true)
    }
    const onMessage = (event: MessageEvent) => {
      if (isUpdateReadyMessage(event.data)) announce(true)
    }
    const onControllerChange = () => {
      if (reloadOnControllerChange.current) window.location.reload()
    }
    container.addEventListener('message', onMessage)
    container.addEventListener('controllerchange', onControllerChange)
    void container.ready
      .then((registration) => {
        if (!mounted) return
        registrationRef.current = registration
        if (registration.waiting && container.controller) announce(true)
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && container.controller) announce(true)
          })
        })
      })
      .catch(() => {
        // A browser that blocks Service Workers still runs the app normally.
      })
    return () => {
      mounted = false
      container.removeEventListener('message', onMessage)
      container.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const reload = useCallback(() => {
    const registration = registrationRef.current
    if (registration?.waiting) {
      reloadOnControllerChange.current = true
      registration.waiting.postMessage({ type: SW_SKIP_WAITING })
    } else {
      // A tab that was told about an update before `ready` resolved can simply
      // reload: the browser installs the waiting worker on the next navigation.
      window.location.reload()
    }
    setReady(false)
  }, [])

  if (!ready || dismissed) return null
  return (
    <div className="toast toast-neutral" data-testid="sw-update" role="status">
      <div className="toast-copy">
        <strong>New version ready</strong>
        <span>Reload to use the latest offline copy.</span>
      </div>
      <button type="button" className="toast-action" data-testid="sw-update-reload" onClick={reload}>
        Reload
      </button>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss: New version ready"
        data-testid="sw-update-dismiss"
        onClick={() => setDismissed(true)}
      >
        <IconClose size={14} />
      </button>
    </div>
  )
}
