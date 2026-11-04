import { expect, test, type Page } from '@playwright/test'
import { desktop, open, phone, auditPage } from './helpers'

/**
 * Phase v2-06 "Done means" in CI: `#/problem/<id>` is a theatre.
 *
 * Two things make this spec deterministic instead of flaky:
 *
 *  · **No YouTube request.** `installFakePlayer` pre-defines `window.YT.Player`
 *    before the app boots, which is the documented global the official IFrame
 *    API installs — so `loadIframeApi` resolves without ever fetching
 *    `youtube.com/iframe_api`. The fake builds a real 16:9 iframe (so the
 *    geometry assertions mean something), answers the documented getters, and
 *    can be told to report a documented error code.
 *  · **No unauthenticated writes.** Stamps live in the snippet document, so the
 *    stamp tests sign in through the Auth emulator exactly like `code.spec.ts`.
 *
 * What is asserted is *our* chrome, never the remote player's behaviour: play
 * state, the seek maths, the stamp round-trip, the mini player hand-off, the
 * dead-link fallback and the offline state. Autoplay is never asserted.
 */

type FakeOptions = {
  /** Report this documented error code instead of becoming ready. */
  error?: number
  /** Runtime in seconds the fake reports (default 600). */
  duration?: number
}

async function installFakePlayer(page: Page, options: FakeOptions = {}) {
  const duration = options.duration ?? 600
  const error = options.error ?? null
  await page.addInitScript(
    ({ duration, error }: { duration: number; error: number | null }) => {
      const state = { current: 0, rate: 1, playing: false, destroyed: false }
      class FakePlayer {
        frame: HTMLIFrameElement
        events: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: (e: { data: number }) => void }
        constructor(element: HTMLElement, config: Record<string, any>) {
          this.events = config.events ?? {}
          const frame = document.createElement('iframe')
          frame.src = `https://www.youtube-nocookie.com/embed/${config.videoId ?? ''}?enablejsapi=1`
          frame.title = `Video: ${config.videoId ?? ''}`
          element.replaceChildren(frame)
          this.frame = frame
          window.setTimeout(() => {
            if (error === null) this.events.onReady?.()
            else this.events.onError?.({ data: error })
          }, 30)
        }
        getIframe() { return this.frame }
        getCurrentTime() { return state.current }
        getDuration() { return duration }
        getPlayerState() { return state.playing ? 1 : 2 }
        playVideo() { state.playing = true; this.events.onStateChange?.({ data: 1 }) }
        pauseVideo() { state.playing = false; this.events.onStateChange?.({ data: 2 }) }
        seekTo(seconds: number) { state.current = seconds }
        setPlaybackRate(rate: number) { state.rate = rate }
        getAvailablePlaybackRates() { return [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] }
        getPlaybackRate() { return state.rate }
        loadModule() {}
        unloadModule() {}
        setOption() {}
        mute() {}
        unMute() {}
        destroy() { state.destroyed = true; this.frame.remove() }
      }
      // Exactly the global the official script installs.
      ;(window as any).YT = { Player: FakePlayer }
    },
    { duration, error },
  )
}

const theatreRoutes = ['/#/problem/two-sum', '/#/problem/introduction-to-graph']

