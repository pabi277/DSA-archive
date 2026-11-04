import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { desktop, open, phone } from './helpers'

/**
 * Phase 03 acceptance in a real browser: statement blocks, local hints, primer
 * + missing-primer states, quiz counts, ranked publisher UI, practice grid and
 * the Core/Drills toggle. Visual baselines for these states live in
 * `e2e/visual.spec.ts`; this file proves behaviour and zero axe violations.
 */

const VIEWPORTS = [
  { name: 'phone', size: phone },
  { name: 'desktop', size: desktop },
] as const

test('statement renders four blocks, ranked publishers and a local-only hint', async ({ page }) => {
  await page.setViewportSize(phone)
  const jsonRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('.json')) jsonRequests.push(request.url())
  })
  await open(page, '/#/problem/linear-search')
  await expect(page.getByTestId('statement-card')).toBeVisible()
  for (const block of ['statement-what', 'statement-constraints', 'statement-example', 'statement-further']) {
    await expect(page.getByTestId(block)).toBeVisible()
  }
  await expect(page.getByTestId('statement-tests')).toContainText('3 local test cases')
  await expect(page.getByTestId('primary-resource')).toBeVisible()
  await page.getByTestId('more-sources').click()
  await expect(page.getByTestId('resource-sheet')).toContainText('LeetCode')
  await expect(page.getByTestId('resource-sheet')).toContainText('takeUforward')
  await expect(page.getByTestId('resource-sheet')).toContainText('verified 2026-11-03')

  const before = await page.evaluate(() => localStorage.getItem('dsa-archive.progress.v1'))
  await expect(page.getByTestId('hint-details')).not.toHaveAttribute('open', '')
  await page.locator('[data-testid="hint-details"] summary').click()
  await expect(page.getByTestId('hint-details')).toHaveAttribute('open', '')
  const after = await page.evaluate(() => localStorage.getItem('dsa-archive.progress.v1'))
  expect(after).toBe(before)
  expect(jsonRequests).toEqual([])
})

test('missing statement and missing primer render designed states', async ({ page }) => {
  await page.setViewportSize(phone)
  await open(page, '/#/problem/two-sum')
  await expect(page.getByTestId('statement-missing')).toBeVisible()
  await expect(page.getByTestId('statement-further')).toBeVisible()
  await expect(page.getByTestId('hint-missing')).toBeVisible()

  await open(page, '/#/topic/sorting')
  await expect(page.getByTestId('topic-primer-missing')).toBeVisible()
  await expect(page.getByTestId('topic-practice-cta')).toBeVisible()
})

test('Arrays is fully authored end to end and the quiz count is visible', async ({ page }) => {
  await page.setViewportSize(desktop)
  await open(page, '/#/topic/arrays')
  await expect(page.getByTestId('topic-primer')).toBeVisible()
  await expect(page.getByTestId('primer-intro')).toContainText('array')
  await expect(page.getByTestId('primer-example').locator('pre')).toHaveAttribute('aria-label', 'code sample')
  await expect(page.getByTestId('primer-mistakes')).toBeVisible()

  await open(page, '/#/topic/arrays?tab=quiz')
  await expect(page.getByTestId('topic-quiz-count')).toContainText('12/12 topic quiz items')
  await expect(page.getByTestId('topic-quiz-start')).toBeEnabled()

  await open(page, '/#/topic/arrays?tab=practice')
  await page.getByTestId('practice-view-drills').click()
  await expect(page.getByTestId('topic-drills-panel')).toBeVisible()
  await expect(page.getByTestId('topic-drill-count')).toContainText('12 synthetic drills')
})

test('practice grid shows progress and synthetic drills keep the 495 denominator', async ({ page }) => {
  await page.setViewportSize(phone)
  await open(page, '/#/practice')
  await expect(page.getByTestId('practice-grid')).toBeVisible()
  await expect(page.locator('.practice-card')).toHaveCount(34)
  await expect(page.getByTestId('practice-progress')).toContainText('0 of 136 drills done')
  await page.locator('[data-testid^="drill-status-"]').first().click()
  await expect(page.getByTestId('practice-progress')).toContainText('1 of 136 drills done')
  await expect(page.getByTestId('progress-pill')).toHaveText('0/495 done')
})

test('content surfaces have zero axe violations and no phone overflow', async ({ page }) => {
  const routes = [
    '/#/problem/linear-search',
    '/#/problem/two-sum',
    '/#/topic/arrays',
    '/#/topic/sorting',
    '/#/topic/arrays?tab=practice',
    '/#/practice',
  ]
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport.size)
    for (const route of routes) {
      await open(page, route)
      const audit = await new AxeBuilder({ page }).analyze()
      expect(audit.violations, `${route} @ ${viewport.name}`).toEqual([])
      if (viewport.name === 'phone') {
        const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        expect(fits, `${route} @ phone`).toBe(true)
      }
    }
  }
})
