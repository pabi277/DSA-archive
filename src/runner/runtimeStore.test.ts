/**
 * Phase v2-07 — the one cache write that does not go through the fetch shim.
 *
 * The worker script is loaded by `new Worker(url)`, so the toolchain's
 * cache-first shim never sees it. If we did not cache it here, a learner running
 * JavaScript would get a working run, a "1.3 MB" download announcement, and a
 * Settings card that honestly said "Nothing cached yet" — three true statements
 * that add up to a broken promise. These tests pin the promise.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cacheRunnerBundle } from './runtimeStore'
import { RUNTIME_CACHE } from './protocol'

type Stored = Map<string, Response>

function fakeCaches(seed: Stored = new Map()) {
  return {
    open: vi.fn(async (name: string) => {
      expect(name).toBe(RUNTIME_CACHE)
      return {
        match: vi.fn(async (url: string) => seed.get(url)),
        put: vi.fn(async (url: string, response: Response) => {
          seed.set(url, response)
        }),
      }
    }),
  }
}

const bundle = { worker: 'runtime/runner/worker-abc.js', bytes: 1_276_228, hash: 'abc' } as const

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('cacheRunnerBundle', () => {
  it('stores the worker bundle in the runtime bucket when it is missing', async () => {
    const stored: Stored = new Map()
    const fetchMock = vi.fn(async () => new Response('worker source', { status: 200 }))
    vi.stubGlobal('caches', fakeCaches(stored))
    vi.stubGlobal('fetch', fetchMock)

    await cacheRunnerBundle(bundle)

    expect(fetchMock).toHaveBeenCalledWith(new URL(bundle.worker, window.location.href).href, {
      cache: 'reload',
    })
    expect([...stored.keys()]).toEqual([new URL(bundle.worker, window.location.href).href])
  })

  it('does nothing when the bundle is already cached', async () => {
    const url = new URL(bundle.worker, window.location.href).href
    const stored: Stored = new Map([[url, new Response('cached')]])
    const fetchMock = vi.fn()
    vi.stubGlobal('caches', fakeCaches(stored))
    vi.stubGlobal('fetch', fetchMock)

    await cacheRunnerBundle(bundle)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('stays quiet when the device is offline and nothing is cached', async () => {
    vi.stubGlobal('caches', fakeCaches())
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )

    // The warm-up that follows is what tells the learner, in words they can act on.
    await expect(cacheRunnerBundle(bundle)).resolves.toBeUndefined()
  })

  it('is a no-op without a bundle or without Cache Storage', async () => {
    vi.stubGlobal('fetch', vi.fn())
    await expect(cacheRunnerBundle(null)).resolves.toBeUndefined()

    vi.stubGlobal('caches', undefined)
    await expect(cacheRunnerBundle(bundle)).resolves.toBeUndefined()
  })
})
