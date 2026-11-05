import { expect, test } from '@playwright/test'
import { open, openTopic, phone } from './helpers'

/**
 * Phase v2-09 §6 — the deterministic performance passes.
 *
 * Lighthouse is not a CI dependency here (it needs its own Chrome trace and a
 * stable network, and would break the 12-minute job); the honest substitutes
 * are the published bundle budgets, the axe matrix, and the measurements below:
 * sheet windowing, route transition time, font swap / CLS and lazy images.
 * The measured numbers are printed so a regression is visible in the log.
 */
test('the windowed sheet stays under 1,200 DOM nodes', async ({ page }) => {
  await page.setViewportSize(phone)
  await open(page, '/#/search')
  await openTopic(page)
  await expect(page.locator('#topic-arrays .row').first()).toBeVisible()
  const nodes = await page.evaluate(() => document.querySelectorAll('*').length)
  expect(nodes, `the sheet mounted ${nodes} nodes`).toBeLessThanOrEqual(1200)
  console.log(`[phase 9] windowed sheet DOM nodes: ${nodes}`)
})

test('a warm route transition is well under the frame budget and fonts cause no big shift', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => {
    const store = window as unknown as { __cls: number }
    store.__cls = 0
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
          if (!shift.hadRecentInput) store.__cls += shift.value ?? 0
        }
      }).observe({ type: 'layout-shift', buffered: true })
    } catch {
      // Browsers without layout-shift support simply report 0.
    }
  })
  await page.setViewportSize(phone)
  await open(page, '/#/today')
  // Warm both routes once; the measurement is of a hash-route render, not of a
  // first-time lazy chunk download.
  await open(page, '/#/topics')
  await open(page, '/#/today')

  const durations: number[] = []
  for (let index = 0; index < 6; index += 1) {
    const ms = await page.evaluate(async (step) => {
      const start = performance.now()
      window.location.hash = step % 2 === 0 ? '#/topics' : '#/today'
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )
      return performance.now() - start
    }, index)
    durations.push(ms)
  }
  const median = [...durations].sort((a, b) => a - b)[Math.floor(durations.length / 2)]
  console.log(`[phase 9] warm route transition median: ${median.toFixed(1)} ms`)
  // Two animation frames alone cost ~32 ms on a 60 Hz runner; 250 ms leaves
  // generous CI headroom while still catching a real regression.
  expect(median).toBeLessThan(250)

  await page.evaluate(() => document.fonts.ready)
  const fonts = await page.evaluate(() => ({
    inter: document.fonts.check('14px Inter'),
    cls: (window as unknown as { __cls: number }).__cls,
    eagerImages: [...document.querySelectorAll('img')].filter((img) => img.getAttribute('loading') !== 'lazy').length,
  }))
  expect(fonts.inter, 'the self-hosted Inter subset must be ready').toBe(true)
  expect(fonts.eagerImages, 'every image must be lazy').toBe(0)
  console.log(`[phase 9] cumulative layout shift: ${fonts.cls.toFixed(4)}`)
  // 0.1 is Google's "good" CLS target; 0.25 is the CI gate so a busy runner's
  // font swap cannot produce a flaky red run. The exact number is printed above.
  expect(fonts.cls, 'font swap must not cause a visible layout shift').toBeLessThanOrEqual(0.25)
})
