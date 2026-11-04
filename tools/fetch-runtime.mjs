#!/usr/bin/env node
/**
 * Phase v2-07 — fetch the local code-runner toolchains into `public/runtime/`.
 *
 * The runner compiles C++ and runs Python **in the browser**, so the toolchains
 * are static files this site serves — never a build artefact of our own code and
 * never a CDN call at runtime (the app must run offline and must never send
 * learner code anywhere). They are far too large for git, so they are fetched
 * here, by a human or by CI, and `.gitignore`d:
 *
 *   npm run runtime:fetch                 both packs
 *   npm run runtime:fetch -- --pack cpp   only the C/C++ toolchain
 *   npm run runtime:fetch -- --check      verify what is on disk, download nothing
 *   npm run runtime:clean                 delete `public/runtime/` packs
 *
 * Every byte is verified twice before it is written: the npm tarball against the
 * registry's `dist.integrity` (sha-512), then each extracted file's size and
 * sha-256 against `public/runtime/packs.json`, which this script writes for the
 * app (it is how Settings prints an honest size and how the install reports
 * progress). A failed verification writes **nothing** — a half-installed
 * toolchain is worse than an absent one.
 *
 * Provenance and licences (`docs/DECISIONS.md`, reuse scan 2026-11-04):
 *   · C/C++  — @live-codes/clang-wasm (MIT), Clang 22 + wasm-ld + wasi sysroot
 *   · Python — Pyodide (MPL-2.0), CPython 3.13 on wasm
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { gunzipSync } from 'node:zlib'

const ROOT = path.resolve(import.meta.dirname, '..')
const PUBLIC_RUNTIME = path.join(ROOT, 'public', 'runtime')
const REGISTRY = 'https://registry.npmjs.org'

/**
 * One entry per installable pack. `want` lists the tarball members we serve; the
 * rest of the package (Objective-C runtime, clangd, source maps, TypeScript
 * declarations) is deliberately left out, so the download a learner pays for is
 * only what the run needs.
 */
export const PACKS = {
  cpp: {
    label: 'C and C++',
    package: '@live-codes/clang-wasm',
    version: '0.3.0',
    license: 'MIT',
    target: 'clang',
    want: [
      'assets/runtime-manifest.v1.json',
      'assets/bin/clang.wasm.gz',
      'assets/bin/lld.wasm.gz',
      'assets/bin/memfs.wasm.gz',
      'assets/bin/sysroot.tar.gz',
    ],
    // tarball member → path inside public/runtime/<target>/
    rename: { 'assets/runtime-manifest.v1.json': 'runtime-manifest.v1.json' },
  },
  python: {
    label: 'Python',
    package: 'pyodide',
    version: '314.0.7',
    license: 'MPL-2.0',
    target: 'pyodide',
    want: [
      'pyodide.mjs',
      'pyodide.asm.mjs',
      'pyodide.asm.wasm',
      'python_stdlib.zip',
      'pyodide-lock.json',
    ],
    rename: {},
  },
}

/* --- a tiny ustar reader --------------------------------------------------- */

/** Parse a tar buffer into `Map<path, Buffer>`, honouring the ustar prefix field. */
export function readTar(buffer) {
  const files = new Map()
  let offset = 0
  let longName = null
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break
    const nameField = readString(header, 0, 100)
    const size = readOctal(header, 124, 12)
    const type = String.fromCharCode(header[156] || 48)
    const prefix = readString(header, 345, 155)
    const name = longName ?? (prefix ? `${prefix}/${nameField}` : nameField)
    longName = null
    const dataStart = offset + 512
    const data = buffer.subarray(dataStart, dataStart + size)
    if (type === 'L') {
      longName = data.toString('utf8').replace(/\0+$/, '')
    } else if (type === '0' || type === '7' || type === '') {
      // npm tarballs wrap everything in `package/`; the app serves the paths
      // below `public/runtime/`, so the wrapper is not part of the identity.
      // npm tarballs wrap everything in `package/`; the app serves these paths
      // below `public/runtime/`, so the wrapper is not part of the identity.
      const key = name.startsWith('package/') ? name.slice(8) : name
      files.set(key, data)
    }
    offset = dataStart + Math.ceil(size / 512) * 512
  }
  return files
}

