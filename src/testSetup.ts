/**
 * Shared test environment — the things jsdom cannot do, done quietly.
 *
 * Why this file exists (2026-11-04): `main` failed its Unit tests step while
 * every one of the 294 cases passed, and the annotation named nothing. The
 * cause was an unhandled rejection during worker teardown:
 *
 *     [vitest-worker]: Closing rpc while "onUserConsoleLog" was pending
 *
 * vitest forwards console output from the test thread to the main thread as an
 * async RPC call. jsdom answers `window.scrollTo()` and `scrollIntoView()` with
 * a "Not implemented" message *on the console*, and the app calls `scrollTo` on
 * every route change — so a restore-scroll can land after the last test has
 * finished, with its log still in flight. Teardown then kills the worker
 * mid-RPC and the whole run fails without naming a test, because no test failed.
 *
 * A stub is the honest fix rather than a silenced warning: nothing in these
 * tests asserts scroll position, and jsdom's "implementation" is a no-op that
 * differs only by shouting. This removed 157 console writes per run.
 *
 * Do not put assertions or per-suite setup in here — it runs once per test
 * file, before the file's own `beforeEach` hooks.
 */
if (typeof window !== 'undefined') {
  const noop = () => undefined
  // `Object.assign` keeps the overload signatures jsdom declares (2-arg
  // scrollTo(options) and 4-arg scrollTo(x, y)) from failing typecheck.
  Object.assign(window, {
    scrollTo: noop,
    scrollBy: noop,
    scroll: noop,
  })
  // Some specs render into detached containers; jsdom lacks these entirely.
  if (typeof Element !== 'undefined') {
    Element.prototype.scrollIntoView = noop
    Element.prototype.scrollTo = noop
  }
}
