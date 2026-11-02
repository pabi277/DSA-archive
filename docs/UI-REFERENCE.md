<!-- Adapted for a WEBSITE from AppFlow templates/docs-system/UI_REFERENCE.md (MIT template).
     For an app this file specs a disposable prototype for later Compose screens;
     for THIS website the phase-0-D prototype IS the site's design step —
     approved mock → tokens frozen → real UI built directly to it. -->

# UI reference — DSA Archive website

> The design specification. **No real UI code before phase 0-D is
> owner-approved and the tokens below are frozen** (`../rule.md` §§4–5).
> Nothing visual is copied from the specimen page (clean-room) — what
> transfers is only functional knowledge: which screens/states a sheet
> like this needs (from `RESEARCH.md` §1) plus what Firebase login,
> sync, and friends add.

## Reference (phase 0-D deliverable)

- Stack: the site's own — **Vite + React + TypeScript + Tailwind +
  daisyUI** (AppFlow web Option B for styling), fake-but-real-shaped
  data, phone-width first, reviewed via the `site-preview` artifact on
  the owner's phone. Approved values freeze here; the mock is then
  folded into phase 1 or discarded (recorded in the 0-D record).
- Owner’s prototype direction (2026-11-02; selections guide the draft,
  **not design approval**): **dark-first** with light alternative ·
  **neutral level badges with text labels** · responsive for both phones
  and desktop (comfortable touch rows on phones; wider/denser layout on
  desktop) · **text-only “DSA Archive” wordmark**.
- The prototype was reviewed by the owner in chat on 2026-11-02 and is
  **approved**. It has been folded into phase 1: the mock component
  `src/design-prototype.tsx` is deleted and its approved component styles
  survive in `src/styles.css` under product names. The mock is still
  readable in git history at `1791693` for later phases.

## Approval

- [x] 2026-11-02 — owner approved **all screens as mocked**, with no
      listed changes. The owner reviewed the live prototype served from
      the session branch and then commanded phase 1 to start; since
      `rule.md` §5 gates phase 1 on this approval, that command is the
      approval. The token proposal was frozen unchanged at the same
      moment and is recorded in the Tokens section below.
- Changes after approval (direction changes re-open the gate):
  - *(none. The differences between the approved mock and the shipped
    phase-1 sheet are listed under "Deliberate adaptations" at the
    bottom of this file — they are implementation differences, not
    token or direction changes.)*

## Screens & states (complete v1 inventory — one row per state)

| Screen / state | Shows | Phase |
|---|---|---|
| Sheet (home) — signed out | full sheet browsable, "Sign in to save progress" banner | 1–2 |
| Sheet — signed in, default | header (avatar, progress %, streak flame), topics collapsed with counts | 1–2 |
| Sheet — topic expanded | subtopics + rows (title, level badge, link icons, status control, bookmark) | 1 |
| Sheet — searching / no results | cross-topic matches + count / empty state with clear-action | 1 |
| Sheet — filters on | topic/level/status/list chips, hide-done applied | 1, 3 |
| Sheet — syncing / offline | quiet "offline — changes will sync" pill; nothing blocks | 2 |
| Topic complete | completed-topic state (quiet satisfaction, no confetti spam) | 2 |
| Sign-in | Google button, why-login explainer (sync + friends), error state | 2 |
| Problem detail — no note / with my note | links out, status, attempts, note editor (markdown + snippet) | 3 |
| Notes overview — has notes / empty | searchable my-notes list / "no notes yet" | 3 |
| Custom lists — list / empty / editing | my lists, add-remove problems, filter sheet by list | 3 |
| Today (planner) — planned / nothing planned / goal met | today's picks, add-from-sheet, tally vs daily goal | 4 |
| Revision queue — due / caught up | 3/7/21-day due list, one-tap "revised" / clean empty state | 4 |
| Stats | per-topic bars, level split, streak heatmap, weekly strip | 2, 4 |
| Friends — none yet (invite) | my invite code/link, add-by-code, what sharing means | 5 |
| Friends — list & compare | friends' opted-in summaries, per-topic compare bars | 5 |
| Friends — leaderboard & weekly goal | friends-only ranking (weekly solved), group goal progress | 5 |
| Settings & account | profile, theme, daily goal, **share-summary toggle**, export/import (success + invalid-file error), sign out, delete-my-data | 2, 5 |
| Offline / 404 | friendly offline page (PWA), not-found | 6 |
| Every screen × | **dark + light · phone (~390px) + desktop · large-font** variants checked | 0-D, 6 |

## Tokens (FROZEN — owner approval 2026-11-02)

