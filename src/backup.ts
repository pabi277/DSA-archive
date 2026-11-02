/**
 * Anti-lock-in JSON backup.
 *
 * Schema v1 shipped in phase 2 with `notes`/`lists` present but always empty.
 * Phase 3 wrote **schema v2** (real notes and custom lists). Phase 4 writes
 * **schema v3**: the same payload plus the daily plans and the `rc` revision
 * counter on every progress entry. v1 and v2 files still import — that is the
 * recorded, backward-compatible migration — they simply carry no plans, and
 * their entries default `rc` to 0. Friends/summaries stay excluded.
 */
import { catalogue } from './catalogue'
import {
  countCloudRows,
  isValidCloudEntry,
  type CloudProgressByTopic,
  type CloudTopicProgress,
} from './cloudProgress'
import type { Settings, Theme } from './settings'
import {
  DEFAULT_DAILY_GOAL,
  PLAN_ID_PATTERN,
  PLAN_MAX_PROBLEMS,
  clampGoal,
  type BackupPlan,
} from './planner'
import {
  LIST_ID_PATTERN,
  LIST_MAX_PROBLEMS,
  LIST_TITLE_LIMIT,
  NOTE_MARKDOWN_LIMIT,
  NOTE_SNIPPET_LIMIT,
  isKnownProblemId,
  noteIsEmpty,
  type BackupList,
  type BackupNote,
} from './library'

export const BACKUP_SCHEMA_VERSION = 3
/** v1 (phase 2) and v2 (phase 3) files import unchanged; they carry no plans. */
export const SUPPORTED_BACKUP_SCHEMAS = [1, 2, 3] as const
/** Room for many notes/snippets; each field is individually capped below. */
const MAX_BACKUP_BYTES = 4_000_000

export type BackupProfile = {
  displayName: string
  email: string
  theme: Theme
  largeText: boolean
  hideDone: boolean
  dailyGoal: number
  shareSummary: boolean
}

export type Backup = {
  schemaVersion: number
  generatedBy: 'DSA Archive'
  exportedAt: string
  profile: BackupProfile
  progressByTopic: CloudProgressByTopic
  notes: BackupNote[]
  lists: BackupList[]
  plans: BackupPlan[]
  excluded: string[]
}

export type BackupCounts = {
  topics: number
  rows: number
  notes: number
  lists: number
  plans: number
}

export type BackupInput = {
  account: { displayName: string; email: string }
  settings: Settings
  progressByTopic: CloudProgressByTopic
  notes?: BackupNote[]
  lists?: BackupList[]
  plans?: BackupPlan[]
  dailyGoal?: number
  exportedAt?: string
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(message: string): never {
  throw new BackupError(message)
}

export function createBackup(input: BackupInput): string {
  const backup: Backup = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    generatedBy: 'DSA Archive',
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    profile: {
      displayName: input.account.displayName,
      email: input.account.email,
      theme: input.settings.theme,
      largeText: input.settings.largeText,
      hideDone: input.settings.hideDone,
      dailyGoal: clampGoal(input.dailyGoal ?? DEFAULT_DAILY_GOAL),
      shareSummary: false,
    },
    progressByTopic: input.progressByTopic,
    notes: input.notes ?? [],
    lists: input.lists ?? [],
    plans: input.plans ?? [],
    excluded: ['friends', 'public/summary'],
  }
  return JSON.stringify(backup, null, 2)
}

const knownIds = new Map(
  catalogue.topics.map((topic) => [
    topic.id,
    new Set(topic.subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id))),
  ]),
)

const NOTE_KEYS = ['problemId', 'markdown', 'snippet', 'updatedAt']
const LIST_KEYS = ['listId', 'title', 'problemIds', 'updatedAt']

function parseTimestamp(value: unknown, label: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length > 40) {
    fail(`${label} must be an ISO timestamp string or null`)
  }
  return value
}

