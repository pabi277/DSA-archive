import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { open, auditPage } from './helpers'

/**
 * Custom lists (roadmap phase 3, trimmed in v2-04 when the notes half of
 * this flow was deleted — saved solutions are proven in `code.spec.ts`):
 * lists sync across devices, filter the sheet, and survive export/import —
 * including the recorded backward-compatible import of a phase-2
 * (schema v1) backup.
 */
const emulatorProject = 'demo-dsa-archive'
const phone = { width: 390, height: 844 }

test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'Requires the Firebase Emulator Suite in CI')

test('custom lists sync across devices, filter the sheet and survive backup', async ({ browser }) => {
  test.setTimeout(240_000)

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
  const secondContext = await browser.newContext({ viewport: phone, acceptDownloads: true })
  const contexts = [firstContext, secondContext]

  try {
    const page = await firstContext.newPage()
    await open(page, '/')
    await page.getByTestId('emulator-sign-in').click()
    await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
    await expect(page.getByTestId('sync-pill')).toContainText('Synced')

    // Topic rows are on the search route; the app now lands on Today at `/`.
    await open(page, '/#/search')

    // --- 3.3: custom lists create / add / filter ----------------------------
    await open(page, '/#/lists')
    await page.getByTestId('new-list-title').fill('Interview warmup')
    await page.getByTestId('create-list').click()
    const listCard = page.locator('.list-card', { hasText: 'Interview warmup' })
    await expect(listCard).toBeVisible()

    await open(page, '/#/search?q=two+sum')
    await page.getByRole('button', { name: /More actions for Two Sum/ }).click()
    await page.getByTestId('menu-lists-two-sum').click()
    const picker = page.getByTestId('list-picker')
    await expect(picker).toBeVisible()
    // A click (not check(): the tick is driven by the Firestore snapshot, so it
    // flips a moment after the optimistic write).
    await picker.getByRole('checkbox', { name: /Interview warmup/ }).click()
    await expect(picker.getByRole('checkbox', { name: /Interview warmup/ })).toBeChecked()
    await picker.getByRole('button', { name: 'Close list picker' }).click()

    await open(page, '/#/search?q=linear+search')
    await page.getByRole('button', { name: /More actions for Linear Search/ }).click()
    await page.getByTestId('menu-lists-linear-search').click()
    await page.getByTestId('list-picker').getByRole('checkbox', { name: /Interview warmup/ }).click()
    await expect(
      page.getByTestId('list-picker').getByRole('checkbox', { name: /Interview warmup/ }),
    ).toBeChecked()
    await page.getByTestId('list-picker').getByRole('button', { name: 'Close list picker' }).click()
    await open(page, '/#/search')
    await page.locator('[data-testid^="list-chip-"]').click()
    await expect(page.getByTestId('match-count')).toContainText('Showing 2 of 495')
    await expect(page.getByTestId('match-count')).toContainText('Interview warmup')

    // --- the other device: a genuinely fresh browser profile ----------------
    const secondPage = await secondContext.newPage()
    await open(secondPage, '/')
    await secondPage.getByTestId('emulator-sign-in').click()
    await expect(secondPage.getByTestId('signed-in-banner')).toContainText('CI Owner')

    await open(secondPage, '/#/lists')
    await expect(secondPage.locator('.list-card', { hasText: 'Interview warmup' })).toContainText('2 problems')

    // --- backup: schema v5 carries lists (and no top-level notes array) -----
    // Export/import are on the account panel, which is mounted on Settings.
    await open(secondPage, '/#/settings')
    await expect(secondPage.getByTestId('account-panel')).toBeVisible()
    const downloadPromise = secondPage.waitForEvent('download')
    await secondPage.getByRole('button', { name: 'Export backup JSON' }).click()
    const download = await downloadPromise
    const path = await download.path()
    expect(path).toBeTruthy()
    const backup = JSON.parse(await readFile(path!, 'utf8'))
    expect(backup.schemaVersion).toBe(7)
    expect(backup.notes).toBeUndefined()
    expect(backup.snippets).toEqual([])
    expect(backup.lists).toHaveLength(1)
    expect(backup.lists[0]).toMatchObject({ title: 'Interview warmup' })
    expect(backup.lists[0].problemIds).toHaveLength(2)

    const fileInput = secondPage.getByLabel('Import backup JSON')
    const withoutLists = { ...backup, lists: [] }
    await fileInput.setInputFiles({
      name: 'dsa-archive-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(withoutLists), 'utf8'),
    })
    const preview = secondPage.getByTestId('import-preview')
    await expect(preview).toContainText('lists 0')
    await preview.getByRole('button', { name: 'Replace my progress' }).click()
    await expect(secondPage.getByTestId('account-notice')).toContainText('0 lists')
    await open(secondPage, '/#/lists')
    await expect(secondPage.getByTestId('lists-empty')).toBeVisible()

    // A phase-2 (schemaVersion 1) file still imports — and clears lists, as
    // its own preview states. This is the recorded backward-compatible path.
    // Return to Settings: that route owns the account panel and its file input.
    await open(secondPage, '/#/settings')
    await expect(secondPage.getByTestId('account-panel')).toBeVisible()
    const phaseTwo = { ...backup, schemaVersion: 1, notes: [], lists: [], plans: [], snippets: undefined }
    await secondPage.getByLabel('Import backup JSON').setInputFiles({
      name: 'phase-2-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(phaseTwo), 'utf8'),
    })
    await expect(secondPage.getByTestId('import-preview')).toContainText('saved solutions 0 · lists 0')
    await secondPage.getByTestId('import-preview').getByRole('button', { name: 'Replace my progress' }).click()
    await expect(secondPage.getByTestId('account-notice')).toContainText('Imported')
    await open(secondPage, '/#/lists')
    await expect(secondPage.getByTestId('lists-empty')).toBeVisible()

    await open(secondPage, '/#/lists')
    await secondPage.screenshot({ path: 'test-results/library-phone.png', fullPage: true })
    const phoneAudit = await auditPage(secondPage).analyze()
    expect(phoneAudit.violations).toEqual([])
  } finally {
    for (const context of contexts) await context.close()
  }
})
