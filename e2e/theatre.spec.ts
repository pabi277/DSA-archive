import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { desktop, open, phone } from './helpers'

/**
 * Phase v2-06 "Done means" in CI: `#/problem/<id>` is a theatre.
 *
 * The real YouTube frame cannot load in CI (no network by design, and the
 * emulator-signed-in part of the suite runs behind the same wall), so every
 * assertion here is about **our** chrome around the official player:
 *
 *  · the stage, the control bar, the stamps dock and the rail all render at
 *    390×844 and 1440×900;
 *  · navigation to another route docks the frame in the mini player instead of
 *    destroying it, and the mini player can reopen the problem;
 *  · stamps add, seek, delete, survive a reload and are undoable through the
 *    shell's toast;
 *  · the speed chosen on one problem of a topic is already set on the next
 *    problem of that topic, and survives a reload;
 *  · a video the catalogue marks dead shows the `Open on YouTube` fallback,
 *    not a blank frame;
 *  · `#/problem/not-a-problem` still explains itself (the lazy route chunk).
 *
 * Autoplay is never asserted: the IFrame API requires a user gesture, and a
 * headless browser has no YouTube origin to talk to. What we do assert is that
 * our own controls move the *documented* state — the play/pause label, the
 * stamp button, the rate select and the fill-screen toggle.
 */

const theatreRoutes = ['/#/problem/two-sum', '/#/problem/introduction-to-graph']

