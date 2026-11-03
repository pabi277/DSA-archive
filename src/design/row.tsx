/**
 * A raw row of the sheet, in the v2 anatomy (§3.6):
 *
 *   status edge-mark · title · mono index/`#LC` · level bar + label · age `12d`
 *   · hover/focus cluster `✓ ⏱ ★ ↗ ⋯`
 *
 * Only 3 of those 8 v1 controls are in the resting tab order: the done check,
 * the star and the `⋯` menu. Links live in `↗ Solve` and `⋯` (v1 rendered one
 * visible link button per link type on every row). Everything the v1 row could
 * do is still reachable, just not all at once, and every control keeps a text
 * label or an `aria-label` with the problem title in it.
 *
 * `tabIndex` is managed by the owning list so `j`/`k` can move a single roving
 * focus without putting 500 rows in the tab order.
 */
import type { ReactNode } from 'react'
import type { Problem } from '../catalogue'
import { LEVEL_LABELS, levelOf, type LinkFilter } from '../sheet'
import { isBookmarked, isDone, type Outcome, type ProgressByTopic } from '../progress'
import { IconCheck, IconClock, IconExternal, IconMore, IconStar, IconStarFilled } from './icons'
import { Menu, MenuItem, Tag } from './primitives'

export const LINK_LABELS_FOR_ROW: Record<LinkFilter, string> = {
  practice: 'Practice',
  article: 'Read',
  video: 'Watch',
  leetcode: 'LeetCode',
}

