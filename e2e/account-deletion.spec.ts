import { expect, test } from '@playwright/test'
import { open, phone } from './helpers'

/**
 * Phase v2-09 §7 / §10 — "Delete my data", verified by a test.
 *
 * Phases v2-04 and v2-05 both deferred this to the hardening phase. Here we
 * seed the seven named Firestore shapes (plus the social leftovers) through the
 * emulator's owner-token REST API, click the real two-step control in Settings,
 * and prove every document is gone afterwards — including the reciprocal friend
 * link, the invite capability and the opt-in public summary.
 */
const project = 'demo-dsa-archive'
const rest = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`
const auth = { Authorization: 'Bearer owner' }
const FRIEND_CODE = 'b'.repeat(32)
const COLLECTIONS = ['progressByTopic', 'snippets', 'quizResults', 'lists', 'plans', 'friends']

async function ownerUid(): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(`${rest}/users`, { headers: auth })
    if (response.ok) {
      const body = (await response.json()) as { documents?: { name: string }[] }
      const name = body.documents?.[0]?.name
      if (name) return name.split('/').pop()!
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('the signed-in profile document never appeared')
}

async function patch(path: string, fields: Record<string, unknown>) {
  const response = await fetch(`${rest}/${path}`, {
    method: 'PATCH',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  expect(response.ok, `seeding ${path} failed`).toBe(true)
}

async function exists(path: string): Promise<boolean> {
  const response = await fetch(`${rest}/${path}`, { headers: auth })
  return response.ok
}

async function listCount(path: string): Promise<number> {
  const response = await fetch(`${rest}/${path}`, { headers: auth })
  if (!response.ok) return 0
  const body = (await response.json()) as { documents?: unknown[] }
  return (body.documents ?? []).length
}

test('Delete my data removes all seven study shapes, the profile and every social leftover', async ({ page }) => {
  test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'Requires the Firebase Emulator Suite in CI')
  test.setTimeout(180_000)

  const firestoreClear = await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${project}/databases/(default)/documents`,
    { method: 'DELETE' },
  )
  expect(firestoreClear.ok).toBe(true)
  const authClear = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${project}/accounts`, {
    method: 'DELETE',
  })
  expect(authClear.ok).toBe(true)

  await page.setViewportSize(phone)
  await open(page, '/')
  await page.getByTestId('emulator-sign-in').click({ timeout: 20_000 })
  await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
  const uid = await ownerUid()

  // Seed through the emulator REST API (rules are not involved in seeding).
  await patch(`users/${uid}/progressByTopic/arrays`, {
    'two-sum': { mapValue: { fields: { s: { stringValue: 'done' }, b: { booleanValue: false } } } },
    updatedAt: { timestampValue: '2026-11-05T00:00:00Z' },
  })
  await patch(`users/${uid}/snippets/two-sum`, {
    language: { stringValue: 'cpp' },
    code: { stringValue: 'class Solution {};' },
    notes: { stringValue: 'a saved reminder' },
    updatedAt: { timestampValue: '2026-11-05T00:00:00Z' },
  })
  await patch(`users/${uid}/quizResults/arrays`, {
    bestScore: { integerValue: '11' },
    bestTotal: { integerValue: '12' },
    attempts: { integerValue: '1' },
    lastScore: { integerValue: '11' },
    passed: { booleanValue: true },
  })
  await patch(`users/${uid}/lists/list-1`, {
    title: { stringValue: 'Favourites' },
    problemIds: { arrayValue: { values: [{ stringValue: 'two-sum' }] } },
  })
  await patch(`users/${uid}/plans/2026-11-05`, {
    problemIds: { arrayValue: { values: [{ stringValue: 'two-sum' }] } },
    doneIds: { arrayValue: { values: [] } },
  })
  await patch(`users/${uid}/friends/bob`, { code: { stringValue: FRIEND_CODE } })
  await patch(`users/bob/friends/${uid}`, { code: { stringValue: FRIEND_CODE } })
  await patch(`users/${uid}/public/summary`, { displayName: { stringValue: 'CI Owner' } })
  // Preserve every profile field the sign-in created while adding the invite
  // capability: a PATCH body without an updateMask may replace the document.
  const profileResponse = await fetch(`${rest}/users/${uid}`, { headers: auth })
  const profile = (await profileResponse.json()) as { fields?: Record<string, unknown> }
  await patch(`users/${uid}`, {
    ...(profile.fields ?? {}),
    friendCode: { stringValue: FRIEND_CODE },
  })
  await patch(`invites/${FRIEND_CODE}`, { uid: { stringValue: uid } })

  for (const name of COLLECTIONS) {
    expect(await listCount(`users/${uid}/${name}`), `${name} should be seeded`).toBeGreaterThan(0)
  }

  // The real two-step control. The card is a lazy add-on chunk, so wait for it.
  await open(page, '/#/settings')
  const card = page.getByTestId('delete-data-card')
  await expect(card).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('delete-data-confirm')).toHaveCount(0)
  await page.getByTestId('delete-data-open').click()
  await expect(page.getByTestId('delete-data-confirm')).toBeVisible()
  await page.getByTestId('delete-data-confirm').click()

  await expect(page.getByText('Your data was deleted')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('signed-in-banner')).toHaveCount(0)
  await expect(page.getByTestId('delete-data-error')).toHaveCount(0)

  // Every path the contract names is gone from the server.
  await expect.poll(async () => (await exists(`users/${uid}`) ? 'present' : 'gone')).toBe('gone')
  for (const name of COLLECTIONS) {
    expect(await listCount(`users/${uid}/${name}`), `${name} was not deleted`).toBe(0)
  }
  expect(await exists(`users/${uid}/public/summary`)).toBe(false)
  expect(await exists(`users/bob/friends/${uid}`)).toBe(false)
  expect(await exists(`invites/${FRIEND_CODE}`)).toBe(false)

  // Guest study records on this device are cleared too.
  const leftovers = await page.evaluate(() =>
    Object.keys(localStorage).filter((key) =>
      /dsa-archive\.(progress|quiz|detectors|speed|watch)/.test(key),
    ),
  )
  expect(leftovers).toEqual([])
})
