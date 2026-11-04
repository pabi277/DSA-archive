/**
 * Firestore Security Rules — Emulator Suite proof (roadmap 2.3, extended in
 * phases 3.3, 4.1/4.2 and v2-04 rules v6).
 * Run by `npm run test:emulator`; CI starts Auth + Firestore emulators first.
 *
 * No Admin SDK and no service-account key: @firebase/rules-unit-testing
 * supplies signed-in/stranger/anonymous client contexts against the emulator.
 */
import { after, before, beforeEach, describe, it } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
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
  writeBatch,
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
const practiceDir = new URL('../data/practice-sets/', import.meta.url)
const practiceSets = await Promise.all(
  (await readdir(practiceDir)).filter((name) => name.endsWith('.json')).map(async (name) =>
    JSON.parse(await readFile(new URL(name, practiceDir), 'utf8')),
  ),
)
const arraysDrill = practiceSets.find((set) => set.topicId === 'arrays')?.problems[0]
const arraysDrillId = arraysDrill ? `lc-${arraysDrill.lc}` : null

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

function snippetDoc(overrides = {}) {
  return {
    language: 'js',
    code: 'const seen = new Map()',
    notes: 'Store the complement.',
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

function listDoc(problemIds = [arraysIds[0], arraysIds[1]], overrides = {}) {
  return { title: 'Interview warmup', problemIds, updatedAt: serverTimestamp(), ...overrides }
}

function snippetRef(db, uid, problemId = arraysIds[0]) {
  return doc(db, `users/${uid}/snippets/${problemId}`)
}

/** The removed v1 collection: every access must now be default-denied. */
function legacyNoteRef(db, uid, problemId = arraysIds[0]) {
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
    // Invalid social writes and unknown paths remain denied.
    await assertFails(setDoc(doc(alice, 'users/alice/friends/bob'), { addedAt: serverTimestamp() }))
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

  it('accepts only the three done outcomes and rejects outcomes on todo rows', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const shard = ref(alice, 'alice')

    await assertSucceeds(
      setDoc(shard, progressWrite(arraysIds[0], entry({ o: 'clean' })), { merge: true }),
    )
    for (const outcome of ['hint', 'couldnt']) {
      await assertSucceeds(
        setDoc(shard, progressWrite(arraysIds[0], entry({ o: outcome })), { merge: true }),
      )
    }
    await assertFails(
      setDoc(shard, progressWrite(arraysIds[0], entry({ o: 'lucky-guess' })), { merge: true }),
    )
    await assertFails(
      setDoc(shard, progressWrite(arraysIds[0], entry({ s: 'todo', o: 'clean' })), { merge: true }),
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
    // (A missing key must be expressed by omitting it: the client SDK rejects
    // `undefined` values before the rules ever see them.)
    const { rc: _omitted, ...withoutRevisionCount } = entry()
    await assertFails(
      setDoc(shard, progressWrite(arraysIds[0], withoutRevisionCount), { merge: true }),
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

describe('Firestore rules v6 — phase v2-04 saved solutions (snippets)', () => {
  it('lets the owner write, list, update and delete snippets; strangers are denied', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const bob = env.authenticatedContext('bob').firestore()
    const stranger = env.unauthenticatedContext().firestore()

    await assertSucceeds(setDoc(snippetRef(alice, 'alice'), snippetDoc()))
    const snap = await assertSucceeds(getDoc(snippetRef(alice, 'alice')))
    assert.equal(snap.data().code.includes('new Map()'), true)
    await assertSucceeds(getDocs(collection(alice, 'users/alice/snippets')))
    await assertSucceeds(
      setDoc(snippetRef(alice, 'alice'), snippetDoc({ code: 'class Solution {}', language: 'cpp' }), { merge: true }),
    )
    await assertSucceeds(deleteDoc(snippetRef(alice, 'alice')))

    await assertFails(getDoc(snippetRef(bob, 'alice')))
    await assertFails(getDocs(collection(bob, 'users/alice/snippets')))
    await assertFails(setDoc(snippetRef(bob, 'alice'), snippetDoc()))
    await assertFails(deleteDoc(snippetRef(bob, 'alice')))
    await assertFails(getDoc(snippetRef(stranger, 'alice')))
    await assertFails(setDoc(snippetRef(stranger, 'alice'), snippetDoc()))
  })

  it('validates language/verdict enums, size caps, doc ids and the empty-snippet rule', async () => {
    const alice = env.authenticatedContext('alice').firestore()

    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ language: 'cobol' })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ verdict: 'lucky-guess' })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ code: 'x'.repeat(8001) })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ notes: 'x'.repeat(501) })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ extra: 'field' })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ code: 42 })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), { language: 'js', code: 'no notes key' }))
    // An all-empty snippet must be deleted instead of stored (the client does).
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ code: '', notes: '' })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ updatedAt: '2026-11-02T00:00:00.000Z' })))
    await assertFails(setDoc(snippetRef(alice, 'alice', 'Not A Slug!'), snippetDoc()))

    // Every language, an optional verdict, note-only and full-size code pass.
    for (const language of ['cpp', 'c', 'java', 'python', 'js', 'ts', 'go', 'rust', 'other']) {
      await assertSucceeds(setDoc(snippetRef(alice, 'alice'), snippetDoc({ language, verdict: 'hint' })))
    }
    await assertSucceeds(
      setDoc(snippetRef(alice, 'alice'), snippetDoc({ code: '', notes: 'Reminder before I re-solve it.' })),
    )
    await assertSucceeds(setDoc(snippetRef(alice, 'alice'), snippetDoc({ code: 'x'.repeat(8000), notes: 'y'.repeat(500) })))
    // Synthetic drill ids are catalogue-shaped slugs and can hold solutions.
    assert.ok(arraysDrillId, 'an arrays practice drill must exist')
    await assertSucceeds(setDoc(snippetRef(alice, 'alice', arraysDrillId), snippetDoc()))
  })

  it('proves the removed notes collection is default-denied, even for its owner', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    await assertFails(
      setDoc(legacyNoteRef(alice, 'alice'), {
        markdown: '## Two sum',
        snippet: 'const seen = new Map()',
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(getDoc(legacyNoteRef(alice, 'alice')))
    await assertFails(getDocs(collection(alice, 'users/alice/notes')))
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


describe('Firestore rules v4 — invitation and summary privacy', () => {
  it('requires an invite and reciprocal atomic friendship; only friends see opted-in summaries', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const bob = env.authenticatedContext('bob').firestore()
    const eve = env.authenticatedContext('eve').firestore()
    const anon = env.unauthenticatedContext().firestore()
    const code = 'a'.repeat(32)
    const friend = { code, addedAt: serverTimestamp() }
    const aliceFriend = doc(bob, 'users/alice/friends/bob')
    const bobFriend = doc(bob, 'users/bob/friends/alice')
    const summaryRef = doc(alice, 'users/alice/public/summary')
    const counts = Object.fromEntries(catalogue.topics.map((t) => [t.id, 0]))
    const summary = { displayName: 'Alice', solvedCount: 0, solvedByTopic: counts,
      currentStreak: 0, lastActiveDate: null, weeklySolved: 0, asOf: '2026-11-03' }
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), profile('alice')))
    await assertSucceeds(setDoc(doc(bob, 'users/bob'), profile('bob')))
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { theme: 'light', updatedAt: serverTimestamp() }, { merge: true }))
    await assertSucceeds(setDoc(doc(alice, 'invites', code), { uid: 'alice', createdAt: serverTimestamp() }))
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { friendCode: code, updatedAt: serverTimestamp() }, { merge: true }))
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { hideDone: true, updatedAt: serverTimestamp() }, { merge: true }))
    await assertFails(getDoc(doc(anon, 'invites', code)))
    await assertFails(getDocs(collection(bob, 'invites')))
    await assertFails(setDoc(bobFriend, friend))
    const fake = writeBatch(eve)
    fake.set(doc(eve, 'users/eve/friends/alice'), friend)
    fake.set(doc(eve, 'users/alice/friends/eve'), { ...friend, code: 'b'.repeat(32) })
    await assertFails(fake.commit())
    await assertFails(setDoc(summaryRef, summary))
    const batch = writeBatch(bob)
    batch.set(aliceFriend, friend)
    batch.set(bobFriend, friend)
    await assertSucceeds(batch.commit())
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { shareSummary: true, updatedAt: serverTimestamp() }, { merge: true }))
    await assertSucceeds(setDoc(summaryRef, summary))
    await assertFails(setDoc(summaryRef, { ...summary, snippets: 'private' }))
    await assertFails(setDoc(summaryRef, { ...summary, solvedCount: 5 }))
    await assertSucceeds(getDoc(doc(bob, 'users/alice/public/summary')))
    await assertFails(getDoc(doc(eve, 'users/alice/public/summary')))
    await assertFails(getDoc(doc(anon, 'users/alice/public/summary')))
    await assertFails(getDoc(doc(bob, 'users/alice')))
    await assertFails(getDoc(snippetRef(bob, 'alice')))
    await assertFails(getDocs(collection(bob, 'users/alice/snippets')))
    await assertFails(getDoc(ref(bob, 'alice')))
    await assertFails(getDocs(collection(bob, 'users/alice/progressByTopic')))
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { shareSummary: false, updatedAt: serverTimestamp() }, { merge: true }))
    await assertFails(getDoc(doc(bob, 'users/alice/public/summary')))
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { shareSummary: true, updatedAt: serverTimestamp() }, { merge: true }))
    await assertSucceeds(deleteDoc(doc(alice, 'users/alice/friends/bob')))
    await assertFails(getDoc(doc(bob, 'users/alice/public/summary')))
    await assertSucceeds(deleteDoc(doc(alice, 'users/bob/friends/alice')))
    await assertSucceeds(deleteDoc(doc(alice, 'invites', code)))
  })
})

