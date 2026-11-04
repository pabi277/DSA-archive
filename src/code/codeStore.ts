/**
 * Phase v2-04 pure model for saved solutions (`users/{uid}/snippets/{problemId}`).
 *
 * No Firebase imports here: this module is unit-tested and shared by the
 * Firestore hook (`codeData.ts`), the backup parser and the UI. One saved
 * solution per problem, per user. The short plain-text `notes` field is part
 * of a *code* document (a ≤500 character reminder beside your solution); it is
 * not the removed markdown-notes feature, which only survives as a legacy
 * backup-import migration (`legacyNoteToSnippet` below).
 */
import { locateProblem, timestampToIso } from '../library'
import type { Outcome } from '../progress'

export const CODE_LIMIT = 8000
export const SNIPPET_NOTES_LIMIT = 500

export const CODE_LANGUAGES = [
  'cpp',
  'c',
  'java',
  'python',
  'js',
  'ts',
  'go',
  'rust',
  'other',
] as const

export type CodeLanguage = (typeof CODE_LANGUAGES)[number]

export const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  cpp: 'C++',
  c: 'C',
  java: 'Java',
  python: 'Python',
  js: 'JavaScript',
  ts: 'TypeScript',
  go: 'Go',
  rust: 'Rust',
  other: 'Other',
}

/** Short chip text for rows (`#/code` wireframe: `cpp`, `py`). */
export function languageChip(language: CodeLanguage): string {
  if (language === 'python') return 'py'
  if (language === 'rust') return 'rs'
  if (language === 'other') return 'code'
  return language
}

export type SnippetVerdict = Outcome

export const VERDICT_LABELS: Record<SnippetVerdict, string> = {
  clean: 'Clean',
  hint: 'Hint',
  couldnt: "Couldn't",
}

export type Snippet = {
  problemId: string
  language: CodeLanguage
  code: string
  /** Plain text only, ≤500 characters. Never markdown, never rendered as HTML. */
  notes: string
  verdict?: SnippetVerdict
  /** ISO string from the Firestore server timestamp; null when unreadable. */
  updatedAt: string | null
}

export type SnippetsById = Record<string, Snippet>

export type SnippetDraft = {
  language: CodeLanguage
  code: string
  notes: string
  verdict?: SnippetVerdict
}

export type BackupSnippet = {
  problemId: string
  language: CodeLanguage
  code: string
  notes: string
  verdict?: SnippetVerdict
  updatedAt: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isCodeLanguage(value: unknown): value is CodeLanguage {
  return typeof value === 'string' && (CODE_LANGUAGES as readonly string[]).includes(value)
}

export function isSnippetVerdict(value: unknown): value is SnippetVerdict {
  return value === 'clean' || value === 'hint' || value === 'couldnt'
}

export function clampLanguage(value: unknown): CodeLanguage {
  return isCodeLanguage(value) ? value : 'other'
}

export function snippetIsEmpty(code: string, notes: string) {
  return code.trim() === '' && notes.trim() === ''
}

/**
 * Read a Firestore snippet document defensively. Corrupt or oversized values
 * are clamped instead of breaking the UI, an unknown language reads as
 * `other`, and an all-empty document is treated as absent (the client deletes
 * a snippet whose text was cleared).
 */
export function sanitizeSnippet(problemId: string, raw: unknown): Snippet | null {
  if (!isRecord(raw)) return null
  const code = typeof raw.code === 'string' ? raw.code.slice(0, CODE_LIMIT) : ''
  const notes = typeof raw.notes === 'string' ? raw.notes.slice(0, SNIPPET_NOTES_LIMIT) : ''
  if (snippetIsEmpty(code, notes)) return null
  return {
    problemId,
    language: clampLanguage(raw.language),
    code,
    notes,
    ...(isSnippetVerdict(raw.verdict) ? { verdict: raw.verdict } : {}),
    updatedAt: timestampToIso(raw.updatedAt),
  }
}

/** Clamp a draft to exactly what rules v6 accept, before any write. */
export function clampDraft(draft: SnippetDraft): SnippetDraft {
  return {
    language: clampLanguage(draft.language),
    code: draft.code.slice(0, CODE_LIMIT),
    notes: draft.notes.slice(0, SNIPPET_NOTES_LIMIT),
    ...(draft.verdict && isSnippetVerdict(draft.verdict) ? { verdict: draft.verdict } : {}),
  }
}

/** Newest first, then by problem title so the order is stable. */
export function sortSnippets(snippets: Snippet[]): Snippet[] {
  return [...snippets].sort((a, b) => {
    const left = a.updatedAt ? Date.parse(a.updatedAt) : 0
    const right = b.updatedAt ? Date.parse(b.updatedAt) : 0
    if (left !== right) return right - left
    const titleA = locateProblem(a.problemId)?.problem.title ?? a.problemId
    const titleB = locateProblem(b.problemId)?.problem.title ?? b.problemId
    return titleA.localeCompare(titleB)
  })
}

export type SnippetFilters = {
  query: string
  /** `''` = all languages. */
  language: CodeLanguage | ''
  /** `''` = all topics. */
  topicId: string
}

/**
 * `#/code` search + filters: the query matches the problem title, the code
 * text and the plain-text note, so "hash map" finds both the words beside a
 * solution and the identifiers inside it.
 */
export function filterSnippets(snippets: SnippetsById, filters: SnippetFilters): Snippet[] {
  const needle = filters.query.trim().toLowerCase().replace(/\s+/g, ' ')
  return sortSnippets(Object.values(snippets)).filter((snippet) => {
    if (filters.language && snippet.language !== filters.language) return false
    const location = locateProblem(snippet.problemId)
    if (filters.topicId && location?.topicId !== filters.topicId) return false
    if (needle === '') return true
    return [snippet.code, snippet.notes, location?.problem.title ?? '']
      .join(' ')
      .toLowerCase()
      .includes(needle)
  })
}

export function snippetsForBackup(snippets: SnippetsById): BackupSnippet[] {
  return sortSnippets(Object.values(snippets)).map((snippet) => ({
    problemId: snippet.problemId,
    language: snippet.language,
    code: snippet.code,
    notes: snippet.notes,
    ...(snippet.verdict ? { verdict: snippet.verdict } : {}),
    updatedAt: snippet.updatedAt,
  }))
}

/** Compact relative age for `#/code` rows (`today`, `3d ago`, `2mo ago`). */
export function updatedAgeLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'date unknown'
  const from = Date.parse(iso)
  if (Number.isNaN(from)) return 'date unknown'
  const days = Math.floor((now.getTime() - from) / 86_400_000)
  if (days <= 0) return 'today'
  if (days < 100) return `${days}d ago`
  return `${Math.round(days / 30)}mo ago`
}

