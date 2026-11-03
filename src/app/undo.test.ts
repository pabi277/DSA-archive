import { describe, expect, it } from 'vitest'
import {
  UNDO_MAX_ENTRIES,
  UNDO_WINDOW_MS,
  createUndoStack,
  pruneUndo,
  pushUndo,
  takeUndo,
  undoSecondsLeft,
} from './undo'

describe('undo stack (§3.9)', () => {
  it('offers a six-second window and reports the countdown', () => {
    const stack = pushUndo(createUndoStack(), { key: 'a', message: 'Marked done', run: () => {} }, 1_000)
    expect(stack.entries).toHaveLength(1)
    expect(stack.entries[0].expiresAt).toBe(1_000 + UNDO_WINDOW_MS)
    expect(undoSecondsLeft(stack.entries[0], 1_000)).toBe(6)
    expect(undoSecondsLeft(stack.entries[0], 4_500)).toBe(3)
    expect(undoSecondsLeft(stack.entries[0], 9_999)).toBe(0)
  })

  it('runs the revert exactly once and removes the entry', () => {
    let reverted = 0
    const stack = pushUndo(createUndoStack(), { key: 'a', message: 'Marked done', run: () => (reverted += 1) }, 0)
    const first = takeUndo(stack, 10)
    expect(first.entry?.message).toBe('Marked done')
    expect(reverted).toBe(1)
    const second = takeUndo(first.stack, 20)
    expect(second.entry).toBeNull()
    expect(reverted).toBe(1)
  })

  it('never runs an expired entry', () => {
    let reverted = 0
    const stack = pushUndo(createUndoStack(), { key: 'a', message: 'x', run: () => (reverted += 1) }, 0)
    const result = takeUndo(stack, UNDO_WINDOW_MS + 1)
    expect(result.entry).toBeNull()
    expect(reverted).toBe(0)
  })

  it('prunes on read and on push', () => {
    const stack = pushUndo(createUndoStack(), { key: 'a', message: 'x', run: () => {} }, 0)
    expect(pruneUndo(stack, 5).entries).toHaveLength(1)
    expect(pruneUndo(stack, 7_000).entries).toHaveLength(0)
    const next = pushUndo(stack, { key: 'b', message: 'y', run: () => {} }, 7_000)
    expect(next.entries.map((entry) => entry.key)).toEqual(['b'])
  })

  it('replaces an entry with the same key instead of stacking a second revert', () => {
    let stack = pushUndo(createUndoStack(), { key: 's:two-sum', message: 'done', run: () => {} }, 0)
    stack = pushUndo(stack, { key: 's:two-sum', message: 'to do', run: () => {} }, 100)
    expect(stack.entries).toHaveLength(1)
    expect(stack.entries[0].message).toBe('to do')
  })

  it('caps the stack so a toast column never overflows', () => {
    let stack = createUndoStack()
    for (let index = 0; index < UNDO_MAX_ENTRIES + 3; index += 1) {
      stack = pushUndo(stack, { key: `k${index}`, message: `m${index}`, run: () => {} }, index)
    }
    expect(stack.entries).toHaveLength(UNDO_MAX_ENTRIES)
    expect(stack.entries.at(-1)?.key).toBe(`k${UNDO_MAX_ENTRIES + 2}`)
  })

  it('takes a specific entry by id', () => {
    const ran: string[] = []
    let stack = pushUndo(createUndoStack(), { key: 'a', message: 'a', run: () => ran.push('a') }, 0)
    stack = pushUndo(stack, { key: 'b', message: 'b', run: () => ran.push('b') }, 0)
    const firstId = stack.entries[0].id
    const result = takeUndo(stack, 10, firstId)
    expect(ran).toEqual(['a'])
    expect(result.stack.entries.map((entry) => entry.key)).toEqual(['b'])
  })
})
