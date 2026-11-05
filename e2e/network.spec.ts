import { expect, test, type Page } from '@playwright/test'
import { ALL_ROUTES, open, phone } from './helpers'

/**
 * Phase v2-09 §7 / §10 — the network assertion.
 *
 * "Only Firebase + YouTube on video routes". Every cross-origin request is
 * recorded and then aborted, so the test is deterministic even on a CI runner
 * with internet access: YouTube's own frame never gets to pull in an ad host,
 * and we assert on what the *app* tried to reach, not on what an ad network
 * decided to load (the owner's phase-v2-06 decision leaves ads to the browser).
 */
const APP_ORIGIN = 'http://127.0.0.1:4173'
const VIDEO_HOST = /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|googleapis\.com|gstatic\.com|google\.com)$/i
const TRACKER = /analytics|doubleclick|googletagmanager|googlesyndication|facebook|mixpanel|sentry|telemetry|scorecardresearch|hotjar/i
const EMULATOR = /^http:\/\/127\.0\.0\.1:(8080|9099)\//

function external(url: string): boolean {
  if (/^(data|blob|about|chrome-extension):/i.test(url)) return false
  try {
    return new URL(url).origin !== APP_ORIGIN && !EMULATOR.test(url)
  } catch {
    return false
  }
}

/** Record and block every outbound third-party request for one page. */
async function watchNetwork(page: Page) {
  const seen: string[] = []
  await page.route('**/*', async (route) => {
    const url = route.request().url()
    if (external(url)) {
      seen.push(url)
      await route.abort()
      return
    }
    await route.continue()
  })
  return seen
}

const NON_VIDEO_ROUTES = ALL_ROUTES.filter((route) => !route.startsWith('/#/problem/'))

test('no third-party request on any non-video route, and the player is never fetched there', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize(phone)
  const seen = await watchNetwork(page)
  for (const route of NON_VIDEO_ROUTES) {
    await open(page, route)
    await expect(page.getByTestId('page-header')).toBeVisible()
  }
  // Firebase in CI talks to the local emulator, and every asset is same-origin.
  expect(seen, 'a non-video route reached a third party').toEqual([])
  expect(seen.filter((url) => /youtube|googlevideo|ytimg/i.test(url))).toEqual([])
  expect(seen.filter((url) => TRACKER.test(url))).toEqual([])
})

test('a problem with a video reaches only YouTube-family hosts, never a tracker', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize(phone)
  const seen = await watchNetwork(page)
  await open(page, '/#/problem/linear-search')
  await expect(page.getByTestId('theatre-stage')).toBeVisible({ timeout: 20_000 })
  // The official IFrame API is injected lazily on this route only. Whether the
  // network answers or not, every *attempt* must be a YouTube host.
  for (const url of seen) {
    let host = ''
    try {
      host = new URL(url).hostname
    } catch {
      // unreachable: the URL was already parsed by external()
    }
    expect(VIDEO_HOST.test(host), `unexpected third-party request: ${url}`).toBe(true)
    expect(TRACKER.test(url), `a tracker was requested: ${url}`).toBe(false)
  }
  // The app may be offline in CI, so zero attempted requests is also honest;
  // what matters is that nothing else was ever reached.
})
