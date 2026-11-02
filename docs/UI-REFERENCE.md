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
- Phase 0-D prototype is being reviewed in this chat. It uses fake
  progress/account data only; the four choices above and the candidate
  values below remain provisional until the owner approves the prototype.

## Approval

- [ ] YYYY-MM-DD — owner approved [all screens / with listed changes]
      in chat. *(blank until phase 0-D)*
- Changes after approval (direction changes re-open the gate):
  - *(none yet)*

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

## Prototype token proposal (draft only — approval/freeze pending)

- Palette in `src/styles.css`: dark canvas `#101313`, surface `#171b1b`,
  raised surface `#1e2322`, border `#343a38`, primary text `#edf0ed`,
  muted text `#a1aaa4`, neutral accent `#c4d0ca`; light alternative
  canvas `#f3f5f2`, surface `#ffffff`, primary text `#202722`, accent
  `#33483d`. Basic/Core/Pro badges share the same neutral treatment and
  remain distinguished by their text labels (never color alone).
- Type proposal: system sans for UI and system monospace for snippets;
  no bundled font until licence/need is reviewed. Layout proposal: 4px
  spacing base; ≥44px interactive targets; 60px problem row; 12–16px
  radii; responsive two-column desktop / single-column phone.
- These are prototype candidate values, **not frozen tokens**. Owner may
  approve them or list changes; then copy final values into the Tokens
  section below and date the Approval checkbox.

## Tokens (frozen at 0-D approval — placeholders until then)

- Colours (hex): primary/seed [ ] · surface [ ] · background [ ] ·
  success/done [ ] · warning/revision-due [ ] · error [ ] · text
  primary/secondary [ ] · level badges basic/core/pro [ ]/[ ]/[ ] ·
  dark scheme derived & checked (not invented twice) [ ]
- Type: one UI font + one mono font (self-hosted, licence logged at
  phase 0 — never the specimen's font files); scale: page title [ ] ·
  topic [ ] · row [ ] · meta/label [ ]
- Spacing: 4/8 scale · screen padding [ ] · row height [ ] · touch
  targets ≥ 44px · radii [ ] · elevation levels [ ]
- Icons: ONE set (plan: Lucide) — status check, bookmark, external
  practice/article/video/LeetCode, search, dice, calendar, flame,
  users (friends), download/upload, settings, sync/offline.

## Component inventory (= phase build checklist)

- [ ] App header (wordmark, progress ring, streak, sync pill, avatar menu)
- [ ] Search box (keyboard shortcut on desktop) + filter chips row
- [ ] Topic accordion header (title, `n/m`, progress bar, chevron)
- [ ] Problem row (status control, title, badges, link buttons, bookmark)
- [ ] Bottom nav (phone: Sheet · Today · Revision · Friends · More)
- [ ] Note editor (textarea, markdown preview, code block)
- [ ] Friend summary card + compare bars · invite-code block
- [ ] Buttons/dialogs/toasts · one reusable empty-state pattern

## Comparison duty (per UI phase)

- Each UI phase record reviews preview screenshots (phone + desktop,
  dark + light) against the approved 0-D mock side-by-side;
  differences are fixed or listed below as deliberate adaptations.

## Deliberate adaptations (planned differences, not drift)

- *(none yet — first entries expected when real 495-row data and real
  friend summaries meet the mock)*
