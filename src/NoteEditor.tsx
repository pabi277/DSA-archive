import { useState } from 'react'
import { NOTE_MARKDOWN_LIMIT, NOTE_SNIPPET_LIMIT, type Note } from './library'
import { renderMarkdown } from './markdown'

/**
 * Inline note editor (roadmap 3.1). Markdown and a code snippet, written inside
 * the problem row so the owner never leaves the sheet. Frozen 0-D tokens only;
 * state is text-labelled, never colour-only.
 */
export function NoteEditor({
  problemId,
  problemTitle,
  note,
  disabled,
  onSave,
  onDelete,
  onClose,
}: {
  problemId: string
  problemTitle: string
  note: Note | null
  disabled: boolean
  onSave: (markdown: string, snippet: string) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [markdown, setMarkdown] = useState(note?.markdown ?? '')
  const [snippet, setSnippet] = useState(note?.snippet ?? '')
  const [preview, setPreview] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const empty = markdown.trim() === '' && snippet.trim() === ''

  return (
    <section
      className="note-editor"
      data-testid="note-editor"
      aria-label={`Note for ${problemTitle}`}
    >
      <div className="note-editor-head">
        <strong>My note · {problemTitle}</strong>
        <div className="chip-group" role="group" aria-label="Note view">
          <button type="button" className={preview ? 'chip' : 'chip is-on'} aria-pressed={!preview} onClick={() => setPreview(false)}>
            Write
          </button>
          <button type="button" className={preview ? 'chip is-on' : 'chip'} aria-pressed={preview} onClick={() => setPreview(true)}>
            Preview
          </button>
        </div>
      </div>

      {preview ? (
        <div className="note-preview" data-testid="note-preview">
          {empty ? (
            <p className="fine-print">Nothing to preview yet.</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} />
          )}
          {snippet.trim() !== '' && (
            <pre className="code-preview">{snippet}</pre>
          )}
        </div>
      ) : (
        <>
          <label className="field-label" htmlFor={`note-md-${problemId}`}>
            Note (markdown)
          </label>
          <textarea
            id={`note-md-${problemId}`}
            data-testid="note-markdown"
            rows={5}
            value={markdown}
            maxLength={NOTE_MARKDOWN_LIMIT}
            placeholder="What did you learn? Patterns, edge cases, the trick you missed…"
            onChange={(event) => setMarkdown(event.target.value)}
          />
          <p className="note-counter">
            {markdown.length} / {NOTE_MARKDOWN_LIMIT} characters
          </p>

          <label className="field-label" htmlFor={`note-code-${problemId}`}>
            My code snippet
          </label>
          <textarea
            id={`note-code-${problemId}`}
            className="code-input"
            data-testid="note-snippet"
            rows={6}
            value={snippet}
            maxLength={NOTE_SNIPPET_LIMIT}
            spellCheck={false}
            placeholder="Your own solution or the part you keep forgetting…"
            onChange={(event) => setSnippet(event.target.value)}
          />
          <p className="note-counter">
            {snippet.length} / {NOTE_SNIPPET_LIMIT} characters
          </p>
        </>
      )}

      <div className="action-grid">
        <button
          type="button"
          className="button button-primary"
          data-testid="note-save"
          disabled={disabled}
          onClick={() => onSave(markdown, snippet)}
        >
          Save note
        </button>
        <button type="button" className="button button-secondary" onClick={onClose}>
          Close
        </button>
        {note && !confirmDelete && (
          <button
            type="button"
            className="button button-secondary"
            data-testid="note-delete"
            disabled={disabled}
            onClick={() => setConfirmDelete(true)}
          >
            Delete note
          </button>
        )}
        {note && confirmDelete && (
          <>
            <button
              type="button"
              className="button button-secondary"
              data-testid="note-delete-confirm"
              disabled={disabled}
              onClick={onDelete}
            >
              Confirm delete
            </button>
            <button type="button" className="button button-secondary" onClick={() => setConfirmDelete(false)}>
              Keep note
            </button>
          </>
        )}
      </div>

      <p className="fine-print">
        {empty
          ? 'An empty note is removed when you save, so nothing blank is stored.'
          : 'Saved to your account and synced to your other devices · preview never runs raw HTML.'}
      </p>
    </section>
  )
}
