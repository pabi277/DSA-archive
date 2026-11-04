import { describe, expect, it } from 'vitest'
import {
  autoIndentPrefix,
  clampDraft,
  filterSnippets,
  indentSelection,
  legacyMarkdownTail,
  legacyNoteToSnippet,
  sanitizeSnippet,
  snippetsForBackup,
  sortSnippets,
  updatedAgeLabel,
  type Snippet,
  type SnippetsById,
} from './codeStore'

const now = '2026-11-03T12:00:00.000Z'

function snippet(problemId: string, overrides: Partial<Snippet> = {}): Snippet {
  return { problemId, language: 'cpp', code: 'int main() {}', notes: '', updatedAt: now, ...overrides }
}

describe('snippet sanitisation (rules v6 shape)', () => {
  it('clamps sizes, defaults a bad language and treats an empty snippet as absent', () => {
    expect(sanitizeSnippet('two-sum', null)).toBeNull()
    expect(sanitizeSnippet('two-sum', { language: 'cpp', code: '  ', notes: '' })).toBeNull()
    expect(sanitizeSnippet('two-sum', { language: 'cpp', code: 42, notes: '' })).toBeNull()

    const read = sanitizeSnippet('two-sum', {
      language: 'python',
      code: 'seen = {}',
      notes: 'Store the complement.',
      verdict: 'hint',
      updatedAt: { toDate: () => new Date(now) },
    })
    expect(read).toEqual({
      problemId: 'two-sum',
      language: 'python',
      code: 'seen = {}',
      notes: 'Store the complement.',
      verdict: 'hint',
      updatedAt: now,
    })

    const clamped = sanitizeSnippet('two-sum', {
      language: 'cobol',
      code: 'x'.repeat(9000),
      notes: 'y'.repeat(900),
      verdict: 'lucky',
    })
    expect(clamped?.language).toBe('other')
    expect(clamped?.code.length).toBe(8000)
    expect(clamped?.notes.length).toBe(500)
    expect(clamped?.verdict).toBeUndefined()
  })

  it('clamps a draft to exactly what the rules accept', () => {
    expect(clampDraft({ language: 'rust', code: 'fn main() {}', notes: 'ok', verdict: 'clean' })).toEqual({
      language: 'rust',
      code: 'fn main() {}',
      notes: 'ok',
      verdict: 'clean',
    })
    const draft = clampDraft({ language: 'nope' as never, code: 'x'.repeat(8100), notes: 'y'.repeat(510) })
    expect(draft.language).toBe('other')
    expect(draft.code.length).toBe(8000)
    expect(draft.notes.length).toBe(500)
    expect(draft.verdict).toBeUndefined()
  })
})