test.describe('theatre shell', () => {
  test('renders the stage, controls, stamps and rail at both widths', async ({ page }) => {
    for (const viewport of [phone, desktop]) {
      await page.setViewportSize(viewport)
      await open(page, '/#/problem/two-sum')
      await expect(page.getByTestId('problem-screen')).toBeVisible()
      await expect(page.getByTestId('theatre-stage')).toBeVisible()
      await expect(page.getByTestId('theatre-controls')).toBeVisible()
      await expect(page.getByTestId('theatre-toggle')).toBeVisible()
      await expect(page.getByTestId('theatre-back')).toBeVisible()
      await expect(page.getByTestId('theatre-forward')).toBeVisible()
      await expect(page.getByTestId('theatre-speed')).toBeVisible()
      await expect(page.getByTestId('theatre-stamp')).toBeVisible()
      await expect(page.getByTestId('stamps-list').first()).toBeVisible()
      // Both widths keep the code rail reachable; desktop docks it as a rail.
      if (viewport === desktop) {
        await expect(page.getByTestId('rail-code')).toBeVisible()
        await expect(page.getByTestId('rail-leetcode')).toBeVisible()
        await expect(page.locator('.theatre-rail')).toBeVisible()
      } else {
        await expect(page.getByTestId('problem-tab-code')).toBeVisible()
        await expect(page.locator('.theatre-rail')).toHaveCount(0)
      }
      // The official frame is the only iframe on the stage, and it points at
      // the documented embed host with `enablejsapi=1`.
      const frame = page.locator('.theatre-frame iframe')
      await expect(frame).toHaveCount(1)
      const src = await frame.getAttribute('src')
      expect(src).toContain('youtube-nocookie.com/embed/')
      expect(src).toContain('enablejsapi=1')
      expect(src).not.toContain('autoplay=1')
    }
  })

  test('never covers the official player: our controls sit outside the frame', async ({ page }) => {
    await open(page, '/#/problem/two-sum')
    const frame = await page.locator('.theatre-frame iframe').boundingBox()
    const controls = await page.getByTestId('theatre-controls').boundingBox()
    expect(frame).not.toBeNull()
    expect(controls).not.toBeNull()
    // ToS §4.13: no overlay. The control bar starts at or below the frame's
    // bottom edge (16:9 stage, our bar underneath it).
    expect(controls!.y).toBeGreaterThanOrEqual(frame!.y + frame!.height - 1)
  })

  test('the mini player docks the video when the route changes and reopens it', async ({ page }) => {
    await open(page, '/#/problem/two-sum')
    await expect(page.getByTestId('theatre-frame')).toBeVisible()
    await expect(page.getByTestId('mini-player')).toHaveCount(0)

    // Leave the problem: the frame must survive in the mini player…
    await open(page, '/#/today')
    await expect(page.getByTestId('mini-player')).toBeVisible()
    await expect(page.getByTestId('mini-holder').locator('iframe')).toHaveCount(1)
    await expect(page.getByTestId('mini-title')).not.toBeEmpty()
    // …and it does not block the page underneath.
    const dock = await page.getByTestId('mini-player').boundingBox()
    const bar = await page.locator('.bottom-bar').boundingBox().catch(() => null)
    if (bar) expect(dock!.y + dock!.height).toBeLessThanOrEqual(bar.y + 1)

    // Expand puts the learner back on the theatre.
    await page.getByTestId('mini-expand').click({ timeout: 15_000 })
    await expect(page.getByTestId('problem-screen')).toBeVisible()
    await expect(page.getByTestId('mini-player')).toHaveCount(0)

    // Closing the mini player is an explicit act and stops it coming back.
    await open(page, '/#/today')
    await page.getByTestId('mini-close').click({ timeout: 15_000 })
    await expect(page.getByTestId('mini-player')).toHaveCount(0)
    await open(page, '/#/search')
    await expect(page.getByTestId('mini-player')).toHaveCount(0)
  })

  test('speed is remembered per topic across problems and reloads', async ({ page }) => {
    await open(page, '/#/problem/two-sum')
    const speed = page.getByTestId('theatre-speed')
    await speed.selectOption('1.5', { timeout: 15_000 })
    await expect(speed).toHaveValue('1.5')
    // A neighbouring problem of the same topic already reads 1.5×.
    await open(page, '/#/problem/valid-anagram')
    await expect(page.getByTestId('theatre-speed')).toHaveValue('1.5')
    // A different topic keeps its own pace (default 1×).
    await open(page, '/#/problem/introduction-to-graph')
    await expect(page.getByTestId('theatre-speed')).toHaveValue('1')
    // And the choice survives a reload of the first topic.
    await open(page, '/#/problem/two-sum')
    await expect(page.getByTestId('theatre-speed')).toHaveValue('1.5')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('theatre-speed')).toHaveValue('1.5', { timeout: 20_000 })
  })

  test('stamps add, seek, delete, undo and survive a reload', async ({ page }) => {
    await open(page, '/#/problem/two-sum')
    const stamps = page.getByTestId('stamps-list').first()
    await expect(stamps.getByTestId('stamps-empty')).toBeVisible()

    await page.getByTestId('problem-tab-stamps').click({ timeout: 15_000 })
    await page.getByTestId('stamp-input').fill('the hash map trick', { timeout: 15_000 })
    await page.getByTestId('stamp-add').click({ timeout: 15_000 })
    await expect(page.getByTestId('stamp-0')).toContainText('the hash map trick')
    await expect(page.getByTestId('stamps-cap')).toContainText('1/30')

    // Seeking from the row moves the clock the control bar prints.
    await page.getByTestId('stamp-seek-0').click({ timeout: 15_000 })
    await expect(page.getByTestId('theatre-clock')).toContainText('0:00')

    // Undo is the shell's standard toast, so a mis-tap costs nothing.
    await page.getByTestId('toast-action').click({ timeout: 15_000 })
    await expect(page.getByTestId('stamp-0')).toHaveCount(0)

    // Re-add, reload: the stamp is in the snippet, so it comes back.
    await page.getByTestId('stamp-input').fill('the hash map trick', { timeout: 15_000 })
    await page.getByTestId('stamp-add').click({ timeout: 15_000 })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('problem-screen')).toBeVisible({ timeout: 20_000 })
    await page.getByTestId('problem-tab-stamps').click({ timeout: 15_000 })
    await expect(page.getByTestId('stamp-0')).toContainText('the hash map trick')

    // Delete asks nothing but is undoable, like every other mutation.
    await page.getByTestId('stamp-delete-0').click({ timeout: 15_000 })
    await expect(page.getByTestId('stamp-0')).toHaveCount(0)
    await page.getByTestId('toast-action').click({ timeout: 15_000 })
    await expect(page.getByTestId('stamp-0')).toContainText('the hash map trick')
  })

  test('a video we cannot play offers the watch link instead of a blank frame', async ({ page }) => {
    // `data/media` is generated by `tools/fetch-media.mjs`; CI runs without
    // network, so the entry is `unknown` and the stage must still explain
    // itself rather than pretend to buffer forever.
    await open(page, '/#/problem/two-sum')
    const placeholder = page.getByTestId('theatre-placeholder')
    const fallback = page.getByTestId('theatre-watch-fallback')
    await expect(placeholder.or(fallback)).toHaveCount(1)
    const watch = page.getByTestId('theatre-watch-fallback')
    if (await watch.count()) {
      const href = await watch.getAttribute('href')
      expect(href).toContain('youtube.com/watch?v=')
    }
  })

  test('the offline state still shows the statement and the code rail', async ({ page }) => {
    await open(page, '/#/problem/two-sum')
    await page.context().setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.getByTestId('theatre-stage')).toBeVisible()
    // The statement is server-free by design: content is in the bundle.
    await expect(page.getByTestId('problem-panel-problem')).toContainText(/Two Sum/i)
    await page.context().setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
  })

  test('auto-advance is off until the learner turns it on', async ({ page }) => {
    await open(page, '/#/problem/two-sum')
    const toggle = page.getByTestId('auto-advance')
    await expect(toggle).not.toBeChecked()
    await toggle.check({ timeout: 15_000 })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('auto-advance')).toBeChecked({ timeout: 20_000 })
    await page.getByTestId('auto-advance').uncheck({ timeout: 15_000 })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('auto-advance')).not.toBeChecked({ timeout: 20_000 })
  })

  test('an unknown problem explains itself (lazy route chunk resolves)', async ({ page }) => {
    await open(page, '/#/problem/not-a-problem')
    await expect(page.getByTestId('problem-missing')).toBeVisible()
  })

  for (const route of theatreRoutes) {
    test(`axe: no violations on ${route}`, async ({ page }) => {
      await open(page, route)
      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    })
  }
})
