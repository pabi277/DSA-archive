/**
 * Phase v2-05 quiz result model: guest `localStorage` (`dsa-archive.quiz.v1`),
 * Firestore `users/{uid}/quizResults/{topicId}`, explicit merge-on-sign-in,
 * and schema-6 backup serialization.
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
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import type { AccountState } from '../account'
import { catalogue } from '../catalogue'
import { db } from '../firebase'
import { isQuizPassed, QUIZ_TARGET_COUNT } from './engine'

export const QUIZ_STORAGE_KEY = 'dsa-archive.quiz.v1'
export const MAX_QUIZ_ATTEMPTS = 999

export type QuizResult = {
  bestScore: number
  bestTotal: number
  attempts: number
  lastScore: number
  lastAt: string
  passed: boolean
}

export type QuizResultsByTopic = Record<string, QuizResult>

export type BackupQuizResult = QuizResult & {
  topicId: string
}

export type QuizMergePrompt = {
  topicCount: number
}

export type QuizDataState = {
  signedIn: boolean
  ready: boolean
  pending: boolean
  busy: boolean
  results: QuizResultsByTopic
  mergePrompt: QuizMergePrompt | null
  error: string | null
  notice: string | null
  recordAttempt: (topicId: string, score: number, total: number) => void
  mergeGuestIntoCloud: () => Promise<void>
  keepSeparate: () => void
  discardGuestResults: () => void
  applyBackup: (entries: BackupQuizResult[]) => Promise<void>
  clearCloudResults: () => Promise<void>
  resultsSnapshot: () => BackupQuizResult[]
  dismissError: () => void
  dismissNotice: () => void
}

const KNOWN_TOPIC_IDS = new Set(catalogue.topics.map((topic) => topic.id))
const DELETE_CHUNK = 400

export function isKnownQuizTopicId(topicId: string): boolean {
  return KNOWN_TOPIC_IDS.has(topicId)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toIsoTimestamp(raw: unknown): string {
  if (typeof raw === 'string' && !Number.isNaN(Date.parse(raw))) {
    return new Date(Date.parse(raw)).toISOString()
  }
  if (isRecord(raw) && typeof raw.toDate === 'function') {
    const converted = (raw.toDate as () => unknown)()
    if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
      return converted.toISOString()
    }
  }
  return new Date(0).toISOString()
}

export function sanitizeQuizResult(topicId: string, raw: unknown): QuizResult | null {
  if (!isKnownQuizTopicId(topicId) || !isRecord(raw)) return null
  const bestTotal = typeof raw.bestTotal === 'number' && Number.isInteger(raw.bestTotal)
    ? raw.bestTotal
    : null
  const bestScore = typeof raw.bestScore === 'number' && Number.isInteger(raw.bestScore)
    ? raw.bestScore
    : null
  const lastScore = typeof raw.lastScore === 'number' && Number.isInteger(raw.lastScore)
    ? raw.lastScore
    : null
  const attempts = typeof raw.attempts === 'number' && Number.isInteger(raw.attempts)
    ? raw.attempts
    : null
  if (
    bestTotal === null ||
    bestTotal < 1 ||
    bestTotal > QUIZ_TARGET_COUNT ||
    bestScore === null ||
    bestScore < 0 ||
    bestScore > bestTotal ||
    lastScore === null ||
    lastScore < 0 ||
    lastScore > bestTotal ||
    attempts === null ||
    attempts < 1 ||
    attempts > MAX_QUIZ_ATTEMPTS ||
    typeof raw.passed !== 'boolean'
  ) {
    return null
  }
  return {
    bestScore,
    bestTotal,
    attempts,
    lastScore,
    lastAt: toIsoTimestamp(raw.lastAt),
    passed: raw.passed,
  }
}

export function sanitizeQuizMap(raw: unknown): QuizResultsByTopic {
  if (!isRecord(raw)) return {}
  const next: QuizResultsByTopic = {}
  for (const [topicId, value] of Object.entries(raw)) {
    const clean = sanitizeQuizResult(topicId, value)
    if (clean) next[topicId] = clean
  }
  return next
}

export function loadGuestQuizResults(): QuizResultsByTopic {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY)
    if (!raw) return {}
    return sanitizeQuizMap(JSON.parse(raw))
  } catch {
    return {}
  }
}

export function saveGuestQuizResults(results: QuizResultsByTopic): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(results))
  } catch {
    // Storage full or disabled: keep the in-memory session usable.
  }
}

export function clearGuestQuizResults(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(QUIZ_STORAGE_KEY)
  } catch {
    // Ignore restricted storage environments.
  }
}

export function countGuestQuizTopics(results: QuizResultsByTopic): number {
  return Object.keys(results).filter((topicId) => Boolean(results[topicId])).length
}

export function buildNextQuizResult(
  prev: QuizResult | undefined,
  score: number,
  total: number,
  nowIso = new Date().toISOString(),
): QuizResult | null {
  if (!Number.isInteger(total) || total < 1 || total > QUIZ_TARGET_COUNT) return null
  const safeScore = Math.max(0, Math.min(total, Math.floor(score)))
  const bestTotal = Math.min(QUIZ_TARGET_COUNT, Math.max(prev?.bestTotal ?? 0, total))
  const bestScore = Math.min(bestTotal, Math.max(prev?.bestScore ?? 0, safeScore))
  const attempts = Math.min(MAX_QUIZ_ATTEMPTS, (prev?.attempts ?? 0) + 1)
  const passed = Boolean(prev?.passed) || isQuizPassed(safeScore, total) || isQuizPassed(bestScore, bestTotal)
  return {
    bestScore,
    bestTotal,
    attempts,
    lastScore: Math.min(bestTotal, safeScore),
    lastAt: nowIso,
    passed,
  }
}

export function recordQuizAttempt(
  current: QuizResultsByTopic,
  topicId: string,
  score: number,
  total: number,
  nowIso = new Date().toISOString(),
): QuizResultsByTopic {
  if (!isKnownQuizTopicId(topicId)) return current
  const next = buildNextQuizResult(current[topicId], score, total, nowIso)
  if (!next) return current
  return { ...current, [topicId]: next }
}

/** Max score wins; attempts combine up to 999; most recent `lastAt` keeps `lastScore`. */
export function mergeQuizResult(local?: QuizResult, remote?: QuizResult): QuizResult | null {
  if (!local && !remote) return null
  if (!local) return { ...remote! }
  if (!remote) return { ...local }

  const bestTotal = Math.min(QUIZ_TARGET_COUNT, Math.max(local.bestTotal, remote.bestTotal))
  const bestScore = Math.min(bestTotal, Math.max(local.bestScore, remote.bestScore))
  const localTime = Date.parse(local.lastAt) || 0
  const remoteTime = Date.parse(remote.lastAt) || 0
  const newer = localTime >= remoteTime ? local : remote
  const attempts = Math.min(MAX_QUIZ_ATTEMPTS, Math.max(1, local.attempts + remote.attempts))
  const passed = local.passed || remote.passed || isQuizPassed(bestScore, bestTotal)

  return {
    bestScore,
    bestTotal,
    attempts,
    lastScore: Math.min(bestTotal, newer.lastScore),
    lastAt: newer.lastAt,
    passed,
  }
}