/** Days since a row was last touched, from the rich planner entry. */
export function ageLabel(lastTouched: string | null | undefined, today: string): string | null {
  if (!lastTouched) return null
  const from = Date.parse(`${lastTouched}T00:00:00Z`)
  const to = Date.parse(`${today}T00:00:00Z`)
  if (Number.isNaN(from) || Number.isNaN(to)) return null
  const days = Math.round((to - from) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1d'
  if (days < 100) return `${days}d`
  return `${Math.round(days / 30)}mo`
}

export function linkEntries(problem: Problem) {
  return (['practice', 'article', 'video', 'leetcode'] as LinkFilter[])
    .map((linkType) => ({ linkType, href: problem.links[linkType] }))
    .filter((entry): entry is { linkType: LinkFilter; href: string } => Boolean(entry.href))
}

export function LeetCodeBadge({ problem }: { problem: Problem }) {
  const href = problem.links.leetcode
  const match = href?.match(/leetcode\.com\/problems\/([a-z0-9-]+)/)
  if (!match) return null
  return <span className="row-slug num">#{match[1]}</span>
}

export function ProblemRow({ topicId, topicTitle, problem, progress, disabled, revealed, focused, age, canEditNotes, hasNote, listCount, onToggleStatus, onToggleBookmark, onSetOutcome, onOpen, onOpenPanel, onPlan, onFocus, listPosition, listSize, panel }: {
  topicId: string
  topicTitle: string
  problem: Problem
  progress: ProgressByTopic
  disabled: boolean
  revealed: boolean
  focused: boolean
  age: string | null
  canEditNotes: boolean
  hasNote: boolean
  listCount: number
  onToggleStatus: (topicId: string, problemId: string) => void
  onToggleBookmark: (topicId: string, problemId: string) => void
  onSetOutcome: (topicId: string, problemId: string, outcome: Outcome) => void
  onOpen: (problemId: string, mode: 'problem' | 'sheet') => void
  onOpenPanel: (problemId: string, kind: 'note' | 'lists') => void
  onPlan: (problemId: string) => void
  onFocus: (problemId: string) => void
  listPosition?: number
  listSize?: number
  panel: ReactNode
}) {
  const done = isDone(progress, topicId, problem.id)
  const bookmarked = isBookmarked(progress, topicId, problem.id)
  const outcome = progress[topicId]?.[problem.id]?.o ?? 'clean'
  const level = levelOf(problem)
  const links = linkEntries(problem)
  const primaryLink = links.find((entry) => entry.linkType === 'practice') ?? links[0]

  return (
    <div
      className={[
        'row',
        done && 'is-done',
        revealed && 'is-revealed',
        focused && 'is-focused',
      ]
        .filter(Boolean)
        .join(' ')}
      id={`problem-${problem.id}`}
      data-problem-id={problem.id}
      data-testid={`row-${problem.id}`}
      role={listPosition ? 'listitem' : undefined}
      aria-posinset={listPosition}
      aria-setsize={listSize}
      tabIndex={focused ? 0 : -1}
      aria-labelledby={`row-title-${problem.id}`}
      onFocus={() => onFocus(problem.id)}
    >
      <button
        type="button"
        className="row-status"
        disabled={disabled}
        aria-pressed={done}
        aria-label={`Mark ${problem.title} ${done ? 'to do' : 'done'}`}
        data-testid={`status-${problem.id}`}
        onClick={(event) => {
          event.stopPropagation()
          onToggleStatus(topicId, problem.id)
        }}
      >
        {done ? <IconCheck size={14} /> : null}
      </button>

      <div className="row-main">
        <span className="row-title" id={`row-title-${problem.id}`}>
          {problem.title}
        </span>
        <span className="row-meta">
          <span className="row-kind">{problem.kind === 'theory' ? 'Theory' : 'Problem'}</span>
          <span className="row-topic-label">{topicTitle}</span>
          <LeetCodeBadge problem={problem} />
          {age ? <span className="row-age num">{age}</span> : null}
        </span>
      </div>

      <span className={`level level-${level}`} data-testid={`level-${problem.id}`}>
        <span className="level-bar" aria-hidden="true" />
        {LEVEL_LABELS[level]}
      </span>

      <div className="row-cluster">
        <button
          type="button"
          className="row-tool row-star"
          disabled={disabled}
          aria-pressed={bookmarked}
          aria-label={`${bookmarked ? 'Remove bookmark from' : 'Bookmark'} ${problem.title}`}
          data-testid={`star-${problem.id}`}
          onClick={(event) => {
            event.stopPropagation()
            onToggleBookmark(topicId, problem.id)
          }}
        >
          {bookmarked ? <IconStarFilled size={15} /> : <IconStar size={15} />}
        </button>

        {problem.kind === 'theory' ? (
          <button
            type="button"
            className="row-tool row-check"
            aria-label={`Check your understanding of ${problem.title}`}
            data-testid={`check-${problem.id}`}
            onClick={(event) => {
              event.stopPropagation()
              onOpen(problem.id, 'problem')
            }}
          >
            Check
          </button>
        ) : (
          <button
            type="button"
            className="row-tool row-action"
            aria-label={`Solve ${problem.title}`}
            data-testid={`open-${problem.id}`}
            onClick={(event) => {
              event.stopPropagation()
              onOpen(problem.id, 'problem')
            }}
          >
            Solve
          </button>
        )}

        <button
          type="button"
          className="row-tool row-clock"
          disabled={disabled}
          aria-label={`Add ${problem.title} to Today`}
          data-testid={`today-add-${problem.id}`}
          onClick={(event) => {
            event.stopPropagation()
            onPlan(problem.id)
          }}
        >
          <IconClock size={15} />
        </button>

        {primaryLink ? (
          <a
            className="row-tool row-link"
            href={primaryLink.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${LINK_LABELS_FOR_ROW[primaryLink.linkType]} for ${problem.title} in a new tab`}
            data-testid={`link-${problem.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <IconExternal size={15} />
          </a>
        ) : null}

        <Menu label={`More actions for ${problem.title}`} trigger={<IconMore size={16} />}>
          {links.map((entry) => (
            <MenuItem key={entry.linkType} href={entry.href} testId={`menu-link-${entry.linkType}-${problem.id}`}>
              {LINK_LABELS_FOR_ROW[entry.linkType]} · {problem.title}
            </MenuItem>
          ))}
          {canEditNotes ? (
            <>
              <MenuItem onClick={() => onOpenPanel(problem.id, 'note')} testId={`menu-note-${problem.id}`}>
                {hasNote ? 'Edit note ✓' : 'Add note'}
              </MenuItem>
              <MenuItem onClick={() => onOpenPanel(problem.id, 'lists')} testId={`menu-lists-${problem.id}`}>
                Lists{listCount > 0 ? ` · ${listCount}` : ''}
              </MenuItem>
            </>
          ) : null}
          <MenuItem onClick={() => onOpen(problem.id, 'sheet')} testId={`menu-sheet-${problem.id}`}>
            Show in sheet
          </MenuItem>
        </Menu>
      </div>

      {done ? (
        <div className="row-outcome-control" role="group" aria-label={`${problem.title} result`}>
          {([
            ['clean', 'Clean'],
            ['hint', 'Hint'],
            ['couldnt', "Couldn't"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="row-outcome-option"
              disabled={disabled}
              aria-pressed={outcome === value}
              data-testid={`outcome-${problem.id}-${value}`}
              onClick={() => onSetOutcome(topicId, problem.id, value)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {problem.kind === 'theory' ? <Tag tone="info" className="row-tag">Theory</Tag> : null}
      {panel ? <div className="row-panel">{panel}</div> : null}
    </div>
  )
}

/** Level bar colour is chart-only; the text label is what carries meaning. */
export const LEVEL_ORDER = ['basic', 'core', 'pro', 'ungraded'] as const
