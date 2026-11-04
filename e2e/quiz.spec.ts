import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { desktop, open, phone } from './helpers'

const emulatorProject = 'demo-dsa-archive'

type RawQuizFile = {
  topicId: string
  items: Array<{
    id: string
    prompt: string
    answerIndex: 0 | 1 | 2 | 3
  }>
}

async function loadAnswerByPrompt(): Promise<Map<string, number>> {
  const raw = JSON.parse(await readFile('data/content/quizzes/arrays.json', 'utf8')) as RawQuizFile
  return new Map(raw.items.map((item) => [item.prompt, item.answerIndex]))
}

async function completeArraysQuiz(page: Page, answerByPrompt: Map<string, number>, passAll = true) {
  for (let i = 0; i < 12; i += 1) {
    const prompt = (await page.getByTestId('quiz-question-prompt').textContent())?.trim() ?? ''
    const rightIndex = answerByPrompt.get(prompt) ?? 0
    const pick = passAll ? rightIndex : (rightIndex + 1) % 4
    await page.getByTestId(`quiz-current-option-${pick}`).click()
    await page.getByTestId('quiz-submit').click()
    await expect(page.getByTestId('quiz-explanation')).toBeVisible()
    await page.getByTestId('quiz-next').click()
  }
  await expect(page.getByTestId('quiz-result-screen')).toBeVisible()
}

test('primer inline checks and Practice theory MCQ cards work with zero axe violations', async ({ page }) => {
  await page.setViewportSize(desktop)
  await open(page, '/#/topic/arrays')

  const checkCard = page.getByTestId('primer-check-read-the-shape')
  await expect(checkCard).toBeVisible()
  await checkCard.getByRole('radio').first().click()
  await checkCard.getByRole('button', { name: 'Check answer' }).click()
  expect(await page.evaluate(() => localStorage.getItem('dsa-archive.progress.v1'))).toBeNull()

  await open(page, '/#/topic/beginner-problems?tab=practice')
  await page.getByTestId('check-basic-arrays').click()
  const mcq = page.getByTestId('theory-mcq-basic-arrays')
  await expect(mcq).toBeVisible()
  await page.getByTestId('mcq-show-solution-basic-arrays').click()
  await expect(page.getByTestId('mcq-basic-arrays-solution')).toBeVisible()
  await page.getByTestId('mcq-mark-read-basic-arrays').click()
  await expect(page.getByTestId('progress-pill')).toHaveText('1/495 done')

  const audit = await new AxeBuilder({ page }).analyze()
  expect(audit.violations).toEqual([])
})

test('phone quiz runner: 12 questions, >=44px options, pass, reseeded retake, reload persistence and axe', async ({
  page,
}) => {
  const answerByPrompt = await loadAnswerByPrompt()
  await page.setViewportSize(phone)
  await open(page, '/#/quiz/arrays')

  for (const option of await page.locator('.mcq-option').all()) {
    const box = await option.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  const runnerAudit = await new AxeBuilder({ page }).analyze()
  expect(runnerAudit.violations).toEqual([])

  await completeArraysQuiz(page, answerByPrompt, true)
  await expect(page.getByTestId('quiz-verdict-badge')).toHaveText('Passed')

  const resultAudit = await new AxeBuilder({ page }).analyze()
  expect(resultAudit.violations).toEqual([])

  // Retake reseeds the question order deterministically.
  await page.getByTestId('quiz-retake').click()
  await expect(page).toHaveURL(/#\/quiz\/arrays\?seed=1$/)
  await expect(page.getByTestId('quiz-progress-text')).toHaveText('1 / 12')

  // Reloading #/quiz keeps the guest pass badge.
  await open(page, '/#/quiz')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('quiz-home-topic-arrays')).toContainText('Quiz ✓ 12/12')
})

test.describe('emulator cloud sync', () => {
  test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'Requires the Firebase Emulator Suite in CI')

  test('merges guest quiz scores on sign-in, syncs across profiles + offline, and round-trips schema v6 backups', async ({
    browser,
  }) => {
    test.setTimeout(180_000)
    const answerByPrompt = await loadAnswerByPrompt()

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
    try {
      const page = await firstContext.newPage()
      await open(page, '/#/quiz/arrays')
      await completeArraysQuiz(page, answerByPrompt, false) // 0/12 guest attempt

      await page.getByTestId('emulator-sign-in').click()
      await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
      const mergeBanner = page.getByTestId('quiz-merge-notice')
      await expect(mergeBanner).toContainText('1 guest quiz score')
      await page.getByTestId('quiz-merge-confirm').click()
      await expect(mergeBanner).toHaveCount(0)

      // Offline pass queues locally and syncs on reconnect, keeping higher bestScore (12/12).
      await firstContext.setOffline(true)
      await page.evaluate(() => window.dispatchEvent(new Event('offline')))
      await open(page, '/#/quiz/arrays?seed=1')
      await completeArraysQuiz(page, answerByPrompt, true)
      await firstContext.setOffline(false)
      await page.evaluate(() => window.dispatchEvent(new Event('online')))
      await expect(page.getByTestId('sync-pill')).toContainText('Synced', { timeout: 20_000 })

      // Fresh browser profile sees the synced 12/12 pass and exports schema v6 backup.
      const secondPage = await secondContext.newPage()
      await open(secondPage, '/#/quiz')
      await secondPage.getByTestId('emulator-sign-in').click()
      await expect(secondPage.getByTestId('quiz-home-topic-arrays')).toContainText('Quiz ✓ 12/12', {
        timeout: 20_000,
      })

      await open(secondPage, '/#/settings')
      const downloadPromise = secondPage.waitForEvent('download')
      await secondPage.getByRole('button', { name: 'Export backup JSON' }).click()
      const download = await downloadPromise
      const backupPath = await download.path()
      expect(backupPath).toBeTruthy()
      const backup = JSON.parse(await readFile(backupPath!, 'utf8'))
      expect(backup.schemaVersion).toBe(6)
      expect(backup.quizResults).toEqual([
        expect.objectContaining({
          topicId: 'arrays',
          bestScore: 12,
          bestTotal: 12,
          attempts: 2,
          passed: true,
        }),
      ])
    } finally {
      await firstContext.close()
      await secondContext.close()
    }
  })
})
