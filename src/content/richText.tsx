/**
 * A tiny, safe rich-text renderer for Phase v2-03 learner content.
 *
 * The input is escaped FIRST. A whitelist of inline constructs is then parsed
 * into React elements, and plain text is decoded back to literal characters
 * just before React escapes it again as a text node. There is no
 * `dangerouslySetInnerHTML`, no raw HTML pass-through, no `<img>` support and
 * no external image fetch. Semantic elements only: p / ul / li / strong / em /
 * code / a. Links are restricted to the same HTTPS publisher hosts as
 * `resources[]`; anything else stays literal text.
 */
import type { ReactNode } from 'react'

const ALLOWED_LINK_HOSTS = new Set([
  'leetcode.com',
  'neetcode.io',
  'takeuforward.org',
  'www.takeuforward.org',
  'www.geeksforgeeks.org',
  'www.programiz.com',
  'cp-algorithms.com',
  'usaco.guide',
  'en.cppreference.com',
  'docs.python.org',
  'developer.mozilla.org',
  'roadmap.sh',
])

const TOKEN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\(https:\/\/[^\s)]+\))/g

/** Escape untrusted authored text before any token is considered. */
export function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Restore literal characters for React text nodes (React performs the final escape). */
function literal(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

function safeHref(value: string): string | null {
  const url = literal(value)
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && ALLOWED_LINK_HOSTS.has(parsed.hostname) ? url : null
  } catch {
    return null
  }
}

function inline(escaped: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let cursor = 0
  let index = 0
  for (const match of escaped.matchAll(TOKEN)) {
    const start = match.index ?? 0
    if (start > cursor) nodes.push(literal(escaped.slice(cursor, start)))
    const token = match[0]
    const key = `${keyPrefix}-${index++}`
    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{literal(token.slice(2, -2))}</strong>)
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{literal(token.slice(1, -1))}</em>)
    } else if (token.startsWith('`')) {
      nodes.push(<code key={key}>{literal(token.slice(1, -1))}</code>)
    } else {
      const link = /^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/.exec(token)
      const href = link ? safeHref(link[2]) : null
      nodes.push(
        href ? (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {literal(link?.[1] ?? token)}
          </a>
        ) : (
          literal(token)
        ),
      )
    }
    cursor = start + token.length
  }
  if (cursor < escaped.length) nodes.push(literal(escaped.slice(cursor)))
  return nodes
}

export function RichText({
  text,
  className,
  testId,
  inline: asInline = false,
}: {
  text: string
  className?: string
  testId?: string
  inline?: boolean
}) {
  // Escape the whole document once, then parse semantic constructs. A raw
  // `<script>` or `<img ...>` survives as visible text, never as an element.
  const escaped = escapeText(text)
  if (asInline) {
    return (
      <span className={className} data-testid={testId}>
        {inline(escaped.replace(/\n+/g, ' '), 'in')}
      </span>
    )
  }
  const lines = escaped.split('\n')
  const blocks: ReactNode[] = []
  let bullets: string[] = []
  const flushBullets = () => {
    if (bullets.length === 0) return
    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {bullets.map((item, index) => (
          <li key={index}>{inline(item, `li-${blocks.length}-${index}`)}</li>
        ))}
      </ul>,
    )
    bullets = []
  }
  for (const [index, line] of lines.entries()) {
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2))
      continue
    }
    flushBullets()
    if (line.trim() === '') continue
    blocks.push(<p key={`p-${index}`}>{inline(line, `p-${index}`)}</p>)
  }
  flushBullets()
  return (
    <div className={className} data-testid={testId}>
      {blocks}
    </div>
  )
}
