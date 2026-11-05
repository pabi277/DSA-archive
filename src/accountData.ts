/**
 * Phase 2 account data: profile, offline-first Firestore progress, explicit
 * guest→account merge, and JSON backup. This hook is the only place that
 * writes user data; the sheet stays browsable without it.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import type { AccountState } from './account'
import type { LibraryState } from './libraryData'
import type { CodeState } from './code/codeData'
import { db } from './firebase'
import {
  applyProfileSettings,
  applyProfileTargets,
  getSettingsSnapshot,
  subscribeSettings,
  useSettings,
  type Settings,
} from './settings'
import {
  clearProgress,
  countProgressRows,
  getGuestTimestamps,
  getProgressSnapshot,
  markBookmarked as markGuestBookmarked,
  markDone as markGuestDone,
  markOutcome as markGuestOutcome,
  useProgress,
  type Outcome,
  type ProblemProgress,
  type ProgressByTopic,
} from './progress'
import {
  cloudShardFromFirestore,
  countCloudRows,
  nextCloudEntry,
  nextRevisionEntry,
  planGuestMerge,
  toUiProgress,
  type CloudProgressByTopic,
  type CloudProgressEntry,
  type CloudWrite,
  type MergePlan,
} from './cloudProgress'
import type { Backup, BackupCounts } from './backup'
import { DEFAULT_DAILY_GOAL, clampGoal } from './planner'
import type { PlannerState } from './plannerData'
import { clearGuestQuizResults, type QuizDataState } from './quiz/results'

export type SyncState = 'local' | 'local-offline' | 'syncing' | 'synced' | 'pending' | 'offline' | 'error'
export type MergeProposal = Omit<MergePlan, 'writes'>
export type ImportPreview = { backup: Backup; counts: BackupCounts; warnings: string[] }

export type AccountData = {
  account: AccountState
  settings: Settings
  progress: ProgressByTopic
  syncState: SyncState
  syncLabel: string
  cloudReady: boolean
  profileReady: boolean
  cloudRows: number
  guestRows: number
  /** Phase 4: rich per-problem entries (with fd/lr/rc) for planner + stats. */
  entries: CloudProgressByTopic
  dailyGoal: number
  setDailyGoal: (goal: number) => void
  markDone: (topicId: string, problemId: string) => void
  markRevised: (topicId: string, problemId: string) => void
  mergeProposal: MergeProposal | null
  importPreview: ImportPreview | null
  error: string | null
  notice: string | null
  busy: boolean
  toggleStatus: (topicId: string, problemId: string) => void
  toggleBookmark: (topicId: string, problemId: string) => void
  setOutcome: (topicId: string, problemId: string, outcome: Outcome) => void
  markDoneWithOutcome: (topicId: string, problemId: string, outcome: Outcome) => void
  clearGuestProgress: () => void
  mergeGuestProgress: () => void
  keepCloudProgress: () => void
  exportBackup: () => Promise<void>
  chooseImportFile: (file: File) => Promise<void>
  cancelImport: () => void
  confirmImport: () => void
  dismissError: () => void
  dismissNotice: () => void
}

function messageFrom(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason)
}

function syncLabelFor(state: SyncState) {
  switch (state) {
    case 'local':
      return 'Local only'
    case 'local-offline':
      return 'Offline — local only'
    case 'syncing':
      return 'Connecting…'
    case 'synced':
      return 'Synced'
    case 'pending':
      return 'Changes pending'
    case 'offline':
      return 'Offline — changes will sync'
    case 'error':
      return 'Sync error'
  }
}

async function commitWrite(firestore: Firestore, uid: string, write: CloudWrite) {
  const shard = doc(firestore, 'users', uid, 'progressByTopic', write.topicId)
  const payload = {
    [write.problemId]: write.entry ?? deleteField(),
    updatedAt: serverTimestamp(),
  }
  await setDoc(shard, payload, { merge: true })
}

