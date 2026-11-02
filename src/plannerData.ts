/**
 * Phase 4 Firestore layer for the daily plan (`4.1`).
 *
 * One document per day: `users/{uid}/plans/{yyyy-mm-dd}` with `problemIds`,
 * `doneIds` and `updatedAt` — exactly the shape sketched in `DATA-MODEL.md` §3
 * and validated by rules v3. Only **today's** document is subscribed, so the
 * planner costs one read per app open and rides the offline cache like every
 * other collection.
 *
 * The revision queue and the stats are derived on-device from the progress
 * entries (`planner.ts`), so they need no extra documents and no server job.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import type { AccountState } from './account'
import {
  PLAN_MAX_PROBLEMS,
  emptyPlan,
  plansForBackup,
  sanitizePlan,
  todayKey,
  withDone,
  withProblem,
  withProblems,
  withoutProblem,
  type BackupPlan,
  type Plan,
} from './planner'

export type PlannerState = {
  signedIn: boolean
  ready: boolean
  busy: boolean
  /** Local `YYYY-MM-DD` of the phone, refreshed at midnight and on focus. */
  today: string
  plan: Plan | null
  error: string | null
  notice: string | null
  addToToday: (problemId: string) => void
  addManyToToday: (problemIds: readonly string[]) => void
  removeFromToday: (problemId: string) => void
  markTodayDone: (problemId: string) => void
  /**
   * Every plan day, read on demand for a backup. Export is an explicit user
   * action, so this is the one place the planner reads more than today.
   */
  collectPlansForBackup: () => Promise<BackupPlan[]>
  applyPlanBackup: (plans: BackupPlan[]) => Promise<void>
  dismissError: () => void
  dismissNotice: () => void
}

function messageFrom(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason)
}

function samePlanItems(left: Plan | null, right: Plan | null): boolean {
  if (left === right) return true
  if (!left || !right) return false
  if (left.date !== right.date) return false
  if (left.problemIds.length !== right.problemIds.length) return false
  if (left.doneIds.length !== right.doneIds.length) return false
  return (
    left.problemIds.every((id, index) => id === right.problemIds[index]) &&
    left.doneIds.every((id, index) => id === right.doneIds[index])
  )
}

