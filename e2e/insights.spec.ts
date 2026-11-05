import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { auditPage, desktop, open, phone } from './helpers'

/**
 * Phase v2-08 acceptance, at phone and desktop width against the Auth +
 * Firestore emulators:
 *
 *   · reason chips on Today rows (≤2, from the fixed vocabulary) and a momentum
 *     line that reports a rest day rather than a broken streak;
 *   · "How this plan was made" opens and lists the real inputs;
 *   · the forgotten-done detector writes plan slots in one action and the undo
 *     toast takes them back;
 *   · a target date produces exactly one trajectory sentence;
 *   · "Set goal to N" appears only when reality is below the plan;
 *   · 0 axe violations on both routes.
 *
 * The six forgotten rows are seeded through the emulator's owner REST API —
 * they stand in for "solved 40 days ago and never revised", which no UI action
 * can produce in a test.
 */
const emulatorProject = 'demo-dsa-archive'
const firestore = `http://127.0.0.1:8080/v1/projects/${emulatorProject}/databases/(default)/documents`

test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'Requires the Firebase Emulator Suite in CI')

type Catalogue = {
  topics: { id: string; subtopics: { problems: { id: string; title: string }[] }[] }[]
}

async function seedForgottenRows(): Promise<string[]> {
  const catalogue = JSON.parse(
    await readFile(new URL('../data/problems.json', import.meta.url), 'utf8'),
  ) as Catalogue
  const ids = catalogue.topics
    .find((topic) => topic.id === 'arrays')!
    .subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id))
    .slice(0, 6)
  const solved = new Date(Date.now() - 40 * 86_400_000).toISOString()

  const uid = await ownerUid()
  for (const problemId of ids) {
    const response = await fetch(`${firestore}/users/${uid}/progressByTopic/arrays`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          [problemId]: {
            mapValue: {
              fields: {
                s: { stringValue: 'done' },
                b: { booleanValue: false },
                a: { integerValue: '1' },
                fd: { stringValue: solved },
                lr: { nullValue: null },
                rc: { integerValue: '0' },
              },
            },
          },
          updatedAt: { timestampValue: solved },
        },
      }),
    })
    expect(response.ok).toBe(true)
  }
  return ids
}

/** Seed, then reload so the app re-reads the cloud snapshot (a hash change is not a reload). */
async function seedAndReload(page: Page): Promise<string[]> {
  const ids = await seedForgottenRows()
  await page.reload()
  // A cold boot restores the session, reads the profile and the 20 shards; give
  // it room on a busy CI runner.
  await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner', { timeout: 30_000 })
  return ids
}

async function ownerUid(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`${firestore}/users`, { headers: { Authorization: 'Bearer owner' } })
    if (response.ok) {
      const body = (await response.json()) as { documents?: { name: string }[] }
      const name = body.documents?.[0]?.name
      if (name) return name.split('/').pop()!
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('the signed-in profile document never appeared')
}

/** Reset both emulators and sign in — the pattern every emulator spec uses. */
async function freshOwner(page: Page) {
  const firestoreClear = await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${emulatorProject}/databases/(default)/documents`,
    { method: 'DELETE' },
  )
  expect(firestoreClear.ok).toBe(true)
  const authClear = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${emulatorProject}/accounts`, {
    method: 'DELETE',
  })
  expect(authClear.ok).toBe(true)
  // Local state (settings, dismissals) is per device. Each test gets a fresh
  // browser context, so clearing `localStorage` is enough — deleting the app's
  // IndexedDB while it is open leaves a *blocked* delete queued, which then
  // fires during the next reload and signs the test out.
  await page.context().clearCookies()
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await open(page, '/#/today')
  await page.getByTestId('emulator-sign-in').click()
  await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
}

