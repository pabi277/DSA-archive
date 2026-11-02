import { describe, expect, it } from 'vitest'
import { BackupError, createBackup, parseBackup } from './backup'
import type { CloudProgressEntry } from './cloudProgress'

const now = '2026-11-02T12:00:00.000Z'
const cloudEntry: CloudProgressEntry = { s: 'done', b: true, a: 2, fd: now, lr: null }
const input = {
  account: { displayName: 'CI Owner', email: 'ci.owner@example.test' },
  settings: { theme: 'dark' as const, largeText: false, hideDone: true },
  progressByTopic: { arrays: { 'two-sum': cloudEntry } },
  exportedAt: now,
}

describe('phase-2 JSON backup', () => {
  it('round-trips profile settings and cloud progress with preview counts', () => {
    const text = createBackup(input)
    const parsed = parseBackup(text)
    expect(parsed.counts).toEqual({ topics: 1, rows: 1, notes: 0, lists: 0, plans: 0 })
    expect(parsed.backup.schemaVersion).toBe(1)
    expect(parsed.backup.profile).toMatchObject({
      theme: 'dark',
      largeText: false,
      hideDone: true,
      dailyGoal: 5,
      shareSummary: false,
    })
    expect(parsed.backup.progressByTopic.arrays['two-sum']).toEqual(cloudEntry)
    expect(parsed.backup.excluded).toContain('friends')
  })

  it('rejects invalid JSON, wrong schema versions and oversized files', () => {
    expect(() => parseBackup('{not json')).toThrowError(BackupError)
    expect(() => parseBackup('{not json')).toThrowError(/not valid JSON/)
    expect(() => parseBackup(JSON.stringify({ ...JSON.parse(createBackup(input)), schemaVersion: 2 }))).toThrowError(
      /unsupported schemaVersion/,
    )
    expect(() => parseBackup('x'.repeat(1_000_001))).toThrowError(/1 MB/)
  })

  it('rejects unknown catalogue ids and invalid progress entries', () => {
    const backup = JSON.parse(createBackup(input))
    backup.progressByTopic = { 'not-a-topic': {} }
    expect(() => parseBackup(JSON.stringify(backup))).toThrowError(/unknown topic id/)

    const backup2 = JSON.parse(createBackup(input))
    backup2.progressByTopic.arrays['not-a-problem'] = cloudEntry
    expect(() => parseBackup(JSON.stringify(backup2))).toThrowError(/unknown problem id/)

    const backup3 = JSON.parse(createBackup(input))
    backup3.progressByTopic.arrays['two-sum'].a = -1
    expect(() => parseBackup(JSON.stringify(backup3))).toThrowError(/invalid progress entry/)
  })
})