/** The phone's calendar day, kept honest across midnight and tab wake-ups. */
export function useTodayKey(): string {
  const [key, setKey] = useState(() => todayKey())
  useEffect(() => {
    const tick = () => setKey((current) => {
      const next = todayKey()
      return next === current ? current : next
    })
    const timer = window.setInterval(tick, 60_000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return key
}

export function usePlanner(account: AccountState): PlannerState {
  const uid = account.status === 'signed-in' ? account.user?.uid ?? null : null
  const firestore = db
  const signedIn = Boolean(uid && firestore)
  const today = useTodayKey()

  const [plan, setPlan] = useState<Plan | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const planRef = useRef<Plan | null>(null)
  const optimisticRef = useRef<Plan | null>(null)
  const inFlightRef = useRef(0)

  // A different account (or a different day) is a different document.
  useEffect(() => {
    planRef.current = null
    optimisticRef.current = null
    inFlightRef.current = 0
    setPlan(null)
    setReady(false)
    setBusy(false)
    setError(null)
    setNotice(null)
  }, [uid, today])

  useEffect(() => {
    if (!uid || !firestore) return
    let disposed = false
    const dayRef = doc(firestore, 'users', uid, 'plans', today)
    const unsubscribe = onSnapshot(
      dayRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (disposed) return
        const next = snapshot.exists() ? sanitizePlan(today, snapshot.data()) : null
        if (optimisticRef.current) {
          if (samePlanItems(next, optimisticRef.current)) {
            optimisticRef.current = null
          } else if (inFlightRef.current > 0 || snapshot.metadata.hasPendingWrites) {
            // Ignore lagging intermediate snapshots from an earlier write so
            // back-to-back actions (e.g. Suggest 5 -> Done -> Add) never lose
            // `doneIds` or `problemIds` in `planRef.current`.
            setReady(true)
            return
          } else {
            optimisticRef.current = null
          }
        }
        planRef.current = next
        setPlan(next)
        setReady(true)
      },
      (reason) => {
        if (disposed) return
        setError(`Could not read today's plan: ${messageFrom(reason)}`)
        setReady(true)
      },
    )
    return () => {
      disposed = true
      unsubscribe()
    }
  }, [uid, firestore, today])

  const save = useCallback(
    (next: Plan) => {
      if (!uid || !firestore) {
        setError('Sign in to plan your day — the Today list follows your account.')
        return
      }
      if (next.problemIds.length > PLAN_MAX_PROBLEMS) {
        setError(`A day holds at most ${PLAN_MAX_PROBLEMS} problems.`)
        return
      }
      setError(null)
      planRef.current = next
      optimisticRef.current = next
      inFlightRef.current += 1
      setPlan(next)
      void setDoc(
        doc(firestore, 'users', uid, 'plans', next.date),
        {
          problemIds: next.problemIds,
          doneIds: next.doneIds,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
        .catch((reason) => {
          optimisticRef.current = null
          setError(`Could not save today's plan: ${messageFrom(reason)}`)
        })
        .finally(() => {
          inFlightRef.current = Math.max(0, inFlightRef.current - 1)
        })
    },
    [uid, firestore],
  )

  const addToToday = useCallback(
    (problemId: string) => {
      const base = planRef.current ?? emptyPlan(today)
      const next = withProblem(base, problemId)
      if (!next) {
        setError('That problem cannot be added — it is unknown or the day is full.')
        return
      }
      if (next === base) return
      save(next)
    },
    [save, today],
  )

  const addManyToToday = useCallback(
    (problemIds: readonly string[]) => {
      if (problemIds.length === 0) return
      const base = planRef.current ?? emptyPlan(today)
      const next = withProblems(base, problemIds)
      if (!next) {
        setError('Those problems cannot be added — one is unknown or the day is full.')
        return
      }
      if (next === base) return
      save(next)
    },
    [save, today],
  )

  const removeFromToday = useCallback(
    (problemId: string) => {
      const base = planRef.current
      if (!base) return
      const next = withoutProblem(base, problemId)
      if (next === base) return
      save(next)
    },
    [save],
  )

  const markTodayDone = useCallback(
    (problemId: string) => {
      const base = planRef.current
      if (!base) return
      const next = withDone(base, problemId)
      if (next === base) return
      save(next)
      setNotice('Ticked in today’s plan.')
    },
    [save],
  )

  const collectPlansForBackup = useCallback(async () => {
    if (!uid || !firestore) return []
    const snapshot = await getDocs(collection(firestore, 'users', uid, 'plans'))
    const plans: Record<string, Plan> = {}
    for (const entry of snapshot.docs) {
      const plan = sanitizePlan(entry.id, entry.data())
      if (plan) plans[entry.id] = plan
    }
    if (planRef.current && inFlightRef.current > 0) {
      plans[planRef.current.date] = planRef.current
    }
    return plansForBackup(plans)
  }, [uid, firestore])

  /**
   * Restore plans from a validated backup (schema v3+). Called by the import
   * flow after progress, notes and lists; throws so one notice covers it all.
   */
  const applyPlanBackup = useCallback(
    async (backupPlans: BackupPlan[]) => {
      if (!uid || !firestore) throw new Error('sign in before importing a backup')
      setBusy(true)
      optimisticRef.current = null
      try {
        const all = await getDocs(collection(firestore, 'users', uid, 'plans'))
        if (all.docs.length > 0) {
          for (let index = 0; index < all.docs.length; index += 400) {
            const batch = writeBatch(firestore)
            for (const entry of all.docs.slice(index, index + 400)) batch.delete(entry.ref)
            await batch.commit()
          }
        }
        for (const entry of backupPlans) {
          await setDoc(doc(firestore, 'users', uid, 'plans', entry.date), {
            problemIds: entry.problemIds.slice(0, PLAN_MAX_PROBLEMS),
            doneIds: entry.doneIds.filter((id) => entry.problemIds.includes(id)).slice(0, PLAN_MAX_PROBLEMS),
            updatedAt: serverTimestamp(),
          })
        }
      } finally {
        setBusy(false)
      }
    },
    [uid, firestore],
  )

  return {
    signedIn,
    ready,
    busy,
    today,
    plan,
    error,
    notice,
    addToToday,
    addManyToToday,
    removeFromToday,
    markTodayDone,
    collectPlansForBackup,
    applyPlanBackup,
    dismissError: () => setError(null),
    dismissNotice: () => setNotice(null),
  }
}