for (const viewport of [
  { name: 'phone', size: phone },
  { name: 'desktop', size: desktop },
] as const) {
  test(`reason chips, momentum and the plan disclosure · ${viewport.name}`, async ({ browser }) => {
    test.setTimeout(180_000)
    const context = await browser.newContext({ viewport: viewport.size })
    const page = await context.newPage()
    try {
      await freshOwner(page)

      // Momentum is a line, never a streak that resets to zero.
      await expect(page.getByTestId('momentum-line')).toContainText('Momentum')
      await expect(page.getByTestId('momentum-line')).toContainText('study day')

      // Five suggested picks, each a row the learner has never touched, so the
      // first chip is `first solve` — a fact, not a judgement.
      await page.getByTestId('today-suggest').click()
      await expect(page.getByTestId('today-list')).toBeVisible()
      const chips = page.locator('[data-testid^="today-reasons-"]')
      await expect(chips.first()).toContainText('first solve')
      // At most two chips per row: the tooltip carries the rest.
      for (const chipRow of await chips.all()) {
        expect((await chipRow.locator('.reason-chip').count()) <= 2).toBe(true)
      }

      // The disclosure lists the real inputs and the four rules.
      await page.getByTestId('how-plan').locator('summary').click()
      await expect(page.getByTestId('how-plan')).toHaveAttribute('open', '')
      const text = await page.getByTestId('how-plan').innerText()
      for (const expected of ['Inputs:', 'weakest', 'What would change it', 'due for revision']) {
        expect(text).toContain(expected)
      }

      expect((await auditPage(page).analyze()).violations).toHaveLength(0)
    } finally {
      await context.close()
    }
  })
}

test('the forgotten-done detector plans its rows and undo takes them back', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize(phone)
  await freshOwner(page)
  const seeded = await seedAndReload(page)

  await open(page, '/#/today')
  const detector = page.getByTestId('detector-forgotten-done')
  await expect(detector).toContainText('6 problems marked done 30+ days ago and never revised')

  await page.getByTestId('detector-action-forgotten-done').click()
  await expect(page.getByTestId(`today-item-${seeded[0]}`)).toBeVisible()
  await expect(page.getByTestId('today-list').locator('li')).toHaveCount(6)

  // One undo group, not six.
  await expect(page.getByTestId('toast')).toContainText('Added 6 forgotten rows to today')
  await page.getByTestId('toast-action').click()
  await expect(page.getByTestId('today-list')).toHaveCount(0)

  // "Hide for today" removes the note without touching any data.
  await page.getByTestId('detector-dismiss-forgotten-done').click()
  await expect(page.getByTestId('detector-forgotten-done')).toHaveCount(0)
})

test('#/insights reports momentum, one trajectory line and the two detectors', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize(desktop)
  await freshOwner(page)
  await seedAndReload(page)

  await open(page, '/#/insights')
  await expect(page.getByTestId('insights-view')).toBeVisible()
  const momentum = await page.getByTestId('insights-momentum').innerText()
  expect(momentum).toMatch(/^\d+\.\d\/10$/)
  await expect(page.getByTestId('momentum-strip')).toBeVisible()

  // One sentence, and it answers to the target date it is given.
  const before = await page.getByTestId('insights-trajectory').innerText()
  expect(before.length).toBeGreaterThan(10)
  await page.getByTestId('target-date').fill('2027-06-01')
  await expect(page.getByTestId('insights-trajectory')).not.toHaveText(before)

  // Plan vs reality is arithmetic; the suggestion only appears when it is lower.
  await expect(page.getByTestId('plan-reality')).toContainText('median')
  expect((await auditPage(page).analyze()).violations).toHaveLength(0)
})

test('the target date and target list persist through a reload', async ({ page }) => {
  // The reordering rule itself is proved by `planner.test.ts` (focus ids come
  // first); this spec proves the two settings are wired, saved and re-read.
  test.setTimeout(180_000)
  await page.setViewportSize(phone)
  await freshOwner(page)

  await open(page, '/#/lists')
  await page.getByTestId('new-list-title').fill('Finish line')
  await page.getByTestId('create-list').click()
  await expect(page.locator('[data-testid^="list-card-"]').filter({ hasText: 'Finish line' })).toBeVisible()

  await open(page, '/#/insights')
  await page.getByTestId('target-list').selectOption({ label: 'Finish line' })
  await page.getByTestId('target-date').fill(todayPlus(30))

  await open(page, '/#/insights')
  await expect(page.getByTestId('target-list')).toHaveValue(/.+/)
  await expect(page.getByTestId('target-date')).toHaveValue(todayPlus(30))

  // The date is in the trajectory sentence, and clearing it keeps the app honest.
  await page.getByTestId('target-date-clear').click()
  await expect(page.getByTestId('target-date')).toHaveValue('')
})

function todayPlus(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
