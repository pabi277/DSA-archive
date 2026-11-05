import { expect, type Page } from '@playwright/test'
import { ALL_ROUTES, auditPage, desktop, open, openTopic, phone } from './helpers'

/**
 * Phase v2-09 test-suite consolidation. One Playwright project (`chromium` in
 * playwright.config.ts) with explicit viewport/theme profiles: two projects
 * would re-run all 18 feature specs twice and blow the 12-minute CI ceiling.
 * Every new matrix spec goes through these helpers so they cannot disagree
 * about how a route is opened, how a theme is applied or how axe is scoped.
 */

export const tablet = { width: 768, height: 1024 } as const

export type MatrixProfile = {
  name: string
  size: { width: number; height: number }
  theme: 'dark' | 'light'
  largeText: boolean
  reducedMotion: 'reduce' | 'no-preference'
  /** Optional WCAG "18 px base" override, applied on every document load. */
  baseTextPx?: number
}

/** 3 widths × 2 themes, with large text exercised across all three widths. */
export const MATRIX_PROFILES: readonly MatrixProfile[] = [
  { name: 'phone-dark', size: phone, theme: 'dark', largeText: false, reducedMotion: 'reduce' },
  { name: 'phone-light-large', size: phone, theme: 'light', largeText: true, reducedMotion: 'reduce' },
  { name: 'tablet-dark-large', size: tablet, theme: 'dark', largeText: true, reducedMotion: 'reduce' },
  { name: 'tablet-light', size: tablet, theme: 'light', largeText: false, reducedMotion: 'reduce' },
  { name: 'desktop-dark', size: desktop, theme: 'dark', largeText: false, reducedMotion: 'reduce' },
  { name: 'desktop-light-large', size: desktop, theme: 'light', largeText: true, reducedMotion: 'reduce' },
]

/** The surfaces the phase contract calls out explicitly. */
export const KEY_ROUTES = [
  '/#/today',
  '/#/search',
  '/#/problem/two-sum',
  '/#/quiz/arrays',
  '/#/code',
  '/#/settings',
] as const

export async function applyProfile(page: Page, profile: MatrixProfile) {
  await page.setViewportSize(profile.size)
  await page.emulateMedia({ reducedMotion: profile.reducedMotion, colorScheme: profile.theme })
  if (profile.baseTextPx) {
    // addInitScript survives every subsequent page.goto, so the override is
    // present on all 18 route loads rather than only the first one.
    await page.addInitScript((px) => {
      const inject = () => {
        const parent = document.head || document.documentElement
        if (!parent || parent.querySelector('style[data-dsa-matrix="base-text"]')) return
        const style = document.createElement('style')
        style.dataset.dsaMatrix = 'base-text'
        style.textContent = `.app-root { --text-base: ${px}px; --text-sm: ${px - 2}px; --text-lg: ${px + 2}px; }`
        parent.appendChild(style)
      }
      inject()
      document.addEventListener('DOMContentLoaded', inject, { once: true })
    }, profile.baseTextPx)
  }
  await open(page, '/#/settings')
  const root = page.locator('.app-root')
  if ((await root.getAttribute('data-theme')) !== profile.theme) {
    await page.getByTestId('theme-toggle').click()
    await expect(root).toHaveAttribute('data-theme', profile.theme)
  }
  const isLarge = (await root.getAttribute('class'))?.includes('large-text') ?? false
  if (isLarge !== profile.largeText) {
    await page.getByTestId('large-text-toggle').click()
  }
  await expect
    .poll(async () => (await root.getAttribute('class'))?.includes('large-text') ?? false)
    .toBe(profile.largeText)
}

/** No horizontal overflow at any width (the owner builds and browses on a phone). */
export async function expectFits(page: Page) {
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(fits, 'the route must not scroll horizontally').toBe(true)
}

/** axe 0, our document only (never YouTube's frame — see helpers.auditPage). */
export async function auditRoutes(page: Page, routes: readonly string[] = ALL_ROUTES) {
  for (const route of routes) {
    await open(page, route)
    await expect(page.getByTestId('page-header')).toBeVisible()
    if (route === '/#/search') {
      await openTopic(page)
      await expect(page.locator('#topic-arrays .row').first()).toBeVisible()
    }
    await expectFits(page)
    const audit = await auditPage(page).analyze()
    expect(audit.violations, `${route} has axe violations`).toEqual([])
  }
}

/**
 * Wait until the SW has claimed the page and the shell cache really holds the
 * two offline fallback documents. Shared with pwa.spec.ts so a future SW change
 * has exactly one place to keep this contract honest.
 */
export async function waitForServiceWorkerControl(page: Page) {
  await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker is not supported in this browser')
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
