#!/usr/bin/env node
/**
 * Performance, Spark-transfer and PWA-integrity budget gate (CI).
 *
 * Phase 6.2 created it; phase v2-01 re-baselined the first four caps; phases
 * v2-06 and v2-08 re-baselined the shell cap twice more on the owner's explicit
 * decisions. **Phase v2-09 is the final review.** Every number below is now
 * published with its v1 → v2 delta and a reason; `npm run check:budgets` prints
 * that table in CI so a future regression cannot hide behind a bigger cap.
 *
 * The owner's 2026-11-05 decision (docs/DECISIONS.md) left 1,807 B of shell
 * headroom and said that **any further shell growth is a gate, not a
 * re-baseline**. This phase therefore freezes the caps and puts its one new
 * surface (the destructive account tools) in the on-demand add-on bucket.
 */
import { gzipSync } from 'node:zlib'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('dist')

export const BUDGETS = {
  maxCssRawBytes: 61_000,
  maxCssGzipBytes: 18_000,
  maxEntryJsRawBytes: 180_000,
  maxEntryJsGzipBytes: 55_000,
  maxSingleJsRawBytes: 520_000,
  maxSingleJsGzipBytes: 165_000,
  /** Final shell cap — frozen in phase v2-09. Changing it is an owner GATE. */
  maxShellGzipBytes: 393_000,
  /** Phase v2-07 add-on bucket, never precached. */
  maxRunnerChunkRawBytes: 120_000,
  maxRunnerChunkGzipBytes: 40_000,
  maxRuntimeAssetRawBytes: 48_000_000,
  maxFontRawBytes: 60_000,
  /** Phase v2-09 on-demand account tools, never precached. */
  maxAccountChunkRawBytes: 40_000,
  maxAccountChunkGzipBytes: 15_000,
}

/**
 * Published numbers, v1 (phase 6 record, 2026-11-02) → v2 (phase v2-09).
 * These are measurements, not caps. `reason` is the written rationale the
 * owner asked for at the 2026-11-03 gate re-opening; the full argument lives
 * in docs/phases-v2/09-pwa-accessibility-hardening/RECORD.md §3.
 */
export const PUBLISHED = Object.freeze({
  // Raw/gzip pairs are kB (1000 B); the authoritative byte counts are printed
  // by `npm run check:budgets` from dist/ and are what the caps are applied to.
  css: { v1: '26.86 kB raw / 6.30 kB gz', v2: '60.28 / 10.31', reason: 'tokens v2 + 8 routed surfaces; gzip stays 10.3 kB' },
  entryJs: { v1: '103.25 kB raw / 28.39 kB gz', v2: '127.92 / 36.94', reason: 'router, shell, density, ⌘K, undo; no new library' },
  largestChunk: { v1: '<500 kB raw (single bundle)', v2: '457.70 / 129.86', reason: 'Firestore SDK split into its own cacheable chunk' },
  shell: { v1: '317.66 kB gz', v2: '392.14', reason: '+74.5 kB: packed catalogue 42.0, content-ui 47.7, insight layer 4.6, offset by lossless packing' },
  fonts: { v1: 'system fonts only (0 B)', v2: '57.50 kB raw', reason: 'two self-hosted Latin subsets, font-display: swap, never precached' },
  runner: { v1: 'none', v2: '27.70 kB raw UI · 1.28 MB worker · 42.5 MB packs', reason: 'opt-in local C++/Python/JS runner, its own bucket' },
  account: { v1: 'none', v2: '2.76 kB raw UI / 1.32 kB gz', reason: 'lazy "Delete my data" add-on; a destructive action never sits in the shell' },
})

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else out.push(path.relative(root, full).replaceAll(path.sep, '/'))
  }
  return out.sort()
}

const files = await walk(root)
const stats = []
for (const rel of files) {
  const buf = await readFile(path.join(root, rel))
  const gz = gzipSync(buf, { level: 9 })
  stats.push({ rel, raw: buf.length, gzip: gz.length })
}

