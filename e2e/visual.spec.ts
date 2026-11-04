import { expect, test, type Page } from '@playwright/test'
import { desktop, open, openTopic, phone } from './helpers'

/**
 * Visual baselines for phases v2-01/02/03/04: 2 viewports × 2 themes × 14 routes
 * = 56 committed snapshots (statement, hint open, primer, practice grid in 03;
 * the Code screen and the problem-page code panel in 04 — both signed-out
 * states here, while the emulator code.spec covers editor/peek with data).
 *
 * Baselines are generated once, in CI, against the real font subsets, and
 * committed by hand — never auto-accepted. Locally (and in this sandbox, where
 * Chromium cannot be downloaded) the specs are opt-in: run
 * `VISUAL_BASELINES=1 npm run test:e2e -- visual` to regenerate, then review the
 * PNG diff before committing it.
 */

const ROUTES = [
  { path: '/#/today', slug: 'today' },
  { path: '/#/topics', slug: 'topics' },
  { path: '/#/topic/arrays', slug: 'topic-learn' },
  { path: '/#/topic/arrays?tab=practice', slug: 'topic-practice' },
  { path: '/#/search', slug: 'search' },
  { path: '/#/review', slug: 'review' },
  { path: '/#/settings', slug: 'settings' },
  { path: '/#/not-found', slug: 'not-found' },
] as const

/** Phase 03 surfaces: statement, hint-open, authored primer and drill grid. */
const CONTENT_ROUTES: { path: string; slug: string; hint?: boolean }[] = [
  { path: '/#/problem/linear-search', slug: 'statement' },
  { path: '/#/problem/linear-search', slug: 'hint-open', hint: true },
  { path: '/#/topic/arrays', slug: 'primer' },
  { path: '/#/practice', slug: 'practice-grid' },
  { path: '/#/code', slug: 'code' },
  { path: '/#/problem/two-sum', slug: 'problem-code' },
]

const VIEWPORTS = [
  { name: 'phone', size: phone },
  { name: 'desktop', size: desktop },
] as const

test.skip(
  !process.env.VISUAL_BASELINES && !process.env.CI,
  'Visual baselines run in CI (or with VISUAL_BASELINES=1 after a deliberate review)',
)

/** Theme via the real control, so the capture shows reachable state. */
async function setTheme(page: Page, theme: 'dark' | 'light') {
  const current = await page.locator('.app-root').getAttribute('data-theme')
  if (current !== theme) await page.getByTestId('theme-toggle').click()
  await expect(page.locator('.app-root')).toHaveAttribute('data-theme', theme)
}

for (const viewport of VIEWPORTS) {
  for (const theme of ['dark', 'light'] as const) {
    for (const route of [...ROUTES, ...CONTENT_ROUTES]) {
      test(`${route.slug} · ${viewport.name} · ${theme}`, async ({ page }) => {
        await page.setViewportSize(viewport.size)
        await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme })
        await open(page, route.path)
        await setTheme(page, theme)
        // The sheet only shows rows inside an open topic; the snapshot must
        // cover row anatomy, so open the first one deterministically.
        if (route.slug === 'search') await openTopic(page)
        if ('hint' in route && route.hint) {
          await page.locator('[data-testid="hint-details"] summary').click()
          await expect(page.getByTestId('hint-details')).toHaveAttribute('open', '')
        }
        await expect(page.getByTestId('page-header')).toBeVisible()

        await expect(page).toHaveScreenshot(`${route.slug}-${viewport.name}-${theme}.png`, {
          fullPage: true,
          animations: 'disabled',
          caret: 'hide',
          // Fonts are self-hosted subsets and motion is off; the only tolerated
          // diff is sub-pixel antialiasing on the shadowed surfaces.
          maxDiffPixelRatio: 0.02,
        })
      })
    }
  }
}
