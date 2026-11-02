/**
 * Tiny, safe markdown renderer for the phase-3 note preview (roadmap 3.1).
 *
 * The owner's notes are their own writing, but they are still untrusted input
 * for a browser, so every character is HTML-escaped first and only a small,
 * deliberately boring subset is re-introduced: fenced code, `#`-headings,
 * bullet lists, inline code, bold, italic and http(s) links. Raw HTML never
 * passes through, and non-http(s) link targets stay plain text. No dependency
 * is added for this (`DECISIONS.md`).
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character)
}

function inline(raw: string): string {
  const codeSpans: string[] = []
  let text = escapeHtml(raw).replace(/`([^`]+)`/g, (_match, code: string) => {
    codeSpans.push(code)
    return `\u0000${codeSpans.length - 1}\u0000`
  })
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, label: string, url: string) =>
      `<a href="${url.replace(/"/g, '%22')}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  )
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  text = text.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => {
    const code = codeSpans[Number(index)] ?? ''
    return `<code>${code}</code>`
  })
  return text
}

/** Plain-text preview of a note for the overview card (no HTML at all). */
export function plainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/[`*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function excerpt(source: string, limit = 180): string {
  const text = plainText(source)
  if (text.length <= limit) return text
  return `${text.slice(0, limit).trimEnd()}…`
}

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let paragraph: string[] = []
  let items: string[] = []
  let code: string[] | null = null

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    html.push(`<p>${inline(paragraph.join(' '))}</p>`)
    paragraph = []
  }
  const flushList = () => {
    if (items.length === 0) return
    html.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`)
    items = []
  }
  const flushCode = (body: string[]) => {
    html.push(`<pre class="md-code"><code>${escapeHtml(body.join('\n'))}</code></pre>`)
  }

  for (const line of lines) {
    if (code !== null) {
      if (line.trim().startsWith('```')) {
        flushCode(code)
        code = null
      } else {
        code.push(line)
      }
      continue
    }
    if (line.trim().startsWith('```')) {
      flushParagraph()
      flushList()
      code = []
      continue
    }
    const trimmed = line.trim()
    if (trimmed === '') {
      flushParagraph()
      flushList()
      continue
    }
    const heading = /^#{1,3}\s+(.*)$/.exec(trimmed)
    if (heading) {
      flushParagraph()
      flushList()
      // A styled paragraph, not a real heading: note previews sit inside a page
      // whose heading order must stay valid for the CI axe audit.
      html.push(`<p class="md-heading">${inline(heading[1])}</p>`)
      continue
    }
    const bullet = /^[-*]\s+(.*)$/.exec(trimmed)
    if (bullet) {
      flushParagraph()
      items.push(bullet[1])
      continue
    }
    flushList()
    paragraph.push(trimmed)
  }

  if (code !== null) flushCode(code)
  flushParagraph()
  flushList()
  return html.join('')
}