describe('Firestore rules audit — phase 6.2 enumeration & tampering hardening', () => {
  it('blocks user/public directory enumeration, invite updates, and third-party friend deletion', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const bob = env.authenticatedContext('bob').firestore()
    const eve = env.authenticatedContext('eve').firestore()
    const code = 'c'.repeat(32)
    const friend = { code, addedAt: serverTimestamp() }

    await assertSucceeds(setDoc(doc(alice, 'users/alice'), profile('alice', { shareSummary: true })))
    await assertSucceeds(setDoc(doc(bob, 'users/bob'), profile('bob')))
    await assertSucceeds(setDoc(doc(alice, 'invites', code), { uid: 'alice', createdAt: serverTimestamp() }))

    // Directory enumeration on /users and /users/{uid}/public is denied.
    await assertFails(getDocs(collection(alice, 'users')))
    await assertFails(getDocs(collection(alice, 'users/alice/public')))
    await assertFails(getDocs(collection(bob, 'users/alice/public')))

    // Non-`summary` public doc ids are denied even when shareSummary is true.
    await assertFails(setDoc(doc(alice, 'users/alice/public/other'), { hello: 'world' }))
    await assertFails(getDoc(doc(alice, 'users/alice/public/other')))

    // Invites are immutable once created and deletable only by their owner.
    await assertFails(
      setDoc(doc(alice, 'invites', code), { uid: 'alice', createdAt: serverTimestamp() }, { merge: true }),
    )
    await assertFails(
      setDoc(doc(bob, 'invites', code), { uid: 'bob', createdAt: serverTimestamp() }),
    )
    await assertFails(deleteDoc(doc(bob, 'invites', code)))
    await assertFails(setDoc(doc(alice, 'invites', 'short-code'), { uid: 'alice', createdAt: serverTimestamp() }))

    // Establish reciprocal friendship between alice and bob; eve cannot sever it.
    const batch = writeBatch(bob)
    batch.set(doc(bob, 'users/alice/friends/bob'), friend)
    batch.set(doc(bob, 'users/bob/friends/alice'), friend)
    await assertSucceeds(batch.commit())
    await assertFails(deleteDoc(doc(eve, 'users/alice/friends/bob')))
    await assertFails(deleteDoc(doc(eve, 'users/bob/friends/alice')))
  })
})


