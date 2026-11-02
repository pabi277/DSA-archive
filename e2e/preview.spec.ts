import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('catalogue preview is readable, responsive and has no automated accessibility violations', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect(page).toHaveTitle('DSA Archive')
  await expect(page.getByRole('heading', { name: 'Your learning sheet' })).toBeVisible()
  await expect(page.getByTestId('catalogue-count')).toHaveText('495 problems · 20 topics')
  await expect(page.getByRole('listitem')).toHaveCount(20)
  await page.screenshot({ path: 'test-results/site-desktop.png', fullPage: true })
  const desktopAudit = await new AxeBuilder({ page }).analyze()
  expect(desktopAudit.violations).toEqual([])

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Topics' })).toBeVisible()
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390)
  await page.screenshot({ path: 'test-results/site-phone.png', fullPage: true })
  const phoneAudit = await new AxeBuilder({ page }).analyze()
  expect(phoneAudit.violations).toEqual([])
})
