# Phase 0-D — Design prototype + tokens freeze

- Date: 2026-11-02
- Status: ✅ **Complete — approved by the owner 2026-11-02 and tokens frozen.** See "Approval outcome" at the end of this record.
- Scope: roadmap Phase 0-D only. This was a disposable mock, not implemented product behavior; it has since been folded into Phase 1.

## Owner's prototype direction (2026-11-02)

The owner selected: dark-first; neutral badges with text labels; support both phones and desktop (comfortable phone touch spacing, broader desktop layout); text-only “DSA Archive” wordmark. These select a draft direction only—not approval of the prototype or frozen tokens. Recorded in `docs/DECISIONS.md` and `docs/UI-REFERENCE.md`.

## Prototype delivered

- Replaced the bare Phase 0 hello-sheet view with a clearly marked **DESIGN PREVIEW** prototype. All account, progress, notes, friend and planner values are fake; there is no Firebase connection and no persistence.
- The screen picker previews all 25 entries in `docs/UI-REFERENCE.md`: signed-out/in sheet, expanded topic, no-results state, completion, sign-in/error, offline/sync, problem detail with/without note, notes and lists empty/populated/editing, Today planned/empty/goal-met, revision due/caught-up, stats, friends invite/compare/group goal, settings, offline and not-found.
- Includes dark/light toggle, large-text toggle, simulated network status, responsive sidebar/bottom navigation, responsive topic sheet, neutral text-labelled levels, empty/error states, sample progress/notes, opt-in sharing default-off, and sample weekly/streak views.
- V1 catalogue and sample topic/problem titles come only from `data/problems.json`; no copied page visuals, code, assets or learning text were introduced. Prototype styles are original in `src/styles.css` and remain provisional.
- The “Preview screen” selector makes all mock states reachable in one preview; the responsive layout targets 390px phone and 1280px desktop in CI. The selected default is dark-first sheet/signed-out.

## Draft token proposal — approved and frozen 2026-11-02

Candidate palette, typography and spacing were documented in
`docs/UI-REFERENCE.md` and implemented as prototype variables in
`src/styles.css`. At the time of writing they were explicitly **not
frozen** and Phase 1 was blocked. **Outcome: the owner approved them
unchanged**, so the same values now live in the frozen Tokens section of
`docs/UI-REFERENCE.md` and on `.app-root` in `src/styles.css`. The one
clarification made while freezing (not a value change) is the touch-target
split: primary controls ≥44px, dense in-row secondary controls 34–36px as
the approved mock actually rendered them.

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

## Approval gate — outcome (2026-11-02)

Owner approval was required in chat before any Phase 1 UI work. **It was
given on 2026-11-02**: the owner reviewed the prototype running live from
the session branch (all 25 mocked screens through the picker, dark and
light, phone and desktop widths) and then commanded Phase 1 to start.
Because `rule.md` §5 gates all real UI on this approval, that command is
the approval; no changes were requested.

Recorded effects, all in the same commit as the Phase 1 work:

- `docs/UI-REFERENCE.md`: Approval checkbox dated **2026-11-02**; the
  candidate palette/type/spacing values are **frozen unchanged** in the
  Tokens section (which is no longer placeholders); the component
  inventory is ticked for what Phase 1 built.
- `docs/ROADMAP.md`: Phase 0-D 🚧 → ✅.
- `docs/DECISIONS.md`: the approval and the Phase 1 authorization are
  recorded as owner decisions.
- **Mock disposition: discarded, folded into Phase 1.**
  `src/design-prototype.tsx` is deleted; its approved component styles
  remain in `src/styles.css` renamed from `.prototype-*` to product
  names, plus a kept block of approved styles for screens that arrive in
  Phases 2–5. The mock stays readable in git history at `1791693`.
- Differences between the approved mock and the shipped Phase 1 sheet are
  listed as **deliberate adaptations** in `docs/UI-REFERENCE.md` (nav
  deferral, static sign-in banner, "Ungraded" badge, real device-local
  progress, removal of mock scaffolding, dropped `Inter`, `<h2>`
  subtopics). None of them changes a frozen token.

Still true at the end of Phase 0-D: no PR, merge, deployment, Firebase
project or Hosting change was made. The owner's 10-row catalogue
spot-check remains a separate pending content-accuracy task.
