# Phase 07 — Run C++ (and Python, JS) in the browser

**Folder:** `docs/phases-v2/07-browser-runner/`
**Estimate:** 5–7 days · **Depends on:** 04 (code panel), 03 (test cases) · **Blocks:** nothing
**Decision:** local WebAssembly compiler in a Worker — **no server, no judge, no money**,
code never leaves the device.

---

## 1. Charter

Add a **Run** button that actually compiles and executes C++ inside the browser, plus
Python and JavaScript. Show compile diagnostics, stdout/stderr, exit code and timing;
run the problem's authored test cases and show `✓ 3/3 passed` with a first-difference
diff. Ship the "predict the output" hook for quizzes. Never send code anywhere.

## 2. Current state
No execution of any kind. Code is stored (phase 04) and displayed; nothing runs.

## 3. Scope

### In
1. **Runtime (lazy, opt-in)**: a Clang/LLVM **wasm** toolchain in a dedicated Web Worker,
   loaded only when the user presses Run the first time:
   - C++ (`-std=c++17`, `-O0`, `-Wall -Wextra`, **`-fno-exceptions` off**, link
     **compiler-rt** so `std::sort` etc. link correctly);
   - Python (CPython-on-wasm via Pyodide-style runtime) and JavaScript (local `eval`
     in a Worker sandbox) — JS is free, Python costs ~10 MB more;
   - Toolchain assets live in `public/runtime/` (hashed), **never precached**, cached by
     the browser after first use, with a visible size + Clear control in Settings.
2. **Run panel** (in the code panel of the problem page and `#/code`):
   `[Run ▸]` · stdin textarea · output pane (stdout, then stderr in red, then
   `Compiled in 1.2 s · ran in 40 ms · exit 0`) · **Stop** (terminates the worker,
   `while(true)` dies in ms) · copy output · clear.
3. **Test cases** (from phase 03): `[Run tests ▸]` executes the authored `{input,
   expected}` list sequentially; result summary `✓ 3/3 passed` or
   `✗ 2/3 — case 3 differs` with a first-difference diff (expected vs actual, ≤10 lines).
   Timeout per case (3 s) and total budget (30 s) so a bad loop can't hang the tab.
4. **Predict-the-output hook**: a quiz/statement block can carry `codeSnippet` +
   `expectedOutput`; the learner commits an answer, **then** presses Run to verify —
   the single best use of a local compiler for beginners.
5. **Honest limits surfaced in the UI**:
   - Java / C# / Go / Rust → the Run button is replaced by a **Copy → open in Compiler
     Explorer / LeetCode** action, with a one-line reason;
   - first-run download is announced in advance (`Downloading compiler · 14 MB, once`);
   - progress with a real percentage/byte count, cancellable;
   - low-memory/timeout errors produce a human message, never a stack trace.
6. **Storage control** in Settings: `Compiler runtime 14.1 MB · cached · runs work
   offline` + **Clear** (clears Cache Storage for `/runtime/*` only).
7. **Safety**: everything runs in a Worker with no DOM, no network (fetch/XHR shimmed to
   throw), a memory cap, and a hard `terminate()` path. Output streams are capped
   (e.g. 256 kB) to prevent a runaway `printf` from freezing the UI.

### Out
Hidden/secret test suites, anti-cheat, ranking, judging verdicts (TLE/MLE nomenclature),
languages without a practical wasm runtime, server-side execution, online code sharing.

## 4. Design spec

```
┌ Code ────────────────────────────────────────────── cpp ▾  Saved ✓ ─┐
│ 1  class Solution {                                                 │
│ …                                                                    │
├──────────────────────────────────────────────────────────────────────┤
│ [Run ▸]  [Run tests ▸ 3]   stdin ▾            Stop  Clear            │
│ ┌ Output ──────────────────────────────────────────────────────────┐ │
│ │ ✓ compiled in 1.18 s · exit 0 · 41 ms                            │ │
│ │ 0 1                                                              │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ ✓ case 1 passed · ✓ case 2 passed · ✗ case 3                        │
│   expected: 0 1        actual: 1 0                                   │
└──────────────────────────────────────────────────────────────────────┘
```
States to design: never-downloaded · downloading (% + cancel) · compiling · running ·
stopped · compile error (monospace, first error surfaced + "N more") · timeout · unsupported
language · offline with no cache.

