/**
 * Phase v2-03 content loader.
 *
 * All learner content is statically imported from build-time JSON globs — there
 * is no fetch, no runtime JSON request and no dependency on the old note
 * markdown renderer. Every value is copied through a shape check before use,
 * so a malformed authored file degrades to the designed empty state instead of
 * crashing a screen. Theory MCQ cards are Phase 05 data only: they are checked
 * by `test:data` and the coverage report, but never imported into this runtime.
 */
import coverageRaw from '../../data/content/coverage.json'
import type {
  CoverageReport,
  CoverageTopic,
  PracticeProblem,
  PracticeSet,
  Primer,
  PrimerSection,
  QuizItem,
  QuizKind,
  QuizOption,
  Statement,
  TestCase,
  TopicContent,
} from './types'

type UnknownRecord = Record<string, unknown>

const QUIZ_KINDS = new Set<QuizKind>(['pattern', 'dryrun', 'complexity', 'bug', 'edge'])
const TOPIC_MODULES = import.meta.glob<unknown>('../../data/content/topics/*.json', {
  eager: true,
  import: 'default',
})
const PROBLEM_MODULES = import.meta.glob<unknown>('../../data/content/problems/*.json', {
  eager: true,
  import: 'default',
})
const PRACTICE_MODULES = import.meta.glob<unknown>('../../data/practice-sets/*.json', {
  eager: true,
  import: 'default',
})

function record(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null
}

function text(value: unknown, max = 10000): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : null
}

function optionalText(value: unknown, max = 4000): string | null {
  return typeof value === 'string' && value.length <= max ? value : null
}

function integer(value: unknown, min = -Infinity, max = Infinity): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null
}

function boolean(value: unknown): boolean {
  return value === true
}

function stringList(value: unknown, maxItems = 100): string[] {
  if (!Array.isArray(value)) return []
  const result: string[] = []
  for (const item of value.slice(0, maxItems)) {
    const safe = text(item, 1000)
    if (safe) result.push(safe)
  }
  return result
}

function shortList(value: unknown, min: number, max: number): string[] | null {
  const items = stringList(value, max)
  return items.length >= min && items.length <= max ? items : null
}

function fileId(path: string): string {
  return path.split('/').pop()?.replace(/\.json$/, '') ?? ''
}

function quizOption(value: unknown): QuizOption | null {
  const item = record(value)
  if (!item) return null
  const label = text(item.text, 240)
  const explain = text(item.explain, 240)
  return label && explain ? { text: label, explain } : null
}

/** Exported so unit tests can feed deliberately broken JSON shapes. */
export function sanitizeQuizItem(raw: unknown): QuizItem | null {
  const item = record(raw)
  if (!item) return null
  const id = text(item.id, 80)
  const kind = typeof item.kind === 'string' && QUIZ_KINDS.has(item.kind as QuizKind)
    ? (item.kind as QuizKind)
    : null
  const prompt = text(item.prompt, 240)
  const answerIndex = integer(item.answerIndex, 0, 3)
  if (!id || !kind || !prompt || answerIndex === null || !Array.isArray(item.options) || item.options.length !== 4) return null
  const options = item.options.map(quizOption)
  if (options.some((option) => option === null)) return null
  const codeSnippet = item.codeSnippet === null ? null : optionalText(item.codeSnippet, 2400)
  return {
    id,
    kind,
    prompt,
    codeSnippet,
    options: options as [QuizOption, QuizOption, QuizOption, QuizOption],
    answerIndex: answerIndex as QuizItem['answerIndex'],
  }
}

function sanitizeTest(raw: unknown): TestCase | null {
  const item = record(raw)
  if (!item) return null
  const input = text(item.input, 2048)
  const expected = text(item.expected, 2048)
  const note = text(item.note, 240)
  return input && expected && note ? { input, expected, note } : null
}

/** Exported so unit tests can feed deliberately broken JSON shapes. */
export function sanitizeStatement(raw: unknown): Statement | null {
  const item = record(raw)
  if (!item) return null
  const problemId = text(item.problemId, 80)
  const statement = text(item.statement, 700)
  const constraints = shortList(item.constraints, 1, 6)
  const example = record(item.example)
  const input = example && text(example.input, 1000)
  const output = example && text(example.output, 1000)
  const why = example && text(example.why, 1000)
  const hint = text(item.hint, 240)
  const mistake = text(item.mistake, 240)
  if (!problemId || !statement || !constraints || !input || !output || !why || !hint || !mistake) return null
  const tests = Array.isArray(item.tests) ? item.tests.slice(0, 6).map(sanitizeTest) : []
  return {
    problemId,
    statement,
    constraints,
    example: { input, output, why },
    hint,
    mistake,
    tests: tests.filter((test): test is TestCase => test !== null),
  }
}

