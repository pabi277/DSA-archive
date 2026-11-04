/**
 * Phase v2-07 — run the authored test cases, and say exactly where the first
 * difference is.
 *
 * The authored `{ input, expected }` pairs were shipped in phase 03
 * (`data/content/problems/*.json`, served by `getTests`). This module is the
 * sequencer: it feeds them one at a time to whatever executor it is given, so
 * the same code drives the real worker, a unit test and the panel's error path.
 *
 * Comparison is deliberately forgiving about layout and strict about values:
 * trailing spaces, trailing blank lines and CRLF are ignored, everything else —
 * including a different order — is a difference worth showing.
 */

/** A single case is allowed three seconds of *program* time (compile excluded). */
export const CASE_TIMEOUT_MS = 3_000

/** The whole list shares one 30 s budget so a bad loop cannot hold the tab. */
export const TOTAL_BUDGET_MS = 30_000

/** At most this many lines of diff, per the phase contract. */
export const DIFF_MAX_LINES = 10

export type CaseSpec = { input: string; expected: string; note?: string }

export type ProgramRun = {
  stdout: string
  stderr: string
  exitCode: number | null
  diagnostics: string[]
}

export type CaseExecutor = (input: string, options: { timeoutMs: number }) => Promise<ProgramRun>

export type CaseStatus = 'passed' | 'failed' | 'error' | 'timeout' | 'skipped'

export type CaseResult = {
  /** 1-based, because the UI says "case 3". */
  index: number
  status: CaseStatus
  expected: string
  actual: string
  /** stderr, compile diagnostics, or why the case was skipped. */
  detail: string
  diff: string[]
}

export type CaseRunSummary = {
  results: CaseResult[]
  passed: number
  total: number
  text: string
  tone: 'success' | 'caution'
}

/**
 * Canonical form for comparison: CRLF → LF, trailing whitespace per line
 * removed, leading/trailing blank lines dropped. A program that prints the right
 * values with a stray trailing space has not failed the learner's logic.
 */
export function normaliseOutput(text: string): string {
  return text
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')
}

export function outputsMatch(expected: string, actual: string): boolean {
  return normaliseOutput(expected) === normaliseOutput(actual)
}

/**
 * The first line that differs, with one line of context on each side — never
 * more than `DIFF_MAX_LINES`, because a diff is a pointer, not a transcription.
 */
export function firstDifference(expected: string, actual: string, maxLines = DIFF_MAX_LINES): string[] {
  const expectedLines = normaliseOutput(expected).split('\n')
  const actualLines = normaliseOutput(actual).split('\n')
  let at = 0
  while (at < expectedLines.length && at < actualLines.length && expectedLines[at] === actualLines[at]) at += 1
  const context = Math.max(0, Math.floor((maxLines - 2) / 3))
  const from = Math.max(0, at - context)
  const lines: string[] = []
  if (from > 0) lines.push(`… ${from} line${from === 1 ? '' : 's'} identical`)
  for (let index = from; index < at; index += 1) lines.push(`  ${expectedLines[index] ?? ''}`)
  lines.push(`- expected: ${at < expectedLines.length ? expectedLines[at] : '(no more lines)'}`)
  lines.push(`+ actual:   ${at < actualLines.length ? actualLines[at] : '(no more lines)'}`)
  if (at + 1 <= Math.min(expectedLines.length, actualLines.length) - 1 && lines.length < maxLines - 1) {
    lines.push(`  line ${at + 2} onwards may differ too`)
  }
  return lines.slice(0, maxLines)
}

export type RunCasesOptions = {
  perCaseTimeoutMs?: number
  totalBudgetMs?: number
  /** Injected clock so the budget logic is testable without waiting. */
  now?: () => number
}

/**
 * Execute every case in order. Three exits that are not "failed": a timeout, a
 * compile error (the remaining cases would only repeat the same diagnostics) and
 * an exhausted total budget — each is labelled, never silently skipped.
 */
export async function runCases(
  cases: readonly CaseSpec[],
  execute: CaseExecutor,
  options: RunCasesOptions = {},
): Promise<CaseRunSummary> {
  const perCaseTimeoutMs = options.perCaseTimeoutMs ?? CASE_TIMEOUT_MS
  const totalBudgetMs = options.totalBudgetMs ?? TOTAL_BUDGET_MS
  const now = options.now ?? (() => Date.now())
  const started = now()
  const results: CaseResult[] = []
  let compileFailed = false
  let budgetSpent = false

  for (let index = 0; index < cases.length; index += 1) {
    const spec = cases[index]
    const base = { index: index + 1, expected: spec.expected }
    if (compileFailed) {
      results.push({ ...base, status: 'skipped', actual: '', detail: 'The code did not compile — the other cases were not run.', diff: [] })
      continue
    }
    if (budgetSpent || now() - started >= totalBudgetMs) {
      budgetSpent = true
      results.push({ ...base, status: 'skipped', actual: '', detail: 'The 30 s test budget ran out before this case.', diff: [] })
      continue
    }
    try {
      const run = await execute(spec.input, { timeoutMs: perCaseTimeoutMs })
      const actual = run.stdout
      if (run.diagnostics.length > 0 && run.exitCode === null) {
        compileFailed = true
        results.push({
          ...base,
          status: 'error',
          actual: '',
          detail: run.diagnostics.slice(0, 6).join('\n'),
          diff: [],
        })
        continue
      }
      const passed = run.exitCode === 0 && outputsMatch(spec.expected, actual)
      results.push({
        ...base,
        status: passed ? 'passed' : 'failed',
        actual,
        detail: run.exitCode === 0 ? '' : `exit ${run.exitCode}\n${run.stderr}`.trim(),
        diff: passed ? [] : firstDifference(spec.expected, actual),
      })
    } catch (error) {
      const kind = typeof error === 'object' && error !== null ? (error as { kind?: string }).kind : undefined
      if (kind === 'timeout') {
        results.push({
          ...base,
          status: 'timeout',
          actual: '',
          detail: `Stopped after ${(perCaseTimeoutMs / 1000).toFixed(0)} s — the program was still running.`,
          diff: [],
        })
        continue
      }
      results.push({
        ...base,
        status: 'error',
        actual: '',
        detail: error instanceof Error ? error.message : String(error),
        diff: [],
      })
    }
  }

  const passed = results.filter((result) => result.status === 'passed').length
  return { results, passed, total: cases.length, ...summarise(results, passed, cases.length) }
}

function summarise(results: CaseResult[], passed: number, total: number): Pick<CaseRunSummary, 'text' | 'tone'> {
  if (total === 0) return { text: 'No test cases for this problem yet', tone: 'caution' }
  if (passed === total) return { text: `✓ ${passed}/${total} passed`, tone: 'success' }
  const firstBad = results.find((result) => result.status !== 'passed')
  const label = firstBad ? `case ${firstBad.index} ${statusWord(firstBad.status)}` : 'something differs'
  return { text: `✗ ${passed}/${total} — ${label}`, tone: 'caution' }
}

function statusWord(status: CaseStatus): string {
  if (status === 'timeout') return 'timed out'
  if (status === 'error') return 'did not run'
  if (status === 'skipped') return 'was skipped'
  return 'differs'
}
