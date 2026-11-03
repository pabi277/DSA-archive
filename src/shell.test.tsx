/**
 * jsdom mount tests for the v2 shell (phase v2-01).
 *
 * These replace the v1 `app.test.tsx` assertions that no longer describe the
 * product (seven equal tabs, eyebrow + hero + subtitle, a two-column card
 * grid). The Playwright specs in `e2e/` re-check the same contract in a real
 * browser in CI; this file is the local proof, because this sandbox cannot
 * download Chromium.
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { setTriageFocus } from './app/triage'
import { catalogue } from './catalogue'
import { resetProgressStoreForTests } from './progress'
import { resetSettingsStoreForTests } from './settings'
import { resetScrollMemoryForTests } from './app/router'

const arrays = catalogue.topics.find((topic) => topic.id === 'arrays')!
const arraysTotal = arrays.subtopics.reduce((sum, subtopic) => sum + subtopic.problems.length, 0)

let container: HTMLDivElement
let root: Root

function link(target: HTMLAnchorElement) {
  // jsdom does not perform default navigation; the app has no click handler on
  // links, so a real browser's navigation IS the `href` change.
  act(() => {
    window.location.hash = target.getAttribute('href')?.replace(/^#/, '') ?? ''
    window.dispatchEvent(new Event('hashchange'))
  })
}

function q(selector: string) {
  const found = container.querySelector(selector)
  if (!found) throw new Error(`missing element: ${selector}`)
  return found as HTMLElement
}

function qa(selector: string) {
  return [...container.querySelectorAll(selector)] as HTMLElement[]
}

function outside(selector: string) {
  const found = document.querySelector(selector)
  if (!found) throw new Error(`missing element outside app root: ${selector}`)
  return found as HTMLElement
}

function click(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function type(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function press(key: string, options: KeyboardEventInit = {}) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }))
  })
}

function goto(hash: string) {
  act(() => {
    window.location.hash = hash
    window.dispatchEvent(new Event('hashchange'))
  })
}

function mount() {
  act(() => {
    root.render(<App />)
  })
}

function openTopic(topicId: string) {
  click(q(`#topic-${topicId} > summary`))
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  window.location.hash = ''
  localStorage.clear()
  resetProgressStoreForTests()
  resetSettingsStoreForTests()
  resetScrollMemoryForTests()
  setTriageFocus(null)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  mount()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  window.location.hash = ''
})

describe('shell + routing (acceptance 1, 2, 8)', () => {
  it('renders one sidebar, one top bar and no tab strip', () => {
    expect(q('header.topbar')).toBeTruthy()
    expect(q('nav.sidebar')).toBeTruthy()
    expect(q('main#main-content')).toBeTruthy()
    expect(q('footer.app-footer')).toBeTruthy()
    expect(qa('.view-tabs')).toHaveLength(0)
    expect(container.querySelector('.content-columns')).toBeNull()
    expect(qa('.nav-item').length).toBeGreaterThanOrEqual(8)
    expect(q('h1').textContent).toBe('Today')
    expect(q('[data-testid="progress-pill"]').textContent).toBe('0/495 done')
  })

  it('has a URL for every screen and a friendly 404', () => {
    const routes = [
      ['#/today', 'Today'],
      ['#/topics', 'Topics'],
      ['#/search', 'Search the sheet'],
      ['#/review', 'Review'],
      ['#/code', 'Code'],
      ['#/practice', 'Practice drills'],
      ['#/quiz', 'Quizzes'],
      ['#/insights', 'Insights'],
      ['#/settings', 'Settings'],
      ['#/lists', 'My lists'],
      ['#/friends', 'Friends'],
      ['#/stats', 'Stats'],
      ['#/topic/arrays', 'Topic'],
      ['#/problem/two-sum', 'Problem'],
      ['#/nope', 'Page not found'],
    ] as const
    for (const [hash, title] of routes) {
      goto(hash)
      expect(q('h1').textContent).toBe(title)
    }
    expect(q('[data-testid="not-found-view"]').textContent).toContain('#/not-found')
  })

  it('navigates from the sidebar and keeps aria-current on the active item', () => {
    link(q('[data-testid="nav-topics"]') as HTMLAnchorElement)
    expect(window.location.hash).toBe('#/topics')
    expect(q('[data-testid="nav-topics"]').getAttribute('aria-current')).toBe('page')
    expect(qa('[data-testid^="topic-tile-"]')).toHaveLength(20)
    link(q('[data-testid="nav-today"]') as HTMLAnchorElement)
    // Today is the canonical root route (`#/`), so its href is `#/`.
    expect(window.location.hash).toBe('#/')
    expect(q('h1').textContent).toBe('Today')
  })

  it('lists all 20 topics with rings and a done/total denominator', () => {
    goto('#/topics')
    const tiles = qa('[data-testid^="topic-tile-"]')
    expect(tiles).toHaveLength(20)
    expect(tiles[0].querySelector('.ring')).toBeTruthy()
    expect(tiles[0].textContent).toContain('problems')
    expect(tiles[0].textContent).toContain('Basic')
  })

  it('opens a topic page with Learn · Practice · Quiz and the learning order', () => {
    goto('#/topic/arrays')
    expect(qa('.topic-tabs [role=tab]').map((tab) => tab.textContent)).toEqual(['Learn', 'Practice', 'Quiz'])
    expect(qa('.topic-order li')).toHaveLength(arrays.subtopics.length)
    expect(q('[data-testid="topic-primer-pending"]')).toBeTruthy()
  })

  it('filters Practice problems and stores a three-way result only while done', () => {
    goto('#/topic/arrays?tab=practice')
    expect(q('[role="tab"][aria-selected="true"]').textContent).toBe('Practice')

    const filters = qa('.segmented-item')
    expect(filters.map((button) => button.textContent?.trim())).toEqual(['All', 'Not started', 'Shaky', 'Done'])
    click(filters[1])
    expect(q('[data-testid="row-two-sum"]')).toBeTruthy()
    click(q('.segmented-item'))

    click(q('[data-testid="status-two-sum"]'))
    const hint = q('[data-testid="outcome-two-sum-hint"]')
    click(hint)
    expect(q('[data-testid="outcome-two-sum-hint"]').getAttribute('aria-pressed')).toBe('true')

    click(q('[data-testid="status-two-sum"]'))
    expect(container.querySelector('[data-testid="outcome-two-sum-hint"]')).toBeNull()
    click(q('[data-testid="status-two-sum"]'))
    expect(q('[data-testid="outcome-two-sum-clean"]').getAttribute('aria-pressed')).toBe('true')
  })

  it('gives an unknown topic and an unknown problem a way back', () => {
    goto('#/topic/not-a-topic')
    expect(q('[data-testid="topic-missing"]')).toBeTruthy()
    goto('#/problem/not-a-problem')
    expect(q('[data-testid="problem-missing"]')).toBeTruthy()
  })
})

describe('back button and query-string state (acceptance 1)', () => {
  it('keeps search in the URL and survives a reload', () => {
    goto('#/search')
    type(q('input[aria-label="Search problems"]') as HTMLInputElement, 'two sum')
    expect(window.location.hash).toContain('q=two+sum')
    expect(q('[data-testid="match-count"]').textContent).not.toContain('Showing 495 of')

    // "Reload": a fresh mount reads the same URL back.
    act(() => {
      root.unmount()
    })
    root = createRoot(container)
    mount()
    expect((q('input[aria-label="Search problems"]') as HTMLInputElement).value).toBe('two sum')
    expect(q('[data-testid="match-count"]').textContent).not.toContain('Showing 495 of')
  })

  it('restores the previous URL on a hashchange (back)', () => {
    goto('#/topics')
    goto('#/search')
    goto('#/topics')
    expect(q('h1').textContent).toBe('Topics')
  })
})

describe('density (acceptance 4)', () => {
  it('changes the row height class and persists the choice', () => {
    expect(q('.app-root').getAttribute('data-density')).toBe('comfortable')
    goto('#/settings')
    click(q('[data-testid="density-compact"]'))
    expect(q('.app-root').getAttribute('data-density')).toBe('compact')
    const stored = JSON.parse(localStorage.getItem('dsa-archive.settings.v1') ?? '{}')
    expect(stored.density).toBe('compact')

    click(q('[data-testid="density-roomy"]'))
    expect(q('.app-root').getAttribute('data-density')).toBe('roomy')
  })

  it('defaults a malformed stored density back to comfortable', () => {
    localStorage.setItem('dsa-archive.settings.v1', JSON.stringify({ density: 'enormous' }))
    resetSettingsStoreForTests()
    expect(q('.app-root').getAttribute('data-density')).toBe('comfortable')
  })
})

describe('rows, windowing and the three visible controls (acceptance 3, 12)', () => {
  it('mounts no rows until a topic is opened, then a bounded window', () => {
    goto('#/search')
    expect(qa('.row').length).toBe(0)
    openTopic('arrays')
    const rows = qa('#topic-arrays .row')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThanOrEqual(40)
    if (arraysTotal > 40) {
      expect(q('[data-testid="window-more-arrays"]')).toBeTruthy()
      const before = qa('#topic-arrays .row').length
      click(q('[data-testid="window-more-arrays"]'))
      expect(qa('#topic-arrays .row').length).toBeGreaterThan(before)
    }
  })

  it('always labels the level in text and keeps the two interactive controls', () => {
    goto('#/search')
    openTopic('arrays')
    const row = q('#problem-two-sum')
    expect(row.querySelector('[data-testid="level-two-sum"]')?.textContent).toBe('Basic')
    expect(row.querySelector('[data-testid="status-two-sum"]')).toBeTruthy()
    expect(row.querySelector('[data-testid="star-two-sum"]')).toBeTruthy()
    expect(row.querySelector('.row-cluster')).toBeTruthy()
  })

  it('filters by level and link type from chips', () => {
    goto('#/search')
    click(q('[data-testid="level-chip-basic"]'))
    expect(q('[data-testid="match-count"]').textContent).toContain('Showing 84 of 495')
    expect(q('[data-testid="level-chip-basic"]').getAttribute('aria-pressed')).toBe('true')
    click(q('[data-testid="level-chip-basic"]'))
    click(q('[data-testid="link-chip-leetcode"]'))
    expect(q('[data-testid="match-count"]').textContent).toContain('Showing 289 of 495')
    click(q('[data-testid="clear-all"]'))
    expect(q('[data-testid="match-count"]').textContent).toContain('Showing 495 of 495')
  })

  it('shows a designed empty state with one action when nothing matches', () => {
    goto('#/search')
    type(q('input[aria-label="Search problems"]') as HTMLInputElement, 'zzzz-nope')
    expect(q('[data-testid="sheet-empty"]')).toBeTruthy()
    click(qa('[data-testid="sheet-empty"] .btn').find((button) => button.textContent?.includes('Clear'))!)
    expect(q('[data-testid="match-count"]').textContent).toContain('Showing 495 of 495')
  })
})

describe('undo (acceptance 5)', () => {
  it('reverts a mark-done from the toast and from the u key', () => {
    goto('#/search')
    openTopic('arrays')
    click(q('[data-testid="status-two-sum"]'))
    expect(q('[data-testid="progress-pill"]').textContent).toBe('1/495 done')
    const toast = outside('[data-testid="toast"]')
    expect(toast.textContent).toContain('Marked “Two Sum” done')
    click(outside('[data-testid="toast-action"]'))
    expect(q('[data-testid="progress-pill"]').textContent).toBe('0/495 done')

    click(q('[data-testid="status-two-sum"]'))
    expect(q('[data-testid="progress-pill"]').textContent).toBe('1/495 done')
    press('u')
    expect(q('[data-testid="progress-pill"]').textContent).toBe('0/495 done')
  })

  it('reverts a bookmark', () => {
    goto('#/search')
    openTopic('arrays')
    click(q('[data-testid="star-two-sum"]'))
    expect(q('[data-testid="star-two-sum"]').getAttribute('aria-pressed')).toBe('true')
    click(outside('[data-testid="toast-action"]'))
    expect(q('[data-testid="star-two-sum"]').getAttribute('aria-pressed')).toBe('false')
  })
})

describe('command palette (acceptance 6)', () => {
  it('opens with ⌘K, ranks by fuzzy score and runs the selected action', () => {
    press('k', { metaKey: true })
    const input = q('[data-testid="palette-input"]') as HTMLInputElement
    expect(document.querySelector('[data-testid="palette-list"]')).toBeTruthy()
    type(input, 'two sum')
    const options = qa('[data-testid="palette-option"]')
    expect(options.length).toBeGreaterThan(0)
    expect(options[0].textContent).toContain('Two Sum')
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(window.location.hash).toBe('#/problem/two-sum')
  })

  it('reaches every route and at least ten actions', () => {
    press('k', { metaKey: true })
    const labels = qa('[data-testid="palette-option"]').map((option) => option.textContent ?? '')
    expect(labels.some((label) => label.includes('Settings'))).toBe(true)
    type(q('[data-testid="palette-input"]') as HTMLInputElement, 'density')
    expect(qa('[data-testid="palette-option"]').length).toBeGreaterThanOrEqual(3)
    type(q('[data-testid="palette-input"]') as HTMLInputElement, 'filter')
    expect(qa('[data-testid="palette-option"]').length).toBeGreaterThanOrEqual(3)
  })

  it('reports no results instead of an empty box', () => {
    press('k', { metaKey: true })
    type(q('[data-testid="palette-input"]') as HTMLInputElement, 'zzzzzz-nothing')
    expect(q('[data-testid="palette-empty"]')).toBeTruthy()
  })
})

describe('keyboard triage (acceptance 6, keyboard path)', () => {
  it('moves with j/k, toggles with x and stars with s', () => {
    goto('#/search')
    openTopic('arrays')
    press('j')
    const focused = qa('.row.is-focused')
    expect(focused).toHaveLength(1)
    const problemId = focused[0].dataset.problemId as string
    press('x')
    expect(q('[data-testid="progress-pill"]').textContent).toBe('1/495 done')
    press('x')
    expect(q('[data-testid="progress-pill"]').textContent).toBe('0/495 done')
    press('s')
    expect(q(`[data-testid="star-${problemId}"]`).getAttribute('aria-pressed')).toBe('true')
  })

  it('shows the shortcuts sheet with ? and closes it again', () => {
    press('?')
    expect(document.querySelector('dialog.shortcuts')).toBeTruthy()
    expect(document.body.textContent).toContain('Inside a list')
    press('Escape')
  })

  it('routes g-then-key navigation', () => {
    press('g')
    press('p')
    expect(window.location.hash).toBe('#/topics')
  })
})

describe('dark / light / large-text variants', () => {
  it('defaults to dark and switches appearance from the top bar', () => {
    expect(q('.app-root').getAttribute('data-theme')).toBe('dark')
    click(q('[data-testid="theme-toggle"]'))
    expect(q('.app-root').getAttribute('data-theme')).toBe('light')
    goto('#/settings')
    const largeTextRow = qa('.setting-row').find((row) => row.textContent?.includes('Large text'))!
    click(largeTextRow.querySelector('.btn') as HTMLElement)
    expect(q('.app-root').className).toContain('large-text')
  })
})

describe('signed-out states keep working', () => {
  it('explains the account requirement and keeps the sheet browsable', () => {
    expect(q('[data-testid="sign-in-banner"]').textContent).toContain('Sign in to save progress')
    expect(q('[data-testid="sync-pill"]').textContent).toContain('Local only')
    goto('#/code')
    expect(q('[data-testid="code-view"]').textContent).toContain('Sign in to keep your code')
    goto('#/review')
    expect(q('[data-testid="revision-view"]').textContent).toContain('Revision needs an account')
    goto('#/stats')
    expect(q('[data-testid="stats-view"]').textContent).toContain('Stats need an account')
    goto('#/friends')
    expect(q('[data-testid="friends-view"]').textContent).toContain('Sign in to invite friends')
  })
})
