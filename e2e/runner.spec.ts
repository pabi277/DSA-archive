import { expect, test, type Page } from '@playwright/test'
import { desktop, open, phone } from './helpers'

/**
 * Phase v2-07 — "Done means" for the local runner, at phone and desktop width
 * against the Auth emulator:
 *
 *   · an unsupported language offers a copy-out and a reason, never a dead Run;
 *   · the first Run announces its download and waits for an explicit tap;
 *   · **JavaScript really runs** in the sandboxed worker (`console.log` → output)
 *     with no compiler to fetch — this is the path every CI run exercises;
 *   · the Settings card reports the cached bytes and Clear removes them;
 *   · nothing that leaves the page contains the learner's code.
 *
 * The C++ assertions need the ~29 MB Clang pack on disk, so CI fetches it in a
 * step of its own and sets `RUNNER_CPP=1`; without it this file still proves the
 * install flow, the worker protocol and the a11y of every designed state.
 */
const cppRuntime = process.env.RUNNER_CPP === '1'

/**
 * Sign in through the Auth emulator (the code surface requires an account).
 * Same shape as `code.spec.ts`: the button only exists signed-out, so the click
 * is unconditional and the banner is what proves it worked — a silent "if
 * visible" guard turns a broken sign-in into an unrelated-looking timeout.
 */
async function signIn(page: Page) {
  await open(page, '/')
  await page.getByTestId('emulator-sign-in').click({ timeout: 20_000 })
  await expect(page.getByTestId('signed-in-banner')).toContainText('CI Owner')
}

/**
 * `#/problem/<id>?tab=code` is where the runner lives. A signed-in learner with
 * no saved solution lands straight in the editor (`code-editor`); one who has a
 * solution lands on the read panel (`code-panel`). Both carry the runner.
 */
async function openCodeTab(page: Page, problemId = 'two-sum') {
  await open(page, `/#/problem/${problemId}?tab=code`)
  await expect(page.getByTestId('code-editor').or(page.getByTestId('code-panel'))).toBeVisible({
    timeout: 20_000,
  })
  // The runner is its own lazy chunk: waiting for it here means a chunk or
  // import regression fails as itself, not as a mystery timeout on a button.
  await expect(page.getByTestId('runner-panel')).toBeVisible({ timeout: 20_000 })
}

async function chooseLanguage(page: Page, language: string) {
  await page.getByTestId('code-language').selectOption(language)
}

async function typeCode(page: Page, code: string) {
  const input = page.getByTestId('code-input')
  await input.fill(code)
}

/** Wait until the runner reports that its assets are installed. */
async function install(page: Page, expectedLabel: RegExp) {
  const download = page.getByTestId('runner-download')
  await expect(download).toBeVisible({ timeout: 20_000 })
  await expect(download).toHaveText(expectedLabel)
  await download.click()
}

