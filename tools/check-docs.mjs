#!/usr/bin/env node
/**
 * Phase v2-10 — one version story, enforced.
 *
 * The release is only truthful if README, CHANGELOG, DATA-MODEL, the runbook,
 * the rules file and the backup writer all name the *same* rules and backup
 * versions, and if the numbers the docs publish match a real build. Phase 10
 * touches no Firestore shape, so this check is what stops a later doc edit from
 * inventing a version that no code implements.
 *
 * It also guards the two release-specific promises:
 *   · no phase number or build-log phrase reaches learner-facing copy
 *     (`src/**` except comments is checked for "Phase NN" in strings);
 *   · the screenshot tool and folder agree with the README (the deep check lives
 *     in `tools/screenshots.mjs --check`; this one fails fast without Chromium).
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = (rel) => readFile(path.join(root, rel), 'utf8')
const failures = []

/* --- 1. rules version: the generated file is the only source -------------- */
const rules = await read('firestore.rules')
const rulesMatch = rules.match(/\/\/ Rules v(\d+) /)
if (!rulesMatch) failures.push('firestore.rules does not declare its version in a "// Rules vN " line')
const rulesVersion = rulesMatch?.[1]

const generator = await read('tools/generate-firestore-rules.mjs')
if (rulesVersion && !generator.includes(`Rules v${rulesVersion} `)) {
  failures.push(`tools/generate-firestore-rules.mjs does not generate rules v${rulesVersion}`)
}

/* --- 2. backup schema: the writer is the only source --------------------- */
const backup = await read('src/backup.ts')
const schemaMatch = backup.match(/BACKUP_SCHEMA_VERSION = (\d+)/)
if (!schemaMatch) failures.push('src/backup.ts does not declare BACKUP_SCHEMA_VERSION')
const schemaVersion = schemaMatch?.[1]
const supported = backup.match(/SUPPORTED_BACKUP_SCHEMAS = \[([^\]]+)\]/)
if (schemaVersion && supported && !supported[1].includes(schemaVersion)) {
  failures.push(`BACKUP_SCHEMA_VERSION ${schemaVersion} is not in SUPPORTED_BACKUP_SCHEMAS`)
}
if (schemaVersion && supported) {
  const accepted = supported[1].split(',').map((value) => value.trim())
  const expected = Array.from({ length: Number(schemaVersion) }, (_, index) => String(index + 1))
  if (accepted.join(',') !== expected.join(',')) {
    failures.push(`SUPPORTED_BACKUP_SCHEMAS must accept 1…${schemaVersion} in order (found ${accepted.join(',')})`)
  }
}

/* --- 3. the documents that must agree ------------------------------------ */
const docs = {
  'README.md': await read('README.md'),
  'docs/CHANGELOG.md': await read('docs/CHANGELOG.md'),
  'docs/DATA-MODEL.md': await read('docs/DATA-MODEL.md'),
  'docs/RELEASE-RUNBOOK.md': await read('docs/RELEASE-RUNBOOK.md'),
  'docs/ROADMAP.md': await read('docs/ROADMAP.md'),
  'prompt.md': await read('prompt.md'),
}

/**
 * Emphasis-tolerant version pattern: the docs write `rules v9` in prose, in
 * bold (`rules **v9**`) and inside code spans. History is allowed — a phase
 * record *should* say "rules v6" — so a stale number is only a failure when the
 * line claims to describe what ships now.
 */
const RULES_PATTERN = /rules\s*(?:version\s*)?[*`]{0,2}\s*v(\d+)/gi
const BACKUP_PATTERN = /backup\s*(?:schema\s*)?[*`]{0,2}?\s*v(\d+)/gi
const CURRENT_CLAIM = /\b(shipped|ships|current|currently|latest|as of|now|this release|stands?)\b/i

for (const [name, text] of Object.entries(docs)) {
  if (rulesVersion && !new RegExp(`rules\\s*(?:version\\s*)?[*\`]{0,2}\\s*v${rulesVersion}\\b`, 'i').test(text)) {
    failures.push(`${name} never names rules v${rulesVersion}`)
  }
  if (schemaVersion && !new RegExp(`backup\\s*(?:schema\\s*)?[*\`]{0,2}\\s*v${schemaVersion}\\b`, 'i').test(text)) {
    failures.push(`${name} never names backup v${schemaVersion}`)
  }
  // A stale version is worse than a missing one — but only where the line is
  // making a claim about the present.
  for (const [index, line] of text.split('\n').entries()) {
    if (!CURRENT_CLAIM.test(line)) continue
    for (const match of line.matchAll(RULES_PATTERN)) {
      if (rulesVersion && match[1] !== rulesVersion) {
        failures.push(`${name}:${index + 1} claims rules v${match[1]} ships, but the shipped version is v${rulesVersion}`)
      }
    }
    for (const match of line.matchAll(BACKUP_PATTERN)) {
      if (schemaVersion && match[1] !== schemaVersion) {
        failures.push(`${name}:${index + 1} claims backup v${match[1]} ships, but the shipped version is v${schemaVersion}`)
      }
    }
  }
}

