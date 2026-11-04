/**
 * Phase v2-07 — the main thread's handle on the sandbox worker.
 *
 * Small on purpose: it spawns one worker, forwards run requests, relays byte
 * progress, and owns the two things a page must never lose control of —
 * the clock and the kill switch. A program that loops forever is stopped by
 * `terminate()`, which is instant and takes the stuck wasm instance with it; the
 * next run respawns the worker and re-reads its assets from Cache Storage.
 */
import type { PackId, RunLanguage } from './languages'
import type { RunnerBundle, RuntimePacks } from './packs'
import type { RunOutcome, WorkerIn, WorkerOut } from './protocol'
import { workerUrl } from './runtimeStore'

export type RunnerErrorKind =
  | 'timeout'
  | 'stopped'
  | 'unsupported'
  | 'unavailable'
  | 'compile'
  | 'runtime'
  | 'memory'
  | 'internal'

export class RunnerError extends Error {
  readonly kind: RunnerErrorKind
  readonly diagnostics: string[]

  constructor(kind: RunnerErrorKind, message: string, diagnostics: string[] = []) {
    super(message)
    this.name = 'RunnerError'
    this.kind = kind
    this.diagnostics = diagnostics
  }
}

/**
 * A cold C++ compile is seconds of work on a phone, so the first run of a
 * language gets a generous ceiling; once a compile has succeeded the ceiling
 * drops to the program's own budget. Without this split the phase's "3 s per
 * case" would time out the very first case on a mid-range phone.
 */
export const COLD_COMPILE_ALLOWANCE_MS = 45_000
export const WARM_COMPILE_ALLOWANCE_MS = 4_000

export type WarmOptions = {
  packs: PackId[]
  totalBytes: number
  files?: string[]
}

export type RunOptions = {
  runAs: RunLanguage
  packs: PackId[]
  totalBytes: number
  code: string
  stdin?: string
  /** The program's own budget, compile time excluded. */
  timeoutMs?: number
  onProgress?: (loaded: number, total: number) => void
}

type PendingRun = {
  id: number
  resolve: (outcome: RunOutcome) => void
  reject: (error: RunnerError) => void
  timer: ReturnType<typeof setTimeout> | null
}

export class RunnerClient {
  private worker: Worker | null = null
  private nextId = 1
  private pendingRun: PendingRun | null = null
  private pendingWarm: {
    resolve: () => void
    reject: (error: RunnerError) => void
    packs: PackId[]
    timer: ReturnType<typeof setTimeout> | null
  } | null = null
  private readyFor = new Set<string>()
  private warmPromise: Promise<void> | null = null
  private compileAllowanceMs
  private progress: ((loaded: number, total: number) => void) | null = null

  private readonly now: () => number
  private readonly coldAllowanceMs: number
  private readonly warmAllowanceMs: number

  constructor(
    private readonly assets: { packs: RuntimePacks; runner: RunnerBundle | null },
    timing: { now?: () => number; coldAllowanceMs?: number; warmAllowanceMs?: number } = {},
  ) {
    this.now = timing.now ?? (() => Date.now())
    this.coldAllowanceMs = timing.coldAllowanceMs ?? COLD_COMPILE_ALLOWANCE_MS
    this.warmAllowanceMs = timing.warmAllowanceMs ?? WARM_COMPILE_ALLOWANCE_MS
    this.compileAllowanceMs = this.coldAllowanceMs
  }

  get isWarm(): boolean {
    return this.readyFor.size > 0
  }

  private handle = (message: WorkerOut) => {
    if (message.type === 'progress') {
      this.progress?.(message.loaded, message.total)
      return
    }
    if (message.type === 'ready') {
      const warm = this.pendingWarm
      this.pendingWarm = null
      if (warm?.timer) clearTimeout(warm.timer)
      for (const pack of warm?.packs ?? []) this.readyFor.add(pack)
      warm?.resolve()
      return
    }
    if (message.type === 'result') {
      const pending = this.pendingRun
      if (!pending || pending.id !== message.id) return
      this.finishRun(pending)
      this.compileAllowanceMs = this.warmAllowanceMs
      const { stdout, stderr, exitCode, compileMs, runMs, diagnostics, truncated } = message
      pending.resolve({ stdout, stderr, exitCode, compileMs, runMs, diagnostics, truncated })
      return
    }
    // failure
    if (message.id === null) {
      const warm = this.pendingWarm
      this.pendingWarm = null
      if (warm?.timer) clearTimeout(warm.timer)
      warm?.reject(new RunnerError(message.kind === 'memory' ? 'memory' : 'runtime', message.message, message.diagnostics))
      return
    }
    const pending = this.pendingRun
    if (!pending || pending.id !== message.id) return
    this.finishRun(pending)
    pending.reject(new RunnerError(message.kind, message.message, message.diagnostics))
  }

