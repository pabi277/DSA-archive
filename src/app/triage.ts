/**
 * Roving focus for keyboard triage (phase v2-01, §3.11).
 *
 * A module store rather than component state because three places need the same
 * answer: the hook that owns `j`/`k` (DOM order), the row that draws
 * `is-focused`, and the sheet that re-renders after a mutation. Keeping it out
 * of React also means a re-render never loses the focused row — the v1 sheet
 * moved the class by hand, so ticking a row with `x` dropped the focus ring.
 */
import { useSyncExternalStore } from 'react'

let focusedId: string | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export function getTriageFocus(): string | null {
  return focusedId
}

export function subscribeTriageFocus(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTriageFocus(): string | null {
  return useSyncExternalStore(subscribeTriageFocus, getTriageFocus, getTriageFocus)
}

export function setTriageFocus(problemId: string | null) {
  if (focusedId === problemId) return
  focusedId = problemId
  emit()
}

/** DOM order of the currently mounted rows (windowed, so this is small). */
export function triageRowIds(): string[] {
  if (typeof document === 'undefined') return []
  return [...document.querySelectorAll<HTMLElement>('.row[data-problem-id]')].map(
    (row) => row.dataset.problemId ?? '',
  )
}

/** Move the roving focus by `delta` rows; clamps at both ends. */
export function moveTriageFocus(delta: number): string | null {
  const ids = triageRowIds().filter(Boolean)
  if (ids.length === 0) return null
  const current = focusedId ? ids.indexOf(focusedId) : -1
  const nextIndex = current < 0 ? 0 : Math.max(0, Math.min(ids.length - 1, current + delta))
  const next = ids[nextIndex]
  setTriageFocus(next)
  return next
}

export function resetTriageFocusForTests() {
  focusedId = null
  listeners.clear()
}
