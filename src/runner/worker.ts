/// <reference lib="webworker" />
/**
 * Phase v2-07 — the sandbox that actually runs the code.
 *
 * One module worker, no DOM, no credentials, and a network that is switched off
 * the instant a program starts. Two toolchains live here, both fetched lazily
 * from our own origin and cached in `dsa-archive-runtime-v1`:
 *
 *   · C / C++ — `@live-codes/clang-wasm` (MIT): Clang 22, wasm-ld and a wasi
 *     sysroot, all on wasm, compiling and linking to a wasi module we run here.
 *   · Python  — Pyodide (MPL-2.0): CPython 3.13 on wasm, with stdin/stdout
 *     wired to the panel's fields.
 *   · JavaScript — the browser's own engine (`jsSandbox.ts`), no download.
 *
 * Runaway code is handled by the *client*, which terminates this worker: an
 * infinite loop cannot be interrupted from inside the thread it is spinning.
 * That is why the panel's Stop is instant and why the runtime is re-created on
 * the next run (its assets are already cached, so that costs seconds, not 29 MB).
 *
 * Nothing here ever sends learner code anywhere: the only outbound requests this
 * worker makes are `GET /runtime/…` for its own assets, and the fetch shim below
 * throws for everything else while a program is running.
 */
import { createCompiler, type ClangCompiler } from '@live-codes/clang-wasm'
import { runJavaScript } from './jsSandbox'
import { capOutput, OUTPUT_LIMIT } from './output'
import { RUNTIME_CACHE, type RunOutcome, type WarmRequest, type WorkerIn, type WorkerOut } from './protocol'
import type { PackId, RunLanguage } from './languages'

const scope = self as unknown as DedicatedWorkerGlobalScope
const originalFetch = scope.fetch.bind(scope)

/* --- progress + cache ------------------------------------------------------ */

let totalBytes = 0
let loadedBytes = 0
const countedFiles = new Set<string>()
let cachePromise: Promise<Cache> | null = null

function runtimeCache(): Promise<Cache> {
  if (!cachePromise) cachePromise = caches.open(RUNTIME_CACHE)
  return cachePromise
}

function post(message: WorkerOut) {
  scope.postMessage(message)
}

function accountBytes(pathname: string, bytes: number) {
  if (countedFiles.has(pathname)) return
  countedFiles.add(pathname)
  loadedBytes += bytes
  post({ type: 'progress', loaded: Math.min(loadedBytes, Math.max(totalBytes, loadedBytes)), total: Math.max(totalBytes, loadedBytes) })
}

/* --- the fetch shim -------------------------------------------------------- */

let networkLocked = false

/**
 * Cache-first for `/runtime/`, refused for everything else once a program runs.
 * The toolchains fetch their own assets through the global `fetch`, so this is
 * the single place where "the runner is offline-safe" and "learner code cannot
 * phone home" are both true.
 */
async function runtimeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const url = new URL(raw, scope.location.href)
  if (url.origin !== scope.location.origin || !url.pathname.startsWith('/runtime/')) {
    if (networkLocked) throw new Error('The local runner has no network access while a program is running.')
    return originalFetch(input as RequestInfo, init)
  }
  const cache = await runtimeCache()
  const hit = await cache.match(url.href)
  if (hit) return hit
  const response = await originalFetch(url.href)
  if (!response.ok) return response
  const bytes = new Uint8Array(await response.arrayBuffer())
  // We hand the toolchain the bytes we cached, so serving metadata that
  // described the *transfer* (encoding, length) would be a lie about them.
  const headers = new Headers(response.headers)
  headers.delete('content-encoding')
  headers.delete('content-length')
  const copy = new Response(bytes, { status: 200, statusText: 'OK', headers })
  await cache.put(url.href, copy.clone())
  accountBytes(url.pathname, bytes.byteLength)
  return copy
}

scope.fetch = runtimeFetch as typeof scope.fetch

/* --- C and C++ ------------------------------------------------------------- */

