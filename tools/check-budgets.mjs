/**
 * Phase 6.2 performance,Spark-transfer and PWA-integrity budget gate (CI).
 *
 * Inspects the production `dist/` directory and fails CI if CSS, entry JS,
 * maximum single JS chunk, total gzipped app-shell transfer, or PWA offline
 * precache invariants drift beyond the budgets recorded in the Phase 6 record.
 */
import { gzipSync } from 'node:zlib'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('dist')

/**
 * v2 budgets, re-baselined once in phase v2-01 with the numbers approved in
 * docs/DECISIONS.md (2026-11-03, "CI budgets"): CSS 60 kB raw / 18 kB gzip,
 * entry JS 180 kB raw / 55 kB gzip, one 520 kB raw chunk cap.
 *
 * The shell cap moved 380 kB → 386 kB → 388 kB in phase v2-06, both on the
 * owner's explicit decision (2026-11-04). The theatre costs ~9.9 kB gzip of new
 * capability and Phase 05 had only 3.99 kB of headroom; the first re-baseline
 * left the build exactly on the ceiling, so ordinary few-hundred-byte build
 * variance failed CI. The measured numbers, the rejected alternatives and the
 * option list are published in docs/phases-v2/06-theatre-player/RECORD.md;
 * phase v2-09 re-examines this cap with the runner in place.
 * Runtime assets that are fetched on demand (the phase-07 wasm compiler, ~14 MB,
 * and the two font subsets, ~45 kB) live in their OWN bucket below and are never
 * counted as shell transfer — and the Service Worker must never precache them.
 */
export const BUDGETS = {
  maxCssRawBytes: 60_000,
  maxCssGzipBytes: 18_000,
  maxEntryJsRawBytes: 180_000,
  maxEntryJsGzipBytes: 55_000,
  maxSingleJsRawBytes: 520_000,
  maxSingleJsGzipBytes: 165_000,
  maxShellGzipBytes: 388_000,
  /** Runtime bucket: fonts + future compiler payload, never precached. */
  maxRuntimeAssetRawBytes: 15_000_000,
  maxFontRawBytes: 60_000,
}

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

const cssFiles = stats.filter((item) => item.rel.endsWith('.css'))
const jsAssets = stats.filter((item) => item.rel.startsWith('assets/') && item.rel.endsWith('.js'))
const entryJs = jsAssets.find((item) => /^assets\/index-[^/]+\.js$/.test(item.rel))

if (!entryJs) throw new Error('Could not find built entry chunk dist/assets/index-*.js')
if (cssFiles.length === 0) throw new Error('Could not find built CSS asset in dist/assets/')

const totalCssRaw = cssFiles.reduce((sum, item) => sum + item.raw, 0)
const totalCssGzip = cssFiles.reduce((sum, item) => sum + item.gzip, 0)
const largestJsRaw = jsAssets.reduce((max, item) => (item.raw > max.raw ? item : max), jsAssets[0])
const largestJsGzip = jsAssets.reduce((max, item) => (item.gzip > max.gzip ? item : max), jsAssets[0])
// The shell bucket is everything the Service Worker precaches: HTML, CSS, JS,
// manifest and icons. Runtime assets (font subsets, the future wasm compiler)
// are deliberately in their own bucket below and are never precached.
const totalShellGzip = stats
  .filter((item) => !item.rel.startsWith('fonts/'))
  .reduce((sum, item) => sum + item.gzip, 0)

const failures = []
if (totalCssRaw > BUDGETS.maxCssRawBytes) {
  failures.push(`CSS raw ${totalCssRaw} B > budget ${BUDGETS.maxCssRawBytes} B`)
}
if (totalCssGzip > BUDGETS.maxCssGzipBytes) {
  failures.push(`CSS gzip ${totalCssGzip} B > budget ${BUDGETS.maxCssGzipBytes} B`)
}
if (entryJs.raw > BUDGETS.maxEntryJsRawBytes) {
  failures.push(`Entry JS (${entryJs.rel}) raw ${entryJs.raw} B > budget ${BUDGETS.maxEntryJsRawBytes} B`)
}
if (entryJs.gzip > BUDGETS.maxEntryJsGzipBytes) {
  failures.push(`Entry JS (${entryJs.rel}) gzip ${entryJs.gzip} B > budget ${BUDGETS.maxEntryJsGzipBytes} B`)
}
if (largestJsRaw.raw > BUDGETS.maxSingleJsRawBytes) {
  failures.push(`Largest JS chunk (${largestJsRaw.rel}) raw ${largestJsRaw.raw} B > budget ${BUDGETS.maxSingleJsRawBytes} B`)
}
if (largestJsGzip.gzip > BUDGETS.maxSingleJsGzipBytes) {
  failures.push(`Largest JS chunk (${largestJsGzip.rel}) gzip ${largestJsGzip.gzip} B > budget ${BUDGETS.maxSingleJsGzipBytes} B`)
}
if (totalShellGzip > BUDGETS.maxShellGzipBytes) {
  failures.push(`Total shell gzip ${totalShellGzip} B > budget ${BUDGETS.maxShellGzipBytes} B`)
}