## 5. File plan

```
NEW  src/runner/client.ts        worker client (spawn, run, stop, progress, caps)
NEW  src/runner/worker.ts        toolchain load + compile + execute + stdout capture
NEW  src/runner/pyodide.ts       python runtime adapter (lazy)
NEW  src/runner/jsSandbox.ts     JS eval in worker
NEW  src/runner/runPanel.tsx     UI: run, stdin, output, tests, states
NEW  src/runner/tests.ts         test-case runner + first-diff algorithm (pure, tested)
NEW  src/runner/runtimeStore.ts  cache metadata, byte progress, clear()
NEW  public/runtime/<hash>/…     toolchain assets (gitignored or vendored per decision)
NEW  tools/fetch-runtime.mjs     downloads + verifies hashes at build time
EDIT src/code/editor.tsx         language switch ↔ runner support matrix
EDIT src/settings.ts             runtime cache state + clear action
EDIT vite.config.ts              worker build target + asset handling
EDIT tools/build-sw.mjs          exclude /runtime/* from precache + document why
EDIT tools/check-budgets.mjs     runtime assets reported separately, never in shell budget
NEW  e2e/runner.spec.ts          compile once, run, tests, stop, unsupported language
NEW  src/runner/*.test.ts
```

## 6. Data model
**No Firestore change.** Test cases come from `data/content/problems/*.json` (phase 03).
The optional stored `verdict` on a snippet (phase 04) may be set from a run result; that
is one field, already allowed by rules v6 (after Phase 04).

## 7. Accessibility & performance
- Run/Stop are real buttons with `aria-busy` on the output region and an `aria-live`
  status line; output is a `<pre>` with `tabindex="0"` and a label.
- Download progress uses `role="progressbar"` with text (never colour only).
- Keyboard: `⌘Enter` run, `Esc` stop when focused in the panel.
- Compile+run target: ≤2.5 s warm on the mid-range profile; ≤8 s cold on a phone (allowed,
  announced); worker spawn non-blocking; UI never < 60 fps while compiling.
- Offline: if cached, runs work offline; if not, the button explains and offers copy-out.

## 8. Tests
| Kind | What |
|---|---|
| Unit | first-diff algorithm · output capping · test runner sequencing · support matrix |
| Playwright | first run triggers download state (mocked) · compile hello-world · one failing test diff · stop a runaway loop · unsupported language shows copy-out · clear cache |
| Data | test cases valid (phase 03 validator) |
| No rules tests (no schema change) |

## 9. Risks
| Risk | Mitigation |
|---|---|
| 14 MB first download on mobile data | Announce size, require an explicit tap ("Download compiler · 14 MB"), allow deferral, never auto-load |
| Compiler quirks (`std::sort` link error, C++14 default) | Documented flags (`compiler-rt`, `-std=c++17`); a Playwright test runs a program using `std::sort` |
| Runaway output / infinite loops | Worker terminate, 256 kB output cap, 3 s per case, 30 s total |
| Bundle/budget violations | Runtime is a separate bucket, never precached, reported by `check-budgets` |
| Scope drift into a judge | Written limit: no hidden cases, no verdicts, no ranking |
| Security expectation mismatch | Copy states clearly: runs locally, sandboxed, nothing uploaded |

## 10. Acceptance
A beginner writes C++, presses Run, sees correct output in ≤2.5 s warm · a failing test
shows a first-difference diff · infinite loop stops instantly · Python runs after its own
download · Java shows copy-out with a reason · Settings reports and clears the cache ·
offline works when cached · no network request contains the user's code (asserted in a
test via a fetch spy).

## 11. Exit
Owner runs one problem end-to-end on a phone and desktop, merges. Programme then moves to
08 (insights), 09 (hardening), 10 (release).
