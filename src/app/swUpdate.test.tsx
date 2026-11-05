import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceWorkerUpdateToast } from './swUpdate'

/**
 * jsdom proof of the visible SW v2 update flow. The real Service Worker update
 * is exercised in e2e/csp.spec.ts / e2e/offline-matrix.spec.ts; here we prove
 * the message → toast → Reload → dismiss path without a browser download.
 */
type Listener = (event: { data: unknown }) => void

let container: HTMLDivElement
let root: Root
let listeners: Map<string, Set<Listener>>
let registration: {
  waiting: { postMessage: (message: unknown) => void } | null
  installing: null
  controller: object | null
  addEventListener: (type: string, listener: Listener) => void
}
let postMessage: ReturnType<typeof vi.fn>
let original: PropertyDescriptor | undefined

function fakeContainer() {
  listeners = new Map()
  postMessage = vi.fn()
  registration = {
    waiting: null,
    installing: null,
    controller: null,
    addEventListener: vi.fn(),
  }
  const container = {
    controller: {} as object,
    ready: Promise.resolve(registration),
    addEventListener: (type: string, listener: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(listener)
    },
    removeEventListener: (type: string, listener: Listener) => listeners.get(type)?.delete(listener),
  }
  return container
}

function dispatch(type: string, data: unknown) {
  for (const listener of listeners.get(type) ?? []) listener({ data })
}

beforeEach(async () => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
  const fake = fakeContainer()
  Object.defineProperty(navigator, 'serviceWorker', { value: fake, configurable: true })
  // Let `container.ready` settle so the component has a registration handle.
  await act(async () => {
    await Promise.resolve()
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  if (original) Object.defineProperty(navigator, 'serviceWorker', original)
  else Reflect.deleteProperty(navigator, 'serviceWorker')
})

function mount() {
  act(() => root.render(<ServiceWorkerUpdateToast />))
}

describe('ServiceWorkerUpdateToast', () => {
  it('is silent until the Service Worker announces an update', async () => {
    mount()
    expect(container.querySelector('[data-testid="sw-update"]')).toBeNull()
    await act(async () => {
      dispatch('message', { type: 'DSA_UPDATE_READY', cacheName: 'dsa-archive-shell-abc123' })
    })
    const toast = container.querySelector('[data-testid="sw-update"]') as HTMLElement
    expect(toast).not.toBeNull()
    expect(toast.textContent).toContain('New version ready')
    expect(toast.querySelector('[data-testid="sw-update-reload"]')?.textContent).toBe('Reload')
  })

  it('ignores unrelated messages', async () => {
    mount()
    await act(async () => {
      dispatch('message', { type: 'SKIP_WAITING' })
      dispatch('message', null)
    })
    expect(container.querySelector('[data-testid="sw-update"]')).toBeNull()
  })

  it('sends SKIP_WAITING to the waiting worker, and can be dismissed', async () => {
    registration.waiting = { postMessage: postMessage as (message: unknown) => void }
    mount()
    await act(async () => {
      dispatch('message', { type: 'DSA_UPDATE_READY' })
    })
    const reload = container.querySelector('[data-testid="sw-update-reload"]') as HTMLElement
    act(() => reload.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })

    await act(async () => {
      dispatch('message', { type: 'DSA_UPDATE_READY' })
    })
    const dismiss = container.querySelector('[data-testid="sw-update-dismiss"]') as HTMLElement
    act(() => dismiss.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(container.querySelector('[data-testid="sw-update"]')).toBeNull()
  })
})
