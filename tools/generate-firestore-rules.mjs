/**
 * Generate the versioned Firestore rules from our single validated catalogue.
 *
 * Firestore Rules have no loops, so the per-topic problem-id whitelist and the
 * one-changed-entry validator are expanded here. Run `npm run rules:generate`
 * after a catalogue edit; `npm run check:rules` runs in CI.
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = path.join(root, 'data', 'problems.json')
const rulesPath = path.join(root, 'firestore.rules')

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
  const clauses = topic.problemIds.map(
    (id) => `      (keys.hasAny([${literal(id)}]) && validEntryOrDeleted(data, ${literal(id)}))`,
  )
  return `    function validChangedEntry_${suffix}(data, keys) {\n      return ${clauses.join('\n        || ')};\n    }\n`
}

function progressValidator(topic) {
  const suffix = functionSuffix(topic.id)
  const ids = list(topic.problemIds)
  return `    function validProgressWrite_${suffix}(data, old) {
      let changed = data.diff(old).affectedKeys();
      let entriesChanged = changed.difference(['updatedAt'].toSet());
      let allowed = ${ids};
      return data.keys().hasOnly(allowed.concat(['updatedAt']))
        && data.keys().hasAll(['updatedAt'])
        && data.updatedAt == request.time
        && data.size() <= allowed.size() + 1
        && changed.hasOnly(allowed.concat(['updatedAt']))
        && changed.hasAny(['updatedAt'])
        && entriesChanged.size() == 1
        && validChangedEntry_${suffix}(data, entriesChanged);
    }
`
}

function topicBlock(topic) {
  const suffix = functionSuffix(topic.id)
  return `      match /progressByTopic/${topic.id} {
        allow get, list: if isOwner(uid);
        allow create: if isOwner(uid)
          && validProgressWrite_${suffix}(request.resource.data, {});
        allow update: if isOwner(uid)
          && validProgressWrite_${suffix}(request.resource.data, resource.data);
        allow delete: if isOwner(uid);
      }
`
}

export function generateRules(catalogue) {
  const topics = catalogue.topics.map((topic) => ({
    id: topic.id,
    problemIds: topic.subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id)),
  }))
  if (topics.some((topic) => topic.problemIds.length === 0)) {
    throw new Error('Every topic must contain at least one problem id')
  }
  const allIds = topics.flatMap((topic) => topic.problemIds)
  if (new Set(allIds).size !== allIds.length) {
    throw new Error('Problem ids must be globally unique for topic-sharded rules')
  }

  return `// GENERATED FILE — do not edit by hand.
// Source: tools/generate-firestore-rules.mjs from data/problems.json.
// ${topics.length} topics · ${allIds.length} unique problem ids.
// Rules v1 (phase 2): own-data-only, default deny, field/size validation.
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    function validProfile(data, uid) {
      return data.keys().hasOnly([
          'uid', 'displayName', 'photoURL', 'createdAt', 'updatedAt',
          'dailyGoal', 'theme', 'hideDone', 'shareSummary'
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
        && data.shareSummary is bool;
    }

    function validProfileCreate(data, uid) {
      return validProfile(data, uid) && data.createdAt == request.time;
    }

    function validProfileUpdate(data, old, uid) {
      return validProfile(data, uid) && data.createdAt == old.createdAt;
    }

    function validCloudEntry(entry) {
      return entry is map
        && entry.keys().hasOnly(['s', 'b', 'a', 'fd', 'lr'])
        && entry.keys().hasAll(['s', 'b', 'a', 'fd', 'lr'])
        && entry.s in ['todo', 'done', 'revision']
        && entry.b is bool
        && entry.a is int
        && entry.a >= 0
        && entry.a <= 10000
        && (entry.fd == null || (entry.fd is string && entry.fd.size() <= 40))
        && (entry.lr == null || (entry.lr is string && entry.lr.size() <= 40));
    }

    function validEntryOrDeleted(data, id) {
      return !data.keys().hasAny([id]) || validCloudEntry(data.get(id, {}));
    }

${topics.map(changedValidator).join('\n')}
${topics.map(progressValidator).join('\n')}
    match /users/{uid} {
      allow get: if isOwner(uid);
      allow create: if isOwner(uid) && validProfileCreate(request.resource.data, uid);
      allow update: if isOwner(uid)
        && validProfileUpdate(request.resource.data, resource.data, uid);
      allow delete: if isOwner(uid);

${topics.map(topicBlock).join('\n')}    }

    // Every other collection/path is denied: no friend summaries, notes,
    // lists or plans are readable until their phase ships explicit rules.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const catalogue = JSON.parse(await readFile(dataPath, 'utf8'))
  const generated = generateRules(catalogue)
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
