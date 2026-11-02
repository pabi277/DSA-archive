<!-- This file is the continuation prompt: paste it into the next chat. -->

# DSA Archive (website) — continuation prompt

> **Self-contained handoff.** Repo authority: `rule.md`; owner answers:
> `docs/DECISIONS.md`; roadmap: `docs/ROADMAP.md`; design inventory and
> **frozen** tokens: `docs/UI-REFERENCE.md`; data/Firestore shape:
> `docs/DATA-MODEL.md`; living state: this file. AppFlow @
> `57597b3332ad578614a0d9d5609f9cf8a278ee8a` is provenance only. Update
> this file at each phase end in the same commit as that phase record.

## Identity (fixed — exit gate complete 2026-11-02)

- Site: `DSA Archive` · repo: `pabi277/DSA-archive` · MIT applies to
  original code/data only; `LICENSE` is present.
- Audience: owner + a few invited friends. Backend: **Firebase Spark only**
  — Google Auth + Firestore + Hosting (gated); no Functions, Storage or
  Blaze. Website first; any Android app is a separate project.
- Git author: `pabi277 <chakraborttypabi2772006@gmail.com>`. Before every
  commit verify `git var GIT_AUTHOR_IDENT` / `GIT_COMMITTER_IDENT`; a fresh
  clone may default to a `noreply` address, so set the repo-local identity
  first (`git config user.name` / `user.email`). Phases 0/0-D/1 used earlier
  Arena branches, phase 2 used `arena/62f988be-dsa-archive`, phase 3 used
  `arena/0277d181-dsa-archive`; all stopped at their merge gates. The next
  chat must use **its own** Arena-assigned branch; never rename, switch,
  reuse another chat's branch, or push `main`.

## Rules digest (full rules: `./rule.md`)

- One phase per chat, exactly within `docs/ROADMAP.md` "Done means".
- No PR, merge, release, deployment (including GitHub Pages or Hosting
  preview channels), live Firebase change, project creation/upgrade,
  visibility change, or bulk move/delete without explicit owner command.
- Never re-ask recorded choices. Read `docs/DECISIONS.md` first.
- Clean-room: `copy-web/` is STUDY-only. Do not ship its code/assets/text.
- No secrets in git/chat. The owner handles Firebase console steps and
  creates the Spark project personally. Security rules are the protection
  and must be Emulator-tested before any gated live deploy.
- CI green + downloadable `site-preview` per phase. Any Firebase phase
  additionally needs Firestore **rules tests against the Emulator Suite in
  CI**. Docs ride with the code commit. Report CI run/tip/artifact and what
  the preview shows; print the next-chat prompt in chat; stop at the gate.
- **The design gate stays closed:** 0-D was approved 2026-11-02 and tokens
  are frozen in `docs/UI-REFERENCE.md`. Build UI to those tokens; changing
  a frozen value or the design direction re-opens the GATE.

## Current state (2026-11-02)

- **Phase 0 — Bootstrap + data extraction: ✅ complete and merged.** PR #2
  at `8638a91`. Data: **495 rows · 20 topics** (Basic 84 · Core 287 · Pro 109
  · 15 unbadged stored as `null`; link rows practice 453, video 369,
  article 289, LeetCode 289).
- **Phase 0-D — Design prototype + tokens freeze: ✅ approved 2026-11-02.**
  Tokens frozen unchanged in `docs/UI-REFERENCE.md`.
