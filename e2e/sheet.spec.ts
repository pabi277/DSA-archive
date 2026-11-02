import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Phase 1 acceptance in a real browser (roadmap "Done means"): the full sheet
 * in the preview, search narrows instantly, row links work, phone-width usable.
 * Mirrors `src/app.test.tsx`, which runs the same assertions in jsdom locally.
 */

test('the full sheet is browsable signed out and rows link out (1.1 + 1.3, desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect(page).toHaveTitle('DSA Archive')
  await expect(page.getByRole('heading', { level: 1, name: 'Your learning sheet' })).toBeVisible()
  await expect(page.getByText('495 problems · 20 topics · browsable signed out')).toBeVisible()
  await expect(page.locator('details.topic-card')).toHaveCount(20)
  await expect(page.getByTestId('match-count')).toContainText('Showing 495 of 495 problems across 20 of 20 topics')
  await expect(page.getByTestId('progress-pill')).toHaveText('0/495 done')
  await expect(page.getByTestId('weakest-topic')).toContainText('Mark a few problems done')

  // Topic accordion opens on its summary and shows subtopics + rows.
  await page.locator('#topic-arrays summary').click()
  await expect(page.locator('#topic-arrays')).toHaveAttribute('open', '')
  expect(await page.locator('#topic-arrays .problem-row').count()).toBeGreaterThan(20)
  expect(await page.locator('#topic-arrays .subtopic-title').count()).toBeGreaterThan(1)
  await expect(page.locator('#problem-two-sum .problem-title')).toHaveText('Two Sum')
  await expect(page.locator('#problem-two-sum .level-badge')).toHaveText('Basic')

  // Outbound row actions are real links, opened safely in a new tab.
  const links = page.locator('#problem-two-sum .row-actions a')
  await expect(links).toHaveText(['Practice', 'Article', 'Video', 'LeetCode'])
  const attributes = await links.evaluateAll((nodes) =>
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
  await expect(page.locator('#problem-two-sum .row-actions')).toHaveAttribute(
    'aria-label',
    'Outbound links for Two Sum',
  )

  await page.screenshot({ path: 'test-results/sheet-desktop.png', fullPage: true })
  const desktopAudit = await new AxeBuilder({ page }).analyze()
  expect(desktopAudit.violations).toEqual([])
})

test('search narrows instantly; filters, random pick and the weakest-topic hint work (1.2)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  // Search: instant narrowing, matching topics auto-expand.
  await page.getByLabel('Search problems').fill('two sum')
  await expect(page.getByTestId('match-count')).not.toContainText('Showing 495 of')
  await expect(page.getByTestId('match-count')).toContainText('of 495 problems')
  await expect(page.locator('#problem-two-sum')).toBeVisible()

  // No-results state with a working clear action.
  await page.getByLabel('Search problems').fill('zzzz-no-match')
  await expect(page.getByRole('heading', { name: 'No matching problems' })).toBeVisible()
  await expect(page.locator('details.topic-card')).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear search and filters' }).click()
  await expect(page.getByTestId('match-count')).toContainText('Showing 495 of 495')

  // Level + link-type filters combine, and the filter count is reported.
  await page.getByRole('button', { name: 'Basic', exact: true }).click()
  await expect(page.getByTestId('match-count')).toContainText('Showing 84 of 495')
  await expect(page.getByRole('button', { name: 'Basic', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'LeetCode', exact: true }).click()
  await expect(page.getByTestId('match-count')).toContainText('2 filters on')
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page.getByTestId('match-count')).toContainText('Showing 495 of 495')

  // Topic filter.
  await page.getByLabel('Filter by topic').selectOption('arrays')
  await expect(page.locator('details.topic-card')).toHaveCount(1)
  await page.getByLabel('Filter by topic').selectOption('')
  await expect(page.locator('details.topic-card')).toHaveCount(20)

  // Random pick reveals a visible row inside its topic.
  await page.getByTestId('random-pick').click()
  await expect(page.getByTestId('random-notice')).toContainText('Random pick ·')
  await expect(page.locator('.problem-row.is-revealed')).toHaveCount(1)
  await page.getByRole('button', { name: 'Dismiss' }).click()
  await expect(page.getByTestId('random-notice')).toHaveCount(0)

  // Local progress drives the header pill and the weakest-topic hint.
  await page.evaluate(() => {
    const topic = document.querySelector('#topic-arrays') as HTMLDetailsElement
    if (!topic.open) topic.open = true
  })
  await page.locator('#problem-two-sum .status-check').click()
  await expect(page.locator('#problem-two-sum .status-check')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')
  await expect(page.getByTestId('weakest-topic')).toContainText('Arrays')
  await expect(page.getByTestId('weakest-topic')).toContainText('Open topic')

  // Hide-done applies to the sheet, and both survive a reload (guest storage).
  await page.getByRole('button', { name: 'Hide done', exact: true }).click()
  await expect(page.getByTestId('match-count')).toContainText('Showing 494 of 495')
  await page.reload()
  await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')
  await expect(page.getByRole('button', { name: 'Hide done', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('weakest-topic')).toContainText('Arrays')
})

test('the sheet is usable at phone width in light and large-text variants', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.app-root')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: 'Switch to light appearance' }).click()
  await expect(page.locator('.app-root')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Toggle large text' }).click()
  await expect(page.locator('.app-root')).toHaveClass(/large-text/)

  await page.getByLabel('Search problems').fill('two sum')
  await expect(page.locator('#problem-two-sum')).toBeVisible()
  await expect(page.locator('#problem-two-sum .row-actions a').first()).toBeVisible()

  // Nothing may overflow horizontally at 390px.
  const fitsPhone = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  )
  expect(fitsPhone).toBe(true)

  await page.screenshot({ path: 'test-results/sheet-phone-light.png', fullPage: true })
  const phoneAudit = await new AxeBuilder({ page }).analyze()
  expect(phoneAudit.violations).toEqual([])
})
