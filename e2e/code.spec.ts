import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { open, openTopic, auditPage } from './helpers'

/**
 * Phase v2-04 "Done means" in CI, at phone width against the Auth +
 * Firestore emulators: a solution saved on one device appears on the other,
 * peek hides it until revealed, copy reaches the clipboard, `#/code`
 * searches and filters, an offline save syncs on reconnect, and both the
 * v5 backup and the v4 notes migration (with its printed warning) import.
 */
const emulatorProject = 'demo-dsa-archive'
const phone = { width: 390, height: 844 }

test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'Requires the Firebase Emulator Suite in CI')

test('saved code syncs across devices, peeks, copies, filters and survives backup + migration', async ({ browser }) => {
  test.setTimeout(300_000)

  const firestoreClear = await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${emulatorProject}/databases/(default)/documents`,
    { method: 'DELETE', signal: AbortSignal.timeout(30_000) },
  )
  expect(firestoreClear.ok).toBe(true)
  const authClear = await fetch(
    `http://127.0.0.1:9099/emulator/v1/projects/${emulatorProject}/accounts`,
    { method: 'DELETE', signal: AbortSignal.timeout(30_000) },
  )
  expect(authClear.ok).toBe(true)

  const firstContext = await browser.newContext({ viewport: phone, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] })
  const secondContext = await browser.newContext({ viewport: phone, acceptDownloads: true })
  const contexts = [firstContext, secondContext]

  try {
    const page = await firstContext.newPage()
    await open(page, '/')

    // Signed out, #/code explains itself instead of showing a dead editor.
    await open(page, '/#/code')
    await expect(page.getByTestId('code-signed-out')).toBeVisible()

    await open(page, '/')
    await page.getByTestId('emulator-sign-in').click({ timeout: 15_000 })
    await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
    await expect(page.getByTestId('sync-pill')).toContainText('Synced')

    await open(page, '/#/code')
    await expect(page.getByTestId('code-empty')).toBeVisible()

    // --- write a solution inline from a sheet row ---------------------------
    await open(page, '/#/search')
    await openTopic(page)
    await page.getByRole('button', { name: /More actions for Two Sum/ }).click({ timeout: 15_000 })
    await page.getByTestId('menu-code-two-sum').click({ timeout: 15_000 })
    const editor = page.getByTestId('code-editor')
    await expect(editor).toBeVisible()
    await page.getByTestId('code-language').selectOption('cpp', { timeout: 15_000 })
    await page.getByTestId('code-input').fill('class Solution {\n  vector<int> twoSum() { return {}; }\n};', { timeout: 15_000 })
    await page.getByTestId('code-notes').fill('Store the complement in a hash map.', { timeout: 15_000 })
    await page.getByTestId('code-save').click({ timeout: 15_000 })
    await expect(page.getByTestId('account-notice')).toContainText('Code saved')
    await expect(page.getByTestId('code-save-status')).toContainText('Saved')
    await expect(page.getByTestId('has-code-two-sum')).toBeVisible()
    await page.screenshot({ path: 'test-results/code-editor-phone.png', fullPage: true })

    // --- #/code: search + language/topic filters live in the URL ------------
    await open(page, '/#/code')
    const row = page.getByTestId('code-row-two-sum')
    await expect(row).toContainText('Two Sum')
    await expect(row).toContainText('cpp')
    await expect(page.getByTestId('code-count')).toContainText('1 saved · 1 shown')

    await page.getByTestId('code-search').fill('complement', { timeout: 15_000 })
    await expect(row).toBeVisible()
    await page.getByTestId('code-search').fill('vector<int>', { timeout: 15_000 })
    await expect(row).toBeVisible()
    await page.getByTestId('code-search').fill('zzz-nothing-matches', { timeout: 15_000 })
    await expect(page.getByTestId('code-no-results')).toBeVisible()
    await page.getByTestId('code-search').fill('', { timeout: 15_000 })
    await page.getByTestId('code-lang-filter').selectOption('python', { timeout: 15_000 })
    await expect(page.getByTestId('code-no-results')).toBeVisible()
    await page.getByTestId('code-lang-filter').selectOption('cpp', { timeout: 15_000 })
    await expect(row).toBeVisible()
    await page.getByTestId('code-topic-filter').selectOption('graphs', { timeout: 15_000 })
    await expect(page.getByTestId('code-no-results')).toBeVisible()
    await page.getByTestId('code-topic-filter').selectOption('arrays', { timeout: 15_000 })
    await expect(row).toBeVisible()

    // --- copy reaches the real clipboard ------------------------------------
    await page.getByTestId('code-copy-two-sum').click({ timeout: 15_000 })
    await expect(page.getByTestId('code-copy-two-sum')).toContainText('Copied')
    await page.bringToFront()
    const clipboard = await page.evaluate(
      () =>
        Promise.race([
          navigator.clipboard.readText(),
          new Promise<string>((_resolve, reject) =>
            setTimeout(() => reject(new Error('clipboard readText timed out')), 10_000),
          ),
        ]),
    )
    expect(clipboard).toContain('vector<int> twoSum()')

    // --- peek: hidden (and aria-hidden) until revealed ----------------------
    await page.getByTestId('code-open-two-sum').click({ timeout: 15_000 })
    // Phase 06: the problem page is a theatre with three tabs, and the phase-04
    // row deep-links the Code tab so the reader lands on the solution.
    await expect(page.getByTestId('code-panel')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('peek-code')).toHaveAttribute('aria-hidden', 'true')
    await page.screenshot({ path: 'test-results/code-peek-phone.png', fullPage: true })
    await page.getByTestId('peek-reveal').click({ timeout: 15_000 })
    await expect(page.getByTestId('peek-code')).not.toHaveAttribute('aria-hidden', 'true')
    await expect(page.getByTestId('peek-code')).toContainText('class Solution')
    await expect(page.getByTestId('code-leetcode')).toBeVisible()
    await expect(page.getByTestId('code-godbolt')).toBeVisible()

    // --- the other device: a genuinely fresh browser profile ----------------
    const secondPage = await secondContext.newPage()
    await open(secondPage, '/')
    await secondPage.getByTestId('emulator-sign-in').click({ timeout: 15_000 })
    await expect(secondPage.getByTestId('signed-in-banner')).toContainText('CI Owner')
    await open(secondPage, '/#/code')
    await expect(secondPage.getByTestId('code-row-two-sum')).toContainText('Two Sum')
    await open(secondPage, '/#/problem/two-sum?tab=code')
    await secondPage.getByTestId('peek-reveal').click({ timeout: 15_000 })
    await expect(secondPage.getByTestId('peek-code')).toContainText('vector<int> twoSum()')

    // --- offline save queues, then syncs on reconnect -----------------------
    await firstContext.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await open(page, '/#/problem/two-sum?tab=code')
    await page.getByTestId('code-edit').click({ timeout: 15_000 })
    await page.getByTestId('code-input').fill('// offline edit\nclass Solution {};', { timeout: 15_000 })
    await page.getByTestId('code-save').click({ timeout: 15_000 })
    await expect(page.getByTestId('code-save-status')).toContainText('Offline — will sync')
    await firstContext.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    // Coming back online must flush the queued write. Phase 06 moved this panel
    // behind the Code tab, so the queued editor may not be the mounted panel by
    // then: assert on the *persisted* solution, which is what actually matters.
    await expect(page.getByTestId('peek-code')).toContainText('offline edit', { timeout: 30_000 })
    // Device 2 was left on the problem page with this peek already revealed;
    // leave and come back so the panel remounts and the peek hides again
    // (reveal state is session-local), then reveal the synced offline edit.
    await open(secondPage, '/#/code')
    await expect(secondPage.getByTestId('code-row-two-sum')).toBeVisible()
    await open(secondPage, '/#/problem/two-sum?tab=code')
    await expect(secondPage.getByTestId('peek-code')).toHaveAttribute('aria-hidden', 'true')
    await secondPage.getByTestId('peek-reveal').click({ timeout: 15_000 })
    await expect(secondPage.getByTestId('peek-code')).toContainText('offline edit')

    // --- backup v7 carries snippets + stamps; a v4 notes file migrates ----
    await open(secondPage, '/#/settings')
    await expect(secondPage.getByTestId('account-panel')).toBeVisible()
    await expect(secondPage.getByTestId('account-panel')).toContainText('1 saved solution')
    const downloadPromise = secondPage.waitForEvent('download', { timeout: 30_000 })
    await secondPage.getByRole('button', { name: 'Export backup JSON' }).click({ timeout: 15_000 })
    const download = await downloadPromise
    const path = await download.path()
    expect(path).toBeTruthy()
    const backup = JSON.parse(await readFile(path!, 'utf8'))
    expect(backup.schemaVersion).toBe(7)
    expect(backup.notes).toBeUndefined()
    expect(backup.snippets).toHaveLength(1)
    expect(backup.snippets[0]).toMatchObject({ problemId: 'two-sum', language: 'cpp' })
    expect(backup.snippets[0].code).toContain('offline edit')
    // v7 (phase v2-06) adds `moments`, the video stamps. The field is optional,
    // so a snippet written before the theatre existed still round-trips.
    expect(backup.snippets[0].moments ?? []).toEqual([])

    const { snippets: _dropped, ...withoutSnippetsKey } = backup
    const legacyV4 = {
      ...withoutSnippetsKey,
      schemaVersion: 4,
      notes: [
        {
          problemId: 'linear-search',
          markdown: '# Linear search\nWalk until you find it.',
          snippet: 'for (int i = 0; i < n; i++) {}',
          updatedAt: '2026-11-02T12:00:00.000Z',
        },
      ],
    }
    await secondPage.getByLabel('Import backup JSON').setInputFiles({
      name: 'phase-4-schema-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(legacyV4), 'utf8'),
    })
    const preview = secondPage.getByTestId('import-preview')
    await expect(preview).toContainText('saved solutions 1')
    await expect(secondPage.getByTestId('import-warning')).toContainText('linear-search')
    await preview.getByRole('button', { name: 'Replace my progress' }).click({ timeout: 15_000 })
    await expect(secondPage.getByTestId('account-notice')).toContainText('1 saved solution')
    await open(secondPage, '/#/code')
    await expect(secondPage.getByTestId('code-row-linear-search')).toContainText('Linear Search')
    await expect(secondPage.getByTestId('code-row-two-sum')).toHaveCount(0)
    await open(secondPage, '/#/problem/linear-search?tab=code')
    await secondPage.getByTestId('peek-reveal').click({ timeout: 15_000 })
    await expect(secondPage.getByTestId('peek-code')).toContainText('for (int i = 0')

    await open(secondPage, '/#/code')
    await secondPage.screenshot({ path: 'test-results/code-list-phone.png', fullPage: true })
    const phoneAudit = await Promise.race([
      auditPage(secondPage).analyze(),
      new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('axe timed out on #/code')), 60_000)),
    ])
    expect(phoneAudit.violations).toEqual([])
    await open(secondPage, '/#/problem/linear-search?tab=code')
    const problemAudit = await Promise.race([
      auditPage(secondPage).analyze(),
      new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('axe timed out on the problem page')), 60_000)),
    ])
    expect(problemAudit.violations).toEqual([])
  } finally {
    for (const context of contexts) await context.close()
  }
})