test.beforeEach(async ({ page }) => {
  await installFakePlayer(page)
})

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
      await expect(page.getByTestId('theatre-captions')).toBeVisible()
      // Stamps live in the rail (desktop) or the Stamps tab (phone), never both.
      if (viewport === desktop) await expect(page.getByTestId('stamps-list').first()).toBeVisible()
      if (viewport === desktop) {
        await expect(page.getByTestId('rail-code')).toBeVisible()
        await expect(page.getByTestId('rail-leetcode')).toBeVisible()
        await expect(page.locator('.theatre-rail')).toBeVisible()
      } else {
        await expect(page.getByTestId('problem-tab-code')).toBeVisible()
        await expect(page.locator('.theatre-rail')).toHaveCount(0)
        await page.getByTestId('problem-tab-stamps').click({ timeout: 15_000 })
        await expect(page.getByTestId('stamps-list')).toBeVisible()
      }
      // The official embed URL is ours to build: documented params, no autoplay.
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

  test('captions are our own toggle and never rebuild the frame', async ({ page }) => {
    await open(page, '/#/problem/two-sum')
    const captions = page.getByTestId('theatre-captions')
    // On by default (`cc_load_policy=1`), which is what the phase contract asks for.
    await expect(captions).toHaveAttribute('aria-pressed', 'true')
    await captions.click({ timeout: 15_000 })
    await expect(captions).toHaveAttribute('aria-pressed', 'false')
    await page.keyboard.press('c')
    await expect(captions).toHaveAttribute('aria-pressed', 'true')
    // Toggling captions moved nothing: still one iframe, same document.
    await expect(page.locator('.theatre-frame iframe')).toHaveCount(1)
  })

  test('keyboard: space toggles play and the arrows seek, but never while typing', async ({ page }) => {
    // Signed in, because the typing half needs a stamp form to type into.
    test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'Requires the Firebase Emulator Suite in CI')
    await open(page, '/')
    await page.getByTestId('emulator-sign-in').click({ timeout: 20_000 })
    await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
    await open(page, '/#/problem/two-sum')
    const toggle = page.getByTestId('theatre-toggle')
    await expect(toggle).toHaveAttribute('aria-label', 'Play the video')
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press(' ')
    await expect(toggle).toHaveAttribute('aria-label', 'Pause the video')
    await page.keyboard.press('k')
    await expect(toggle).toHaveAttribute('aria-label', 'Play the video')

    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('theatre-clock')).toContainText('0:10')
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByTestId('theatre-clock')).toContainText('0:00')

    // A stamp draft is a text field: `s` must type, never stamp.
    await page.getByTestId('problem-tab-stamps').click({ timeout: 15_000 })
    await page.getByTestId('stamp-input').click({ timeout: 15_000 })
    await page.keyboard.type('s')
    await expect(page.getByTestId('stamp-input')).toHaveValue('s')
  })

  test('the mini player docks the same frame when the route changes and reopens it', async ({ page }) => {
    await open(page, '/#/problem/two-sum')
    await expect(page.locator('.theatre-frame iframe')).toHaveCount(1)
    await expect(page.getByTestId('mini-player')).toHaveCount(0)

    // Leave the problem: the frame survives in the mini player…
    await open(page, '/#/today')
    await expect(page.getByTestId('mini-player')).toBeVisible()
    await expect(page.getByTestId('mini-holder').locator('iframe')).toHaveCount(1)
    await expect(page.getByTestId('mini-title')).not.toBeEmpty()

    // Expand puts the learner back on the theatre, with the same single iframe.
    await page.getByTestId('mini-expand').click({ timeout: 15_000 })
    await expect(page.getByTestId('problem-screen')).toBeVisible()
    await expect(page.getByTestId('mini-player')).toHaveCount(0)
    await expect(page.locator('.theatre-frame iframe')).toHaveCount(1)

    // Close is an explicit act and stops it coming back.
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
    // The Settings card reports exactly what was tuned.
    await open(page, '/#/settings')
    await expect(page.getByTestId('speed-count')).toContainText('1 topic tuned')
    await page.getByTestId('speed-reset').click({ timeout: 15_000 })
    await expect(page.getByTestId('speed-count')).toContainText('All at 1×')
  })

  test('a video that reports a documented error shows the watch fallback', async ({ page }) => {
    // 150 = the owner does not allow embedding: the designed dead-link card,
    // never a blank frame.
    await installFakePlayer(page, { error: 150 })
    await open(page, '/#/problem/two-sum')
    await expect(page.getByTestId('theatre-placeholder')).toBeVisible()
    await expect(page.getByTestId('theatre-placeholder')).toContainText('does not allow this video to be embedded')
    const watch = page.getByTestId('theatre-watch-fallback')
    await expect(watch).toBeVisible()
    expect(await watch.getAttribute('href')).toContain('youtube.com/watch?v=')
    // Our control bar is gone — there is nothing to control.
    await expect(page.getByTestId('theatre-controls')).toHaveCount(0)
  })

  test('the offline state keeps the statement and the code rail', async ({ page }) => {
    await open(page, '/#/problem/two-sum')
    await page.context().setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.getByTestId('theatre-stage')).toHaveAttribute('data-state', 'offline')
    await expect(page.getByTestId('theatre-placeholder')).toContainText('The page still works offline')
    // Content is in the bundle: the statement renders with no network at all.
    await expect(page.getByTestId('problem-panel-problem')).toContainText(/Two Sum/i)
    await expect(page.getByTestId('problem-tab-code')).toBeVisible()
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

  test('?tab=code opens the code rail (the phase-04 deep link still works)', async ({ page }) => {
    await open(page, '/#/problem/two-sum?tab=code')
    await expect(page.getByTestId('problem-panel-code')).toBeVisible()
    await expect(page.getByTestId('problem-tab-code')).toHaveAttribute('aria-selected', 'true')
    // Switching tab writes the address, so reload lands on the same tab.
    await page.getByTestId('problem-tab-problem').click({ timeout: 15_000 })
    expect(page.url()).not.toContain('tab=code')
    await page.getByTestId('problem-tab-code').click({ timeout: 15_000 })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('problem-panel-code')).toBeVisible({ timeout: 20_000 })
  })

  test('an unknown problem explains itself (lazy route chunk resolves)', async ({ page }) => {
    await open(page, '/#/problem/not-a-problem')
    await expect(page.getByTestId('problem-missing')).toBeVisible()
  })

  for (const route of theatreRoutes) {
    test(`axe: no violations on ${route}`, async ({ page }) => {
      await open(page, route)
      const results = await auditPage(page).analyze()
      expect(results.violations).toEqual([])
    })
  }
})

/**
 * Stamps live in the snippet document, so this half needs the Auth + Firestore
 * emulators — the same gate `code.spec.ts` uses.
 */
test.describe('timeline stamps', () => {
  test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'Requires the Firebase Emulator Suite in CI')

  test('add, seek, delete, undo and survive a reload', async ({ page }) => {
    await open(page, '/')
    await page.getByTestId('emulator-sign-in').click({ timeout: 20_000 })
    await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')

    await open(page, '/#/problem/two-sum')
    await expect(page.getByTestId('stamps-empty').first()).toBeVisible()

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

    // Delete is undoable too.
    await page.getByTestId('stamp-delete-0').click({ timeout: 15_000 })
    await expect(page.getByTestId('stamp-0')).toHaveCount(0)
    await page.getByTestId('toast-action').click({ timeout: 15_000 })
    await expect(page.getByTestId('stamp-0')).toContainText('the hash map trick')
  })

  test('signed out, the stage still works and stamps say why they are read-only', async ({ page }) => {
    await open(page, '/#/problem/two-sum')
    await page.getByTestId('problem-tab-stamps').click({ timeout: 15_000 })
    await expect(page.getByTestId('stamps-disabled')).toContainText('Sign in to save stamps')
    await expect(page.getByTestId('stamp-input')).toHaveCount(0)
    // The player itself is never gated on an account.
    await expect(page.getByTestId('theatre-controls')).toBeVisible()
  })
})