const isAddon = (rel) =>
  rel.startsWith('runtime/') || rel.startsWith('assets/runner-') || rel.startsWith('assets/account-')
// Phase v2-10: the social card is not part of the app shell. Nothing in the app
// requests it at runtime, so it is neither precached (tools/build-sw.mjs
// NOT_SHELL) nor charged to the frozen 393,000 B shell budget.
const isNotShell = (rel) => rel === 'og-image.png'
const cssFiles = stats.filter((item) => item.rel.endsWith('.css') && !isAddon(item.rel))
const jsAssets = stats.filter(
  (item) => item.rel.startsWith('assets/') && item.rel.endsWith('.js') && !isAddon(item.rel),
)
const entryJs = jsAssets.find((item) => /^assets\/index-[^/]+\.js$/.test(item.rel))

if (!entryJs) throw new Error('Could not find built entry chunk dist/assets/index-*.js')
if (cssFiles.length === 0) throw new Error('Could not find built CSS asset in dist/assets/')

const totalCssRaw = cssFiles.reduce((sum, item) => sum + item.raw, 0)
const totalCssGzip = cssFiles.reduce((sum, item) => sum + item.gzip, 0)
const largestJsRaw = jsAssets.reduce((max, item) => (item.raw > max.raw ? item : max), jsAssets[0])
const largestJsGzip = jsAssets.reduce((max, item) => (item.gzip > max.gzip ? item : max), jsAssets[0])
// The shell bucket is exactly what the Service Worker precaches. Font subsets
// and installed add-ons have their own buckets and are never counted here.
const totalShellGzip = stats
  .filter((item) => !item.rel.startsWith('fonts/') && !isAddon(item.rel) && !isNotShell(item.rel))
  .reduce((sum, item) => sum + item.gzip, 0)

const failures = []
// Keep the exclusion honest: if the app ever starts referencing the card, this
// must fail rather than silently hide it from the budget.
const htmlShell = stats.filter((item) => item.rel.endsWith('.html'))
for (const page of htmlShell) {
  const body = await readFile(path.join(root, page.rel), 'utf8')
  if (/<img[^>]+og-image\.png/.test(body)) {
    failures.push(`${page.rel} renders og-image.png as content; it is excluded from the shell budget only while it is a meta tag`)
  }
}
const check = (value, cap, label) => {
  if (value > cap) failures.push(`${label} ${value} B > budget ${cap} B`)
}
check(totalCssRaw, BUDGETS.maxCssRawBytes, 'CSS raw')
check(totalCssGzip, BUDGETS.maxCssGzipBytes, 'CSS gzip')
check(entryJs.raw, BUDGETS.maxEntryJsRawBytes, `Entry JS (${entryJs.rel}) raw`)
check(entryJs.gzip, BUDGETS.maxEntryJsGzipBytes, `Entry JS (${entryJs.rel}) gzip`)
check(largestJsRaw.raw, BUDGETS.maxSingleJsRawBytes, `Largest JS chunk (${largestJsRaw.rel}) raw`)
check(largestJsGzip.gzip, BUDGETS.maxSingleJsGzipBytes, `Largest JS chunk (${largestJsGzip.rel}) gzip`)
check(totalShellGzip, BUDGETS.maxShellGzipBytes, 'Total shell gzip')

// PWA manifest & Service Worker integrity checks (6.1 + 6.2).
for (const required of ['manifest.webmanifest', 'sw.js', 'offline.html', '404.html']) {
  if (!files.includes(required)) failures.push(`Missing required PWA/release file dist/${required}`)
}

