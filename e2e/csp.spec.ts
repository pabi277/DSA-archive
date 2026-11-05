import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { auditPage, open, phone } from './helpers'

/**
 * Phase v2-09 — CSP: report-only first, confirm zero violations, then enforce.
 *
 * The deployed header in `firebase.json` is the single source of truth and is
 * checked byte-for-byte by `npm run check:csp`. Here we drive both *stages* in
 * real Chromium: first the report-only header while the whole app is exercised
 * (a `securitypolicyviolation` listener records any blocked source), then the
 * enforced header with the same routes and real interactions. Finally the SW v2
 * "New version ready — Reload" toast is proven reachable and accessible.
 *
 * Service Workers are blocked in this context so page.route reliably sees the
 * document response; the offline/SW behaviour has its own specs.
 */
test.use({ serviceWorkers: 'block', viewport: phone })

const ROUTES = [
  '/#/today',
  '/#/topics',
  '/#/topic/arrays',
  '/#/problem/two-sum',
  // The problem-page Code tab (a lazy add-on chunk) under the enforced policy.
  '/#/problem/two-sum?tab=code',
  '/#/code',
  '/#/settings',
] as const

type Violation = { directive: string; blockedURI: string; disposition: string }

/** The single deployed header, plus the CI-only emulator variant of connect-src. */
function policies() {
  const config = JSON.parse(readFileSync('firebase.json', 'utf8')) as {
    hosting: { headers: { source: string; headers: { key: string; value: string }[] }[] }
  }
  const wildcard = config.hosting.headers.find((entry) => entry.source === '**')
  const production = wildcard?.headers.find((entry) => entry.key === 'Content-Security-Policy')?.value ?? ''
  const loopback = 'http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*'
  const emulator = production.replace("connect-src 'self'", `connect-src 'self' ${loopback}`)
  return { production, emulator }
}

async function installCsp(page: Page, headerName: string, policy: string) {
  await page.addInitScript(() => {
    const store = window as unknown as { __cspViolations: Violation[] }
    store.__cspViolations = []
    document.addEventListener(
      'securitypolicyviolation',
      (event) => {
        store.__cspViolations.push({
          directive: event.violatedDirective,
          blockedURI: event.blockedURI,
          disposition: event.disposition,
        })
      },
      true,
    )
  })
  await page.route('**/*', async (route) => {
    const request = route.request()
    // Only the document needs the header; subresources inherit it from the
    // document. Intercepting every asset would double every request on CI.
    if (!request.isNavigationRequest() || /^(data|blob|about):/i.test(request.url())) {
      await route.continue()
      return
    }
    const response = await route.fetch()
    await route.fulfill({
      response,
      headers: { ...response.headers(), [headerName.toLowerCase()]: policy },
    })
  })
}

function violations(page: Page) {
  return page.evaluate(() => (window as unknown as { __cspViolations: Violation[] }).__cspViolations)
}

test('the deployed CSP is the policy we are about to enforce', () => {
  const { production } = policies()
  expect(production).toContain("frame-src 'self' https://www.youtube.com")
  expect(production).toContain("worker-src 'self' blob:")
  expect(production).toContain("script-src-elem 'self' https://www.youtube.com/iframe_api")
  expect(production).not.toMatch(/127\.0\.0\.1|localhost|report-uri|report-to/)
})

test('stage 1 — report-only: zero violations across the six core routes', async ({ page }) => {
  test.setTimeout(180_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await installCsp(page, 'Content-Security-Policy-Report-Only', policies().emulator)
  for (const route of ROUTES) {
    await open(page, route)
    await expect(page.getByTestId('page-header')).toBeVisible()
  }
  const found = await violations(page)
  expect(found, `report-only CSP violations: ${JSON.stringify(found)}`).toEqual([])
})

test('stage 2 — enforced: zero violations and the app still works', async ({ page }) => {
  test.setTimeout(180_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await installCsp(page, 'Content-Security-Policy', policies().emulator)
  for (const route of ROUTES) {
    await open(page, route)
    await expect(page.getByTestId('page-header')).toBeVisible()
  }
  // Real interactions under the enforced policy: scripts, styles, the router,
  // the Firebase emulator connection and the quiz radiogroup all still work.
  await open(page, '/#/topics')
  await expect(page.getByTestId(/^topic-tile-/)).toHaveCount(20)
  await open(page, '/#/quiz/arrays')
  await expect(page.getByRole('radiogroup')).toBeVisible()
  await open(page, '/#/settings')
  await page.getByTestId('theme-toggle').click()
  await expect(page.locator('.app-root')).toHaveAttribute('data-theme', 'light')
  // The runner's CSS arrives inside its lazy add-on chunk and is injected as a
  // <style> element. Static Hosting cannot issue a nonce, so style-src-elem
  // keeps a narrow inline allowance; prove it here without a signed-in session.
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.setAttribute('data-csp-probe', '')
    style.textContent = '.csp-probe { color: inherit }'
    document.head.appendChild(style)
  })
  const found = await violations(page)
  expect(found, `enforced CSP violations: ${JSON.stringify(found)}`).toEqual([])
})

test('SW v2 — "New version ready" is visible, keyboard reachable and dismissible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, '/#/today')
  // The Service Worker posts this message when a hash-versioned update is
  // waiting. Dispatching it on the container exercises the exact app path
  // without needing to force a real SW upgrade inside the test runner.
  await page.evaluate(() => {
    navigator.serviceWorker.dispatchEvent(
      new MessageEvent('message', { data: { type: 'DSA_UPDATE_READY', cacheName: 'dsa-archive-shell-test' } }),
    )
  })
  const toast = page.getByTestId('sw-update')
  await expect(toast).toBeVisible()
  await expect(toast).toContainText('New version ready')
  await expect(page.getByTestId('sw-update-reload')).toBeVisible()
  const audit = await auditPage(page).analyze()
  expect(audit.violations, 'the update toast must be accessible').toEqual([])
  await page.getByTestId('sw-update-dismiss').click()
  await expect(toast).toHaveCount(0)
})
