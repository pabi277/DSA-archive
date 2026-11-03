/**
 * Undo + toast plumbing for the shell (phase v2-01, §3.9).
 *
 * `useFeedback()` gives any screen two verbs:
 *   notify(message, detail)              — a plain 4 s toast
 *   undoable({ message, detail, revert }) — a 6 s toast with an `Undo` action
 *
 * The stack itself is the pure module in `undo.ts`; this file only owns the
 * React state, the expiry tick and the rendering contract.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ToastHost, type ToastMessage } from '../design/primitives'
import { createUndoStack, pushUndo, pruneUndo, takeUndo, undoSecondsLeft, type UndoEntry, type UndoStack } from './undo'

const NOTICE_MS = 4_000

export type UndoRequest = {
  /** Dedup key: re-marking one field replaces its own undo entry. */
  key: string
  message: string
  detail?: string
  revert: () => void
}

type FeedbackApi = {
  notify: (message: string, detail?: string, tone?: 'neutral' | 'success' | 'danger') => void
  undoable: (request: UndoRequest) => void
  /** Take the newest live undo entry (keyboard `u`). */
  undoLast: () => boolean
  dismiss: (id: number) => void
  messages: ToastMessage[]
}

const FeedbackContext = createContext<FeedbackApi | null>(null)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<UndoStack>(createUndoStack())
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const idRef = useRef(1)
  const nextId = () => {
    idRef.current += 1
    return idRef.current
  }

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, detail?: string, tone: 'neutral' | 'success' | 'danger' = 'neutral') => {
      const id = nextId()
      setToasts((current) => {
        // A plain toast for the same sentence replaces the previous one instead
        // of stacking duplicates (palette actions, repeated "Added to Today").
        const kept = current.filter((toast) => !(toast.action === undefined && toast.message === message))
        return [...kept.slice(-3), { id, message, detail, tone }]
      })
      window.setTimeout(() => dismiss(id), NOTICE_MS)
    },
    [dismiss],
  )

  /**
   * Re-render the undo toasts from the stack (seconds-left included). Plain
   * toasts keep their own ids and are never rebuilt. Mirrored into a ref so the
   * stack-driven interval never has to re-subscribe.
   */
  const renderRef = useRef<(now: number) => void>(() => {})
  const renderUndoStack = useCallback((now: number) => {
    const entries = stackRef.current.entries
    setToasts((current) => {
      const others = current.filter((toast) => toast.action === undefined)
      const undoToasts: ToastMessage[] = entries.map((entry: UndoEntry) => ({
        id: entry.id + 1_000_000,
        message: entry.message,
        tone: 'success',
        action: {
          label: 'Undo',
          run: () => {
            const result = takeUndo(stackRef.current, Date.now(), entry.id)
            stackRef.current = result.stack
            renderRef.current(Date.now())
            if (result.entry) notify('Undone', result.entry.message)
          },
        },
        secondsLeft: undoSecondsLeft(entry, now),
      }))
      return [...undoToasts, ...others]
    })
  }, [notify])
  renderRef.current = renderUndoStack

  const undoable = useCallback(
    ({ key, message, detail, revert }: UndoRequest) => {
      const now = Date.now()
      stackRef.current = pushUndo(stackRef.current, { key, message, run: revert }, now)
      renderUndoStack(now)
      if (detail) notify(message, detail)
    },
    [notify, renderUndoStack],
  )

  const runUndo = useCallback(
    (id?: number) => {
      const now = Date.now()
      const result = takeUndo(stackRef.current, now, id)
      stackRef.current = result.stack
      renderUndoStack(now)
      if (result.entry) notify('Undone', result.entry.message)
      return Boolean(result.entry)
    },
    [notify, renderUndoStack],
  )
  const undoLast = useCallback(() => runUndo(), [runUndo])

  // Tick twice a second while entries are live so the countdown and the expiry
  // are visible without one timer per toast.
  const hasUndo = toasts.some((toast) => toast.action !== undefined)
  useEffect(() => {
    if (!hasUndo) return
    const timer = window.setInterval(() => {
      const now = Date.now()
      stackRef.current = pruneUndo(stackRef.current, now)
      renderRef.current(now)
    }, 500)
    return () => window.clearInterval(timer)
  }, [hasUndo])

  const api = useMemo<FeedbackApi>(
    () => ({ notify, undoable, undoLast, dismiss, messages: toasts }),
    [notify, undoable, undoLast, dismiss, toasts],
  )

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {typeof document === 'undefined'
        ? null
        : createPortal(<ToastHost toasts={toasts} onDismiss={dismiss} />, document.body)}
    </FeedbackContext.Provider>
  )
}

export function useFeedback(): FeedbackApi {
  const context = useContext(FeedbackContext)
  if (!context) throw new Error('useFeedback must be used inside <FeedbackProvider>')
  return context
}