`src/styles.css` (`.app-root` custom properties) is the single source of
truth for these values; this section documents them. **Changing a frozen
value is a GATE** (`rule.md` §3) — add a dated line under Approval first.

- **Colours (hex) — dark-first, light alternative.**
  - background/canvas `#101313` · surface `#171b1b` · raised surface `#1e2322`
  - border/line `#343a38` · notice background `#222a28` · notice border `#48544e`
  - text primary `#edf0ed` · secondary/muted `#a1aaa4` · quiet/subtle `#858e88`
  - accent `#c4d0ca` · accent-ink (text on accent) `#121816`
  - light alternative: canvas `#f3f5f2` · surface `#ffffff` · raised `#f8faf8` ·
    line `#d9dfda` · text `#202722` · muted `#5b665f` · subtle `#637067` ·
    accent `#33483d` · accent-ink `#ffffff` · notice `#eef2ee` / border `#c8d1ca`
  - success/done · warning/revision-due · error: **no separate hue story in
    v1.** Done = accent fill on the status control; warning and error keep the
    neutral border accents the approved mock used (`#716b54`, `#805b5b`).
    State is always also carried by a text label, never by colour alone.
  - level badges basic/core/pro/ungraded: **one neutral treatment** (raised
    surface, `#343a38` border, muted text) distinguished **only by the text
    label** — the owner's 0-D direction.
  - dark is the default scheme; light is the derived alternative. Both are
    contrast-checked by axe in CI at phone and desktop widths, so the dark
    scheme is verified rather than invented twice.
- **Type.** No bundled or self-hosted font files in v1 — there is no font
  licence to log and no specimen font is used. UI stack:
  `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
  Roboto, "Helvetica Neue", sans-serif`. Mono (code snippets, phase 3):
  `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`.
  Scale: page title `clamp(25px, 3vw, 34px)` · card/topic title `16px` ·
  problem row `13px`/600 · subtopic heading `13px`/650 · meta & labels
  `11–12px` · base `15px` desktop, `14px` at ≤560px · large-text mode `18px`
  desktop, `17px` phone.
- **Spacing.** 4px base scale (steps in use: 4/5/7/8/9/10/11/12/14/15/17/22/35) ·
  screen padding `clamp(18px, 4vw, 54px)`, `16px` on phones · problem row
  `min-height 60px` · topic header `min-height 58px` · card padding `16–20px`.
  Touch targets: **primary controls ≥44px** (buttons, search field, status
  toggles in the toolbar); **dense in-row secondary controls 34–36px**
  (row-action links, chips, bookmark) exactly as approved in the mock — above
  the WCAG 2.2 AA 24px minimum, and each sits in a 60px-tall row.
  Radii: `6px` status check · `9–10px` row actions and inputs · `12px` buttons
  and topbar controls · `14px` notices and metric tiles · `16px` cards ·
  `999px` pills, badges and chips.
  Elevation: **none** — the design is flat and border-defined (`1px` line);
  the only depth effect is the sticky topbar's `blur(14px)` over 94% canvas.
- **Icons.** **No icon library ships in v1.** Row actions, status, bookmark
  and search use text labels plus typographic glyphs (`⌕ ✕ ✓ ☆ ★ ›`), which
  keeps the approved text-labelled direction and adds no dependency or
  licence check. Lucide remains deferred (`DECISIONS.md`); adopting it later
  is a recorded DEPEND with a per-package licence check.

## Component inventory (= phase build checklist)

- [x] App header (wordmark, progress count pill, appearance + large-text
      controls) — *phase 1*. The **sync pill** and **avatar menu** are
      *phase 2*; the **streak** arrives with the phase-4 stats and is
      surfaced in the context column's *Today at a glance* card (a ring is
      still not drawn — the approved flat design has no depth/elevation and
      the count pill plus the goal track carry the same information).
- [x] Search box (keyboard shortcut `/` on desktop) + filter chips row
      (topic select, level, link type, hide-done) — *phase 1*.
- [x] Topic accordion header (title, `done/total`, progress bar, chevron)
      — *phase 1*.
- [x] Problem row (status control, title, level badge, outbound link
      buttons, bookmark) — *phase 1*.
- [x] Buttons · notices · one reusable empty-state pattern — *phase 1*.
      Phase 2 uses the same neutral inline notices for sign-in/sync/
      merge/backup success and error states; no modal or toast library
      was added. Dialogs remain deferred until a UI phase truly needs one.
- [x] Sign-in banner · profile/avatar menu · sync pill · guest-merge
      notice · account & backup card (export, invalid-file error,
      import preview, success) — *phase 2*.
- [x] Topic-complete quiet notice — *phase 2*.
- [ ] Bottom nav (phone: Sheet · Today · Revision · Friends · More) —
      **deferred, see adaptations**; returns in phase 2+.
