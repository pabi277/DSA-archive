/**
 * Anti-lock-in JSON backup.
 *
 * Schema v1 shipped with empty library arrays, v2 added library data, v3
 * added plans and revision counts, v4 added the optional self-assessed
 * outcome, v5 (phase v2-04) replaced the removed markdown `notes[]`
 * with saved solutions in `snippets[]`, v6 (phase v2-05) added
 * per-topic quiz scores in `quizResults[]`, v7 (phase v2-06) adds optional
 * video stamps as `snippets[].moments[]`, and v8 (phase v2-08) adds the two
 * optional target fields (`targetDate`, `targetListId`) to the profile. All
 * prior schemas (1–7) remain importable unchanged. Friends/summaries stay
 * excluded.
 */
import { catalogue } from './catalogue'
import {
  CODE_LIMIT,
  MOMENT_LIMIT,
  SNIPPET_NOTES_LIMIT,
  isCodeLanguage,
  isSnippetVerdict,
  legacyNoteToSnippet,
  snippetIsEmpty,
  type BackupSnippet,
} from './code/codeStore'
import { MOMENT_AT_LIMIT, MOMENT_TEXT_LIMIT, type Moment } from './theatre/stamps'
import { DRILLS_BY_TOPIC } from './content/practice'
import {
  countCloudRows,
  isValidCloudEntry,
  type CloudProgressByTopic,
  type CloudTopicProgress,
} from './cloudProgress'
import { MAX_QUIZ_ATTEMPTS, type BackupQuizResult } from './quiz/results'
import { QUIZ_TARGET_COUNT } from './quiz/engine'
import {
  clampDensity,
  clampTargetDate,
  clampTargetListId,
  type Density,
  type Settings,
  type Theme,
} from './settings'
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
  isKnownProblemId,
  type BackupList,
} from './library'

export const BACKUP_SCHEMA_VERSION = 8
/** Schemas 1–7 import unchanged; legacy fields are normalized or migrated. */
export const SUPPORTED_BACKUP_SCHEMAS = [1, 2, 3, 4, 5, 6, 7, 8] as const
/** Room for many saved solutions; each field is individually capped below. */
const MAX_BACKUP_BYTES = 4_000_000

/** Legacy schema ≤4 field caps, kept only to validate old files honestly. */
const LEGACY_NOTE_MARKDOWN_LIMIT = 5000
const LEGACY_NOTE_SNIPPET_LIMIT = 8000

export type BackupProfile = {
  displayName: string
  email: string
  theme: Theme
  largeText: boolean
  hideDone: boolean
  /**
   * Device preferences added in v2-01. Optional on purpose: older files lack
   * them, and both are re-sanitised on import, so a backup that predates
   * them still imports unchanged.
   */
  density?: Density
  railCollapsed?: boolean
  /** Phase v2-08 targets; optional so a v7 file still imports unchanged. */
  targetDate?: string | null
  targetListId?: string | null
  dailyGoal: number
  shareSummary: boolean
}

export type Backup = {
  schemaVersion: number
  generatedBy: 'DSA Archive'
  exportedAt: string
  profile: BackupProfile
  progressByTopic: CloudProgressByTopic
  snippets: BackupSnippet[]
  lists: BackupList[]
  plans: BackupPlan[]
  quizResults: BackupQuizResult[]
  excluded: string[]
}

export type BackupCounts = {
  topics: number
  rows: number
  snippets: number
  lists: number
  plans: number
  quizResults: number
}

export type BackupInput = {
  account: { displayName: string; email: string }
  settings: Pick<
    Settings,
    'theme' | 'largeText' | 'hideDone' | 'density' | 'railCollapsed' | 'targetDate' | 'targetListId'
  >
  progressByTopic: CloudProgressByTopic
  snippets?: BackupSnippet[]
  lists?: BackupList[]
  plans?: BackupPlan[]
  quizResults?: BackupQuizResult[]
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
      density: input.settings.density,
      railCollapsed: input.settings.railCollapsed,
      targetDate: input.settings.targetDate,
      targetListId: input.settings.targetListId,
      dailyGoal: clampGoal(input.dailyGoal ?? DEFAULT_DAILY_GOAL),
      shareSummary: false,
    },
    progressByTopic: input.progressByTopic,
    snippets: input.snippets ?? [],
    lists: input.lists ?? [],
    plans: input.plans ?? [],
    quizResults: input.quizResults ?? [],
    excluded: ['friends', 'public/summary'],
  }
  return JSON.stringify(backup, null, 2)
}