function sanitizePrimer(raw: unknown): Primer | null {
  const item = record(raw)
  if (!item) return null
  const intro = text(item.intro, 4000)
  const whenToUse = shortList(item.whenToUse, 1, 5)
  const mentalModel = text(item.mentalModel, 4000)
  const mistakes = shortList(item.mistakes, 1, 3)
  const example = record(item.example)
  const title = example && text(example.title, 120)
  const code = example && text(example.code, 4000)
  const explain = example && text(example.explain, 2000)
  const practice = text(item.practice, 2000)
  if (!intro || !whenToUse || !mentalModel || !mistakes || !title || !code || !explain || !practice) return null
  return {
    intro,
    whenToUse,
    mentalModel,
    mistakes,
    example: { title, code, explain },
    practice,
  }
}

function sanitizeSection(raw: unknown): PrimerSection | null {
  const item = record(raw)
  if (!item) return null
  const title = text(item.title, 120)
  const body = text(item.text, 4000)
  return title && body ? { title, text: body } : null
}

/** Exported so unit tests can feed deliberately broken JSON shapes. */
export function sanitizeTopicContent(raw: unknown): TopicContent | null {
  const item = record(raw)
  if (!item) return null
  const topicId = text(item.topicId, 80)
  if (!topicId) return null
  const sections = Array.isArray(item.sections)
    ? item.sections.slice(0, 3).map(sanitizeSection).filter((section): section is PrimerSection => section !== null)
    : []
  const quiz = Array.isArray(item.quiz)
    ? item.quiz.map(sanitizeQuizItem).filter((entry): entry is QuizItem => entry !== null)
    : []
  return {
    topicId,
    patterns: stringList(item.patterns, 3),
    learnOrder: stringList(item.learnOrder, 200),
    primer: item.primer == null ? null : sanitizePrimer(item.primer),
    sections,
    quiz,
  }
}

function sanitizePracticeProblem(raw: unknown): PracticeProblem | null {
  const item = record(raw)
  if (!item) return null
  const lc = integer(item.lc, 1, 4000)
  const slug = text(item.slug, 100)
  const title = text(item.title, 120)
  const level = item.level === 'basic' || item.level === 'core' || item.level === 'pro' ? item.level : null
  const set = integer(item.set, 1, 20)
  const estMinutes = integer(item.estMinutes, 5, 120)
  const why = text(item.why, 90)
  if (lc === null || !slug || !title || !level || set === null || estMinutes === null || !why) return null
  return { lc, slug, title, level, set, estMinutes, why, classic: boolean(item.classic) }
}

/** Exported so unit tests can feed deliberately broken JSON shapes. */
export function sanitizePracticeSet(raw: unknown): PracticeSet | null {
  const item = record(raw)
  if (!item) return null
  const patternId = text(item.patternId, 80)
  const topicId = text(item.topicId, 80)
  const title = text(item.title, 120)
  const summary = text(item.summary, 240)
  const verified = text(item.verified, 10)
  const problems = Array.isArray(item.problems)
    ? item.problems.slice(0, 4).map(sanitizePracticeProblem).filter((entry): entry is PracticeProblem => entry !== null)
    : []
  if (!patternId || !topicId || !title || !summary || !verified || problems.length < 3) return null
  return {
    patternId,
    topicId,
    title,
    summary,
    prerequisites: stringList(item.prerequisites, 8),
    verified,
    problems,
  }
}

function sanitizeCoverageTopic(raw: unknown): CoverageTopic | null {
  const item = record(raw)
  if (!item) return null
  const topicId = text(item.topicId, 80)
  const title = text(item.title, 120)
  const statements = integer(item.statements, 0, 500)
  const hints = integer(item.hints, 0, 500)
  const quizItems = integer(item.quizItems, 0, 500)
  const theoryMcqs = integer(item.theoryMcqs, 0, 100)
  const drills = integer(item.drills, 0, 200)
  if (!topicId || !title || statements === null || hints === null || quizItems === null || theoryMcqs === null || drills === null) return null
  return { topicId, title, primer: boolean(item.primer), statements, hints, quizItems, theoryMcqs, drills }
}

function emptyCoverage(): CoverageReport {
  return {
    schemaVersion: 1,
    asOf: 'unknown',
    catalogue: { rows: 0, topics: 0, theoryRows: 0 },
    resources: {
      rowsWithResources: 0,
      multiPublisherRows: 0,
      multiPublisherPercent: 0,
      leetcodeExactOrNear: 0,
      theoryLabelled: 0,
      staleLinks: 0,
      sources: [],
    },
    content: {
      primers: 0,
      primerWords: 0,
      statements: 0,
      hints: 0,
      mistakes: 0,
      testCases: 0,
      quizItems: 0,
      theoryMcqs: 0,
      fullyAuthoredTopics: [],
    },
    practice: { patterns: 0, drills: 0, uniqueSlugs: 0, contiguousSets: false, sets: [] },
    byTopic: [],
  }
}

