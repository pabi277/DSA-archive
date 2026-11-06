#!/usr/bin/env node
/**
 * Deterministic Service Worker + precache manifest builder.
 *
 * Phase 6.1 built v1: hash every app-shell file into one versioned cache key,
 * same-origin GET only, network-first navigations with an offline fallback, and
 * an explicit `/__/*` bypass for Firebase Hosting's Auth helpers.
 * Phase v2-07 added a second, *installed add-on* bucket for the runner's worker
 * bundle and toolchains. Phase v2-09 is SW v2:
 *
 *   · an explicit never-intercept list (YouTube, the IFrame API, googlevideo
 *     and every Firebase host) even though the same-origin GET guard already
 *     excludes them — the list is asserted by `npm run check:budgets`;
 *   · `/runtime/*` is never precached. Installed add-ons are served cache-first
 *     from the runtime bucket; the two small manifests and anything else under
 *     `/runtime/` go to the network untouched, so a stale download size can
 *     never be advertised from a cache;
 *   · `assets/account-*` joins the add-on bucket: destructive account tools are
 *     fetched on demand and never precached. The owner's 2026-11-05 decision
 *     left 1,807 B of shell headroom and ruled that **any further shell growth
 *     is a gate, not a re-baseline**, so phase 09 keeps the shell flat;
 *   · phase v2-10 adds `og-image.png` (and `/manifest.webmanifest`, already
 *     fetched by path) to that rule for the same reason: the social card is
 *     never requested by the app itself, so precaching it would spend 8 kB of
 *     the frozen shell budget on bytes a returning learner already has cached;
 *   · hash-versioned update flow: the cache key is still the sha-256 of the
 *     shell's paths+bytes. An update no longer calls `skipWaiting()` on its
 *     own — it posts `DSA_UPDATE_READY` so the app can show "New version ready
 *     — Reload", and only the learner's click sends `SKIP_WAITING`.
 */
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Installed add-ons are fetched when a learner actually uses them. Neither the
 * shell precache nor the shell byte budget may ever contain them.
 *   runtime/            Clang 22 (29 MB), Pyodide (13.5 MB), the worker bundle
 *   assets/runner-*     the lazy Run panel + Settings card
 *   assets/account-*    the lazy "Delete my data" card (phase v2-09)
 *   assets/statements-* per-problem statements/tests/hints (v3 hybrid precache
 *                       split): fetched on the first problem visit, then held
 *                       cache-first so visited problems stay offline-readable
 */
export const ADDON_PREFIXES = ['runtime/', 'assets/runner-', 'assets/account-', 'assets/statements-']

/** Small JSON manifests must always be answered by the network. */
export const RUNTIME_MANIFESTS = ['runtime/packs.json', 'runtime/runner/index.json']

/**
 * Files that are never precached and never counted in the shell budget, even
 * though they ship in `dist/`: they are not part of the app shell and nothing in
 * the app requests them at runtime.
 *   og-image.png   the social card — fetched by link unfurlers, not by a learner
 */
export const NOT_SHELL = ['og-image.png']

export function isRuntimeAsset(rel) {
  return ADDON_PREFIXES.some((prefix) => rel.startsWith(prefix))
}

async function collectRuntimeAssets(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await collectRuntimeAssets(full, base)))
      continue
    }
    const rel = path.relative(base, full).replaceAll(path.sep, '/')
    if (rel === 'sw.js' || rel.endsWith('.map')) continue
    if (isRuntimeAsset(rel) && !RUNTIME_MANIFESTS.includes(rel)) out.push(`/${rel}`)
  }
  return out.sort()
}

async function collectFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await collectFiles(full, base)))
    } else {
      const rel = path.relative(base, full).replaceAll(path.sep, '/')
      if (rel === 'sw.js' || rel.endsWith('.map')) continue
      // Self-hosted font subsets are fetched on demand by the browser's font
      // cache (font-display: swap) and live in their own budget bucket.
      if (rel.startsWith('fonts/')) continue
      if (isRuntimeAsset(rel)) continue
      if (NOT_SHELL.includes(rel)) continue
      out.push(rel)
    }
  }
  return out.sort()
}

export async function writeServiceWorker(distDir = path.resolve('dist')) {
  const files = await collectFiles(distDir)
  const runtimeUrls = await collectRuntimeAssets(distDir)
  const hash = createHash('sha256')
  for (const rel of files) {
    hash.update(rel)
    hash.update('\0')
    hash.update(await readFile(path.join(distDir, rel)))
    hash.update('\0')
  }
  const version = hash.digest('hex').slice(0, 12)
  const cacheName = `dsa-archive-shell-${version}`
  const precacheUrls = ['/', ...files.map((rel) => `/${rel}`)]

  const source = `// GENERATED — tools/build-sw.mjs (phase v2-09 SW v2). Docs live in that file.
const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};
const PRECACHE_SET = new Set(PRECACHE_URLS);
const RUNTIME_CACHE = 'dsa-archive-runtime-v1';
const RUNTIME_URLS = ${JSON.stringify(runtimeUrls, null, 2)};
const RUNTIME_SET = new Set(RUNTIME_URLS);
const BYPASS_HOST_SUFFIXES = ['youtube.com', 'youtube-nocookie.com', 'googlevideo.com', 'ytimg.com', 'googleapis.com', 'gstatic.com', 'google.com', 'firebaseio.com', 'firebaseapp.com'];
const BYPASS_PATH_PREFIXES = ['/__/', '/iframe_api'];
const BYPASS_PATH_PARTS = ['iframe_api'];
const ADDON_PATH_PREFIXES = ['runtime/', 'assets/runner-', 'assets/account-', 'assets/statements-'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(async () => {
        if (!self.registration.active) { await self.skipWaiting(); return; }
        try {
          const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          for (const client of windows) client.postMessage({ type: 'DSA_UPDATE_READY', cacheName: CACHE_NAME });
        } catch {}
      }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('dsa-archive-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (BYPASS_HOST_SUFFIXES.some((host) => url.hostname === host || url.hostname.endsWith('.' + host))) return;
  if (BYPASS_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;
  if (BYPASS_PATH_PARTS.some((part) => url.pathname.includes(part))) return;
  if (url.pathname.startsWith('/__/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        if (!self.navigator || self.navigator.onLine !== false) {
          try {
            const response = await fetch(request);
            if (response.status < 500) return response;
          } catch {}
        }
        const cache = await caches.open(CACHE_NAME);
        if (url.pathname === '/offline.html') {
          const offlineDoc = await cache.match('/offline.html');
          if (offlineDoc) return offlineDoc;
        }
        return (await cache.match('/index.html')) || (await cache.match('/')) || (await cache.match('/offline.html')) || Response.error();
      })(),
    );
    return;
  }

  if (RUNTIME_SET.has(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(url.href);
        if (cached) return cached;
        return fetch(request);
      })(),
    );
    return;
  }
  if (url.pathname.startsWith('/runtime/') || ADDON_PATH_PREFIXES.some((prefix) => url.pathname.startsWith('/' + prefix))) return;

  if (PRECACHE_SET.has(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(url.pathname);
        if (cached) return cached;
        return fetch(request);
      }),
    );
  }
});
`

  await writeFile(path.join(distDir, 'sw.js'), source, 'utf8')
  return { cacheName, precacheCount: precacheUrls.length, runtimeCount: runtimeUrls.length }
}