const knownIds = new Map(
  catalogue.topics.map((topic) => [
    topic.id,
    new Set([
      ...topic.subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id)),
      ...(DRILLS_BY_TOPIC.get(topic.id) ?? []).map((drill) => drill.id),
    ]),
  ]),
)

const SNIPPET_KEYS = ['problemId', 'language', 'code', 'notes', 'verdict', 'moments', 'updatedAt']
const LEGACY_NOTE_KEYS = ['problemId', 'markdown', 'snippet', 'updatedAt']
const LIST_KEYS = ['listId', 'title', 'problemIds', 'updatedAt']

/**
 * Shared head of the per-problem row parsers (snippets + legacy notes):
 * object shape, key whitelist, catalogue id, de-duplication.
 */
function rowProblemId(
  entry: unknown,
  label: string,
  noun: string,
  index: number,
  keys: string[],
  seen: Set<string>,
): { record: Record<string, unknown>; problemId: string } {
  if (!isRecord(entry)) fail(`${label}[${index}] must be an object`)
  if (!Object.keys(entry).every((key) => keys.includes(key))) {
    fail(`${label}[${index}] has unexpected fields`)
  }
  const problemId = entry.problemId
  if (typeof problemId !== 'string' || !isKnownProblemId(problemId)) {
    fail(`${label}[${index}] does not name a problem in this catalogue`)
  }
  if (seen.has(problemId)) fail(`duplicate ${noun} for "${problemId}"`)
  seen.add(problemId)
  return { record: entry, problemId }
}

/** A required text field, optionally length-capped, with the row's error text. */
function textField(
  record: Record<string, unknown>,
  key: string,
  label: string,
  index: number,
  limit?: number,
): string {
  const value = record[key]
  if (typeof value !== 'string') fail(`${label}[${index}].${key} must be text`)
  if (limit !== undefined && value.length > limit) {
    fail(`${label}[${index}].${key} is over ${limit} characters`)
  }
  return value
}

function parseTimestamp(value: unknown, label: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length > 40) {
    fail(`${label} must be an ISO timestamp string or null`)
  }
  return value
}

/** Schema v7 stamps: the same caps rules v8 enforce (30 × 140, at ≤ 86 400). */
function parseMoments(raw: unknown, index: number): Moment[] | undefined {
  if (raw === undefined) return undefined
  if (!Array.isArray(raw)) fail(`snippets[${index}].moments must be an array`)
  if (raw.length > MOMENT_LIMIT) fail(`snippets[${index}].moments has more than ${MOMENT_LIMIT} stamps`)
  const moments = raw.map((item, position) => {
    if (!isRecord(item)) fail(`snippets[${index}].moments[${position}] must be an object`)
    const { at, text, createdAt } = item
    if (typeof at !== 'number' || !Number.isFinite(at) || at < 0 || at > MOMENT_AT_LIMIT) {
      fail(`snippets[${index}].moments[${position}].at must be 0–${MOMENT_AT_LIMIT} seconds`)
    }
    if (typeof text !== 'string' || text.trim() === '' || text.length > MOMENT_TEXT_LIMIT) {
      fail(`snippets[${index}].moments[${position}].text must be 1–${MOMENT_TEXT_LIMIT} characters`)
    }
    return { at: Math.floor(at), text, createdAt: parseTimestamp(createdAt, `snippets[${index}].moments[${position}].createdAt`) ?? '' }
  })
  return moments.length > 0 ? moments : undefined
}

