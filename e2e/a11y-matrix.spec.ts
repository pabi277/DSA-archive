import { expect, test } from '@playwright/test'
import { auditPage, open, phone } from './helpers'
import {
  KEY_ROUTES,
  MATRIX_PROFILES,
  applyProfile,
  auditRoutes,
  expectFits,
} from './matrix'

/**
 * Phase v2-09 §4 / §7 — the completed accessibility matrix.
 *
 * 390×844 · 768×1024 · 1440×900, dark + light, the shipped large-text step,
 * an 18 px base override, prefers-reduced-motion and keyboard-only operation.
 * `auditRoutes` opens *every* routed screen (including the windowed sheet with
 * an open topic), checks zero horizontal overflow and runs axe on our document
 * only. New v2 surfaces get their own test below.
 */
test.describe('phase v2-09 a11y matrix', () => {
  for (const profile of MATRIX_PROFILES) {
    test(`${profile.name}: every route, axe 0, no overflow`, async ({ page }) => {
      test.setTimeout(300_000)
      await applyProfile(page, profile)
      await auditRoutes(page)
    })
  }

  test('an 18 px text base stays accessible and inside the viewport', async ({ page }) => {
    test.setTimeout(180_000)
    await applyProfile(page, {
      name: 'phone-18px',
      size: phone,
      theme: 'dark',
      largeText: false,
      reducedMotion: 'reduce',
      baseTextPx: 18,
    })
    await auditRoutes(page, KEY_ROUTES)
  })

  test('motion is allowed but no theme cross-fade can fail a steady-state contrast audit', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.setViewportSize(phone)
    await open(page, '/#/today')
    // Every surface cross-fades for --motion-micro (120 ms). axe samples one
    // instant, so wait for the steady state instead of auditing a half-fade.
    await page.waitForTimeout(300)
    await expectFits(page)
    const audit = await auditPage(page).analyze()
    expect(audit.violations).toEqual([])
  })

  test('keyboard only: focus is visible and never trapped', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize(phone)
    for (const route of ['/#/today', '/#/search', '/#/quiz/arrays', '/#/settings']) {
      await open(page, route)
      const stops = new Set<string>()
      let ringed = 0
      let missingRing = 0
      for (let step = 0; step < 25; step += 1) {
        await page.keyboard.press('Tab')
        const focus = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null
          if (!el || el === document.body) return null
          const style = getComputedStyle(el)
          const box = el.getBoundingClientRect()
          return {
            // Position disambiguates two otherwise identical sibling buttons.
            key: `${el.tagName}|${el.className}|${Math.round(box.top)}:${Math.round(box.left)}`,
            focusVisible: el.matches(':focus-visible'),
            hasRing:
              (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2) ||
              style.boxShadow !== 'none',
          }
        })
        if (!focus) continue
        stops.add(focus.key)
        if (focus.focusVisible) {
          if (focus.hasRing) ringed += 1
          else missingRing += 1
        }
      }
      // Many distinct stops prove no modal traps Tab on a single element.
      expect(stops.size, `${route}: Tab must move through the page`).toBeGreaterThan(3)
      expect(ringed, `${route}: at least one keyboard-focused control must show a ring`).toBeGreaterThan(0)
      expect(missingRing, `${route}: every keyboard-focused control must show a ring`).toBe(0)
    }
  })

  test('the new v2 surfaces pass axe: palette, radiogroup, editor, runner output, stamps', async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'the editor and runner need the CI Auth emulator')
    test.setTimeout(180_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize(phone)
    // `CodePanel` only mounts the editor + lazy RunPanel for a signed-in
    // learner; signed out it shows "Save your solution here" instead.
    await open(page, '/')
    await page.getByTestId('emulator-sign-in').click({ timeout: 20_000 })
    await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')

    await open(page, '/#/today')
    await page.getByTestId('palette-trigger').click()
    await expect(page.getByTestId('palette-input')).toBeVisible()
    expect((await auditPage(page).analyze()).violations, 'command palette').toEqual([])
    await page.keyboard.press('Escape')

    await open(page, '/#/quiz/arrays')
    await expect(page.getByRole('radiogroup')).toBeVisible()
    expect((await auditPage(page).analyze()).violations, 'quiz radiogroup').toEqual([])

    await open(page, '/#/problem/two-sum?tab=code')
    await expect(page.getByTestId('code-editor').or(page.getByTestId('code-panel'))).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('runner-panel')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('runner-output')).toBeVisible({ timeout: 20_000 })
    expect((await auditPage(page).analyze()).violations, 'editor + runner output').toEqual([])

    await open(page, '/#/problem/two-sum?tab=stamps')
    await expect(page.getByTestId('stamps-list').first()).toBeVisible()
    expect((await auditPage(page).analyze()).violations, 'stamps list').toEqual([])
  })
})
