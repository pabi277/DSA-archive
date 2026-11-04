/**
 * Phase v2-07 — the message contract between the run panel and its worker.
 *
 * The worker is the only place learner code is ever evaluated. It holds no DOM,
 * gets no credentials, and its network access is shut the moment a program
 * starts (see `worker.ts`). Keeping the protocol in one small module means the
 * panel, the worker and the unit tests cannot drift apart.
 */
import type { PackId, RunLanguage } from './languages'

/** One Cache Storage bucket for every runtime asset: the worker, C++, Python. */
export const RUNTIME_CACHE = 'dsa-archive-runtime-v1'

/** Where the runtime tree lives, relative to the site root. */
export const RUNTIME_ROOT = 'runtime/'

/** Compiler packs are addressable by the same id the UI speaks. */
export type WarmRequest = {
  type: 'warm'
  /** Absolute site origin, so a blob-URL worker still resolves assets. */
  baseUrl: string
  packs: PackId[]
  /** Total bytes of everything that can arrive — the progress denominator. */
  totalBytes: number
  /** Manifest paths, relative to the site root, used only for progress labels. */
  files: string[]
}

export type RunRequest = {
  type: 'run'
  id: number
  language: RunLanguage
  code: string
  stdin: string
}

export type WorkerIn = WarmRequest | RunRequest

export type RunOutcome = {
  stdout: string
  stderr: string
  exitCode: number | null
  compileMs: number | null
  runMs: number | null
  /** Compiler diagnostics, one per line. Empty unless the compile failed. */
  diagnostics: string[]
  /** True when either stream hit the output cap. */
  truncated: boolean
}

export type WorkerOut =
  | { type: 'ready'; packs: PackId[] }
  | { type: 'progress'; loaded: number; total: number }
  | ({ type: 'result'; id: number } & RunOutcome)
  | {
      type: 'failure'
      id: number | null
      kind: 'compile' | 'runtime' | 'unsupported' | 'memory' | 'internal'
      message: string
      diagnostics: string[]
    }
