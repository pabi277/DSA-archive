import { describe, expect, it, vi } from 'vitest'
import {
  isAppRoute,
  isUpdateReadyMessage,
  registerServiceWorker,
  shouldAnnounceUpdate,
  SW_SKIP_WAITING,
  SW_UPDATE_READY,
} from './pwa'

describe('isAppRoute (phase 6.1 / 404 routing)', () => {
  it('accepts root and index.html and rejects unknown paths', () => {
    expect(isAppRoute('/')).toBe(true)
    expect(isAppRoute('/index.html')).toBe(true)
    expect(isAppRoute('')).toBe(true)
    expect(isAppRoute('/not-a-page')).toBe(false)
    expect(isAppRoute('/practice/dsa/two-sum')).toBe(false)
    expect(isAppRoute('/__/auth/handler')).toBe(false)
  })
})

describe('registerServiceWorker (phase 6.1)', () => {
  it('registers /sw.js at root scope in production over http(s)', async () => {
    const register = vi.fn().mockResolvedValue({})
    await expect(registerServiceWorker({ register }, true, 'https:')).resolves.toBe(true)
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })

  it('skips registration when disabled, unsupported, or on file: protocol', async () => {
    const register = vi.fn().mockResolvedValue({})
    await expect(registerServiceWorker({ register }, false, 'https:')).resolves.toBe(false)
    await expect(registerServiceWorker(undefined, true, 'https:')).resolves.toBe(false)
    await expect(registerServiceWorker({ register }, true, 'file:')).resolves.toBe(false)
    expect(register).not.toHaveBeenCalled()
  })

  it('degrades quietly when a browser refuses Service Worker registration', async () => {
    const register = vi.fn().mockRejectedValue(new Error('SecurityError'))
    await expect(registerServiceWorker({ register }, true, 'https:')).resolves.toBe(false)
  })
})

describe('SW v2 update flow (phase v2-09)', () => {
  it('only offers Reload to a tab that already has a controlled shell', () => {
    // A first install must activate immediately so a cold offline open works.
    expect(shouldAnnounceUpdate(false)).toBe(false)
    expect(shouldAnnounceUpdate(true)).toBe(true)
  })

  it('accepts only the message our own Service Worker posts', () => {
    expect(isUpdateReadyMessage({ type: SW_UPDATE_READY, cacheName: 'dsa-archive-shell-abc' })).toBe(true)
    expect(isUpdateReadyMessage({ type: SW_SKIP_WAITING })).toBe(false)
    expect(isUpdateReadyMessage(null)).toBe(false)
    expect(isUpdateReadyMessage('DSA_UPDATE_READY')).toBe(false)
    expect(isUpdateReadyMessage({ type: 'other' })).toBe(false)
  })
})
