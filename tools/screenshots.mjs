#!/usr/bin/env node
/**
 * Phase v2-10 — regenerate the committed product screenshots.
 *
 * The README must show the real UI, never a mock and never an image that has
 * quietly aged. This script drives the **built `dist/`** in real Chromium over
 * `vite preview`, signs in with the deterministic CI Google account against the
 * Auth + Firestore emulators (the same path every emulator spec uses), seeds one
 * coherent study record through the emulators' owner REST API, and writes
 * 8 phone + 6 desktop PNGs (plus two `-light` theme references) into
 * `docs/screenshots/` with stable filenames.
 *
 * Why the emulator instead of seeded `localStorage`: Five of the eight surfaces
 * a reader cares about (Code, lists, quiz results, the planner, the profile)
 * only exist while signed in — the guest path deliberately shows a
 * "Sign in to keep your code" empty state. Seeding the signed-in path means the
 * screenshots show what a learner who has actually used the app sees, and the
 * seeding code is the same REST shape the e2e specs already prove.
 *
 * Determinism:
 *   · one fresh browser context per capture, DPR 2, dark theme, reduced motion,
 *     fixed clock (so "9 days ago", the momentum window and the revision queue
 *     agree with each other), and a fixed seed for the quiz runner;
 *   · the record is reset (emulator wipe) before the run, so a re-run is a diff,
 *     not a lottery;
 *   · never a third-party frame: the YouTube player is not ours to photograph,
 *     so `#/problem` is captured on its statement/hint side.
 *
 * Requirements:
 *   · `npm run build:emulator` (the build must point at the emulators)
 *   · Firestore on 8080 + Auth on 9099. `npm run screenshots` uses the official
 *     Firebase Emulator Suite through `firebase emulators:exec` (needs Java 21);
 *     `SCREENSHOT_REUSE_EMULATORS=1` skips that wrapper when the ports are
 *     already served (CI, or a dev machine with the suite running).
 *   · Chromium: Playwright's own, or `CHROMIUM_PATH=/path/to/chrome`.
 *
 * Usage:
 *   npm run screenshots                    # full run (emulators + preview + shots)
 *   npm run screenshots -- --only=today    # one capture by slug substring
 *   npm run screenshots -- --check         # verify the committed set (CI)
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'docs', 'screenshots')
const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const only = args.find((arg) => arg.startsWith('--only='))?.slice('--only='.length)

const PROJECT = 'demo-dsa-archive'
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }
const PREVIEW = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:4174'

const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1440, height: 900 }

/** A fixed clock: every relative date below stays true on every re-run. */
const CLOCK = new Date('2026-11-05T09:30:00.000Z')
const daysAgo = (days) => new Date(CLOCK.getTime() - days * 86_400_000).toISOString()
const isoDay = (offsetDays = 0) => {
  const date = new Date(CLOCK.getTime() + offsetDays * 86_400_000)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const TODAY = isoDay(0)

/* --- the seeded study record -------------------------------------------- */

/** One `progressByTopic/{topicId}` entry in the shipped cloud shape. */
function entry({ o = 'clean', solvedDaysAgo, lastRevisedDaysAgo = null }) {
  return {
    s: 'done',
    b: false,
    a: lastRevisedDaysAgo === null ? 0 : 1,
    fd: daysAgo(solvedDaysAgo),
    lr: lastRevisedDaysAgo === null ? null : daysAgo(lastRevisedDaysAgo),
    rc: lastRevisedDaysAgo === null ? 0 : 1,
    o,
  }
}

const PROGRESS = {
  arrays: {
    'two-sum': entry({ o: 'hint', solvedDaysAgo: 9, lastRevisedDaysAgo: 6 }),
    'best-time-to-buy-and-sell-stock': entry({ solvedDaysAgo: 5 }),
    'move-zeros-to-end': entry({ solvedDaysAgo: 3 }),
    'maximum-subarray': entry({ o: 'hint', solvedDaysAgo: 2 }),
  },
  hashing: {
    'longest-consecutive-sequence': entry({ solvedDaysAgo: 12, lastRevisedDaysAgo: 3 }),
    'two-sum-hashing': entry({ solvedDaysAgo: 11 }),
  },
  'binary-search': {
    'search-x-in-sorted-array': entry({ solvedDaysAgo: 1 }),
  },
  'linked-list': {
    'middle-of-linked-list': entry({ o: 'couldnt', solvedDaysAgo: 21 }),
  },
}

const PROFILE = {
  uid: null, // filled in from the signed-in account
  displayName: 'Pabi',
  photoURL: null,
  theme: 'dark',
  hideDone: false,
  dailyGoal: 5,
  targetDate: isoDay(56),
  targetListId: null,
}

/** Our own saved solution (authored for this repo, not copied from anywhere). */
const SNIPPETS = {
  'two-sum': {
    language: 'cpp',
    code: [
      '// Ask "what completes this number?" before writing a nested loop.',
      'vector<int> twoSum(vector<int>& nums, int target) {',
      '    unordered_map<int, int> seen;',
      '    for (int i = 0; i < (int)nums.size(); ++i) {',
      '        int need = target - nums[i];',
      '        if (seen.count(need)) return {seen[need], i};',
      '        seen[nums[i]] = i;',
      '    }',
      '    return {};',
      '}',
    ].join('\n'),
    notes: 'One pass, O(n). The map is the brute force, paid for once.',
    verdict: 'hint',
    moments: [
      { at: 132, text: 'Hash map idea', createdAt: daysAgo(9) },
      { at: 415, text: 'One pass, no sort', createdAt: daysAgo(9) },
    ],
    updatedAt: daysAgo(9),
  },
  'best-time-to-buy-and-sell-stock': {
    language: 'python',
    code: [
      'def max_profit(prices):',
      '    best = 0',
      '    cheapest = float("inf")',
      '    for price in prices:',
      '        cheapest = min(cheapest, price)',
      '        best = max(best, price - cheapest)',
      '    return best',
    ].join('\n'),
    notes: 'Track the cheapest price so far, not every pair.',
    verdict: 'clean',
    updatedAt: daysAgo(5),
  },
}

const LISTS = {
  'finish-line': { title: 'Finish line', problemIds: ['two-sum', 'maximum-subarray', 'middle-of-linked-list'], updatedAt: daysAgo(6) },
  'revisit-hashing': { title: 'Revisit hashing', problemIds: ['longest-consecutive-sequence', 'two-sum-hashing'], updatedAt: daysAgo(3) },
}

const QUIZ = {
  arrays: { bestScore: 10, bestTotal: 12, attempts: 2, lastScore: 10, lastAt: daysAgo(4), passed: true },
  hashing: { bestScore: 9, bestTotal: 12, attempts: 1, lastScore: 9, lastAt: daysAgo(8), passed: false },
}

const PLAN = {
  problemIds: ['two-sum', 'move-zeros-to-end', 'maximum-subarray', 'best-time-to-buy-and-sell-stock'],
  doneIds: ['move-zeros-to-end'],
  updatedAt: daysAgo(0),
}

/** `#/code` shows the saved solutions; the emulator writes above fill it. */

/* --- the captures -------------------------------------------------------- */

const CAPTURES = [
  {
    slug: 'phone-today',
    viewport: PHONE,
    route: '/#/today',
    ready: 'momentum-line',
    fullPage: true,
    note: 'Today: momentum, the plan, reason chips on the suggested rows',
  },
  {
    slug: 'phone-topics',
    viewport: PHONE,
    route: '/#/topics',
    ready: 'page-header',
    note: 'All 20 topics, always visible, with progress and quiz badges',
  },
  {
    slug: 'phone-topic-learn',
    viewport: PHONE,
    route: '/#/topic/arrays',
    ready: 'page-header',
    note: 'The authored Arrays primer (Learn tab)',
  },
  {
    slug: 'phone-topic-practice',
    viewport: PHONE,
    route: '/#/topic/arrays?tab=practice',
    ready: 'page-header',
    note: 'Practice tab: outcomes and the drill set',
  },
  {
    slug: 'phone-problem',
    viewport: PHONE,
    route: '/#/problem/linear-search',
    ready: 'page-header',
    note: 'Our own statement, constraints, hint and common mistakes',
    // The theatre stage sits above the panel by design; the statement is the
    // part worth showing (the video frame is third-party and not photographed).
    before: async (page) => {
      // Open the hint, exactly as a stumped learner would.
      const hint = page.getByText('Hint · local, never tracked')
      await hint.waitFor({ state: 'visible', timeout: 20_000 })
      await hint.click()
      // Compose the shot on the statement, just below the sticky top bar.
      await page.evaluate(() => {
        const heading = [...document.querySelectorAll('h3')].find((node) => node.textContent?.startsWith("What's asked"))
        if (!heading) return
        const offset = 72
        window.scrollTo({ top: window.scrollY + heading.getBoundingClientRect().top - offset })
      })
      await page.waitForTimeout(300)
    },
  },
  {
    slug: 'phone-code',
    viewport: PHONE,
    route: '/#/code',
    ready: 'page-header',
    note: 'Code: saved solutions with language and verdict badges',
  },
  {
    slug: 'phone-quiz',
    viewport: PHONE,
    route: '/#/quiz/arrays',
    ready: 'page-header',
    note: 'The quiz runner mid-question with keyboard hints',
  },
  {
    slug: 'phone-insights',
    viewport: PHONE,
    route: '/#/insights',
    ready: 'insights-view',
    note: 'Insights: momentum strip, one trajectory sentence, detectors',
  },
  // Two light-theme references: the app ships both themes, and a reader should
  // see that without the folder doubling in size.
  {
    slug: 'phone-today-light',
    viewport: PHONE,
    route: '/#/today',
    ready: 'momentum-line',
    theme: 'light',
    fullPage: true,
    note: 'The light theme on Today (same record, same layout)',
  },
  {
    slug: 'desktop-today',
    viewport: DESKTOP,
    route: '/#/today',
    ready: 'momentum-line',
    fullPage: true,
    note: 'Today with the sidebar rail and the plan',
  },
  {
    slug: 'desktop-topics',
    viewport: DESKTOP,
    route: '/#/topics',
    ready: 'page-header',
    note: 'The 20-topic grid at 1440 px',
  },
  {
    slug: 'desktop-problem',
    viewport: DESKTOP,
    route: '/#/problem/linear-search',
    ready: 'page-header',
    // No scroll and no full page: at this width the reference rail is a 360 px
    // column whose cards must all be visible, and a fullPage shot would paint the
    // sticky command bar and sidebar into the middle of the image. The stage here
    // shows its designed "player blocked" state, which is honest — the YouTube
    // frame is third-party and is never photographed.
    note: 'The problem page at desktop width: the stage with its offline state, tabs and the reference rail',
  },
  {
    slug: 'desktop-code',
    viewport: DESKTOP,
    route: '/#/code',
    ready: 'page-header',
    note: 'Code screen with the search and language filters',
  },
  {
    slug: 'desktop-quiz',
    viewport: DESKTOP,
    route: '/#/quiz',
    ready: 'page-header',
    note: 'Quiz home: every topic with its pass state',
  },
  {
    slug: 'desktop-topics-light',
    viewport: DESKTOP,
    route: '/#/topics',
    ready: 'page-header',
    theme: 'light',
    note: 'The 20-topic grid in the light theme',
  },
  {
    slug: 'desktop-insights',
    viewport: DESKTOP,
    route: '/#/insights',
    ready: 'insights-view',
    note: 'Insights: momentum, trajectory, detectors, finish line',
  },
]

/** Switch to the light theme through the real control in the top bar. */
async function setLightTheme(page) {
  const root = page.locator('.app-root')
  if ((await root.getAttribute('data-theme')) === 'light') return
  // Let the profile load finish first: a tap that lands while the profile read
  // is in flight is a legitimate race (phase v2-10 fixed it, but a screenshot
  // has no business depending on the outcome of a race).
  await page.waitForFunction(() => {
    const banner = document.querySelector('[data-testid="signed-in-banner"]')
    return Boolean(banner) && document.querySelector('.app-root[data-theme]')
  })
  await page.waitForTimeout(1_200)
  await page.getByTestId('theme-toggle').click()
  await root.and(page.locator('[data-theme="light"]')).waitFor({ state: 'attached', timeout: 10_000 })
  await page.waitForTimeout(400)
}

/** Scroll a named panel to the top of the viewport before the shot. */
function scrollToPanel(testId) {
  return async (page) => {
    const panel = page.getByTestId(testId)
    await panel.waitFor({ state: 'visible', timeout: 20_000 })
    await panel.evaluate((node) => node.scrollIntoView({ block: 'start' }))
    await page.waitForTimeout(200)
  }
}

/** The six images the root README shows (hero + five surfaces). */
const README_IMAGES = [
  'phone-today.png',
  'phone-topics.png',
  'phone-problem.png',
  'phone-code.png',
  'phone-quiz.png',
  'phone-insights.png',
]

/* --- emulator seeding ---------------------------------------------------- */

const docUrl = (path) => `${FIRESTORE}/${path}`

async function put(path, data) {
  const response = await fetch(docUrl(path), {
    method: 'PATCH',
    headers: OWNER,
    body: JSON.stringify({ fields: toFields(data) }),
  })
  if (!response.ok) throw new Error(`seed ${path} failed: ${response.status} ${await response.text()}`)
}

/** JS value → Firestore REST `Value` (only the shapes this record needs). */
function toFields(value) {
  const fields = {}
  for (const [key, item] of Object.entries(value)) fields[key] = toValue(item)
  return fields
}
function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (typeof value === 'string') return { stringValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } }
  return { mapValue: { fields: toFields(value) } }
}

