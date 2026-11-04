/**
 * Phase v2-06 — the rail's stamps list.
 *
 * Stamps are the point of the theatre: a learner marks the exact second where
 * the explanation clicks (or where they got lost) and can jump straight back on
 * a later rewatch. One list serves the rail and the phone sheet; every row is a
 * seek button plus a delete with undo, and the add form is inline — no modal, so
 * the keyboard contract stays simple.
 */
import { useState } from 'react'
import { Button, Empty, Tag } from '../design/primitives'
import { IconClock, IconPlay } from '../design/icons'
import { formatClock } from './video'
import { MOMENT_LIMIT, MOMENT_TEXT_LIMIT, momentsCountLabel, type Moment } from './stamps'

export function StampsList({
  stamps,
  disabledReason,
  currentTime,
  onSeek,
  onAdd,
  onDelete,
}: {
  stamps: Moment[]
  /** Non-null when stamps cannot be saved (signed out or an unreadable snippet). */
  disabledReason: string | null
  currentTime: number
  onSeek: (moment: Moment) => void
  onAdd: (at: number, text: string) => void
  onDelete: (index: number) => void
}) {
  const [draft, setDraft] = useState('')
  const full = stamps.length >= MOMENT_LIMIT

  const submit = () => {
    if (draft.trim() === '') return
    onAdd(Math.floor(currentTime), draft)
    setDraft('')
  }

  return (
    <section className="theatre-stamps" aria-label="Video stamps" data-testid="stamps-list">
      <header className="theatre-stamps-head">
        <h3>
          <IconClock size={14} /> {momentsCountLabel(stamps.length)}
        </h3>
        <span className="quiet-note num" data-testid="stamps-cap">
          {stamps.length}/{MOMENT_LIMIT}
        </span>
      </header>

      {stamps.length === 0 ? (
        <Empty title="No stamps yet" mark="⚑" testId="stamps-empty">
          Press <kbd className="kbd">s</kbd> while the video plays — or use Stamp below the stage — to pin the
          second where something clicked. The stamp opens at that moment next time.
        </Empty>
      ) : (
        <ol className="theatre-stamps-list" data-testid="stamps-rows">
          {stamps.map((moment, index) => (
            <li key={`${moment.at}-${index}`} className="theatre-stamp-row" data-testid={`stamp-${index}`}>
              <button
                type="button"
                className="theatre-stamp-seek"
                aria-label={`Seek to ${formatClock(moment.at)} — ${moment.text}`}
                data-testid={`stamp-seek-${index}`}
                onClick={() => onSeek(moment)}
              >
                <span className="theatre-stamp-at num">{formatClock(moment.at)}</span>
                <span className="theatre-stamp-text">{moment.text}</span>
                <IconPlay size={12} />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Delete stamp at ${formatClock(moment.at)}`}
                data-testid={`stamp-delete-${index}`}
                onClick={() => onDelete(index)}
              >
                Delete
              </button>
            </li>
          ))}
        </ol>
      )}

      {disabledReason ? (
        <p className="quiet-note" data-testid="stamps-disabled">
          <Tag tone="neutral">Read-only</Tag> {disabledReason}
        </p>
      ) : (
        <form
          className="theatre-stamp-add"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <label className="visually-hidden" htmlFor="stamp-new">
            What happens at this moment? Saved at {formatClock(currentTime)}
          </label>
          <input
            id="stamp-new"
            className="theatre-input"
            placeholder={`At ${formatClock(currentTime)} — what happens here?`}
            value={draft}
            maxLength={MOMENT_TEXT_LIMIT}
            disabled={full}
            data-testid="stamp-input"
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
          <Button type="submit" size="sm" disabled={full || draft.trim() === ''} data-testid="stamp-add">
            Stamp {formatClock(currentTime)}
          </Button>
          {full ? <p className="quiet-note">{MOMENT_LIMIT} stamps is the cap; delete one to add another.</p> : null}
        </form>
      )}
    </section>
  )
}
