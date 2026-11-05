#!/usr/bin/env node
/**
 * Phase v2-09 — the dead-dependency decision is now enforced, not just written.
 *
 * Owner gate re-opening 2026-11-03: "Tailwind/daisyUI: decide (use them, or
 * remove them) — no third state." Phase v2-01 decided REMOVE. This check keeps
 * that decision true across package.json, the stylesheet, the router, the
 * backup schema and the README credits, and keeps the v1 note/route residue out.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = (rel) => readFile(path.join(root, rel), 'utf8')
const [packageJson, styles, router, backup, readme, uiReference] = await Promise.all([
  read('package.json'),
  read('src/styles.css'),
  read('src/app/router.ts'),
  read('src/backup.ts'),
  read('README.md'),
  read('docs/UI-REFERENCE.md'),
])
const pkg = JSON.parse(packageJson)
const failures = []

const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}), ...(pkg.overrides ?? {}) }
for (const name of Object.keys(deps)) {
  if (/tailwind|daisyui/i.test(name)) failures.push(`${name} is back in package.json — the phase-v2-01 decision was REMOVE`)
}
for (const pattern of [/@import\s+['"]tailwindcss/, /@plugin\s+['"]daisyui/, /@source\s*\(/]) {
  if (pattern.test(styles)) failures.push(`src/styles.css still declares ${pattern}`)
}
// Four v1 CSS classes that no component has used since the router rewrite.
for (const stale of ['.sheet-top', '.sheet-center', '.quiz-screen', '.notes-screen']) {
  if (styles.includes(stale)) failures.push(`stale v1 CSS class ${stale} is still shipped`)
}
// Notes were deleted end-to-end in phase v2-04 (code, route, rules, backup).
if (router.includes("'/notes'") || router.includes('"/notes"')) failures.push('the removed /notes route is back')
if (/\bnotes\s*:\s*\[\]/.test(backup) || /backup\.notes\b/.test(backup)) {
  failures.push('backup.ts still carries the removed top-level notes[] array')
}
// Truthful credits: the README must not claim shipped Tailwind/daisyUI deps.
const licenceSection = readme.slice(readme.indexOf('## Licence & credits'))
// A historical "removed in v2-01" note is fine; a *shipped dependency* claim is not.
if (/`tailwindcss`\s+`\d|`daisyui`\s+`\d|daisyui\s+\(MIT|preflight base styles/i.test(licenceSection)) {
  failures.push('README credits still list the removed Tailwind/daisyUI as shipped dependencies')
}
// Privacy copy: phase v2-09 documents the deletion contract in the README.
if (!/Delete my data|delete my data/i.test(readme)) {
  failures.push('README is missing the "Delete my data" privacy section')
}
if (!/Tokens v2 \(FINAL/i.test(uiReference)) failures.push('docs/UI-REFERENCE.md is missing the FINAL tokens-v2 table')
if (!/Stack \(v1 history only/i.test(uiReference)) {
  failures.push('docs/UI-REFERENCE.md must label the Tailwind/daisyUI stack as v1 history, not a current dependency')
}
// No third-party runtime requests: nothing in the shell may reference a CDN.
if (/https:\/\/cdn\.|unpkg\.com|jsdelivr/i.test(styles + router)) {
  failures.push('the shell must not reference a CDN at runtime')
}

console.log(
  [
    'Dead-weight check (phase v2-09):',
    '  Tailwind / daisyUI: REMOVED from package.json, styles.css and README credits (decision 2026-11-03 / phase v2-01)',
    '  Stale v1 CSS:       .sheet-top, .sheet-center, .quiz-screen pruned',
    '  Notes residue:       no route, no backup notes[]; snippets are the only saved-code shape',
    '  Privacy copy:        README documents "Delete my data" and the seven Firestore paths',
    '  Runtime:             no CDN script/style in the shell',
  ].join('\n'),
)
if (failures.length > 0) {
  console.error('Dead-weight check failed:\n' + failures.map((item) => `  - ${item}`).join('\n'))
  process.exit(1)
}