/** Exported so unit tests can feed deliberately broken JSON shapes. */
export function sanitizeCoverage(raw: unknown): CoverageReport {
  const empty = emptyCoverage()
  const item = record(raw)
  if (!item) return empty
  const catalogue = record(item.catalogue)
  const resources = record(item.resources)
  const content = record(item.content)
  const practice = record(item.practice)
  if (!catalogue || !resources || !content || !practice) return empty
  const asOf = text(item.asOf, 10) ?? 'unknown'
  const count = (value: unknown) => integer(value, 0, 10000) ?? 0
  return {
    schemaVersion: 1,
    asOf,
    catalogue: {
      rows: count(catalogue.rows),
      topics: count(catalogue.topics),
      theoryRows: count(catalogue.theoryRows),
    },
    resources: {
      rowsWithResources: count(resources.rowsWithResources),
      multiPublisherRows: count(resources.multiPublisherRows),
      multiPublisherPercent: count(resources.multiPublisherPercent),
      leetcodeExactOrNear: count(resources.leetcodeExactOrNear),
      theoryLabelled: count(resources.theoryLabelled),
      staleLinks: count(resources.staleLinks),
      sources: stringList(resources.sources, 20),
    },
    content: {
      primers: count(content.primers),
      primerWords: count(content.primerWords),
      statements: count(content.statements),
      hints: count(content.hints),
      mistakes: count(content.mistakes),
      testCases: count(content.testCases),
      quizItems: count(content.quizItems),
      theoryMcqs: count(content.theoryMcqs),
      fullyAuthoredTopics: stringList(content.fullyAuthoredTopics, 20),
    },
    practice: {
      patterns: count(practice.patterns),
      drills: count(practice.drills),
      uniqueSlugs: count(practice.uniqueSlugs),
      contiguousSets: boolean(practice.contiguousSets),
      sets: Array.isArray(practice.sets)
        ? practice.sets.slice(0, 20).map((value) => integer(value, 1, 20) ?? 0).filter((value) => value > 0)
        : [],
    },
    byTopic: Array.isArray(item.byTopic)
      ? item.byTopic.map(sanitizeCoverageTopic).filter((topic): topic is CoverageTopic => topic !== null)
      : [],
  }
}

function collect<T>(modules: Record<string, unknown>, sanitize: (raw: unknown) => T | null): Map<string, T> {
  const result = new Map<string, T>()
  for (const [path, raw] of Object.entries(modules)) {
    const id = fileId(path)
    const safe = sanitize(raw)
    if (id && safe) result.set(id, safe)
  }
  return result
}

const topics = collect(TOPIC_MODULES, sanitizeTopicContent)
const statements = collect(PROBLEM_MODULES, sanitizeStatement)
const practiceSets = collect(PRACTICE_MODULES, sanitizePracticeSet)
const coverage = sanitizeCoverage(coverageRaw)

export function contentCoverage(): CoverageReport {
  return coverage
}

export function getTopicContent(topicId: string): TopicContent | null {
  return topics.get(topicId) ?? null
}

export function getStatement(problemId: string): Statement | null {
  return statements.get(problemId) ?? null
}

export function getHint(problemId: string): { problemId: string; hint: string; mistake: string } | null {
  const statement = getStatement(problemId)
  return statement ? { problemId, hint: statement.hint, mistake: statement.mistake } : null
}

export function getPrimer(topicId: string): Primer | null {
  return getTopicContent(topicId)?.primer ?? null
}

export function getQuiz(topicId: string): QuizItem[] {
  return getTopicContent(topicId)?.quiz ?? []
}

export function getTests(problemId: string): TestCase[] {
  return getStatement(problemId)?.tests ?? []
}

export function getPracticeSets(): PracticeSet[] {
  return [...practiceSets.values()].sort((a, b) => a.patternId.localeCompare(b.patternId))
}

export function getPracticeSet(patternId: string): PracticeSet | null {
  return practiceSets.get(patternId) ?? null
}

export function getPracticeSetsByTopic(topicId: string): PracticeSet[] {
  return getPracticeSets().filter((set) => set.topicId === topicId)
}

export function getTopicPatterns(topicId: string): string[] {
  return getTopicContent(topicId)?.patterns ?? []
}

export function getTopicQuizCount(topicId: string): number {
  return getQuiz(topicId).length
}

export function getTheoryMcqCount(topicId?: string): number {
  if (!topicId) return coverage.content.theoryMcqs
  return coverage.byTopic.find((topic) => topic.topicId === topicId)?.theoryMcqs ?? 0
}
