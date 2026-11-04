import { useState } from 'react'
import { LIST_TITLE_LIMIT, locateProblem, sortLists, type CustomList, type ListsById } from './library'

function ListCard({
  list,
  disabled,
  onRename,
  onDelete,
  onRemove,
  onFilterSheet,
  onOpenProblem,
}: {
  list: CustomList
  disabled: boolean
  onRename: (listId: string, title: string) => void
  onDelete: (listId: string) => void
  onRemove: (listId: string, problemId: string) => void
  onFilterSheet: (listId: string) => void
  onOpenProblem: (problemId: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <article className="card list-card" data-testid={`list-card-${list.id}`}>
      <div className="list-card-head">
        <div className="list-card-copy">
          <strong>{list.title}</strong>
          <p className="fine-print">
            {list.problemIds.length} problem{list.problemIds.length === 1 ? '' : 's'}
            {list.updatedAt ? ' · synced' : ''}
          </p>
        </div>
        {draft === null && (
          <button type="button" className="button button-secondary" onClick={() => setDraft(list.title)}>
            Rename
          </button>
        )}
      </div>

      {draft !== null && (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (draft.trim() === '') return
            onRename(list.id, draft)
            setDraft(null)
          }}
        >
          <label className="field-label" htmlFor={`rename-${list.id}`}>
            List title
          </label>
          <input
            id={`rename-${list.id}`}
            type="text"
            value={draft}
            maxLength={LIST_TITLE_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="button button-secondary" disabled={disabled || draft.trim() === ''}>
            Save title
          </button>
          <button type="button" className="button button-secondary" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </form>
      )}

      {list.problemIds.length === 0 ? (
        <p className="fine-print">
          Empty list — add problems from the sheet with the <strong>+ List</strong> action on any row.
        </p>
      ) : (
        <ul className="list-problems">
          {list.problemIds.map((problemId) => {
            const location = locateProblem(problemId)
            return (
              <li key={problemId}>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onOpenProblem(problemId)}
                  title="Open this problem in the sheet"
                >
                  {location?.problem.title ?? problemId}
                </button>
                <span className="fine-print">{location?.topicTitle ?? 'Unknown topic'}</span>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={disabled}
                  aria-label={`Remove ${location?.problem.title ?? problemId} from ${list.title}`}
                  onClick={() => onRemove(list.id, problemId)}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="action-grid">
        <button type="button" className="button button-secondary" onClick={() => onFilterSheet(list.id)}>
          Filter sheet by this list
        </button>
        {!confirmDelete ? (
          <button type="button" className="button button-secondary" onClick={() => setConfirmDelete(true)}>
            Delete list
          </button>
        ) : (
          <>
            <button
              type="button"
              className="button button-secondary"
              data-testid={`list-delete-confirm-${list.id}`}
              disabled={disabled}
              onClick={() => onDelete(list.id)}
            >
              Confirm delete
            </button>
            <button type="button" className="button button-secondary" onClick={() => setConfirmDelete(false)}>
              Keep list
            </button>
          </>
        )}
      </div>
    </article>
  )
}

/**
 * Custom lists (roadmap 3.3): create, rename, delete, add/remove problems and
 * jump back to a filtered sheet. Lists are per-account Firestore documents.
 */
export function ListsView({
  signedIn,
  lists,
  disabled,
  onCreate,
  onRename,
  onDelete,
  onRemove,
  onFilterSheet,
  onOpenProblem,
}: {
  signedIn: boolean
  lists: ListsById
  disabled: boolean
  onCreate: (title: string) => void
  onRename: (listId: string, title: string) => void
  onDelete: (listId: string) => void
  onRemove: (listId: string, problemId: string) => void
  onFilterSheet: (listId: string) => void
  onOpenProblem: (problemId: string) => void
}) {
  const [title, setTitle] = useState('')
  const sorted = sortLists(lists)

  if (!signedIn) {
    return (
      <section className="library-view" data-testid="lists-view" aria-label="Custom lists">
        <div className="empty-state">
          <span className="empty-mark" aria-hidden="true">≡</span>
          <h2>Lists need an account</h2>
          <p>
            Sign in with Google to build custom lists such as “weak topics” or “last-week revision”.
            Lists filter the sheet, sync to every device and ride along in the JSON backup.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="library-view" data-testid="lists-view" aria-label="Custom lists">
      <div className="library-head">
        <h2 className="card-title">My lists</h2>
        <p className="quiet-note" data-testid="lists-count">
          {sorted.length} list{sorted.length === 1 ? '' : 's'} · synced to your account · included in your backup
        </p>
      </div>

      <form
        className="inline-form list-create"
        onSubmit={(event) => {
          event.preventDefault()
          if (title.trim() === '') return
          onCreate(title)
          setTitle('')
        }}
      >
        <label className="field-label" htmlFor="new-list-title">
          New list
        </label>
        <input
          id="new-list-title"
          data-testid="new-list-title"
          type="text"
          value={title}
          maxLength={LIST_TITLE_LIMIT}
          placeholder="e.g. Weak topics"
          onChange={(event) => setTitle(event.target.value)}
        />
        <button
          type="submit"
          className="button button-primary"
          data-testid="create-list"
          disabled={disabled || title.trim() === ''}
        >
          Create list
        </button>
      </form>

      {sorted.length === 0 ? (
        <div className="empty-state" data-testid="lists-empty">
          <span className="empty-mark" aria-hidden="true">≡</span>
          <h2>No custom lists yet</h2>
          <p>
            Create one above, then use <strong>+ List</strong> on any sheet row to add problems. Open the
            sheet and tap a list chip to study only that list.
          </p>
        </div>
      ) : (
        <div className="list-cards">
          {sorted.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              disabled={disabled}
              onRename={onRename}
              onDelete={onDelete}
              onRemove={onRemove}
              onFilterSheet={onFilterSheet}
              onOpenProblem={onOpenProblem}
            />
          ))}
        </div>
      )}
    </section>
  )
}