// PWA manifest & Service Worker integrity checks (6.1 + 6.2).
for (const required of ['manifest.webmanifest', 'sw.js', 'offline.html', '404.html']) {
  if (!files.includes(required)) failures.push(`Missing required PWA/release file dist/${required}`)
}

const manifest = JSON.parse(await readFile(path.join(root, 'manifest.webmanifest'), 'utf8'))
if (manifest.display !== 'standalone') failures.push('manifest.webmanifest must set display: "standalone"')
if (manifest.start_url !== '/') failures.push('manifest.webmanifest must set start_url: "/"')
// Tokens v2 canvas (phase v2-01 re-freeze): #0B0D0E.
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

const swSource = await readFile(path.join(root, 'sw.js'), 'utf8')
if (!swSource.includes("url.pathname.startsWith('/__/')")) {
  failures.push('dist/sw.js must bypass Firebase Hosting /__/ Auth paths')
}
for (const asset of [...cssFiles, ...jsAssets]) {
  if (!swSource.includes(`"/${asset.rel}"`)) {
    failures.push(`dist/sw.js does not precache /${asset.rel}`)
  }
}

for (const standalonePage of ['offline.html', '404.html']) {
  const html = await readFile(path.join(root, standalonePage), 'utf8')
  if (/https?:\/\//i.test(html)) {
    failures.push(`dist/${standalonePage} must stay self-contained without external URLs`)
  }
}

// Runtime-asset bucket: fonts ship from `public/fonts/` and are fetched on demand
// (font-display: swap), so they must never enter the shell precache list.
const runtimeAssets = stats.filter((item) => item.rel.startsWith('fonts/'))
const fontRaw = runtimeAssets.reduce((sum, item) => sum + item.raw, 0)
if (fontRaw > BUDGETS.maxFontRawBytes) {
  failures.push(`Font subsets raw ${fontRaw} B > budget ${BUDGETS.maxFontRawBytes} B (two Latin subsets, ~45 kB)`)
}
for (const asset of runtimeAssets) {
  if (swSource.includes(`"/${asset.rel}"`)) {
    failures.push(`dist/sw.js must not precache runtime asset /${asset.rel}`)
  }
}

// Spark Hosting transfer headroom: 360 MB/day free transfer vs full cold shell.
const sparkDailyBytes = 360 * 1000 * 1000
const coldInstallsPerDay = Math.floor(sparkDailyBytes / totalShellGzip)

console.log(
  [
    `Budgets checked across ${stats.length} built files:`,
    `  CSS:          ${(totalCssRaw / 1000).toFixed(2)} kB raw / ${(totalCssGzip / 1000).toFixed(2)} kB gzip (cap ${BUDGETS.maxCssRawBytes / 1000} / ${BUDGETS.maxCssGzipBytes / 1000} kB)`,
    `  Entry JS:     ${(entryJs.raw / 1000).toFixed(2)} kB raw / ${(entryJs.gzip / 1000).toFixed(2)} kB gzip (cap ${BUDGETS.maxEntryJsRawBytes / 1000} / ${BUDGETS.maxEntryJsGzipBytes / 1000} kB)`,
    `  Largest JS:   ${largestJsRaw.rel} ${(largestJsRaw.raw / 1000).toFixed(2)} kB raw / ${(largestJsGzip.gzip / 1000).toFixed(2)} kB gzip (cap ${BUDGETS.maxSingleJsRawBytes / 1000} / ${BUDGETS.maxSingleJsGzipBytes / 1000} kB)`,
    `  Total shell:  ${(totalShellGzip / 1000).toFixed(2)} kB gzip (cap ${BUDGETS.maxShellGzipBytes / 1000} kB · ~${coldInstallsPerDay} cold installs/day inside 360 MB Spark Hosting cap)`,
    `  Runtime:      ${(fontRaw / 1000).toFixed(2)} kB font subsets raw (cap ${BUDGETS.maxFontRawBytes / 1000} kB · separate bucket, never precached)`,
    `  Shell parts:  CSS ${(totalCssGzip / 1000).toFixed(1)} · entry ${(entryJs.gzip / 1000).toFixed(1)} · ` +
      stats
        .filter((item) => item.rel.startsWith('assets/') && item.rel.endsWith('.js') && item !== entryJs)
        .map((item) => `${item.rel.replace(/^assets\//, '').replace(/-[\w-]{8}\.js$/, '')} ${(item.gzip / 1000).toFixed(1)}`)
        .join(' · ') +
      ` · other ${((totalShellGzip - totalCssGzip - stats.filter((item) => item.rel.endsWith('.js')).reduce((sum, item) => sum + item.gzip, 0)) / 1000).toFixed(1)} kB gzip`,
  ].join('\n'),
)

if (failures.length > 0) {
  console.error('Budget check failed:\n' + failures.map((item) => `  - ${item}`).join('\n'))
  process.exit(1)
}