const manifest = JSON.parse(await readFile(path.join(root, 'manifest.webmanifest'), 'utf8'))
if (manifest.display !== 'standalone') failures.push('manifest.webmanifest must set display: "standalone"')
if (manifest.start_url !== '/') failures.push('manifest.webmanifest must set start_url: "/"')
if (manifest.theme_color !== '#0B0D0E' || manifest.background_color !== '#0B0D0E') {
  failures.push('manifest.webmanifest colours must match the tokens-v2 dark canvas #0B0D0E')
}
const icons = Array.isArray(manifest.icons) ? manifest.icons : []
if (!icons.some((icon) => icon.sizes === '192x192' && icon.type === 'image/png')) {
  failures.push('manifest.webmanifest is missing a 192x192 PNG icon')
}
if (!icons.some((icon) => icon.sizes === '512x512' && icon.type === 'image/png' && icon.purpose === 'any')) {
  failures.push('manifest.webmanifest is missing a 512x512 PNG icon')
}
if (!icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable')) {
  failures.push('manifest.webmanifest is missing a 512x512 maskable icon')
}
// Phase v2-10: the install card must describe v2, not the v1 notes/planner app.
if (!/beginner-first/i.test(manifest.name ?? '')) {
  failures.push('manifest.webmanifest name must describe the v2 app (beginner-first workspace)')
}
if (manifest.short_name !== 'DSA Archive') failures.push('manifest.webmanifest short_name must stay "DSA Archive"')
if (!/runner|quiz/i.test(manifest.description ?? '')) {
  failures.push('manifest.webmanifest description must mention what v2 added (runner/quiz)')
}
if (!Array.isArray(manifest.categories) || !manifest.categories.includes('education')) {
  failures.push('manifest.webmanifest categories must include "education"')
}
// The social card is generated (tools/generate-og-image.mjs) and must ship.
if (!files.includes('og-image.png')) failures.push('Missing required dist/og-image.png social card')

const swSource = await readFile(path.join(root, 'sw.js'), 'utf8')
if (!swSource.includes("url.pathname.startsWith('/__/')")) {
  failures.push('dist/sw.js must bypass Firebase Hosting /__/ Auth paths')
}

/* --- SW v2 exclusions and update flow (phase v2-09) ----------------------- */
for (const token of [
  'BYPASS_HOST_SUFFIXES',
  'youtube.com',
  'youtube-nocookie.com',
  'googlevideo.com',
  'iframe_api',
  '/runtime/',
  "url.origin !== self.location.origin",
  "'SKIP_WAITING'",
  'DSA_UPDATE_READY',
  "self.registration.active",
  'dsa-archive-shell-',
]) {
  if (!swSource.includes(token)) failures.push(`dist/sw.js is missing the SW v2 guard/flow token ${token}`)
}
// The versioned shell cache must be a content hash, never a hand-written tag.
const cacheName = swSource.match(/const CACHE_NAME = "dsa-archive-shell-([0-9a-f]{12})";/)
if (!cacheName) failures.push('dist/sw.js must use a sha-256-derived dsa-archive-shell-<12 hex> cache name')
if (swSource.includes('navigationPreload')) {
  failures.push('SW v2 must stay navigationPreload-free (hash router, network-first navigations)')
}