export function mergeQuizResults(
  cloud: QuizResultsByTopic,
  guest: QuizResultsByTopic,
): QuizResultsByTopic {
  const topicIds = new Set([...Object.keys(cloud), ...Object.keys(guest)])
  const merged: QuizResultsByTopic = {}
  for (const topicId of topicIds) {
    if (!isKnownQuizTopicId(topicId)) continue
    const entry = mergeQuizResult(guest[topicId], cloud[topicId])
    if (entry) merged[topicId] = entry
  }
  return merged
}

export function quizResultsForBackup(results: QuizResultsByTopic): BackupQuizResult[] {
  return Object.entries(results)
    .filter(([topicId, entry]) => isKnownQuizTopicId(topicId) && Boolean(entry))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([topicId, entry]) => ({
      topicId,
      bestScore: entry.bestScore,
      bestTotal: entry.bestTotal,
      attempts: entry.attempts,
      lastScore: entry.lastScore,
      lastAt: entry.lastAt,
      passed: entry.passed,
    }))
}

export function quizResultsFromBackup(entries: readonly BackupQuizResult[]): QuizResultsByTopic {
  const next: QuizResultsByTopic = {}
  for (const entry of entries) {
    const clean = sanitizeQuizResult(entry.topicId, entry)
    if (clean) next[entry.topicId] = clean
  }
  return next
}

