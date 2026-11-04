/**
 * The deliberately small code editor + the per-problem code panel
 * (phase v2-04). A real `<textarea>` with line numbers, Tab/Shift-Tab,
 * Enter auto-indent, ⌘S to save and an unsaved-changes guard on Esc/Close.
 * No CodeMirror/Monaco and no syntax highlighting: the bundle and offline
 * promises matter more, and phase 07 plugs its runner in beside this panel
 * without rework.
 */
import { Suspense, lazy, useState } from 'react'
import { locateProblem } from '../library'
import { Button, Tag } from '../design/primitives'
import {
  CODE_LIMIT,
  CODE_LANGUAGES,
  LANGUAGE_LABELS,
  SNIPPET_NOTES_LIMIT,
  VERDICT_LABELS,
  autoIndentPrefix,
  indentSelection,
  snippetIsEmpty,
  updatedAgeLabel,
  type CodeLanguage,
  type Snippet,
  type SnippetDraft,
} from './codeStore'
import { PeekCode } from './peek'
import type { CaseSpec } from '../runner/tests'

/**
 * Phase v2-07: the runner is an installed add-on, loaded on first paint of the
 * panel and never part of the app shell (the shell is frozen at 388 kB gzip and
 * the worker alone is ~1.3 MB). A `Suspense` with no fallback is deliberate —
 * the panel appears under the code buttons a moment later, and nothing shifts
 * because it is always the last block in the card.
 */
const RunPanel = lazy(() => import('../runner/runPanel'))

export type CodeSync = { busy: boolean; pending: boolean; online: boolean }

export function saveStatusLabel(sync: CodeSync, dirty: boolean): string {
  if (sync.busy) return 'Saving…'
  if (sync.pending) return sync.online ? 'Saving…' : 'Offline — will sync'
  if (dirty) return 'Unsaved changes'
  if (!sync.online) return 'Offline — will sync'
  return 'Saved ✓'
}

