/**
 * Deterministic Service Worker + precache manifest builder (phase 6.1).
 *
 * Walks `dist/`, hashes every app-shell file's relative path + bytes into a
 * single versioned cache key, and emits `dist/sw.js` with zero third-party
 * runtime dependencies.
 *
 * Guardrails enforced inside `sw.js`:
 * - Same-origin GET requests only (Firestore/Auth live & emulator traffic and
 *   outbound problem links are never intercepted).
 * - `/__/*` reserved Firebase Hosting Auth/init helpers are never intercepted,
 *   so Google sign-in (`/__/auth/handler`, `/__/auth/iframe`) stays intact.
 * - Navigations use network-first with instant fallback to cached `/index.html`
 *   (and `/offline.html` as last-resort shell), giving fresh deploys online and
 *   true airplane-mode cold opens offline.
 */
import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

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
      // Runtime assets (phase v2-01): self-hosted font subsets are fetched on
      // demand and cached by the browser's font cache, never precached — they
      // live in the separate "runtime assets" budget bucket, not the shell.
      if (rel.startsWith('fonts/')) continue
      out.push(rel)
    }
  }
  return out.sort()
}

export async function writeServiceWorker(distDir = path.resolve('dist')) {
  const files = await collectFiles(distDir)
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

  const source = `// GENERATED FILE — built from dist/ by tools/build-sw.mjs (phase 6.1).
const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};
const PRECACHE_SET = new Set(PRECACHE_URLS);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('dsa-archive-shell-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never intercept Firebase Hosting's reserved OAuth / config endpoints.
  if (url.pathname.startsWith('/__/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        if (!self.navigator || self.navigator.onLine !== false) {
          try {
            const response = await fetch(request);
            if (response.status < 500) return response;
          } catch {
            // Offline / airplane mode: serve the precached shell below.
          }
        }
        const cache = await caches.open(CACHE_NAME);
        if (url.pathname === '/offline.html') {
          const offlineDoc = await cache.match('/offline.html');
          if (offlineDoc) return offlineDoc;
        }
        return (
          (await cache.match('/index.html')) ||
          (await cache.match('/')) ||
          (await cache.match('/offline.html')) ||
          Response.error()
        );
      })(),
    );
    return;
  }

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
  return { cacheName, precacheCount: precacheUrls.length }
}
