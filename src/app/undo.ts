/**
 * Undo stack (phase v2-01, §3.9).
 *
 * Every mutation that can be expressed as "do it now, put it back later" gets a
 * 6-second undo entry rendered by the Toast host (`src/app/toast.tsx`). Pure
 * module, unit-tested: no React, no timers of its own — the host feeds `now()`
 * so the expiry rule is deterministic in tests.
 *
 * Deliberate limits:
 * · one undo slot per key — re-marking the same row replaces the previous entry
 *   instead of stacking a second revert of the same field;
 * · at most 4 live entries (a phone toast stack never grows past the viewport);
 * · an entry expires when its 6 s window closes, when it is taken, or when a
 *   newer unrelated mutation pushes it out.
 */

export type UndoEntry = {
  id: number
  /** Dedup key, e.g. `progress:arrays:two-sum:s`. */
  key: string
  /** Human sentence: "Marked done", "Bookmark removed". */
  message: string
  /** Runs the revert. Must be safe to call twice (the stack guards this). */
  run: () => void
  /** Timestamp (ms) after which the entry is dead. */
  expiresAt: number
}

export const UNDO_WINDOW_MS = 6_000
export const UNDO_MAX_ENTRIES = 4

export type UndoStack = {
  entries: UndoEntry[]
  nextId: number
}

export function createUndoStack(): UndoStack {
  return { entries: [], nextId: 1 }
}

/** Drop expired entries; called before every read or push. */
export function pruneUndo(stack: UndoStack, now: number): UndoStack {
  const entries = stack.entries.filter((entry) => entry.expiresAt > now)
  return entries.length === stack.entries.length ? stack : { ...stack, entries }
}

export function pushUndo(
  stack: UndoStack,
  input: { key: string; message: string; run: () => void },
  now: number,
): UndoStack {
  const pruned = pruneUndo(stack, now)
  const entries = pruned.entries.filter((entry) => entry.key !== input.key)
  const entry: UndoEntry = {
    id: pruned.nextId,
    key: input.key,
    message: input.message,
    run: input.run,
    expiresAt: now + UNDO_WINDOW_MS,
  }
  const next = [...entries, entry]
  return {
    entries: next.slice(Math.max(0, next.length - UNDO_MAX_ENTRIES)),
    nextId: pruned.nextId + 1,
  }
}

/**
 * Take the newest live entry (or the one with this id) and run its revert.
 * Returns the stack with the entry removed. A dead entry is never run.
 */
export function takeUndo(
  stack: UndoStack,
  now: number,
  id?: number,
): { stack: UndoStack; entry: UndoEntry | null } {
  const pruned = pruneUndo(stack, now)
  const entries = [...pruned.entries]
  const index = id === undefined ? entries.length - 1 : entries.findIndex((e) => e.id === id)
  if (index < 0 || index >= entries.length) return { stack: pruned, entry: null }
  const entry = entries[index]
  entry.run()
  return {
    stack: { ...pruned, entries: entries.filter((item) => item.id !== entry.id) },
    entry,
  }
}

/** Seconds left in an entry's window, for the toast countdown affordance. */
export function undoSecondsLeft(entry: UndoEntry, now: number): number {
  return Math.max(0, Math.ceil((entry.expiresAt - now) / 1000))
}
