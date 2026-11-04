import { expect, type Page } from '@playwright/test'

/**
 * Shared helpers for the v2 shell (phase v2-01). Kept in one file so the specs
 * never disagree about how a route is opened or how a topic row is expanded.
 *
 * Everything goes through `open()`: it navigates **and** waits until the shell
 * has actually mounted. A bare `page.goto('/#/…')` resolves on `load`, which can
 * be before React paints — the first CI run failed on exactly that (assertions
 * ran against an empty `#root`). Waiting for `.app-root` + the page header makes
 * every spec deterministic without `networkidle` (the SW and Firestore keep
 * sockets open, so `networkidle` would be flaky by design).
 */

export const phone = { width: 390, height: 844 } as const
export const desktop = { width: 1440, height: 900 } as const

/** Navigate to a route and wait for the shell to be interactive. */
export async function open(page: Page, path = '/') {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.app-root')).toBeVisible({ timeout: 20_000 })
  return page
}

/** v1 view names → v2 hash routes (the old tab strip is gone). */
export const VIEW_ROUTES: Record<string, string> = {
  sheet: '/#/search',
  today: '/#/today',
  revision: '/#/review',
  lists: '/#/lists',
  stats: '/#/stats',
  friends: '/#/friends',
  code: '/#/code',
}

/** Navigate to a v1-named view through its URL. */
export async function gotoView(page: Page, view: string) {
  await open(page, VIEW_ROUTES[view] ?? '/#/today')
}

/** Every route in the v2 map, for the a11y matrix. */
export const ALL_ROUTES = [
  '/#/today',
  '/#/topics',
  '/#/topic/arrays',
  '/#/topic/arrays?tab=practice',
  '/#/topic/arrays?tab=quiz',
  '/#/problem/two-sum',
  '/#/search',
  '/#/code',
  '/#/practice',
  '/#/quiz',
  '/#/quiz/arrays',
  '/#/review',
  '/#/insights',
  '/#/settings',
  '/#/lists',
  '/#/friends',
  '/#/stats',
  '/#/not-found',
] as const

/** Open a topic accordion on `#/search` and make sure its rows are mounted. */
export async function openTopic(page: Page, topicId = 'arrays') {
  const details = page.locator(`#topic-${topicId}`)
  // Boolean HTML attributes are present with the empty string as their value;
  // test for absence explicitly so a second call does not close an open topic.
  if ((await details.getAttribute('open')) === null) {
    await page.locator(`#topic-${topicId} > summary`).click()
  }
  await expect(details).toHaveAttribute('open', '')
}

/**
 * Mark a row done through the v2 row cluster. `rowId` is the problem id.
 * The row must already be mounted (open its topic first).
 */
export async function markDone(page: Page, problemId: string) {
  await page.getByTestId(`status-${problemId}`).click()
}

/** Deep link to a single row: `#/search?q=<title>` opens and reveals it. */
export async function findRow(page: Page, title: string) {
  await open(page, `/#/search?q=${encodeURIComponent(title)}`)
}