async function wipeEmulators() {
  const firestore = await fetch(`${FIRESTORE.replace('/v1/projects', '/emulator/v1/projects')}/documents`, {
    method: 'DELETE',
  }).catch(() => null)
  // hidane's emulator endpoint differs; fall back to deleting the collections
  // the run writes, so a re-run is deterministic either way.
  if (!firestore || !firestore.ok) {
    const response = await fetch(docUrl('users'), { headers: OWNER }).catch(() => null)
    if (response?.ok) {
      const body = await response.json().catch(() => ({}))
      for (const document of body.documents ?? []) {
        const uid = document.name.split('/').pop()
        await fetch(docUrl(`users/${uid}`), { method: 'DELETE', headers: OWNER }).catch(() => null)
      }
    }
  }
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' }).catch(() => null)
}

async function seedRecord(uid) {
  await put(`users/${uid}`, { ...PROFILE, uid })
  for (const [topicId, rows] of Object.entries(PROGRESS)) {
    await put(`users/${uid}/progressByTopic/${topicId}`, { ...rows, updatedAt: daysAgo(1) })
  }
  for (const [problemId, snippet] of Object.entries(SNIPPETS)) {
    await put(`users/${uid}/snippets/${problemId}`, snippet)
  }
  for (const [listId, list] of Object.entries(LISTS)) {
    await put(`users/${uid}/lists/${listId}`, list)
  }
  for (const [topicId, result] of Object.entries(QUIZ)) {
    await put(`users/${uid}/quizResults/${topicId}`, result)
  }
  await put(`users/${uid}/plans/${TODAY}`, PLAN)
}

