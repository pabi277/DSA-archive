/**
 * `#/code` — every saved solution in one place (phase v2-04).
 *
 * Search matches the problem title, the code text and the plain-text
 * reminder; language/topic filters live in the URL, newest first,
 * (`?q=&lang=&topic=`) so the screen is bookmarkable and the back
 * button restores it, like every other v2 route. Rows use CSS
 * `content-visibility`, so even all 631 possible solutions stay cheap.
 */
import { useState } from 'react'
import { catalogue } from '../catalogue'
import { locateProblem } from '../library'
import { buildPath, navigate } from '../app/router'
import { Button, Empty, Tag } from '../design/primitives'
import { IconCode } from '../design/icons'
import {
  languageChip,
  LANGUAGE_LABELS,
  filterSnippets,
  isCodeLanguage,
  updatedAgeLabel,
  type CodeLanguage,
  type SnippetsById,
} from './codeStore'
import { copyText } from './editor'

const MARK = <IconCode size={20} />

export function CodeScreen({
  signedIn,
  ready,
  snippets,
  query,
  onOpenProblem,
}: {
  signedIn: boolean
  ready: boolean
  snippets: SnippetsById
  query: Record<string, string>
  onOpenProblem: (problemId: string) => void
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (!signedIn) {
    return (
      <div className="code-screen" data-testid="code-view">
        <Empty
          title="Sign in to keep your code"
          mark={MARK}
          testId="code-signed-out"
          action={
            <a className="btn btn-primary" href={buildPath('topics')}>
              Browse topics
            </a>
          }
        >
          Sign in and one solution per problem follows you everywhere, offline included.
        </Empty>
      </div>
    )
  }

  const total = Object.keys(snippets).length
  const language: CodeLanguage | '' = isCodeLanguage(query.lang) ? query.lang : ''
  const topicId = catalogue.topics.some((topic) => topic.id === query.topic) ? query.topic : ''
  const text = query.q ?? ''
  const results = filterSnippets(snippets, { query: text, language, topicId })

  const setQuery = (next: Partial<{ q: string; lang: string; topic: string }>) => {
    navigate('code', '', { q: text, lang: language, topic: topicId, ...next }, true)
  }

  const copy = async (problemId: string, code: string) => {
    const ok = await copyText(code)
    setCopiedId(ok ? problemId : null)
    window.setTimeout(() => setCopiedId(null), 2500)
  }

  return (
    <section className="code-screen" data-testid="code-view">
      <p className="quiet-note" data-testid="code-count">
        {total} saved · {results.length}{' '}
        shown
      </p>

      {!ready ? (
        <p className="quiet-note" role="status">Loading your saved code…</p>
      ) : total === 0 ? (
        <Empty
          title="No saved solutions yet"
          mark={MARK}
          testId="code-empty"
          action={
            <a className="btn btn-primary" href={buildPath('topics')}>
              Browse topics
            </a>
          }
        >
          Save a solution from any problem's Code panel. Peek only after you attempt it again.
        </Empty>
      ) : (
        <>
          <div className="code-toolbar">
            <div className="search-field">
              <input
                type="search"
                value={text}
                aria-label="Search saved code"
                placeholder="Search by problem, code or reminder"
                data-testid="code-search"
                onChange={(event) => setQuery({ q: event.target.value })}
              />
            </div>
            <label className="select-wrap">
              <span className="visually-hidden">Filter by language</span>
              <select
                className="select-field"
                data-testid="code-lang-filter"
                value={language}
                onChange={(event) => setQuery({ lang: event.target.value })}
              >
                <option value="">All languages</option>
                {Object.keys(LANGUAGE_LABELS).map((entry) => (
                  <option key={entry} value={entry}>
                    {LANGUAGE_LABELS[entry as CodeLanguage]}
                  </option>
                ))}
              </select>
            </label>
            <label className="select-wrap">
              <span className="visually-hidden">Filter by topic</span>
              <select
                className="select-field"
                data-testid="code-topic-filter"
                value={topicId}
                onChange={(event) => setQuery({ topic: event.target.value })}
              >
                <option value="">All topics</option>
                {catalogue.topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {results.length === 0 ? (
            <Empty
              title="No solutions match"
              mark="—"
              testId="code-no-results"
              action={
                <Button variant="primary" onClick={() => navigate('code', '', {}, true)}>
                  Clear search and filters
                </Button>
              }
            >
              Nothing in your {total} saved solution{total === 1 ? '' : 's'} matches that
              search and those filters.
            </Empty>
          ) : (
            <>
              <div className="code-list">
                {results.map((snippet) => {
                  const location = locateProblem(snippet.problemId)
                  const title = location?.problem.title ?? snippet.problemId
                  return (
                    <article key={snippet.problemId} className="code-row" data-testid={`code-row-${snippet.problemId}`}>
                      <div className="code-row-main">
                        <strong>{title}</strong>
                        <p className="fine-print">
                          {location?.topicTitle ?? 'Unknown topic'} · updated{' '}
                          {updatedAgeLabel(snippet.updatedAt)}
                        </p>
                        {snippet.notes.trim() !== '' ? <p className="code-reminder code-row-note">{snippet.notes}</p> : null}
                      </div>
                      <Tag tone="action">{languageChip(snippet.language)}</Tag>
                      <div className="code-row-actions">
                        <Button
                          size="sm"
                          data-testid={`code-copy-${snippet.problemId}`}
                          onClick={() => void copy(snippet.problemId, snippet.code)}
                        >
                          {copiedId === snippet.problemId ? 'Copied ✓' : 'Copy'}
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          data-testid={`code-open-${snippet.problemId}`}
                          onClick={() => onOpenProblem(snippet.problemId)}
                        >
                          Open problem
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