/* --- 4. every executed phase has a record -------------------------------- */
const phaseDirs = (await readdir(path.join(root, 'docs', 'phases-v2'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && /^\d\d-/.test(entry.name))
  .map((entry) => entry.name)
  .sort()
for (const dir of phaseDirs) {
  const files = await readdir(path.join(root, 'docs', 'phases-v2', dir))
  if (!files.includes('PLAN.md')) failures.push(`docs/phases-v2/${dir} is missing PLAN.md`)
  const executed = dir.startsWith('00-') ? false : true
  if (executed && !files.includes('RECORD.md')) {
    failures.push(`docs/phases-v2/${dir} has no RECORD.md (write it in the same commit as the phase)`)
  }
}

/* --- 5. completed phases are marked as such in the roadmap --------------- */
const roadmap = docs['docs/ROADMAP.md']
for (const dir of phaseDirs.filter((name) => !name.startsWith('00-'))) {
  const id = `v2-${dir.slice(0, 2)}`
  if (!roadmap.includes(id)) failures.push(`docs/ROADMAP.md has no row for ${id}`)
}

/* --- 6. learner-facing copy carries no build log ------------------------- */
async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full)
  }
  return out
}
const sourceFiles = await walk(path.join(root, 'src'))
const PHASE_IN_COPY = /(['"`])[^'"`\n]*\bPhase\s+\d{2}\b[^'"`\n]*\1/g
for (const file of sourceFiles) {
  const text = await readFile(file, 'utf8')
  const rel = path.relative(root, file).replaceAll(path.sep, '/')
  const lines = text.split('\n')
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trimStart()
    // Comments and JSX comments are where phase history belongs.
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue
    for (const match of line.matchAll(PHASE_IN_COPY)) {
      // A `data-testid="phase-07-…"` hook is a test contract, not learner copy.
      if (/data-testid|testId|Phase\s+\d{2}\s*(runner|·)/.test(match[0]) && /key=/.test(match[0])) continue
      failures.push(`${rel}:${index + 1} shows build history to a learner: ${match[0].trim().slice(0, 80)}`)
    }
  }
}
// The one string this check exists for, asserted by name.
const statement = await read('src/content/statement.tsx')
if (/Phase\s+0\d/.test(statement)) {
  failures.push('src/content/statement.tsx puts a phase number in the statement card again')
}

/* --- 7. the README's own claims ------------------------------------------ */
const readme = docs['README.md']
const CHANGELOG_IMAGES = [
  'phone-today.png',
  'phone-topics.png',
  'phone-problem.png',
  'phone-code.png',
  'phone-quiz.png',
  'phone-insights.png',
]
for (const name of CHANGELOG_IMAGES) {
  if (!readme.includes(`docs/screenshots/${name}`)) failures.push(`README.md does not show docs/screenshots/${name}`)
}
if (!/docs\/CHANGELOG\.md/.test(readme)) failures.push('README.md does not link the changelog')
if (!/docs\/RELEASE-RUNBOOK\.md/.test(readme)) failures.push('README.md does not link the release runbook')
if (!/docs\/content\/coverage\.md/.test(readme)) failures.push('README.md does not link the honest coverage table')
for (const absent of ['Notes', 'transcripts', 'remote judge', 'AI']) {
  if (!readme.includes(absent)) failures.push(`README.md no longer states that ${absent} is deliberately absent`)
}
if (/Status: v1 is complete/.test(readme)) failures.push('README.md still carries the v1 status line')

/* --- 8. the runbook names the shipped versions and the order ------------- */
const runbook = docs['docs/RELEASE-RUNBOOK.md']
if (!/firestore:rules[\s\S]{0,200}hosting/i.test(runbook)) {
  failures.push('docs/RELEASE-RUNBOOK.md must keep "rules before hosting" in the deploy order')
}
if (!/Rollback/i.test(runbook)) failures.push('docs/RELEASE-RUNBOOK.md lost its rollback section')
if (!/Delete my data/i.test(runbook)) failures.push('docs/RELEASE-RUNBOOK.md does not verify the deletion path')
if (!/npm run check:docs/.test(runbook)) failures.push('docs/RELEASE-RUNBOOK.md does not run the docs consistency check')

if (failures.length > 0) {
  console.error('Docs consistency failed:\n' + failures.map((item) => `  - ${item}`).join('\n'))
  process.exit(1)
}
console.log(
  [
    'Docs consistency verified:',
    `  rules v${rulesVersion} · backup v${schemaVersion} · schemas 1…${schemaVersion} import`,
    `  ${phaseDirs.length} phase folders, each with a PLAN and (once executed) a RECORD`,
    '  README, CHANGELOG, DATA-MODEL, RUNBOOK, ROADMAP and prompt.md agree on both versions',
    '  no "Phase NN" build-log string in learner-facing source',
    '  README shows the six screenshots, the changelog, the runbook and the coverage table',
  ].join('\n'),
)