- [ ] Desktop rail navigation — **deferred** with the bottom nav.
- [x] Note editor (textarea, markdown preview, code block) — *phase 3*
      (`src/NoteEditor.tsx`, inline in the problem row).
- [x] Notes overview (searchable my-notes list, empty state) — *phase 3*
      (`src/NotesView.tsx`).
- [x] Custom lists (create, rename, delete, add/remove problems, filter the
      sheet, empty states) — *phase 3* (`src/ListsView.tsx`,
      `src/ListPicker.tsx`).
- [x] View tabs (Sheet · Notes · Lists) using the approved `.list-tabs`
      anatomy with `aria-pressed` — *phase 3*, extended in *phase 4* to
      Sheet · Today · Revision · Notes · Lists · Stats (horizontal overflow
      on phones). Bottom nav and desktop rail stay deferred (Friends and
      More still do not exist).
- [x] Today (planner) — goal line + goal control, planned rows, add-from-sheet
      search, suggested picks, continue-where-I-left — *phase 4*
      (`src/PlannerViews.tsx`, `src/plannerData.ts`).
- [x] Revision queue — due list with spoken due labels, one-tap *Revised ✓*,
      next-up list, caught-up empty state — *phase 4*.
- [x] Stats — metric tiles (solved / this week / streak), 8-week heatmap,
      weekly strip, per-topic bars, solved by level — *phase 4*.
- [ ] Friend summary card + compare bars · invite-code block — phase 5.

## Comparison duty (per UI phase)

- Each UI phase record reviews preview screenshots (phone + desktop,
  dark + light) against the approved 0-D mock side-by-side;
  differences are fixed or listed below as deliberate adaptations.
- **Phase 1 review (2026-11-02):** `test-results/sheet-desktop.png`,
  `sheet-phone-light.png` (CI `site-e2e-diagnostics` / run logs) and the
  live dev preview were compared against the approved mock's
  `Sheet · signed out`, `Sheet · topic expanded`, `Sheet · no results`
  and `Sheet · filters on` states. Same tokens, same chrome, same row
  anatomy, same neutral badges. Every difference found is listed below;
  none of them is a token change.
- **Phase 4 review (2026-11-03):** `test-results/planner-phone.png` (the
  Stats view at 390×844, captured by `e2e/planner.spec.ts`) plus the existing
  desktop/phone captures were compared against the approved mock's
  `Today (planner) — planned / nothing planned / goal met`,
  `Revision queue — due / caught up` and `Stats` states. The goal line, goal
  track, metric tiles, heatmap, weekly strip, bar rows and empty states reuse
  the frozen anatomy; **no CSS was added in this phase**. Every difference is
  listed below; none changes a token or the approved direction.
- **Phase 3 review (2026-11-02):** `test-results/library-phone.png` (notes
  view at 390×844, captured by `e2e/library.spec.ts`) plus the existing
  desktop/phone captures were compared against the approved mock's
  `Problem detail — with my note`, `Notes overview — has notes / empty`,
  `Custom lists — list / empty / editing` and `Sheet — filters on` states.
  The note editor (markdown textarea + mono code field + Write/Preview),
  note cards, list cards, list tabs and the extra filter chips reuse the
  approved anatomy and frozen tokens. Every difference is listed below; none
  changes a token or the approved direction.
- **Phase 2 review (2026-11-02):** `test-results/sync-phone.png` plus the
  existing desktop/phone screenshots were compared against the approved
  mock's `Sheet — signed in`, `Sheet — syncing / offline`, `Sign-in`,
  `Settings & account`, and `Topic complete` states. The chrome, sync
  pill, avatar menu, neutral notices and account/backup controls use the
  frozen tokens and existing component anatomy. Differences are listed
  below; none changes a token or the approved direction.

## Deliberate adaptations (planned differences, not drift)

- **Bottom nav and desktop rail omitted in phase 1.** The mock showed
  five destinations; four of them (Today, Revision, Friends, More) do not
  exist until phases 2–5. Shipping a nav bar of dead controls would be
  worse than none, so phase 1 renders a single-destination layout. Both
  return, with the approved styles already in `src/styles.css`, as soon
  as a second destination exists.
- **Primary "Sign in" button replaced by a static banner.** Phase 1 has
  no Firebase, so a sign-in button would be a dead control. The approved
  copy "Sign in to save progress" is kept in the banner, which also says
  plainly that progress is device-local until phase 2.
- **An "Ungraded" badge for the 15 rows the source gave no badge.** The
  mock omitted a badge there; with real data that left the row grid
  unstable and hid a real category. The badge is the same neutral
  treatment and states a fact about the source — no level is invented
  (`DECISIONS.md`, phase 0).
