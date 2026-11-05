/**
 * Phase v2-09 — the "Delete my data" contract.
 *
 * `docs/phases-v2/09-pwa-accessibility-hardening/PLAN.md` §7 names exactly what
 * a deletion must remove: `progressByTopic`, `snippets`, `quizResults`, `lists`,
 * `plans`, the profile and friends docs. Phases v2-04 and v2-05 both deferred
 * their deletion tests here, so this module owns the whole list in one place.
 *
 * Rules v9 already allow the owner to delete every one of these paths; no rule
 * was weakened for this feature (see tools/firestore-rules.test.mjs). We also
 * remove the reciprocal `users/{friendUid}/friends/{myUid}` links, the invite
 * capability and the opt-in public summary, because a "deleted" account that
 * still appears in a friend's list is not deleted. All of those are allowed by
 * the existing rules for the same person.
 *
 * This module lives in the on-demand `assets/account-*` add-on chunk: it is
 * never precached, and a destructive account action is impossible offline on a
 * first launch anyway (it needs a signed-in Firestore session).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore'

/** The seven named Firestore shapes, in the order the plan lists them. */
export const DELETION_COLLECTIONS = [
  'progressByTopic',
  'snippets',
  'quizResults',
  'lists',
  'plans',
  'friends',
] as const

/**
 * Guest study records on this device. Device *preferences* are kept
 * (`dsa-archive.settings.v1` holds theme, hideDone and targets). Watched-video
 * flags are learning history, not a preference, so they go too. The literal is
 * repeated rather than importing WATCH_STORAGE_KEY from `src/theatre/video.ts`:
 * this module is an on-demand add-on chunk and must never pull theatre code in.
 */
export const LOCAL_STUDY_KEYS = [
  'dsa-archive.progress.v1',
  'dsa-archive.progress.updatedAt.v1',
  'dsa-archive.quiz.v1',
  'dsa-archive.detectors.v1',
  'dsa-archive.speed.v1',
  'dsa-archive.watch.v1',
] as const

/** Firestore caps a batch; the other stores in this repo use the same 400. */
const BATCH_SIZE = 400

export type DeleteReport = {
  documents: number
  /** Human-readable path list for the confirmation copy and the CI test. */
  paths: string[]
}

export function clearLocalStudyData(storage: Pick<Storage, 'removeItem'> | undefined = globalThis.localStorage) {
  if (!storage) return
  for (const key of LOCAL_STUDY_KEYS) {
    try {
      storage.removeItem(key)
    } catch {
      // Restricted storage environments still get the cloud deletion.
    }
  }
}

/**
 * Delete every document the account owns, then the profile itself. The profile
 * goes last: Firestore listeners in other tabs can still read subcollections
 * until that final commit. The caller signs out immediately afterwards so no
 * listener can recreate a profile document.
 */
export async function deleteMyData(firestore: Firestore, uid: string): Promise<DeleteReport> {
  const refs: DocumentReference[] = []

  // The invite capability hangs off the profile's friendCode; read it before
  // the profile is deleted. Reciprocal friend links need the friend uids.
  const profileSnap = await getDoc(doc(firestore, 'users', uid))
  const profile = profileSnap.data() ?? {}
  const friendCode = typeof profile.friendCode === 'string' ? profile.friendCode : null
  const friendSnap = await getDocs(collection(firestore, 'users', uid, 'friends'))
  const friendUids = friendSnap.docs.map((entry) => entry.id)

  for (const name of DELETION_COLLECTIONS) {
    const snapshot = await getDocs(collection(firestore, 'users', uid, name))
    for (const entry of snapshot.docs) refs.push(entry.ref)
  }

  // A summary is a known document id; listing users/{uid}/public is deliberately
  // denied by the rules, so delete the path directly instead of querying it.
  refs.push(doc(firestore, 'users', uid, 'public', 'summary'))
  for (const friendUid of friendUids) {
    refs.push(doc(firestore, 'users', friendUid, 'friends', uid))
  }
  if (friendCode && /^[a-f0-9]{32}$/.test(friendCode)) {
    refs.push(doc(firestore, 'invites', friendCode))
  }
  // Profile last.
  refs.push(doc(firestore, 'users', uid))

  for (let index = 0; index < refs.length; index += BATCH_SIZE) {
    const batch = writeBatch(firestore)
    for (const ref of refs.slice(index, index + BATCH_SIZE)) batch.delete(ref)
    await batch.commit()
  }

  return {
    documents: refs.length,
    paths: [...DELETION_COLLECTIONS, 'public/summary', 'friends (reciprocal)', 'invites', 'profile'],
  }
}