/** Clipboard copy via the async API (the app only runs in secure contexts). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** An external tool link styled as a button (LeetCode / Compiler Explorer). */
function OutLink({ href, testId, children }: { href: string; testId: string; children: string }) {
  return (
    <a className="btn btn-secondary" data-testid={testId} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

/** A destructive-action confirm pair (discard / delete), one shape for both. */
function ConfirmPair({
  testId,
  confirmLabel,
  cancelLabel,
  disabled,
  onConfirm,
  onCancel,
}: {
  testId: string
  confirmLabel: string
  cancelLabel: string
  disabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <Button data-testid={testId} disabled={disabled} onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={onCancel}>
        {cancelLabel}
      </Button>
    </>
  )
}

export function CodeEditor({
  problemId,
  problemTitle,
  snippet,
  disabled,
  sync,
  cases,
  onSave,
  onDelete,
  onClose,
}: {
  problemId: string
  problemTitle: string
  snippet: Snippet | null
  disabled: boolean
  sync: CodeSync
  /** Authored `{input, expected}` pairs from phase 03 (`getTests`). */
  cases: readonly CaseSpec[]
  onSave: (draft: SnippetDraft) => void
  onDelete: () => void
  onClose?: () => void
}) {
  const [language, setLanguage] = useState<CodeLanguage>(snippet?.language ?? 'cpp')
  const [code, setCode] = useState(snippet?.code ?? '')
  const [notes, setNotes] = useState(snippet?.notes ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)

  const dirty =
    language !== (snippet?.language ?? 'cpp') ||
    code !== (snippet?.code ?? '') ||
    notes !== (snippet?.notes ?? '')
  const empty = snippetIsEmpty(code, notes, snippet?.moments ?? [])
  const lines = code === '' ? 1 : code.split('\n').length

  const save = () => {
    // The optional verdict is preserved untouched: it records how the last
    // run went and is set from the Phase 07 runner, not picked here. Phase 06
    // stamps are preserved untouched: they belong to the video, not the editor.
    onSave({
      language,
      code,
      notes,
      ...(snippet?.verdict ? { verdict: snippet.verdict } : {}),
      ...(snippet?.moments && snippet.moments.length > 0 ? { moments: snippet.moments } : {}),
    })
    setConfirmDiscard(false)
  }

  const requestClose = () => {
    if (!onClose) return
    if (dirty && !confirmDiscard) {
      setConfirmDiscard(true)
      return
    }
    onClose()
  }

  const onCodeKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const area = event.currentTarget
    const place = (start: number, end = start) =>
      requestAnimationFrame(() => {
        area.selectionStart = start
        area.selectionEnd = end
      })
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      if (!disabled) save()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      requestClose()
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      const edit = indentSelection(code, area.selectionStart, area.selectionEnd, event.shiftKey)
      setCode(edit.value)
      place(edit.selectionStart, edit.selectionEnd)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const caret = area.selectionStart
      const insert = autoIndentPrefix(code, caret)
      const next = code.slice(0, caret) + insert + code.slice(area.selectionEnd)
      setCode(next)
      place(caret + insert.length)
    }
  }

  return (
    <section className="code-editor" data-testid="code-editor">
      <div className="code-panel-head">
        <strong>My code · {problemTitle}</strong>
        <span className="code-save-status" data-testid="code-save-status" aria-live="polite">
          {saveStatusLabel(sync, dirty)}
        </span>
      </div>

      <label className="field-label" htmlFor={`code-lang-${problemId}`}>
        Language
      </label>
      <select
        id={`code-lang-${problemId}`}
        className="select-field"
        data-testid="code-language"
        value={language}
        disabled={disabled}
        onChange={(event) => setLanguage(event.target.value as CodeLanguage)}
      >
        {CODE_LANGUAGES.map((entry) => (
          <option key={entry} value={entry}>
            {LANGUAGE_LABELS[entry]}
          </option>
        ))}
      </select>

      <label className="field-label" htmlFor={`code-text-${problemId}`}>
        Solution code
      </label>
      <div className="code-editor-area">
        <div className="code-gutter" aria-hidden="true">
          <div style={{ transform: `translateY(${-scrollTop}px)` }}>
            {Array.from({ length: lines }, (_, index) => index + 1).join('\n')}
          </div>
        </div>
        <textarea
          id={`code-text-${problemId}`}
          className="code-textarea"
          data-testid="code-input"
          rows={10}
          value={code}
          maxLength={CODE_LIMIT}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="Paste or write your solution…"
          disabled={disabled}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={onCodeKeyDown}
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        />
      </div>
      <p className="code-counter num">
        {code.length} / {CODE_LIMIT} · Tab indents · ⌘S saves · ⌘↵ runs
      </p>

      <Suspense fallback={null}>
        <RunPanel code={code} language={language} cases={cases} problemId={problemId} />
      </Suspense>

      <label className="field-label" htmlFor={`code-note-${problemId}`}>
        Reminder (optional, plain text, {SNIPPET_NOTES_LIMIT} max)
      </label>
      <textarea
        id={`code-note-${problemId}`}
        className="code-note-input"
        data-testid="code-notes"
        rows={2}
        value={notes}
        maxLength={SNIPPET_NOTES_LIMIT}
        placeholder="One line for future you: the trick, the edge case…"
        disabled={disabled}
        onChange={(event) => setNotes(event.target.value)}
      />

      {confirmDiscard ? (
        <p className="code-discard" role="alert" data-testid="code-discard-warning">
          Unsaved changes — save them, or Discard to leave.
        </p>
      ) : null}

      <div className="action-grid">
        <Button variant="primary" data-testid="code-save" disabled={disabled} onClick={save}>
          Save code
        </Button>
        {onClose ? (
          confirmDiscard ? (
            <ConfirmPair
              testId="code-discard"
              confirmLabel="Discard changes"
              cancelLabel="Keep editing"
              onConfirm={onClose}
              onCancel={() => setConfirmDiscard(false)}
            />
          ) : (
            <Button onClick={requestClose}>Close</Button>
          )
        ) : null}
        {snippet && !confirmDelete ? (
          <Button data-testid="code-delete" disabled={disabled} onClick={() => setConfirmDelete(true)}>
            Delete code
          </Button>
        ) : null}
        {snippet && confirmDelete ? (
          <ConfirmPair
            testId="code-delete-confirm"
            confirmLabel="Confirm delete"
            cancelLabel="Keep code"
            disabled={disabled}
            onConfirm={onDelete}
            onCancel={() => setConfirmDelete(false)}
          />
        ) : null}
      </div>

      {empty ? (
        <p className="fine-print">An empty solution is removed when you save, so nothing blank is stored.</p>
      ) : null}
    </section>
  )
}

