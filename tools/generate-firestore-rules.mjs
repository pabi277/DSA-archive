/**
 * Generate the versioned Firestore rules from our single validated catalogue.
 *
 * Firestore Rules have no loops, so the per-topic problem-id whitelist and the
 * one-changed-entry validator are expanded here. Run `npm run rules:generate`
 * after a catalogue edit; `npm run check:rules` runs in CI.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = path.join(root, 'data', 'problems.json')
const practiceDir = path.join(root, 'data', 'practice-sets')
const rulesPath = path.join(root, 'firestore.rules')

/** Phase 03 synthetic `lc-<n>` drill keys, grouped by their existing topic shard. */
async function loadDrillIdsByTopic() {
  const map = new Map()
  const names = (await readdir(practiceDir)).filter((name) => name.endsWith('.json')).sort()
  for (const name of names) {
    const set = JSON.parse(await readFile(path.join(practiceDir, name), 'utf8'))
    const ids = set.problems.map((problem) => `lc-${problem.lc}`)
    map.set(set.topicId, [...(map.get(set.topicId) ?? []), ...ids])
  }
  return map
}

function literal(value) {
  return JSON.stringify(value)
}

function list(values) {
  return `[${values.map(literal).join(', ')}]`
}

function functionSuffix(topicId) {
  return topicId.replace(/[^a-zA-Z0-9]/g, '_')
}

function changedValidator(topic) {
  const suffix = functionSuffix(topic.id)
  // Ternary short-circuits: only the one changed entry is validated, which
  // stays far below Firestore Rules' 1000-expression evaluation limit.
  const first = topic.problemIds[0]
  const rest = topic.problemIds.slice(1)
  const body = [
    `      return keys.hasAny([${literal(first)}]) ? validEntryOrDeleted(data, ${literal(first)})`,
    ...rest.map(
      (id, index) =>
        `        : keys.hasAny([${literal(id)}]) ? validEntryOrDeleted(data, ${literal(id)})${index === rest.length - 1 ? '' : ''}`,
    ),
    '        : false;',
  ].join('\n')
  return `    function validChangedEntry_${suffix}(data, keys) {\n${body}\n    }\n`
}

function progressValidator(topic) {
  const suffix = functionSuffix(topic.id)
  const ids = list(topic.problemIds)
  return `    function validProgressWrite_${suffix}(data, old) {
      let changed = data.diff(old).affectedKeys();
      let entriesChanged = changed.difference(['updatedAt'].toSet());
      let allowed = ${ids};
      let allowedWithTime = allowed.concat(['updatedAt']);
      return data.keys().hasOnly(allowedWithTime)
        && data.keys().hasAll(['updatedAt'])
        && data.updatedAt == request.time
        && data.size() <= allowed.size() + 1
        && changed.hasOnly(allowedWithTime)
        && changed.hasAny(['updatedAt'])
        && entriesChanged.size() == 1
        && validChangedEntry_${suffix}(data, entriesChanged);
    }
`
}

function topicBlock(topic) {
  const suffix = functionSuffix(topic.id)
  return `      match /progressByTopic/${topic.id} {
        allow create: if isOwner(uid)
          && validProgressWrite_${suffix}(request.resource.data, {});
        allow update: if isOwner(uid)
          && validProgressWrite_${suffix}(request.resource.data, resource.data);
        allow delete: if isOwner(uid);
      }
`
}