/* --- process plumbing ---------------------------------------------------- */

const children = []
function run(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options })
  children.push(child)
  return child
}
function shutdown() {
  for (const child of children) {
    if (child.exitCode === null) child.kill('SIGTERM')
  }
}

async function waitFor(url, label, timeoutMs = 120_000) {
  const started = Date.now()
  for (;;) {
    try {
      const response = await fetch(url)
      if (response.status < 500) return
    } catch {
      // not up yet
    }
    if (Date.now() - started > timeoutMs) throw new Error(`${label} never answered at ${url}`)
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}

async function startPreview() {
  const child = run(process.execPath, [
    path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    String(new URL(PREVIEW).port),
  ], { stdio: 'ignore' })
  child.on('exit', (code) => {
    if (code) console.error(`vite preview exited with ${code}`)
  })
  await waitFor(PREVIEW, 'the preview server')
}

/** Playwright's Chromium, or whatever `CHROMIUM_PATH` points at. */
async function launchBrowser() {
  let chromium
  try {
    ;({ chromium } = await import('@playwright/test'))
  } catch (error) {
    throw new Error(
      `Playwright is not installed. Run \`npm ci\` first, or download the \`docs-screenshots\`\n` +
        `artifact that CI generates on every push. (${error.message})`,
    )
  }
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'],
  })
}

