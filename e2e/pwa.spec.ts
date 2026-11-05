import { expect, test, type Page } from '@playwright/test'
import { ALL_ROUTES, open, openTopic, auditPage } from './helpers'
import { waitForServiceWorkerControl } from './matrix'

/**
 * Roadmap phase 6 acceptance in real Chromium:
 * - 6.1 installable PWA (manifest + icons + Service Worker) and true
 *   airplane-mode cold open in a brand-new tab with both guest and signed-in
 *   cached data intact, plus friendly 404 Not Found and offline.html states.
 * - 6.2 accessibility & responsive zero-overflow budgets across dark + light,
 *   phone (390×844) + desktop (1280×900), and large-text variants.
 */
const emulatorProject = 'demo-dsa-archive'
const phone = { width: 390, height: 844 }
const desktop = { width: 1280, height: 900 }


/**
 * Audit steady-state colours, not a cross-fade.
 *
 * Every surface in this app animates its background and text colour for
 * `--motion-micro` (120 ms), and a theme change on load (restored from storage)
 * starts that fade after the first paint. Axe samples computed colours at one
 * instant, so a sample taken 20 ms into a dark→light fade compares a half-faded
 * foreground against a half-faded background and reports a contrast failure that
 * no user can ever see — WCAG measures the steady state. Emulating reduced
 * motion collapses those durations to 0.001 ms (see `tokens.css`), which is how
 * the visual specs already run. This bit us once: `#8e9994 on #404243` — neither
 * colour exists in our tokens, they were 20% of the way through a fade.
 */
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

async function expectFitsAndAccessible(page: Page) {
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  )
  expect(fits).toBe(true)
  const audit = await auditPage(page).analyze()
  expect(audit.violations).toEqual([])
}

test('manifest, icons and true airplane-mode cold open work signed out with guest data intact (6.1)', async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: phone })
  try {
    const page = await context.newPage()
    await open(page, '/')

    // Verify installable Web App Manifest and clean-room icons.
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(manifestHref).toBe('/manifest.webmanifest')
    const manifestRes = await page.request.get('/manifest.webmanifest')
    expect(manifestRes.ok()).toBe(true)
    const manifest = (await manifestRes.json()) as {
      name: string
      short_name: string
      display: string
      start_url: string
      theme_color: string
      background_color: string
      icons: { src: string; sizes: string; type: string; purpose?: string }[]
    }
    expect(manifest.name).toBe('DSA Archive')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    // Tokens v2 (phase v2-01 re-freeze) canvas.
    expect(manifest.theme_color).toBe('#0B0D0E')
    expect(manifest.background_color).toBe('#0B0D0E')
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4)
    for (const icon of manifest.icons) {
      const iconRes = await page.request.get(icon.src)
      expect(iconRes.ok()).toBe(true)
      expect((await iconRes.body()).byteLength).toBeGreaterThan(200)
    }

    await waitForServiceWorkerControl(page)

    // Record guest progress online, then close the tab before entering airplane mode.
    await open(page, '/#/search')
    await openTopic(page)
    await page.getByTestId('status-two-sum').click()
    await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')
    await page.close()

    // Enter Airplane Mode and cold-open `/` in a brand-new tab.
    await context.setOffline(true)
    const offlinePage = await context.newPage()
    await open(offlinePage, '/')

    // Prove the network is genuinely unreachable while the precached app shell works.
    const uncachedBlocked = await offlinePage.evaluate(async () => {
      try {
        await fetch(`/uncached-network-probe-${Date.now()}.txt`, { cache: 'no-store' })
        return false
      } catch {
        return true
      }
    })
    expect(uncachedBlocked).toBe(true)

    await expect(offlinePage.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    await expect(offlinePage.getByTestId('progress-pill')).toHaveText('1/495 done')

    // Every route opens offline from the precached shell (hash routing needs no
    // server rewrite), and a deep link to a row still reveals that row.
    for (const route of ALL_ROUTES) {
      await open(offlinePage, route)
      await expect(offlinePage.getByTestId('page-header')).toBeVisible()
    }

    // Search and mark another problem done while still in airplane mode.
    await open(offlinePage, '/#/search?q=linear+search')
    await expect(offlinePage.locator('#problem-linear-search')).toBeVisible()
    await offlinePage.getByTestId('status-linear-search').click()
    await expect(offlinePage.getByTestId('progress-pill')).toHaveText('2/495 done')
    await expectFitsAndAccessible(offlinePage)

    // Unknown route renders the friendly 404 screen even offline, and returns home.
    await open(offlinePage, '/#/missing-offline-route')
    await expect(offlinePage.getByTestId('not-found-view')).toContainText('Page not found')
    await expectFitsAndAccessible(offlinePage)
    await offlinePage.getByTestId('not-found-home').click()
    await expect(offlinePage.getByTestId('progress-pill')).toHaveText('2/495 done')

    // Friendly standalone offline fallback page is also precached and audit-clean.
    await offlinePage.goto('/offline.html')
    await expect(offlinePage.getByRole('heading', { level: 1, name: 'You appear to be offline' })).toBeVisible()
    await expectFitsAndAccessible(offlinePage)
  } finally {
    await context.close()
  }
})