function parseNotes(raw: unknown, schemaVersion: number): BackupNote[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) fail('notes must be an array')
  if (schemaVersion === 1 && raw.length > 0) {
    // Phase-2 files always wrote this array empty; content there is not a
    // shape we ever produced, so refuse it instead of guessing.
    fail('a schemaVersion 1 backup cannot contain notes')
  }
  const seen = new Set<string>()
  return raw.map((entry, index) => {
    if (!isRecord(entry)) fail(`notes[${index}] must be an object`)
    if (!Object.keys(entry).every((key) => NOTE_KEYS.includes(key))) {
      fail(`notes[${index}] has unexpected fields`)
    }
    const problemId = entry.problemId
    if (typeof problemId !== 'string' || !isKnownProblemId(problemId)) {
      fail(`notes[${index}] does not name a problem in this catalogue`)
    }
    if (seen.has(problemId)) fail(`duplicate note for "${problemId}"`)
    seen.add(problemId)
    const markdown = typeof entry.markdown === 'string' ? entry.markdown : fail(`notes[${index}].markdown must be text`)
    const snippet = typeof entry.snippet === 'string' ? entry.snippet : fail(`notes[${index}].snippet must be text`)
    if (markdown.length > NOTE_MARKDOWN_LIMIT) fail(`notes[${index}].markdown is over ${NOTE_MARKDOWN_LIMIT} characters`)
    if (snippet.length > NOTE_SNIPPET_LIMIT) fail(`notes[${index}].snippet is over ${NOTE_SNIPPET_LIMIT} characters`)
    if (noteIsEmpty(markdown, snippet)) fail(`notes[${index}] is empty`)
    return {
      problemId,
      markdown,
      snippet,
      updatedAt: parseTimestamp(entry.updatedAt, `notes[${index}].updatedAt`),
    }
  })
}

function parseLists(raw: unknown, schemaVersion: number): BackupList[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) fail('lists must be an array')
  if (schemaVersion === 1 && raw.length > 0) {
    fail('a schemaVersion 1 backup cannot contain lists')
  }
  const seen = new Set<string>()
  return raw.map((entry, index) => {
    if (!isRecord(entry)) fail(`lists[${index}] must be an object`)
    if (!Object.keys(entry).every((key) => LIST_KEYS.includes(key))) {
      fail(`lists[${index}] has unexpected fields`)
    }
    const listId = entry.listId
    if (typeof listId !== 'string' || !LIST_ID_PATTERN.test(listId)) {
      fail(`lists[${index}] has an invalid listId`)
    }
    if (seen.has(listId)) fail(`duplicate list id "${listId}"`)
    seen.add(listId)
    const title = typeof entry.title === 'string' ? entry.title.trim() : fail(`lists[${index}].title must be text`)
    if (title === '') fail(`lists[${index}] has no title`)
    if (title.length > LIST_TITLE_LIMIT) fail(`lists[${index}].title is over ${LIST_TITLE_LIMIT} characters`)
    if (!Array.isArray(entry.problemIds)) fail(`lists[${index}].problemIds must be an array`)
    if (entry.problemIds.length > LIST_MAX_PROBLEMS) {
      fail(`lists[${index}] holds more than ${LIST_MAX_PROBLEMS} problems`)
    }
    const problemIds: string[] = []
    for (const problemId of entry.problemIds) {
      if (typeof problemId !== 'string' || !isKnownProblemId(problemId)) {
        fail(`lists[${index}] contains a problem id that is not in this catalogue`)
      }
      if (!problemIds.includes(problemId)) problemIds.push(problemId)
    }
    return {
      listId,
      title,
      problemIds,
      updatedAt: parseTimestamp(entry.updatedAt, `lists[${index}].updatedAt`),
    }
  })
}

const PLAN_KEYS = ['date', 'problemIds', 'doneIds', 'updatedAt']

function parsePlans(raw: unknown, schemaVersion: number): BackupPlan[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) fail('plans must be an array')
  if (schemaVersion < 3 && raw.length > 0) {
    // Phase 2/3 files always wrote this array empty; content there is not a
    // shape we ever produced, so refuse it instead of guessing.
    fail(`a schemaVersion ${schemaVersion} backup cannot contain plans`)
  }
  const seen = new Set<string>()
  return raw.map((entry, index) => {
    if (!isRecord(entry)) fail(`plans[${index}] must be an object`)
    if (!Object.keys(entry).every((key) => PLAN_KEYS.includes(key))) {
      fail(`plans[${index}] has unexpected fields`)
    }
    const date = entry.date
    if (typeof date !== 'string' || !PLAN_ID_PATTERN.test(date)) {
      fail(`plans[${index}] has an invalid date`)
    }
    if (seen.has(date)) fail(`duplicate plan for "${date}"`)
    seen.add(date)
    const readIds = (value: unknown, label: string): string[] => {
      if (!Array.isArray(value)) fail(`${label} must be an array`)
      if (value.length > PLAN_MAX_PROBLEMS) {
        fail(`${label} holds more than ${PLAN_MAX_PROBLEMS} problems`)
      }
      const ids: string[] = []
      for (const problemId of value) {
        if (typeof problemId !== 'string' || !isKnownProblemId(problemId)) {
          fail(`${label} contains a problem id that is not in this catalogue`)
        }
        if (!ids.includes(problemId)) ids.push(problemId)
      }
      return ids
    }
    const problemIds = readIds(entry.problemIds, `plans[${index}].problemIds`)
    const doneIds = readIds(entry.doneIds, `plans[${index}].doneIds`)
    for (const problemId of doneIds) {
      if (!problemIds.includes(problemId)) {
        fail(`plans[${index}].doneIds must be a subset of its problemIds`)
      }
    }
    return {
      date,
      problemIds,
      doneIds,
      updatedAt: parseTimestamp(entry.updatedAt, `plans[${index}].updatedAt`),
    }
  })
}