/**
 * The per-problem code panel: view (with peek) ⇄ edit, plus copy-out so a
 * learner is never stuck before the phase-07 runner exists. Used inline in
 * sheet rows (`initialMode="edit"`) and on the problem page (`"view"`).
 */
export function CodePanel({
  problemId,
  problemTitle,
  snippet,
  signedIn,
  disabled,
  sync,
  cases,
  initialMode = 'view',
  onSave,
  onDelete,
  onClose,
}: {
  problemId: string
  problemTitle: string
  snippet: Snippet | null
  signedIn: boolean
  disabled: boolean
  sync: CodeSync
  cases: readonly CaseSpec[]
  initialMode?: 'view' | 'edit'
  onSave: (draft: SnippetDraft) => void
  onDelete: () => void
  onClose?: () => void
}) {
  const [editing, setEditing] = useState(initialMode === 'edit')
  const [copied, setCopied] = useState(false)
  const leetcode = locateProblem(problemId)?.problem.links.leetcode

  if (!signedIn) {
    return (
      <section className="code-panel" data-testid="code-panel">
        <strong>Save your solution here</strong>
        <p className="quiet-note">
          Sign in to keep one synced solution per problem, offline included.
        </p>
      </section>
    )
  }

  if (editing || !snippet) {
    return (
      <CodeEditor
        // Keyed by identity, never by `updatedAt`: every save writes a fresh
        // server timestamp, so keying on it remounted the editor mid-session —
        // throwing away whatever was typed after the save (and, on a slow
        // snapshot, unmounting the whole panel while a test was reading it).
        key={problemId}
        problemId={problemId}
        problemTitle={problemTitle}
        snippet={snippet}
        disabled={disabled}
        sync={sync}
        cases={cases}
        onSave={(draft) => {
          // Stay in the editor after saving (like the old note editor): the
          // save status flips to Saved/Offline from the snapshot, and the
          // learner can keep iterating without re-opening anything.
          onSave(draft)
        }}
        onDelete={onDelete}
        onClose={onClose ?? (snippet ? () => setEditing(false) : undefined)}
      />
    )
  }

  const copy = async () => {
    const ok = await copyText(snippet.code)
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 2500)
  }

  return (
    <section className="code-panel" data-testid="code-panel">
      <div className="code-panel-head">
        <strong>My code · {problemTitle}</strong>
        <span className="code-panel-meta">
          <Tag tone="action">{LANGUAGE_LABELS[snippet.language]}</Tag>
          {snippet.verdict ? <Tag tone="neutral">{VERDICT_LABELS[snippet.verdict]}</Tag> : null}
          <span className="quiet-note num">updated {updatedAgeLabel(snippet.updatedAt)}</span>
        </span>
      </div>

      {snippet.code.trim() !== '' ? (
        <PeekCode code={snippet.code} />
      ) : (
        <p className="quiet-note">No code yet — just a reminder.</p>
      )}
      {snippet.notes.trim() !== '' ? <p className="code-reminder">{snippet.notes}</p> : null}

      <div className="action-grid">
        <Button variant="primary" data-testid="code-edit" onClick={() => setEditing(true)}>
          Edit code
        </Button>
        <Button data-testid="code-copy" onClick={() => void copy()}>
          {copied ? 'Copied ✓' : 'Copy code'}
        </Button>
        {leetcode ? (
          <OutLink href={leetcode} testId="code-leetcode">Open in LeetCode</OutLink>
        ) : null}
        <OutLink href="https://godbolt.org/" testId="code-godbolt">Open in Compiler Explorer</OutLink>
        {onClose ? (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </div>
      <Suspense fallback={null}>
        <RunPanel code={snippet.code} language={snippet.language} cases={cases} problemId={problemId} />
      </Suspense>
    </section>
  )
}
