import { expect, test } from '@playwright/test'
import { open, openTopic, auditPage } from './helpers'

/**
 * Phase 1 acceptance, re-checked against the v2 shell (phase v2-01): the full
 * sheet in the preview, search narrows instantly, row actions work, phone width
 * usable. Mirrors `src/shell.test.tsx`, which runs the same contract in jsdom
 * locally (this sandbox cannot download Chromium).
 */

test('the full sheet is browsable signed out and rows keep their actions (1.1 + 1.3, desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, '/#/search')
  await expect(page).toHaveTitle('DSA Archive')
  await expect(page.getByRole('heading', { level: 1, name: 'Search the sheet' })).toBeVisible()
  await expect(page.locator('details.topic-card')).toHaveCount(20)
  await expect(page.getByTestId('match-count')).toContainText('Showing 495 of 495 problems across 20 of 20 topics')
  await expect(page.getByTestId('progress-pill')).toHaveText('0/495 done')

  await openTopic(page)
  expect(await page.locator('#topic-arrays .row').count()).toBeGreaterThan(20)
  expect(await page.locator('#topic-arrays .subtopic-title').count()).toBeGreaterThan(1)
  await expect(page.locator('#problem-two-sum .row-title')).toHaveText('Two Sum')
  // Level is text, never colour-only (tokens v2 rule).
  await expect(page.locator('#problem-two-sum [data-testid="level-two-sum"]')).toHaveText('Basic')

  // Outbound links moved from one button per link type into `⋯`; they are still
  // real links opened safely in a new tab.
  const anchors = page.locator('#problem-two-sum .row-cluster a')
  expect(await anchors.count()).toBeGreaterThan(0)
  const attributes = await anchors.evaluateAll((nodes) =>
    nodes.map((node) => ({
      href: node.getAttribute('href'),
      target: node.getAttribute('target'),
      rel: node.getAttribute('rel'),
    })),
  )
  for (const attribute of attributes) {
    expect(attribute.href).toMatch(/^https:\/\//)
    expect(attribute.target).toBe('_blank')
    expect(attribute.rel).toContain('noopener')
  }

  await page.screenshot({ path: 'test-results/sheet-desktop.png', fullPage: true })
  const desktopAudit = await auditPage(page).analyze()
  expect(desktopAudit.violations).toEqual([])
})

test('search narrows instantly, filters combine and the query lives in the URL (1.2)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, '/#/search')

  await page.getByLabel('Search problems').fill('two sum')
  await expect(page.getByTestId('match-count')).not.toContainText('Showing 495 of')
  expect(page.url()).toContain('q=two+sum')
  await expect(page.locator('#problem-two-sum')).toBeVisible()

  await page.getByLabel('Search problems').fill('zzzz-no-match')
  await expect(page.getByTestId('sheet-empty')).toBeVisible()
  await page.getByRole('button', { name: /Clear search and filters/ }).click()
  await expect(page.getByTestId('match-count')).toContainText('Showing 495 of 495')

  await page.getByTestId('level-chip-basic').click()
  await expect(page.getByTestId('match-count')).toContainText('Showing 84 of 495')
  await expect(page.getByTestId('level-chip-basic')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('link-chip-leetcode').click()
  await expect(page.getByTestId('match-count')).toContainText('2 filters on')
  await page.getByTestId('clear-all').click()
  await expect(page.getByTestId('match-count')).toContainText('Showing 495 of 495')

  await page.getByLabel('Filter by topic').selectOption('arrays')
  await expect(page.locator('details.topic-card')).toHaveCount(1)
  await page.getByLabel('Filter by topic').selectOption('')
  await expect(page.locator('details.topic-card')).toHaveCount(20)

  // Random pick reveals a visible row inside its (auto-opened) topic.
  await page.getByTestId('random-pick').click()
  await expect(page.getByTestId('random-notice')).toContainText('Random pick ·')
  await expect(page.locator('.row.is-revealed')).toHaveCount(1)

  // Local progress drives the header pill, and the undo toast reverts it.
  await openTopic(page)
  await page.getByTestId('status-two-sum').click()
  await expect(page.getByTestId('status-two-sum')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')
  await expect(page.getByTestId('toast')).toContainText('Marked “Two Sum” done')
  await page.getByTestId('toast-action').click()
  await expect(page.getByTestId('progress-pill')).toHaveText('0/495 done')

  // Progress survives a reload (guest storage).
  await page.getByTestId('status-two-sum').click()
  await page.reload()
  await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')
})

test('the sheet is usable at phone width in light and large-text variants', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, '/#/search')
  await expect(page.locator('.app-root')).toHaveAttribute('data-theme', 'dark')

  // Navigation never requires scrolling: the bottom bar is fixed.
  await expect(page.locator('.bottom-bar')).toBeVisible()
  await expect(page.locator('.sidebar')).toBeHidden()

  await page.getByTestId('theme-toggle').click()
  await expect(page.locator('.app-root')).toHaveAttribute('data-theme', 'light')
  await open(page, '/#/settings')
  await page.getByTestId('large-text-toggle').click()
  await expect(page.locator('.app-root')).toHaveClass(/large-text/)

  await open(page, '/#/search?q=two+sum')
  await expect(page.locator('#problem-two-sum')).toBeVisible()
  await expect(page.locator('#problem-two-sum .row-cluster button').first()).toBeVisible()

  const fitsPhone = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(fitsPhone).toBe(true)

  await page.screenshot({ path: 'test-results/sheet-phone-light.png', fullPage: true })
  const phoneAudit = await auditPage(page).analyze()
  expect(phoneAudit.violations).toEqual([])
})
