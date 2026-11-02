/**
 * Phase 3 Firestore layer for notes, snippets and custom lists.
 *
 * Own-data-only paths from `docs/DATA-MODEL.md` §3:
 *   users/{uid}/notes/{problemId}  → markdown, snippet, updatedAt
 *   users/{uid}/lists/{listId}     → title, problemIds, updatedAt
 *
 * Everything rides Firestore's persistent local cache, so notes and lists work
 * offline and sync on reconnect exactly like phase-2 progress. Writes are one
 * document per action, which keeps them inside the generated rules. Notes and
 * lists are personal data, so they require sign-in (the sheet stays browsable
 * signed out, per `rule.md` §5).
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
import { db } from './firebase'
import type { AccountState } from './account'
import {
  LIST_MAX_PROBLEMS,
  LIST_TITLE_LIMIT,
  NOTE_MARKDOWN_LIMIT,
  NOTE_SNIPPET_LIMIT,
  isKnownProblemId,
  listsForBackup,
  newListId,
  noteIsEmpty,
  notesForBackup,
  sanitizeList,
  sanitizeNote,
  type BackupList,
  type BackupNote,
  type ListsById,
  type NotesById,
} from './library'

export type LibraryState = {
  signedIn: boolean
  ready: boolean
  pending: boolean
  busy: boolean
  notes: NotesById
  lists: ListsById
  error: string | null
  notice: string | null
  saveNote: (problemId: string, markdown: string, snippet: string) => Promise<boolean>
  deleteNote: (problemId: string) => Promise<void>
  createList: (title: string, problemId?: string) => Promise<string | null>
  renameList: (listId: string, title: string) => Promise<void>
  deleteList: (listId: string) => Promise<void>
  toggleProblemInList: (listId: string, problemId: string) => Promise<void>
  applyBackup: (notes: BackupNote[], lists: BackupList[]) => Promise<void>
  notesSnapshot: () => BackupNote[]
  listsSnapshot: () => BackupList[]
  dismissError: () => void
  dismissNotice: () => void
}

const DELETE_CHUNK = 400

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

export function useLibrary(account: AccountState): LibraryState {
  const uid = account.status === 'signed-in' ? account.user?.uid ?? null : null
  const firestore = db
  const signedIn = Boolean(uid && firestore)

  const [notes, setNotes] = useState<NotesById>({})
  const [lists, setLists] = useState<ListsById>({})
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const notesRef = useRef<NotesById>({})
  const listsRef = useRef<ListsById>({})
  const pendingRef = useRef({ notes: false, lists: false })

  // A different uid is a different private cache: never show another account's
  // notes or lists, including right after sign-out.
  useEffect(() => {
    notesRef.current = {}
    listsRef.current = {}
    setNotes({})
    setLists({})
    setReady(false)
    setPending(false)
    setBusy(false)
    setError(null)
    setNotice(null)
  }, [uid])

  useEffect(() => {
    if (!uid || !firestore) return
    let disposed = false
    const loaded = { notes: false, lists: false }
    pendingRef.current = { notes: false, lists: false }
    const settle = () => {
      if (disposed) return
      setReady(loaded.notes && loaded.lists)
      setPending(pendingRef.current.notes || pendingRef.current.lists)
    }

    const unsubscribeNotes = onSnapshot(
      collection(firestore, 'users', uid, 'notes'),
      { includeMetadataChanges: true },
      (snapshot) => {
        const next: NotesById = {}
        for (const entry of snapshot.docs) {
          const note = sanitizeNote(entry.id, entry.data())
          if (note) next[entry.id] = note
        }
        notesRef.current = next
        setNotes(next)
        pendingRef.current.notes = snapshot.metadata.hasPendingWrites
        loaded.notes = true
        settle()
      },
      (reason) => {
        loaded.notes = true
        setError(`Could not read your notes: ${messageFrom(reason)}`)
        settle()
      },
    )

    const unsubscribeLists = onSnapshot(
      collection(firestore, 'users', uid, 'lists'),
      { includeMetadataChanges: true },
      (snapshot) => {
        const next: ListsById = {}
        for (const entry of snapshot.docs) {
          const list = sanitizeList(entry.id, entry.data())
          if (list) next[entry.id] = list
        }
        listsRef.current = next
        setLists(next)
        pendingRef.current.lists = snapshot.metadata.hasPendingWrites
        loaded.lists = true
        settle()
      },
      (reason) => {
        loaded.lists = true
        setError(`Could not read your lists: ${messageFrom(reason)}`)
        settle()
      },
    )

    return () => {
      disposed = true
      unsubscribeNotes()
      unsubscribeLists()
    }
  }, [uid, firestore])

  const saveNote = useCallback(
    async (problemId: string, markdown: string, snippet: string) => {
      if (!uid || !firestore) {
        setError('Sign in to write notes — notes sync to your account.')
        return false
      }
      if (!isKnownProblemId(problemId)) {
        setError('That note does not belong to a problem in this catalogue.')
        return false
      }
      setError(null)
      setBusy(true)
      const noteRef = doc(firestore, 'users', uid, 'notes', problemId)
      try {
        if (noteIsEmpty(markdown, snippet)) {
          await deleteDoc(noteRef)
          setNotice('Empty note removed.')
          return true
        }
        await setDoc(noteRef, {
          markdown: markdown.slice(0, NOTE_MARKDOWN_LIMIT),
          snippet: snippet.slice(0, NOTE_SNIPPET_LIMIT),
          updatedAt: serverTimestamp(),
        })
        setNotice('Note saved to your account.')
        return true
      } catch (reason) {
        setError(`Could not save the note: ${messageFrom(reason)}`)
        return false
      } finally {
        setBusy(false)
      }
    },
    [uid, firestore],
  )

  const deleteNote = useCallback(
    async (problemId: string) => {
      if (!uid || !firestore) {
        setError('Sign in to manage notes.')
        return
      }
      setError(null)
      setBusy(true)
      try {
        await deleteDoc(doc(firestore, 'users', uid, 'notes', problemId))
        setNotice('Note deleted.')
      } catch (reason) {
        setError(`Could not delete the note: ${messageFrom(reason)}`)
      } finally {
        setBusy(false)
      }
    },
    [uid, firestore],
  )

  const createList = useCallback(
    async (title: string, problemId?: string) => {
      if (!uid || !firestore) {
        setError('Sign in to create lists — lists sync to your account.')
        return null
      }
      const trimmed = title.trim().slice(0, LIST_TITLE_LIMIT)
      if (trimmed === '') {
        setError('Give the list a title first.')
        return null
      }
      setError(null)
      setBusy(true)
      const listId = newListId()
      const problemIds = problemId && isKnownProblemId(problemId) ? [problemId] : []
      try {
        await setDoc(doc(firestore, 'users', uid, 'lists', listId), {
          title: trimmed,
          problemIds,
          updatedAt: serverTimestamp(),
        })
        setNotice(`Created “${trimmed}”.`)
        return listId
      } catch (reason) {
        setError(`Could not create the list: ${messageFrom(reason)}`)
        return null
      } finally {
        setBusy(false)
      }
    },
    [uid, firestore],
  )

  const renameList = useCallback(
    async (listId: string, title: string) => {
      const trimmed = title.trim().slice(0, LIST_TITLE_LIMIT)
      if (trimmed === '') {
        setError('Give the list a title first.')
        return
      }
      const current = listsRef.current[listId]
      if (!uid || !firestore || !current) {
        setError('Sign in to manage lists, or wait for that list to finish syncing.')
        return
      }
      setError(null)
      setBusy(true)
      try {
        await setDoc(
          doc(firestore, 'users', uid, 'lists', listId),
          { title: trimmed, problemIds: current.problemIds, updatedAt: serverTimestamp() },
          { merge: true },
        )
        setNotice(`Renamed the list to “${trimmed}”.`)
      } catch (reason) {
        setError(`Could not rename the list: ${messageFrom(reason)}`)
      } finally {
        setBusy(false)
      }
    },
    [uid, firestore],
  )

  const deleteList = useCallback(
    async (listId: string) => {
      if (!uid || !firestore) {
        setError('Sign in to manage lists.')
        return
      }
      setError(null)
      setBusy(true)
      try {
        await deleteDoc(doc(firestore, 'users', uid, 'lists', listId))
        setNotice('List deleted.')
      } catch (reason) {
        setError(`Could not delete the list: ${messageFrom(reason)}`)
      } finally {
        setBusy(false)
      }
    },
    [uid, firestore],
  )

  const toggleProblemInList = useCallback(
    async (listId: string, problemId: string) => {
      const current = listsRef.current[listId]
      if (!uid || !firestore || !current) {
        setError('Sign in to manage lists, or wait for that list to finish syncing.')
        return
      }
      const has = current.problemIds.includes(problemId)
      if (!has && current.problemIds.length >= LIST_MAX_PROBLEMS) {
        setError(`A list holds at most ${LIST_MAX_PROBLEMS} problems.`)
        return
      }
      setError(null)
      setBusy(true)
      const problemIds = has
        ? current.problemIds.filter((id) => id !== problemId)
        : [...current.problemIds, problemId]
      try {
        await setDoc(
          doc(firestore, 'users', uid, 'lists', listId),
          { title: current.title, problemIds, updatedAt: serverTimestamp() },
          { merge: true },
        )
      } catch (reason) {
        setError(`Could not update the list: ${messageFrom(reason)}`)
      } finally {
        setBusy(false)
      }
    },
    [uid, firestore],
  )

  /**
   * Restore notes and lists from a validated backup. Called by the import
   * flow after progress has been replaced; throws so the caller can show one
   * error notice for the whole import.
   */
  const applyBackup = useCallback(
    async (backupNotes: BackupNote[], backupLists: BackupList[]) => {
      if (!uid || !firestore) throw new Error('sign in before importing a backup')
      const existingNotes = await getDocs(collection(firestore, 'users', uid, 'notes'))
      const existingLists = await getDocs(collection(firestore, 'users', uid, 'lists'))
      await deleteAll(firestore, [...existingNotes.docs, ...existingLists.docs])
      for (const note of backupNotes) {
        await setDoc(doc(firestore, 'users', uid, 'notes', note.problemId), {
          markdown: note.markdown,
          snippet: note.snippet,
          updatedAt: serverTimestamp(),
        })
      }
      for (const list of backupLists) {
        await setDoc(doc(firestore, 'users', uid, 'lists', list.listId), {
          title: list.title,
          problemIds: list.problemIds,
          updatedAt: serverTimestamp(),
        })
      }
    },
    [uid, firestore],
  )

  const notesSnapshot = useCallback(() => notesForBackup(notesRef.current), [])
  const listsSnapshot = useCallback(() => listsForBackup(listsRef.current), [])

  return {
    signedIn,
    ready,
    pending,
    busy,
    notes,
    lists,
    error,
    notice,
    saveNote,
    deleteNote,
    createList,
    renameList,
    deleteList,
    toggleProblemInList,
    applyBackup,
    notesSnapshot,
    listsSnapshot,
    dismissError: () => setError(null),
    dismissNotice: () => setNotice(null),
  }
}
