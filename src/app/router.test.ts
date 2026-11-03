import { describe, expect, it } from 'vitest'
import { buildPath, buildQuery, parseQuery, parseRoute } from './router'

describe('hash router: parsing (§3.1, A1)', () => {
  it('defaults to Today for an empty hash', () => {
    expect(parseRoute('')).toMatchObject({ name: 'today', param: '', query: {} })
    expect(parseRoute('#')).toMatchObject({ name: 'today' })
    expect(parseRoute('#/')).toMatchObject({ name: 'today' })
  })

  it('parses every static route, with and without the leading slash', () => {
    for (const name of ['topics', 'search', 'review', 'code', 'practice', 'quiz', 'insights', 'settings', 'lists', 'friends', 'stats'] as const) {
      expect(parseRoute(`#/${name}`).name).toBe(name)
      expect(parseRoute(`#${name}`).name).toBe(name)
    }
  })

  it('parses dynamic segments and keeps them decoded', () => {
    expect(parseRoute('#/topic/arrays')).toMatchObject({ name: 'topic', param: 'arrays' })
    expect(parseRoute('#/problem/two-sum')).toMatchObject({ name: 'problem', param: 'two-sum' })
    expect(parseRoute('#/topic/strings-basic-and-medium').param).toBe('strings-basic-and-medium')
    expect(parseRoute('#/topic/a%2Fb').param).toBe('a/b')
  })

  it('accepts a full URL and a bare pathname (pasted links)', () => {
    expect(parseRoute('https://example.test/#/topics').name).toBe('topics')
    expect(parseRoute('https://example.test/#/topic/arrays').param).toBe('arrays')
    expect(parseRoute('/topics').name).toBe('topics')
  })

  it('returns not-found for unknown routes and incomplete dynamic ones', () => {
    expect(parseRoute('#/nope').name).toBe('not-found')
    expect(parseRoute('#/nope/deeper').name).toBe('not-found')
    expect(parseRoute('#/topic').name).toBe('not-found')
    expect(parseRoute('#/problem').name).toBe('not-found')
    expect(parseRoute('#/settings/extra').name).toBe('not-found')
    expect(parseRoute('#/not-found').name).toBe('not-found')
  })

  it('never throws on a malformed escape', () => {
    expect(() => parseRoute('#/topic/%E0%A4%A')).not.toThrow()
    expect(parseRoute('#/topic/%E0%A4%A').name).toBe('topic')
  })
})

describe('query strings', () => {
  it('parses first value wins and decodes plus as space', () => {
    expect(parseQuery('?q=two+sum&level=basic,core&level=pro')).toEqual({
      q: 'two sum',
      level: 'basic,core',
    })
    expect(parseQuery('q=%C3%A9')).toEqual({ q: 'é' })
    expect(parseQuery('')).toEqual({})
  })

  it('builds compact queries and skips empty values', () => {
    expect(buildQuery({ q: 'two sum', level: '', link: 'video', topic: undefined })).toBe('q=two+sum&link=video')
    expect(buildQuery({})).toBe('')
  })

  it('round-trips search filters through the URL', () => {
    const path = buildPath('search', '', { q: 'binary search', level: 'core,pro', link: 'article' })
    expect(path).toBe('#/search?q=binary+search&level=core%2Cpro&link=article')
    const route = parseRoute(path)
    expect(route.name).toBe('search')
    expect(route.query).toEqual({ q: 'binary search', level: 'core,pro', link: 'article' })
    expect(route.path).toBe(path)
    expect(parseRoute('#/topic/arrays?tab=practice')).toMatchObject({
      name: 'topic',
      param: 'arrays',
      query: { tab: 'practice' },
      path: '#/topic/arrays?tab=practice',
    })
  })

  it('canonicalises Today to `#/` and encodes topic ids', () => {
    expect(buildPath('today')).toBe('#/')
    expect(buildPath('topic', 'arrays')).toBe('#/topic/arrays')
    expect(buildPath('problem', 'two-sum', { t: '90', lang: 'cpp' })).toBe('#/problem/two-sum?t=90&lang=cpp')
  })
})
