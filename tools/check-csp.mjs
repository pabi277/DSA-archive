#!/usr/bin/env node
/**
 * Phase v2-09 — enforce the CSP decision in CI.
 *
 * `firebase.json` is the deployed source of truth, `tools/csp.mjs` is the
 * written policy. This check keeps the two byte-for-byte identical, proves the
 * required exceptions are present (and only those), and proves the emulator's
 * loopback allowances never reach the live header.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { buildCsp, CSP_DIRECTIVES, PRODUCTION_CSP, EMULATOR_CONNECT_SOURCES } from './csp.mjs'

const root = path.resolve(import.meta.dirname, '..')
const config = JSON.parse(await readFile(path.join(root, 'firebase.json'), 'utf8'))
const headers = config.hosting?.headers ?? []
const wildcard = headers.find((entry) => entry.source === '**')
const headerValue = (name) => wildcard?.headers?.find((entry) => entry.key === name)?.value ?? null

const failures = []
const csp = headerValue('Content-Security-Policy')
if (!csp) failures.push('firebase.json is missing the enforced Content-Security-Policy header on "**"')
else if (csp !== PRODUCTION_CSP) {
  failures.push('firebase.json CSP does not match tools/csp.mjs — edit the policy in one place, not two')
}
if (headerValue('Content-Security-Policy-Report-Only')) {
  failures.push('a report-only CSP is still configured; phase v2-09 validated it in e2e/csp.spec.ts and then enforced')
}

for (const [name, values] of Object.entries(CSP_DIRECTIVES)) {
  if (!csp?.includes(`${name} ${values.join(' ')}`)) failures.push(`CSP is missing the published "${name}" directive`)
}
const parse = (value) =>
  Object.fromEntries(
    (value ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...sources] = part.split(/\s+/)
        return [name, sources]
      }),
  )
const directives = parse(csp)

const requireSources = (name, sources) => {
  for (const source of sources) {
    if (!directives[name]?.includes(source)) failures.push(`CSP ${name} must allow ${source}`)
  }
}
requireSources('frame-src', ['https://www.youtube.com', 'https://www.youtube-nocookie.com'])
requireSources('script-src-elem', ['https://www.youtube.com/iframe_api', 'https://www.youtube-nocookie.com'])
requireSources('worker-src', ["'self'", 'blob:'])
requireSources('connect-src', ['https://*.googleapis.com', 'https://*.firebaseio.com'])
requireSources('base-uri', ["'none'"])
requireSources('object-src', ["'none'"])

// The document's script allow-list must stay strict. Eval/wasm belong to the
// worker's global, never to an injected <script> or an inline handler.
for (const forbidden of ["'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", 'https://*']) {
  if (directives['script-src-elem']?.includes(forbidden)) {
    failures.push(`CSP script-src-elem must not allow ${forbidden}`)
  }
}
for (const source of EMULATOR_CONNECT_SOURCES) {
  if (csp?.includes(source)) failures.push(`live CSP must not allow the emulator source ${source}`)
}
if (/127\.0\.0\.1|localhost|http:\/\//i.test(csp ?? '')) {
  failures.push('live CSP contains a loopback or plain-HTTP source')
}
// No reporting endpoint: a CSP report would be a tracker (rule.md §3).
if (/report-uri|report-to/i.test(csp ?? '')) failures.push('CSP must not configure a reporting endpoint')

for (const name of ['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options']) {
  if (!headerValue(name)) failures.push(`firebase.json is missing the ${name} header on "**"`)
}
const immutable = headers.find((entry) => entry.source === '/assets/**')
if (!immutable?.headers?.some((entry) => entry.key === 'Cache-Control' && /immutable/.test(entry.value))) {
  failures.push('built /assets/** must stay immutable (hashed file names)')
}
const noCache = headers.find((entry) => /index\.html/.test(entry.source))
if (!noCache?.headers?.some((entry) => entry.key === 'Cache-Control' && entry.value === 'no-cache')) {
  failures.push('HTML, sw.js, manifest and fallback pages must be served no-cache so updates are visible')
}

// The policy lives in a header, not a <meta>: a meta CSP cannot express
// frame-ancestors and would be duplicated in every offline copy of the shell.
const indexHtml = await readFile(path.join(root, 'index.html'), 'utf8')
if (/http-equiv=["']Content-Security-Policy/i.test(indexHtml)) {
  failures.push('index.html must not carry a duplicate <meta> CSP')
}

console.log(
  [
    'CSP check (phase v2-09):',
    `  Deployed header: ${(csp ?? '').length} bytes · ${Object.keys(CSP_DIRECTIVES).length} directives`,
    '  frame-src:       YouTube + YouTube-nocookie (the official IFrame player)',
    '  worker-src:      self + blob: (the local C++/Python/JS runner)',
    '  script-src-elem: strict allow-list, no inline/eval; eval + wasm are worker-only',
    '  connect-src:     Firebase Auth/Firestore + YouTube; no loopback, no reporting endpoint',
    `  Report-only stage: verified by e2e/csp.spec.ts; enforced header = ${csp === PRODUCTION_CSP ? 'yes' : 'NO'}`,
    `  Emulator variant: ${buildCsp({ emulator: true }).length} bytes (test-only, never deployed)`,
  ].join('\n'),
)

if (failures.length > 0) {
  console.error('CSP check failed:\n' + failures.map((item) => `  - ${item}`).join('\n'))
  process.exit(1)
}