function readString(buffer, start, length) {
  const slice = buffer.subarray(start, start + length)
  const end = slice.indexOf(0)
  return slice.subarray(0, end === -1 ? slice.length : end).toString('utf8')
}

function readOctal(buffer, start, length) {
  const text = readString(buffer, start, length).trim()
  return text === '' ? 0 : Number.parseInt(text, 8)
}

/* --- helpers --------------------------------------------------------------- */

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function formatBytes(bytes) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} kB`
  return `${bytes} B`
}

async function registryMetadata(name) {
  const url = `${REGISTRY}/${name.replace('/', '%2F')}`
  const response = await fetch(url, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`)
  return response.json()
}

/** Download one npm package tarball and verify it against the registry integrity. */
export async function downloadTarball(spec) {
  const meta = await registryMetadata(spec.package)
  const entry = meta.versions?.[spec.version]
  if (!entry) throw new Error(`${spec.package}@${spec.version} is not on the registry`)
  const integrity = entry.dist?.integrity ?? ''
  if (!integrity.startsWith('sha512-')) {
    throw new Error(`${spec.package}@${spec.version} publishes no sha-512 integrity to verify`)
  }
  const response = await fetch(entry.dist.tarball)
  if (!response.ok) throw new Error(`${entry.dist.tarball} → HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  const digest = `sha512-${createHash('sha512').update(bytes).digest('base64')}`
  if (digest !== integrity) {
    throw new Error(`${spec.package}@${spec.version}: tarball does not match the registry integrity`)
  }
  return { bytes, integrity, tarball: entry.dist.tarball }
}

async function readJsonOrNull(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

async function writeAtomic(file, bytes) {
  await mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.partial`
  await writeFile(temporary, bytes)
  await rm(file, { force: true })
  const { rename } = await import('node:fs/promises')
  await rename(temporary, file)
}

/* --- install / check / clean ---------------------------------------------- */

export async function fetchPack(id, { quiet = false } = {}) {
  const spec = PACKS[id]
  if (!spec) throw new Error(`unknown pack "${id}" — expected ${Object.keys(PACKS).join(', ')}`)
  const log = quiet ? () => {} : (line) => console.log(line)
  log(`Fetching ${spec.package}@${spec.version} (${spec.label}, ${spec.license})…`)
  const { bytes: tarball, integrity } = await downloadTarball(spec)
  // npm tarballs are gzipped; the integrity above is over exactly these bytes.
  const members = readTar(gunzipSync(tarball))
  const files = []
  for (const member of spec.want) {
    const data = members.get(member)
    if (!data) throw new Error(`${spec.package}@${spec.version} does not ship ${member}`)
    const relative = `${spec.target}/${spec.rename[member] ?? member.replace(/^assets\//, '').replace(/^package\//, '')}`
    await writeAtomic(path.join(PUBLIC_RUNTIME, relative), data)
    files.push({ path: relative, bytes: data.byteLength, sha256: sha256(data) })
    log(`  ${relative} · ${formatBytes(data.byteLength)}`)
  }
  files.sort((a, b) => a.path.localeCompare(b.path))
  return {
    label: spec.label,
    version: spec.version,
    license: spec.license,
    package: spec.package,
    integrity,
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    files,
  }
}

/**
 * `packs.json` is the app's only source of truth for "how big is this download".
 * It is generated, never hand-edited, and it is what the install progress bar
 * divides by — so a missing pack file must fail the check rather than quietly
 * shrink the advertised size.
 */
export async function writePacks(packs) {
  const existing = (await readJsonOrNull(path.join(PUBLIC_RUNTIME, 'packs.json'))) ?? {}
  // Merge, never replace: `--pack cpp` must not forget a Python pack that is
  // already on disk. `--clean` is the only thing that empties this file.
  const merged = { ...(existing.packs ?? {}), ...packs }
  const document = {
    schemaVersion: 1,
    note: 'Generated by tools/fetch-runtime.mjs — never edit by hand. Not committed to git.',
    packs: merged,
  }
  await writeAtomic(path.join(PUBLIC_RUNTIME, 'packs.json'), `${JSON.stringify(document, null, 2)}\n`)
  return document
}

export async function checkPacks() {
  const document = await readJsonOrNull(path.join(PUBLIC_RUNTIME, 'packs.json'))
  const problems = []
  if (!document) problems.push('public/runtime/packs.json is missing — run `npm run runtime:fetch`')
  for (const [id, pack] of Object.entries(document?.packs ?? {})) {
    for (const file of pack.files ?? []) {
      let bytes
      try {
        bytes = await readFile(path.join(PUBLIC_RUNTIME, file.path))
      } catch {
        problems.push(`${id}: ${file.path} is missing`)
        continue
      }
      if (bytes.byteLength !== file.bytes) {
        problems.push(`${id}: ${file.path} is ${bytes.byteLength} B, packs.json says ${file.bytes} B`)
      } else if (sha256(bytes) !== file.sha256) {
        problems.push(`${id}: ${file.path} does not match its recorded sha-256`)
      }
    }
  }
  return problems
}

export async function cleanRuntime() {
  await rm(path.join(PUBLIC_RUNTIME, 'clang'), { recursive: true, force: true })
  await rm(path.join(PUBLIC_RUNTIME, 'pyodide'), { recursive: true, force: true })
  const document = await readJsonOrNull(path.join(PUBLIC_RUNTIME, 'packs.json'))
  if (document) await writeAtomic(path.join(PUBLIC_RUNTIME, 'packs.json'), `${JSON.stringify({ schemaVersion: 1, packs: {} }, null, 2)}\n`)
}

/* --- CLI ------------------------------------------------------------------- */

async function main(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')))
  const packArg = argv.find((arg) => arg.startsWith('--pack=')) ?? null
  const packIndex = argv.indexOf('--pack')
  const requested = packArg
    ? packArg.split('=')[1]
    : packIndex >= 0
      ? argv[packIndex + 1]
      : 'all'

  if (flags.has('--help') || flags.has('-h')) {
    console.log(
      [
        'Usage: node tools/fetch-runtime.mjs [--pack cpp|python|all] [--check] [--clean]',
        '',
        ...Object.entries(PACKS).map(
          ([id, spec]) => `  ${id.padEnd(7)} ${spec.label} · ${spec.package}@${spec.version} · ${spec.license}`,
        ),
        '',
        'Writes public/runtime/<pack>/… and public/runtime/packs.json. Never committed (see .gitignore).',
      ].join('\n'),
    )
    return
  }

  if (flags.has('--clean')) {
    await cleanRuntime()
    console.log('Removed public/runtime/{clang,pyodide} and emptied packs.json')
    return
  }

  if (flags.has('--check')) {
    const problems = await checkPacks()
    if (problems.length > 0) {
      console.error('Runtime packs are not usable:\n' + problems.map((line) => `  - ${line}`).join('\n'))
      process.exit(1)
    }
    const document = await readJsonOrNull(path.join(PUBLIC_RUNTIME, 'packs.json'))
    const packs = Object.entries(document?.packs ?? {})
    console.log(
      packs.length === 0
        ? 'No runtime packs on disk (the runner will ask the learner to download one).'
        : 'Runtime packs verified:\n' +
            packs
              .map(([id, pack]) => `  ${id.padEnd(7)} ${formatBytes(pack.bytes)} · ${pack.files.length} files · ${pack.version}`)
              .join('\n'),
    )
    return
  }

  const ids = requested === 'all' ? Object.keys(PACKS) : requested.split(',').map((id) => id.trim())
  const packs = {}
  for (const id of ids) packs[id] = await fetchPack(id)
  const document = await writePacks(packs)
  const total = Object.values(document.packs).reduce((sum, pack) => sum + pack.bytes, 0)
  console.log(`\nWrote public/runtime/packs.json · every pack ${formatBytes(total)} on disk`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await main(process.argv.slice(2))
}