export function useAccountData(
  account: AccountState,
  library: LibraryState,
  code: CodeState,
  planner: PlannerState,
  quiz: QuizDataState,
): AccountData {
  const settings = useSettings()
  const guestProgress = useProgress()
  const uid = account.user?.uid ?? null
  const signedIn = account.status === 'signed-in' && Boolean(uid && db)

  const [cloud, setCloud] = useState<CloudProgressByTopic>({})
  const cloudRef = useRef<CloudProgressByTopic>({})
  const [cloudTimes, setCloudTimes] = useState<Record<string, number>>({})
  const [cloudReady, setCloudReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [pendingWrites, setPendingWrites] = useState(false)
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [dataError, setDataError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [mergeProposal, setMergeProposal] = useState<MergeProposal | null>(null)
  const [mergeHandled, setMergeHandled] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [dailyGoal, setDailyGoalState] = useState(DEFAULT_DAILY_GOAL)
  const [busy, setBusy] = useState(false)

  const setCloudState = (next: CloudProgressByTopic) => {
    cloudRef.current = next
    setCloud(next)
  }

  useEffect(() => {
    const update = () => setOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  // A different uid is a different private cache. Never leak rows across
  // accounts, including on sign-out.
  useEffect(() => {
    setCloudState({})
    setCloudTimes({})
    setCloudReady(false)
    setProfileReady(false)
    setPendingWrites(false)
    setDataError(null)
    setNotice(null)
    setMergeProposal(null)
    setMergeHandled(false)
    setImportPreview(null)
    setDailyGoalState(DEFAULT_DAILY_GOAL)
  }, [uid])

  // Profile creation, cloud→local settings, and local→cloud settings.
  useEffect(() => {
    const firestore = db
    const currentUser = account.user
    if (!uid || !firestore || !currentUser) return
    let disposed = false
    let unsubscribeProfile: (() => void) | undefined
    let unsubscribeSettings: (() => void) | undefined
    const profileRef = doc(firestore, 'users', uid)

    async function setup() {
      try {
        let snapshot
        try {
          snapshot = await getDoc(profileRef)
        } catch (getError) {
          const text = messageFrom(getError).toLowerCase()
          if (text.includes('offline') || text.includes('unavailable')) {
            snapshot = await getDocFromCache(profileRef)
          } else {
            throw getError
          }
        }
        const local = getSettingsSnapshot()
        if (!snapshot.exists()) {
          await setDoc(profileRef, {
            uid,
            displayName: currentUser!.displayName.slice(0, 80) || 'DSA learner',
            photoURL: currentUser!.photoURL ? currentUser!.photoURL.slice(0, 300) : null,
            dailyGoal: DEFAULT_DAILY_GOAL,
            theme: local.theme,
            hideDone: local.hideDone,
            targetDate: local.targetDate,
            targetListId: local.targetListId,
            shareSummary: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        } else {
          const data = snapshot.data()
          if (data) {
            applyProfileSettings(data.theme === 'light' ? 'light' : 'dark', data.hideDone === true)
            applyProfileTargets(data.targetDate, data.targetListId)
          }
        }
        if (disposed) return
        setProfileReady(true)
        unsubscribeProfile = onSnapshot(profileRef, (next) => {
          const data = next.data()
          if (!data) return
          applyProfileSettings(data.theme === 'light' ? 'light' : 'dark', data.hideDone === true)
          applyProfileTargets(data.targetDate, data.targetListId)
          setDailyGoalState(clampGoal(typeof data.dailyGoal === 'number' ? data.dailyGoal : DEFAULT_DAILY_GOAL))
        })
        unsubscribeSettings = subscribeSettings((source) => {
          if (source !== 'local') return
          const next = getSettingsSnapshot()
          void setDoc(
            profileRef,
            {
              theme: next.theme,
              hideDone: next.hideDone,
              targetDate: next.targetDate,
              targetListId: next.targetListId,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ).catch((reason) => setDataError(`Could not save settings: ${messageFrom(reason)}`))
        })
      } catch (reason) {
        if (!disposed) setDataError(`Could not open the account profile: ${messageFrom(reason)}`)
      }
    }

    void setup()
    return () => {
      disposed = true
      unsubscribeProfile?.()
      unsubscribeSettings?.()
    }
    // The user object is captured once per sign-in; uid is the identity key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  // One listener over the ≤20 topic-sharded docs, with metadata so the UI can
  // show pending/offline writes. Persistent IndexedDB cache is in firebase.ts.
  useEffect(() => {
    const firestore = db
    if (!uid || !firestore) return
    setCloudReady(false)
    const query = collection(firestore, 'users', uid, 'progressByTopic')
    const unsubscribe = onSnapshot(
      query,
      { includeMetadataChanges: true },
      (snapshot) => {
        const nextCloud: CloudProgressByTopic = {}
        const nextTimes: Record<string, number> = {}
        for (const shard of snapshot.docs) {
          const data = shard.data() as Record<string, unknown>
          nextCloud[shard.id] = cloudShardFromFirestore(data)
          const stamp = data.updatedAt as { toMillis?: () => number } | null | undefined
          nextTimes[shard.id] = stamp?.toMillis?.() ?? 0
        }
        setCloudState(nextCloud)
        setCloudTimes(nextTimes)
        setPendingWrites(snapshot.metadata.hasPendingWrites)
        setCloudReady(true)
      },
      (reason) => {
        setDataError(`Could not read cloud progress: ${messageFrom(reason)}`)
        setCloudReady(true)
      },
    )
    return unsubscribe
  }, [uid])

  // The merge is ALWAYS shown first; no guest row is written silently.
  useEffect(() => {
    if (account.status !== 'signed-in' || !cloudReady || mergeHandled) {
      setMergeProposal(null)
      return
    }
    const plan = planGuestMerge(
      getProgressSnapshot(),
      cloud,
      getGuestTimestamps(),
      cloudTimes,
      new Date().toISOString(),
    )
    if (plan.guestRows === 0) {
      setMergeProposal(null)
      return
    }
    setMergeProposal({
      guestRows: plan.guestRows,
      cloudRows: plan.cloudRows,
      guestWins: plan.guestWins,
      cloudWins: plan.cloudWins,
      topicCount: plan.topicCount,
    })
  }, [account.status, cloudReady, cloud, cloudTimes, guestProgress, mergeHandled])

  const progress = useMemo<ProgressByTopic>(
    () => (signedIn ? toUiProgress(cloud) : guestProgress),
    [signedIn, cloud, guestProgress],
  )
  const syncState: SyncState = dataError
    ? 'error'
    : !signedIn
      ? online
        ? 'local'
        : 'local-offline'
      : !online
        ? 'offline'
        : pendingWrites
          ? 'pending'
          : cloudReady
            ? 'synced'
            : 'syncing'
  const error = account.error ?? dataError

  function writeEntry(
    topicId: string,
    problemId: string,
    next: ProblemProgress,
    field: 's' | 'b' | 'o',
  ) {
    const firestore = db
    if (!signedIn || !uid || !firestore) {
      if (field === 's') markGuestDone(topicId, problemId)
      else if (field === 'b') markGuestBookmarked(topicId, problemId)
      else if (next.o) markGuestOutcome(topicId, problemId, next.o)
      return
    }
    const now = new Date().toISOString()
    const old = cloudRef.current[topicId]?.[problemId]
    const entry = nextCloudEntry(old, next, field, now)
    setCloudState({
      ...cloudRef.current,
      [topicId]: { ...(cloudRef.current[topicId] ?? {}), [problemId]: entry },
    })
    setPendingWrites(true)
    void commitWrite(firestore, uid, { topicId, problemId, entry }).catch((reason) => {
      setDataError(`Could not save progress: ${messageFrom(reason)}`)
    })
  }

  const toggleStatus = (topicId: string, problemId: string) => {
    const current = progress[topicId]?.[problemId] ?? { s: 'todo', b: false }
    writeEntry(topicId, problemId, { s: current.s === 'done' ? 'todo' : 'done', b: current.b }, 's')
  }

  /** 4.1/4.2 — idempotent "solved" so Today can tick a row without toggling. */
  const markDone = (topicId: string, problemId: string) => {
    const current = progress[topicId]?.[problemId] ?? { s: 'todo', b: false }
    if (current.s === 'done') return
    writeEntry(topicId, problemId, { s: 'done', b: current.b }, 's')
  }

  /** 4.2 one-tap revised: bump `rc`, stamp `lr`, keep the row solved. */
  const markRevised = (topicId: string, problemId: string) => {
    const firestore = db
    if (!signedIn || !uid || !firestore) {
      setDataError('Sign in to use the revision queue — it follows your account.')
      return
    }
    const now = new Date().toISOString()
    const old = cloudRef.current[topicId]?.[problemId]
    const entry = nextRevisionEntry(old as CloudProgressEntry | undefined, now)
    setCloudState({
      ...cloudRef.current,
      [topicId]: { ...(cloudRef.current[topicId] ?? {}), [problemId]: entry },
    })
    setPendingWrites(true)
    void commitWrite(firestore, uid, { topicId, problemId, entry }).catch((reason) => {
      setDataError(`Could not save the revision: ${messageFrom(reason)}`)
    })
    setNotice('Marked as revised — next review scheduled further out.')
  }

  const setDailyGoal = (goal: number) => {
    const next = clampGoal(goal)
    setDailyGoalState(next)
    const firestore = db
    if (!uid || !firestore) return
    void setDoc(
      doc(firestore, 'users', uid),
      { dailyGoal: next, updatedAt: serverTimestamp() },
      { merge: true },
    ).catch((reason) => setDataError(`Could not save the daily goal: ${messageFrom(reason)}`))
  }

  const toggleBookmark = (topicId: string, problemId: string) => {
    const current = progress[topicId]?.[problemId] ?? { s: 'todo', b: false }
    writeEntry(topicId, problemId, { ...current, b: !current.b }, 'b')
  }

  const setOutcome = (topicId: string, problemId: string, outcome: Outcome) => {
    const current = progress[topicId]?.[problemId] ?? { s: 'todo', b: false }
    if (current.s !== 'done') return
    writeEntry(topicId, problemId, { ...current, o: outcome }, 'o')
  }

  const markDoneWithOutcome = (topicId: string, problemId: string, outcome: Outcome) => {
    const current = progress[topicId]?.[problemId] ?? { s: 'todo', b: false }
    const firestore = db
    if (!signedIn || !uid || !firestore) {
      if (current.s !== 'done') markGuestDone(topicId, problemId)
      markGuestOutcome(topicId, problemId, outcome)
      return
    }
    const now = new Date().toISOString()
    const old = cloudRef.current[topicId]?.[problemId]
    const entry: CloudProgressEntry = {
      ...nextCloudEntry(old, { s: 'done', b: current.b, o: outcome }, 's', now),
      o: outcome,
    }
    setCloudState({
      ...cloudRef.current,
      [topicId]: { ...(cloudRef.current[topicId] ?? {}), [problemId]: entry },
    })
    setPendingWrites(true)
    void commitWrite(firestore, uid, { topicId, problemId, entry }).catch((reason) => {
      setDataError(`Could not save progress: ${messageFrom(reason)}`)
    })
  }

  const clearGuestProgress = () => {
    clearProgress()
    clearGuestQuizResults()
    setNotice('Guest rows cleared from this device.')
  }

  const mergeGuestProgress = () => {
    const firestore = db
    if (!uid || !firestore || !mergeProposal) return
    setBusy(true)
    setDataError(null)
    const plan = planGuestMerge(
      getProgressSnapshot(),
      cloudRef.current,
      getGuestTimestamps(),
      cloudTimes,
      new Date().toISOString(),
    )
    void (async () => {
      try {
        for (const write of plan.writes) await commitWrite(firestore, uid, write)
        clearProgress()
        setMergeHandled(true)
        setMergeProposal(null)
        setNotice(
          `Merged ${plan.guestRows} guest row${plan.guestRows === 1 ? '' : 's'} on ${plan.guestWins} newer topic${plan.guestWins === 1 ? '' : 's'}.`,
        )
      } catch (reason) {
        setDataError(`Guest merge failed: ${messageFrom(reason)}`)
      } finally {
        setBusy(false)
      }
    })()
  }

  const keepCloudProgress = () => {
    clearProgress()
    setMergeHandled(true)
    setMergeProposal(null)
    setNotice('Kept cloud progress and discarded the guest rows on this device.')
  }

  const exportBackup = async () => {
    if (!signedIn || !uid || !db || !account.user || !cloudReady) {
      setDataError('Wait for the signed-in sheet to finish syncing before exporting.')
      return
    }
    if (!library.ready || !code.ready || !quiz.ready) {
      setDataError('Wait for lists, saved code and quiz scores to finish syncing before exporting.')
      return
    }
    setBusy(true)
    try {
      const { createBackup } = await import('./backup')
      // Plan days are read on demand: the app subscribes to today only, and a
      // backup must still carry the whole planner history.
      const plans = await planner.collectPlansForBackup()
      const snippets = code.snippetsSnapshot()
      const quizResults = quiz.resultsSnapshot()
      const text = createBackup({
        account: { displayName: account.user.displayName, email: account.user.email },
        settings: getSettingsSnapshot(),
        progressByTopic: cloudRef.current,
        snippets,
        lists: library.listsSnapshot(),
        plans,
        quizResults,
        dailyGoal,
      })
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `dsa-archive-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
      setNotice(
        `Backup exported with ${countCloudRows(cloudRef.current)} progress rows, ${snippets.length} saved solution${snippets.length === 1 ? '' : 's'}, ${plans.length} plan day${plans.length === 1 ? '' : 's'} and ${quizResults.length} quiz result${quizResults.length === 1 ? '' : 's'}.`,
      )
    } catch (reason) {
      setDataError(`Could not export the backup: ${messageFrom(reason)}`)
    } finally {
      setBusy(false)
    }
  }

  const chooseImportFile = async (file: File) => {
    setDataError(null)
    setNotice(null)
    setImportPreview(null)
    try {
      const { parseBackup } = await import('./backup')
      const parsed = parseBackup(await file.text())
      setImportPreview(parsed)
    } catch (reason) {
      setDataError(`Invalid backup: ${messageFrom(reason)}`)
    }
  }

  const cancelImport = () => {
    setImportPreview(null)
    setDataError(null)
  }

  const confirmImport = () => {
    const firestore = db
    if (!uid || !firestore || !importPreview || !profileReady) {
      setDataError('Wait for the account profile to finish syncing before importing.')
      return
    }
    const preview = importPreview
    setBusy(true)
    setDataError(null)
    void (async () => {
      try {
        // Replace, rather than union: first delete every existing shard, then
        // write the backup one problem key per Firestore write (rules-safe).
        const existing = await getDocs(collection(firestore, 'users', uid, 'progressByTopic'))
        if (existing.docs.length > 0) {
          const batch = writeBatch(firestore)
          for (const shard of existing.docs) batch.delete(shard.ref)
          await batch.commit()
        }
        for (const [topicId, shard] of Object.entries(preview.backup.progressByTopic)) {
          for (const [problemId, entry] of Object.entries(shard)) {
            await commitWrite(firestore, uid, { topicId, problemId, entry })
          }
        }
        await setDoc(
          doc(firestore, 'users', uid),
          {
            dailyGoal: preview.backup.profile.dailyGoal,
            theme: preview.backup.profile.theme,
            hideDone: preview.backup.profile.hideDone,
            targetDate: preview.backup.profile.targetDate ?? null,
            targetListId: preview.backup.profile.targetListId ?? null,
            shareSummary: false,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
        applyProfileSettings(
          preview.backup.profile.theme,
          preview.backup.profile.hideDone,
          preview.backup.profile.largeText,
        )
        applyProfileTargets(preview.backup.profile.targetDate, preview.backup.profile.targetListId)
        setDailyGoalState(clampGoal(preview.backup.profile.dailyGoal))
        // Saved solutions, lists and plan days ride the backup; a schema v1
        // file restores none of them, which clears them as its preview says.
        // Schema ≤4 files arrive here already migrated to `snippets`.
        await library.applyBackup(preview.backup.lists)
        await code.applyBackup(preview.backup.snippets)
        await planner.applyPlanBackup(preview.backup.plans)
        await quiz.applyBackup(preview.backup.quizResults)
        setImportPreview(null)
        setNotice(
          `Imported ${preview.counts.rows} row${preview.counts.rows === 1 ? '' : 's'} across ${preview.counts.topics} topic${preview.counts.topics === 1 ? '' : 's'} · ${preview.counts.snippets} saved solution${preview.counts.snippets === 1 ? '' : 's'} · ${preview.counts.lists} list${preview.counts.lists === 1 ? '' : 's'} · ${preview.counts.plans} plan day${preview.counts.plans === 1 ? '' : 's'} · ${preview.counts.quizResults} quiz result${preview.counts.quizResults === 1 ? '' : 's'}.`,
        )
      } catch (reason) {
        setDataError(`Import failed: ${messageFrom(reason)}`)
      } finally {
        setBusy(false)
      }
    })()
  }

  const dismissError = () => {
    account.clearError()
    setDataError(null)
  }

  const dismissNotice = () => setNotice(null)

  return {
    account,
    settings,
    progress,
    syncState,
    syncLabel: syncLabelFor(syncState),
    cloudReady,
    profileReady,
    cloudRows: countCloudRows(cloud),
    guestRows: countProgressRows(guestProgress),
    entries: signedIn ? cloud : {},
    dailyGoal,
    setDailyGoal,
    markDone,
    markRevised,
    mergeProposal,
    importPreview,
    error,
    notice,
    busy,
    toggleStatus,
    toggleBookmark,
    setOutcome,
    markDoneWithOutcome,
    clearGuestProgress,
    mergeGuestProgress,
    keepCloudProgress,
    exportBackup,
    chooseImportFile,
    cancelImport,
    confirmImport,
    dismissError,
    dismissNotice,
  }
}
