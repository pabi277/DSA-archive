# Can C++ run inside the browser? — options, costs, recommendation

**Date:** 2026-11-03 · **Status:** decision note, no code
**Question (owner):** can I run C++ in the browser, or can I only paste code after
testing? Or something like LeetCode?

**Short answer:** **Yes — real C++ compilation + execution inside the browser is
possible and fast enough**, with no server, no Firebase changes and no money. It costs
a **one-time ~14 MB download** (cached, then offline). Judge0/Piston-style remote
runners are the other option and I recommend against them for your setup.

---

## 1. The three achievable levels

| Level | What the user gets | Server? | Cost | Verdict |
|---|---|---|---|---|
| **L0 — Save only** | Write/paste code, it's stored in Firestore, view later | none | 0 | Too weak; not "LeetCode-like" |
| **L1 — Run locally (wasm)** | **Run** button, stdin, stdout, compile errors, exit code, compare against expected output → pass/fail. Works offline after first load | **none** | **0** | ✅ **Recommended** |
| **L2 — Remote judge** | Hidden test cases, TLE/MLE verdicts, many languages, anti-cheat | Judge0/Piston on a VPS | VPS money + ops | ❌ For you |

---

## 2. Why L1 is real (measured, not theoretical)

Modern browser C++ runners are Clang compiled to WebAssembly, running in a Web Worker
with a WASI shim. Published measurements from 2026 work:

| Number | Value |
|---|---|
| Cold download, first ever "Run" | **~14.2 MB** over the wire (Runno-class build) |
| Warm reload / browser restart | **0 bytes** (Cache Storage) |
| Compile + link + run, typical beginner program | **~1.2 s** (worst case seen: 1.67 s) |
| `while(true){}` stopped by "Stop" | **1–17 ms**, page never freezes (worker terminate) |
| Cross-origin isolation (COOP/COEP headers) | **not required** — works on plain static hosting |

Other builds exist and are bigger: `browsercc` ships clang.wasm 43 MB + lld.wasm 23 MB +
sysroot 29 MB; `@live-codes/clang-wasm` (Clang 22) is ~29 MB compressed, lazy-loaded in a
worker; `emception` is 24.7 MB but takes **19–23 s** to compile hello-world (it runs six
tools in the browser) — too slow, discard.

Practical caveats worth knowing up front:
- **Phone costs more**: expect 3–8 s for the first compile on a mid-range Android, then
  warm runs ~1–2 s. Show a progress state, never a spinner with no label.
- Two known flag fixes for beginner code (documented by the 2026 feasibility work):
  link **compiler-rt** (otherwise `std::sort` fails to link) and force **C++17** (the
  default `-cc1` is C++14).
- The compiler must live in a **Worker** and be **lazy**: never in the PWA precache list,
  never in the entry bundle, never on the critical path of opening the app.

---

## 3. Why not the remote judge

- **Piston's public API is no longer freely available to the public** (its own README,
  effective **15 Feb 2026**); access is granted case-by-case on Discord for non-commercial
  educational projects. So "just use Piston" is no longer a plan.
- **Judge0 CE is free and MIT**, but it is software you must host: Docker on a VPS, with
  sandboxing, rate limits, upgrades and abuse handling. That is money plus ops — both are
  gates in `rule.md`, and it also contradicts the "Spark, no server code" invariant.
- Sending a beginner's code to a third-party endpoint costs privacy, adds a network
  dependency that breaks the offline promise, and adds nothing a local runner can't do for
  a single-user study app.

**L2 is only worth it if** this ever becomes multi-user with real judging (contests,
hidden suites, anti-cheat). Not now.

---

## 4. What "LeetCode-like" means at L1 (and what it honestly can't do)

**We can do:**
- Statement (ours, paraphrased) + constraints + example in/out.
- Editor with the language of your choice (**C++17/20, Python, JavaScript**; Java/C# are
  not practical in wasm yet — show them as "not runnable here, copy out").
- **Run** with custom stdin; see stdout, stderr, compiler diagnostics, exit code, and
  **compile/run time in ms**.
- **Tests** per problem: `input` + `expected output` pairs authored by us, run sequentially
  → `✓ 3/3 passed` with a per-case diff of the first mismatching line.
- **Quiz tie-in for beginners:** "predict the output" questions where the learner commits
  an answer, *then* presses Run to check. That is the single best use of a local compiler
  in a learning app, and it costs us nothing.
- Everything after first load works **offline** — the compiler is cached.

**We can't (and shouldn't) do:**
- Hidden/secret test suites, anti-cheat, multi-language judging, TLE-based ranking.
- Java/C# execution in-browser (no mature wasm JDK/DOTNET runtime at acceptable size).
- "Run" without the first download on a slow connection — always offer
  **"Copy → open in Compiler Explorer / LeetCode"** as the zero-download fallback.

---

## 5. Costs against our own rules

| Rule | Impact |
|---|---|
| Spark-only, no server | ✅ untouched — execution is client-side |
| Offline-first | ✅ better than a remote judge; one-time download then offline |
| CI budgets (`check-budgets.mjs`) | Add a **separate "runtime assets" bucket** (not in the 380 kB shell budget): compiler ~14 MB cached on demand, never precached, never counted in entry JS |
| Clean-room | ✅ statements/tests are ours; never copied |
| No money | ✅ 0 |
| Privacy | ✅ code never leaves the device; only the saved snippet goes to Firestore (as planned) |

Storage note: show the user `Compiler 14.1 MB · cached — runs work offline` in Settings
with a **Clear** button, so nobody is surprised by a large cache.

---

## 6. Recommendation

**Ship L1: local C++ (plus Python + JS) runner, opt-in download, in the Code panel of the
problem page and in `#/code`.** Treat it as *practice + verify*, not as a judge. Add the
copy-out fallback for anything not runnable locally.

This fits the plan already agreed: no new backend, no rules change beyond the `snippets`
collection, no paid services — and it turns the Code section from "a saved file" into
"something I can actually run", which is what a beginner needs.

---

## 7. Where it lands in the plan

- **Phase B (Notes → Code):** add `#/code` and the editor + save/load. **No runner yet.**
- **Phase F (new, after D Theatre, ≈4–6 days):** Worker-based wasm runner, output pane,
  per-problem test cases, predict-the-output hook in quizzes, Settings storage control,
  fallback copy-out links, Playwright test that compiles once and asserts `3/3 passed`.
- Test cases are **content**, not code: `{ input, expected }[]` in the problems JSON,
  authored alongside statements (§10 of the main plan). Beginner problems need 2–3 cases
  each; that is plenty.

*Nothing in `src/` changed. Say "yes to L1" and I'll fold Phase F into the plan with
acceptance tests, then start Phase A as agreed.*