/** Schema v5+ saved solutions, validated exactly as rules v6/v7/v8 store them. */
function parseSnippets(raw: unknown, schemaVersion: number): BackupSnippet[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) fail('snippets must be an array')
  if (schemaVersion < 5 && raw.length > 0) {
    // Files before v5 never carried a snippets array; content there is not a
    // shape we ever produced, so refuse it instead of guessing.
    fail(`a schemaVersion ${schemaVersion} backup cannot contain snippets`)
  }
  const seen = new Set<string>()
  return raw.map((entry, index) => {
    const { record, problemId } = rowProblemId(entry, 'snippets', 'snippet', index, SNIPPET_KEYS, seen)
    entry = record
    if (!isCodeLanguage(entry.language)) fail(`snippets[${index}].language is not a supported language`)
    const code = textField(entry, 'code', 'snippets', index, CODE_LIMIT)
    const notes = entry.notes === undefined ? '' : textField(entry, 'notes', 'snippets', index, SNIPPET_NOTES_LIMIT)
    if (entry.verdict !== undefined && !isSnippetVerdict(entry.verdict)) {
      fail(`snippets[${index}].verdict must be clean, hint or couldnt`)
    }
    if (entry.moments !== undefined && schemaVersion < 7) {
      // v6 and earlier never carried stamps: an unknown field there is not
      // something we produced, so it is refused rather than guessed at.
      fail(`a schemaVersion ${schemaVersion} backup cannot contain stamps`)
    }
    const moments = parseMoments(entry.moments, index)
    if (snippetIsEmpty(code, notes, moments ?? [])) fail(`snippets[${index}] is empty`)
    return {
      problemId,
      language: entry.language,
      code,
      notes,
      ...(isSnippetVerdict(entry.verdict) ? { verdict: entry.verdict } : {}),
      ...(moments ? { moments } : {}),
      updatedAt: parseTimestamp(entry.updatedAt, `snippets[${index}].updatedAt`),
    }
  })
}

/**
 * Schema ≤4 markdown notes, migrated to saved solutions. The old `snippet`
 * field was already code and is kept byte-for-byte; the markdown body is
 * dropped except its plain-text tail. Every affected id is named in one
 * warning so nothing is lost silently.
 */
function migrateLegacyNotes(raw: unknown, schemaVersion: number): { snippets: BackupSnippet[]; warnings: string[] } {
  if (raw === undefined) return { snippets: [], warnings: [] }
  if (!Array.isArray(raw)) fail('notes must be an array')
  if (schemaVersion === 1 && raw.length > 0) {
    // Phase-2 files always wrote this array empty; content there is not a
    // shape we ever produced, so refuse it instead of guessing.
    fail('a schemaVersion 1 backup cannot contain notes')
  }
  if (schemaVersion >= 5 && raw.length > 0) {
    fail(`a schemaVersion ${schemaVersion} backup cannot contain notes`)
  }
  const seen = new Set<string>()
  const snippets: BackupSnippet[] = []
  const shortened: string[] = []
  for (const [index, rawEntry] of raw.entries()) {
    const { record: entry, problemId } = rowProblemId(rawEntry, 'notes', 'note', index, LEGACY_NOTE_KEYS, seen)
    const markdown = textField(entry, 'markdown', 'notes', index, LEGACY_NOTE_MARKDOWN_LIMIT)
    const code = textField(entry, 'snippet', 'notes', index, LEGACY_NOTE_SNIPPET_LIMIT)
    if (markdown.trim() === '' && code.trim() === '') fail(`notes[${index}] is empty`)
    const updatedAt = parseTimestamp(entry.updatedAt, `notes[${index}].updatedAt`)
    const { snippet, bodyDropped } = legacyNoteToSnippet(problemId, markdown, code)
    if (bodyDropped) shortened.push(problemId)
    if (snippet) snippets.push({ ...snippet, updatedAt })
  }
  const warnings =
    shortened.length > 0
      ? [
          `Old notes became ${SNIPPET_NOTES_LIMIT}-character reminders beside your code (markdown dropped) for: ${shortened.join(', ')}. Code kept exactly.`,
        ]
      : []
  return { snippets, warnings }
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

const QUIZ_RESULT_KEYS = ['topicId', 'bestScore', 'bestTotal', 'attempts', 'lastScore', 'lastAt', 'passed']

function parseQuizResults(raw: unknown, schemaVersion: number): BackupQuizResult[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) fail('quizResults must be an array')
  if (schemaVersion < 6 && raw.length > 0) {
    fail(`a schemaVersion ${schemaVersion} backup cannot contain quizResults`)
  }
  const seen = new Set<string>()
  return raw.map((entry, index) => {
    if (!isRecord(entry)) fail(`quizResults[${index}] must be an object`)
    if (!Object.keys(entry).every((key) => QUIZ_RESULT_KEYS.includes(key))) {
      fail(`quizResults[${index}] has unexpected fields`)
    }
    const topicId = entry.topicId
    if (typeof topicId !== 'string' || !knownIds.has(topicId)) {
      fail(`quizResults[${index}] does not name a topic in this catalogue`)
    }
    if (seen.has(topicId)) fail(`duplicate quiz result for "${topicId}"`)
    seen.add(topicId)
    const bestTotal = entry.bestTotal
    if (typeof bestTotal !== 'number' || !Number.isInteger(bestTotal) || bestTotal < 1 || bestTotal > QUIZ_TARGET_COUNT) {
      fail(`quizResults[${index}].bestTotal must be an integer from 1 to ${QUIZ_TARGET_COUNT}`)
    }
    const bestScore = entry.bestScore
    if (typeof bestScore !== 'number' || !Number.isInteger(bestScore) || bestScore < 0 || bestScore > bestTotal) {
      fail(`quizResults[${index}].bestScore must be an integer from 0 to bestTotal`)
    }
    const lastScore = entry.lastScore
    if (typeof lastScore !== 'number' || !Number.isInteger(lastScore) || lastScore < 0 || lastScore > bestTotal) {
      fail(`quizResults[${index}].lastScore must be an integer from 0 to bestTotal`)
    }
    const attempts = entry.attempts
    if (typeof attempts !== 'number' || !Number.isInteger(attempts) || attempts < 1 || attempts > MAX_QUIZ_ATTEMPTS) {
      fail(`quizResults[${index}].attempts must be an integer from 1 to ${MAX_QUIZ_ATTEMPTS}`)
    }
    if (typeof entry.passed !== 'boolean') {
      fail(`quizResults[${index}].passed must be a boolean`)
    }
    const lastAt = parseTimestamp(entry.lastAt, `quizResults[${index}].lastAt`) ?? new Date(0).toISOString()
    return {
      topicId,
      bestScore,
      bestTotal,
      attempts,
      lastScore,
      lastAt,
      passed: entry.passed,
    }
  })
}

