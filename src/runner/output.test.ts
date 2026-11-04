import { describe, expect, it } from 'vitest'
import { OUTPUT_LIMIT, capOutput, formatDuration, runLine, runTone } from './output'

describe('output capping', () => {
  it('leaves ordinary output untouched', () => {
    expect(capOutput('hello\n')).toEqual({ text: 'hello\n', truncated: false })
  })

  it('cuts a runaway printf at the cap and says so inside the cap', () => {
    const capped = capOutput('x'.repeat(OUTPUT_LIMIT + 5_000), 1_000)
    expect(capped.truncated).toBe(true)
    expect(capped.text.length).toBeLessThanOrEqual(1_000)
    expect(capped.text).toContain('output cut at 1,000 characters')
  })

  it('never grows a text that is exactly at the limit', () => {
    const exact = 'y'.repeat(OUTPUT_LIMIT)
    expect(capOutput(exact).truncated).toBe(false)
    expect(capOutput(exact).text).toHaveLength(OUTPUT_LIMIT)
  })
})

describe('the run line', () => {
  it('reads like a terminal, in the units a beginner can tell apart', () => {
    expect(formatDuration(41)).toBe('41 ms')
    expect(formatDuration(1_180)).toBe('1.18 s')
    expect(formatDuration(null)).toBe('—')
    expect(runLine({ compileMs: 1_180, runMs: 41, exitCode: 0 })).toBe('Compiled in 1.18 s · ran in 41 ms · exit 0')
  })

  it('omits what did not happen (a compiled failure has no run time)', () => {
    expect(runLine({ compileMs: 32, runMs: null, exitCode: null })).toBe('Compiled in 32 ms')
  })

  it('treats a non-zero exit as a result to look at, not a crash', () => {
    expect(runTone({ compileMs: 30, runMs: 4, exitCode: 0 })).toBe('success')
    expect(runTone({ compileMs: 30, runMs: 4, exitCode: 2 })).toBe('caution')
  })
})