test('dark, light, phone, desktop, large-text and 404/offline variants pass a11y and overflow budgets (6.2)', async ({
  page,
}) => {
  test.setTimeout(120_000)

  // Standalone 404 fallback page check.
  await page.setViewportSize(phone)
  await page.goto('/404.html')
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  await expectFitsAndAccessible(page)

  // Phone (390×844) + large-text across dark and light across every route.
  await open(page, '/#/settings')
  await page.getByTestId('large-text-toggle').click()
  await expect(page.locator('.app-root')).toHaveClass(/large-text/)

  for (const theme of ['dark', 'light'] as const) {
    if (theme === 'light') {
      await page.getByTestId('theme-toggle').click()
      await expect(page.locator('.app-root')).toHaveAttribute('data-theme', 'light')
    }
    for (const route of ALL_ROUTES) {
      await open(page, route)
      // Rows are windowed and mount on open: audit an open topic too.
      if (route === '/#/search') {
        await openTopic(page)
        await expect(page.locator('#topic-arrays .row').first()).toBeVisible()
      }
      await expectFitsAndAccessible(page)
    }
  }

  // Desktop (1440×900) + large-text + light, then back to dark.
  await page.setViewportSize(desktop)
  await open(page, '/#/search?q=two+sum')
  await expectFitsAndAccessible(page)
  await page.getByTestId('theme-toggle').click()
  await expect(page.locator('.app-root')).toHaveAttribute('data-theme', 'dark')
  await expectFitsAndAccessible(page)

  // In-app 404 state in large-text mode.
  await page.setViewportSize(phone)
  await open(page, '/#/not-found-check')
  await expect(page.getByTestId('not-found-view')).toBeVisible()
  await expectFitsAndAccessible(page)
})

test('signed-in airplane-mode cold open preserves cloud progress and saved code and syncs on reconnect (6.1 + 6.2)', async ({
  browser,
}) => {
  test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'Requires the Firebase Emulator Suite in CI')
  test.setTimeout(180_000)

  const firestoreClear = await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${emulatorProject}/databases/(default)/documents`,
    { method: 'DELETE' },
  )
  expect(firestoreClear.ok).toBe(true)
  const authClear = await fetch(
    `http://127.0.0.1:9099/emulator/v1/projects/${emulatorProject}/accounts`,
    { method: 'DELETE' },
  )
  expect(authClear.ok).toBe(true)

  const context = await browser.newContext({ viewport: phone })
  const verifyContext = await browser.newContext({ viewport: phone })
  try {
    const page = await context.newPage()
    await open(page, '/')
    await waitForServiceWorkerControl(page)

    await page.getByTestId('emulator-sign-in').click()
    await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
    await expect(page.getByTestId('sync-pill')).toContainText('Synced')

    await open(page, '/#/search')
    await openTopic(page)
    await page.getByTestId('status-two-sum').click()
    await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')

    await page.getByRole('button', { name: /More actions for Two Sum/ }).click()
    await page.getByTestId('menu-code-two-sum').click()
    await page.getByTestId('code-input').fill('class Solution {};')
    await page.getByTestId('code-notes').fill('Saved before airplane mode.')
    await page.getByTestId('code-save').click()
    await expect(page.getByTestId('account-notice')).toContainText('Code saved')
    await expect(page.getByTestId('sync-pill')).toContainText('Synced')

    // Audit signed-in Friends & Today views in large-text mode on phone width.
    await open(page, '/#/settings')
    await page.getByTestId('large-text-toggle').click()
    await open(page, '/#/friends')
    await expectFitsAndAccessible(page)
    await open(page, '/#/today')
    await expectFitsAndAccessible(page)
    await open(page, '/#/settings')
    await page.getByTestId('large-text-toggle').click()

    await page.close()

    // Enter Airplane Mode and cold-open `/` in a fresh tab of the signed-in profile.
    await context.setOffline(true)
    const coldPage = await context.newPage()
    await open(coldPage, '/')
    await coldPage.evaluate(() => window.dispatchEvent(new Event('offline')))

    await expect(coldPage.getByTestId('signed-in-banner')).toContainText('CI Owner')
    await expect(coldPage.getByTestId('progress-pill')).toHaveText('1/495 done')
    await expect(coldPage.getByTestId('sync-pill')).toContainText('Offline')

    // Saved code is readable from IndexedDB persistent cache while completely offline.
    await open(coldPage, '/#/code')
    await expect(coldPage.getByTestId('code-row-two-sum')).toContainText('Saved before airplane mode.')

    // Solve another problem while in airplane mode, then reconnect and verify sync.
    await open(coldPage, '/#/search?q=linear+search')
    await expect(coldPage.locator('#problem-linear-search')).toBeVisible()
    await coldPage.getByTestId('status-linear-search').click()
    await expect(coldPage.getByTestId('progress-pill')).toHaveText('2/495 done')
    await coldPage.screenshot({ path: 'test-results/pwa-offline-phone.png', fullPage: true })
    await expectFitsAndAccessible(coldPage)

    await context.setOffline(false)
    await coldPage.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(coldPage.getByTestId('sync-pill')).toContainText('Synced')

    const verifyPage = await verifyContext.newPage()
    await open(verifyPage, '/')
    await verifyPage.getByTestId('emulator-sign-in').click()
    await expect(verifyPage.getByTestId('progress-pill')).toHaveText('2/495 done')
    await open(verifyPage, '/#/code')
    await expect(verifyPage.getByTestId('code-row-two-sum')).toContainText('Saved before airplane mode.')
  } finally {
    await context.close()
    await verifyContext.close()
  }
})
