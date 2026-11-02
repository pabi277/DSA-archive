import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

/**
 * Roadmap phase 4 "Done means" in CI, at phone width against the Auth +
 * Firestore emulators: a **full study session** runs Today (plan → solve) →
 * Revision (a solved row resurfaces on schedule → one-tap revised) → Stats,
 * and the plan + revision counter survive the JSON backup.
 *
 * The schedule itself is proved with a seeded progress document: the spec
 * writes a row solved five days ago through the emulator's owner REST API
 * (rules bypassed on purpose — it stands in for "a row solved last week"), so
 * the 3/7/21-day queue has something genuinely overdue to show.
 */
const emulatorProject = 'demo-dsa-archive'
const phone = { width: 390, height: 844 }
const firestore = `http://127.0.0.1:8080/v1/projects/${emulatorProject}/databases/(default)/documents`

test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'Requires the Firebase Emulator Suite in CI')

/**
 * The first topic in the catalogue supplies the five suggested picks (nothing
 * is touched yet), so a row from a different topic is guaranteed *not* to be
 * planned — that keeps the "add from the sheet" step deterministic.
 */
type CatalogueProblem = { id: string; title: string }
type Catalogue = {
  topics: { id: string; subtopics: { problems: CatalogueProblem[] }[] }[]
}

async function pickUnplannedProblem() {
  const catalogue = JSON.parse(
    await readFile(new URL('../data/problems.json', import.meta.url), 'utf8'),
  ) as Catalogue
  const firstTopicIds = new Set(
    catalogue.topics[0].subtopics.flatMap((subtopic) => subtopic.problems.map((problem) => problem.id)),
  )
  const all = catalogue.topics.flatMap((topic) =>
    topic.subtopics.flatMap((subtopic) => subtopic.problems),
  )
  const counts = new Map<string, number>()
  for (const problem of all) counts.set(problem.title, (counts.get(problem.title) ?? 0) + 1)
  const candidate = all.find(
    (problem) => !firstTopicIds.has(problem.id) && counts.get(problem.title) === 1,
  )
  if (!candidate) throw new Error('no unique problem title outside the first topic')
  return candidate
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

async function ownerUid(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`${firestore}/users`, {
      headers: { Authorization: 'Bearer owner' },
    })
    if (response.ok) {
      const body = (await response.json()) as { documents?: { name: string }[] }
      const name = body.documents?.[0]?.name
      if (name) return name.split('/').pop()!
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('the signed-in profile document never appeared')
}

async function seedSolvedDaysAgo(uid: string, problemId: string, days: number) {
  const stamp = daysAgo(days)
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
              fd: { stringValue: stamp },
              lr: { stringValue: stamp },
              rc: { integerValue: '0' },
            },
          },
        },
        updatedAt: { timestampValue: stamp },
      },
    }),
  })
  expect(response.ok).toBe(true)
}

async function openToday(page: Page) {
  await page.getByTestId('view-tab-today').click()
  await expect(page.getByTestId('today-view')).toBeVisible()
}

