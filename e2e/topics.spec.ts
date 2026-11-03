import { expect, test } from '@playwright/test'
import { open } from './helpers'

const phone = { width: 390, height: 844 }

test('all topic cards open full topic pages with working placeholder tabs', async ({ page }) => {
  await page.setViewportSize(phone)
  await open(page, '/#/topics')
  await expect(page.getByTestId(/^topic-tile-/)).toHaveCount(20)

  await page.getByTestId('topic-tile-arrays').click()
  await expect(page.getByRole('heading', { name: 'Arrays', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Learn' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('topic-primer')).toBeVisible()
  await expect(page.getByTestId('primer-mistakes')).toBeVisible()

  await page.getByRole('tab', { name: 'Practice' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('Problems are ordered from fundamentals')
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByText('No problems in this filter')).toBeVisible()

  await page.getByRole('tab', { name: 'Quiz' }).click()
  await expect(page.getByTestId('topic-quiz-pending')).toBeVisible()
  await expect(page.getByTestId('topic-quiz-count')).toContainText('12/12 topic quiz items')
  await expect(page.getByTestId('topic-quiz-start')).toBeDisabled()
})

test('search from Today keeps matches grouped under their owning topic', async ({ page }) => {
  await open(page, '/')
  await page.getByTestId('topbar-search').click()
  await page.getByTestId('sheet-search').fill('two sum')
  const arraysGroup = page.locator('#topic-arrays')
  await expect(arraysGroup).toHaveAttribute('open', '')
  await expect(arraysGroup.getByTestId('row-two-sum')).toBeVisible()
  await expect(arraysGroup.locator('.topic-name')).toHaveText('Arrays')
})
