# Phase 09 — PWA, accessibility, performance & hardening

**Folder:** `docs/phases-v2/09-pwa-accessibility-hardening/`
**Estimate:** 4–5 days · **Depends on:** 01–08 · **Blocks:** 10
**Why:** six phases will have added a router, fonts, a player, a 14 MB runtime and four
new data shapes. This is the phase where the app must still be fast, offline, accessible
and inside its budgets — deliberately, not by luck.

---

## 1. Charter

Re-baseline and enforce budgets, extend the Service Worker safely (player + runtime
exclusions), complete the accessibility and offline matrices, verify quota and privacy
copy, and remove the dead weight (notes, unused Tailwind/daisyUI decision, stale CSS).

## 2. Current state (evidence)

| Fact | Evidence |
|---|---|
| v1 budgets exist and are enforced | `tools/check-budgets.mjs:12-19` |
| SW precaches same-origin GET only, skips `/__/*` | `tools/build-sw.mjs`, `docs/DECISIONS.md` |
| 12 emulator rules tests in v1 | `tools/firestore-rules.test.mjs` |
| axe + phone/desktop audits exist in e2e | `e2e/pwa.spec.ts`, `e2e/sheet.spec.ts` |
| Tailwind imported with `source(none)`, daisyUI unused | `src/styles.css:1`, `package.json` |
| Notes code will be deleted in 04 | planned |

## 3. Scope

### In
1. **Budgets (re-baselined here, final):**
   ```
   CSS raw ≤60 kB · gz ≤18 kB
   entry JS raw ≤180 kB · gz ≤55 kB
   single chunk raw ≤520 kB · gz ≤165 kB
   app shell gz ≤380 kB          (fonts included; content JSON included)
   runtime assets (compiler, python) = separate reported bucket, never in shell
   ```
   `check-budgets.mjs` prints a table and fails CI on any breach; the phase record carries
   the measured numbers with the rationale for each increase.
2. **Service Worker v2**: precache the shell + content JSON; **never** intercept
   `youtube.com`, `youtube-nocookie.com`, `googlevideo.com`, `iframe_api`, or
   `/runtime/*`; add a `navigationPreload`-free, hash-versioned update flow with a
   visible "New version ready — Reload" toast; keep `/__/auth/*` bypass.
3. **CSP decision (recorded)**: either ship a CSP (`frame-src` for YouTube,
   `script-src 'self'` + the iframe API, `worker-src 'self' blob:`, `connect-src`
   Firebase) or document why not. Recommendation: **ship it** — it is now a multi-surface
   app with a player and a worker.
4. **Accessibility matrix, completed**: axe 0 on **every** route at 390×844, 768×1024,
   1440×900, dark + light, large text (18 px base), `prefers-reduced-motion`, and keyboard
   only. Includes the new surfaces: palette, mini player, quiz radiogroup, editor,
   runner output, stamps list.
5. **Offline matrix**: cold open offline → Today (cached data), Topics, topic page,
   statement, quiz run, review; problem page shows statement + code + "video offline"
   state; runner says "cached/unavailable"; `#/code` saves offline and syncs later.
6. **Performance passes**: sheet windowing verified (≤1,200 nodes), route transition
   <100 ms, fonts preloaded with `font-display: swap` and no CLS, images/thumbnails lazy,
   Lighthouse mobile ≥90 perf / ≥95 a11y on `#/`, `#/topics`, `#/topic/arrays`,
   `#/problem/<x>`, `#/code`.
7. **Quota & privacy audit (v2)**: recompute Spark math with `snippets`, `quizResults`,
   settings fields; verify "delete my data" removes `progressByTopic`, `snippets`,
   `quizResults`, `lists`, `plans`, profile, and friends docs; update the privacy copy in
   Settings and README; confirm no third-party requests at runtime (assert with a network
   log test: only Firebase + YouTube on video routes).
8. **Dead weight removal**: Tailwind/daisyUI decided (recommendation: remove both from
   `package.json` if no utility classes are used after phase 01 — record either way), stale
   v1 CSS classes pruned, notes references gone, unused files deleted, `docs/UI-REFERENCE.md`
   v2 tokens table finalised.
9. **Test-suite consolidation**: one Playwright project matrix (phone/desktop), shared
   fixtures for auth/emulator, visual baselines refreshed deliberately, total CI wall time
   target ≤12 minutes.

### Out
New features · Firebase product changes · analytics · deploy.

## 4. Design spec
No new visual design. This phase guarantees the *quality bar* of everything designed in
01: contrast, focus, density, empty/error/offline states, and that no screen regressed.

## 5. File plan

```
EDIT tools/check-budgets.mjs         final budgets + runtime bucket + table output
EDIT tools/build-sw.mjs              precache list, bypass rules, update flow
EDIT public/sw.js (generated)        regenerated
EDIT firebase.json                   CSP header (if adopted), cache headers review
EDIT package.json                    dead dependency removal decision
EDIT src/styles.css                  prune unused, keep tokens only
NEW  e2e/a11y-matrix.spec.ts         3 widths × 2 themes × N routes
NEW  e2e/offline-matrix.spec.ts      cold opens per route
NEW  e2e/network.spec.ts             "only Firebase + YouTube" assertion
EDIT e2e/*.spec.ts                   shared fixtures, stability pass
EDIT docs/UI-REFERENCE.md            tokens v2 final, screen inventory v2
EDIT docs/DATA-MODEL.md              snippets, quizResults, settings fields, quota v2
NEW  docs/phases-v2/09-…/RECORD.md   measured numbers + rationale
```

## 6. Data model
No new shapes. Documentation of what 04/05/08 added (§ `docs/DATA-MODEL.md` v5 section),
plus the deletion contract test.

## 7. Accessibility & performance (acceptance targets)
- axe: **0 violations**, all routes, all matrices.
- Contrast: all text pairs ≥4.5:1, action-ink ≥4.5:1 — asserted by a token test.
- Keyboard: every route fully operable; no trap; visible focus everywhere.
- Targets: ≥44 px on phone, ≥32 px desktop.
- Lighthouse mobile: perf ≥90, a11y ≥95 on the five listed routes.
- Offline: all routes open; no unstyled flash; player shows its designed state.
- `prefers-reduced-motion`: no view transitions, no blooms, no shimmer.

## 8. Tests
Full suite: unit (Vitest) + rules (emulator, now ≥22 tests) + e2e (phone/desktop) +
visual + budgets + data validation + content validation + link checks + a11y + offline +
network assertion. CI green from a clean clone.

## 9. Risks
| Risk | Mitigation |
|---|---|
| Budget re-baseline hides a real regression | Publish per-surface numbers and the v1→v2 delta with a reason per line |
| SW caching a YouTube response breaks the player | Explicit bypass list + offline-matrix test on a video route |
| CSP breaks the iframe API or Firebase auth | Ship CSP in *report-only* first inside the phase, confirm zero violations, then enforce |
| a11y regressions in new surfaces | Matrix runs in this phase and stays in CI |
| CI time creeps | Split projects, cache deps, cap workers |

## 10. Acceptance
All budgets green with published numbers · 0 axe violations across the full matrix ·
cold offline open works on every route · network assertion proves no third-party calls
except YouTube on video routes · "delete my data" verified by a test · dead dependencies
decided and recorded · CI ≤12 min.

## 11. Exit
Owner reviews the numbers table, merges. Phase 10 writes the release docs.