function firestorePayload(entry: QuizResult) {
  return {
    bestScore: entry.bestScore,
    bestTotal: entry.bestTotal,
    attempts: entry.attempts,
    lastScore: entry.lastScore,
    lastAt: serverTimestamp(),
    passed: entry.passed,
  }
}

function messageFrom(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}

async function deleteAllDocs(firestore: Firestore, docs: QueryDocumentSnapshot[]) {
  for (let i = 0; i < docs.length; i += DELETE_CHUNK) {
    const batch = writeBatch(firestore)
    for (const entry of docs.slice(i, i + DELETE_CHUNK)) {
      batch.delete(entry.ref)
    }
    await batch.commit()
  }
}

export function useQuizResults(account: AccountState): QuizDataState {
  const uid = account.status === 'signed-in' ? account.user?.uid ?? null : null
  const firestore = db
  const signedIn = Boolean(uid && firestore)

  const [guestResults, setGuestResults] = useState<QuizResultsByTopic>(() => loadGuestQuizResults())
  const [cloudResults, setCloudResults] = useState<QuizResultsByTopic>({})
  const [ready, setReady] = useState<boolean>(() => !signedIn)
  const [pending, setPending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mergePrompt, setMergePrompt] = useState<QuizMergePrompt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const cloudRef = useRef<QuizResultsByTopic>({})
  const checkedMergeUidRef = useRef<string | null>(null)

  useEffect(() => {
    if (!signedIn) {
      cloudRef.current = {}
      checkedMergeUidRef.current = null
      setCloudResults({})
      setGuestResults(loadGuestQuizResults())
      setReady(true)
      setPending(false)
      setBusy(false)
      setMergePrompt(null)
      setError(null)
      setNotice(null)
      return
    }
    cloudRef.current = {}
    setCloudResults({})
    setReady(false)
    setPending(false)
    setMergePrompt(null)
  }, [signedIn, uid])

  useEffect(() => {
    if (!uid || !firestore) return
    const unsubscribe = onSnapshot(
      collection(firestore, 'users', uid, 'quizResults'),
      { includeMetadataChanges: true },
      (snapshot) => {
        const next: QuizResultsByTopic = {}
        for (const entry of snapshot.docs) {
          const clean = sanitizeQuizResult(entry.id, entry.data())
          if (clean) next[entry.id] = clean
        }
        cloudRef.current = next
        setCloudResults(next)
        setPending(snapshot.metadata.hasPendingWrites)
        setReady(true)

        if (checkedMergeUidRef.current !== uid) {
          checkedMergeUidRef.current = uid
          const guest = loadGuestQuizResults()
          const topicCount = countGuestQuizTopics(guest)
          if (topicCount > 0) {
            setMergePrompt({ topicCount })
          }
        }
      },
      (reason) => {
        setError(`Quiz scores could not sync: ${messageFrom(reason)}`)
        setReady(true)
      },
    )
    return unsubscribe
  }, [uid, firestore])

  const recordAttempt = useCallback(
    (topicId: string, score: number, total: number) => {
      if (!isKnownQuizTopicId(topicId)) return
      if (!uid || !firestore) {
        setGuestResults((prev) => {
          const updated = recordQuizAttempt(prev, topicId, score, total)
          saveGuestQuizResults(updated)
          return updated
        })
        return
      }
      const next = buildNextQuizResult(cloudRef.current[topicId], score, total)
      if (!next) return
      const updatedMap = { ...cloudRef.current, [topicId]: next }
      cloudRef.current = updatedMap
      setCloudResults(updatedMap)
      setPending(true)
      void setDoc(doc(firestore, 'users', uid, 'quizResults', topicId), firestorePayload(next)).catch((reason) => {
        setPending(false)
        setError(`Could not save quiz score: ${messageFrom(reason)}`)
      })
    },
    [uid, firestore],
  )

  const mergeGuestIntoCloud = useCallback(async () => {
    if (!uid || !firestore) return
    setBusy(true)
    setError(null)
    try {
      const guest = loadGuestQuizResults()
      const merged = mergeQuizResults(cloudRef.current, guest)
      const entries = Object.entries(merged).filter(([topicId]) => Boolean(guest[topicId]))
      if (entries.length > 0) {
        const batch = writeBatch(firestore)
        for (const [topicId, entry] of entries) {
          batch.set(doc(firestore, 'users', uid, 'quizResults', topicId), firestorePayload(entry))
        }
        await batch.commit()
      }
      cloudRef.current = merged
      setCloudResults(merged)
      clearGuestQuizResults()
      setGuestResults({})
      setMergePrompt(null)
      setNotice(`Merged ${entries.length} guest quiz score${entries.length === 1 ? '' : 's'} into your account.`)
    } catch (reason) {
      setError(`Could not merge guest quiz scores: ${messageFrom(reason)}`)
    } finally {
      setBusy(false)
    }
  }, [uid, firestore])

  const keepSeparate = useCallback(() => {
    setMergePrompt(null)
  }, [])

  const discardGuestResults = useCallback(() => {
    clearGuestQuizResults()
    setGuestResults({})
    setMergePrompt(null)
    setNotice('Cleared guest quiz scores from this browser.')
  }, [])

  const clearCloudResults = useCallback(async () => {
    if (!uid || !firestore) {
      clearGuestQuizResults()
      setGuestResults({})
      return
    }
    setBusy(true)
    try {
      const existing = await getDocs(collection(firestore, 'users', uid, 'quizResults'))
      await deleteAllDocs(firestore, [...existing.docs])
      cloudRef.current = {}
      setCloudResults({})
    } finally {
      setBusy(false)
    }
  }, [uid, firestore])

  const applyBackup = useCallback(
    async (entries: BackupQuizResult[]) => {
      const cleanMap = quizResultsFromBackup(entries)
      if (!uid || !firestore) {
        saveGuestQuizResults(cleanMap)
        setGuestResults(cleanMap)
        return
      }
      setBusy(true)
      try {
        const existing = await getDocs(collection(firestore, 'users', uid, 'quizResults'))
        await deleteAllDocs(firestore, [...existing.docs])
        const pairs = Object.entries(cleanMap)
        for (let i = 0; i < pairs.length; i += DELETE_CHUNK) {
          const batch = writeBatch(firestore)
          for (const [topicId, entry] of pairs.slice(i, i + DELETE_CHUNK)) {
            batch.set(doc(firestore, 'users', uid, 'quizResults', topicId), firestorePayload(entry))
          }
          await batch.commit()
        }
        cloudRef.current = cleanMap
        setCloudResults(cleanMap)
      } finally {
        setBusy(false)
      }
    },
    [uid, firestore],
  )

  const resultsSnapshot = useCallback(
    () => quizResultsForBackup(signedIn ? cloudRef.current : guestResults),
    [signedIn, guestResults],
  )

  return {
    signedIn,
    ready,
    pending,
    busy,
    results: signedIn ? cloudResults : guestResults,
    mergePrompt,
    error,
    notice,
    recordAttempt,
    mergeGuestIntoCloud,
    keepSeparate,
    discardGuestResults,
    applyBackup,
    clearCloudResults,
    resultsSnapshot,
    dismissError: () => setError(null),
    dismissNotice: () => setNotice(null),
  }
}