/* --- the run ------------------------------------------------------------- */

async function capture(browser) {
  await mkdir(outDir, { recursive: true })
  const written = []

  /**
   * The Auth Emulator mints a fresh uid for every sign-in (the fake Google
   * token is not a stable account), so the seeded record has to be written
   * *for the session that is about to be photographed*. Sequence per capture:
   * sign in → read the uid from the SDK's own IndexedDB → write the record as
   * the emulator's owner → reload so the app reads it as a returning learner.
   */
  for (const item of CAPTURES) {
    if (only && !item.slug.includes(only)) continue
    const context = await browser.newContext({
      viewport: item.viewport,
      deviceScaleFactor: 2,
      colorScheme: item.theme ?? 'dark',
      reducedMotion: 'reduce',
      locale: 'en-GB',
      timezoneId: 'Asia/Kolkata',
    })
    const page = await context.newPage()
    await page.clock.install({ time: CLOCK }).catch(() => null)
    await page.goto(`${PREVIEW}/#/today`, { waitUntil: 'domcontentloaded' })
    await page.locator('.app-root').waitFor({ state: 'visible', timeout: 30_000 })
    await page.getByTestId('emulator-sign-in').click()
    await page.getByTestId('signed-in-banner').waitFor({ state: 'visible', timeout: 30_000 })
    const uid = await sessionUid(page)
    await seedRecord(uid)
    // Cold boot: the app now reads a record that already exists, which is the
    // state a reader's screen is actually in.
    await page.goto(`${PREVIEW}${item.route}`, { waitUntil: 'domcontentloaded' })
    await page.locator('.app-root').waitFor({ state: 'visible', timeout: 30_000 })
    // The signed-in banner is a one-time acknowledgement of a *new* session; a
    // returning learner does not see it. Hide it visually, the way a learner
    // dismisses it, without touching the DOM the assertions rely on.
    if (item.theme === 'light') await setLightTheme(page)
    await page.addStyleTag({
      content: [
        '[data-testid="signed-in-banner"]{display:none!important}',
        // Full-page captures paint the fixed phone bar mid-document; unpin it
        // so it sits in its own grid row instead of over the content.
        item.fullPage ? '.bottom-bar{position:static!important}' : '',
        item.fullPage ? '.app-main{padding-bottom:0!important}' : '',
      ].join(''),
    })
    if (item.before) await item.before(page)
    await page.getByTestId(item.ready).first().waitFor({ state: 'visible', timeout: 30_000 })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(item.settle ?? 900)
    const file = path.join(outDir, `${item.slug}.png`)
    await page.screenshot({ path: file, animations: 'disabled', caret: 'hide', fullPage: item.fullPage ?? false })
    const info = await stat(file)
    written.push({ slug: item.slug, bytes: info.size, note: item.note })
    console.log(`  ✓ ${item.slug}.png  ${(info.size / 1024).toFixed(1)} kB  — ${item.note}`)
    await context.close()
  }
  return written
}

