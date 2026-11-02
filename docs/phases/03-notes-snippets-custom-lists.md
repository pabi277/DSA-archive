# Phase 3 — Notes, snippets & custom lists

- Date: 2026-11-02
- Status: ✅ **complete on the session branch, CI green, stopped at the merge gate.** Site CI **run [#30](https://github.com/pabi277/DSA-archive/actions/runs/41517643913)** (2m01s) at code tip `21809c501735c385058c3d113991be2829abef8a`; `site-preview` artifact **321,193 bytes** (14-day retention). This record's docs commit rides after that tip on the same branch and re-runs CI. No PR/merge/deploy.
- Scope: roadmap Phase 3 only — 3.1 per-problem markdown note + code snippet (synced) · 3.2 notes overview + search · 3.3 custom lists (create, rename, delete, add/remove, filter the sheet) · rules v2 with Emulator tests · backup schema v2 with a backward-compatible v1 import. **Not** in this phase: planner, revision queue, stats, friends, PWA, Hosting, or any live Firebase change.
- Prerequisites: phase 2 complete on `arena/62f988be-dsa-archive` (merged to `main` as PR #4 at `b3e8217`); frozen 0-D tokens; repo-local Git identity reset from the fresh clone's `noreply` address to `pabi277 <chakraborttypabi2772006@gmail.com>` before any commit.

## Delivered

### 3.1 — Per-problem note (markdown) + my-code snippet, synced

- `src/library.ts` defines the note model (`problemId`, `markdown`, `snippet`, `updatedAt`) with caps **5,000** markdown characters and **8,000** snippet characters, and reads Firestore documents defensively (clamped values, unusable timestamps → `null`).
- `src/libraryData.ts` (`useLibrary`) subscribes to `users/{uid}/notes` with `includeMetadataChanges`, writes exactly one document per save (`markdown`, `snippet`, `updatedAt: serverTimestamp()`), and deletes the document when both fields are cleared — so no empty note is ever stored and the quota stays lean.
- The note editor is inline in the problem row (`src/NoteEditor.tsx`): markdown textarea, mono code textarea, live character counters, **Write / Preview** toggle, Save, Close and a two-step Delete. It reuses the approved `.field-label`, `.app-root textarea`, `.note-preview`, `.code-preview` and `.button` anatomy; no dialog, toast or icon library was added.
- The preview is rendered by `src/markdown.ts`, a ~120-line, dependency-free renderer that **escapes HTML first** and then supports only fenced code, `#`-headings (styled paragraphs, so the page heading order stays valid for axe), bullet lists, inline code, bold, italic and `http(s)` links. Raw HTML and `javascript:` targets never render. `dangerouslySetInnerHTML` is therefore fed only escaped, allow-listed markup.
- Row actions gain **Note** / **Note ✓** and **+ List** / **List · n** buttons. They render only for a signed-in user, so the signed-out sheet keeps no dead controls. Notes are written offline to Firestore's persistent cache and sync on reconnect, exactly like progress; a note pending write makes the header pill read `Changes pending`.

### 3.2 — Notes overview + search

- A new **Notes** view (`src/NotesView.tsx`) replaces the sheet column when selected: total count, a search field and one card per note (problem title, topic, level badge, markdown excerpt, snippet preview, Edit note, Open in sheet).
- `searchNotes()` matches the note text, the snippet, the problem title, the subtopic title and the topic title, newest first with a stable title tiebreak. Empty and no-result states are explicit, each with a working clear action.
- **Edit note / Open in sheet** switch back to the sheet, expand the right topic and scroll to the row; Edit also opens the editor for that problem.

### 3.3 — Custom lists / tags

- Lists live at `users/{uid}/lists/{listId}` with `title` (≤60), `problemIds` (≤200) and `updatedAt`. List ids are lowercase UUIDs (`newListId()`), matching the rules pattern.
- The **Lists** view (`src/ListsView.tsx`) creates lists, renames them inline, deletes them (two-step confirm), shows their problems and removes a problem from a list. It is empty-state friendly and every state is text-labelled.
- Any sheet row opens a **list picker** (`src/ListPicker.tsx`): tick lists to add/remove this problem, or create a new list that already contains it. Each tick is a single merge write.
- List chips join the filter row: tapping one filters the sheet to that list (the match line also names the list), tapping again clears it. Deleting a list while it filters drops the filter automatically.

### Rules v2 (phase 3) — own-data-only, phase-2 rules untouched

- `tools/generate-firestore-rules.mjs` now emits, **in addition to** the unchanged phase-2 profile/progress rules:
  - `match /notes/{problemId}` — owner `get/list/delete`; `create/update` require a catalogue-shaped doc id (`^[a-z0-9][a-z0-9-]{0,79}$`), exactly the keys `markdown`, `snippet`, `updatedAt`, string types, the 5,000/8,000 size caps, a non-empty note, and `updatedAt == request.time`.
  - `match /lists/{listId}` — owner `get/list/delete`; `create/update` require a list id matching `^[a-z0-9-]{8,40}$`, exactly `title`, `problemIds`, `updatedAt`, a 1–60 character title, a list of at most **200** ids, joined id text ≤ **12,000** characters, and `updatedAt == request.time`.
- **Recorded decision (why not a 495-id whitelist):** the phase-2 progress rules whitelist ids per topic because a shard must stay inside its topic's row count. Notes and lists are one document per item, so the protection that matters is field shape + size caps (the `DATA-MODEL.md` §3 promise). Firestore Rules allow only 1,000 evaluated expressions per request; a 495-element membership test on every write risks that ceiling, and it would not stop a hostile client from creating extra documents anyway. Catalogue membership is therefore enforced in the client (`isKnownProblemId`) and re-checked by the backup parser, while the rules bound every document's shape and size. No phase-2 rule was relaxed to make any test pass — the only phase-2 test change is a *stricter* statement of intent: the paths that must still be denied are now `plans`/unknown collections, because notes and lists are deliberately owner-only from this phase on.
- `tools/firestore-rules.test.mjs` grows from 4 to **8** Emulator Suite tests. New coverage: owner note create/read/list/update/delete; stranger + unauthenticated denial on notes and lists; oversized markdown/snippet; unknown extra fields; missing keys; an all-empty note; a non-server `updatedAt`; a malformed note doc id; snippet-only notes accepted; list id/title/array-size/joined-text/field-set rejections; empty list accepted; 200 ids accepted; owner deletion.

### Backup schema v2 + recorded migration

- `src/backup.ts` now writes **schemaVersion 2** with real `notes` and `lists` arrays (`notes[] = {problemId, markdown, snippet, updatedAt}`, `lists[] = {listId, title, problemIds, updatedAt}`) alongside the unchanged profile and `progressByTopic` payload. Friends/summary stay excluded; `plans` stays for phase 4.
- **Backward-compatible migration:** `parseBackup` accepts schema **1 and 2**. A phase-2 file imports exactly as before and, because v1 always wrote empty arrays, restores zero notes and zero lists (its own preview says so before the user confirms). A v1 file that *claims* to carry notes or lists is rejected rather than guessed at.
- Validation added for both arrays: known problem ids, duplicate detection, field-set checks, character caps, list-id pattern, ≤200 ids and ISO/null timestamps. The file cap rises from 1 MB to **4 MB**, sized for many capped notes.
- Import replaces notes and lists too (`applyBackup` deletes the owner's existing note/list documents, then writes one document per item), and the success notice now reports rows, topics, notes and lists.

### Design and a11y

- Frozen 0-D tokens unchanged; no colour, type, spacing, radius or icon token was added. `src/styles.css` gains one phase-3 block built only from `--surface`, `--surface-raised`, `--line`, `--ink`, `--muted`, `--subtle`, `--accent` and the approved radii, plus phone rules at ≤560px.
- A **view tab row** (Sheet · Notes · Lists) uses the approved `.list-tabs` component with `aria-pressed`, not ARIA `tab` roles — no tab keyboard contract is implied by a plain view switch.
- Every state is text: note saved/deleted, list created/renamed/deleted, empty notes, empty lists, sign-in required, no search results. The sync pill, merge notice and inline error/notice pattern from phase 2 are unchanged; library errors and notices share the same slots (`library-error`, `account-notice`).

## Reuse scan (checked 2026-11-02)

- **STUDY:** our own approved artefacts only — `rule.md`, `docs/ROADMAP.md`, `docs/DATA-MODEL.md` §3/§6, `docs/UI-REFERENCE.md`, the phase-2 record/source and `data/problems.json`. `copy-web/` was not opened or shipped.
- **BUILD:** original note/list model, Firestore hook, markdown renderer, note editor, notes and lists views, list picker, rules additions, backup v2 parser/writer, and every test. All wording is ours.
- **DEPEND:** none added. The markdown preview is deliberately hand-written over an escaping-first allow-list instead of shipping a renderer/sanitiser pair; no icon, editor, markdown, state or dialog library was introduced, so there is no new licence to log.
- **ADAPT:** the approved mock's note editor/code block/notes-list/list-tabs styles are now real components; the problem-detail screen became an inline row panel because the app still has no router (phase-2 adaptation kept).
- **REJECT:** raw HTML in notes, third-party markdown/sanitiser/editor packages, any new Firebase product (no Functions/Storage/Analytics), live project creation/link, rules/Hosting deploy, and any friend-visible notes.

## Verification

- Local: `npm run test:data` PASS (495 rows · 20 topics); `npm test` **PASS — 85 tests / 8 files** (catalogue 2, sheet 22, progress 10, app 21, cloudProgress 5, backup 7, library 10, markdown 8); `npm run check:rules` PASS; emulator-configured `npm run build` PASS (`tsc -b` clean; CSS 203.18 kB / JS 1,055.13 kB — bundle weight stays a **phase 6** item); `npm run check:dist` PASS (3 files, no copied-site paths); `npm run check:links` PASS; `npx playwright test --list` discovers **5 specs in 3 files**; `git diff --check` PASS.
- `npm run test:rules` / `npm run test:e2e` remain un-runnable in the agent sandbox (no Java, Playwright's Chromium host is outside the network allowlist). **CI is the authority.**
- **CI: run [#30](https://github.com/pabi277/DSA-archive/actions/runs/41517643913) — SUCCESS** (2m01s) at `21809c5`. Every step green: catalogue validation · generated-rules check · 85 unit tests · emulator-configured build · copied-site exclusion · built-page links · Chromium install · **8 Emulator Suite rules tests** · **5 real-Chromium Playwright tests** (3 signed-out sheet specs with 2 axe audits + the phase-2 sync/backup spec + the new 390×844 notes/lists/backup spec with a third axe audit on the notes view).
- Artifact: **`site-preview` 321,193 bytes** (14 days). Only annotation is GitHub's own `ubuntu-latest` → Ubuntu 26 migration notice.
- Iterations this phase (all before the green run): fixed a rules test that asserted a whitespace-only list title is rejected (the cap is on `size()`, so the client-side emptiness rule is what refuses it) · a preview-text expectation (`lists 1`, not `1 list`) · a Playwright `.check()` that demanded an instant flip on a Firestore-driven checkbox (now click + retrying assertion) · and the phase-2 "unspecified collection is denied" assertion, which now names `plans`/unknown paths because notes and lists are deliberately owner-only. CI now also writes failure summaries as check-run annotations (the agent sandbox cannot download Actions logs).
- Test-tooling change: `playwright.config.ts` sets `workers: 1` because both emulator specs sign in as the same deterministic CI user and reset the shared emulator; overlapping them would make the suite flaky.

## What the preview shows

The downloadable `site-preview.zip` (**321,193 bytes**) is the emulator-configured production `dist/`. Opened on a phone it shows the dark-first sheet with its new view tabs, the real **Sign in with Google** banner and `Local only` pill; **Notes** and **Lists** show their sign-in explainers because notes/lists are personal data. With the emulators behind it, the acceptance spec shows: sign-in, a row's **Note** editor with markdown + snippet, the saved `Note ✓` row action, the Notes view with the note card and working search, the Lists view with a created list, the row list picker with a ticked checkbox, `List · 1` on the row, the sheet filtered by that list (`Showing 2 of 495` + the list name), a second fresh browser profile seeing the same note and list, a schema-v2 export containing both, an import that removes the note, and a phase-2 schema-v1 import that clears lists. `test-results/library-phone.png` captures the notes view at 390×844 for CI diagnostics.

## Comparison duty (approved 0-D mock vs shipped Phase 3)

Reviewed `test-results/library-phone.png` plus the existing desktop/phone captures against the mock's `Problem detail — with my note`, `Notes overview — has notes / empty`, `Custom lists — list / empty / editing` and `Sheet — filters on` states. Note editor, code block, note card, list card, list tabs and filter chips use the approved anatomy and frozen tokens. Differences are recorded as deliberate adaptations in `docs/UI-REFERENCE.md`; none changes a frozen token or the approved direction.

## Gate / next

- **Phase 3 stops at the merge gate.** No PR, merge, `main` push, tag, release, deploy, Hosting channel, Firebase project, live rules deploy or visibility change was made or is authorized by this phase. Green CI is evidence, not permission.
- Phase 4 (planner, revision queue, stats) is **not** started. The next chat uses its own Arena-assigned branch, verifies branch/status/PRs/CI/Git identity first, and executes only roadmap phase 4 after the owner commands it.
- Owner items unchanged: make the repo private while `copy-web/` holds the third-party snapshot; complete the 10-row live-sheet content spot-check; create the Spark project personally and perform the gated live check.
