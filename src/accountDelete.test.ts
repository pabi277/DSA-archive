import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The deletion contract from docs/phases-v2/09-…/PLAN.md §7, proven locally with
 * a fake Firestore. e2e/account-deletion.spec.ts proves the same list against
 * the real emulator. Nothing here touches the network.
 */
const fns = vi.hoisted(() => ({
  doc: vi.fn((...parts: unknown[]) => ({ path: parts.slice(1).join('/') })),
  collection: vi.fn((...parts: unknown[]) => ({ path: parts.slice(1).join('/') })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
  deletes: [] as string[],
}))

vi.mock('firebase/firestore', () => ({
  doc: fns.doc,
  collection: fns.collection,
  getDoc: fns.getDoc,
  getDocs: fns.getDocs,
  writeBatch: fns.writeBatch,
}))

import {
  DELETION_COLLECTIONS,
  LOCAL_STUDY_KEYS,
  clearLocalStudyData,
  deleteMyData,
} from './accountDelete'

beforeEach(() => {
  fns.deletes.length = 0
  fns.getDoc.mockReset()
  fns.getDocs.mockReset()
  fns.writeBatch.mockReset()
  fns.writeBatch.mockImplementation(() => ({
    delete: (ref: { path: string }) => {
      fns.deletes.push(ref.path)
    },
    commit: async () => undefined,
  }))
  fns.getDoc.mockResolvedValue({ data: () => ({ friendCode: 'a'.repeat(32) }) })
  const docsByCollection: Record<string, string[]> = {
    progressByTopic: ['arrays', 'strings'],
    snippets: ['two-sum'],
    quizResults: ['arrays'],
    lists: ['list-1'],
    plans: ['2026-11-05'],
    friends: ['bob', 'carol'],
  }
  fns.getDocs.mockImplementation(async (ref: { path: string }) => {
    const name = ref.path.split('/').pop() ?? ''
    return { docs: (docsByCollection[name] ?? []).map((id) => ({ id, ref: { path: `${ref.path}/${id}` } })) }
  })
})

describe('deleteMyData', () => {
  it('removes every named shape, the reciprocal friend links, the invite and the profile last', async () => {
    const report = await deleteMyData({} as never, 'alice')
    expect(report.documents).toBe(fns.deletes.length)
    for (const name of DELETION_COLLECTIONS) {
      expect(fns.deletes.some((path) => path.startsWith(`users/alice/${name}/`))).toBe(true)
    }
    expect(fns.deletes).toContain('users/alice/public/summary')
    expect(fns.deletes).toContain('users/bob/friends/alice')
    expect(fns.deletes).toContain('users/carol/friends/alice')
    expect(fns.deletes).toContain(`invites/${'a'.repeat(32)}`)
    // The profile must be the final delete: listeners can read subcollections
    // until that commit, and the caller signs out immediately afterwards.
    expect(fns.deletes.at(-1)).toBe('users/alice')
    expect(report.paths).toContain('profile')
  })

  it('skips the invite when the profile carries no valid capability', async () => {
    fns.getDoc.mockResolvedValue({ data: () => ({ friendCode: 'not-a-capability' }) })
    await deleteMyData({} as never, 'alice')
    expect(fns.deletes.some((path) => path.startsWith('invites/'))).toBe(false)
  })

  it('names exactly the seven shapes the phase contract lists', () => {
    expect([...DELETION_COLLECTIONS, 'public/summary']).toEqual([
      'progressByTopic',
      'snippets',
      'quizResults',
      'lists',
      'plans',
      'friends',
      'public/summary',
    ])
  })
})

describe('clearLocalStudyData', () => {
  it('removes guest study records and leaves device preferences alone', () => {
    const removed: string[] = []
    clearLocalStudyData({ removeItem: (key: string) => removed.push(key) })
    expect(removed).toEqual([...LOCAL_STUDY_KEYS])
    expect(removed).not.toContain('dsa-archive.settings.v1')
  })

  it('survives a storage that throws (private mode)', () => {
    expect(() =>
      clearLocalStudyData({
        removeItem: () => {
          throw new Error('blocked')
        },
      }),
    ).not.toThrow()
  })
})
