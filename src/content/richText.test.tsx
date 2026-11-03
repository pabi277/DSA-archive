import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { escapeText, RichText } from './richText'

describe('safe rich text', () => {
  it('escapes first: raw HTML and external images never become elements', () => {
    const source = '<script>alert(1)</script> <img src=x onerror=alert(2)> **bold**'
    const markup = renderToStaticMarkup(<RichText text={source} />)
    expect(escapeText('<script>')).toBe('&lt;script&gt;')
    expect(markup).not.toContain('<script')
    expect(markup).not.toContain('<img')
    expect(markup).toContain('&lt;script&gt;')
    expect(markup).toContain('&lt;img')
    expect(markup).toContain('<strong>bold</strong>')
    expect(markup).not.toContain('dangerouslySetInnerHTML')
  })

  it('whitelists semantic inline constructs and bullets', () => {
    const markup = renderToStaticMarkup(<RichText text={'- first\n- second\n\nUse `seen` and *one pass*.'} />)
    expect(markup).toContain('<ul>')
    expect(markup).toContain('<li>first</li>')
    expect(markup).toContain('<code>seen</code>')
    expect(markup).toContain('<em>one pass</em>')
    expect(markup).toContain('<p>')
  })

  it('allows only HTTPS publisher links and keeps everything else literal', () => {
    const allowed = renderToStaticMarkup(<RichText text="[LeetCode](https://leetcode.com/problems/two-sum/)" />)
    expect(allowed).toContain('href="https://leetcode.com/problems/two-sum/"')
    expect(allowed).toContain('rel="noopener noreferrer"')
    const denied = renderToStaticMarkup(<RichText text="[bad](https://evil.example/x)" />)
    expect(denied).not.toContain('<a ')
    expect(denied).toContain('evil.example')
  })
})