  private finishRun(pending: PendingRun) {
    if (pending.timer) clearTimeout(pending.timer)
    this.pendingRun = null
  }

  private spawn(): Worker {
    if (this.worker) return this.worker
    if (!this.assets.runner) {
      throw new RunnerError('unavailable', 'This build does not ship the local runner.')
    }
    let worker: Worker
    try {
      worker = new Worker(workerUrl(this.assets.runner), { type: 'module', name: 'dsa-archive-runner' })
    } catch (error) {
      throw new RunnerError(
        'unavailable',
        `The runner could not start: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
    worker.onmessage = (event: MessageEvent<WorkerOut>) => this.handle(event.data)
    worker.onerror = (event: ErrorEvent) => {
      this.fail(new RunnerError('internal', event.message || 'The runner stopped unexpectedly.'))
    }
    this.worker = worker
    return worker
  }

  /** Reject whatever is in flight — used by Stop, by a crash and by unload. */
  private fail(error: RunnerError) {
    const run = this.pendingRun
    this.pendingRun = null
    if (run) {
      if (run.timer) clearTimeout(run.timer)
      run.reject(error)
    }
    const warm = this.pendingWarm
    this.pendingWarm = null
    if (warm) {
      if (warm.timer) clearTimeout(warm.timer)
      warm.reject(error)
    }
    this.readyFor.clear()
  }

  private post(message: WorkerIn) {
    const worker = this.spawn()
    worker.postMessage(message)
  }

  /** Download + initialise a language's runtime, reporting byte progress. */
  async warm(options: WarmOptions, onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const needed = options.packs.filter((pack) => !this.readyFor.has(pack))
    if (needed.length === 0) return
    // One warm at a time: a second Run press during the download joins the
    // first one instead of starting a second copy of the same 29 MB.
    if (this.warmPromise) {
      await this.warmPromise
      return
    }
    this.progress = onProgress ?? null
    this.warmPromise = this.startWarm(needed, options)
    try {
      await this.warmPromise
    } finally {
      this.warmPromise = null
    }
  }

  private startWarm(needed: PackId[], options: WarmOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingWarm = null
        this.stop()
        reject(new RunnerError('timeout', 'The runtime download took too long and was stopped.'))
      }, COLD_COMPILE_ALLOWANCE_MS * 4)
      this.pendingWarm = { resolve, reject, packs: needed, timer }
      try {
        this.post({
          type: 'warm',
          baseUrl: `${window.location.origin}/`,
          packs: needed,
          totalBytes: options.totalBytes,
          files: options.files ?? [],
        })
      } catch (error) {
        clearTimeout(timer)
        this.pendingWarm = null
        reject(error instanceof RunnerError ? error : new RunnerError('unavailable', String(error)))
      }
    })
  }

  /**
   * Run once. `timeoutMs` is the program's budget; the compile allowance is
   * added on top for the first compile of a language on this device.
   */
  async run(options: RunOptions): Promise<RunOutcome> {
    const timeoutMs = (options.timeoutMs ?? 3_000) + this.compileAllowanceMs
    const id = this.nextId++
    await this.warm(
      { packs: options.packs, totalBytes: options.totalBytes, files: [] },
      options.onProgress,
    )
    if (this.pendingRun) {
      this.stop()
    }
    return new Promise<RunOutcome>((resolve, reject) => {
      const started = this.now()
      const timer =
        timeoutMs > 0
          ? setTimeout(() => {
              // Kill first, then reject with the reason the learner pressed
              // Stop for: a timeout must never be reported as "Stopped."
              this.pendingRun = null
              this.killWorker()
              reject(
                new RunnerError(
                  'timeout',
                  `Stopped after ${Math.round((this.now() - started) / 1000)} s — the program was still running.`,
                ),
              )
            }, timeoutMs)
          : null
      this.pendingRun = { id, resolve, reject, timer }
      try {
        this.post({ type: 'run', id, language: options.runAs, code: options.code, stdin: options.stdin ?? '' })
      } catch (error) {
        this.finishRun(this.pendingRun!)
        reject(error instanceof RunnerError ? error : new RunnerError('internal', String(error)))
      }
    })
  }

  /** Terminate the thread, keep the pending promise for the caller to settle. */
  private killWorker() {
    if (this.worker) {
      this.worker.onmessage = null
      this.worker.onerror = null
      this.worker.terminate()
      this.worker = null
    }
    this.readyFor.clear()
    this.compileAllowanceMs = this.warmAllowanceMs
  }

  /** Kill the worker: the only reliable way to stop wasm that will not yield. */
  stop() {
    this.killWorker()
    this.fail(new RunnerError('stopped', 'Stopped.'))
  }

  dispose() {
    this.stop()
    this.progress = null
  }
}