const compilers = new Map<RunLanguage, ClangCompiler>()
let siteBase = ''

function compilerFor(language: 'cpp' | 'c', baseUrl: string): Promise<ClangCompiler> {
  const existing = compilers.get(language)
  if (existing) return Promise.resolve(existing)
  return createCompiler(language, {
    baseUrl: new URL('/runtime/clang/', baseUrl),
    // `-std=c++17` in the phase contract; the toolchain only offers the `gnu++`
    // spellings, which are the same language plus the GNU extensions Clang's
    // default target already relies on. `-O0` keeps debugging output readable,
    // `-Wall -Wextra` keeps the warnings a beginner needs.
    std: language === 'cpp' ? 'gnu++17' : 'gnu17',
    compileArgs: ['-O0', '-Wall', '-Wextra'],
    onProgress: (fraction) => {
      // Byte-accurate progress comes from the shim; this only keeps the bar
      // moving while a single large asset is decompressing.
      if (totalBytes === 0) return
      post({ type: 'progress', loaded: Math.min(totalBytes, Math.round(totalBytes * fraction)), total: totalBytes })
    },
  }).then((compiler) => {
    compilers.set(language, compiler)
    return compiler
  })
}

/* --- Python ---------------------------------------------------------------- */

type PyodideLike = {
  runPythonAsync(code: string): Promise<unknown>
  setStdin(options: { stdin: () => string | null }): void
  setStdout(options: { batched: (text: string) => void }): void
  setStderr(options: { batched: (text: string) => void }): void
}

let pyodide: PyodideLike | null = null