/** The signed-in uid, read from the Firebase Auth SDK's own local store. */
async function sessionUid(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('firebaseLocalStorageDb')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const entries = await new Promise((resolve, reject) => {
      const store = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage')
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    for (const entry of entries) {
      const uid = entry?.value?.uid
      if (typeof uid === 'string' && uid) return uid
    }
    throw new Error('no signed-in uid found in firebaseLocalStorage')
  })
}

const STAMP_NAME = 'capture.json'

/**
 * A hash of everything a screenshot could be depicting: the sources of the built
 * UI, the shell entry, and the catalogue + manifest that supply the numbers and
 * colours on screen.
 */
async function sourceDigest() {
  const hash = createHash('sha256')
  async function walk(dir, rel) {
    const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      const relPath = `${rel}/${entry.name}`
      if (entry.isDirectory()) await walk(full, relPath)
      else if (!/\.(tmp|log)$/.test(entry.name)) {
        hash.update(relPath)
        hash.update('\0')
        hash.update(await readFile(full))
        hash.update('\0')
      }
    }
  }
  await walk(path.join(root, 'src'), 'src')
  for (const name of ['index.html', 'data/problems.json', 'public/manifest.webmanifest']) {
    hash.update(name)
    hash.update('\0')
    hash.update(await readFile(path.join(root, name)))
    hash.update('\0')
  }
  return hash.digest('hex')
}

