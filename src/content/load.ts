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
import contentBundle from 'virtual:dsa-content'
import type { ResourceSource } from '../catalogue'
import { sanitizeMediaIndex, type MediaEntry, type MediaIndex } from '../theatre/oembed'
import type {
  InlineCheck,
  PracticeProblem,
  PracticeSet,
  Primer,
  PrimerSection,
  QuizItem,
  QuizKind,
  QuizOption,
  Statement,
  TestCase,
  TheoryMcq,
  TheoryReference,
  TheoryReveal,
  TopicContent,
} from './types'

type UnknownRecord = Record<string, unknown>

const QUIZ_KINDS = new Set<QuizKind>(['pattern', 'dryrun', 'complexity', 'bug', 'edge'])
const ALLOWED_SOURCES = new Set<ResourceSource>([
  'leetcode',
  'neetcode',
  'takeuforward',
  'geeksforgeeks',
  'programiz',
  'cp-algorithms',
  'usaco',
  'cppreference',
  'python-docs',
  'mdn',
  'roadmap-sh',
  'youtube',
])

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

function sanitizeReference(raw: unknown): TheoryReference | null {
  const item = record(raw)
  if (!item) return null
  const source = typeof item.source === 'string' && ALLOWED_SOURCES.has(item.source as ResourceSource)
    ? (item.source as ResourceSource)
    : null
  const url = text(item.url, 400)
  const label = text(item.label, 120)
  const verified = text(item.verified, 10)
  if (!source || !url || !url.startsWith('https://') || !label || !verified) return null
  return { source, url, label, verified }
}

function sanitizeReveal(raw: unknown): TheoryReveal | null {
  const item = record(raw)
  if (!item || item.alwaysAvailable !== true) return null
  const solution = text(item.solution, 400)
  const reference = sanitizeReference(item.reference)
  if (!solution || !reference) return null
  return { alwaysAvailable: true, solution, reference }
}

/** Exported so unit tests can feed deliberately broken JSON shapes. */
export function sanitizeInlineCheck(raw: unknown): InlineCheck | null {
  const item = record(raw)
  if (!item) return null
  const id = text(item.id, 80)
  const prompt = text(item.prompt, 240)
  const answerIndex = integer(item.answerIndex, 0, 3)
  if (!id || !prompt || answerIndex === null || !Array.isArray(item.options) || item.options.length !== 4) return null
  const options = item.options.map(quizOption)
  if (options.some((option) => option === null)) return null
  const codeSnippet = item.codeSnippet === null || item.codeSnippet === undefined
    ? null
    : optionalText(item.codeSnippet, 2400)
  const rereadSectionId = text(item.rereadSectionId, 80)
  const rereadSectionTitle = text(item.rereadSectionTitle, 140)
  const reveal = sanitizeReveal(item.reveal)
  if (!rereadSectionId || !rereadSectionTitle || !reveal) return null
  return {
    id,
    prompt,
    codeSnippet,
    options: options as [QuizOption, QuizOption, QuizOption, QuizOption],
    answerIndex: answerIndex as InlineCheck['answerIndex'],
    rereadSectionId,
    rereadSectionTitle,
    reveal,
  }
}

/** Exported so unit tests can feed deliberately broken JSON shapes. */
export function sanitizeTheoryMcq(raw: unknown): TheoryMcq | null {
  const item = record(raw)
  if (!item || item.schemaVersion !== 1) return null
  const kind = item.kind === 'theory'
    ? 'theory'
    : typeof item.kind === 'string' && QUIZ_KINDS.has(item.kind as QuizKind)
      ? (item.kind as QuizKind)
      : null
  const id = text(item.id, 80)
  const prompt = text(item.prompt, 240)
  const answerIndex = integer(item.answerIndex, 0, 3)
  if (!id || !kind || !prompt || answerIndex === null || !Array.isArray(item.options) || item.options.length !== 4) return null
  const options = item.options.map(quizOption)
  if (options.some((option) => option === null)) return null
  const codeSnippet = item.codeSnippet === null || item.codeSnippet === undefined
    ? null
    : optionalText(item.codeSnippet, 2400)
  const problemId = text(item.problemId, 80)
  const topicId = text(item.topicId, 80)
  const reveal = sanitizeReveal(item.reveal)
  const verified = text(item.verified, 10)
  if (!problemId || !topicId || !reveal || !verified) return null
  return {
    schemaVersion: 1,
    problemId,
    topicId,
    id,
    kind,
    prompt,
    codeSnippet,
    options: options as [QuizOption, QuizOption, QuizOption, QuizOption],
    answerIndex: answerIndex as TheoryMcq['answerIndex'],
    reveal,
    verified,
  }
}

