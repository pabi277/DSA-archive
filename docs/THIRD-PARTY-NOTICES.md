# Third-party notices

DSA Archive's own code and data are MIT (`LICENSE`). The app also **serves, but does not
modify**, the following third-party binaries. They are not committed to git: they are
downloaded by `npm run runtime:fetch` (verified against the npm registry's sha-512) and by
`npm run runtime:worker`, and they live only in `public/runtime/`.

## Phase v2-07 — the local code runner

| Component | Version | Licence | What we serve | Where |
|---|---|---|---|---|
| `@live-codes/clang-wasm` | 0.3.0 | MIT | Clang 22.1.8, `wasm-ld`, the memfs shim and the wasi sysroot, as `.wasm.gz` + `runtime-manifest.v1.json` | `public/runtime/clang/` |
| `@wasm-idle/llvm-core` | 1.3.0 | MIT **and** Apache-2.0 WITH LLVM-exception | LLVM's own licence text applies to the compiler binaries above | bundled into the worker |
| `@bjorn3/browser_wasi_shim` | (as resolved) | MIT | the WASI host used to run the compiled program | bundled into the worker |
| `pyodide` | 314.0.7 | MPL-2.0 | CPython 3.13 on wasm, its standard library archive and lock file | `public/runtime/pyodide/` |
| `esbuild` | 0.28.2 | MIT | build-time bundler for `public/runtime/runner/worker-<hash>.js` | `package.json` |

The worker bundle starts with a licence banner naming the three components it carries;
this file is the fuller record.

Nothing above is patched, re-licensed or re-branded, and none of it is fetched from a
third-party CDN at runtime: the app serves these files itself so a run works offline and
no learner code or identifier ever reaches anyone else's server.

## Everything else

`package.json` lists the remaining dependencies (React, Firebase, Vite, Vitest,
Playwright, `@firebase/rules-unit-testing`, TypeScript). Their licences are recorded in
`docs/DECISIONS.md` as they were adopted, phase by phase, under the reuse rule in
`rule.md` §5.