describe('#/code search and filters', () => {
  const snippets: SnippetsById = {
    'two-sum': snippet('two-sum', { language: 'cpp', code: 'unordered_map<int,int> seen;', updatedAt: '2026-11-01T00:00:00.000Z' }),
    'linear-search': snippet('linear-search', { language: 'python', code: 'for x in nums: pass', notes: 'First match wins.' }),
    'merge-sorting': snippet('merge-sorting', { language: 'cpp', code: 'merge(left, right)' }),
  }

  it('sorts newest first with a title tiebreak', () => {
    expect(sortSnippets(Object.values(snippets)).map((entry) => entry.problemId)).toEqual([
      'linear-search',
      'merge-sorting',
      'two-sum',
    ])
  })

  it('searches title, code text and the plain-text reminder', () => {
    const all = { query: '', language: '' as const, topicId: '' }
    expect(filterSnippets(snippets, { ...all, query: 'unordered_map' }).map((entry) => entry.problemId)).toEqual(['two-sum'])
    expect(filterSnippets(snippets, { ...all, query: 'first match' }).map((entry) => entry.problemId)).toEqual(['linear-search'])
    expect(filterSnippets(snippets, { ...all, query: 'merge sorting' }).map((entry) => entry.problemId)).toEqual(['merge-sorting'])
    expect(filterSnippets(snippets, { ...all, language: 'cpp' })).toHaveLength(2)
    // Two Sum and Linear Search live in Arrays; Merge Sorting does not.
    expect(filterSnippets(snippets, { ...all, topicId: 'arrays' })).toHaveLength(2)
    expect(filterSnippets(snippets, { ...all, language: 'cpp', topicId: 'arrays' }).map((entry) => entry.problemId)).toEqual(['two-sum'])
    expect(filterSnippets(snippets, { ...all, query: 'nothing-here' })).toEqual([])
  })

  it('builds backup arrays newest first, keeping verdicts', () => {
    const backup = snippetsForBackup({ ...snippets, 'two-sum': snippet('two-sum', { verdict: 'couldnt' }) })
    expect(backup.map((entry) => entry.problemId)).toEqual(['linear-search', 'merge-sorting', 'two-sum'])
    expect(backup[2]).toMatchObject({ verdict: 'couldnt' })
    expect(backup[0].verdict).toBeUndefined()
  })

  it('labels relative update ages', () => {
    const at = new Date(now)
    expect(updatedAgeLabel(now, at)).toBe('today')
    expect(updatedAgeLabel('2026-11-02T12:00:00.000Z', at)).toBe('1d ago')
    expect(updatedAgeLabel('2026-10-31T12:00:00.000Z', at)).toBe('3d ago')
    expect(updatedAgeLabel(null, at)).toBe('date unknown')
    expect(updatedAgeLabel('nonsense', at)).toBe('date unknown')
  })
})

describe('legacy note migration (backup schemas ≤4)', () => {
  it('strips markdown and keeps the 500-character plain-text tail', () => {
    expect(legacyMarkdownTail('# Two sum\nUse a **hash map**.')).toBe('Two sum Use a hash map.')
    expect(legacyMarkdownTail('```\ncode()\n```\n- Remember the edge case')).toBe('Remember the edge case')
    const long = legacyMarkdownTail('a'.repeat(600))
    expect(long.length).toBe(500)
    const tailed = legacyMarkdownTail(`${'x'.repeat(550)} TAIL`)
    expect(tailed.endsWith('TAIL')).toBe(true)
    expect(tailed.length).toBeLessThanOrEqual(500)
  })

  it('keeps the old code field byte-for-byte and never guesses a language', () => {
    const { snippet: migrated, bodyDropped } = legacyNoteToSnippet(
      'two-sum',
      '# Two sum\nStore the complement.',
      'const seen = new Map()',
    )
    expect(bodyDropped).toBe(true)
    expect(migrated).toMatchObject({
      problemId: 'two-sum',
      language: 'other',
      code: 'const seen = new Map()',
      notes: 'Two sum Store the complement.',
    })

    const codeOnly = legacyNoteToSnippet('two-sum', '', 'int main() {}')
    expect(codeOnly.bodyDropped).toBe(false)
    expect(codeOnly.snippet?.notes).toBe('')

    expect(legacyNoteToSnippet('two-sum', '   ', '').snippet).toBeNull()
  })
})

describe('editor text helpers', () => {
  it('indents at the caret and across a multi-line selection', () => {
    expect(indentSelection('ab', 1, 1, false)).toEqual({ value: 'a  b', selectionStart: 3, selectionEnd: 3 })
    const block = indentSelection('one\ntwo', 0, 7, false)
    expect(block.value).toBe('  one\n  two')
    expect(block.selectionStart).toBe(2)
  })

  it('outdents one level and never moves the caret before the line start', () => {
    const once = indentSelection('  one\n  two', 0, 11, true)
    expect(once.value).toBe('one\ntwo')
    expect(indentSelection('one', 0, 3, true).value).toBe('one')
    expect(indentSelection(' one', 1, 5, true).selectionStart).toBeGreaterThanOrEqual(0)
  })

  it('carries the current indent onto the next line', () => {
    expect(autoIndentPrefix('    if (x) {', 12)).toBe('\n    ')
    expect(autoIndentPrefix('plain', 5)).toBe('\n')
    expect(autoIndentPrefix('a\n  b', 5)).toBe('\n  ')
  })

})
