/**
 * Phase v2-07 — the pure half of the run panel.
 *
 * `output.ts` owns the two things a runaway program breaks first: how much text
 * we are willing to show, and how the run line above it reads. Nothing here
 * touches a Worker, a DOM or the network, so all of it is unit-tested.
 */

/** Per-stream ceiling handed to the worker and enforced again on the way back. */
export const OUTPUT_LIMIT = 256_000

export type CappedText = { text: string; truncated: boolean }

/**
 * Cut a stream at `limit` bytes of *characters* (the cap is a UI promise, not a
 * security boundary — the worker also stops recording at the same number).
 * The marker is appended inside the cap so the visible text can never exceed it.
 */
export function capOutput(text: string, limit = OUTPUT_LIMIT): CappedText {
  if (text.length <= limit) return { text, truncated: false }
  const marker = `\n[output cut at ${limit.toLocaleString('en-US')} characters]`
  return { text: text.slice(0, Math.max(0, limit - marker.length)) + marker, truncated: true }
}

/** `1.18 s` / `41 ms` — the two units a beginner can tell apart at a glance. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

export type RunFacts = {
  compileMs: number | null
  runMs: number | null
  exitCode: number | null
}

/**
 * `Compiled in 1.18 s · ran in 41 ms · exit 0`.
 *
 * A non-zero exit is a *result*, not an error: the program ran and told us why
 * it stopped. The panel therefore prints it here and keeps stderr for stderr.
 */
export function runLine(facts: RunFacts): string {
  const parts: string[] = []
  if (facts.compileMs !== null) parts.push(`Compiled in ${formatDuration(facts.compileMs)}`)
  if (facts.runMs !== null) parts.push(`ran in ${formatDuration(facts.runMs)}`)
  if (facts.exitCode !== null) parts.push(`exit ${facts.exitCode}`)
  return parts.join(' · ')
}

/** Does this run need the learner's attention even though it "worked"? */
export function runTone(facts: RunFacts): 'success' | 'caution' {
  return facts.exitCode === 0 || facts.exitCode === null ? 'success' : 'caution'
}
