# Phase v2-07 — Browser runner (C++, Python, JavaScript) — RECORD

**Branch:** `arena/435eaa93-dsa-archive` (cut from `main` at `d44b55a`, the merge of PR #17)
**Contract:** [`PLAN.md`](PLAN.md) · **Status:** implemented; stopped at the owner's PR/merge gate
**CI:** run `{{CI_RUN_ID}}` on `{{CI_SHA}}` — {{CI_RESULT}}
**Preview:** `site-preview` {{PREVIEW_BYTES}} B

---

## 1. What is now visible

A **Run** panel beside the code on `#/problem/<id>?tab=code` (and in the row editor
that opens from `#/code`), plus one hook inside theory cards and a storage card in
Settings. Everything runs locally, in a worker, with the network switched off while a
program executes.

| Where | What a learner sees |
|---|---|
| Code panel (view **and** edit) | `Run ▸`, `Run tests ▸ 3` (when the problem has authored cases), `stdin`, output pane, `Stop`, `Copy output`, `Clear`; `⌘↵` runs, `Esc` stops |
| First run of a language | **`Download C and C++ compiler · 29.0 MB, once`** — an explicit tap, a real byte count, a `role="progressbar"` with `12.4 of 29.0 MB`, and Cancel (`Stop`) |
| C++ compile | `Compiled in 1.18 s · ran in 41 ms · exit 0`, stdout, stderr in the danger role, and the first diagnostic in monospace with `N more line(s)` |
| Test cases | `✓ 3/3 passed`, or `✗ 2/3 — case 3 differs` with `- expected: 0` / `+ actual:   -1` and nothing else |
| Runaway program | Stop terminates the worker in milliseconds and says `Stopped. The sandbox was killed and nothing is left running.` |
| Java / Go / Rust / TS | The Run button is **replaced** by the reason ("There is no JVM that runs inside a phone browser…") plus `Copy code` and the right playground — never a dead button |
| Offline with nothing cached | "The runtime is not on this device yet and the network is unavailable. Connect once, or copy the code into Compiler Explorer." |
| Theory cards (`[Check]`, problem page, primer inline checks) | After answering, `Run this snippet to check ▸` opens the same panel on the card's own snippet — the predict-the-output hook |
| `#/settings` | **Local runner** card: each pack with its size and licence, `Cached` / `Not downloaded`, `On this device: 29.0 MB cached · runs work offline`, one **Clear** that removes only `dsa-archive-runtime-v1` |

## 2. How it works (and why it is shaped this way)

```
 main thread                    runtime bucket (Cache Storage)          worker (no DOM)
 ─────────────────────────      ─────────────────────────────          ────────────────────
 RunPanel (lazy chunk)   ──►    /runtime/runner/worker-<hash>.js  ──►   fetch shim: cache-first
 RunnerClient.warm()            /runtime/clang/…  (29.0 MB)             + network OFF for programs
 RunnerClient.run()       ──►   /runtime/pyodide/… (13.5 MB)      ──►   Clang 22 wasm · Pyodide · JS
 timeout ─► terminate()         dsa-archive-runtime-v1                  byte progress, 256 kB caps
```

- **The shell did not pay for it.** The panel, the Settings card and the MCQ hook are
  dynamic chunks renamed `assets/runner-*.js` (26,543 B raw / 9,907 B gzip, four files),
  excluded from the Service Worker precache and from the shell budget by prefix. The
  worker bundle (1,276,228 B) and both toolchains live in `public/runtime/`, which the
  Service Worker serves cache-first from `dsa-archive-runtime-v1`.
- **Shell measured 386,674 B gzip against the frozen 388,000 B cap** (1,326 B of
  headroom). The only shell growth is the panel's integration: `+1.4 kB` gzip in
  `content-ui` (the `lazy` + `Suspense` hook in `mcqCard`, the two `Suspense` wrappers in
  the code panel) against `−0.7 kB` recovered in the entry chunk. **No further shell
  growth is available**; anything more is a gate (§6).
- **Stop is a `terminate()`.** wasm that will not yield cannot be interrupted from its
  own thread, so the client kills the worker; the next run respawns it and re-reads the
  cached assets (seconds, not megabytes). This is also why a stopped run does not leave
  a half-compiled program behind.
- **Two clocks, not one.** The first compile of a language on a device gets a 45 s
  allowance; afterwards a case gets its 3 s. Without the split, the phase's "3 s per
  case" would time out the very first case on a mid-range phone while Clang warms up.
  The whole list shares one 30 s budget (`src/runner/tests.ts`).
- **The network is off, provably.** The worker replaces `fetch`: `/runtime/*` is served
  cache-first, and *everything else throws* while a program runs. `WebSocket`,
  `EventSource`, `importScripts` and `XMLHttpRequest` are deleted for the duration. In
  the JS sandbox `fetch`, timers, `caches`, `localStorage` and friends are additionally
  shadowed inside the function scope. `e2e/runner.spec.ts` also asserts on the main
  thread that no request ever carries the learner's code.

## 3. Toolchains and licences (reuse scan, 2026-11-04)

| Job | Choice | Licence | Verdict |
|---|---|---|---|
| C / C++ in the browser | [`@live-codes/clang-wasm`](https://www.npmjs.com/package/@live-codes/clang-wasm) `0.3.0` (Clang 22.1.8 + wasm-ld + wasi sysroot on wasm) | MIT | **DEPEND** — one library, one API (`createCompiler().run()`), actively released (0.3.0, 2026-09-23), assets are content-hashed files we serve ourselves |
| Python in the browser | [`pyodide`](https://www.npmjs.com/package/pyodide) `314.0.7` (CPython 3.13 on wasm) | MPL-2.0 | **DEPEND** — unmodified distribution, served from our origin, no Python packages installed beyond the stdlib |
| JavaScript | the browser's own engine | — | **BUILD** — `src/runner/jsSandbox.ts` |
| Bundle the worker | [`esbuild`](https://www.npmjs.com/package/esbuild) `0.28.2` | MIT | **DEPEND** (build-time only) |
| Write a compiler / interpreter ourselves | — | — | **REJECT** — a fake partial C++ would teach the wrong lesson; the honest limit is the browser |
| Remote judge (Judge0/Piston/Colab) | — | — | **REJECT** — owner decision: code never leaves the device, no server, no money |
| Monaco/CodeMirror editor | — | — | **REJECT** — phase 04 decision stands; the small `<textarea>` editor is enough |
| swc / babel / TypeScript compiler in the browser | — | — | **REJECT for now** — doubles the download; the copy-out link is honest |

Notice text ships inside the worker bundle banner and in
[`docs/THIRD-PARTY-NOTICES.md`](../../THIRD-PARTY-NOTICES.md).

## 4. Tests

| Kind | What ran | Result |
|---|---|---|
| Unit (`vitest`) | 54 new tests in `src/runner/*.test.ts(x)`: output capping and the run line, first-diff and the case sequencer (pass/fail/timeout/compile-stop/30 s budget/no cases/non-zero exit), the manifest sanitiser (traversal and shape attacks), install plans and the support matrix, the JS sandbox (values, cycles, blocked network and timers, thrown errors), the worker client against a fake worker (spawn URL, single warm, progress relay, timeout → `terminate`, Stop → `stopped`, crash → `internal`, diagnostics), and the panel's designed states (unsupported language, download-not-auto-start, missing pack, compact mode) | **290 total, green** |
| Playwright | `e2e/runner.spec.ts` at 390×844 and 1440×900 against the Auth emulator: unsupported language → copy-out; **JavaScript really runs** (`console.log` → output, `exit 0`); no request carries the code; Settings reports the cache and Clear empties it; with `RUNNER_CPP=1`: `std::sort` compile+run on a phone, a failing case with its first-diff, and a runaway loop stopped instantly | see §7 |
| Visual | new baseline `runner-js-phone.png` (timing line masked), and the `settings` baseline now waits for the lazy runner card so it cannot race its own import | generated in CI for review |
| Budgets | `check:budgets` now reports the runner in its **own** buckets (below) and asserts the Service Worker precaches none of it | green locally |
| Data / rules | no Firestore change, therefore no rules tests (contract §8). `test:data`, `check:content`, `check:rules`, `check:dist`, `check:links` unchanged and green | green locally |

Measured buckets (this branch, both packs on disk):

```
CSS          58.96 kB raw / 10.10 kB gzip   (cap 60 / 18)
Entry JS    112.29 kB raw / 32.20 kB gzip   (cap 180 / 55)
Largest JS  457.70 kB raw / 129.86 kB gzip  (cap 520 / 165)
Shell       386.67 kB gzip                  (cap 388 — 1,326 B headroom)
Runner UI    26.54 kB raw /  9.91 kB gzip   (cap 120 / 40 · lazy, never precached)
Toolchains   43.81 MB raw on disk           (cap 48 MB · downloaded per language)
Fonts        57.50 kB raw                   (cap 60 kB)
```

## 5. Deviations from the contract (all deliberate)

1. **The driver is 29.0 MB, not the ~14 MB the plan guessed.** A full C++17 standard
   library plus wasm-ld does not fit in 14 MB in 2026. The number is now *measured*,
   pulled from `public/runtime/packs.json` into the button label, and reported in
   Settings; Python is a separate 13.5 MB. Nothing is downloaded until the learner taps a
   button that states the size, and each language downloads only its own pack.
2. **`-std=gnu++17`, not `-std=c++17`.** The toolchain only offers the `gnu*` spellings
   (strict `c++17` rejects the GNU extensions Clang's default target relies on). It is
   the same language; `-O0 -Wall -Wextra` are as specified, and `std::sort` linking is
   covered by a real CI compile.
3. **The runner UI is an add-on chunk, not shell.** The prompt for this phase said the
   wasm/worker payload must stay in the runtime bucket and that raising the cap again
   needs a gate, so the panel and its CSS ride with the add-on: four `assets/runner-*`
   chunks, excluded from the precache, served from the runtime cache after install, with
   an honest offline fallback ("needs one online visit") before that. Net shell effect:
   `+1.4 kB` gzip in `content-ui`, still inside the frozen 388 kB.
4. **Python's `stdin` and `stdout` are batched, so `input()` works line by line** but
   interactive prompts inside a batch do not flush mid-line. Acceptable for the authored
   drils; documented in the panel's `stdin` label.
5. **No verdict field is written.** The contract allows the optional `verdict` on a
   snippet to be set from a run result; it is *not* set, because a runner result is not a
   judging verdict and the owner's rule is that we never invent one. The phase-04 verdict
   picker stays the only writer.
6. **`#/code` itself has no run panel.** `#/code` is a list of saved solutions with no
   editor surface; each row opens the problem page, where Run lives. Adding a second
   editor to `#/code` would have duplicated phase 04's panel for no capability.
7. **JavaScript has no `stdin`.** A browser cannot offer a blocking read. The snippet
   runs, prints, and the panel says stdin is for compiled languages only.
8. **TypeScript is copy-out.** Running TS would mean shipping a type checker on top of
   the compiler; the reason is stated in the UI and the playground link is offered.

## 6. Gates and follow-ups

- **Nothing was merged, deployed or pushed to `main`.** PR/merge remain the owner's call.
- **The 388 kB shell cap is now 1,326 B from the ceiling.** Phase 09 owns the re-baseline
  review; until then any shell growth is a gate, and this record is the measurement the
  owner should decide from.
- The toolchains are **not in git** (`public/runtime/{clang,pyodide,runner}/` and
  `packs.json` are ignored). A deploy or a fresh clone runs `npm run runtime:fetch`
  (both packs, or `--pack cpp`); CI does the C++ pack and verifies every byte.
- Owner review of the new visual baseline (panel + settings) is pending, as usual.

## 7. Fill-in after CI

- Run id / tip sha / preview bytes: `{{CI_RUN_ID}}` / `{{CI_SHA}}` / `{{PREVIEW_BYTES}}`.
- Playwright matrix result: `{{CI_RESULT}}`.