export function parseBackup(text: string): { backup: Backup; counts: BackupCounts } {
  if (text.length > MAX_BACKUP_BYTES) {
    throw new BackupError('file is larger than the 4 MB backup limit')
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('file is not valid JSON')
  }
  if (!isRecord(raw)) throw new BackupError('root must be a JSON object')
  const schemaVersion = raw.schemaVersion
  if (typeof schemaVersion !== 'number' || !(SUPPORTED_BACKUP_SCHEMAS as readonly number[]).includes(schemaVersion)) {
    throw new BackupError(
      `unsupported schemaVersion (expected ${SUPPORTED_BACKUP_SCHEMAS.join(' or ')})`,
    )
  }
  if (raw.generatedBy !== 'DSA Archive') throw new BackupError('not a DSA Archive backup')
  if (typeof raw.exportedAt !== 'string') throw new BackupError('missing exportedAt')
  if (!isRecord(raw.profile)) throw new BackupError('missing profile')

  const p = raw.profile
  const profile: BackupProfile = {
    displayName: typeof p.displayName === 'string' ? p.displayName : '',
    email: typeof p.email === 'string' ? p.email : '',
    theme: p.theme === 'light' ? 'light' : p.theme === 'dark' ? 'dark' : (() => {
      throw new BackupError('profile.theme must be dark or light')
    })(),
    largeText: p.largeText === true,
    hideDone: p.hideDone === true,
    dailyGoal:
      typeof p.dailyGoal === 'number' &&
      Number.isInteger(p.dailyGoal) &&
      p.dailyGoal >= 1 &&
      p.dailyGoal <= 100
        ? p.dailyGoal
        : (() => {
            throw new BackupError('profile.dailyGoal must be an integer from 1 to 100')
          })(),
    shareSummary: p.shareSummary === true,
  }

  if (!isRecord(raw.progressByTopic)) throw new BackupError('missing progressByTopic')
  const progressByTopic: CloudProgressByTopic = {}
  for (const [topicId, shard] of Object.entries(raw.progressByTopic)) {
    const allowed = knownIds.get(topicId)
    if (!allowed) throw new BackupError(`unknown topic id "${topicId}"`)
    if (!isRecord(shard)) throw new BackupError(`topic "${topicId}" must be an object`)
    const nextShard: CloudTopicProgress = {}
    for (const [problemId, value] of Object.entries(shard)) {
      if (!allowed.has(problemId)) {
        throw new BackupError(`unknown problem id "${problemId}" in ${topicId}`)
      }
      if (!isValidCloudEntry(value)) {
        throw new BackupError(`invalid progress entry for "${problemId}"`)
      }
      // v1/v2 entries predate the phase-4 revision counter; normalize so the
      // restore writes documents the v3 rules accept.
      nextShard[problemId] = { ...value, rc: value.rc ?? 0 }
    }
    if (Object.keys(nextShard).length > 0) progressByTopic[topicId] = nextShard
  }

  const notes = parseNotes(raw.notes, schemaVersion)
  const lists = parseLists(raw.lists, schemaVersion)
  const plans = parsePlans(raw.plans, schemaVersion)

  const backup: Backup = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    generatedBy: 'DSA Archive',
    exportedAt: raw.exportedAt,
    profile,
    progressByTopic,
    notes,
    lists,
    plans,
    excluded: Array.isArray(raw.excluded) ? raw.excluded.filter((item): item is string => typeof item === 'string') : [],
  }
  return {
    backup,
    counts: {
      topics: Object.keys(progressByTopic).length,
      rows: countCloudRows(progressByTopic),
      notes: notes.length,
      lists: lists.length,
      plans: plans.length,
    },
  }
}