function swArray(name) {
  const match = swSource.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\]);`))
  if (!match) return null
  try {
    return new Set(JSON.parse(match[1]))
  } catch {
    return null
  }
}

const precacheList = swArray('PRECACHE_URLS')
const runtimeList = swArray('RUNTIME_URLS')
if (!precacheList || !runtimeList) {
  failures.push('dist/sw.js must declare both PRECACHE_URLS and RUNTIME_URLS')
}
for (const asset of [...cssFiles, ...jsAssets]) {
  if (precacheList && !precacheList.has(`/${asset.rel}`)) {
    failures.push(`dist/sw.js does not precache /${asset.rel}`)
  }
}
// No player, toolchain, font or add-on URL may ever enter the shell precache.
for (const url of precacheList ?? []) {
  if (/youtube|googlevideo|iframe_api|ytimg|googleapis/i.test(url)) {
    failures.push(`dist/sw.js precaches a third-party or player URL: ${url}`)
  }
  if (/^\/(?:runtime\/|fonts\/|assets\/runner-|assets\/account-)/.test(url)) {
    failures.push(`dist/sw.js precaches an on-demand asset: ${url}`)
  }
}

for (const standalonePage of ['offline.html', '404.html']) {
  const html = await readFile(path.join(root, standalonePage), 'utf8')
  if (/https?:\/\//i.test(html)) {
    failures.push(`dist/${standalonePage} must stay self-contained without external URLs`)
  }
}

// Font subsets ship from public/fonts/ and are fetched on demand.
const fontAssets = stats.filter((item) => item.rel.startsWith('fonts/'))
const fontRaw = fontAssets.reduce((sum, item) => sum + item.raw, 0)
check(fontRaw, BUDGETS.maxFontRawBytes, 'Font subsets raw')

// Runner add-on bucket (phase v2-07) — reported separately, never added to shell.
const runnerChunk = stats.filter((item) => item.rel.startsWith('assets/runner-'))
const runnerChunkRaw = runnerChunk.reduce((sum, item) => sum + item.raw, 0)
const runnerChunkGzip = runnerChunk.reduce((sum, item) => sum + item.gzip, 0)
check(runnerChunkRaw, BUDGETS.maxRunnerChunkRawBytes, 'Runner UI chunk raw')
check(runnerChunkGzip, BUDGETS.maxRunnerChunkGzipBytes, 'Runner UI chunk gzip')
const packAssets = stats.filter((item) => item.rel.startsWith('runtime/'))
const packRaw = packAssets.reduce((sum, item) => sum + item.raw, 0)
check(packRaw, BUDGETS.maxRuntimeAssetRawBytes, 'Runtime toolchain assets raw')

// Account tools add-on bucket (phase v2-09). Keeps the frozen shell flat.
const accountChunk = stats.filter((item) => item.rel.startsWith('assets/account-'))
const accountChunkRaw = accountChunk.reduce((sum, item) => sum + item.raw, 0)
const accountChunkGzip = accountChunk.reduce((sum, item) => sum + item.gzip, 0)
check(accountChunkRaw, BUDGETS.maxAccountChunkRawBytes, 'Account add-on chunk raw')
check(accountChunkGzip, BUDGETS.maxAccountChunkGzipBytes, 'Account add-on chunk gzip')
if (accountChunk.length === 0) {
  failures.push('the on-demand account tools chunk is missing from dist/assets/account-*.js')
}

for (const asset of [...fontAssets, ...runnerChunk, ...accountChunk, ...packAssets]) {
  if (precacheList?.has(`/${asset.rel}`)) {
    failures.push(`dist/sw.js must not precache runtime asset /${asset.rel}`)
  }
}
const RUNTIME_MANIFESTS = new Set(['runtime/packs.json', 'runtime/runner/index.json'])
for (const asset of [...runnerChunk, ...accountChunk, ...packAssets]) {
  if (RUNTIME_MANIFESTS.has(asset.rel)) continue
  if (runtimeList && !runtimeList.has(`/${asset.rel}`)) {
    failures.push(`dist/sw.js must serve /${asset.rel} from the runtime cache`)
  }
}
// Manifests must NOT be cache-first: a stale one would advertise the wrong
// download size (phase v2-07 decision, re-asserted by SW v2).
for (const name of RUNTIME_MANIFESTS) {
  if (runtimeList?.has(`/${name}`)) failures.push(`dist/sw.js must not cache the live manifest /${name}`)
  if (precacheList?.has(`/${name}`)) failures.push(`dist/sw.js must not precache the live manifest /${name}`)
}

// Spark Hosting transfer headroom: 360 MB/day free transfer vs full cold shell.
const sparkDailyBytes = 360 * 1000 * 1000
const coldInstallsPerDay = Math.floor(sparkDailyBytes / totalShellGzip)

const headroom = (value, cap) => `${(cap - value).toLocaleString('en-US')} B`
console.log(
  [
    `Budgets checked across ${stats.length} built files (phase v2-09 final review):`,
    '',
    '  Published numbers — v1 (phase 6, 2026-11-02) → v2 (phase 9, 2026-11-05):',
    ...Object.entries(PUBLISHED).map(
      ([name, row]) =>
        `    ${name.padEnd(13)} ${row.v1.padEnd(38)} → ${row.v2.padEnd(46)} ${row.reason}`,
    ),
    '',
    '  Measured against the frozen caps (all headroom is a gate, not a re-baseline):',
    `    CSS          ${totalCssRaw.toLocaleString('en-US')} B raw / ${totalCssGzip.toLocaleString('en-US')} B gz  · cap ${BUDGETS.maxCssRawBytes} / ${BUDGETS.maxCssGzipBytes} · headroom ${headroom(totalCssRaw, BUDGETS.maxCssRawBytes)} raw`,
    `    Entry JS     ${entryJs.raw} B raw / ${entryJs.gzip} B gz · cap ${BUDGETS.maxEntryJsRawBytes} / ${BUDGETS.maxEntryJsGzipBytes} · headroom ${headroom(entryJs.gzip, BUDGETS.maxEntryJsGzipBytes)} gz`,
    `    Largest JS   ${largestJsRaw.rel} ${largestJsRaw.raw} B raw / ${largestJsGzip.gzip} B gz · cap ${BUDGETS.maxSingleJsRawBytes} / ${BUDGETS.maxSingleJsGzipBytes}`,
    `    Shell        ${totalShellGzip.toLocaleString('en-US')} B gz · cap ${BUDGETS.maxShellGzipBytes} · headroom ${headroom(totalShellGzip, BUDGETS.maxShellGzipBytes)} · ~${coldInstallsPerDay} cold installs/day inside 360 MB Spark`,
    `    Fonts        ${fontRaw} B raw · cap ${BUDGETS.maxFontRawBytes} · separate bucket, never precached`,
    `    Runner UI    ${runnerChunkRaw} B raw / ${runnerChunkGzip} B gz · cap ${BUDGETS.maxRunnerChunkRawBytes} / ${BUDGETS.maxRunnerChunkGzipBytes} · lazy add-on`,
    `    Account UI   ${accountChunkRaw} B raw / ${accountChunkGzip} B gz · cap ${BUDGETS.maxAccountChunkRawBytes} / ${BUDGETS.maxAccountChunkGzipBytes} · lazy add-on`,
    `    Toolchains   ${(packRaw / 1000 / 1000).toFixed(1)} MB raw · cap ${BUDGETS.maxRuntimeAssetRawBytes / 1000 / 1000} MB · opt-in per language`,
    '',
    '  Shell parts (gzip kB): ' +
      `CSS ${(totalCssGzip / 1000).toFixed(1)} · entry ${(entryJs.gzip / 1000).toFixed(1)} · ` +
      stats
        .filter(
          (item) =>
            item.rel.startsWith('assets/') && item.rel.endsWith('.js') && item !== entryJs && !isAddon(item.rel),
        )
        .map((item) => `${item.rel.replace(/^assets\//, '').replace(/-[\w-]{8}\.js$/, '')} ${(item.gzip / 1000).toFixed(1)}`)
        .join(' · '),
    `  SW v2: ${(precacheList?.size ?? 0)} precached shell URLs · ${(runtimeList?.size ?? 0)} add-on URLs · player/runtime/OAuth bypass · hash ${cacheName?.[1] ?? 'MISSING'}`,
  ].join('\n'),
)

if (failures.length > 0) {
  console.error('Budget check failed:\n' + failures.map((item) => `  - ${item}`).join('\n'))
  process.exit(1)
}
