import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { open, openTopic, auditPage } from './helpers'

/**
 * Roadmap phase 2 "Done means" in CI: solve at phone width, merge guest rows,
 * relogin in a fresh browser profile against the Auth + Firestore emulators,
 * mark a row offline and prove it syncs on reconnect, then exercise backup.
 * The same built `dist/` is the downloadable site-preview artifact.
 */
const emulatorProject = 'demo-dsa-archive'
const phone = { width: 390, height: 844 }

test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'Requires the Firebase Emulator Suite in CI')

test('cloud progress survives relogin, offline reconnect and backup restore', async ({ browser }) => {
  test.setTimeout(180_000)

  const firestoreClear = await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${emulatorProject}/databases/(default)/documents`,
    { method: 'DELETE' },
  )
  expect(firestoreClear.ok).toBe(true)
  const authClear = await fetch(
    `http://127.0.0.1:9099/emulator/v1/projects/${emulatorProject}/accounts`,
    { method: 'DELETE' },
  )
  expect(authClear.ok).toBe(true)

  const firstContext = await browser.newContext({ viewport: phone, acceptDownloads: true })
  const secondContext = await browser.newContext({ viewport: phone })
  const verifyContext = await browser.newContext({ viewport: phone, acceptDownloads: true })
  const contexts = [firstContext, secondContext, verifyContext]

  try {
    const page = await firstContext.newPage()
    await open(page, '/')
    await expect(page.getByTestId('sign-in-banner')).toBeVisible()

    // A signed-out guest row must be shown before any merge is performed.
    await open(page, '/#/search?q=two+sum')
    await openTopic(page)
    await page.getByTestId('status-two-sum').click()
    await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')

    await page.getByTestId('emulator-sign-in').click()
    await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
    const mergeNotice = page.getByTestId('merge-notice')
    await expect(mergeNotice).toContainText('1 guest row')
    await expect(mergeNotice).toContainText('Nothing is merged until you choose')
    await mergeNotice.getByRole('button', { name: 'Merge guest rows' }).click()
    await expect(mergeNotice).toHaveCount(0)
    await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')
    await expect(page.getByTestId('sync-pill')).toContainText('Synced')
    await page.getByTestId('outcome-two-sum-hint').click()
    await expect(page.getByTestId('outcome-two-sum-hint')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('sync-pill')).toContainText('Synced')

    // Relogin in the same browser, then in a genuinely fresh browser profile.
    await open(page, '/#/settings')
    await page.getByTestId('sign-out').click()
    await expect(page.getByTestId('sign-in-banner')).toBeVisible()
    await page.getByTestId('emulator-sign-in').click()
    await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')

    const secondPage = await secondContext.newPage()
    await open(secondPage, '/')
    await secondPage.getByTestId('emulator-sign-in').click()
    await expect(secondPage.getByTestId('signed-in-banner')).toContainText('CI Owner')
    await expect(secondPage.getByTestId('progress-pill')).toHaveText('1/495 done')
    await expect(secondPage.getByTestId('sync-pill')).toContainText('Synced')
    await open(secondPage, '/#/topic/arrays?tab=practice')
    await expect(secondPage.getByTestId('outcome-two-sum-hint')).toHaveAttribute('aria-pressed', 'true')

    // Offline marking queues in Firestore's persistent local cache, then syncs.
    await open(secondPage, '/#/search?q=linear+search')
    await expect(secondPage.locator('#problem-linear-search')).toBeVisible()
    await secondContext.setOffline(true)
    await secondPage.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(secondPage.getByTestId('sync-pill')).toContainText('Offline')
    await secondPage.getByTestId('status-linear-search').click()
    await expect(secondPage.getByTestId('progress-pill')).toHaveText('2/495 done')
    await secondContext.setOffline(false)
    await secondPage.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(secondPage.getByTestId('sync-pill')).toContainText('Synced')

    // A third fresh profile proves the queued write reached Firestore.
    const verifyPage = await verifyContext.newPage()
    await open(verifyPage, '/')
    await verifyPage.getByTestId('emulator-sign-in').click()
    await expect(verifyPage.getByTestId('progress-pill')).toHaveText('2/495 done')
    await open(verifyPage, '/#/settings')
    await expect(verifyPage.getByTestId('account-panel')).toBeVisible()

    // Export a real backup, reject an invalid file, preview a valid file, and
    // only replace after confirmation. The edited backup has one row removed.
    const downloadPromise = verifyPage.waitForEvent('download')
    await verifyPage.getByRole('button', { name: 'Export backup JSON' }).click()
    const download = await downloadPromise
    const downloadPath = await download.path()
    expect(downloadPath).toBeTruthy()
    const exported = await readFile(downloadPath!, 'utf8')
    // Phase v2-05 bumped the writer to schema v6 (quizResults included).
    expect(JSON.parse(exported).schemaVersion).toBe(8)

    const fileInput = verifyPage.getByLabel('Import backup JSON')
    await fileInput.setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"schemaVersion":99}', 'utf8'),
    })
    await expect(verifyPage.getByTestId('backup-error')).toContainText('Invalid backup')

    const backup = JSON.parse(exported)
    delete backup.progressByTopic.arrays['linear-search']
    await fileInput.setInputFiles({
      name: 'dsa-archive-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup), 'utf8'),
    })
    const preview = verifyPage.getByTestId('import-preview')
    await expect(preview).toContainText('1 row across 1 topic')
    await preview.getByRole('button', { name: 'Replace my progress' }).click()
    await expect(verifyPage.getByTestId('account-notice')).toContainText('Imported 1 row')
    await expect(verifyPage.getByTestId('progress-pill')).toHaveText('1/495 done')

    await verifyPage.screenshot({ path: 'test-results/sync-phone.png', fullPage: true })
    const phoneAudit = await auditPage(verifyPage).analyze()
    expect(phoneAudit.violations).toEqual([])
  } finally {
    for (const context of contexts) await context.close()
  }
})
