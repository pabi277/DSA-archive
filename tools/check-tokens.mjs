#!/usr/bin/env node
/**
 * Phase v2-09 — the token test the phase contract asks for.
 *
 * axe checks the *rendered* pages; this checks the *palette itself*: every text
 * pair in tokens v2 must clear WCAG AA 4.5:1 in both themes, the action ink on
 * the action fill must clear 4.5:1, focus must be visible, reduced motion must
 * zero every duration, and phone touch targets must stay ≥44 px.
 *
 * Values are read from `src/design/tokens.css` (the frozen token file), so a
 * future colour edit fails CI instead of quietly shipping low-contrast text.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const css = await readFile(path.join(root, 'src/design/tokens.css'), 'utf8')
const index = await readFile(path.join(root, 'index.html'), 'utf8')
const failures = []

function variables(block) {
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  )
}
const darkBlock = css.match(/\.app-root\s*\{([\s\S]*?)color-scheme: dark;/)?.[1] ?? ''
const lightBlock = css.match(/\.app-root\[data-theme='light'\]\s*\{([\s\S]*?)\}/)?.[1] ?? ''
const dark = variables(darkBlock)
const light = variables(lightBlock)

function channel(value) {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
function luminance(hex) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(full.slice(i, i + 2), 16)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const MIN_CONTRAST = 4.5
const pairs = [
  ['ink', 'bg'], ['ink', 'surface'], ['ink', 'surface-2'],
  ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-2'],
  ['subtle', 'bg'], ['subtle', 'surface'], ['subtle', 'surface-2'],
  ['action', 'bg'], ['action', 'surface'], ['action', 'surface-2'],
]
const rows = []
for (const [theme, tokens] of [['dark', dark], ['light', light]]) {
  if (!tokens.ink || !tokens.action) {
    failures.push(`could not parse the ${theme} theme tokens`)
    continue
  }
  for (const [fg, bg] of pairs) {
    const ratio = contrast(tokens[fg], tokens[bg])
    rows.push(`    ${theme.padEnd(5)} ${`${fg}/${bg}`.padEnd(22)} ${ratio.toFixed(2)}:1`)
    if (ratio < MIN_CONTRAST) failures.push(`${theme} ${fg} on ${bg} is ${ratio.toFixed(2)}:1 (< ${MIN_CONTRAST}:1)`)
  }
  const inkOnAction = contrast(tokens['action-ink'], tokens.action)
  rows.push(`    ${theme.padEnd(5)} ${'action-ink/action'.padEnd(22)} ${inkOnAction.toFixed(2)}:1`)
  if (inkOnAction < MIN_CONTRAST) failures.push(`${theme} action-ink on action is ${inkOnAction.toFixed(2)}:1`)
}

// Focus ring, reduced motion, font loading and phone touch targets.
if (!/\.app-root :focus-visible\s*\{[^}]*outline: 2px solid var\(--focus\)/s.test(css)) {
  failures.push('tokens v2 must keep a 2px visible :focus-visible ring')
}
if (!/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?transition-duration: 0\.001ms !important/s.test(css)) {
  failures.push('tokens v2 must zero transitions under prefers-reduced-motion')
}
if ((css.match(/animation-duration: 0\.001ms !important/g) ?? []).length === 0) {
  failures.push('tokens v2 must zero animations under prefers-reduced-motion')
}
if ((css.match(/font-display: swap;/g) ?? []).length < 3) {
  failures.push('all three self-hosted font faces must use font-display: swap (no CLS)')
}
if (!index.includes('rel="preload" href="/fonts/inter-latin-var.woff2"')) {
  failures.push('index.html must preload the Inter subset')
}
const phoneBlock = css.match(/@media \(max-width: 820px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
const phoneControl = Number(phoneBlock.match(/--control-height:\s*(\d+)px/)?.[1] ?? 0)
if (phoneControl < 44) failures.push(`phone --control-height is ${phoneControl}px (< 44 px touch target)`)

console.log(
  [
    `Token contrast check (phase v2-09): ${rows.length} pairs, minimum ${MIN_CONTRAST}:1`,
    ...rows,
    `  focus ring: 2px · reduced motion: 0.001ms · phone touch target: ${phoneControl}px · fonts: swap + preload`,
  ].join('\n'),
)
if (failures.length > 0) {
  console.error('Token check failed:\n' + failures.map((item) => `  - ${item}`).join('\n'))
  process.exit(1)
}
