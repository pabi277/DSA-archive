# Phase 0-D — Design prototype + tokens freeze

- Date: 2026-11-02
- Status: 🚧 Prototype prepared; **owner review/approval is pending**. No final tokens are frozen and Phase 1 has not started.
- Scope: roadmap Phase 0-D only. This is a disposable mock, not implemented product behavior.

## Owner's prototype direction (2026-11-02)

The owner selected: dark-first; neutral badges with text labels; support both phones and desktop (comfortable phone touch spacing, broader desktop layout); text-only “DSA Archive” wordmark. These select a draft direction only—not approval of the prototype or frozen tokens. Recorded in `docs/DECISIONS.md` and `docs/UI-REFERENCE.md`.

## Prototype delivered

- Replaced the bare Phase 0 hello-sheet view with a clearly marked **DESIGN PREVIEW** prototype. All account, progress, notes, friend and planner values are fake; there is no Firebase connection and no persistence.
- The screen picker previews all 25 entries in `docs/UI-REFERENCE.md`: signed-out/in sheet, expanded topic, no-results state, completion, sign-in/error, offline/sync, problem detail with/without note, notes and lists empty/populated/editing, Today planned/empty/goal-met, revision due/caught-up, stats, friends invite/compare/group goal, settings, offline and not-found.
- Includes dark/light toggle, large-text toggle, simulated network status, responsive sidebar/bottom navigation, responsive topic sheet, neutral text-labelled levels, empty/error states, sample progress/notes, opt-in sharing default-off, and sample weekly/streak views.
- V1 catalogue and sample topic/problem titles come only from `data/problems.json`; no copied page visuals, code, assets or learning text were introduced. Prototype styles are original in `src/styles.css` and remain provisional.
- The “Preview screen” selector makes all mock states reachable in one preview; the responsive layout targets 390px phone and 1280px desktop in CI. The selected default is dark-first sheet/signed-out.

## Draft token proposal — awaiting approval

Candidate palette, typography and spacing are documented in `docs/UI-REFERENCE.md` and implemented only as prototype variables in `src/styles.css`. They are explicitly **not frozen**. The approval checkbox remains blank. Do not begin Phase 1 or product UI until the owner approves the mock and the final values are copied into the frozen Tokens section.

## Reuse / clean-room check (2026-11-02)

- **STUDY:** only the approved factual catalogue data already in `data/problems.json` (topic/subtopic/problem labels and outbound links).
- **BUILD:** original React mock components, responsive CSS, sample state labels, test and screen-selection affordance.
- **DEPEND:** existing React/Vite/Tailwind/daisyUI stack only; no new UI package, icons, fonts, analytics or network calls.
- **ADAPT:** responsive navigation and layout patterns are original implementation of the project's screen inventory; no visual template copied.
- **REJECT:** copied takeUforward HTML/CSS/JS/fonts/images/logos/content; Firebase SDK/auth/firestore calls (not appropriate in a fake preview); real sign-in, writes, share actions or outbound row behavior (Phase 1+).

## Verification and preview

- `npm run test:data` — PASS.
- `npm test` — PASS (existing catalogue unit tests).
- `npm run build` — PASS.
- `npm run check:dist` — PASS (no copied-site files).
- `npm run check:links` — PASS.
- `git diff --check` — PASS.
- Local default `npm run test:e2e` initially could not launch because the Playwright-managed Chromium executable is absent and its download host is outside the configured network allowlist. For diagnosis, a temporary Chromium 153 package from the allowed npm registry was launched with its bundled shared libraries; the full local Playwright inventory, phone/desktop layout, and axe checks then passed. The first pushed CI run exposed an axe `region` violation because the preview disclosure was outside landmarks; it is now a named `<aside>`.
- CI run [#10](https://github.com/pabi277/DSA-archive/actions/runs/41479517916) on `e03c4ca` passed catalogue validation, unit tests, build/dist/link checks, Chromium phone/desktop screenshots and axe checks. It uploaded `site-preview` (130,951 bytes; artifact is downloadable from the run).

Preview shows a “DESIGN PREVIEW” banner, a dark-first mock sheet, 495 problems and 20 topics, state picker and fake-data context panel. It is not a public site and does not save anything.

## Approval gate — stop here

Owner approval is still required in chat. Review the `site-preview` artifact (phone and desktop) and state either “approve the prototype and proposed tokens” or list changes. The next response must update `docs/UI-REFERENCE.md` with the approval date and freeze only the approved values. Keep Phase 0-D 🚧 and Phase 1 📋 until that explicit approval. No PR, merge, deployment, Firebase project or Hosting change was made.