function sanitizeSection(raw: unknown): PrimerSection | null {
  const item = record(raw)
  if (!item) return null
  const id = text(item.id, 80) ?? text(item.title, 80)?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ?? null
  const title = text(item.title, 120)
  const body = text(item.text, 4000)
  if (!id || !title || !body) return null
  const check = item.check === null || item.check === undefined ? null : sanitizeInlineCheck(item.check)
  if (item.check !== null && item.check !== undefined && !check) return null
  return { id, title, text: body, check }
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

/**
 * The three published numbers any screen shows, plus the report's `asOf` day.
 * `docs/content/coverage.md` and `tools/content-coverage.mjs --check` remain the
 * full, checked-in source of truth; the bundle carries only this projection.
 */
export type CoverageFacts = {
  asOf: string
  leetcodeTwins: number
  drills: number
  quizItems: number
}

/** Exported so unit tests can feed deliberately broken JSON shapes. */
export function sanitizeCoverage(raw: unknown): CoverageFacts {
  if (!Array.isArray(raw)) return { asOf: 'unknown', leetcodeTwins: 0, drills: 0, quizItems: 0 }
  const number = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0)
  const asOf = typeof raw[0] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw[0]) ? raw[0] : 'unknown'
  return { asOf, leetcodeTwins: number(raw[1]), drills: number(raw[2]), quizItems: number(raw[3]) }
}

function collect<T>(modules: Record<string, unknown>, sanitize: (raw: unknown) => T | null): Map<string, T> {
  const result = new Map<string, T>()
  for (const [id, raw] of Object.entries(modules)) {
    const safe = sanitize(raw)
    if (id && safe) result.set(id, safe)
  }
  return result
}

const CONTENT_SOURCES: ResourceSource[] = [
  'leetcode', 'neetcode', 'takeuforward', 'geeksforgeeks', 'programiz',
  'cp-algorithms', 'usaco', 'cppreference', 'python-docs', 'mdn',
  'roadmap-sh', 'youtube',
]
const CONTENT_LEVELS = [null, 'basic', 'core', 'pro'] as const

const [
  rawPrefixes,
  rawTopics,
  rawTheory,
  rawPractice,
  rawCoverage,
  rawMedia,
] = contentBundle as [
  string[],
  Record<string, unknown>,
  [string, string, string, string, string | 0, [string, string][], number, string, number, string, string, string | 0, string | 0][],
  [string, string, string, string, string[], string | 0, [number, string, string, number, number, number, string, number][]][],
  unknown,
  [string, string, string, [string, number, number] | 0, string, number, number][],
]

function unpackContentUrl(val: string): string {
  const code = val.charCodeAt(0) - 65
  return code >= 0 && code < rawPrefixes.length ? `${rawPrefixes[code]}${val.slice(1)}` : val
}

const unpackedTheory: Record<string, unknown> = Object.fromEntries(
  rawTheory.map(([problemId, topicId, id, prompt, codeSnippet, opts, answerIndex, solution, srcIdx, refUrl, refLabel, refVer, ver]) => [
    problemId,
    {
      schemaVersion: 1,
      problemId,
      topicId,
      id,
      kind: 'theory',
      prompt,
      codeSnippet: codeSnippet === 0 ? null : codeSnippet,
      options: opts.map(([t, e]) => ({ text: t, explain: e })),
      answerIndex,
      reveal: {
        alwaysAvailable: true,
        solution,
        reference: {
          source: CONTENT_SOURCES[srcIdx],
          url: unpackContentUrl(refUrl),
          label: refLabel,
          verified: refVer === 0 ? '2026-11-03' : refVer,
        },
      },
      verified: ver === 0 ? '2026-11-03' : ver,
    },
  ]),
)

const unpackedPractice: Record<string, unknown> = Object.fromEntries(
  rawPractice.map(([patternId, topicId, title, summary, prerequisites, ver, probs]) => [
    patternId,
    {
      patternId,
      topicId,
      title,
      summary,
      prerequisites,
      verified: ver === 0 ? '2026-11-03' : ver,
      problems: probs.map(([lc, slug, ptitle, lvl, set, estMinutes, why, classic]) => ({
        lc,
        slug,
        title: ptitle,
        level: CONTENT_LEVELS[lvl],
        set,
        estMinutes,
        why,
        classic: classic === 1,
      })),
    },
  ]),
)

const topics = collect(rawTopics, sanitizeTopicContent)
const theoryMcqs = collect(unpackedTheory, sanitizeTheoryMcq)

