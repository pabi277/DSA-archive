/**
 * Phase v2-09 — "Delete my data", the destructive half of the privacy audit.
 *
 * Lazy add-on: this card (and `src/accountDelete.ts`) ship as
 * `assets/account-*.js`, are never precached, and cost the frozen app shell
 * nothing. It is only reachable while signed in, which is exactly when a
 * Firestore deletion can actually happen.
 *
 * Two deliberate confirmations and an honest sentence: deletion cannot be
 * undone, so the first thing the card offers is the existing backup export.
 */
import { useState } from 'react'
import { Button, Card } from '../design/primitives'
import { useFeedback } from './feedback'
import { db } from '../firebase'
import { clearLocalStudyData, deleteMyData } from '../accountDelete'

export default function DeleteDataCard({
  uid,
  onDeleted,
}: {
  uid: string
  /** Sign out and clear in-memory guest rows so no listener recreates a profile. */
  onDeleted: () => void
}) {
  const feedback = useFeedback()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!db) {
      setError('Cloud storage is not configured on this build.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const report = await deleteMyData(db, uid)
      clearLocalStudyData()
      feedback.notify(
        'Your data was deleted',
        `${report.documents} documents removed from Firestore and this device. You are signed out.`,
        'success',
      )
      onDeleted()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <Card title="Delete my data" data-testid="delete-data-card">
      <p className="quiet-note">
        Removes progress, saved code, quiz results, lists, plans, your profile and friend links from Firestore,
        and clears this device&rsquo;s guest study records. Export a backup first — this cannot be undone.
      </p>
      {error ? (
        <p className="quiet-note" role="alert" data-testid="delete-data-error">
          Could not delete your data: {error}
        </p>
      ) : null}
      <div className="inline-actions">
        {confirming ? (
          <>
            <Button
              variant="danger"
              data-testid="delete-data-confirm"
              disabled={busy}
              onClick={() => void run()}
            >
              {busy ? 'Deleting…' : 'Confirm delete'}
            </Button>
            <Button variant="ghost" data-testid="delete-data-cancel" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <span className="quiet-note" role="status" aria-live="polite">
              Seven study collections, the profile and both sides of each friend link.
            </span>
          </>
        ) : (
          <Button variant="danger" data-testid="delete-data-open" onClick={() => setConfirming(true)}>
            Delete my data
          </Button>
        )}
      </div>
    </Card>
  )
}
