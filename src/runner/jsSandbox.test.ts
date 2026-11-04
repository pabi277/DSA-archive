import { describe, expect, it } from 'vitest'
import { formatValue, runJavaScript, type SandboxWriters } from './jsSandbox'

function collect() {
  const stdout: string[] = []
  const stderr: string[] = []
  const writers: SandboxWriters = {
    write: (chunk) => stdout.push(chunk),
    writeError: (chunk) => stderr.push(chunk),
  }
  return { writers, stdout, stderr, out: () => stdout.join(''), err: () => stderr.join('') }
}

describe('formatting values like a terminal', () => {
  it('prints strings bare and structures readably', () => {
    expect(formatValue('hi')).toBe('hi')
    expect(formatValue(42)).toBe('42')
    expect(formatValue(null)).toBe('null')
    expect(formatValue([1, 'a'])).toBe('[ 1, a ]')
    expect(formatValue({ a: 1, b: [2] })).toBe('{ a: 1, b: [ 2 ] }')
    expect(formatValue(undefined)).toBe('undefined')
  })

  it('survives a cycle instead of hanging the tab', () => {
    const loop: Record<string, unknown> = { name: 'loop' }
    loop.self = loop
    expect(formatValue(loop)).toBe('{ name: loop, self: [Circular] }')
  })
})

describe('running JavaScript in the sandbox', () => {
  it('runs a program and collects what it prints', () => {
    const { writers, out, err } = collect()
    const outcome = runJavaScript('const n = 3;\nfor (let i = 0; i < n; i += 1) console.log(i);', writers)
    expect(outcome.exitCode).toBe(0)
    expect(out()).toBe('0\n1\n2\n')
    expect(err()).toBe('')
  })

  it('sends warn and error to stderr, like a terminal', () => {
    const { writers, out, err } = collect()
    runJavaScript("console.log('ok'); console.error('bad');", writers)
    expect(out()).toBe('ok\n')
    expect(err()).toBe('bad\n')
  })

  it('reports a thrown error as exit 1 with the message a student can read', () => {
    const { writers, err } = collect()
    const outcome = runJavaScript("throw new Error('nope');", writers)
    expect(outcome.exitCode).toBe(1)
    expect(err()).toContain('Error: nope')
  })

  it('closes the network: fetch and friends throw inside the sandbox', () => {
    const { writers, err } = collect()
    const outcome = runJavaScript("fetch('https://example.com');", writers)
    expect(outcome.exitCode).toBe(1)
    expect(err()).toContain('fetch() is not available inside the local runner')
  })

  it('closes timers, so a program cannot keep spinning after it finishes', () => {
    const { writers, err } = collect()
    const outcome = runJavaScript('setInterval(() => console.log(1), 10);', writers)
    expect(outcome.exitCode).toBe(1)
    expect(err()).toContain('setInterval() is not available')
  })

  it('runs top-level statements the way LeetCode snippets read', () => {
    const { writers, out } = collect()
    runJavaScript('function twice(n) { return n * 2; }\nconsole.log(twice(21));', writers)
    expect(out()).toBe('42\n')
  })
})
