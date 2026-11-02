/**
 * Firestore Security Rules — Emulator Suite proof (roadmap 2.3, extended in
 * phases 3.1/3.3 and 4.1/4.2).
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
    rc: 0,
    ...overrides,
  }
}

function planDoc(problemIds = [], doneIds = [], overrides = {}) {
  return { problemIds, doneIds, updatedAt: serverTimestamp(), ...overrides }
}

function planRef(db, uid, date = '2026-11-03') {
  return doc(db, `users/${uid}/plans/${date}`)
}

function ref(db, uid, topicId = 'arrays') {
  return doc(db, `users/${uid}/progressByTopic/${topicId}`)
}

function progressWrite(problemId, value) {
  return { [problemId]: value, updatedAt: serverTimestamp() }
}

function noteDoc(overrides = {}) {
  return {
    markdown: '## Two sum\nUse a **hash map** and store the complement.',
    snippet: 'const seen = new Map()',
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

function listDoc(problemIds = [arraysIds[0], arraysIds[1]], overrides = {}) {
  return { title: 'Interview warmup', problemIds, updatedAt: serverTimestamp(), ...overrides }
}

function noteRef(db, uid, problemId = arraysIds[0]) {
  return doc(db, `users/${uid}/notes/${problemId}`)
}

function listRef(db, uid, listId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa') {
  return doc(db, `users/${uid}/lists/${listId}`)
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
    // (Notes and lists became owner-only in phase 3, plans in phase 4; friends
    // and summaries stay default-deny until phase 5 ships explicit rules.)
    await assertFails(getDoc(doc(alice, 'users/alice/friends/bob')))
    await assertFails(setDoc(doc(alice, 'users/alice/friends/bob'), { addedAt: serverTimestamp() }))
    await assertFails(getDoc(doc(alice, 'users/alice/public/summary')))
    await assertFails(setDoc(doc(alice, 'users/alice/public/summary'), { solvedCount: 1 }))
    await assertFails(getDoc(doc(alice, 'users/alice/not-a-collection/secret')))
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
    // Phase 4: `rc` is part of the entry contract — required, integer, bounded.
    await assertFails(
      setDoc(shard, progressWrite(arraysIds[0], entry({ rc: undefined })), { merge: true }),
    )
    await assertFails(
      setDoc(shard, progressWrite(arraysIds[0], entry({ rc: -1 })), { merge: true }),
    )
    await assertFails(
      setDoc(shard, progressWrite(arraysIds[0], entry({ rc: 1.5 })), { merge: true }),
    )
    await assertFails(
      setDoc(shard, progressWrite(arraysIds[0], entry({ rc: '1' })), { merge: true }),
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
    // A revised row: solved, with a higher revision count and a fresh lr.
    await assertSucceeds(
      setDoc(
        shard,
        progressWrite(arraysIds[0], entry({ rc: 1, lr: '2026-11-05T00:00:00.000Z' })),
        { merge: true },
      ),
    )
    // Explicit deletion of one known key is allowed for merge/import.
    await assertSucceeds(
      setDoc(shard, { [arraysIds[0]]: deleteField(), updatedAt: serverTimestamp() }, { merge: true }),
    )
    await assertSucceeds(deleteDoc(shard))
  })
})

describe('Firestore rules v2 — phase-3 notes (3.1)', () => {
  it('lets the owner write, list, update and delete notes; strangers are denied', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const bob = env.authenticatedContext('bob').firestore()
    const stranger = env.unauthenticatedContext().firestore()

    await assertSucceeds(setDoc(noteRef(alice, 'alice'), noteDoc()))
    const snap = await assertSucceeds(getDoc(noteRef(alice, 'alice')))
    assert.equal(snap.data().markdown.includes('hash map'), true)
    await assertSucceeds(getDocs(collection(alice, 'users/alice/notes')))
    await assertSucceeds(
      setDoc(noteRef(alice, 'alice'), noteDoc({ markdown: 'Shrunk note' }), { merge: true }),
    )
    await assertSucceeds(deleteDoc(noteRef(alice, 'alice')))

    await assertFails(getDoc(noteRef(bob, 'alice')))
    await assertFails(getDocs(collection(bob, 'users/alice/notes')))
    await assertFails(setDoc(noteRef(bob, 'alice'), noteDoc()))
    await assertFails(deleteDoc(noteRef(bob, 'alice')))
    await assertFails(getDoc(noteRef(stranger, 'alice')))
    await assertFails(setDoc(noteRef(stranger, 'alice'), noteDoc()))
  })

  it('validates note field types, size caps, doc ids and the empty-note rule', async () => {
    const alice = env.authenticatedContext('alice').firestore()

    await assertFails(setDoc(noteRef(alice, 'alice'), noteDoc({ markdown: 'x'.repeat(5001) })))
    await assertFails(setDoc(noteRef(alice, 'alice'), noteDoc({ snippet: 'x'.repeat(8001) })))
    await assertFails(setDoc(noteRef(alice, 'alice'), noteDoc({ extra: 'field' })))
    await assertFails(setDoc(noteRef(alice, 'alice'), noteDoc({ markdown: 42 })))
    await assertFails(setDoc(noteRef(alice, 'alice'), { markdown: 'no snippet key' }))
    // An all-empty note must be deleted instead of stored (the client does).
    await assertFails(setDoc(noteRef(alice, 'alice'), noteDoc({ markdown: '', snippet: '' })))
    await assertFails(setDoc(noteRef(alice, 'alice'), noteDoc({ updatedAt: '2026-11-02T00:00:00.000Z' })))
    await assertFails(setDoc(noteRef(alice, 'alice', 'Not A Slug!'), noteDoc()))

    // A snippet-only note is a real note; the row shows the code card.
    await assertSucceeds(
      setDoc(noteRef(alice, 'alice'), noteDoc({ markdown: '', snippet: 'while (lo < hi) {}' })),
    )
    await assertSucceeds(setDoc(noteRef(alice, 'alice'), noteDoc({ markdown: 'x'.repeat(5000) })))
  })
})

describe('Firestore rules v2 — phase-3 custom lists (3.3)', () => {
  it('lets the owner create, extend, list and delete a list; strangers are denied', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const bob = env.authenticatedContext('bob').firestore()
    const stranger = env.unauthenticatedContext().firestore()

    await assertSucceeds(setDoc(listRef(alice, 'alice'), listDoc()))
    await assertSucceeds(
      setDoc(
        listRef(alice, 'alice'),
        listDoc([arraysIds[0], arraysIds[1], arraysIds[2]]),
        { merge: true },
      ),
    )
    const snap = await assertSucceeds(getDoc(listRef(alice, 'alice')))
    assert.equal(snap.data().problemIds.length, 3)
    await assertSucceeds(getDocs(collection(alice, 'users/alice/lists')))
    await assertSucceeds(deleteDoc(listRef(alice, 'alice')))

    await assertFails(getDoc(listRef(bob, 'alice')))
    await assertFails(getDocs(collection(bob, 'users/alice/lists')))
    await assertFails(setDoc(listRef(bob, 'alice'), listDoc()))
    await assertFails(deleteDoc(listRef(bob, 'alice')))
    await assertFails(setDoc(listRef(stranger, 'alice'), listDoc()))
  })

  it('validates list ids, titles, sizes and field sets', async () => {
    const alice = env.authenticatedContext('alice').firestore()

    await assertFails(setDoc(listRef(alice, 'alice', 'abc'), listDoc()))
    await assertFails(setDoc(listRef(alice, 'alice', 'UPPER-CASE-ID-123'), listDoc()))
    await assertFails(setDoc(listRef(alice, 'alice'), listDoc(undefined, { title: 'x'.repeat(61) })))
    await assertFails(setDoc(listRef(alice, 'alice'), listDoc(undefined, { title: '' })))
    await assertFails(setDoc(listRef(alice, 'alice'), listDoc(undefined, { extra: true })))
    await assertFails(
      setDoc(listRef(alice, 'alice'), listDoc(undefined, { problemIds: 'two-sum' })),
    )
    await assertFails(
      setDoc(
        listRef(alice, 'alice'),
        listDoc(Array.from({ length: 201 }, (_, index) => arraysIds[index % arraysIds.length])),
      ),
    )
    // 200 ids whose joined text is 20,000 characters: refused by the text cap.
    await assertFails(
      setDoc(
        listRef(alice, 'alice'),
        listDoc(Array.from({ length: 200 }, () => 'x'.repeat(100))),
      ),
    )

    await assertSucceeds(setDoc(listRef(alice, 'alice'), listDoc([])))
    await assertSucceeds(
      setDoc(listRef(alice, 'alice'), listDoc(Array.from({ length: 200 }, (_, index) => String(index))), {
        merge: true,
      }),
    )
  })
})

describe('Firestore rules v3 — phase-4 daily planner (4.1)', () => {
  it('lets the owner create, extend, read, list and delete a plan; strangers are denied', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const bob = env.authenticatedContext('bob').firestore()
    const stranger = env.unauthenticatedContext().firestore()

    await assertSucceeds(setDoc(planRef(alice, 'alice'), planDoc([arraysIds[0], arraysIds[1]])))
    await assertSucceeds(
      setDoc(
        planRef(alice, 'alice'),
        planDoc([arraysIds[0], arraysIds[1], arraysIds[2]], [arraysIds[0]]),
        { merge: true },
      ),
    )
    const snap = await assertSucceeds(getDoc(planRef(alice, 'alice')))
    assert.equal(snap.data().problemIds.length, 3)
    assert.equal(snap.data().doneIds.length, 1)
    await assertSucceeds(getDocs(collection(alice, 'users/alice/plans')))

    await assertFails(getDoc(planRef(bob, 'alice')))
    await assertFails(getDocs(collection(bob, 'users/alice/plans')))
    await assertFails(setDoc(planRef(bob, 'alice'), planDoc([arraysIds[0]])))
    await assertFails(deleteDoc(planRef(bob, 'alice')))
    await assertFails(setDoc(planRef(stranger, 'alice'), planDoc([arraysIds[0]])))

    await assertSucceeds(deleteDoc(planRef(alice, 'alice')))
  })

  it('validates the day id, field set, size caps, subset rule and server timestamp', async () => {
    const alice = env.authenticatedContext('alice').firestore()

    await assertFails(setDoc(planRef(alice, 'alice', 'yesterday'), planDoc([])))
    await assertFails(setDoc(planRef(alice, 'alice', '2026-11-3'), planDoc([])))
    await assertFails(setDoc(planRef(alice, 'alice'), planDoc([], [], { extra: true })))
    await assertFails(
      setDoc(planRef(alice, 'alice'), { problemIds: [arraysIds[0]] , updatedAt: serverTimestamp() }),
    )
    await assertFails(
      setDoc(planRef(alice, 'alice'), planDoc([], [], { problemIds: 'two-sum' })),
    )
    await assertFails(
      setDoc(planRef(alice, 'alice'), planDoc(Array.from({ length: 201 }, () => arraysIds[0]))),
    )
    // doneIds must be a subset of problemIds — a day cannot tick unplanned work.
    await assertFails(setDoc(planRef(alice, 'alice'), planDoc([arraysIds[0]], [arraysIds[1]])))
    await assertFails(
      setDoc(planRef(alice, 'alice'), planDoc([], [], { updatedAt: '2026-11-03T00:00:00.000Z' })),
    )

    // An empty day and a full 200-problem day are both legal.
    await assertSucceeds(setDoc(planRef(alice, 'alice'), planDoc([])))
    await assertSucceeds(
      setDoc(
        planRef(alice, 'alice'),
        planDoc(Array.from({ length: 200 }, (_, index) => `p${index}`)),
        { merge: true },
      ),
    )
  })
})
