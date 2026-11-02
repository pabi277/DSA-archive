import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const viewLabels = [
  'Sheet · signed out', 'Sheet · signed in', 'Sheet · topic expanded', 'Sheet · no results',
  'Topic complete', 'Sign in · Google / error', 'Sync · offline', 'Problem detail · no note',
  'Problem detail · with note', 'Notes · with notes', 'Notes · empty', 'Custom lists · list',
  'Custom lists · empty', 'Custom lists · editing', 'Today · planned', 'Today · nothing planned',
  'Today · goal met', 'Revision · due', 'Revision · caught up', 'Stats', 'Friends · invite',
  'Friends · compare', 'Friends · weekly goal', 'Settings & account', 'Offline / not found',
]

test('design prototype covers the screen inventory and remains accessible at phone and desktop sizes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect(page).toHaveTitle('DSA Archive')
  await expect(page.getByRole('heading', { name: 'Sheet · signed out' })).toBeVisible()
  await expect(page.getByText('495 problems · 20 topics · available signed out')).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Preview screen' })).toBeVisible()
  await page.screenshot({ path: 'test-results/prototype-desktop.png', fullPage: true })
  const desktopAudit = await new AxeBuilder({ page }).analyze()
  expect(desktopAudit.violations).toEqual([])

  const picker = page.getByRole('combobox', { name: 'Preview screen' })
  for (const label of viewLabels) {
    await picker.selectOption({ label })
    await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible()
  }

  await picker.selectOption({ label: 'Sign in · Google / error' })
  await expect(page.getByRole('button', { name: /Continue with Google/ })).toBeVisible()
  await picker.selectOption({ label: 'Friends · compare' })
  await expect(page.getByText(/Notes and snippets are always private/)).toBeVisible()
  await picker.selectOption({ label: 'Sync · offline' })
  await expect(page.getByText('You’re offline')).toBeVisible()

  await page.getByRole('button', { name: 'Switch to light appearance' }).click()
  await expect(page.locator('.prototype-root')).toHaveAttribute('data-theme', 'light')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Aa' }).click()
  await expect(page.locator('.prototype-root')).toHaveClass(/large-text/)
  await picker.selectOption({ label: 'Sheet · signed out' })
  await expect(page.getByRole('navigation', { name: 'Bottom navigation' })).toBeVisible()
  const fitsPhone = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(fitsPhone).toBe(true)
  await page.screenshot({ path: 'test-results/prototype-phone-light.png', fullPage: true })
  const phoneAudit = await new AxeBuilder({ page }).analyze()
  expect(phoneAudit.violations).toEqual([])
})
