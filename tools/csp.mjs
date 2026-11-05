#!/usr/bin/env node
/**
 * Phase v2-09 — one Content Security Policy, in one place.
 *
 * Owner decision 2026-11-03 (docs/DECISIONS.md, "GATE re-openings approved for
 * v2"): CSP is adopted, report-only first, then enforced, with `frame-src` for
 * YouTube and `worker-src` for the local runner. `tools/check-csp.mjs` proves
 * `firebase.json` ships exactly this policy; `e2e/csp.spec.ts` drives the
 * report-only → enforce sequence in real Chromium before the enforced header is
 * allowed to stand.
 *
 * Why each exception exists (all are deliberate, none is a wildcard escape):
 *   · YouTube's official IFrame Player API loads `www.youtube.com/iframe_api`
 *     and embeds `www.youtube-nocookie.com/embed/<id>` (phase v2-06). We never
 *     modify that frame (ToS §4.13), so its own scripts/media are permitted.
 *   · Firebase Auth/Firestore use `*.googleapis.com`, `*.firebaseio.com`,
 *     `apis.google.com` and `accounts.google.com` for sign-in and WebChannel.
 *   · React writes inline styles (`element.style`), so `style-src-attr` needs
 *     `'unsafe-inline'`; page <script> elements stay on the strict
 *     `script-src-elem` allow-list with NO inline scripts.
 *   · `script-src` is deliberately split from `script-src-elem`. A Worker
 *     created from a same-origin URL inherits its own response's CSP; the
 *     phase-v2-07 sandbox uses `new Function` (JavaScript) and
 *     `WebAssembly.compile` (Clang/Pyodide), which need `'unsafe-eval'` and
 *     `'wasm-unsafe-eval'` *inside the worker*, not in the document. Document
 *     scripts are governed by `script-src-elem` and get neither.
 *
 * No `report-uri`, no reporting endpoint, no analytics: a CSP report would be a
 * third-party network request and `rule.md` §3 gates trackers. Violations are
 * caught in CI by a `securitypolicyviolation` listener instead.
 */

/** Production directives. Order is stable so the header is a reviewable diff. */
export const CSP_DIRECTIVES = Object.freeze({
  'default-src': ["'self'"],
  'base-uri': ["'none'"],
  'object-src': ["'none'"],
  'form-action': ["'self'", 'https://accounts.google.com'],
  'frame-ancestors': ["'self'"],
  // Document scripts only. No 'unsafe-inline', no 'unsafe-eval', no wildcards.
  'script-src-elem': [
    "'self'",
    'https://www.youtube.com/iframe_api',
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
    'https://apis.google.com',
    'https://accounts.google.com',
  ],
  // Worker-global fallback (and the fallback for browsers without -elem).
  'script-src': ["'self'", "'unsafe-eval'", "'wasm-unsafe-eval'"],
  'script-src-attr': ["'none'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  // The runner's CSS travels inside its lazy add-on chunk and is injected once
  // as a <style> element (phase v2-07 decision: no separate CSS asset in the
  // shell). A static Hosting deployment cannot issue a per-response nonce, and
  // a <style> element has no hash we can pin across builds, so style elements
  // get the same inline allowance React already needs for style attributes.
  // This never widens script-src-elem, which stays a strict allow-list.
  'style-src-elem': ["'self'", "'unsafe-inline'"],
  'style-src-attr': ["'unsafe-inline'"],
  'img-src': [
    "'self'",
    'data:',
    'https://i.ytimg.com',
    'https://*.ytimg.com',
    'https://*.googleusercontent.com',
    'https://*.gstatic.com',
  ],
  'font-src': ["'self'"],
  'connect-src': [
    "'self'",
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'wss://*.firebaseio.com',
    'https://apis.google.com',
    'https://accounts.google.com',
    'https://www.youtube.com',
  ],
  'worker-src': ["'self'", 'blob:'],
  'child-src': ["'self'", 'blob:'],
  'frame-src': [
    "'self'",
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
    'https://accounts.google.com',
    'https://dsa-archive.firebaseapp.com',
  ],
  'media-src': ["'self'", 'blob:', 'https://*.googlevideo.com'],
  'manifest-src': ["'self'"],
})

/**
 * CI builds against the local Firebase Emulator Suite (127.0.0.1:8080/9099),
 * which is why the *test* policy adds loopback to `connect-src`. These entries
 * are NEVER in the deployed header — `check-csp.mjs` fails if they are.
 */
export const EMULATOR_CONNECT_SOURCES = Object.freeze([
  'http://127.0.0.1:*',
  'http://localhost:*',
  'ws://127.0.0.1:*',
  'ws://localhost:*',
])

export function buildCsp({ emulator = false } = {}) {
  const directives = { ...CSP_DIRECTIVES }
  if (emulator) {
    directives['connect-src'] = [...CSP_DIRECTIVES['connect-src'], ...EMULATOR_CONNECT_SOURCES]
  }
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ') + ';'
}

/** The enforced header that `firebase.json` must carry, byte for byte. */
export const PRODUCTION_CSP = buildCsp()