async function writeManifest(written) {
  const manifest = [
    '# Screenshots (generated)',
    '',
    'Generated by `npm run screenshots` (`tools/screenshots.mjs`) against a production',
    'build in real Chromium: 390×844 (phone) and 1440×900 (desktop), DPR 2, reduced',
    'motion, a pinned clock (`2026-11-05T09:30:00Z`) and one seeded study record written',
    'through the Firebase Emulator Suite. Twelve captures use the dark theme; the two',
    '`-light` files are the light theme of the same record, so a theme regression is',
    'visible in the diff instead of being described in prose. Filenames are stable, so a',
    're-run replaces a file instead of adding one, and the root `README.md` links them by',
    'name.',
    '',
    '**Never hand-edit a PNG here.** Change the UI, re-run the script, review the diff,',
    'commit. The capture is the learner’s own record, not a marketing composite: no',
    'third-party video frame is photographed (the YouTube player is not ours to capture).',
    '',
    '| File | Size | What it shows |',
    '|---|---|---|',
    ...written.map((item) => `| \`${item.slug}.png\` | ${(item.bytes / 1024).toFixed(1)} kB | ${item.note} |`),
    '',
    '',
    '## Freshness',
    '',
    '`npm run check:screenshots` fails if a listed PNG is missing, if the manifest',
    'does not list a capture, or if `src/` (or `index.html`, or the catalogue) was',
    'modified after a PNG was written — a screenshot older than the UI it depicts is',
    'a lie. CI cannot re-shoot the set (it needs the emulator suite), so it packages',
    'this folder as the `docs-screenshots` artifact: the committed PNGs are the',
    'evidence, and a reviewer opens them from the run page.',
    '',
    `Regenerate: \`npm run build:emulator && npm run screenshots\`.`,
    `Total: ${written.length} files, ${(written.reduce((sum, item) => sum + item.bytes, 0) / 1024 / 1024).toFixed(1)} MB.`,
    '',
  ].join('\n')
  await writeFile(path.join(outDir, 'README.md'), manifest, 'utf8')
  // The machine-readable half: which sources, which clock, which bytes. `--check`
  // reads this instead of guessing from file dates.
  await writeFile(
    path.join(outDir, STAMP_NAME),
    `${JSON.stringify(
      {
        takenAt: new Date().toISOString(),
        clock: CLOCK.toISOString(),
        viewports: { phone: PHONE, desktop: DESKTOP, deviceScaleFactor: 2 },
        theme: 'dark, plus two -light references of the same record',
        record:
          'seeded through the Firebase Emulator Suite owner REST API after signing in; ' +
          'no localStorage seeding and no fixture file',
        captures: written.length,
        source: await sourceDigest(),
        files: Object.fromEntries(written.map((item) => [`${item.slug}.png`, item.bytes])),
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
}

async function main() {
  if (checkOnly) return check()

  await wipeEmulators()
  if (!process.env.SCREENSHOT_REUSE_EMULATORS) {
    // `firebase emulators:exec` starts Auth + Firestore, runs the wrapped
    // command, and shuts them down even when it fails. One process tree, one
    // exit code — no orphaned emulators on a dev laptop.
    const child = run('npm', ['run', 'screenshots:inner', '--', ...args])
    child.on('exit', (code) => {
      shutdown()
      process.exit(code ?? 1)
    })
    return
  }

  await startPreview()
  const browser = await launchBrowser()
  try {
    const written = await capture(browser)
    await writeManifest(written)
    console.log(`\n${written.length} screenshots written to docs/screenshots/`)
  } finally {
    await browser.close()
    shutdown()
  }
}

/** `--check`: the committed set exists, is listed, and matches the current sources. */
async function check() {
  const failures = []
  const expected = CAPTURES.map((item) => `${item.slug}.png`)
  let present = []
  try {
    present = (await readdir(outDir)).filter((name) => name.endsWith('.png')).sort()
  } catch {
    failures.push('docs/screenshots/ is missing — run `npm run screenshots`')
  }
  for (const name of expected) {
    if (!present.includes(name)) failures.push(`missing screenshot docs/screenshots/${name}`)
  }
  for (const name of present) {
    if (!expected.includes(name)) {
      failures.push(`stale screenshot docs/screenshots/${name} is not declared by tools/screenshots.mjs`)
    }
  }

  // Freshness cannot come from file dates: a git checkout stamps every file with
  // the checkout time, so mtimes say nothing about which version of the UI a PNG
  // shows. The capture writes a stamp naming the sources it photographed, and this
  // check re-hashes those sources and compares. A changed `src/`, `index.html` or
  // catalogue without a re-shoot therefore fails, and it fails identically on a
  // fresh clone and on the machine that took the shots.
  let stamp = null
  try {
    stamp = JSON.parse(await readFile(path.join(outDir, STAMP_NAME), 'utf8'))
  } catch {
    failures.push(`docs/screenshots/${STAMP_NAME} is missing — run \`npm run screenshots\``)
  }
  if (stamp) {
    if (stamp.source !== (await sourceDigest())) {
      failures.push(
        'the screenshots were taken from different sources than the current tree — ' +
          'a UI change landed without a re-shoot; run `npm run build:emulator && npm run screenshots`',
      )
    }
    if (stamp.captures !== expected.length) {
      failures.push(`${STAMP_NAME} records ${stamp.captures} captures, the tool now makes ${expected.length}`)
    }
    if (stamp.clock !== CLOCK.toISOString()) {
      failures.push(`${STAMP_NAME} was taken at a different clock than the capture defines — re-shoot`)
    }
    for (const [name, bytes] of Object.entries(stamp.files ?? {})) {
      if (!present.includes(name)) continue
      const info = await stat(path.join(outDir, name))
      if (info.size !== bytes) failures.push(`docs/screenshots/${name} is ${info.size} B, the stamp says ${bytes} B`)
    }
  }

  try {
    const manifest = await readFile(path.join(outDir, 'README.md'), 'utf8')
    for (const name of expected) {
      if (!manifest.includes(name)) failures.push(`docs/screenshots/README.md does not list ${name}`)
    }
  } catch {
    failures.push('docs/screenshots/README.md is missing — run `npm run screenshots`')
  }

  const readme = await readFile(path.join(root, 'README.md'), 'utf8')
  for (const name of README_IMAGES) {
    if (!readme.includes(`docs/screenshots/${name}`)) failures.push(`README.md does not show docs/screenshots/${name}`)
  }

  if (failures.length) {
    for (const failure of failures) console.error(`✗ ${failure}`)
    process.exit(1)
  }
  console.log(
    `Screenshots verified: ${expected.length} PNGs present, listed in docs/screenshots/README.md, ` +
      'and taken from the current sources (sha-256 stamp in docs/screenshots/capture.json).',
  )
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(130)
})
process.on('SIGTERM', () => {
  shutdown()
  process.exit(143)
})

await main()
