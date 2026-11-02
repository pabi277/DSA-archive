/** Phase 5 social data. Summary access is controlled by Firestore rules. */
import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import type { AccountState } from './account'
import type { CloudProgressByTopic } from './cloudProgress'
import { makeFriendSummary, parseFriendSummary, type RankedFriend } from './friends'

function message(reason: unknown) { return reason instanceof Error ? reason.message : String(reason) }
function inviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function useFriends(account: AccountState, entries: CloudProgressByTopic, ready: boolean, today: string) {
  const uid = account.status === 'signed-in' ? account.user?.uid ?? null : null
  const displayName = account.user?.displayName.slice(0, 80) || 'DSA learner'
  const [profile, setProfile] = useState<{ uid: string; sharing: boolean; code: string | null } | null>(null)
  const [idsState, setIds] = useState<{ uid: string; ids: string[] } | null>(null)
  const [summariesState, setSummariesState] = useState<{ uid: string; values: Record<string, RankedFriend> } | null>(null)
  const summaries = summariesState?.uid === uid ? summariesState.values : {}
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ids = idsState?.uid === uid ? idsState.ids : []
  const profileCurrent = profile?.uid === uid ? profile : null
  const idsKey = ids.join('\u0000')
  const summary = useMemo(() => makeFriendSummary(displayName, entries, today), [displayName, entries, today])

  useEffect(() => {
    setProfile(null); setIds(null); setSummariesState(null); setError(null)
    if (!uid || !db) return
    const u1 = onSnapshot(doc(db, 'users', uid), (snap) => {
      const p = snap.data()
      if (p) setProfile({ uid, sharing: p.shareSummary === true, code: typeof p.friendCode === 'string' ? p.friendCode : null })
    }, (e) => setError(message(e)))
    const u2 = onSnapshot(collection(db, 'users', uid, 'friends'), (snap) => {
      setIds({ uid, ids: snap.docs.map((item) => item.id).sort() })
    }, (e) => setError(message(e)))
    return () => { u1(); u2() }
  }, [uid])

  useEffect(() => {
    setSummariesState(null)
    if (!uid || !db || !idsKey) return
    let active = true
    const cleanups = idsKey.split('\u0000').map((friendUid) => {
      let unsubscribe: (() => void) | undefined
      let timer: number | undefined
      const listen = () => {
        unsubscribe = onSnapshot(doc(db!, 'users', friendUid, 'public', 'summary'), { includeMetadataChanges: true }, (snap) => {
          if (!active) return
          const parsed = !snap.metadata.fromCache && snap.exists() ? parseFriendSummary(snap.data()) : null
          setSummariesState((old) => {
            const next = { ...(old?.uid === uid ? old.values : {}) }; delete next[friendUid]
            if (parsed) next[friendUid] = { uid: friendUid, summary: parsed }
            return { uid, values: next }
          })
        }, () => {
          if (!active) return
          setSummariesState((old) => { const next = { ...(old?.uid === uid ? old.values : {}) }; delete next[friendUid]; return { uid, values: next } })
          // Permission errors terminate a Firestore listener. Retry only failed
          // listeners so newly enabled sharing becomes visible without polling
          // every successfully subscribed friend.
          timer = window.setTimeout(listen, 60_000)
        })
      }
      listen()
      return () => { unsubscribe?.(); window.clearTimeout(timer) }
    })
    return () => { active = false; cleanups.forEach((cleanup) => cleanup()) }
  }, [uid, idsKey])

  useEffect(() => {
    if (!uid || !db || !ready || !profileCurrent?.sharing) return
    let active = true
    void setDoc(doc(db, 'users', uid, 'public', 'summary'), summary).catch((e) => {
      if (active) setError(`Could not publish summary: ${message(e)}`)
    })
    return () => { active = false }
  }, [uid, ready, profileCurrent?.sharing, summary])

  async function perform(action: () => Promise<void>) {
    setBusy(true); setError(null)
    try { await action() } catch (e) { setError(message(e)) } finally { setBusy(false) }
  }
  function createInvite() {
    if (!uid || !db) return
    const firestore = db
    void perform(async () => {
      const code = inviteCode()
      const batch = writeBatch(firestore)
      batch.set(doc(firestore, 'invites', code), { uid, createdAt: serverTimestamp() })
      if (profileCurrent?.code) batch.delete(doc(firestore, 'invites', profileCurrent.code))
      batch.set(doc(firestore, 'users', uid), { friendCode: code, updatedAt: serverTimestamp() }, { merge: true })
      await batch.commit()
    })
  }
  function addFriend(input: string) {
    if (!uid || !db) return
    const firestore = db
    void perform(async () => {
      const code = input.trim().toLowerCase()
      if (!/^[a-f0-9]{32}$/.test(code)) throw new Error('Enter a valid 32-character invite code.')
      const invite = await getDoc(doc(firestore, 'invites', code))
      const target = invite.data()?.uid
      if (typeof target !== 'string' || !target || target === uid) throw new Error('Invite not found or belongs to you.')
      if (ids.includes(target)) throw new Error('This person is already in your friends list.')
      const batch = writeBatch(firestore)
      const friend = { code, addedAt: serverTimestamp() }
      batch.set(doc(firestore, 'users', uid, 'friends', target), friend)
      batch.set(doc(firestore, 'users', target, 'friends', uid), friend)
      await batch.commit()
    })
  }
  function removeFriend(friendUid: string) {
    if (!uid || !db) return
    const firestore = db
    void perform(async () => {
      const batch = writeBatch(firestore)
      batch.delete(doc(firestore, 'users', uid, 'friends', friendUid))
      batch.delete(doc(firestore, 'users', friendUid, 'friends', uid))
      await batch.commit()
    })
  }
  function setSharing(sharing: boolean) {
    if (!uid || !db) return
    const firestore = db
    void perform(async () => {
      await setDoc(doc(firestore, 'users', uid), { shareSummary: sharing, updatedAt: serverTimestamp() }, { merge: true })
      if (!sharing) await deleteDoc(doc(firestore, 'users', uid, 'public', 'summary'))
    })
  }
  return { uid, ids, summaries, profile: profileCurrent, summary, busy, error, createInvite, addFriend, removeFriend, setSharing }
}
export type FriendsState = ReturnType<typeof useFriends>
