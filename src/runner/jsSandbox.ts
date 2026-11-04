/**
 * Phase v2-07 — JavaScript, the language the browser already has.
 *
 * No toolchain, no download beyond the runner bundle: the code is wrapped in a
 * function and called inside the worker, which has no DOM to damage. The two
 * things a beginner's program can do that would be antisocial are the two things
 * closed here: reaching the network, and leaving timers behind that keep running
 * after the program "finished".
 *
 * Blocking is layered on purpose — shadowing the names in the function scope
 * covers ordinary code, and the worker's fetch shim (which refuses every
 * non-runtime request while a program is running) covers `globalThis.fetch`.
 * Everything the program prints is handed to the caller's writers, so the worker
 * keeps one place where output is counted and capped.
 */

/** `console.log(1, 'a', {b: 2})` → one readable line, like a terminal. */
export function formatValue(value: unknown, seen = new Set<unknown>()): string {
  if (typeof value === 'string') return value
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`
  if (typeof value === 'symbol') return value.toString()
  if (value instanceof Error) return `${value.name}: ${value.message}`
  if (Array.isArray(value)) return `[ ${value.map((item) => formatValue(item, seen)).join(', ')} ]`
  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]'
    seen.add(value)
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 24)
      .map(([key, item]) => `${key}: ${formatValue(item, seen)}`)
    return `{ ${entries.join(', ')} }`
  }
  return String(value)
}

/** Names shadowed inside the sandbox, and the message a call produces. */
export const BLOCKED_GLOBALS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'SharedWorker',
  'Worker',
  'indexedDB',
  'caches',
  'localStorage',
  'sessionStorage',
  'setTimeout',
  'setInterval',
  'setImmediate',
] as const

export type SandboxWriters = {
  write: (chunk: string) => void
  writeError: (chunk: string) => void
}

export type SandboxOutcome = { exitCode: number; runMs: number }

/**
 * Run `code` with the browser's own engine. JavaScript does not read stdin here
 * — a browser has no blocking read to offer, and the panel says so rather than
 * pretending otherwise.
 */
export function runJavaScript(code: string, writers: SandboxWriters): SandboxOutcome {
  const started = Date.now()
  const log = (...args: unknown[]) => writers.write(`${args.map((value) => formatValue(value)).join(' ')}\n`)
  const logError = (...args: unknown[]) => writers.writeError(`${args.map((value) => formatValue(value)).join(' ')}\n`)
  const consoleShim = {
    log,
    info: log,
    debug: log,
    table: log,
    warn: logError,
    error: logError,
    trace: logError,
  }
  const blocked = BLOCKED_GLOBALS.map((name) => function unavailable(): never {
    throw new Error(`${name}() is not available inside the local runner.`)
  })

  try {
    // Learner code verbatim, no module semantics, so a snippet pasted from
    // LeetCode (top-level statements and functions) behaves as it reads.
    const factory = new Function(...BLOCKED_GLOBALS, 'console', `${code}\n`)
    factory(...blocked, consoleShim)
    return { exitCode: 0, runMs: Date.now() - started }
  } catch (error) {
    writers.writeError(`${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}\n`)
    return { exitCode: 1, runMs: Date.now() - started }
  }
}
