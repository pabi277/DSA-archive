/**
 * Phase v2-03 coverage report.
 *
 * Computes one deterministic report from the data files. `--write` refreshes
 * the checked-in JSON/Markdown reports; the default (and `--check`) mode refuses
 * a stale report. CI prints the Markdown into the run summary and a PR comment.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const AS_OF = process.env.CONTENT_AS_OF || '2026-11-03'
const data = path.join(root, 'data')
const content = path.join(data, 'content')
const reportPath = path.join(content, 'coverage.json')
const markdownPath = path.join(root, 'docs', 'content', 'coverage.md')

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function jsonFiles(dir) {
  const names = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort()
  return Promise.all(names.map(async (name) => ({ name, value: await readJson(path.join(dir, name)) })))
}

function words(text) {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean).length
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function isStale(verified) {
  return typeof verified === 'string' && addDays(verified, 180) < AS_OF
}

function primerText(primer) {
  if (!primer) return []
  return [
    primer.intro,
    primer.mentalModel,
    primer.practice,
    ...(Array.isArray(primer.whenToUse) ? primer.whenToUse : []),
    ...(Array.isArray(primer.mistakes) ? primer.mistakes : []),
    primer.example?.explain,
  ].filter(Boolean)
}

const catalogue = await readJson(path.join(data, 'problems.json'))
const topics = catalogue.topics
const rows = topics.flatMap((topic) =>
  topic.subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => ({ ...problem, topicId: topic.id }))),
)
const rowTopic = new Map(rows.map((row) => [row.id, row.topicId]))
const statementFiles = await jsonFiles(path.join(content, 'problems'))
const topicFiles = await jsonFiles(path.join(content, 'topics'))
const theoryFiles = await jsonFiles(path.join(content, 'theory'))
const practiceFiles = await jsonFiles(path.join(data, 'practice-sets'))
const patternsDoc = await readJson(path.join(content, 'patterns.json'))

const drillSlugs = new Set()
let drillCount = 0
let contiguousSets = true
for (const { value: set } of practiceFiles) {
  drillCount += set.problems.length
  for (const problem of set.problems) drillSlugs.add(problem.slug)
  const sets = set.problems.map((problem) => problem.set)
  if (sets.some((number, index) => number !== index + 1)) contiguousSets = false
}

let quizItems = 0
let primers = 0
let primerWords = 0
let testCases = 0
let hints = 0
const statementsByTopic = new Map()
const quizByTopic = new Map()
const hintsByTopic = new Map()
const theoryByTopic = new Map()
const drillsByTopic = new Map()
const topicHasPrimer = new Set()
for (const topic of topics) {
  statementsByTopic.set(topic.id, 0)
  quizByTopic.set(topic.id, 0)
  hintsByTopic.set(topic.id, 0)
  theoryByTopic.set(topic.id, 0)
  drillsByTopic.set(topic.id, 0)
}
for (const { value: statement } of statementFiles) {
  const topicId = rowTopic.get(statement.problemId)
  if (topicId) statementsByTopic.set(topicId, (statementsByTopic.get(topicId) ?? 0) + 1)
  hintsByTopic.set(topicId, (hintsByTopic.get(topicId) ?? 0) + (statement.hint ? 1 : 0))
  hints += statement.hint ? 1 : 0
  testCases += Array.isArray(statement.tests) ? statement.tests.length : 0
}
for (const { value: topicDoc } of topicFiles) {
  const count = Array.isArray(topicDoc.quiz) ? topicDoc.quiz.length : 0
  quizItems += count
  quizByTopic.set(topicDoc.topicId, count)
  if (topicDoc.primer) {
    primers += 1
    topicHasPrimer.add(topicDoc.topicId)
    primerWords += primerText(topicDoc.primer).reduce((sum, text) => sum + words(text), 0)
    primerWords += (topicDoc.sections ?? []).reduce((sum, section) => sum + words(section.text), 0)
  }
}
for (const { value: mcq } of theoryFiles) theoryByTopic.set(mcq.topicId, (theoryByTopic.get(mcq.topicId) ?? 0) + 1)
for (const { value: set } of practiceFiles) drillsByTopic.set(set.topicId, (drillsByTopic.get(set.topicId) ?? 0) + set.problems.length)

const rowResources = rows.filter((row) => Array.isArray(row.resources) && row.resources.length > 0)
const multiPublisher = rowResources.filter((row) => new Set(row.resources.map((item) => item.source)).size >= 2)
const exactOrNear = rows.filter((row) => row.lcMatch === 'exact' || row.lcMatch === 'near').length
const sources = [...new Set(rowResources.flatMap((row) => row.resources.map((item) => item.source)))].sort()
let staleLinks = 0
for (const row of rowResources) {
  for (const resource of row.resources) if (isStale(resource.verified)) staleLinks += 1
}
for (const { value: mcq } of theoryFiles) {
  if (isStale(mcq.verified)) staleLinks += 1
  if (isStale(mcq.reveal?.reference?.verified)) staleLinks += 1
}
if (isStale(patternsDoc.verified)) staleLinks += 1

const fullyAuthoredTopics = topics
  .filter((topic) =>
    topicHasPrimer.has(topic.id) &&
    (statementsByTopic.get(topic.id) ?? 0) >= 6 &&
    (quizByTopic.get(topic.id) ?? 0) >= 12 &&
    (hintsByTopic.get(topic.id) ?? 0) >= 6,
  )
  .map((topic) => topic.id)

const report = {
  schemaVersion: 1,
  asOf: AS_OF,
  catalogue: {
    rows: rows.length,
    topics: topics.length,
    theoryRows: rows.filter((row) => row.kind === 'theory').length,
  },
  resources: {
    rowsWithResources: rowResources.length,
    multiPublisherRows: multiPublisher.length,
    multiPublisherPercent: Math.round((multiPublisher.length / rows.length) * 100),
    leetcodeExactOrNear: exactOrNear,
    theoryLabelled: rows.filter((row) => row.lcMatch === 'theory').length,
    staleLinks,
    sources,
  },
  content: {
    primers,
    primerWords,
    statements: statementFiles.length,
    hints,
    mistakes: statementFiles.filter(({ value }) => Boolean(value.mistake)).length,
    testCases,
    quizItems,
    theoryMcqs: theoryFiles.length,
    fullyAuthoredTopics,
  },
  practice: {
    patterns: practiceFiles.length,
    drills: drillCount,
    uniqueSlugs: drillSlugs.size,
    contiguousSets,
    sets: [1, 2, 3, 4],
  },
  byTopic: topics.map((topic) => ({
    topicId: topic.id,
    title: topic.title,
    primer: topicHasPrimer.has(topic.id),
    statements: statementsByTopic.get(topic.id) ?? 0,
    hints: hintsByTopic.get(topic.id) ?? 0,
    quizItems: quizByTopic.get(topic.id) ?? 0,
    theoryMcqs: theoryByTopic.get(topic.id) ?? 0,
    drills: drillsByTopic.get(topic.id) ?? 0,
  })),
}

function table(title, headers, body) {
  return [`## ${title}`, '', `| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...body.map((line) => `| ${line.join(' | ')} |`), ''].join('\n')
}

const markdown = [
  '<!-- content-coverage -->',
  '# Phase 03 content coverage',
  '',
  `Checked on ${AS_OF}. Missing content renders a designed state; no screen waits for the authoring track.`,
  '',
  table('Totals', ['Measure', 'Covered', 'Denominator'], [
    ['Ranked resource rows', report.resources.rowsWithResources, report.catalogue.rows],
    ['Rows with ≥2 publishers', report.resources.multiPublisherRows, report.catalogue.rows],
    ['Exact or near LeetCode twins', report.resources.leetcodeExactOrNear, report.catalogue.rows],
    ['Theory-labelled rows', report.resources.theoryLabelled, report.catalogue.rows],
    ['Topic primers', report.content.primers, report.catalogue.topics],
    ['Beginner statements', report.content.statements, 120],
    ['Hints and mistakes', report.content.hints, report.catalogue.rows],
    ['Topic quiz items', report.content.quizItems, 240],
    ['Theory MCQs', report.content.theoryMcqs, report.catalogue.theoryRows],
    ['Practice drills', report.practice.drills, '120 minimum'],
  ]).trimEnd(),
  '',
  `Fully authored topic: ${report.content.fullyAuthoredTopics.join(', ') || 'none yet'}. Arrays has a ${report.content.primerWords}-word primer, ${report.content.statements} statements, ${report.content.hints} hints, ${report.content.quizItems} quiz items and ${report.content.testCases} runner cases.`,
  '',
  table('By topic', ['Topic', 'Primer', 'Statements', 'Hints', 'Quiz', 'Theory MCQs', 'Drills'], report.byTopic.map((topic) => [
    topic.title,
    topic.primer ? 'yes' : 'coming',
    topic.statements,
    topic.hints,
    topic.quizItems,
    topic.theoryMcqs,
    topic.drills,
  ])),
].join('\n')

if (process.argv.includes('--write')) {
  await mkdir(path.dirname(markdownPath), { recursive: true })
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await writeFile(markdownPath, `${markdown.replace(/\n+$/, '')}\n`, 'utf8')
  console.log(`Wrote ${path.relative(root, reportPath)} and ${path.relative(root, markdownPath)}`)
} else {
  const checkedIn = await readJson(reportPath)
  if (JSON.stringify(checkedIn) !== JSON.stringify(report)) {
    console.error('data/content/coverage.json is stale. Run: node tools/content-coverage.mjs --write')
    process.exit(1)
  }
  console.log(`Coverage report current (${AS_OF}): ${report.resources.rowsWithResources}/495 resource rows · ${report.resources.leetcodeExactOrNear}/495 LC twins · ${report.practice.drills} drills · ${report.content.theoryMcqs}/42 theory MCQs`)
}
console.log(markdown.split('\n').slice(0, 18).join('\n'))