/* --- hybrid precache split: statements ride a lazy add-on chunk ----------- */
// Per-problem statements/tests/hints are intentionally NOT part of the
// precached `virtual:dsa-content` bundle (owner decision, docs/DECISIONS.md
// "hybrid precache split"): they arrive from `assets/statements-*.js` on the
// first problem visit, and the Service Worker then keeps that chunk
// cache-first like the runner and account add-ons. Until it lands, every
// getter returns the designed empty state; subscribers re-render the open
// screen the moment the content arrives.
let statements = new Map<string, Statement>()
let statementsTick = 0
let statementsImport: Promise<void> | null = null
const statementListeners = new Set<() => void>()

/**
 * Kick off (or join) the lazy statements import. Safe to call from render:
 * it is idempotent while in flight, and a failed import (offline before the
 * chunk was ever cached) resets so a later visit can retry.
 */
export function statementsReady(): Promise<void> {
  statementsImport ??= import('virtual:dsa-statements')
    .then((mod) => {
      statements = collect((mod.default ?? {}) as Record<string, unknown>, sanitizeStatement)
      statementsTick += 1
      void persistStatementsChunk(mod.chunkUrl)
      for (const listener of [...statementListeners]) listener()
    })
    .catch(() => {
      statementsImport = null
    })
  return statementsImport
}

/**
 * The SW serves `assets/statements-*` cache-first from the runtime bucket but
 * never writes it (phase v2-07 decision: the page owns runtime-cache writes,
 * so a stale SW can never pin stale bytes). Mirror of the runner pattern:
 * after a successful import, store the chunk so the next offline boot still
 * has every statement this session saw, and drop superseded hashes.
 */
async function persistStatementsChunk(chunkUrl: unknown): Promise<void> {
  try {
    if (typeof caches === 'undefined' || typeof chunkUrl !== 'string') return
    if (!chunkUrl.startsWith(`${location.origin}/assets/statements-`)) return
    const cache = await caches.open('dsa-archive-runtime-v1')
    for (const key of await cache.keys()) {
      if (key.url !== chunkUrl && key.url.startsWith(`${location.origin}/assets/statements-`)) {
        await cache.delete(key)
      }
    }
    if (!(await cache.match(chunkUrl))) await cache.add(chunkUrl)
  } catch {
    // Offline or Cache Storage unavailable: the in-memory import already
    // succeeded, so the screens still render; the next online boot retries.
  }
}

/** `useSyncExternalStore` subscribe — also starts the import. */
export function subscribeStatements(listener: () => void): () => void {
  void statementsReady()
  statementListeners.add(listener)
  return () => {
    statementListeners.delete(listener)
  }
}

/** `useSyncExternalStore` snapshot — bumps once when the statements land. */
export function statementsVersion(): number {
  return statementsTick
}
const practiceSets = collect(unpackedPractice, sanitizePracticeSet)
const coverage = sanitizeCoverage(rawCoverage)

export function contentCoverage(): CoverageFacts {
  return coverage
}

/* --- phase v2-06 video metadata (build-time oEmbed, never a runtime fetch) -- */

const mediaIndex: MediaIndex = (() => {
  const bag: Record<string, unknown> = {}
  for (const [videoId, title, author, thumb, fetched, dead, unknown] of rawMedia ?? []) {
    bag[videoId] = {
      videoId,
      title,
      author,
      thumbnail: thumb ? { url: thumb[0], width: thumb[1], height: thumb[2] } : null,
      fetched,
      dead: dead === 1,
      unknown: unknown === 1,
    }
  }
  return sanitizeMediaIndex(bag)
})()

/**
 * Cached oEmbed metadata for one video id, or null when `tools/fetch-media.mjs`
 * has not run for it. Null is *not* an error: the player is still embedded and
 * the title falls back to the problem title.
 */
export function mediaFor(videoId: string): MediaEntry | null {
  return mediaIndex[videoId] ?? null
}

export function mediaCount(): number {
  return Object.keys(mediaIndex).length
}

export function deadMediaIds(): string[] {
  return Object.values(mediaIndex)
    .filter((entry) => entry.dead)
    .map((entry) => entry.videoId)
    .sort()
}

export function getTopicContent(topicId: string): TopicContent | null {
  return topics.get(topicId) ?? null
}

export function getStatement(problemId: string): Statement | null {
  void statementsReady()
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

export function getTheoryMcq(problemId: string): TheoryMcq | null {
  return theoryMcqs.get(problemId) ?? null
}

export function getTheoryMcqsByTopic(topicId: string): TheoryMcq[] {
  return [...theoryMcqs.values()].filter((mcq) => mcq.topicId === topicId)
}

export function getAllTheoryMcqs(): TheoryMcq[] {
  return [...theoryMcqs.values()]
}

export function getTheoryMcqCount(topicId?: string): number {
  if (!topicId) return theoryMcqs.size
  return getTheoryMcqsByTopic(topicId).length
}
