import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

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

async function waitForServiceWorkerControl(page: Page) {
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker is not supported in this browser')
    }
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(
          () => reject(new Error('Service Worker did not claim the page in time')),
          15_000,
        )
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => {
            window.clearTimeout(timer)
            resolve()
          },
          { once: true },
        )
      })
    }
    const keys = await caches.keys()
    const shellKey = keys.find((key) => key.startsWith('dsa-archive-shell-'))
    if (!shellKey) throw new Error('Precache bucket dsa-archive-shell-* not found')
    const cache = await caches.open(shellKey)
    const indexHit = await cache.match('/index.html')
    const offlineHit = await cache.match('/offline.html')
    if (!indexHit || !offlineHit) throw new Error('Precache is missing /index.html or /offline.html')
  })
}

async function expectFitsAndAccessible(page: Page) {
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  )
  expect(fits).toBe(true)
  const audit = await new AxeBuilder({ page }).analyze()
  expect(audit.violations).toEqual([])
}

test('manifest, icons and true airplane-mode cold open work signed out with guest data intact (6.1)', async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: phone })
  try {
    const page = await context.newPage()
    await page.goto('/')

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
    expect(manifest.theme_color).toBe('#101313')
    expect(manifest.background_color).toBe('#101313')
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4)
    for (const icon of manifest.icons) {
      const iconRes = await page.request.get(icon.src)
      expect(iconRes.ok()).toBe(true)
      expect((await iconRes.body()).byteLength).toBeGreaterThan(200)
    }

    await waitForServiceWorkerControl(page)

    // Record guest progress online, then close the tab before entering airplane mode.
    await page.locator('#topic-arrays summary').click()
    await page.locator('#problem-two-sum .status-check').click()
    await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')
    await page.close()

    // Enter Airplane Mode and cold-open `/` in a brand-new tab.
    await context.setOffline(true)
    const offlinePage = await context.newPage()
    await offlinePage.goto('/')

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

    await expect(offlinePage.getByRole('heading', { level: 1, name: 'Your learning sheet' })).toBeVisible()
    await expect(offlinePage.locator('details.topic-card')).toHaveCount(20)
    await expect(offlinePage.getByTestId('progress-pill')).toHaveText('1/495 done')

    // Search and mark another problem done while still in airplane mode.
    await offlinePage.getByLabel('Search problems').fill('linear search')
    await offlinePage.locator('#problem-linear-search .status-check').click()
    await expect(offlinePage.getByTestId('progress-pill')).toHaveText('2/495 done')
    await expectFitsAndAccessible(offlinePage)

    // Unknown route renders the friendly 404 screen even offline, and returns home.
    await offlinePage.goto('/missing-offline-route')
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

  // Phone (390×844) + large-text across dark and light across all views.
  await page.goto('/')
  await page.getByRole('button', { name: 'Toggle large text' }).click()
  await expect(page.locator('.app-root')).toHaveClass(/large-text/)

  for (const theme of ['dark', 'light'] as const) {
    if (theme === 'light') {
      await page.getByRole('button', { name: 'Switch to light appearance' }).click()
      await expect(page.locator('.app-root')).toHaveAttribute('data-theme', 'light')
    }
    for (const tab of ['sheet', 'today', 'revision', 'notes', 'lists', 'stats', 'friends']) {
      await page.getByTestId(`view-tab-${tab}`).click()
      if (tab === 'sheet') {
        await page.evaluate(() => {
          const topic = document.querySelector('#topic-arrays') as HTMLDetailsElement
          if (topic && !topic.open) topic.open = true
        })
      }
      await expectFitsAndAccessible(page)
    }
  }

  // Desktop (1280×900) + large-text + light, then back to dark.
  await page.setViewportSize(desktop)
  await page.getByTestId('view-tab-sheet').click()
  await expectFitsAndAccessible(page)
  await page.getByRole('button', { name: 'Switch to dark appearance' }).click()
  await expect(page.locator('.app-root')).toHaveAttribute('data-theme', 'dark')
  await expectFitsAndAccessible(page)

  // In-app 404 state in large-text mode.
  await page.setViewportSize(phone)
  await page.goto('/not-found-check')
  await expect(page.getByTestId('not-found-view')).toBeVisible()
  await expectFitsAndAccessible(page)
})

test('signed-in airplane-mode cold open preserves cloud progress and notes and syncs on reconnect (6.1 + 6.2)', async ({
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
    await page.goto('/')
    await waitForServiceWorkerControl(page)

    await page.getByTestId('emulator-sign-in').click()
    await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
    await expect(page.getByTestId('sync-pill')).toContainText('Synced')

    await page.locator('#topic-arrays summary').click()
    await page.locator('#problem-two-sum .status-check').click()
    await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')

    await page.getByTestId('note-button-two-sum').click()
    await page.getByTestId('note-markdown').fill('Saved before airplane mode.')
    await page.getByTestId('note-save').click()
    await expect(page.getByTestId('account-notice')).toContainText('Note saved')
    await expect(page.getByTestId('sync-pill')).toContainText('Synced')

    // Audit signed-in Friends & Today views in large-text mode on phone width.
    await page.getByRole('button', { name: 'Toggle large text' }).click()
    await page.getByTestId('view-tab-friends').click()
    await expectFitsAndAccessible(page)
    await page.getByTestId('view-tab-today').click()
    await expectFitsAndAccessible(page)
    await page.getByRole('button', { name: 'Toggle large text' }).click()

    await page.close()

    // Enter Airplane Mode and cold-open `/` in a fresh tab of the signed-in profile.
    await context.setOffline(true)
    const coldPage = await context.newPage()
    await coldPage.goto('/')
    await coldPage.evaluate(() => window.dispatchEvent(new Event('offline')))

    await expect(coldPage.getByTestId('signed-in-banner')).toContainText('CI Owner')
    await expect(coldPage.getByTestId('progress-pill')).toHaveText('1/495 done')
    await expect(coldPage.getByTestId('sync-pill')).toContainText('Offline')

    // Saved note is readable from IndexedDB persistent cache while completely offline.
    await coldPage.getByTestId('view-tab-notes').click()
    await expect(coldPage.getByTestId('note-card-two-sum')).toContainText('Saved before airplane mode.')

    // Solve another problem while in airplane mode, then reconnect and verify sync.
    await coldPage.getByTestId('view-tab-sheet').click()
    await coldPage.locator('#topic-arrays summary').click()
    await coldPage.locator('#problem-linear-search .status-check').click()
    await expect(coldPage.getByTestId('progress-pill')).toHaveText('2/495 done')
    await coldPage.screenshot({ path: 'test-results/pwa-offline-phone.png', fullPage: true })
    await expectFitsAndAccessible(coldPage)

    await context.setOffline(false)
    await coldPage.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(coldPage.getByTestId('sync-pill')).toContainText('Synced')

    const verifyPage = await verifyContext.newPage()
    await verifyPage.goto('/')
    await verifyPage.getByTestId('emulator-sign-in').click()
    await expect(verifyPage.getByTestId('progress-pill')).toHaveText('2/495 done')
    await verifyPage.getByTestId('view-tab-notes').click()
    await expect(verifyPage.getByTestId('note-card-two-sum')).toContainText('Saved before airplane mode.')
  } finally {
    await context.close()
    await verifyContext.close()
  }
})
