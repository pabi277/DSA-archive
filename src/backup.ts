/**
 * Phase 2.4 anti-lock-in backup. One JSON file carries profile settings plus
 * every progressByTopic row; friends/summaries are deliberately excluded.
 * Phase 3/4 note/list/plan arrays are present but empty in schema v1.
 */
import { catalogue } from './catalogue'
import {
  countCloudRows,
  isValidCloudEntry,
  type CloudProgressByTopic,
  type CloudTopicProgress,
} from './cloudProgress'
import type { Settings, Theme } from './settings'

export const BACKUP_SCHEMA_VERSION = 1
const MAX_BACKUP_BYTES = 1_000_000

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
  schemaVersion: typeof BACKUP_SCHEMA_VERSION
  generatedBy: 'DSA Archive'
  exportedAt: string
  profile: BackupProfile
  progressByTopic: CloudProgressByTopic
  notes: unknown[]
  lists: unknown[]
  plans: unknown[]
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
      dailyGoal: 5,
      shareSummary: false,
    },
    progressByTopic: input.progressByTopic,
    notes: [],
    lists: [],
    plans: [],
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

export function parseBackup(text: string): { backup: Backup; counts: BackupCounts } {
  if (text.length > MAX_BACKUP_BYTES) {
    throw new BackupError('file is larger than the 1 MB backup limit')
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('file is not valid JSON')
  }
  if (!isRecord(raw)) throw new BackupError('root must be a JSON object')
  if (raw.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new BackupError(`unsupported schemaVersion (expected ${BACKUP_SCHEMA_VERSION})`)
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
      nextShard[problemId] = value
    }
    if (Object.keys(nextShard).length > 0) progressByTopic[topicId] = nextShard
  }

  for (const key of ['notes', 'lists', 'plans'] as const) {
    if (raw[key] !== undefined && !Array.isArray(raw[key])) {
      throw new BackupError(`${key} must be an array`)
    }
  }

  const backup: Backup = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    generatedBy: 'DSA Archive',
    exportedAt: raw.exportedAt,
    profile,
    progressByTopic,
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    lists: Array.isArray(raw.lists) ? raw.lists : [],
    plans: Array.isArray(raw.plans) ? raw.plans : [],
    excluded: Array.isArray(raw.excluded) ? raw.excluded.filter((item): item is string => typeof item === 'string') : [],
  }
  return {
    backup,
    counts: {
      topics: Object.keys(progressByTopic).length,
      rows: countCloudRows(progressByTopic),
      notes: backup.notes.length,
      lists: backup.lists.length,
      plans: backup.plans.length,
    },
  }
}