- **Phase 1 — Sheet core: ✅ complete and merged** (PR #3, merge commit
  `dab3207c83953667d7af66b2cc127938d63862f3`; CI #13 green).
- **Phase 2 — Firebase Auth + cloud progress: ✅ complete and merged**
  (PR #4, `main` at `b3e8217`); record
  `docs/phases/02-firebase-auth-cloud-progress.md`, CI #23 green at
  `75a9d7e`. Google sign-in, profile/avatar menu, sync pill,
  `users/{uid}/progressByTopic/{topicId}` shards with `s,b,a,fd,lr`, offline
  cache, explicit guest merge, rules v1 + 4 emulator tests, backup schema v1.
- **Phase 3 — Notes, snippets & custom lists: ✅ complete on
  `arena/0277d181-dsa-archive`, stopped at the merge gate.** Record:
  `docs/phases/03-notes-snippets-custom-lists.md`. Code tip
  `21809c501735c385058c3d113991be2829abef8a`; the record/docs commit rides
  after it on the same branch.
  - **CI: Site CI run [#30](https://github.com/pabi277/DSA-archive/actions/runs/41517643913)
    SUCCESS** (2m01s): catalogue validation · generated-rules check ·
    **85 unit tests / 8 files** · emulator-configured build · dist/link
    checks · **8 Emulator Suite rules tests** · **5 real-Chromium
    Playwright tests** (sheet desktop + phone-light + phase-2 sync/backup +
    the new 390×844 notes/lists/backup spec), three axe audits.
    **`site-preview` artifact: 321,193 bytes** (14-day retention).
  - **3.1** per-problem markdown note (≤5,000 chars) + code snippet
    (≤8,000) at `users/{uid}/notes/{problemId}` with `markdown`, `snippet`,
    `serverTimestamp`; inline row editor (`Write`/`Preview`, two-step
    delete, empty note deletes the document), owned by `src/NoteEditor.tsx`
    + `src/markdown.ts` (escaping-first, no dependency, http(s) links only).
  - **3.2** Notes view: count, search over note text/snippet/problem/topic
    titles, note cards with markdown excerpt + snippet, "Edit note"/"Open in
    sheet" jumping back to the row.
  - **3.3** custom lists at `users/{uid}/lists/{listId}` (`title` ≤60,
    `problemIds` ≤200): create, rename, delete, add/remove from a row list
    picker, and filter the sheet from a list chip.
  - **Rules v2:** phase-2 rules untouched; notes and lists are owner-only
    with exact field sets, size caps, doc-id patterns and
    `updatedAt == request.time`. Catalogue membership is enforced
    client-side and in the backup parser because of the 1,000-expression
    rules limit (recorded in `DECISIONS.md`).
  - **Backup schema v2** writes real `notes[]`/`lists[]`; `parseBackup`
    still accepts **schema 1** (empty notes/lists) — the recorded
    backward-compatible migration. File cap is now 4 MB.
  - Test tooling: `playwright.config.ts` sets `workers: 1` (both emulator
    specs share the deterministic CI user); `ci.yml` re-emits emulator
    failures as check-run annotations because the agent sandbox cannot
    download Actions logs.
- Deliberate adaptations (inline notices instead of dialogs, account card
  instead of a second route, bottom nav still deferred, Sheet/Notes/Lists
  view tabs, inline row note editor, notes/lists require sign-in) are listed
  in `docs/UI-REFERENCE.md`; none is a token change.
- Open owner items (`docs/DECISIONS.md`): repo is still **PUBLIC** while
  `copy-web/` holds the third-party snapshot — make it private or command
  the change; the **10-row live-sheet spot-check** is pending; create the
  **Spark** Firebase project personally before the gated live check.
- Known debt, deliberately deferred: the JS bundle is ~1.06 MB (291 kB
  gzipped) because Firebase Auth + Firestore are statically imported;
  code-splitting and the still-unused Tailwind + daisyUI weight are
  **phase 6 perf-budget** items.

## Next: Phase 4 — Planner & revision

Read `rule.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`,
`docs/DATA-MODEL.md` (§3 progress/plans shape, §4 quota budget, §6 backup),
`docs/UI-REFERENCE.md` (frozen tokens + phase-2/3 adaptations),
`docs/phases/03-notes-snippets-custom-lists.md`, and the phase-3 source
(`src/library*.ts`, `src/cloudProgress.ts`, `src/progress.ts`,
`src/accountData.ts`, `src/App.tsx`, `src/sheet.ts`). Verify branch,
`git status`, PRs, CI runs and Git author identity first; work only on the
next chat's assigned Arena branch. Do not re-ask any recorded answer. Do not
start phase 5.

Phase 4 parts, exactly as the roadmap states them:

1. **4.1** daily goal + Today list.
2. **4.2** spaced revision queue (3/7/21 days, computed client-side) +
   one-tap "revised".
3. **4.3** streak heatmap + weekly stats + continue-where-I-left.

Useful facts already in place: progress entries store `a` (attempts), `fd`
(first done) and `lr` (last status change), and rules already allow
`s: 'revision'`; `src/cloudProgress.ts` maps `revision` to `todo` for the
binary row control (phase 4 can surface it). `users/{uid}/plans/{yyyy-mm-dd}`
and `users/{uid}/public/summary` are sketched in `DATA-MODEL.md` §3 but are
**not** in the rules yet — phase 4 must add `plans` rules with Emulator
tests (own-data-only, field/size caps) and extend backup for plans in a
recorded, backward-compatible migration (schema v3, still reading v1/v2).
Keep `notes`/`lists`/`progress` rules intact; never weaken a rule to pass a
test. The `/` search shortcut, hide-done and the weakest-topic hint already
exist; stats must stay client-computed (no server jobs, Spark-only).

"Done means": a solved problem resurfaces on schedule; a full study session
runs Today → solve → revise. It also stays true that CI is green with the
`site-preview` artifact showing the increment, rules tests run in the
Emulator Suite, the sheet is browsable signed-out, guest mode and the
explicit merge still work, frozen tokens are unchanged, no dependency
outside the Firebase whitelist is added, and the phase ends at the merge
gate — no PR/merge/deploy without a fresh explicit command.
