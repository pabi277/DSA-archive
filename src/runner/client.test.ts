/**
 * The client owns the two things a page must never lose: the clock and the kill
 * switch. Both are tested here against a fake worker, so the suite proves the
 * message protocol, the timeout and Stop without needing a 29 MB compiler.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RunnerClient, RunnerError } from './client'
import { sanitisePacks } from './packs'
import type { WarmRequest, WorkerIn, WorkerOut } from './protocol'

const runner = { worker: 'runtime/runner/worker-4c2dd683fdb3.js', bytes: 1_276_000 }
const assets = {
  packs: sanitisePacks({
    packs: { cpp: { version: '0.3.0', files: [{ path: 'clang/bin/clang.wasm.gz', bytes: 15_700_000 }] } },
  }),
  runner,
}

class FakeWorker {
  static last: FakeWorker | null = null
  static mode: 'ok' | 'silent' | 'compile-error' | 'crash' = 'ok'
  onmessage: ((event: MessageEvent<WorkerOut>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  posted: WorkerIn[] = []
  terminated = false

  constructor(
    public url: string,
    public options?: WorkerOptions,
  ) {
    FakeWorker.last = this
  }

  postMessage(message: WorkerIn) {
    this.posted.push(message)
    if (message.type === 'warm') {
      queueMicrotask(() => this.emit({ type: 'progress', loaded: 8_000_000, total: 15_700_000 }))
      queueMicrotask(() => this.emit({ type: 'ready', packs: (message as WarmRequest).packs }))
      return
    }
    if (FakeWorker.mode === 'silent') return
    if (FakeWorker.mode === 'crash') {
      queueMicrotask(() => this.onerror?.({ message: 'wasm boom' } as ErrorEvent))
      return
    }
    queueMicrotask(() =>
      this.emit({
        type: 'result',
        id: message.id,
        stdout: FakeWorker.mode === 'compile-error' ? '' : '0 1\n',
        stderr: '',
        exitCode: FakeWorker.mode === 'compile-error' ? null : 0,
        compileMs: 1_180,
        runMs: 41,
        diagnostics: FakeWorker.mode === 'compile-error' ? ['main.cpp:2:1: error: nope'] : [],
        truncated: false,
      }),
    )
  }

  emit(data: WorkerOut) {
    this.onmessage?.({ data } as MessageEvent<WorkerOut>)
  }

  terminate() {
    this.terminated = true
  }
}

const originalWorker = globalThis.Worker

beforeEach(() => {
  FakeWorker.mode = 'ok'
  FakeWorker.last = null
  ;(globalThis as { Worker: unknown }).Worker = FakeWorker
})

afterEach(() => {
  ;(globalThis as { Worker: unknown }).Worker = originalWorker
  vi.useRealTimers()
})

function client() {
  return new RunnerClient(assets, { coldAllowanceMs: 200, warmAllowanceMs: 50 })
}

describe('spawning and warming', () => {
  it('spawns one worker, in the runtime bucket, as a module', async () => {
    const runnerClient = client()
    await runnerClient.run({ runAs: 'cpp', packs: ['cpp'], totalBytes: 15_700_000, code: 'int main(){}' })
    expect(FakeWorker.last?.url).toBe('http://localhost:3000/runtime/runner/worker-4c2dd683fdb3.js')
    expect(FakeWorker.last?.options?.type).toBe('module')
  })

  it('warms once and reuses the runtime for the next run', async () => {
    const runnerClient = client()
    await runnerClient.run({ runAs: 'cpp', packs: ['cpp'], totalBytes: 15_700_000, code: 'a' })
    await runnerClient.run({ runAs: 'cpp', packs: ['cpp'], totalBytes: 15_700_000, code: 'b' })
    const warmMessages = FakeWorker.last?.posted.filter((message) => message.type === 'warm') ?? []
    expect(warmMessages).toHaveLength(1)
  })

  it('relays byte progress so the bar can be honest', async () => {
    const runnerClient = client()
    const seen: number[] = []
    await runnerClient.run({
      runAs: 'cpp',
      packs: ['cpp'],
      totalBytes: 15_700_000,
      code: 'a',
      onProgress: (loaded) => seen.push(loaded),
    })
    expect(seen).toContain(8_000_000)
  })

  it('refuses to run when the deploy shipped no runner at all', async () => {
    const runnerClient = new RunnerClient({ packs: assets.packs, runner: null })
    await expect(
      runnerClient.run({ runAs: 'cpp', packs: ['cpp'], totalBytes: 1, code: 'a' }),
    ).rejects.toMatchObject({ kind: 'unavailable' })
  })
})

describe('the kill switch', () => {
  it('stops a program that never answers, and terminates the worker', async () => {
    FakeWorker.mode = 'silent'
    const runnerClient = client()
    const error = await runnerClient
      .run({ runAs: 'cpp', packs: ['cpp'], totalBytes: 1, code: 'while(true){}', timeoutMs: 10 })
      .catch((thrown: unknown) => thrown)
    expect(error).toBeInstanceOf(RunnerError)
    expect((error as RunnerError).kind).toBe('timeout')
    expect(FakeWorker.last?.terminated).toBe(true)
    expect(runnerClient.isWarm).toBe(false)
  })

  it('rejects an in-flight run when the learner presses Stop', async () => {
    FakeWorker.mode = 'silent'
    const runnerClient = client()
    const pending = runnerClient.run({ runAs: 'js', packs: [], totalBytes: 0, code: 'x', timeoutMs: 5_000 })
    await new Promise((resolve) => setTimeout(resolve, 10))
    runnerClient.stop()
    await expect(pending).rejects.toMatchObject({ kind: 'stopped' })
  })

  it('surfaces a worker crash as one readable error, not a hang', async () => {
    FakeWorker.mode = 'crash'
    const runnerClient = client()
    await expect(
      runnerClient.run({ runAs: 'js', packs: [], totalBytes: 0, code: 'x' }),
    ).rejects.toMatchObject({ kind: 'internal' })
  })
})

describe('results', () => {
  it('passes stdout, timings and exit code straight through', async () => {
    const runnerClient = client()
    const outcome = await runnerClient.run({ runAs: 'cpp', packs: ['cpp'], totalBytes: 1, code: 'a' })
    expect(outcome).toMatchObject({ stdout: '0 1\n', exitCode: 0, compileMs: 1_180, runMs: 41 })
  })

  it('keeps compiler diagnostics available for the panel', async () => {
    FakeWorker.mode = 'compile-error'
    const runnerClient = client()
    const outcome = await runnerClient.run({ runAs: 'cpp', packs: ['cpp'], totalBytes: 1, code: 'bad' })
    expect(outcome.exitCode).toBeNull()
    expect(outcome.diagnostics).toEqual(['main.cpp:2:1: error: nope'])
  })
})
