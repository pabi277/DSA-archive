/**
 * jsdom mount of the real sheet. Playwright's Chromium cannot be downloaded in
 * this sandbox, so these tests mirror `e2e/sheet.spec.ts` assertion-for-
 * assertion: they are the local proof that the browser checks in CI will pass.
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { catalogue } from './catalogue'
import { resetProgressStoreForTests, tallyTopic } from './progress'
import { resetSettingsStoreForTests } from './settings'
import { LINK_FILTERS, LINK_LABELS, type LinkFilter } from './sheet'

const arrays = catalogue.topics.find((topic) => topic.id === 'arrays')!
const twoSum = arrays.subtopics
  .flatMap((subtopic) => subtopic.problems)
  .find((problem) => problem.id === 'two-sum')!

let container: HTMLDivElement
let root: Root

function q(selector: string) {
  const found = container.querySelector(selector)
  if (!found) throw new Error(`missing element: ${selector}`)
  return found as HTMLElement
}

function qa(selector: string) {
  return [...container.querySelectorAll(selector)] as HTMLElement[]
}

function click(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function typeSearch(value: string) {
  const input = q('input[aria-label="Search problems"]') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function matchCount() {
  return q('[data-testid="match-count"]').textContent ?? ''
}

beforeEach(() => {
  localStorage.clear()
  resetProgressStoreForTests()
  resetSettingsStoreForTests()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<App />)
  })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

describe('the whole sheet is browsable signed out (1.1)', () => {
  it('renders the approved chrome, landmarks and every topic collapsed', () => {
    expect(q('h1').textContent).toBe('Your learning sheet')
    expect(q('.page-subtitle').textContent).toContain('495 problems · 20 topics')
    expect(q('.skip-link').getAttribute('href')).toBe('#sheet-content')
    expect(q('header.topbar')).toBeTruthy()
    expect(q('main#sheet-content')).toBeTruthy()
    expect(q('footer.app-footer')).toBeTruthy()
    expect(qa('aside')).toHaveLength(2)

    const topics = qa('details.topic-card')
    expect(topics).toHaveLength(20)
    expect(topics.every((topic) => !topic.hasAttribute('open'))).toBe(true)
    expect(q('[data-testid="topic-count-arrays"]').textContent).toBe(
      `0/${tallyTopic({}, arrays).total}`,
    )
    expect(matchCount()).toContain('Showing 495 of 495 problems across 20 of 20 topics')
    expect(q('[data-testid="progress-pill"]').textContent).toBe('0/495 done')
  })

  it('shows the phase-2 sign-in flow and a truthful local-only sync state', () => {
    expect(q('[data-testid="sign-in-banner"]').textContent).toContain('Sign in to save progress')
    expect(q('[data-testid="sync-pill"]').textContent).toContain('Local only')
    expect(container.querySelector('[data-testid="account-panel"]')).toBeNull()
    // With no live web config, the real button gives an actionable owner-setup
    // error rather than pretending to sign in.
    click(q('[data-testid="sign-in-banner"] .button-primary'))
    expect(q('[data-testid="account-error"]').textContent).toContain('Cloud sign-in is not configured')
  })

  it('renders subtopic headings and rows when a topic is opened', () => {
    const summary = q('#topic-arrays summary')
    act(() => {
      // jsdom does not implement the summary click-to-toggle behaviour, so set
      // `open` the way the browser would and let React's onToggle handler run.
      ;(q('#topic-arrays') as HTMLDetailsElement).open = true
      summary.dispatchEvent(new Event('toggle', { bubbles: false }))
    })
    expect(q('#topic-arrays').hasAttribute('open')).toBe(true)
    expect(qa('#topic-arrays .subtopic-title').length).toBe(arrays.subtopics.length)
    expect(qa('#topic-arrays .problem-row').length).toBe(tallyTopic({}, arrays).total)
    expect(q('#problem-two-sum .problem-title').textContent).toBe('Two Sum')
    // Pinned from data/problems.json, not from the DATA-MODEL sketch (which
    // shows "core" as an illustrative example): this row is really "basic".
    expect(twoSum.level).toBe('basic')
    expect(q('#problem-two-sum .level-badge').textContent).toBe('Basic')
  })

  it('shows an Ungraded badge rather than inventing a level for unbadged rows', () => {
    const ungraded = catalogue.topics
      .flatMap((topic) => topic.subtopics.flatMap((subtopic) => subtopic.problems))
      .find((problem) => problem.level === null)!
    expect(q(`#problem-${ungraded.id} .level-badge`).textContent).toBe('Ungraded')
  })
})

describe('outbound row actions (1.3)', () => {
  it('renders exactly the links the row has, opening safely in a new tab', () => {
    const anchors = qa('#problem-two-sum .row-actions a')
    const expected = Object.keys(twoSum.links).length
    expect(anchors).toHaveLength(expected)
    expect(expected).toBeGreaterThan(0)
    for (const anchor of anchors) {
      expect(anchor.getAttribute('target')).toBe('_blank')
      expect(anchor.getAttribute('rel')).toContain('noopener')
      expect(anchor.getAttribute('href')).toMatch(/^https:\/\//)
    }
    expect(qa('#problem-two-sum .row-actions a').map((anchor) => anchor.textContent)).toEqual(
      LINK_FILTERS.filter((linkType) => Boolean(twoSum.links[linkType as LinkFilter])).map(
        (linkType) => LINK_LABELS[linkType as LinkFilter],
      ),
    )
    expect(q('#problem-two-sum .row-links').getAttribute('aria-label')).toBe(
      'Outbound links for Two Sum',
    )
  })

  it('renders no link group for a row that has no outbound links', () => {
    const withoutLinks = catalogue.topics
      .flatMap((topic) => topic.subtopics.flatMap((subtopic) => subtopic.problems))
      .find((problem) => Object.keys(problem.links).length === 0)!
    expect(container.querySelector(`#problem-${withoutLinks.id} .row-actions`)).toBeNull()
  })
})

describe('search and filters (1.2)', () => {
  it('narrows instantly as the user types and expands the matching topics', () => {
    typeSearch('two sum')
    expect(matchCount()).toContain('of 495 problems')
    expect(matchCount()).not.toContain('Showing 495 of')
    const open = qa('details.topic-card[open]')
    expect(open.length).toBeGreaterThan(0)
    expect(qa('#topic-arrays .problem-row').length).toBeGreaterThan(0)
    expect(q('input[aria-label="Search problems"]').getAttribute('aria-label')).toBe('Search problems')
  })

  it('clears the search from inside the field', () => {
    typeSearch('two sum')
    click(q('button[aria-label="Clear search"]'))
    expect(matchCount()).toContain('Showing 495 of 495')
  })

  it('offers an empty state with a working clear action when nothing matches', () => {
    typeSearch('zzzz-no-match')
    expect(q('.empty-state h2').textContent).toBe('No matching problems')
    expect(q('.empty-state p').textContent).toContain('zzzz-no-match')
    expect(qa('details.topic-card')).toHaveLength(0)
    click(q('.empty-state button'))
    expect(matchCount()).toContain('Showing 495 of 495')
    expect(qa('details.topic-card')).toHaveLength(20)
  })

  it('filters by level and by link type, and reports the filter count', () => {
    click(qa('.chip').find((chip) => chip.textContent === 'Basic')!)
    expect(matchCount()).toContain('Showing 84 of 495')
    expect(matchCount()).toContain('1 filter on')
    expect(qa('.chip').find((chip) => chip.textContent === 'Basic')!.getAttribute('aria-pressed')).toBe('true')

    click(qa('.chip').find((chip) => chip.textContent === 'Basic')!)
    expect(matchCount()).toContain('Showing 495 of 495')

    click(qa('.chip').find((chip) => chip.textContent === 'LeetCode')!)
    expect(matchCount()).toContain('Showing 289 of 495')
  })

  it('filters by topic from the select', () => {
    const select = q('select[aria-label="Filter by topic"]') as HTMLSelectElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set
    act(() => {
      setter?.call(select, 'arrays')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(qa('details.topic-card')).toHaveLength(1)
    expect(matchCount()).toContain(`Showing ${tallyTopic({}, arrays).total} of 495`)
  })

  it('picks a random visible row and reveals it', () => {
    click(q('[data-testid="random-pick"]'))
    const notice = q('[data-testid="random-notice"]')
    expect(notice.textContent).toContain('Random pick ·')
    expect(qa('.problem-row.is-revealed')).toHaveLength(1)
    expect(qa('details.topic-card[open]').length).toBeGreaterThan(0)
    click(qa('.notice button').find((button) => button.textContent === 'Dismiss')!)
    expect(container.querySelector('[data-testid="random-notice"]')).toBeNull()
    expect(qa('.problem-row.is-revealed')).toHaveLength(0)
  })

  it('picks only from the filtered set', () => {
    click(qa('.chip').find((chip) => chip.textContent === 'Ungraded')!)
    click(q('[data-testid="random-pick"]'))
    const revealed = q('.problem-row.is-revealed')
    expect(revealed.querySelector('.level-badge')?.textContent).toBe('Ungraded')
  })
})

describe('local progress and the weakest-topic hint', () => {
  it('starts with no hint rather than guessing', () => {
    expect(q('[data-testid="weakest-topic"]').textContent).toContain('Mark a few problems done')
    expect(q('[data-testid="weakest-topic"]').textContent).not.toContain('Open topic')
  })

  it('marks a row done, updates the pill, and then names the weakest topic', () => {
    click(q('#problem-two-sum .status-check'))
    expect(q('#problem-two-sum .status-check').getAttribute('aria-pressed')).toBe('true')
    expect(q('[data-testid="progress-pill"]').textContent).toBe('1/495 done')
    const hint = q('[data-testid="weakest-topic"]')
    expect(hint.textContent).toContain('Arrays')
    expect(hint.textContent).toContain('1/')
    expect(hint.textContent).toContain('Open topic')

    click(q('#problem-two-sum .status-check'))
    expect(q('[data-testid="progress-pill"]').textContent).toBe('0/495 done')
    expect(q('[data-testid="weakest-topic"]').textContent).toContain('Mark a few problems done')
  })

  it('bookmarks a row and clears local progress on request', () => {
    click(q('#problem-two-sum .bookmark-button'))
    expect(q('#problem-two-sum .bookmark-button').getAttribute('aria-pressed')).toBe('true')
    expect(q('#problem-two-sum .bookmark-button').textContent).toBe('★')
    expect(q('.context-stat strong').textContent).toBe('0')

    click(qa('.text-button').find((button) => button.textContent === 'Clear local progress')!)
    expect(q('#problem-two-sum .bookmark-button').getAttribute('aria-pressed')).toBe('false')
    expect(container.querySelector('.text-button')).toBeNull()
  })

  it('hides done rows when the hide-done chip is on', () => {
    click(q('#problem-two-sum .status-check'))
    click(qa('.chip').find((chip) => chip.textContent === 'Hide done')!)
    expect(matchCount()).toContain('Showing 494 of 495')
    expect(container.querySelector('#problem-two-sum')).toBeNull()
    click(qa('.chip').find((chip) => chip.textContent === 'Hide done')!)
    expect(matchCount()).toContain('Showing 495 of 495')
  })

  it('jumps to the hinted topic and clears the query', () => {
    typeSearch('two sum')
    click(q('#problem-two-sum .status-check'))
    click(qa('[data-testid="weakest-topic"] .text-button')[0])
    expect((q('select[aria-label="Filter by topic"]') as HTMLSelectElement).value).toBe('')
    expect(qa('details.topic-card')).toHaveLength(20)
    expect(q('#topic-arrays').hasAttribute('open')).toBe(true)
  })
})

describe('approved 0-D variants (dark/light, large text)', () => {
  it('defaults to dark and switches appearance and text size', () => {
    const appRoot = q('.app-root')
    expect(appRoot.getAttribute('data-theme')).toBe('dark')
    expect(appRoot.className).not.toContain('large-text')

    click(q('button[aria-label="Switch to light appearance"]'))
    expect(q('.app-root').getAttribute('data-theme')).toBe('light')
    expect(q('button[aria-label="Switch to dark appearance"]')).toBeTruthy()

    click(q('button[aria-label="Toggle large text"]'))
    expect(q('.app-root').className).toContain('large-text')
    expect(q('button[aria-label="Toggle large text"]').getAttribute('aria-pressed')).toBe('true')
  })
})

describe('phase-3 views and row actions while signed out (3.1–3.3)', () => {
  it('switches between the sheet, notes and lists views', () => {
    expect(q('[data-testid="view-tab-sheet"]').getAttribute('aria-pressed')).toBe('true')

    click(q('[data-testid="view-tab-notes"]'))
    expect(q('[data-testid="view-tab-notes"]').getAttribute('aria-pressed')).toBe('true')
    expect(q('[data-testid="notes-view"]').textContent).toContain('Notes need an account')
    expect(q('[data-testid="notes-view"]').textContent).toContain('JSON backup')

    click(q('[data-testid="view-tab-lists"]'))
    expect(q('[data-testid="lists-view"]').textContent).toContain('Lists need an account')
    expect(container.querySelector('[data-testid="create-list"]')).toBeNull()

    click(q('[data-testid="view-tab-sheet"]'))
    expect(qa('details.topic-card')).toHaveLength(20)
    expect(q('[data-testid="match-count"]').textContent).toContain('Showing 495 of 495')
  })

  it('hides the note and list row actions until an account is present', () => {
    expect(container.querySelector('[data-testid="note-button-two-sum"]')).toBeNull()
    expect(container.querySelector('[data-testid="list-button-two-sum"]')).toBeNull()
    // Outbound links stay available signed out: the sheet is browsable.
    expect(qa('#problem-two-sum .row-links a').length).toBeGreaterThan(0)
  })
})

describe('phase-4 views while signed out (4.1–4.3)', () => {
  it('offers Today, Revision and Stats tabs and explains the account requirement', () => {
    expect(q('[data-testid="view-tab-sheet"]').getAttribute('aria-pressed')).toBe('true')
    expect(qa('.view-tabs button')).toHaveLength(6)
    expect(q('[data-testid="view-tab-today"]').textContent).toContain('0/5')
    expect(q('[data-testid="view-tab-revision"]').textContent).toContain('0')

    click(q('[data-testid="view-tab-today"]'))
    expect(q('[data-testid="view-tab-today"]').getAttribute('aria-pressed')).toBe('true')
    expect(q('[data-testid="today-view"]').textContent).toContain('Today needs an account')
    // No dead controls: the goal field only exists for a signed-in account.
    expect(container.querySelector('[data-testid="goal-input"]')).toBeNull()
    expect(container.querySelector('[data-testid="today-suggest"]')).toBeNull()

    click(q('[data-testid="view-tab-revision"]'))
    expect(q('[data-testid="revision-view"]').textContent).toContain('Revision needs an account')

    click(q('[data-testid="view-tab-stats"]'))
    expect(q('[data-testid="stats-view"]').textContent).toContain('Stats need an account')
    expect(container.querySelector('[data-testid="heatmap"]')).toBeNull()

    click(q('[data-testid="view-tab-sheet"]'))
    expect(qa('details.topic-card')).toHaveLength(20)
    expect(q('[data-testid="match-count"]').textContent).toContain('Showing 495 of 495')
  })

  it('keeps the planner summary quiet until an account is present', () => {
    expect(container.querySelector('[data-testid="planner-summary"]')).toBeNull()
    expect(container.querySelector('[data-testid="summary-streak"]')).toBeNull()
  })
})