/* --- legacy backup migration (schemas ≤4 → snippets) ---------------------- */

/**
 * Strip the old note body's markdown down to plain text, keeping its ≤500
 * character tail (the end of the note is where the "remember this" line
 * usually lives). Formatting never survives: snippet notes are plain text.
 */
export function legacyMarkdownTail(markdown: string): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/[`*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length <= SNIPPET_NOTES_LIMIT ? plain : plain.slice(-SNIPPET_NOTES_LIMIT).trim()
}

export type LegacyNoteMigration = {
  snippet: BackupSnippet | null
  /** True when a markdown body existed and was shortened/stripped. */
  bodyDropped: boolean
}

/**
 * One legacy note (`{ markdown, snippet }`) becomes one saved solution: the
 * old `snippet` field was already code, so it becomes `code` unchanged; the
 * markdown body is dropped except its plain-text tail, which becomes the
 * ≤500 `notes` reminder. The language cannot be guessed, so it is `other`.
 */
export function legacyNoteToSnippet(problemId: string, markdown: string, code: string): LegacyNoteMigration {
  const notes = legacyMarkdownTail(markdown)
  const bodyDropped = markdown.trim() !== ''
  if (snippetIsEmpty(code, notes)) return { snippet: null, bodyDropped }
  return {
    snippet: { problemId, language: 'other', code: code.slice(0, CODE_LIMIT), notes, updatedAt: null },
    bodyDropped,
  }
}

/* --- editor text helpers (pure, so Tab/Enter behaviour is testable) ------- */

export const INDENT = '  '

export type TextEdit = { value: string; selectionStart: number; selectionEnd: number }

/** Indent (Tab) or outdent (Shift-Tab) every line the selection touches. */
export function indentSelection(value: string, start: number, end: number, outdent: boolean): TextEdit {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  if (!outdent && start === end) {
    const next = value.slice(0, start) + INDENT + value.slice(end)
    return { value: next, selectionStart: start + INDENT.length, selectionEnd: start + INDENT.length }
  }
  const block = value.slice(lineStart, end)
  const lines = block.split('\n')
  let firstDelta = 0
  const nextLines = lines.map((line, index) => {
    if (!outdent) {
      if (index === 0) firstDelta = INDENT.length
      return INDENT + line
    }
    const removable = line.startsWith(INDENT) ? INDENT.length : line.startsWith(' ') ? 1 : 0
    if (index === 0) firstDelta = -removable
    return line.slice(removable)
  })
  const nextBlock = nextLines.join('\n')
  const next = value.slice(0, lineStart) + nextBlock + value.slice(end)
  return {
    value: next,
    selectionStart: Math.max(lineStart, start + firstDelta),
    selectionEnd: Math.max(lineStart, end + (nextBlock.length - block.length)),
  }
}

/** The text Enter inserts: a newline plus the current line's leading spaces. */
export function autoIndentPrefix(value: string, caret: number): string {
  const lineStart = value.lastIndexOf('\n', caret - 1) + 1
  const line = value.slice(lineStart, caret)
  const match = /^[ \t]*/.exec(line)
  return `\n${match ? match[0] : ''}`
}
