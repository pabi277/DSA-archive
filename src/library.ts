/**
 * Pure model for custom lists, plus the shared catalogue lookup helpers.
 *
 * No Firebase imports here: this module is unit-tested and shared by the
 * Firestore hooks (`libraryData.ts`, `code/codeData.ts`), the backup parser
 * and the UI. The shape follows `docs/DATA-MODEL.md` §3 —
 * `users/{uid}/lists/{listId}` — with catalogue ids as the join key.
 *
 * The phase-3 markdown notes that used to live here were deleted in v2-04;
 * saved solutions live in `src/code/codeStore.ts` instead.
 */
import { catalogue, type Problem } from './catalogue'
import { DRILL_BY_ID, drillAsProblem } from './content/practice'

export const LIST_TITLE_LIMIT = 60
export const LIST_MAX_PROBLEMS = 200
/** Kept in sync with the generated Firestore rules for per-problem doc ids. */
export const PROBLEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/
/** Kept in sync with the generated Firestore rules for list doc ids. */
export const LIST_ID_PATTERN = /^[a-z0-9-]{8,40}$/

export type CustomList = {
  id: string
  title: string
  problemIds: string[]
  updatedAt: string | null
}

export type ListsById = Record<string, CustomList>

export type BackupList = {
  listId: string
  title: string
  problemIds: string[]
  updatedAt: string | null
}

export type ProblemLocation = {
  topicId: string
  topicTitle: string
  subtopicTitle: string
  problem: Problem
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const locations = new Map<string, ProblemLocation>()
for (const topic of catalogue.topics) {
  for (const subtopic of topic.subtopics) {
    for (const problem of subtopic.problems) {
      locations.set(problem.id, {
        topicId: topic.id,
        topicTitle: topic.title,
        subtopicTitle: subtopic.title,
        problem,
      })
    }
  }
}
// Phase 03 drills reuse the same id → location lookup but are not catalogue
// rows and never appear in the 495-row sheet denominator.
for (const [id, drill] of DRILL_BY_ID) {
  locations.set(id, {
    topicId: drill.topicId,
    topicTitle: drill.topicTitle,
    subtopicTitle: `${drill.patternTitle} · set ${drill.set}`,
    problem: drillAsProblem(drill),
  })
}

export function locateProblem(problemId: string): ProblemLocation | null {
  return locations.get(problemId) ?? null
}

export function isKnownProblemId(problemId: string): boolean {
  return locations.has(problemId)
}

export function knownProblemIds(): string[] {
  return [...locations.keys()]
}

/** Firestore Timestamp, {seconds} stub or ISO string → ISO string. */
export function timestampToIso(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed.slice(0, 40)
  }
  if (isRecord(value)) {
    const candidate = value as { toDate?: () => Date; seconds?: number }
    if (typeof candidate.toDate === 'function') {
      const date = candidate.toDate()
      return Number.isNaN(date.getTime()) ? null : date.toISOString()
    }
    if (typeof candidate.seconds === 'number') {
      return new Date(candidate.seconds * 1000).toISOString()
    }
  }
  return null
}

/** Read a Firestore list document; unknown problem ids are dropped. */
export function sanitizeList(listId: string, raw: unknown): CustomList | null {
  if (!isRecord(raw)) return null
  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, LIST_TITLE_LIMIT) : ''
  if (title === '' || !LIST_ID_PATTERN.test(listId)) return null
  const ids: string[] = []
  if (Array.isArray(raw.problemIds)) {
    for (const value of raw.problemIds) {
      if (typeof value !== 'string' || !isKnownProblemId(value)) continue
      if (ids.includes(value)) continue
      ids.push(value)
      if (ids.length >= LIST_MAX_PROBLEMS) break
    }
  }
  return { id: listId, title, problemIds: ids, updatedAt: timestampToIso(raw.updatedAt) }
}

export function sanitizeLists(raw: unknown): ListsById {
  if (!isRecord(raw)) return {}
  const lists: ListsById = {}
  for (const [listId, value] of Object.entries(raw)) {
    const list = sanitizeList(listId, value)
    if (list) lists[listId] = list
  }
  return lists
}

export function listProblemCount(lists: ListsById) {
  return Object.values(lists).reduce((total, list) => total + list.problemIds.length, 0)
}

export function listsContaining(lists: ListsById, problemId: string): CustomList[] {
  return Object.values(lists)
    .filter((list) => list.problemIds.includes(problemId))
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function addProblemToList(list: CustomList, problemId: string): CustomList {
  if (!isKnownProblemId(problemId)) return list
  if (list.problemIds.includes(problemId)) return list
  if (list.problemIds.length >= LIST_MAX_PROBLEMS) return list
  return { ...list, problemIds: [...list.problemIds, problemId] }
}

export function removeProblemFromList(list: CustomList, problemId: string): CustomList {
  if (!list.problemIds.includes(problemId)) return list
  return { ...list, problemIds: list.problemIds.filter((id) => id !== problemId) }
}

/** List id for `users/{uid}/lists/{listId}`; always rules-compatible. */
export function newListId(random: () => number = Math.random): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  const stamp = Date.now().toString(36)
  const suffix = Math.floor(random() * 0xfffffff).toString(36)
  return `${stamp}-${suffix}`.replace(/[^a-z0-9-]/g, '').slice(0, 40)
}

export function sortLists(lists: ListsById): CustomList[] {
  return Object.values(lists).sort((a, b) => a.title.localeCompare(b.title))
}

export function listsForBackup(lists: ListsById): BackupList[] {
  return sortLists(lists).map((list) => ({
    listId: list.id,
    title: list.title,
    problemIds: [...list.problemIds],
    updatedAt: list.updatedAt,
  }))
}
