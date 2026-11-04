/**
 * Phase v2-07 — the runtime asset manifests.
 *
 * Two generated files sit in `public/runtime/` and both are optional, because a
 * checkout without network has neither:
 *
 *   packs.json          compiler packs (`tools/fetch-runtime.mjs`)
 *   runner/index.json   the hashed worker bundle (`tools/build-runner-worker.mjs`)
 *
 * Everything here is pure: shapes are sanitised on the way in (a malformed or
 * missing file must degrade to "cannot run here", never to a crash), and the
 * numbers the panel prints come from these same documents — so the announced
 * download and the progress bar can never disagree.
 */
import { PACK_LABELS, packsFor, supportFor, type PackId } from './languages'
import type { CodeLanguage } from '../code/codeStore'

export type PackFile = { path: string; bytes: number }
export type PackManifest = {
  id: PackId
  label: string
  version: string
  license: string
  bytes: number
  files: PackFile[]
}
export type RuntimePacks = Partial<Record<PackId, PackManifest>>
export type RunnerBundle = { worker: string; bytes: number }

/** `29.0 MB` / `119 kB` / `0 B` — base-10, matching Hosting and the browser. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} kB`
  return `${bytes} B`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

/** Accepted pack ids, in announcement order. */
const PACK_IDS: PackId[] = ['cpp', 'python']

export function sanitisePacks(raw: unknown): RuntimePacks {
  const packs: RuntimePacks = {}
  if (!isRecord(raw) || !isRecord(raw.packs)) return packs
  for (const id of PACK_IDS) {
    const entry = raw.packs[id]
    if (!isRecord(entry)) continue
    const files: PackFile[] = []
    for (const item of Array.isArray(entry.files) ? entry.files : []) {
      if (!isRecord(item)) continue
      const path = typeof item.path === 'string' ? item.path : null
      const bytes = positiveInteger(item.bytes)
      if (!path || bytes === null || path.includes('..')) continue
      files.push({ path, bytes })
    }
    const total = files.reduce((sum, file) => sum + file.bytes, 0)
    if (files.length === 0 || total === 0) continue
    packs[id] = {
      id,
      label: PACK_LABELS[id],
      version: typeof entry.version === 'string' ? entry.version : '',
      license: typeof entry.license === 'string' ? entry.license : '',
      bytes: total,
      files,
    }
  }
  return packs
}

export function sanitiseRunnerBundle(raw: unknown): RunnerBundle | null {
  if (!isRecord(raw)) return null
  const worker = typeof raw.worker === 'string' ? raw.worker : null
  const bytes = positiveInteger(raw.bytes)
  if (!worker || bytes === null) return null
  // Only a same-origin path under runtime/runner/ is ever spawned.
  if (!/^runtime\/runner\/worker-[0-9a-f]+\.js$/.test(worker)) return null
  return { worker, bytes }
}

export type InstallPlan = {
  /** `null` when the language cannot run at all. */
  packs: PackId[]
  /** Everything the first run downloads, worker bundle included. */
  bytes: number
  /** Only the compiler pack bytes — what the worker's progress bar counts. */
  packBytes: number
  /** `Download C and C++ compiler · 29.0 MB, once` */
  label: string
  ready: boolean
  /** Why the plan cannot run here (an asset the deploy did not ship). */
  unavailable: string | null
}

/**
 * What pressing Run will cost for this language. `available` comes from what the
 * deploy actually ships; a pack the server does not have is named out loud
 * rather than left to fail at the first fetch.
 */
export function installPlan(
  language: CodeLanguage,
  packs: RuntimePacks,
  runner: RunnerBundle | null,
): InstallPlan {
  const support = supportFor(language)
  if (!support.supported) {
    return { packs: [], bytes: 0, packBytes: 0, label: support.label, ready: false, unavailable: null }
  }
  const needed = packsFor(language)
  const missing = needed.filter((id) => !packs[id] || packs[id].bytes === 0)
  if (missing.length > 0) {
    return {
      packs: needed,
      bytes: 0,
      packBytes: 0,
      label: support.label,
      ready: false,
      unavailable: `The ${missing.map((id) => PACK_LABELS[id]).join(' and ')} is not deployed with this build.`,
    }
  }
  if (!runner) {
    return {
      packs: needed,
      bytes: 0,
      packBytes: 0,
      label: support.label,
      ready: false,
      unavailable: 'The runner bundle is not deployed with this build.',
    }
  }
  const packBytes = needed.reduce((sum, id) => sum + (packs[id]?.bytes ?? 0), 0)
  const bytes = runner.bytes + packBytes
  const what = needed.length === 0 ? 'JavaScript runner' : needed.map((id) => PACK_LABELS[id]).join(' and ')
  return {
    packs: needed,
    bytes,
    packBytes,
    label: `Download ${what} · ${formatBytes(bytes)}, once`,
    ready: true,
    unavailable: null,
  }
}