export function parseBackup(text: string): { backup: Backup; counts: BackupCounts; warnings: string[] } {
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
    // Malformed or absent device preferences fall back to the default rather
    // than failing the whole import: they describe a device, not your record.
    density: clampDensity(p.density),
    railCollapsed: p.railCollapsed === true,
    // Targets are sanitised like the device preferences: a malformed value
    // becomes "no target" rather than failing an otherwise good import.
    targetDate: clampTargetDate(p.targetDate),
    targetListId: clampTargetListId(p.targetListId),
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
      // Earlier schemas predate revision counts and outcomes. Normalize legacy
      // solved rows to `clean`; todo rows must never carry an outcome.
      nextShard[problemId] = {
        ...value,
        rc: value.rc ?? 0,
        ...(value.s === 'todo' ? {} : { o: value.o ?? 'clean' }),
      }
    }
    if (Object.keys(nextShard).length > 0) progressByTopic[topicId] = nextShard
  }

  const currentSnippets = parseSnippets(raw.snippets, schemaVersion)
  const legacy = migrateLegacyNotes(raw.notes, schemaVersion)
  const snippets = schemaVersion >= 5 ? currentSnippets : legacy.snippets
  const lists = parseLists(raw.lists, schemaVersion)
  const plans = parsePlans(raw.plans, schemaVersion)
  const quizResults = parseQuizResults(raw.quizResults, schemaVersion)

  const backup: Backup = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    generatedBy: 'DSA Archive',
    exportedAt: raw.exportedAt,
    profile,
    progressByTopic,
    snippets,
    lists,
    plans,
    quizResults,
    excluded: Array.isArray(raw.excluded) ? raw.excluded.filter((item): item is string => typeof item === 'string') : [],
  }
  return {
    backup,
    counts: {
      topics: Object.keys(progressByTopic).length,
      rows: countCloudRows(progressByTopic),
      snippets: snippets.length,
      lists: lists.length,
      plans: plans.length,
      quizResults: quizResults.length,
    },
    warnings: schemaVersion >= 5 ? [] : legacy.warnings,
  }
}
