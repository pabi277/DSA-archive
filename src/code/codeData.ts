/**
 * Phase v2-04 Firestore layer for saved solutions.
 *
 * Own-data-only path from `docs/DATA-MODEL.md` §3:
 *   users/{uid}/snippets/{problemId}  → language, code, notes, verdict?, updatedAt
 *
 * Everything rides Firestore's persistent local cache, so code works offline
 * and syncs on reconnect exactly like progress. Writes replace one whole
 * document (never a merge), which keeps an absent `verdict` absent and fits
 * rules v6. Saved code is personal data, so it requires sign-in (the sheet
 * stays browsable signed out, per `rule.md` §5).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { AccountState } from '../account'
import { isKnownProblemId } from '../library'
import {
  clampDraft,
  sanitizeSnippet,
  snippetIsEmpty,
  snippetsForBackup,
  type BackupSnippet,
  type SnippetDraft,
  type SnippetsById,
} from './codeStore'

export type CodeState = {
  signedIn: boolean
  ready: boolean
  /** True while a write is still waiting for the server (offline queue). */
  pending: boolean
  busy: boolean
  online: boolean
  snippets: SnippetsById
  error: string | null
  notice: string | null
  saveSnippet: (problemId: string, draft: SnippetDraft) => Promise<boolean>
  deleteSnippet: (problemId: string) => Promise<void>
  applyBackup: (snippets: BackupSnippet[]) => Promise<void>
  snippetsSnapshot: () => BackupSnippet[]
  dismissError: () => void
  dismissNotice: () => void
}

const DELETE_CHUNK = 400

function snippetPayload(draft: SnippetDraft) {
  return {
    language: draft.language,
    code: draft.code,
    notes: draft.notes,
    ...(draft.verdict ? { verdict: draft.verdict } : {}),
    // Phase v2-06 stamps ride in this document; rules v8 caps them at 30 × 140.
    ...(draft.moments && draft.moments.length > 0 ? { moments: draft.moments } : {}),
    updatedAt: serverTimestamp(),
  }
}

function messageFrom(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason)
}

async function deleteAll(firestore: Firestore, snapshots: QueryDocumentSnapshot[]) {
  for (let index = 0; index < snapshots.length; index += DELETE_CHUNK) {
    const batch = writeBatch(firestore)
    for (const entry of snapshots.slice(index, index + DELETE_CHUNK)) {
      batch.delete(entry.ref)
    }
    await batch.commit()
  }
}

export function useCode(account: AccountState): CodeState {
  const uid = account.status === 'signed-in' ? account.user?.uid ?? null : null
  const firestore = db
  const signedIn = Boolean(uid && firestore)

  const [snippets, setSnippets] = useState<SnippetsById>({})
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const snippetsRef = useRef<SnippetsById>({})

  // Read per render: every moment the save status can change (a write, a
  // snapshot, a reconnect flush) already re-renders this hook, so a live
  // `navigator.onLine` read is always fresh enough — no listener state.
  const online = typeof navigator === 'undefined' ? true : navigator.onLine

  // A different uid is a different private cache: never show another
  // account's code, including right after sign-out.
  useEffect(() => {
    snippetsRef.current = {}
    setSnippets({})
    setReady(false)
    setPending(false)
    setBusy(false)
    setError(null)
    setNotice(null)
  }, [uid])

  useEffect(() => {
    if (!uid || !firestore) return
    const unsubscribe = onSnapshot(
      collection(firestore, 'users', uid, 'snippets'),
      { includeMetadataChanges: true },
      (snapshot) => {
        const next: SnippetsById = {}
        for (const entry of snapshot.docs) {
          const snippet = sanitizeSnippet(entry.id, entry.data())
          if (snippet) next[entry.id] = snippet
        }
        snippetsRef.current = next
        setSnippets(next)
        setPending(snapshot.metadata.hasPendingWrites)
        setReady(true)
      },
      (reason) => {
        setError(`Saved code could not load: ${messageFrom(reason)}`)
        setReady(true)
      },
    )
    return unsubscribe
  }, [uid, firestore])

  const saveSnippet = useCallback(
    async (problemId: string, draft: SnippetDraft) => {
      if (!uid || !firestore) {
        setError('Sign in to save code.')
        return false
      }
      if (!isKnownProblemId(problemId)) {
        setError('That problem is not in this catalogue.')
        return false
      }
      setError(null)
      const snippetRef = doc(firestore, 'users', uid, 'snippets', problemId)
      const clean = clampDraft(draft)
      // Fire-and-forget, like progress writes: the snapshot listener applies
      // the local write immediately (latency compensation) and its
      // `hasPendingWrites` flag drives the Saving/Offline status. Awaiting
      // the server here would hang the editor until reconnect when offline.
      const empty = snippetIsEmpty(clean.code, clean.notes, clean.moments ?? [])
      const write = empty ? deleteDoc(snippetRef) : setDoc(snippetRef, snippetPayload(clean))
      void write.catch((reason) => {
        setError(`Could not save code: ${messageFrom(reason)}`)
      })
      setNotice(
        empty
          ? 'Empty solution removed.'
          : clean.moments && clean.moments.length > 0
            ? 'Saved with your stamps.'
            : 'Code saved to your account.',
      )
      return true
    },
    [uid, firestore],
  )

  const deleteSnippet = useCallback(
    async (problemId: string) => {
      if (!uid || !firestore) {
        setError('Sign in to manage saved code.')
        return
      }
      setError(null)
      void deleteDoc(doc(firestore, 'users', uid, 'snippets', problemId)).catch((reason) => {
        setError(`Could not delete code: ${messageFrom(reason)}`)
      })
      setNotice('Saved code deleted.')
    },
    [uid, firestore],
  )

  /**
   * Restore saved solutions from a validated backup. Called by the import
   * flow after progress has been replaced; throws so the caller can show one
   * error notice for the whole import.
   */
  const applyBackup = useCallback(
    async (backupSnippets: BackupSnippet[]) => {
      if (!uid || !firestore) throw new Error('sign in before importing a backup')
      setBusy(true)
      try {
        const existing = await getDocs(collection(firestore, 'users', uid, 'snippets'))
        await deleteAll(firestore, [...existing.docs])
        for (const snippet of backupSnippets) {
          await setDoc(doc(firestore, 'users', uid, 'snippets', snippet.problemId), snippetPayload(snippet))
        }
      } finally {
        setBusy(false)
      }
    },
    [uid, firestore],
  )

  const snippetsSnapshot = useCallback(() => snippetsForBackup(snippetsRef.current), [])

  return {
    signedIn,
    ready,
    pending,
    busy,
    online,
    snippets,
    error,
    notice,
    saveSnippet,
    deleteSnippet,
    applyBackup,
    snippetsSnapshot,
    dismissError: () => setError(null),
    dismissNotice: () => setNotice(null),
  }
}
