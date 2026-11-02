import { describe, expect, it } from 'vitest'
import { escapeHtml, excerpt, plainText, renderMarkdown } from './markdown'

describe('safe markdown preview (3.1)', () => {
  it('escapes raw HTML and script tags', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
    const html = renderMarkdown('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('renders bold, italic and inline code', () => {
    expect(renderMarkdown('Use a **hash map** and *two pointers* with `Map`'))
      .toBe('<p>Use a <strong>hash map</strong> and <em>two pointers</em> with <code>Map</code></p>')
  })

  it('keeps markdown inside code spans literal', () => {
    const html = renderMarkdown('`**not bold**`')
    expect(html).toBe('<p><code>**not bold**</code></p>')
  })

  it('renders fenced code blocks escaped and unharmed', () => {
    const html = renderMarkdown('```\nif (a < b) { return "<x>" }\nline 2\n```')
    expect(html).toContain('<pre class="md-code"><code>')
    expect(html).toContain('if (a &lt; b) { return &quot;&lt;x&gt;&quot; }')
    expect(html).toContain('line 2')
    expect(html).not.toContain('<x>')
  })

  it('styles headings as paragraphs so the page heading order stays valid', () => {
    const html = renderMarkdown('# Title\n## Smaller')
    expect(html).toContain('<p class="md-heading">Title</p>')
    expect(html).toContain('<p class="md-heading">Smaller</p>')
    expect(html).not.toMatch(/<h[1-6]/)
  })

  it('renders bullet lists', () => {
    expect(renderMarkdown('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>')
  })

  it('links only http(s) URLs and keeps them safe to open', () => {
    const html = renderMarkdown('[LeetCode](https://leetcode.com/problems/two-sum/)')
    expect(html).toContain('href="https://leetcode.com/problems/two-sum/"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')

    const unsafe = renderMarkdown('[click](javascript:alert(1))')
    expect(unsafe).not.toContain('<a')
    expect(unsafe).toContain('[click](javascript:alert(1))')
  })

  it('strips markup for overview excerpts', () => {
    expect(plainText('# Title\n- **bold** `code` [link](https://x.test)')).toBe('Title bold code link')
    expect(excerpt('a'.repeat(20), 10)).toBe('aaaaaaaaaa…')
    expect(excerpt('short')).toBe('short')
  })
})