- **Progress is real but device-local, not fake.** The hint, hide-done
  and the header count need truthful input, so `src/progress.ts` stores
  `{ s, b }` per problem, sharded per topic in `localStorage` — the exact
  shape of `DATA-MODEL.md` §3, so phase 2 swaps the source for Firestore
  and merges guest rows without a migration.
- **Mock-only scaffolding removed:** the "DESIGN PREVIEW" banner, the
  screen picker, the simulated online/offline toggle and the fake
  account/context panels.
- **`Inter` dropped from the font stack.** The mock listed it first; the
  frozen token says system sans with no bundled font, and naming Inter
  would have silently changed the design on machines that happen to have
  it installed.
- **Subtopic headings are `<h2>`, not `<h3>`.** Topic titles live in a
  `<summary>` (not a heading), so an `<h3>` under an `<h1>` would skip a
  level and fail the axe `heading-order` rule in CI.
- **Bottom nav and desktop rail stay deferred in phase 2.** Today,
  Revision, Friends and More still do not exist until phases 4–5; the
  account/backup destination is a card in the existing context column,
  reachable from the header avatar menu, rather than a dead nav item.
- **Settings & account is a context card, not a separate route.** Phase 2
  has one real destination (the sheet), so a router and second screen
  would be scaffolding. The approved profile-row and settings-row styles
  are used in the card; export/import success and invalid-file errors are
  inline notices with text labels, never colour-only states.
- **The sign-in banner keeps the approved copy but gains real controls.**
  The phase-1 static banner is now a Google button plus an explainer. An
  emulator-only "Use CI Google account" button appears in CI builds so a
  real `google.com` Auth user can be created deterministically; it is not
  present in a live/unconfigured build.
- **Guest progress remains writable and is merged visibly.** The approved
  mock assumed login-gated progress; phase 1 shipped real guest rows, so
  phase 2 keeps them and shows a merge notice with counts before any
  cloud write. This is the "never silent" requirement, not a new design
  direction.
- **The sync pill uses a short text label, not a spinner or ring.** The
  frozen design has no separate hue story; state is always text plus the
  existing neutral dot. The progress ring and streak stay phase 4.
- **Notes and lists need an account.** The mock showed a signed-in problem
  detail; phase 3 keeps that. Signed out, the Notes and Lists views show a
  short explainer instead of a dead editor, and rows hide their Note/+ List
  actions — the same "no dead controls" rule phase 1 used for the sign-in
  button.
- **Problem detail is an inline row panel, not a route.** The app still has
  one screen, so `Note` / `+ List` expand the row in place rather than
  navigating. A router returns only when a real second destination (Today,
  Stats, Friends) ships.
- **View switching uses `.list-tabs` buttons, not ARIA tabs.** `Sheet ·
  Notes · Lists` is a view filter with `aria-pressed`; claiming `role="tab"`
  would promise a keyboard/tabpanel contract this switch does not implement.
  The bottom nav stays deferred for the same reason as phases 1–2.
- **The markdown preview is a deliberately small subset.** Fenced code,
  `#`-headings, bullets, inline code, bold, italic and http(s) links only;
  raw HTML is escaped and headings render as styled paragraphs so the page
  heading order stays audit-clean. No markdown/editor/sanitiser dependency
  ships.
- **A six-view tab row instead of the mock's bottom nav.** Today, Revision and
  Stats exist now, but Friends and More still do not, so the approved
  five-destination bar would carry two dead controls. The existing
  `.list-tabs` row grows to six views (it already scrolls horizontally on
  phones) and the bottom nav returns in phase 5/6 when its destinations do.
- **The progress ring became a goal track.** The mock sketched a ring in the
  header; the approved token set is flat with no depth, and a conic-gradient
  ring cannot be contrast-checked by axe. The goal line (`.goal-line` +
  `.goal-track`, both frozen in 0-D) carries the same "n of goal" information,
  stated in text as well as width.
- **Heatmap shading is backed by numbers.** `.heat-cell` covers a full week
  grid, so the strip underneath states each day's count and the summary line
  gives the active-day total — state is never colour-only, as the token rules
  require.
- **Revision is a derived state, not a third status control.** The row's
  status stays the approved binary done/todo check; "due for revision" lives
  in the queue and in words (`Overdue 2 days · revision 1 of 3`), so the
  sheet's dense row anatomy and the phase-2 merge logic are untouched.
- **List membership is ticked, not dragged.** The row list picker is a
  checkbox list plus a "create and add" field — the simplest control that
  meets the 44px touch target and needs no drag-and-drop library.
