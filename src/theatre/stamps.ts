/**
 * Phase v2-06 — timeline stamps ("moments").
 *
 * A stamp is a moment in one video: `{ at, text, createdAt }`. Stamps live in the
 * snippet document the learner already has
 * (`users/{uid}/snippets/{problemId}.moments`), so they cost **one extra field
 * in a read that already happens** — no new collection, no extra document, no
 * extra quota path. Rules v8 accepts ≤30 per snippet, each `at` a bounded
 * number and each `text` ≤140 characters.
 *
 * The last 30 versions of the list are kept in memory (per session) so deleting
 * a stamp is undoable through the standard toast/`u` contract.
 */
import type { Snippet } from '../code/codeStore'

export const MOMENT_LIMIT = 30
export const MOMENT_TEXT_LIMIT = 140
export const MOMENT_AT_LIMIT = 86_400

export type Moment = {
  /** Seconds into the video, 0 ≤ at ≤ 86 400. */
  at: number
  text: string
  /** ISO string from the client clock (rules accept a string or a timestamp). */
  createdAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function clampAt(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0
  return Math.max(0, Math.min(MOMENT_AT_LIMIT, Math.floor(seconds)))
}

/** Trim to ≤140 characters on a word boundary when that does not truncate much. */
export function clampMomentText(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= MOMENT_TEXT_LIMIT) return clean
  const cut = clean.slice(0, MOMENT_TEXT_LIMIT)
  const space = cut.lastIndexOf(' ')
  return (space > MOMENT_TEXT_LIMIT - 20 ? cut.slice(0, space) : cut).trim()
}

/** Read one stamp defensively; null when either half is unusable. */
export function sanitizeMoment(raw: unknown): Moment | null {
  if (!isRecord(raw)) return null
  const at = raw.at
  if (typeof at !== 'number' || !Number.isFinite(at) || at < 0 || at > MOMENT_AT_LIMIT) return null
  const text = typeof raw.text === 'string' ? clampMomentText(raw.text) : ''
  if (text === '') return null
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt.slice(0, 40) : ''
  return { at: clampAt(at), text, createdAt }
}

/** Ascending by time; ties keep their order (stable). */
export function sortMoments(moments: Moment[]): Moment[] {
  return [...moments].sort((a, b) => a.at - b.at)
}

/**
 * Read `moments` off a snippet document. Deliberately independent of whether
 * the snippet's own text is empty: a snippet with only stamps is a valid
 * snippet (rules v8 accept it), so the code panel's "empty" test learns about
 * stamps in the same phase.
 */
export function sanitizeMoments(raw: unknown): Moment[] {
  if (!Array.isArray(raw)) return []
  const out: Moment[] = []
  for (const item of raw) {
    const moment = sanitizeMoment(item)
    if (!moment) continue
    out.push(moment)
    if (out.length >= MOMENT_LIMIT) break
  }
  return sortMoments(out)
}

export function momentsOf(snippet: Snippet | null | undefined): Moment[] {
  return sanitizeMoments(snippet?.moments)
}

export type AddMomentResult = {
  moments: Moment[]
  /** '' when the stamp was added; a sentence to show otherwise. */
  error: string
}

export function addMoment(
  existing: Moment[],
  at: number,
  text: string,
  now: Date = new Date(),
): AddMomentResult {
  const clean = clampMomentText(text)
  if (clean === '') return { moments: existing, error: 'Write what happens at this moment first.' }
  if (existing.length >= MOMENT_LIMIT) {
    return {
      moments: existing,
      error: `This video already has ${MOMENT_LIMIT} stamps — the cap keeps sync cheap. Delete one first.`,
    }
  }
  const moment: Moment = { at: clampAt(at), text: clean, createdAt: now.toISOString() }
  return { moments: sortMoments([...existing, moment]), error: '' }
}

export function removeMoment(existing: Moment[], index: number): Moment[] {
  if (index < 0 || index >= existing.length) return existing
  return existing.filter((_, position) => position !== index)
}

/**
 * Seek target for "skip to first stamp": the first stamp ahead of the playhead,
 * or the first stamp when everything is behind it.
 */
export function nextStamp(moments: Moment[], currentTime: number): Moment | null {
  const sorted = sortMoments(moments)
  if (sorted.length === 0) return null
  return sorted.find((moment) => moment.at > currentTime + 1) ?? sorted[0]
}

/**
 * Where a stamp click should land. Two seconds early, because the first second
 * of an explanation is usually the sentence before the point.
 */
export const STAMP_LEAD_SECONDS = 2

export function seekTarget(moment: Moment): number {
  return Math.max(0, moment.at - STAMP_LEAD_SECONDS)
}

/**
 * "Skip to next stamp" target: the first stamp ahead of the playhead, else the
 * first one. Null when the video has no stamps, so the caller can say so.
 */
export function nextSeekTarget(moments: Moment[], currentTime: number): Moment | null {
  return nextStamp(moments, currentTime)
}

/** The next stamp's clock, or `no stamps` — the control bar's hint text. */
export function formatSeek(moments: Moment[], currentTime: number): string {
  const target = nextStamp(moments, currentTime)
  if (!target) return 'no stamps'
  const total = Math.floor(target.at)
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

/* --- in-memory undo (§ "every mutation undoable") ------------------------- */

const undoMemory = new Map<string, Moment[][]>()
const UNDO_DEPTH = 30

function key(problemId: string) {
  return problemId
}

/** Remember the list *before* a mutation, so the toast can restore it. */
export function rememberMoments(problemId: string, moments: Moment[]) {
  const stack = undoMemory.get(key(problemId)) ?? []
  stack.push(moments.map((moment) => ({ ...moment })))
  if (stack.length > UNDO_DEPTH) stack.shift()
  undoMemory.set(key(problemId), stack)
}

export function undoMoments(problemId: string): Moment[] | null {
  const stack = undoMemory.get(key(problemId))
  if (!stack || stack.length === 0) return null
  return stack.pop() ?? null
}

export function clearMomentUndoForTests() {
  undoMemory.clear()
}

/** Copy for the code screen's "3 moments" line and the rail header. */
export function momentsCountLabel(count: number): string {
  if (count === 0) return 'No stamps'
  return `${count} stamp${count === 1 ? '' : 's'}`
}
