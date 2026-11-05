import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * The Service Worker buckets are a budget contract, not an implementation detail
 * (phase v2-10). `docs/DECISIONS.md` freezes the shell at 393,000 B gzip and says
 * any growth is an owner gate, so the buckets are read from the builder source
 * here rather than trusted to stay put. Reading the source (instead of importing
 * the `.mjs` builder) keeps this in the typed unit suite, which the build checks.
 */
const builder = readFileSync(path.resolve(__dirname, '../tools/build-sw.mjs'), 'utf8')

const listConst = (name: string): string[] => {
  const match = builder.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\]`))
  if (!match) throw new Error(`${name} is not declared in tools/build-sw.mjs`)
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1])
}

const ADDON_PREFIXES = listConst('ADDON_PREFIXES')
const RUNTIME_MANIFESTS = listConst('RUNTIME_MANIFESTS')
const NOT_SHELL = listConst('NOT_SHELL')

const isRuntimeAsset = (rel: string) => ADDON_PREFIXES.some((prefix) => rel.startsWith(prefix))

describe('Service Worker buckets (phase v2-07 … v2-10)', () => {
  it('never precaches a runner, account or runtime asset', () => {
    for (const rel of [
      'runtime/runner/worker-85ed99d1f1ec.js',
      'runtime/packs.json',
      'assets/runner-abc12345.js',
      'assets/account-abc12345.js',
    ]) {
      expect(isRuntimeAsset(rel)).toBe(true)
    }
    for (const rel of ['assets/index-abc12345.js', 'index.html', 'icons/icon-192.png', 'manifest.webmanifest']) {
      expect(isRuntimeAsset(rel)).toBe(false)
    }
  })

  it('keeps the two small manifests out of the installed add-on list', () => {
    for (const rel of RUNTIME_MANIFESTS) expect(isRuntimeAsset(rel)).toBe(true)
    expect(RUNTIME_MANIFESTS).toEqual(['runtime/packs.json', 'runtime/runner/index.json'])
    // The exclusion itself lives in the generated sw.js; tools/check-budgets.mjs
    // asserts it there, where the real list is.
  })

  it('leaves the social card out of both buckets', () => {
    expect(isRuntimeAsset('og-image.png')).toBe(false)
    expect(NOT_SHELL).toEqual(['og-image.png'])
    // And the builder must actually consult the list when collecting the shell.
    expect(builder).toMatch(/if \(NOT_SHELL\.includes\(rel\)\) continue/)
  })
})
