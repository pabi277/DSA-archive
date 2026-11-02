import { LEVEL_LABELS, levelOf } from './sheet'
import { locateProblem, searchNotes, type NotesById } from './library'
import { excerpt } from './markdown'

function updatedLabel(iso: string | null) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Notes overview + search (roadmap 3.2). Every note is reachable from here:
 * "Edit note" jumps back to the sheet row with the editor open.
 */
export function NotesView({
  signedIn,
  notes,
  query,
  onQueryChange,
  onEdit,
  onOpen,
}: {
  signedIn: boolean
  notes: NotesById
  query: string
  onQueryChange: (value: string) => void
  onEdit: (problemId: string) => void
  onOpen: (problemId: string) => void
}) {
  if (!signedIn) {
    return (
      <section className="library-view" data-testid="notes-view" aria-label="Notes">
        <div className="empty-state">
          <span className="empty-mark" aria-hidden="true">✎</span>
          <h2>Notes need an account</h2>
          <p>
            Sign in with Google to write markdown notes and code snippets. They follow your account to
            every device, work offline, and always ride along in the JSON backup.
          </p>
        </div>
      </section>
    )
  }

  const total = Object.keys(notes).length
  const results = searchNotes(notes, query)

  return (
    <section className="library-view" data-testid="notes-view" aria-label="Notes">
      <div className="library-head">
        <h2 className="card-title">My notes</h2>
        <p className="quiet-note" data-testid="notes-count">
          {total} note{total === 1 ? '' : 's'} · synced to your account · included in your backup
        </p>
      </div>

      {total > 0 && (
        <div className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            aria-label="Search my notes"
            placeholder="Search my notes"
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query !== '' && (
            <button type="button" aria-label="Clear notes search" onClick={() => onQueryChange('')}>
              ✕
            </button>
          )}
        </div>
      )}

      {total === 0 ? (
        <div className="empty-state" data-testid="notes-empty">
          <span className="empty-mark" aria-hidden="true">✎</span>
          <h2>No notes yet</h2>
          <p>
            Open any row in the sheet and choose <strong>Note</strong> to write down the idea, the edge
            case or the snippet you want to remember.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state" data-testid="notes-no-results">
          <span className="empty-mark" aria-hidden="true">—</span>
          <h2>No notes match</h2>
          <p>Nothing in your {total} note{total === 1 ? '' : 's'} matches “{query.trim()}”.</p>
          <button type="button" className="button button-secondary" onClick={() => onQueryChange('')}>
            Clear notes search
          </button>
        </div>
      ) : (
        <div className="note-list">
          {results.map((note) => {
            const location = locateProblem(note.problemId)
            const updated = updatedLabel(note.updatedAt)
            return (
              <article
                key={note.problemId}
                className="card note-card"
                data-testid={`note-card-${note.problemId}`}
              >
                <div className="note-card-head">
                  <div className="note-card-copy">
                    <strong>{location?.problem.title ?? note.problemId}</strong>
                    <p className="fine-print">
                      {location?.topicTitle ?? 'Unknown topic'}
                      {updated ? ` · updated ${updated}` : ''}
                    </p>
                  </div>
                  {location && (
                    <span className="level-badge">{LEVEL_LABELS[levelOf(location.problem)]}</span>
                  )}
                </div>
                {note.markdown.trim() !== '' && (
                  <p className="note-excerpt">{excerpt(note.markdown)}</p>
                )}
                {note.snippet.trim() !== '' && (
                  <pre className="code-preview note-card-code">{excerpt(note.snippet, 220)}</pre>
                )}
                <div className="action-grid">
                  <button type="button" className="button button-secondary" onClick={() => onEdit(note.problemId)}>
                    Edit note
                  </button>
                  <button type="button" className="button button-secondary" onClick={() => onOpen(note.problemId)}>
                    Open in sheet
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