describe('Firestore rules — Phase 03 synthetic drill ids', () => {
  it('lets a known lc-<n> drill ride the existing topic shard and rejects an unknown one', async () => {
    assert.ok(arraysDrillId, 'an arrays practice drill must exist')
    const alice = env.authenticatedContext('alice').firestore()
    const shard = ref(alice, 'alice', 'arrays')
    await assertSucceeds(
      setDoc(shard, progressWrite(arraysDrillId, entry()), { merge: true }),
    )
    const snap = await assertSucceeds(getDoc(shard))
    assert.equal(snap.data()[arraysDrillId].s, 'done')
    await assertFails(
      setDoc(shard, progressWrite('lc-999999', entry()), { merge: true }),
    )
  })
})

describe('Firestore rules v7 — Phase v2-05 quizResults', () => {
  function quizDoc(overrides = {}) {
    return {
      bestScore: 11,
      bestTotal: 12,
      attempts: 1,
      lastScore: 11,
      lastAt: serverTimestamp(),
      passed: true,
      ...overrides,
    }
  }

  it('lets the owner create, update, list and delete a valid quizResults document', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const quizRef = doc(alice, 'users/alice/quizResults/arrays')

    await assertSucceeds(setDoc(quizRef, quizDoc()))
    await assertSucceeds(setDoc(quizRef, quizDoc({ attempts: 2, lastScore: 9 })))
    const snap = await assertSucceeds(getDoc(quizRef))
    assert.equal(snap.data().bestScore, 11)
    assert.equal(snap.data().attempts, 2)
    await assertSucceeds(getDocs(collection(alice, 'users/alice/quizResults')))
    await assertSucceeds(deleteDoc(quizRef))
  })

  it('blocks strangers and other signed-in users from reading, listing, writing or deleting quizResults', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const bob = env.authenticatedContext('bob').firestore()
    const stranger = env.unauthenticatedContext().firestore()

    await assertSucceeds(setDoc(doc(alice, 'users/alice/quizResults/arrays'), quizDoc()))

    await assertFails(getDoc(doc(bob, 'users/alice/quizResults/arrays')))
    await assertFails(getDocs(collection(bob, 'users/alice/quizResults')))
    await assertFails(setDoc(doc(bob, 'users/alice/quizResults/arrays'), quizDoc()))
    await assertFails(deleteDoc(doc(bob, 'users/alice/quizResults/arrays')))
    await assertFails(getDoc(doc(stranger, 'users/alice/quizResults/arrays')))
    await assertFails(setDoc(doc(stranger, 'users/alice/quizResults/arrays'), quizDoc()))
  })

  it('validates topic ids, score bounds, attempts cap (<= 999), boolean passed and server timestamps', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const quizRef = doc(alice, 'users/alice/quizResults/arrays')

    await assertFails(setDoc(doc(alice, 'users/alice/quizResults/not-a-topic'), quizDoc()))
    await assertFails(setDoc(quizRef, quizDoc({ bestScore: 12, bestTotal: 10 })))
    await assertFails(setDoc(quizRef, quizDoc({ bestTotal: 13 })))
    await assertFails(setDoc(quizRef, quizDoc({ bestTotal: 0, bestScore: 0, lastScore: 0 })))
    await assertFails(setDoc(quizRef, quizDoc({ lastScore: 11, bestTotal: 10, bestScore: 10 })))
    await assertFails(setDoc(quizRef, quizDoc({ bestScore: -1 })))
    await assertFails(setDoc(quizRef, quizDoc({ attempts: 0 })))
    await assertFails(setDoc(quizRef, quizDoc({ attempts: 1000 })))
    await assertFails(setDoc(quizRef, quizDoc({ passed: 'yes' })))
    await assertFails(setDoc(quizRef, quizDoc({ lastAt: '2026-11-04T00:00:00.000Z' })))
    await assertFails(setDoc(quizRef, quizDoc({ extra: true })))

    await assertSucceeds(setDoc(quizRef, quizDoc({ bestScore: 4, bestTotal: 5, lastScore: 4, attempts: 999 })))
  })
})