async function pyodideFor(baseUrl: string): Promise<PyodideLike> {
  if (pyodide) return pyodide
  const indexURL = new URL('/runtime/pyodide/', baseUrl).href
  // Loaded as a URL, never bundled: the runtime is a learner-visible download,
  // not part of the app shell.
  const module = (await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`)) as {
    loadPyodide: (options: { indexURL: string }) => Promise<PyodideLike>
  }
  pyodide = await module.loadPyodide({ indexURL })
  return pyodide
}

/* --- running --------------------------------------------------------------- */

function emptyOutcome(): RunOutcome {
  return { stdout: '', stderr: '', exitCode: null, compileMs: null, runMs: null, diagnostics: [], truncated: false }
}

async function runClang(language: 'cpp' | 'c', code: string, stdin: string): Promise<RunOutcome> {
  const compiler = await compilerFor(language, siteBase)
  // `run` compiles, links and executes; the network is already off by now.
  const result = await compiler.run(code, stdin)
  const stdout = capOutput(result.stdout ?? '')
  const stderr = capOutput(result.stderr ?? '')
  return {
    stdout: stdout.text,
    stderr: stderr.text,
    exitCode: result.exitCode,
    compileMs: result.compileMs ?? null,
    runMs: result.runMs ?? null,
    diagnostics: (result.errors ?? []).slice(0, 20),
    truncated: stdout.truncated || stderr.truncated,
  }
}

async function runPython(code: string, stdin: string): Promise<RunOutcome> {
  const py = await pyodideFor(siteBase)
  const stdoutParts: string[] = []
  const stderrParts: string[] = []
  let pendingStdin = stdin
  py.setStdin({
    stdin: () => {
      if (pendingStdin === '') return null
      const newline = pendingStdin.indexOf('\n')
      const line = newline === -1 ? pendingStdin : pendingStdin.slice(0, newline)
      pendingStdin = newline === -1 ? '' : pendingStdin.slice(newline + 1)
      return line
    },
  })
  py.setStdout({ batched: (text) => stdoutParts.push(text) })
  py.setStderr({ batched: (text) => stderrParts.push(text) })
  const started = performance.now()
  try {
    await py.runPythonAsync(code)
  } catch (error) {
    // A Python traceback is the learner's own output, so it goes to stderr and
    // the exit code says 1 — not to `diagnostics`, which the panel renders as a
    // compiler error.
    const message = error instanceof Error ? error.message : String(error)
    return {
      ...emptyOutcome(),
      stdout: capOutput(stdoutParts.join('\n')).text,
      stderr: capOutput(`${stderrParts.join('\n')}${stderrParts.length > 0 ? '\n' : ''}${message}`).text,
      exitCode: 1,
      runMs: Math.round(performance.now() - started),
    }
  }
  const stdout = capOutput(stdoutParts.join('\n'))
  const stderr = capOutput(stderrParts.join('\n'))
  return {
    stdout: stdout.text,
    stderr: stderr.text,
    exitCode: 0,
    compileMs: null,
    runMs: Math.round(performance.now() - started),
    diagnostics: [],
    truncated: stdout.truncated || stderr.truncated,
  }
}

function runJs(code: string): RunOutcome {
  const chunks: string[] = []
  const errors: string[] = []
  const outcome = runJavaScript(code, {
    write: (chunk) => {
      if (chunks.join('').length < OUTPUT_LIMIT) chunks.push(chunk)
    },
    writeError: (chunk) => {
      if (errors.join('').length < OUTPUT_LIMIT) errors.push(chunk)
    },
  })
  const stdout = capOutput(chunks.join(''))
  const stderr = capOutput(errors.join(''))
  return {
    stdout: stdout.text,
    stderr: stderr.text,
    exitCode: outcome.exitCode,
    compileMs: null,
    runMs: outcome.runMs,
    diagnostics: [],
    truncated: stdout.truncated || stderr.truncated,
  }
}

async function warm(request: WarmRequest) {
  siteBase = request.baseUrl
  totalBytes = request.totalBytes
  loadedBytes = 0
  countedFiles.clear()
  for (const pack of request.packs as PackId[]) {
    if (pack === 'cpp') await compilerFor('cpp', siteBase)
    if (pack === 'python') await pyodideFor(siteBase)
  }
  post({ type: 'ready', packs: request.packs })
}

async function handleRun(request: Extract<WorkerIn, { type: 'run' }>) {
  const { id, language, code, stdin } = request
  // Everything a program can use to reach the outside world is removed for the
  // duration of the run, then restored: the toolchain is already loaded by now.
  const removed: [string, unknown][] = []
  for (const name of ['WebSocket', 'EventSource', 'importScripts', 'XMLHttpRequest']) {
    const holder = scope as unknown as Record<string, unknown>
    if (name in holder) {
      removed.push([name, holder[name]])
      delete holder[name]
    }
  }
  networkLocked = true
  try {
    let outcome: RunOutcome
    if (language === 'js') outcome = runJs(code)
    else if (language === 'python') outcome = await runPython(code, stdin)
    else outcome = await runClang(language, code, stdin)
    post({ type: 'result', id, ...outcome })
  } catch (error) {
    const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    const memory = /out of memory|RangeError|Cannot allocate|Array buffer allocation/i.test(text)
    post({
      type: 'failure',
      id,
      kind: memory ? 'memory' : 'runtime',
      message: memory
        ? 'This device ran out of memory for the compiler. Close a few tabs and try again, or run the code on Compiler Explorer.'
        : text,
      diagnostics: [],
    })
  } finally {
    networkLocked = false
    for (const [name, value] of removed) {
      ;(scope as unknown as Record<string, unknown>)[name] = value
    }
  }
}

scope.onmessage = (event: MessageEvent<WorkerIn>) => {
  const message = event.data
  if (message.type === 'warm') {
    void warm(message).catch((error: unknown) => {
      const text = error instanceof Error ? error.message : String(error)
      const offline = /failed to fetch|networkerror|load failed|err_internet_disconnected/i.test(text)
      post({
        type: 'failure',
        id: null,
        kind: 'runtime',
        message: offline
          ? 'The runtime is not on this device yet and the network is unavailable. Connect once, or copy the code into Compiler Explorer.'
          : text,
        diagnostics: [],
      })
    })
    return
  }
  void handleRun(message)
}
