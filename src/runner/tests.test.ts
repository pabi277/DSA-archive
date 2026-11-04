import { describe, expect, it, vi } from 'vitest'
import {
  CASE_TIMEOUT_MS,
  DIFF_MAX_LINES,
  TOTAL_BUDGET_MS,
  firstDifference,
  normaliseOutput,
  outputsMatch,
  runCases,
  type CaseExecutor,
} from './tests'

const cases = [
  { input: '5\n-8 -3 -11 -2 -7\n', expected: '-2', note: 'all negative' },
  { input: '4\n3 12 6 12\n', expected: '12', note: 'repeated maximum' },
  { input: '2\n0 -1\n', expected: '0', note: 'short row' },
]

describe('comparing program output', () => {
  it('ignores layout that cannot change an answer', () => {
    expect(normaliseOutput('0 1\r\n\r\n')).toBe('0 1')
    expect(outputsMatch('0 1\n', '0 1   ')).toBe(true)
    expect(outputsMatch('0 1', '\n0 1\n')).toBe(true)
  })

  it('still refuses a different order or a different value', () => {
    expect(outputsMatch('0 1', '1 0')).toBe(false)
    expect(outputsMatch('0 1', '1')).toBe(false)
  })

  it('points at the first line that differs, with nothing else', () => {
    const diff = firstDifference('-2', '-3')
    expect(diff[0]).toBe('- expected: -2')
    expect(diff[1]).toBe('+ actual:   -3')
  })

  it('says when the program printed too little, and keeps the diff short', () => {
    const expected = Array.from({ length: 40 }, (_, index) => `line ${index}`).join('\n')
    const actual = Array.from({ length: 3 }, (_, index) => `line ${index}`).join('\n')
    const diff = firstDifference(expected, actual)
    expect(diff).toContain('- expected: line 3')
    expect(diff).toContain('+ actual:   (no more lines)')
    expect(diff.length).toBeLessThanOrEqual(DIFF_MAX_LINES)
  })
})

describe('running the authored cases', () => {
  it('walks the list in order and reports 3/3', async () => {
    const seen: string[] = []
    const execute: CaseExecutor = async (input) => {
      seen.push(input)
      return { stdout: input === '5\n-8 -3 -11 -2 -7\n' ? '-2' : input === '4\n3 12 6 12\n' ? '12' : '0', stderr: '', exitCode: 0, diagnostics: [] }
    }
    const summary = await runCases(cases, execute)
    expect(seen).toEqual(cases.map((entry) => entry.input))
    expect(summary.passed).toBe(3)
    expect(summary.text).toBe('✓ 3/3 passed')
    expect(summary.tone).toBe('success')
  })

  it('names the first failing case and shows its diff', async () => {
    const execute: CaseExecutor = async (input) => ({
      stdout: input === '5\n-8 -3 -11 -2 -7\n' ? '-2' : input === '4\n3 12 6 12\n' ? '12' : '-1',
      stderr: '',
      exitCode: 0,
      diagnostics: [],
    })
    const summary = await runCases(cases, execute)
    expect(summary.text).toBe('✗ 2/3 — case 3 differs')
    expect(summary.results[2].diff).toContain('- expected: 0')
    expect(summary.results[2].diff).toContain('+ actual:   -1')
  })

  it('stops after a compile error instead of recompiling for every case', async () => {
    const execute = vi.fn<CaseExecutor>(async () => ({
      stdout: '',
      stderr: '',
      exitCode: null,
      diagnostics: ['main.cpp:2:17: error: cannot initialize an int'],
    }))
    const summary = await runCases(cases, execute)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(summary.results[0].status).toBe('error')
    expect(summary.results[1].status).toBe('skipped')
    expect(summary.results[1].detail).toContain('did not compile')
    expect(summary.text).toBe('✗ 0/3 — case 1 did not run')
  })

  it('labels a timeout as a timeout, not as a wrong answer', async () => {
    const execute: CaseExecutor = async () => {
      throw Object.assign(new Error('Stopped after 3 s'), { kind: 'timeout' })
    }
    const summary = await runCases(cases.slice(0, 1), execute)
    expect(summary.results[0].status).toBe('timeout')
    expect(summary.results[0].detail).toContain('still running')
    expect(summary.text).toBe('✗ 0/1 — case 1 timed out')
  })

  it('enforces the 30 s total budget and skips what it cannot afford', async () => {
    let clock = 0
    const execute: CaseExecutor = async () => {
      clock += TOTAL_BUDGET_MS
      return { stdout: 'x', stderr: '', exitCode: 0, diagnostics: [] }
    }
    const summary = await runCases(cases, execute, { now: () => clock })
    expect(summary.results[0].status).toBe('failed')
    expect(summary.results[1].status).toBe('skipped')
    expect(summary.results[1].detail).toContain('30 s test budget')
  })

  it('passes the per-case clock through to the executor', async () => {
    const seen: number[] = []
    await runCases(cases.slice(0, 1), async (_input, options) => {
      seen.push(options.timeoutMs)
      return { stdout: '-2', stderr: '', exitCode: 0, diagnostics: [] }
    })
    expect(seen).toEqual([CASE_TIMEOUT_MS])
  })

  it('has a designed state for a problem with no cases yet', async () => {
    const summary = await runCases([], async () => ({ stdout: '', stderr: '', exitCode: 0, diagnostics: [] }))
    expect(summary.text).toBe('No test cases for this problem yet')
    expect(summary.tone).toBe('caution')
  })

  it('surfaces a non-zero exit as a failure with stderr attached', async () => {
    const summary = await runCases(cases.slice(0, 1), async () => ({
      stdout: '-2',
      stderr: 'Segmentation fault',
      exitCode: 139,
      diagnostics: [],
    }))
    expect(summary.results[0].status).toBe('failed')
    expect(summary.results[0].detail).toContain('exit 139')
  })
})