describe('Firestore rules v8 — phase v2-06 video stamps (snippets[].moments)', () => {
  const stamp = (overrides = {}) => ({ at: 754, text: 'shrink from the left', createdAt: '2026-11-04T00:00:00.000Z', ...overrides })

  it('accepts a bounded stamp list, including a snippet that only carries stamps', async () => {
    const alice = env.authenticatedContext('alice').firestore()

    await assertSucceeds(setDoc(snippetRef(alice, 'alice'), snippetDoc({ moments: [stamp()] })))
    await assertSucceeds(
      setDoc(snippetRef(alice, 'alice'), snippetDoc({ moments: [stamp({ at: 0 }), stamp({ at: 86400, text: 'end' })] })),
    )
    // Stamps-only snippet: code and notes empty but the document is not empty.
    await assertSucceeds(setDoc(snippetRef(alice, 'alice'), snippetDoc({ code: '', notes: '', moments: [stamp()] })))
    // Thirty is the cap and must pass.
    await assertSucceeds(
      setDoc(
        snippetRef(alice, 'alice'),
        snippetDoc({ moments: Array.from({ length: 30 }, (_, index) => stamp({ at: index * 10, text: `moment ${index}` })) }),
      ),
    )
    const snap = await assertSucceeds(getDoc(snippetRef(alice, 'alice')))
    assert.equal(snap.data().moments.length, 30)
  })

  it('rejects 31 stamps, out-of-range seconds, empty/oversized text, missing createdAt and extra keys', async () => {
    const alice = env.authenticatedContext('alice').firestore()

    await assertFails(
      setDoc(
        snippetRef(alice, 'alice'),
        snippetDoc({ moments: Array.from({ length: 31 }, (_, index) => stamp({ at: index })) }),
      ),
    )
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ moments: [stamp({ at: -1 })] })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ moments: [stamp({ at: 86401 })] })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ moments: [stamp({ at: '12:34' })] })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ moments: [stamp({ text: '' })] })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ moments: [stamp({ text: 'x'.repeat(141) })] })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ moments: [{ at: 10, text: 'no createdAt' }] })))
    await assertFails(
      setDoc(snippetRef(alice, 'alice'), snippetDoc({ moments: [{ ...stamp(), colour: 'red' }] })),
    )
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ moments: 'not-a-list' })))
    await assertFails(setDoc(snippetRef(alice, 'alice'), snippetDoc({ moments: [], code: '', notes: '' })))
  })

  it('keeps stamps owner-only: a stranger cannot read or write them', async () => {
    const alice = env.authenticatedContext('alice').firestore()
    const bob = env.authenticatedContext('bob').firestore()
    const stranger = env.unauthenticatedContext().firestore()

    await assertSucceeds(setDoc(snippetRef(alice, 'alice'), snippetDoc({ moments: [stamp()] })))
    await assertFails(getDoc(snippetRef(bob, 'alice')))
    await assertFails(setDoc(snippetRef(bob, 'alice'), snippetDoc({ moments: [stamp()] })))
    await assertFails(getDoc(snippetRef(stranger, 'alice')))
    await assertFails(setDoc(snippetRef(stranger, 'alice'), snippetDoc({ moments: [stamp()] })))
  })
})