export function generateRules(catalogue, drillIdsByTopic = new Map()) {
  const topics = catalogue.topics.map((topic) => ({
    id: topic.id,
    problemIds: [
      ...topic.subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id)),
      ...(drillIdsByTopic.get(topic.id) ?? []),
    ],
    catalogueCount: topic.subtopics.flatMap((subtopic) => subtopic.problems).length,
    drillCount: (drillIdsByTopic.get(topic.id) ?? []).length,
  }))
  if (topics.some((topic) => topic.problemIds.length === 0)) {
    throw new Error('Every topic must contain at least one known id')
  }
  const allIds = topics.flatMap((topic) => topic.problemIds)
  if (new Set(allIds).size !== allIds.length) {
    throw new Error('Known ids (catalogue + drills) must be globally unique for topic-sharded rules')
  }
  const drillTotal = topics.reduce((sum, topic) => sum + topic.drillCount, 0)
  const catalogueTotal = topics.reduce((sum, topic) => sum + topic.catalogueCount, 0)

  return `// GENERATED FILE — do not edit by hand.
// Source: tools/generate-firestore-rules.mjs from data/problems.json + data/practice-sets/.
// ${topics.length} topics · ${catalogueTotal} catalogue ids · ${drillTotal} synthetic lc-<n> drill keys.
// Rules v5 (phase 02) + Phase 03 drill whitelist; prior rules remain backward compatible.
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    function validProfile(data, uid) {
      return data.keys().hasOnly([
          'uid', 'displayName', 'photoURL', 'createdAt', 'updatedAt',
          'dailyGoal', 'theme', 'hideDone', 'shareSummary', 'friendCode'
        ])
        && data.keys().hasAll([
          'uid', 'displayName', 'photoURL', 'createdAt', 'updatedAt',
          'dailyGoal', 'theme', 'hideDone', 'shareSummary'
        ])
        && data.uid == uid
        && data.displayName is string
        && data.displayName.size() > 0
        && data.displayName.size() <= 80
        && (data.photoURL == null || (data.photoURL is string && data.photoURL.size() <= 300))
        && data.createdAt is timestamp
        && data.updatedAt == request.time
        && data.dailyGoal is int
        && data.dailyGoal >= 1
        && data.dailyGoal <= 100
        && data.theme in ['dark', 'light']
        && data.hideDone is bool
        && data.shareSummary is bool
        && (!data.keys().hasAny(['friendCode']) || (data.friendCode is string && data.friendCode.matches('^[a-f0-9]{32}$')));
    }

    function validProfileCreate(data, uid) {
      return validProfile(data, uid) && data.createdAt == request.time;
    }

    function validProfileUpdate(data, old, uid) {
      return validProfile(data, uid) && data.createdAt == old.createdAt;
    }

    function validSummary(data) {
      return data.keys().hasOnly(['displayName', 'solvedCount', 'solvedByTopic', 'currentStreak', 'lastActiveDate', 'weeklySolved', 'asOf'])
        && data.keys().hasAll(['displayName', 'solvedCount', 'solvedByTopic', 'currentStreak', 'lastActiveDate', 'weeklySolved', 'asOf'])
        && data.displayName is string && data.displayName.size() > 0 && data.displayName.size() <= 80
        && data.solvedByTopic is map
        && data.solvedByTopic.keys().hasOnly(${list(topics.map((topic) => topic.id))})
        && data.solvedByTopic.keys().hasAll(${list(topics.map((topic) => topic.id))})
${topics.map((topic) => `        && data.solvedByTopic[${literal(topic.id)}] is int && data.solvedByTopic[${literal(topic.id)}] >= 0 && data.solvedByTopic[${literal(topic.id)}] <= ${topic.problemIds.length}`).join('\n')}
        && data.solvedCount is int && data.solvedCount == ${topics.map((topic) => `data.solvedByTopic[${literal(topic.id)}]`).join(' + ')}
        && data.weeklySolved is int && data.weeklySolved >= 0 && data.weeklySolved <= data.solvedCount
        && data.currentStreak is int && data.currentStreak >= 0 && data.currentStreak <= 100000
        && data.asOf is string && data.asOf.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        && (data.lastActiveDate == null || (data.lastActiveDate is string && data.lastActiveDate.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')));
    }

    // Both records must be created in the same atomic batch by the invitee.
    // An owner cannot grant themselves access by inventing a friend record.
    function validFriendCreate(uid, friendUid, data) {
      let invite = get(/databases/$(database)/documents/invites/$(data.code));
      let reciprocal = getAfter(/databases/$(database)/documents/users/$(friendUid)/friends/$(uid));
      return request.auth != null && uid != friendUid
        && (request.auth.uid == uid || request.auth.uid == friendUid)
        && data.keys().hasOnly(['code', 'addedAt']) && data.keys().hasAll(['code', 'addedAt'])
        && data.code is string && data.code.matches('^[a-f0-9]{32}$')
        && data.addedAt == request.time
        && invite.data.uid != request.auth.uid
        && ((invite.data.uid == uid && request.auth.uid == friendUid) || (invite.data.uid == friendUid && request.auth.uid == uid))
        && reciprocal.data.code == data.code && reciprocal.data.addedAt == request.time;
    }

    function canReadSummary(uid) {
      return request.auth != null &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)/friends/$(uid)) &&
        exists(/databases/$(database)/documents/users/$(uid)/friends/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(uid)).data.shareSummary == true;
    }

    function validCloudEntry(entry) {
      return entry is map
        && entry.keys().hasOnly(['s', 'b', 'a', 'fd', 'lr', 'rc', 'o'])
        && entry.keys().hasAll(['s', 'b', 'a', 'fd', 'lr', 'rc'])
        && entry.s in ['todo', 'done', 'revision']
        && entry.b is bool
        && entry.a is int
        && entry.a >= 0
        && entry.a <= 10000
        && entry.rc is int
        && entry.rc >= 0
        && entry.rc <= 100
        && (!entry.keys().hasAny(['o']) || (entry.o in ['clean', 'hint', 'couldnt'] && entry.s != 'todo'))
        && (entry.fd == null || (entry.fd is string && entry.fd.size() <= 40))
        && (entry.lr == null || (entry.lr is string && entry.lr.size() <= 40));
    }

    function validEntryOrDeleted(data, id) {
      return !data.keys().hasAny([id]) || validCloudEntry(data.get(id, {}));
    }

    // Phase 3.1 — one note document per problem, created only when written.
    // The doc id is a catalogue slug; the client only writes known ids and the
    // backup parser re-checks them. Sizes are capped so a hostile client cannot
    // bloat the free tier, and an all-empty note must be deleted instead.
    function validNote(data) {
      return data.keys().hasOnly(['markdown', 'snippet', 'updatedAt'])
        && data.keys().hasAll(['markdown', 'snippet', 'updatedAt'])
        && data.markdown is string
        && data.markdown.size() <= 5000
        && data.snippet is string
        && data.snippet.size() <= 8000
        && (data.markdown.size() + data.snippet.size()) > 0
        && data.updatedAt == request.time;
    }

    // Phase 4.1 — one planner document per day. The doc id is a yyyy-mm-dd day
    // key; the lists are bounded and doneIds must stay a subset of
    // problemIds, so a day can never claim work it never planned.
    function validPlan(data, planId) {
      return planId.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
        && data.keys().hasOnly(['problemIds', 'doneIds', 'updatedAt'])
        && data.keys().hasAll(['problemIds', 'doneIds', 'updatedAt'])
        && data.problemIds is list
        && data.problemIds.size() <= 200
        && data.doneIds is list
        && data.doneIds.size() <= 200
        && data.problemIds.join('').size() <= 12000
        && data.doneIds.join('').size() <= 12000
        && data.doneIds.toSet().difference(data.problemIds.toSet()).size() == 0
        && data.updatedAt == request.time;
    }

    // Phase 3.3 — a custom list: title + problem ids. Lists hold at most 200
    // ids and the joined id text is capped, so one document stays small.
    function validList(data, listId) {
      return listId.matches('^[a-z0-9-]{8,40}$')
        && data.keys().hasOnly(['title', 'problemIds', 'updatedAt'])
        && data.keys().hasAll(['title', 'problemIds', 'updatedAt'])
        && data.title is string
        && data.title.size() > 0
        && data.title.size() <= 60
        && data.problemIds is list
        && data.problemIds.size() <= 200
        && data.problemIds.join('').size() <= 12000
        && data.updatedAt == request.time;
    }

${topics.map(changedValidator).join('\n')}
${topics.map(progressValidator).join('\n')}
    match /users/{uid} {
      allow get: if isOwner(uid);
      allow create: if isOwner(uid) && validProfileCreate(request.resource.data, uid);
      allow update: if isOwner(uid)
        && validProfileUpdate(request.resource.data, resource.data, uid);
      allow delete: if isOwner(uid);

      match /friends/{friendUid} {
        allow get, list: if isOwner(uid);
        allow create: if validFriendCreate(uid, friendUid, request.resource.data);
        allow delete: if request.auth != null && (request.auth.uid == uid || request.auth.uid == friendUid);
      }

      match /public/{summaryId} {
        allow get: if summaryId == 'summary' && (isOwner(uid) || canReadSummary(uid));
        allow create, update: if summaryId == 'summary' && isOwner(uid)
          && get(/databases/$(database)/documents/users/$(uid)).data.shareSummary == true
          && validSummary(request.resource.data);
        allow delete: if summaryId == 'summary' && isOwner(uid);
      }

      // A collection query must be provably readable for every possible topic
      // id, so get/list lives on the wildcard. Writes only exist for the 20
      // literal catalogue topic blocks below.
      match /progressByTopic/{topicId} {
        allow get, list: if isOwner(uid);
      }

${topics.map(topicBlock).join('\n')}
      // Notes and lists are personal data: own-data-only, one document per
      // write. Note ids are catalogue problem slugs; list ids are generated
      // lowercase UUIDs. Both collections are readable by their owner only.
      match /notes/{problemId} {
        allow get, list: if isOwner(uid);
        allow create, update: if isOwner(uid)
          && problemId.matches('^[a-z0-9][a-z0-9-]{0,79}$')
          && validNote(request.resource.data);
        allow delete: if isOwner(uid);
      }

      match /lists/{listId} {
        allow get, list: if isOwner(uid);
        allow create, update: if isOwner(uid)
          && validList(request.resource.data, listId);
        allow delete: if isOwner(uid);
      }

      // Phase 4.1 — the daily planner. One document per local day, owner-only,
      // one document per write; the revision queue and the stats are derived
      // on-device from progress entries and need no collection of their own.
      match /plans/{date} {
        allow get, list: if isOwner(uid);
        allow create, update: if isOwner(uid)
          && validPlan(request.resource.data, date);
        allow delete: if isOwner(uid);
      }
    }

    // Invite IDs are 128-bit bearer capabilities. Listing and updates are denied.
    match /invites/{code} {
      allow get: if request.auth != null && code.matches('^[a-f0-9]{32}$');
      allow create: if request.auth != null && code.matches('^[a-f0-9]{32}$')
        && request.resource.data.keys().hasOnly(['uid', 'createdAt'])
        && request.resource.data.keys().hasAll(['uid', 'createdAt'])
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.createdAt == request.time;
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }

    // Default deny: no other collection/path has an allow rule. Friend
    // paths without an explicit allow remain private.
  }
}
`
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const catalogue = JSON.parse(await readFile(dataPath, 'utf8'))
  const drillIdsByTopic = await loadDrillIdsByTopic()
  const generated = generateRules(catalogue, drillIdsByTopic)
  if (process.argv.includes('--check')) {
    let current = ''
    try {
      current = await readFile(rulesPath, 'utf8')
    } catch {
      current = ''
    }
    if (current !== generated) {
      console.error('firestore.rules is stale. Run: npm run rules:generate')
      process.exit(1)
    }
    console.log(`firestore.rules is current (${catalogue.topics.length} topics).`)
  } else {
    await writeFile(rulesPath, generated)
    console.log(`Wrote ${path.relative(root, rulesPath)} (${catalogue.topics.length} topics).`)
  }
}
