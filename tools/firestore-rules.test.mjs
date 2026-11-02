/**
 * Firestore Security Rules v1 — Emulator Suite proof (roadmap 2.3).
 * Run by `npm run test:emulator`; CI starts Auth + Firestore emulators first.
 *
 * No Admin SDK and no service-account key: @firebase/rules-unit-testing
 * supplies signed-in/stranger/anonymous client contexts against the emulator.
 */
import { after, before, beforeEach, describe, it } from 'node:test'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

const projectId = 'demo-dsa-archive'
const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8')
const catalogue = JSON.parse(await readFile(new URL('../data/problems.json', import.meta.url), 'utf8'))
const arraysIds = catalogue.topics
  .find((topic) => topic.id === 'arrays')
  .subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id))
const beginnerIds = catalogue.topics
  .find((topic) => topic.id === 'beginner-problems')
  .subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id))

let env

function profile(uid, overrides = {}) {
  return {
    uid,
    displayName: 'Alice Archive',
    photoURL: null,
    dailyGoal: 5,
    theme: 'dark',
    hideDone: false,
    shareSummary: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

function entry(overrides = {}) {
  return {
    s: 'done',
    b: false,
    a: 1,
    fd: '2026-11-02T00:00:00.000Z',
    lr: null,
    ...overrides,
  }
}

function ref(db, uid, topicId = 'arrays') {
  return doc(db, `users/${uid}/progressByTopic/${topicId}`)
}

function progressWrite(problemId, value) {
  return { [problemId]: value, updatedAt: serverTimestamp() }
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { host: '127.0.0.1', port: 8080, rules },
  })
})

after(async () => {
  await env?.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
})

describe('Firestore rules v1 — own-data-only and default deny', () => {
  it('lets the owner create a valid profile and one-entry topic shard', async () => {
    const alice = env.authenticatedContext('alice', { email: 'alice@example.test' }).firestore()
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), profile('alice')))
    await assertSucceeds(
      setDoc(ref(alice, 'alice'), progressWrite(arraysIds[0], entry()), { merge: true }),
    )
    const snap = await assertSucceeds(getDoc(ref(alice, 'alice')))
    assert.equal(snap.data()[arraysIds[0]].s, 'done')
    await assertSucceeds(getDocs(collection(alice, 'users/alice/progressByTopic')))
  })

  it('proves user A cannot read or write user B data; signed-out access is denied', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const bob = env.authenticatedContext('bob').firestore()
    const stranger = env.unauthenticatedContext().firestore()
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), profile('alice')))
    await assertSucceeds(
      setDoc(ref(alice, 'alice'), progressWrite(arraysIds[0], entry()), { merge: true }),
    )

    await assertFails(getDoc(doc(bob, 'users/alice')))
    await assertFails(getDoc(ref(bob, 'alice')))
    await assertFails(getDocs(collection(bob, 'users/alice/progressByTopic')))
    await assertFails(getDoc(ref(stranger, 'alice')))
    await assertFails(
      setDoc(ref(bob, 'alice'), progressWrite(arraysIds[1], entry()), { merge: true }),
    )
    await assertFails(deleteDoc(ref(bob, 'alice')))
    // An allow rule on one path never opens an unspecified future collection.
    await assertFails(getDoc(doc(alice, 'users/alice/notes/secret')))
  })

  it('validates profile field types and sizes', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const userDoc = doc(alice, 'users/alice')

    await assertFails(setDoc(userDoc, profile('alice', { displayName: 'x'.repeat(81) })))
    await assertFails(setDoc(userDoc, profile('alice', { photoURL: 'x'.repeat(301) })))
    await assertFails(setDoc(userDoc, profile('alice', { theme: 'neon' })))
    await assertFails(setDoc(userDoc, profile('alice', { shareSummary: 'yes' })))
    await assertFails(setDoc(userDoc, profile('alice', { dailyGoal: 0 })))
    await assertFails(setDoc(userDoc, profile('alice', { uid: 'someone-else' })))

    await assertSucceeds(setDoc(userDoc, profile('alice')))
    await assertSucceeds(
      setDoc(userDoc, { theme: 'light', hideDone: true, updatedAt: serverTimestamp() }, { merge: true }),
    )
    await assertFails(
      setDoc(userDoc, { theme: 'neon', updatedAt: serverTimestamp() }, { merge: true }),
    )
  })

  it('validates progress fields, known ids, one-entry writes and oversized values', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const shard = ref(alice, 'alice')

    await assertFails(
      setDoc(shard, progressWrite(arraysIds[0], entry({ s: 'hacked' })), { merge: true }),
    )
    await assertFails(
      setDoc(shard, progressWrite(arraysIds[0], entry({ b: 'yes' })), { merge: true }),
    )
    await assertFails(
      setDoc(shard, progressWrite(arraysIds[0], entry({ a: 10001 })), { merge: true }),
    )
    await assertFails(
      setDoc(shard, progressWrite(arraysIds[0], entry({ fd: 'x'.repeat(41) })), { merge: true }),
    )
    await assertFails(
      setDoc(shard, progressWrite('not-a-problem', entry()), { merge: true }),
    )

    // An oversized bulk write (83 changed entries + updatedAt) is refused even
    // though every id and value is individually known and valid.
    const bulk = Object.fromEntries(beginnerIds.map((id) => [id, entry()]))
    bulk.updatedAt = serverTimestamp()
    await assertFails(setDoc(ref(alice, 'alice', 'beginner-problems'), bulk, { merge: true }))

    // Multi-key writes are refused; the app writes one problem entry per call.
    await assertFails(
      setDoc(
        shard,
        {
          [arraysIds[0]]: entry(),
          [arraysIds[1]]: entry(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    )

    await assertSucceeds(
      setDoc(shard, progressWrite(arraysIds[0], entry()), { merge: true }),
    )
    await assertSucceeds(
      setDoc(shard, progressWrite(arraysIds[0], entry({ b: true })), { merge: true }),
    )
    // Explicit deletion of one known key is allowed for merge/import.
    await assertSucceeds(
      setDoc(shard, { [arraysIds[0]]: deleteField(), updatedAt: serverTimestamp() }, { merge: true }),
    )
    await assertSucceeds(deleteDoc(shard))
  })
})
