/**
 * Phase 3 pure model for personal notes, code snippets and custom lists.
 *
 * No Firebase imports here: this module is unit-tested and shared by the
 * Firestore hook (`libraryData.ts`), the backup parser and the UI. The shapes
 * follow `docs/DATA-MODEL.md` §3 — `users/{uid}/notes/{problemId}` and
 * `users/{uid}/lists/{listId}` — with catalogue ids as the join key.
 */
import { catalogue, type Problem } from './catalogue'

export const NOTE_MARKDOWN_LIMIT = 5000
export const NOTE_SNIPPET_LIMIT = 8000
export const LIST_TITLE_LIMIT = 60
export const LIST_MAX_PROBLEMS = 200
/** Kept in sync with the generated Firestore rules for note doc ids. */
export const PROBLEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/
/** Kept in sync with the generated Firestore rules for list doc ids. */
export const LIST_ID_PATTERN = /^[a-z0-9-]{8,40}$/

export type Note = {
  problemId: string
  markdown: string
  snippet: string
  /** ISO string from the Firestore server timestamp; null when unreadable. */
  updatedAt: string | null
}

export type NotesById = Record<string, Note>

export type CustomList = {
  id: string
  title: string
  problemIds: string[]
  updatedAt: string | null
}

export type ListsById = Record<string, CustomList>

export type BackupNote = {
  problemId: string
  markdown: string
  snippet: string
  updatedAt: string | null
}

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

export function noteIsEmpty(markdown: string, snippet: string) {
  return markdown.trim() === '' && snippet.trim() === ''
}

/**
 * Read a Firestore note document defensively. Corrupt or oversized values are
 * clamped instead of breaking the UI, and an empty note is treated as absent
 * (the client deletes a note whose text was cleared).
 */
export function sanitizeNote(problemId: string, raw: unknown): Note | null {
  if (!isRecord(raw)) return null
  const markdown = typeof raw.markdown === 'string' ? raw.markdown.slice(0, NOTE_MARKDOWN_LIMIT) : ''
  const snippet = typeof raw.snippet === 'string' ? raw.snippet.slice(0, NOTE_SNIPPET_LIMIT) : ''
  if (noteIsEmpty(markdown, snippet)) return null
  return { problemId, markdown, snippet, updatedAt: timestampToIso(raw.updatedAt) }
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

export function sanitizeNotes(raw: unknown): NotesById {
  if (!isRecord(raw)) return {}
  const notes: NotesById = {}
  for (const [problemId, value] of Object.entries(raw)) {
    const note = sanitizeNote(problemId, value)
    if (note) notes[problemId] = note
  }
  return notes
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

export function noteCount(notes: NotesById) {
  return Object.keys(notes).length
}

export function listProblemCount(lists: ListsById) {
  return Object.values(lists).reduce((total, list) => total + list.problemIds.length, 0)
}

/** Newest first, then by problem title so the order is stable. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    const left = a.updatedAt ? Date.parse(a.updatedAt) : 0
    const right = b.updatedAt ? Date.parse(b.updatedAt) : 0
    if (left !== right) return right - left
    return (locateProblem(a.problemId)?.problem.title ?? a.problemId).localeCompare(
      locateProblem(b.problemId)?.problem.title ?? b.problemId,
    )
  })
}

/**
 * Notes overview search (roadmap 3.2): matches the note text, the snippet, the
 * problem title and the topic title, so "graph" finds both a BFS note and a
 * note written inside the Graphs topic.
 */
export function searchNotes(notes: NotesById, query: string): Note[] {
  const needle = query.trim().toLowerCase().replace(/\s+/g, ' ')
  const all = sortNotes(Object.values(notes))
  if (needle === '') return all
  return all.filter((note) => {
    const location = locateProblem(note.problemId)
    return [
      note.markdown,
      note.snippet,
      location?.problem.title ?? '',
      location?.topicTitle ?? '',
      location?.subtopicTitle ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  })
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

export function notesForBackup(notes: NotesById): BackupNote[] {
  return sortNotes(Object.values(notes)).map((note) => ({
    problemId: note.problemId,
    markdown: note.markdown,
    snippet: note.snippet,
    updatedAt: note.updatedAt,
  }))
}

export function listsForBackup(lists: ListsById): BackupList[] {
  return sortLists(lists).map((list) => ({
    listId: list.id,
    title: list.title,
    problemIds: [...list.problemIds],
    updatedAt: list.updatedAt,
  }))
}
