import { beforeEach, describe, expect, it } from 'vitest'
import {
  MOMENT_LIMIT,
  MOMENT_TEXT_LIMIT,
  addMoment,
  clampAt,
  clampMomentText,
  clearMomentUndoForTests,
  formatSeek,
  momentsCountLabel,
  momentsOf,
  nextSeekTarget,
  nextStamp,
  removeMoment,
  rememberMoments,
  sanitizeMoment,
  sanitizeMoments,
  seekTarget,
  sortMoments,
  undoMoments,
  type Moment,
} from './stamps'

const at = (minutes: number, second: number, text: string): Moment => ({
  at: minutes * 60 + second,
  text,
  createdAt: '2026-11-04T10:00:00.000Z',
})

describe('stamp shape (rules v8: ≤30 per snippet, ≤140 chars, `at` 0–86400)', () => {
  it('clamps `at` into the accepted range', () => {
    expect(clampAt(754)).toBe(754)
    expect(clampAt(-4)).toBe(0)
    expect(clampAt(12.9)).toBe(12)
    expect(clampAt(Number.NaN)).toBe(0)
    expect(clampAt(99_999)).toBe(86_400)
  })

  it('trims text to 140 characters without leaving half a word', () => {
    const long = `${'word '.repeat(40)}end`
    const trimmed = clampMomentText(long)
    expect(trimmed.length).toBeLessThanOrEqual(MOMENT_TEXT_LIMIT)
    expect(trimmed.endsWith('word')).toBe(true)
    expect(clampMomentText('  two   spaces\nhere  ')).toBe('two spaces here')
    expect(clampMomentText('x'.repeat(200))).toHaveLength(140)
  })

  it('reads a stamp defensively and drops the unusable ones', () => {
    expect(sanitizeMoment({ at: 42, text: 'the trick' })).toEqual({
      at: 42,
      text: 'the trick',
      createdAt: '',
    })
    expect(sanitizeMoment({ at: -1, text: 'before the start' })).toBeNull()
    expect(sanitizeMoment({ at: '42', text: 'quoted seconds' })).toBeNull()
    expect(sanitizeMoment({ at: 42, text: '   ' })).toBeNull()
    expect(sanitizeMoment({ at: 42 })).toBeNull()
    expect(sanitizeMoment(null)).toBeNull()
    expect(sanitizeMoment([])).toBeNull()
  })

  it('sanitizes a stored list in time order and stops at the cap', () => {
    const raw = [at(2, 0, 'second'), at(0, 30, 'first'), { at: 9, text: '' }, at(1, 0, 'middle')]
    expect(sanitizeMoments(raw).map((moment) => moment.text)).toEqual(['first', 'middle', 'second'])
    const tooMany = Array.from({ length: MOMENT_LIMIT + 4 }, (_, index) => at(0, index, `s${index}`))
    expect(sanitizeMoments(tooMany)).toHaveLength(MOMENT_LIMIT)
    expect(sanitizeMoments('nope')).toEqual([])
    expect(momentsOf(null)).toEqual([])
    expect(momentsOf({ moments: [at(0, 5, 'from a snippet')] } as never)).toHaveLength(1)
  })

  it('sorts stably by time', () => {
    const input = [at(1, 0, 'b'), at(0, 10, 'a'), at(1, 0, 'c')]
    expect(sortMoments(input).map((moment) => moment.text)).toEqual(['a', 'b', 'c'])
    expect(input.map((moment) => moment.text)).toEqual(['b', 'a', 'c'])
  })
})

describe('adding and deleting stamps', () => {
  it('adds at the playhead in time order', () => {
    const result = addMoment([at(5, 0, 'later')], 61, 'the pivot step')
    expect(result.error).toBe('')
    expect(result.moments.map((moment) => moment.text)).toEqual(['the pivot step', 'later'])
    expect(result.moments[0].at).toBe(61)
  })

  it('refuses an empty stamp and the thirty-first stamp with a sentence', () => {
    expect(addMoment([], 10, '   ').error).toBe('Write what happens at this moment first.')
    const full = Array.from({ length: MOMENT_LIMIT }, (_, index) => at(0, index, `s${index}`))
    const result = addMoment(full, 99, 'one too many')
    expect(result.moments).toHaveLength(MOMENT_LIMIT)
    expect(result.error).toContain('30 stamps')
  })

  it('deletes by index and ignores out-of-range indexes', () => {
    const list = [at(0, 1, 'a'), at(0, 2, 'b'), at(0, 3, 'c')]
    expect(removeMoment(list, 1).map((moment) => moment.text)).toEqual(['a', 'c'])
    expect(removeMoment(list, -1)).toBe(list)
    expect(removeMoment(list, 7)).toBe(list)
  })
})

describe('stamp seeking', () => {
  it('lands two seconds early so the sentence before the point is audible', () => {
    expect(seekTarget(at(12, 34, 'x'))).toBe(752)
    expect(seekTarget(at(0, 0, 'very start'))).toBe(0)
  })

  it('picks the next stamp ahead of the playhead, else wraps to the first', () => {
    const list = [at(0, 30, 'a'), at(5, 0, 'b'), at(11, 0, 'c')]
    expect(nextStamp(list, 0)?.text).toBe('a')
    expect(nextStamp(list, 30)?.text).toBe('b')
    expect(nextStamp(list, 5 * 60)?.text).toBe('c')
    expect(nextStamp(list, 20 * 60)?.text).toBe('a')
    expect(nextStamp([], 0)).toBeNull()
    expect(nextSeekTarget(list, 10)?.text).toBe('a')
  })

  it('labels the skip control with the next stamp clock', () => {
    const list = [at(0, 30, 'a'), at(12, 34, 'b')]
    expect(formatSeek(list, 0)).toBe('0:30')
    expect(formatSeek(list, 60)).toBe('12:34')
    expect(formatSeek([], 0)).toBe('no stamps')
    expect(momentsCountLabel(0)).toBe('No stamps')
    expect(momentsCountLabel(1)).toBe('1 stamp')
    expect(momentsCountLabel(3)).toBe('3 stamps')
  })
})

describe('undo (every mutation is undoable)', () => {
  beforeEach(() => clearMomentUndoForTests())

  it('restores the list exactly as it was before a mutation', () => {
    const before = [at(0, 10, 'keep me')]
    rememberMoments('two-sum', before)
    const afterAdd = addMoment(before, 90, 'new one').moments
    expect(afterAdd).toHaveLength(2)
    expect(undoMoments('two-sum')).toEqual(before)
  })

  it('unwinds several mutations in order and returns null when empty', () => {
    rememberMoments('p', [])
    rememberMoments('p', [at(0, 1, 'first')])
    expect(undoMoments('p')).toHaveLength(1)
    expect(undoMoments('p')).toHaveLength(0)
    expect(undoMoments('p')).toBeNull()
    expect(undoMoments('never-touched')).toBeNull()
  })

  it('keeps separate histories per problem', () => {
    rememberMoments('a', [at(0, 1, 'a1')])
    rememberMoments('b', [at(0, 2, 'b1')])
    expect(undoMoments('b')?.[0].text).toBe('b1')
    expect(undoMoments('a')?.[0].text).toBe('a1')
  })
})
