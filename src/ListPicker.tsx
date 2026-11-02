import { useState } from 'react'
import { LIST_TITLE_LIMIT, locateProblem, sortLists, type ListsById } from './library'

/**
 * Row-level list picker (roadmap 3.3): tick the lists this problem belongs to,
 * or create a new list that already contains it. One document write per tick,
 * exactly what the generated rules validate.
 */
export function ListPicker({
  problemId,
  problemTitle,
  lists,
  disabled,
  onToggle,
  onCreate,
  onClose,
}: {
  problemId: string
  problemTitle: string
  lists: ListsById
  disabled: boolean
  onToggle: (listId: string, problemId: string) => void
  onCreate: (title: string) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const sorted = sortLists(lists)

  return (
    <section className="list-picker" data-testid="list-picker" aria-label={`Lists for ${problemTitle}`}>
      <strong>Lists for “{problemTitle}”</strong>
      {sorted.length === 0 ? (
        <p className="fine-print">No lists yet — create the first one below and it starts with this problem.</p>
      ) : (
        <ul className="check-list">
          {sorted.map((list) => {
            const checked = list.problemIds.includes(problemId)
            return (
              <li key={list.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(list.id, problemId)}
                  />
                  <span>{list.title}</span>
                  <span className="check-count">{list.problemIds.length}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (title.trim() === '') return
          onCreate(title)
          setTitle('')
        }}
      >
        <label className="field-label" htmlFor={`new-list-${problemId}`}>
          New list with this problem
        </label>
        <input
          id={`new-list-${problemId}`}
          type="text"
          value={title}
          maxLength={LIST_TITLE_LIMIT}
          placeholder="e.g. Weak topics"
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit" className="button button-secondary" disabled={disabled || title.trim() === ''}>
          Create and add
        </button>
      </form>

      <button type="button" className="text-button" onClick={onClose}>
        Close list picker
      </button>
      <p className="fine-print">
        {locateProblem(problemId)
          ? `Lists filter the sheet, and they are included in your JSON backup.`
          : 'Unknown problem — nothing can be added.'}
      </p>
    </section>
  )
}