test('a study session runs Today → solve → revise, with stats and a v3 backup', async ({ browser }) => {
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

  const context = await browser.newContext({ viewport: phone, acceptDownloads: true })
  try {
    const page = await context.newPage()
    await page.goto('/')
    await page.getByTestId('emulator-sign-in').click()
    await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')

    // --- 4.1 Today: an empty day, suggested picks, the goal -----------------
    await openToday(page)
    await expect(page.getByTestId('today-empty')).toBeVisible()
    await expect(page.getByTestId('today-goal-status')).toContainText('0/5 moved today')
    await page.getByTestId('today-suggest').click()
    await expect(page.locator('[data-testid^="today-item-"]')).toHaveCount(5)
    await expect(page.getByTestId('view-tab-today')).toContainText('0/5')

    // Solve one of them from the planner: the row, the tally and the sheet agree.
    const firstItem = page.locator('[data-testid^="today-item-"]').first()
    const itemTestId = (await firstItem.getAttribute('data-testid'))!
    const firstProblemId = itemTestId.replace('today-item-', '')
    await page.getByTestId(`today-done-${firstProblemId}`).click()
    await expect(page.getByTestId(`today-state-${firstProblemId}`)).toHaveText('Done today')
    await expect(page.getByTestId(`today-done-${firstProblemId}`)).toHaveText('Done ✓')
    await expect(page.getByTestId('today-goal-status')).toContainText('1/5 moved today')
    await expect(page.getByTestId('progress-pill')).toContainText('/495 done')

    // Add a searched problem from another topic, so "add from the sheet" is
    // exercised without ever colliding with the suggested five.
    const extra = await pickUnplannedProblem()
    await page.getByTestId('today-add-search').fill(extra.title)
    await expect(page.getByTestId(`today-add-${extra.id}`)).toBeEnabled()
    await page.getByTestId(`today-add-${extra.id}`).click()
    await expect(page.getByTestId(`today-item-${extra.id}`)).toBeVisible()
    await expect(page.locator('[data-testid^="today-item-"]')).toHaveCount(6)

    // --- 4.2 Revision: a row solved five days ago is due --------------------
    const uid = await ownerUid()
    await seedSolvedDaysAgo(uid, 'linear-search', 5)
    await page.reload()
    await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
    await page.getByTestId('view-tab-revision').click()
    await expect(page.getByTestId('revision-count')).toContainText('1 due today')
    await expect(page.getByTestId('due-item-linear-search')).toBeVisible()
    await expect(page.getByTestId('due-label-linear-search')).toContainText('Overdue 2 days')
    await expect(page.getByTestId('due-label-linear-search')).toContainText('revision 1 of 3')

    // One tap marks it revised: it leaves the queue and returns in 7 days.
    await page.getByTestId('revised-linear-search').click()
    await expect(page.getByTestId('due-item-linear-search')).toHaveCount(0)
    await expect(page.getByTestId('revision-count')).toContainText('0 due today')
    // Scheduled counts every solved row with a future date — the one seeded
    // five days ago (now +7) and anything solved today (now +3).
    await expect(page.getByTestId('revision-count')).toContainText(/[1-9]\d* scheduled/)
    await expect(page.getByTestId('upcoming-list')).toContainText('Linear Search')

    // --- 4.3 Stats: streak, weekly strip, heatmap, topic and level bars -----
    await page.getByTestId('view-tab-stats').click()
    await expect(page.getByTestId('stats-view')).toBeVisible()
    await expect(page.getByTestId('stat-solved')).not.toHaveText('0')
    await expect(page.getByTestId('stat-week')).not.toHaveText('0')
    await expect(page.getByTestId('stat-streak')).toHaveText('1')
    await expect(page.getByTestId('heatmap')).toBeVisible()
    await expect(page.getByTestId('heatmap-summary')).toContainText('active day')
    await expect(page.getByTestId('week-strip')).toBeVisible()
    await expect(page.getByTestId('bar-arrays')).toBeVisible()
    await expect(page.getByTestId('level-split')).toContainText('Basic')
    await page.screenshot({ path: 'test-results/planner-phone.png', fullPage: true })
    const phoneAudit = await new AxeBuilder({ page }).analyze()
    expect(phoneAudit.violations).toEqual([])

    // --- backup schema v3 carries the plan day and the revision counter -----
    await page.getByTestId('view-tab-sheet').click()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export backup JSON' }).click()
    const download = await downloadPromise
    const path = await download.path()
    expect(path).toBeTruthy()
    const backup = JSON.parse(await readFile(path!, 'utf8'))
    expect(backup.schemaVersion).toBe(3)
    expect(backup.profile.dailyGoal).toBe(5)
    expect(backup.plans).toHaveLength(1)
    expect(backup.plans[0].problemIds.length).toBeGreaterThanOrEqual(6)
    expect(backup.plans[0].doneIds).toContain(firstProblemId)
    expect(backup.progressByTopic.arrays['linear-search']).toMatchObject({ s: 'done', rc: 1 })

    // Restoring a file without plan days clears today's plan (its preview says so).
    const fileInput = page.getByLabel('Import backup JSON')
    await fileInput.setInputFiles({
      name: 'phase-4-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...backup, plans: [] }), 'utf8'),
    })
    await expect(page.getByTestId('import-preview')).toContainText('plans 0')
    await page.getByTestId('import-preview').getByRole('button', { name: 'Replace my progress' }).click()
    await expect(page.getByTestId('account-notice')).toContainText('0 plan days')
    await openToday(page)
    await expect(page.getByTestId('today-empty')).toBeVisible()
  } finally {
    await context.close()
  }
})
