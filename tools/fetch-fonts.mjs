#!/usr/bin/env node
/**
 * Re-vendors the two self-hosted font subsets in `public/fonts/`.
 *
 * The files are committed (they are part of the app shell and its budget), so
 * CI never needs this script. Run it only when deliberately changing the
 * subsets — then review the byte sizes against `tools/check-budgets.mjs`:
 *
 *   npm i --no-save @fontsource-variable/inter @fontsource/jetbrains-mono
 *   node tools/fetch-fonts.mjs
 *
 * Steps, in order, and why:
 *  1. copy the Latin variable Inter subset and the two JetBrains Mono weights;
 *  2. subset them to Latin + the glyphs the UI actually renders (box drawing
 *     and arrows included) with pyftsubset, from the optional `fonttools`
 *     Python package;
 *  3. keep `font-display: swap` (declared in src/design/tokens.css) so a cold
 *     cache never blocks first paint.
 *
 * Nothing here is derived from `copy-web/`: both typefaces are OFL and are
 * fetched from their own npm packages.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const out = join(root, 'public', 'fonts')
const tmp = join(root, '.tmp-fonts')
const require = createRequire(import.meta.url)

const SOURCES = [
  {
    pkg: '@fontsource-variable/inter',
    from: 'files/inter-latin-wght-normal.woff2',
    to: 'inter-latin-var.woff2',
  },
  {
    pkg: '@fontsource/jetbrains-mono',
    from: 'files/jetbrains-mono-latin-400-normal.woff2',
    to: 'jetbrains-mono-latin-400.woff2',
  },
  {
    pkg: '@fontsource/jetbrains-mono',
    from: 'files/jetbrains-mono-latin-700-normal.woff2',
    to: 'jetbrains-mono-latin-700.woff2',
  },
]

/** Latin, punctuation, the UI's own marks, and the mono arrows/branches. */
const UNICODES = [
  'U+0000-00FF', // basic latin + latin-1 supplement
  'U+2000-206F', // general punctuation (– — ‘ ’ “ ” …)
  'U+2070-209F', // super/subscripts
  'U+20A0-20CF', // currency
  'U+2190-21FF', // arrows  ← → ↑ ↓ ↗
  'U+2200-22FF', // math operators (∑ ≤ ≥ ≈)
  'U+2500-257F', // box drawing (tree branches in the notes snippets)
  'U+25A0-25FF', // geometric shapes
  'U+2600-26FF', // misc symbols (✓ ★ ⏱)
  'U+2713-2714', // check marks
  'U+FEFF', // zero width no-break space
]

function pkgFile(pkg, file) {
  return join(dirname(require.resolve(`${pkg}/package.json`)), file)
}

function pyftsubset(bin, input, output) {
  execFileSync(bin, [
    input,
    `--output-file=${output}`,
    '--flavor=woff2',
    '--layout-features=kern,liga,calt,tnum,zero',
    `--unicodes=${UNICODES.join(',')}`,
    '--no-hinting',
    '--desubroutinize',
  ])
}

mkdirSync(out, { recursive: true })
mkdirSync(tmp, { recursive: true })

const bin = process.env.PYFTSUBSET ?? 'pyftsubset'
const hasFonttools = (() => {
  try {
    execFileSync(bin, ['--help'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

for (const source of SOURCES) {
  const input = pkgFile(source.pkg, source.from)
  if (!existsSync(input)) {
    console.error(`missing ${input} — run the npm install line in this file's header first`)
    process.exitCode = 1
    continue
  }
  const target = join(out, source.to)
  if (hasFonttools) {
    pyftsubset(bin, input, target)
    console.log(`${source.to.padEnd(32)} ${statSync(target).size} B (subset)`)
  } else {
    copyFileSync(input, target)
    console.log(`${source.to.padEnd(32)} ${statSync(target).size} B (verbatim — install fonttools to subset)`)
  }
}
