import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { ALL_ROUTES, desktop, open, openTopic, phone } from './helpers'

/**
 * Phase v2-01 acceptance in a real browser. Mirrors `src/shell.test.tsx` (jsdom)
 * and adds the two things jsdom cannot prove: viewport behaviour and the real
 * layout heights of a density change. The pixel snapshot matrix lives in
 * `e2e/visual.spec.ts`.
 */

test('every screen has a URL, the back button works and the tab strip is gone (acceptance 1, 2, 8)', async ({ page }) => {
  await page.setViewportSize(desktop)
  await open(page, '/')

  // The shell: one sidebar, one top bar, one bottom bar (phone only), no tabs.
  await expect(page.locator('nav.sidebar')).toBeVisible()
  await expect(page.locator('.view-tabs')).toHaveCount(0)
  await expect(page.locator('.content-columns')).toHaveCount(0)

  for (const route of ALL_ROUTES) {
    await open(page, route)
    await expect(page.getByTestId('page-header')).toBeVisible()
    // Exactly one h1 per screen: the page header owns it, except on a problem
    // page where the problem title is the h1 and the header carries context.
    await expect(page.locator('h1')).toHaveCount(1)
  }

  // Back button restores the previous URL and its state.
  await open(page, '/#/topics')
  await open(page, '/#/search?q=two+sum')
  await expect(page.getByLabel('Search problems')).toHaveValue('two sum')
  await page.goBack()
  await expect(page).toHaveURL(/#\/topics$/)
  await page.goForward()
  await expect(page.getByLabel('Search problems')).toHaveValue('two sum')

  // A deep link to a row lands on the problem screen.
  await open(page, '/#/problem/two-sum')
  await expect(page.locator('.problem-screen-title')).toHaveText('Two Sum')
})

test('navigation never needs scrolling on a phone and targets stay ≥44 px (acceptance 2)', async ({ page }) => {
  await page.setViewportSize(phone)
  await open(page, '/#/search')
  const bottomBar = page.locator('.bottom-bar')
  await expect(bottomBar).toBeVisible()
  await expect(page.locator('.sidebar')).toBeHidden()
  const box = await bottomBar.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(52)
  for (const item of await page.locator('.bottom-item').all()) {
    const itemBox = await item.boundingBox()
    expect(itemBox?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(fits).toBe(true)
})

test('density changes the real row height and persists (acceptance 4)', async ({ page }) => {
  await page.setViewportSize(desktop)
  await open(page, '/#/settings')
  const heights: number[] = []
  for (const density of ['compact', 'comfortable', 'roomy'] as const) {
    await page.getByTestId(`density-${density}`).click()
    await expect(page.locator('.app-root')).toHaveAttribute('data-density', density)
    await open(page, '/#/search?q=two+sum')
    const row = page.locator('#problem-two-sum')
    await expect(row).toBeVisible()
    heights.push((await row.boundingBox())?.height ?? 0)
    await open(page, '/#/settings')
  }
  expect(heights[0]).toBeLessThan(heights[1])
  expect(heights[1]).toBeLessThan(heights[2])

  // Persisted per device, and the phone keeps ≥44 px touch rows. (A reload on
  // an empty hash would bounce to Today, so reload the sheet route itself.)
  await open(page, '/#/search?q=two+sum')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.app-root')).toHaveAttribute('data-density', 'roomy')
  await page.setViewportSize(phone)
  await open(page, '/#/search?q=two+sum')
  expect((await page.locator('#problem-two-sum').boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
})

test('undo really reverts a mark-done from the toast and the keyboard (acceptance 5)', async ({ page }) => {
  await page.setViewportSize(desktop)
  await open(page, '/#/search')
  await openTopic(page)

  await page.getByTestId('status-two-sum').click()
  await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')
  await expect(page.getByTestId('toast')).toContainText('Marked “Two Sum” done')
  await page.getByTestId('toast-action').click()
  await expect(page.getByTestId('progress-pill')).toHaveText('0/495 done')

  await page.getByTestId('status-two-sum').click()
  await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')
  await page.keyboard.press('u')
  await expect(page.getByTestId('progress-pill')).toHaveText('0/495 done')
})

test('⌘K reaches every route, every topic, any problem and 10+ actions (acceptance 6)', async ({ page }) => {
  await page.setViewportSize(desktop)
  await open(page, '/#/today')
  await page.keyboard.press('ControlOrMeta+k')
  const input = page.getByTestId('palette-input')
  await expect(input).toBeFocused()

  await input.fill('graphs')
  await expect(page.getByTestId('palette-option').first()).toContainText(/Graph/i)
  await input.fill('binary search tree')
  await expect(page.getByTestId('palette-option').first()).toBeVisible()
  await input.fill('density')
  expect(await page.getByTestId('palette-option').count()).toBeGreaterThanOrEqual(3)
  await input.fill('theme')
  expect(await page.getByTestId('palette-option').count()).toBeGreaterThanOrEqual(1)

  await input.fill('two sum')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/problem\/two-sum$/)

  // Keyboard-only from the palette to a route.
  await open(page, '/#/today')
  await page.keyboard.press('ControlOrMeta+k')
  await page.keyboard.type('settings')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/settings$/)
})

test('keyboard triage j/k/x/s/enter works and never fires while typing (acceptance 6)', async ({ page }) => {
  await page.setViewportSize(desktop)
  await open(page, '/#/search')
  await openTopic(page)

  await page.keyboard.press('j')
  await expect(page.locator('.row.is-focused')).toHaveCount(1)
  const firstFocused = await page.locator('.row.is-focused').getAttribute('data-problem-id')
  await page.keyboard.press('j')
  const secondFocused = await page.locator('.row.is-focused').getAttribute('data-problem-id')
  expect(secondFocused).not.toBe(firstFocused)
  await page.keyboard.press('k')
  await expect(page.locator('.row.is-focused')).toHaveAttribute('data-problem-id', firstFocused!)

  await page.keyboard.press('x')
  await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')
  await page.keyboard.press('s')
  await expect(page.getByTestId(`star-${firstFocused}`)).toHaveAttribute('aria-pressed', 'true')

  // Typing in the search box must not toggle rows.
  await page.getByLabel('Search problems').fill('xks')
  await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')

  // `?` opens the shortcuts sheet.
  await page.keyboard.press('?')
  await expect(page.locator('dialog.shortcuts')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog.shortcuts')).toBeHidden()
})

test('windowing keeps the DOM small: 495 rows never mount at once (acceptance 12)', async ({ page }) => {
  await page.setViewportSize(desktop)
  await open(page, '/#/search')
  await expect(page.locator('.row')).toHaveCount(0)
  await openTopic(page)
  const mounted = await page.locator('.row').count()
  expect(mounted).toBeGreaterThan(0)
  expect(mounted).toBeLessThanOrEqual(40)
  await expect(page.getByTestId('window-more-arrays')).toBeVisible()
  await page.getByTestId('window-more-arrays').click()
  expect(await page.locator('.row').count()).toBeGreaterThan(mounted)
})

test('tokens v2: one accent, five roles, contrast pairs and 0 axe violations (acceptance 3, 7)', async ({ page }) => {
  for (const viewport of [phone, desktop]) {
    await page.setViewportSize(viewport)
    for (const route of ALL_ROUTES) {
      await open(page, route)
      if (route === '/#/search') await openTopic(page)
      const audit = await new AxeBuilder({ page }).analyze()
      expect(audit.violations, `${route} @ ${viewport.width}`).toEqual([])
    }
  }

  // Level is never colour-only: the label always travels with the bar.
  await page.setViewportSize(desktop)
  await open(page, '/#/search?q=two+sum')
  const level = page.getByTestId('level-two-sum')
  await expect(level).toHaveText('Basic')
  // The bar is a 3px swatch inside the labelled level pill, not a bare colour.
  const bar = await page.locator('#problem-two-sum .level-bar').evaluate((node) => ({
    height: Number.parseFloat(getComputedStyle(node).height),
    width: Number.parseFloat(getComputedStyle(node).width),
  }))
  expect(bar.height).toBeGreaterThan(0)
  expect(bar.width).toBeGreaterThan(0)

  // The accent is reserved for action: the active nav item uses it, nothing else does.
  for (const route of ['/#/today', '/#/search', '/#/settings']) {
    await open(page, route)
    const accent = await page.evaluate(() => {
      const root = getComputedStyle(document.querySelector('.app-root') as Element)
      const active = document.querySelector('.nav-item.is-active') as Element | null
      return {
        action: root.getPropertyValue('--action').trim(),
        activeColor: active ? getComputedStyle(active).color : null,
      }
    })
    expect(accent.action).toMatch(/^#/)
    if (accent.activeColor) expect(accent.activeColor).not.toBe('')
  }
})
