import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

/**
 * Roadmap phase 3 "Done means" in CI, at phone width against the Auth +
 * Firestore emulators: a note written on one device appears on the other,
 * lists filter the sheet, and both are covered by export/import — including
 * the recorded backward-compatible import of a phase-2 (schema v1) backup.
 */
const emulatorProject = 'demo-dsa-archive'
const phone = { width: 390, height: 844 }

test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'Requires the Firebase Emulator Suite in CI')

test('notes and custom lists sync across devices, filter the sheet and survive backup', async ({ browser }) => {
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
    await page.goto('/')
    await page.getByTestId('emulator-sign-in').click()
    await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
    await expect(page.getByTestId('sync-pill')).toContainText('Synced')

    // --- 3.1: a markdown note plus a code snippet on a problem row ----------
    await page.locator('#topic-arrays summary').click()
    await page.getByTestId('note-button-two-sum').click()
    const editor = page.getByTestId('note-editor')
    await expect(editor).toBeVisible()
    await page.getByTestId('note-markdown').fill('# Two sum\nUse a **hash map** for O(n) time.')
    await page.getByTestId('note-snippet').fill('const seen = new Map()\nfor (const n of nums) {}')

    // The preview renders markdown; raw HTML is escaped, never executed.
    await editor.getByRole('button', { name: 'Preview' }).click()
    await expect(page.getByTestId('note-preview')).toContainText('hash map')
    await editor.getByRole('button', { name: 'Write' }).click()

    await page.getByTestId('note-save').click()
    await expect(page.getByTestId('account-notice')).toContainText('Note saved')
    await expect(page.getByTestId('note-button-two-sum')).toHaveText('Note ✓')

    // --- 3.2: notes overview + search ---------------------------------------
    await page.getByTestId('view-tab-notes').click()
    const noteCard = page.getByTestId('note-card-two-sum')
    await expect(noteCard).toContainText('Two Sum')
    await expect(noteCard).toContainText('hash map')

    await page.getByLabel('Search my notes').fill('hash map')
    await expect(noteCard).toBeVisible()
    await page.getByLabel('Search my notes').fill('zzz-nothing-matches')
    await expect(page.getByTestId('notes-no-results')).toBeVisible()
    await page.getByRole('button', { name: 'Clear notes search' }).first().click()
    await expect(noteCard).toBeVisible()

    // --- 3.3: custom lists create / add / filter ----------------------------
    await page.getByTestId('view-tab-lists').click()
    await page.getByTestId('new-list-title').fill('Interview warmup')
    await page.getByTestId('create-list').click()
    const listCard = page.locator('.list-card', { hasText: 'Interview warmup' })
    await expect(listCard).toBeVisible()

    await page.getByTestId('view-tab-sheet').click()
    await page.getByTestId('list-button-two-sum').click()
    const picker = page.getByTestId('list-picker')
    await expect(picker).toBeVisible()
    await picker.getByRole('checkbox', { name: /Interview warmup/ }).check()
    await expect(picker.getByRole('checkbox', { name: /Interview warmup/ })).toBeChecked()
    await picker.getByRole('button', { name: 'Close list picker' }).click()

    await page.getByTestId('list-button-linear-search').click()
    await page.getByTestId('list-picker').getByRole('checkbox', { name: /Interview warmup/ }).check()
    await page.getByTestId('list-picker').getByRole('button', { name: 'Close list picker' }).click()
    await expect(page.getByTestId('list-button-two-sum')).toContainText('List · 1')

    await page.locator('[data-testid^="list-chip-"]').click()
    await expect(page.getByTestId('match-count')).toContainText('Showing 2 of 495')
    await expect(page.getByTestId('match-count')).toContainText('Interview warmup')

    // --- the other device: a genuinely fresh browser profile ----------------
    const secondPage = await secondContext.newPage()
    await secondPage.goto('/')
    await secondPage.getByTestId('emulator-sign-in').click()
    await expect(secondPage.getByTestId('signed-in-banner')).toContainText('CI Owner')

    await secondPage.getByTestId('view-tab-notes').click()
    await expect(secondPage.getByTestId('note-card-two-sum')).toContainText('hash map')
    await secondPage.getByTestId('view-tab-lists').click()
    await expect(secondPage.locator('.list-card', { hasText: 'Interview warmup' })).toContainText('2 problems')

    // --- backup: schema v2 carries notes and lists --------------------------
    const downloadPromise = secondPage.waitForEvent('download')
    await secondPage.getByRole('button', { name: 'Export backup JSON' }).click()
    const download = await downloadPromise
    const path = await download.path()
    expect(path).toBeTruthy()
    const backup = JSON.parse(await readFile(path!, 'utf8'))
    expect(backup.schemaVersion).toBe(2)
    expect(backup.notes).toHaveLength(1)
    expect(backup.notes[0]).toMatchObject({ problemId: 'two-sum' })
    expect(backup.notes[0].snippet).toContain('new Map()')
    expect(backup.lists).toHaveLength(1)
    expect(backup.lists[0]).toMatchObject({ title: 'Interview warmup' })
    expect(backup.lists[0].problemIds).toHaveLength(2)

    const fileInput = secondPage.getByLabel('Import backup JSON')
    const withoutNotes = { ...backup, notes: [] }
    await fileInput.setInputFiles({
      name: 'dsa-archive-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(withoutNotes), 'utf8'),
    })
    const preview = secondPage.getByTestId('import-preview')
    await expect(preview).toContainText('1 list')
    await preview.getByRole('button', { name: 'Replace my progress' }).click()
    await expect(secondPage.getByTestId('account-notice')).toContainText('0 notes')
    await secondPage.getByTestId('view-tab-notes').click()
    await expect(secondPage.getByTestId('notes-empty')).toBeVisible()

    // A phase-2 (schemaVersion 1) file still imports — and clears lists, as
    // its own preview states. This is the recorded backward-compatible path.
    const phaseTwo = { ...backup, schemaVersion: 1, notes: [], lists: [] }
    await fileInput.setInputFiles({
      name: 'phase-2-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(phaseTwo), 'utf8'),
    })
    await expect(secondPage.getByTestId('import-preview')).toContainText('notes 0 · lists 0')
    await secondPage.getByTestId('import-preview').getByRole('button', { name: 'Replace my progress' }).click()
    await expect(secondPage.getByTestId('account-notice')).toContainText('Imported')
    await secondPage.getByTestId('view-tab-lists').click()
    await expect(secondPage.getByTestId('lists-empty')).toBeVisible()

    await secondPage.getByTestId('view-tab-notes').click()
    await secondPage.screenshot({ path: 'test-results/library-phone.png', fullPage: true })
    const phoneAudit = await new AxeBuilder({ page: secondPage }).analyze()
    expect(phoneAudit.violations).toEqual([])
  } finally {
    for (const context of contexts) await context.close()
  }
})