test.describe('local runner', () => {
  test.skip(!process.env.PLAYWRIGHT_EMULATOR, 'Requires the Firebase Emulator Suite in CI')

  test('a language the browser cannot run shows copy-out, not a dead Run', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize(desktop)
    await signIn(page)
    await openCodeTab(page)
    await chooseLanguage(page, 'java')

    const unsupported = page.getByTestId('runner-unsupported')
    await expect(unsupported).toBeVisible()
    await expect(unsupported).toContainText('no JVM that runs inside a phone browser')
    await expect(page.getByTestId('runner-copy-out')).toBeVisible()
    await expect(page.getByTestId('runner-run-button')).toHaveCount(0)
  })

  test('JavaScript runs in the sandbox, and nothing leaves the page', async ({ page }) => {
    test.setTimeout(180_000)
    const outgoing: string[] = []
    page.on('request', (request) => {
      outgoing.push(`${request.url()} ${request.postData() ?? ''}`)
    })

    await page.setViewportSize(phone)
    await signIn(page)
    await openCodeTab(page)
    await chooseLanguage(page, 'js')
    const marker = 'runner-marker-9f3c1a'
    await typeCode(page, `const values = [3, 1, 2];\nconsole.log(values.sort().join(' '));\nconsole.log('${marker}');`)

    // The first press is a download, announced with its real size.
    await install(page, /Download JavaScript runner · 1\.\d MB, once/)

    const output = page.getByTestId('runner-output')
    await expect(output).toContainText('1 2 3', { timeout: 60_000 })
    await expect(output).toContainText(marker)
    await expect(page.getByTestId('runner-facts')).toContainText('exit 0')
    await expect(page.getByTestId('runner-error')).toHaveCount(0)

    // The learner's code is never uploaded: no request carries it.
    expect(outgoing.filter((entry) => entry.includes(marker))).toHaveLength(0)
    expect(outgoing.filter((entry) => entry.includes('values.sort'))).toHaveLength(0)

    // One committed baseline of the panel in its "ran fine" state. The timing
    // line is masked because it is a measurement, not a design.
    await page.getByTestId('runner-panel').scrollIntoViewIfNeeded()
    await expect(page).toHaveScreenshot('runner-js-phone.png', {
      animations: 'disabled',
      mask: [page.getByTestId('runner-facts')],
      maxDiffPixelRatio: 0.02,
    })
  })

  test('the Settings card reports the cache and clears exactly it', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize(desktop)
    await signIn(page)
    await openCodeTab(page)
    await chooseLanguage(page, 'js')
    await typeCode(page, "console.log('cached');")
    await install(page, /Download JavaScript runner/)
    await expect(page.getByTestId('runner-output')).toContainText('cached', { timeout: 60_000 })

    await open(page, '/#/settings')
    const card = page.getByTestId('runner-settings')
    await expect(card).toBeVisible()
    await expect(page.getByTestId('runner-cache-size')).toContainText('cached')
    await expect(page.getByTestId('runner-cache-size')).toContainText('offline')

    await page.getByTestId('runner-clear-cache').click()
    await expect(page.getByTestId('runner-cache-cleared')).toBeVisible()
    await expect(page.getByTestId('runner-cache-size')).toContainText('Nothing cached yet')
  })

  test('a claim about the download is never made up: what is not deployed is named', async ({ page }) => {
    test.skip(cppRuntime, 'The C++ pack is installed in this CI run')
    test.setTimeout(120_000)
    await page.setViewportSize(phone)
    await signIn(page)
    await openCodeTab(page)
    await chooseLanguage(page, 'cpp')
    await expect(page.getByTestId('runner-unavailable')).toContainText('is not deployed with this build')
  })

  test('C++ compiles a std::sort program, end to end, on a phone', async ({ page }) => {
    test.skip(!cppRuntime, 'Set RUNNER_CPP=1 after `npm run runtime:fetch -- --pack cpp`')
    test.setTimeout(300_000)
    await page.setViewportSize(phone)
    await signIn(page)
    await openCodeTab(page)
    await chooseLanguage(page, 'cpp')
    await typeCode(
      page,
      [
        '#include <algorithm>',
        '#include <cstdio>',
        '#include <vector>',
        'int main() {',
        '  std::vector<int> values{3, 1, 2};',
        '  std::sort(values.begin(), values.end());',
        '  printf("%d %d %d\\n", values[0], values[1], values[2]);',
        '}',
      ].join('\n'),
    )

    await install(page, /Download C and C\+\+ compiler · \d+(\.\d)? MB, once/)
    await expect(page.getByTestId('runner-output')).toContainText('1 2 3', { timeout: 240_000 })
    await expect(page.getByTestId('runner-facts')).toContainText('Compiled in')
    await expect(page.getByTestId('runner-facts')).toContainText('exit 0')
  })

  test('a failing case shows which case and the first differing line', async ({ page }) => {
    test.skip(!cppRuntime, 'Set RUNNER_CPP=1 after `npm run runtime:fetch -- --pack cpp`')
    test.setTimeout(300_000)
    await page.setViewportSize(desktop)
    await signIn(page)
    // `largest-element` ships three authored cases in phase 03.
    await openCodeTab(page, 'largest-element')
    await chooseLanguage(page, 'cpp')
    await typeCode(page, '#include <cstdio>\nint main() { printf("0\\n"); }')

    // `Run tests` installs the toolchain on its way (it calls the same warm-up),
    // so the failing-case path is one press, like it is for a learner.
    await page.getByTestId('runner-tests-button').click()
    // `largest-element` ships three cases; a program that always prints `0`
    // differs on case 1 (expected `-2`) and case 2 (expected `12`) and happens to
    // match case 3 (expected `0`) — so the honest summary is 1 of 3.
    await expect(page.getByTestId('runner-cases-summary')).toContainText('✗ 1/3 — case 1 differs', {
      timeout: 240_000,
    })
    await expect(page.getByTestId('runner-diff-1')).toContainText('- expected: -2')
    await expect(page.getByTestId('runner-diff-1')).toContainText('+ actual:   0')
  })

  test('a runaway loop stops instantly and leaves nothing running', async ({ page }) => {
    test.skip(!cppRuntime, 'Set RUNNER_CPP=1 after `npm run runtime:fetch -- --pack cpp`')
    test.setTimeout(300_000)
    await page.setViewportSize(phone)
    await signIn(page)
    await openCodeTab(page)
    await chooseLanguage(page, 'cpp')
    await typeCode(page, '#include <cstdio>\nint main() { for (volatile long i = 0; i < 1000000000L; i += 1) {} }')

    await page.getByTestId('runner-download').click()
    const stop = page.getByTestId('runner-stop')
    await expect(stop).toBeVisible({ timeout: 240_000 })
    // The program never terminates on its own, so the only way out is our Stop
    // (or the client's own hard stop if this machine is very slow — either way
    // the run must end and leave no Stop button behind).
    await stop.click({ timeout: 30_000 }).catch(() => {})
    await expect(page.getByTestId('runner-status')).toContainText('Stopped', { timeout: 30_000 })
    await expect(page.getByTestId('runner-stop')).toHaveCount(0)
  })
})
