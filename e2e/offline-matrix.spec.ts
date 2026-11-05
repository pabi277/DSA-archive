import { expect, test } from '@playwright/test'
import { ALL_ROUTES, desktop, open, openTopic, phone } from './helpers'
import { waitForServiceWorkerControl } from './matrix'

/**
 * Phase v2-09 §5 / §10 — the completed offline matrix.
 *
 * `e2e/pwa.spec.ts` proves a cold airplane-mode open of `/` and that every URL
 * renders something. This spec proves what each of those screens *contains*
 * offline: cached Today data, all 20 topics, the primer, an authored statement,
 * a runnable quiz, the review queue, the code screen, the "video offline" state,
 * and the runner's honest "cached/unavailable" line. The signed-in
 * "save offline → sync later" case stays in pwa.spec.ts (shared helper above),
 * so the two specs do not race the same emulator profile.
 */
test.describe('phase v2-09 offline matrix', () => {
  test('cold offline open of every route with its designed content', async ({ browser }) => {
    test.setTimeout(300_000)
    const context = await browser.newContext({ viewport: phone })
    try {
      const page = await context.newPage()
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await open(page, '/')
      await waitForServiceWorkerControl(page)

      // Guest data written online must still be there in a cold offline tab.
      await open(page, '/#/search')
      await openTopic(page)
      await page.getByTestId('status-two-sum').click()
      await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')
      await page.close()

      await context.setOffline(true)
      const cold = await context.newPage()
      await cold.emulateMedia({ reducedMotion: 'reduce' })
      await open(cold, '/')

      // The network is genuinely gone, and the stylesheet came from the shell
      // precache (no unstyled flash on a cold offline boot).
      const blocked = await cold.evaluate(async () => {
        try {
          await fetch(`/uncached-probe-${Date.now()}.txt`, { cache: 'no-store' })
          return false
        } catch {
          return true
        }
      })
      expect(blocked).toBe(true)
      expect(await cold.evaluate(() => document.styleSheets.length)).toBeGreaterThan(0)

      for (const route of ALL_ROUTES) {
        await open(cold, route)
        await expect(cold.getByTestId('page-header'), `${route} must render offline`).toBeVisible()
      }

      // Today: cached guest progress, not an empty shell.
      await open(cold, '/#/today')
      await expect(cold.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
      await expect(cold.getByTestId('progress-pill')).toHaveText('1/495 done')

      // Topics and the authored Arrays primer are in the precached bundle.
      await open(cold, '/#/topics')
      await expect(cold.getByTestId(/^topic-tile-/)).toHaveCount(20)
      await open(cold, '/#/topic/arrays')
      await expect(cold.getByTestId('topic-page')).toBeVisible()
      await expect(cold.getByTestId('topic-primer')).toBeVisible()

      // Statement + code + stamps on a problem route; the player shows its
      // designed offline state and never creates a YouTube frame.
      await open(cold, '/#/problem/linear-search')
      await expect(cold.getByTestId('statement-what')).toContainText(/first position where the target appears/i)
      const stageState = await cold.getByTestId('theatre-stage').getAttribute('data-state')
      expect(['offline', 'no-video', 'dead']).toContain(stageState)
      if (stageState === 'offline') {
        await expect(cold.getByTestId('theatre-placeholder')).toContainText('The page still works offline')
      }
      await expect(cold.locator('iframe[src*="youtube"]')).toHaveCount(0)
      await open(cold, '/#/problem/linear-search?tab=code')
      await expect(cold.getByTestId('problem-panel-code')).toBeVisible()
      await open(cold, '/#/problem/linear-search?tab=stamps')
      await expect(cold.getByTestId('stamps-list').first()).toBeVisible()

      // Quiz run and revision queue are pure local data.
      await open(cold, '/#/quiz/arrays')
      await expect(cold.getByTestId('quiz-question-prompt')).toBeVisible()
      await open(cold, '/#/review')
      await expect(cold.getByTestId('page-header')).toBeVisible()
      await open(cold, '/#/code')
      await expect(cold.getByTestId('code-signed-out').or(cold.getByTestId('code-view'))).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('a warm runner says "cached/unavailable" when the network drops', async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'the runner panel needs a signed-in code tab')
    test.setTimeout(120_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize(desktop)
    await open(page, '/')
    await page.getByTestId('emulator-sign-in').click({ timeout: 20_000 })
    await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
    await open(page, '/#/problem/two-sum?tab=code')
    await expect(page.getByTestId('runner-panel')).toBeVisible({ timeout: 20_000 })
    await page.context().setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.getByTestId('runner-offline')).toBeVisible()
    await expect(page.getByTestId('runner-offline')).toContainText('already cached')
    await page.context().setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.getByTestId('runner-offline')).toHaveCount(0)
  })

  test('video route keeps the statement and code while offline', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize(desktop)
    await open(page, '/#/problem/linear-search')
    await page.context().setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.getByTestId('theatre-stage')).toHaveAttribute('data-state', 'offline')
    await expect(page.getByTestId('theatre-placeholder')).toContainText('The page still works offline')
    await expect(page.getByTestId('statement-what')).toContainText(/first position where the target appears/i)
    await expect(page.locator('iframe[src*="youtube"]')).toHaveCount(0)
    await page.context().setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
  })
})
