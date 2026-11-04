/**
 * Phase v2-07 — the learner's cache, and the truth about what it costs.
 *
 * Everything the runner needs is a static file under `/runtime/`, and every one
 * of those files is stored in a single named Cache Storage bucket. That gives
 * three honest things at once, which a bare HTTP cache could not:
 *
 *   · Settings can report the real installed size (`installedRuntimeBytes`),
 *   · Clear removes exactly the runner — never the app shell, never Firestore,
 *   · the Service Worker can serve the bucket offline on the next visit.
 *
 * The manifests themselves are tiny and must stay current, so they are fetched
 * `no-store` and only fall back to the cache when the network is gone.
 */
import { sanitisePacks, sanitiseRunnerBundle, type RunnerBundle, type RuntimePacks } from './packs'
import { RUNTIME_CACHE } from './protocol'

export type RuntimeAssets = {
  packs: RuntimePacks
  runner: RunnerBundle | null
  /** `false` when this deploy shipped no runner at all (a plain rollback). */
  deployed: boolean
}

function absolute(relative: string): string {
  return new URL(relative, window.location.href).href
}

/** Fetch a tiny manifest, preferring the network and falling back to the cache. */
async function fetchManifest(relative: string): Promise<unknown> {
  const url = absolute(relative)
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (response.ok) {
      // Keep our own offline copy: the Service Worker deliberately does *not*
      // cache-first these two files, so a deploy can never leave the panel
      // advertising yesterday's download size.
      try {
        const cache = await caches.open(RUNTIME_CACHE)
        await cache.put(url, response.clone())
      } catch {
        // Cache Storage unavailable — the online path still works.
      }
      return await response.json()
    }
  } catch {
    // Offline, or the file is not deployed: fall through to the cache.
  }
  try {
    const cache = await caches.open(RUNTIME_CACHE)
    const cached = await cache.match(url)
    if (cached) return await cached.json()
  } catch {
    // No Cache Storage (private mode, ancient browser): the runner is simply
    // unavailable, which the panel states instead of failing silently.
  }
  return null
}

export async function loadRuntimeAssets(): Promise<RuntimeAssets> {
  const [packsRaw, runnerRaw] = await Promise.all([
    fetchManifest('runtime/packs.json'),
    fetchManifest('runtime/runner/index.json'),
  ])
  const packs = sanitisePacks(packsRaw)
  const runner = sanitiseRunnerBundle(runnerRaw)
  return { packs, runner, deployed: runner !== null }
}

export function workerUrl(runner: RunnerBundle): string {
  return absolute(runner.worker)
}

/** The absolute URLs one language's first run installs. */
export function packFileUrls(packs: RuntimePacks, ids: readonly string[], runner: RunnerBundle | null): string[] {
  const urls: string[] = runner ? [absolute(runner.worker)] : []
  for (const id of ids) {
    for (const file of packs[id as keyof RuntimePacks]?.files ?? []) urls.push(absolute(`runtime/${file.path}`))
  }
  return urls
}

/**
 * Bytes actually held in the runtime bucket, counted from the manifests rather
 * than from `navigator.storage.estimate()` — an estimate would count the app
 * shell, Firestore's cache and every other origin blob too.
 */
export async function installedRuntimeBytes(assets: RuntimeAssets): Promise<number> {
  const urls = packFileUrls(assets.packs, Object.keys(assets.packs), assets.runner)
  if (urls.length === 0) return 0
  let total = 0
  try {
    const cache = await caches.open(RUNTIME_CACHE)
    for (const url of urls) {
      const hit = await cache.match(url)
      if (!hit) continue
      const buffer = await hit.arrayBuffer()
      total += buffer.byteLength
    }
  } catch {
    return 0
  }
  return total
}

/** Is this specific language's toolchain already on the device? */
export async function isInstalled(urls: readonly string[]): Promise<boolean> {
  if (urls.length === 0) return false
  try {
    const cache = await caches.open(RUNTIME_CACHE)
    for (const url of urls) {
      if (!(await cache.match(url))) return false
    }
    return true
  } catch {
    return false
  }
}

/** Clear only the runner: `dsa-archive-runtime-v1`, never the app shell cache. */
export async function clearRuntimeCache(): Promise<boolean> {
  try {
    return await caches.delete(RUNTIME_CACHE)
  } catch {
    return false
  }
}

/** Cache Storage is the runner's one hard requirement. */
export function storageAvailable(): boolean {
  return typeof caches !== 'undefined' && typeof caches.open === 'function'
}
