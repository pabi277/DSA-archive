# Phase 04 — Notes → Code (saved solutions in Firestore)

**Folder:** `docs/phases-v2/04-code-notebooks/`
**Estimate:** 5–6 days · **Depends on:** 01 · **Blocks:** 07 (runner UI lives beside it)
**Owner decision:** remove the Notes section; store **code** instead.

---

## 1. Charter

Delete the notes feature end-to-end (UI, model, rules, backup, tests) and replace it
with a **saved-solutions** feature: one code document per problem, per user, in
Firestore, browsable at `#/code`, editable inline, with a **peek** mode so your own
solution works as active recall instead of dead text.

## 2. Current state (evidence)

| Fact | Evidence |
|---|---|
| Notes UI: editor + overview | `src/NoteEditor.tsx` (149 lines), `src/NotesView.tsx` (138) |
| Notes model + limits | `src/library.ts:11-13` (`NOTE_MARKDOWN_LIMIT 5000`, `NOTE_SNIPPET_LIMIT 8000`) |
| Notes rules | `firestore.rules:1235-1241` (`match /notes/{problemId}`) |
| Notes in backup v3 | `src/backup.ts:38,141` |
| Notes tab + chips | `App.tsx:536-547`, `noteTotal` |
| Hand-rolled markdown | `src/markdown.ts` (127 lines) — deleted with notes |
| Lists feature shares `library.ts` | keep lists; only notes are removed |

## 3. Scope

### In
1. **Remove notes** from: UI (`NotesView`, `NoteEditor`, notes tab, notes chips, note
   buttons in rows), model (`library.ts` note functions + limits), data
   (`users/{uid}/notes/{problemId}` collection and rules block), backup (v4 field drop
   with v3 migration), tests (`e2e/library.spec.ts` trimmed, unit tests updated),
   `App.tsx` wiring, and any copy mentioning notes.
2. **Add `snippets`**:
   ```
   users/{uid}/snippets/{problemId}
     { language: 'cpp'|'c'|'java'|'python'|'js'|'ts'|'go'|'rust'|'other',
       code: string ≤8000, notes: string ≤500 (plain text, optional),
       verdict?: 'clean'|'hint'|'couldnt',   // what happened last time you ran it
       updatedAt: serverTimestamp() }
   ```
3. **`#/code` screen** — all saved solutions: search (title/code text), filters by
   language and topic, sort by recently updated, row shows problem · language chip ·
   `updatedAt` age · copy button · open problem. Empty state = one action ("Solve
   something, then save the code here").
4. **Editor** (deliberately small, budget-safe): monospace textarea + line numbers +
   auto-indent, Tab/Shift-Tab, a language segmented control, save status
   (`Saving… / Saved / Offline — will sync`), and a 500-char plain-text note field.
   **No** CodeMirror/Monaco (breaks budgets + offline promise).
5. **View mode + peek**: rendered `<pre>` (monospace, no syntax highlighting yet);
   **peek** blurs the code behind a "Reveal — I've attempted it" button (state local
   only). Row badge `⌨ has code` in practice lists and the problem page.
6. **Rules v5** (+ generator + emulator tests): owner-only `get/list/create/update/
   delete`; `problemId` must match the catalogue slug regex; field whitelist;
   `code ≤8000`, `notes ≤500`, `language` in the enum, `verdict` optional enum.
7. **Backup v4**: `snippets[]`; importer maps v3 `notes[]` → `snippets[id].notes`
   (dropping markdown body, keeping the ≤500 plain-text tail with a printed warning),
   v1/v2/v3 import otherwise unchanged; exporter emits v4.
8. **Copy-out**: "Copy code" + "Open in Compiler Explorer" / "Open in LeetCode"
   (deep link) so a learner without the local runner (phase 07) is never stuck.

### Out
Running code (phase 07) · syntax highlighting library · sharing snippets with friends
(stays private, per the v1 privacy rule) · attachments/images.

## 4. Design spec

```
#/code  (desktop)
┌ Code ───────────────────────────────────────── 128 saved · 6 languages ┐
│ [search…]              lang: [All ▾]  topic: [All ▾]   sort: [Recent ▾]│
├────────────────────────────────────────────────────────────────────────┤
│ Two Sum            cpp    Arrays    updated 3d ago   ⌘ copy   ↗ open   │
│ Course Schedule    py     Graphs    updated 12d ago  ⌘ copy   ↗ open   │
└────────────────────────────────────────────────────────────────────────┘

Problem page code panel
┌ Code ────────────────────────────── cpp ▾   Saved ✓   [Run ▸] (phase 07) ┐
│ 1  class Solution {                                                      │
│ 2      vector<int> twoSum(vector<int>& n, int t) {                       │
│ …                                                                        │
│ [Peek: blur]                    Note (optional, 500)                     │
└──────────────────────────────────────────────────────────────────────────┘
```
Phone: editor full-screen page (`#/problem/x/code`) with a sticky save bar; peek state
persists per session only.

## 5. File plan

```
DELETE src/NoteEditor.tsx, src/NotesView.tsx, src/markdown.ts, src/markdown.test.ts
NEW    src/code/codeStore.ts        sanitise + limits + merge (pure, tested)
NEW    src/code/codeData.ts         Firestore hook (snapshot/optimistic write, offline)
NEW    src/code/codeScreen.tsx      #/code
NEW    src/code/editor.tsx          textarea + line numbers + indent + save state
NEW    src/code/peek.tsx            reveal wrapper
NEW    src/code/highlight.ts        tiny tokenizer (optional, measured; ship only if budget allows)
EDIT   src/library.ts               remove notes; keep lists untouched
EDIT   src/backup.ts                schema 4: snippets, v3 notes migration
EDIT   src/accountData.ts           remove notes plumbing, add snippets
EDIT   src/SheetList.tsx            note button → code button + has-code badge
EDIT   src/App.tsx                  routes + wiring
EDIT   tools/generate-firestore-rules.mjs, firestore.rules   notes → snippets
EDIT   tools/firestore-rules.test.mjs                        +4 tests
EDIT   e2e/library.spec.ts          lists only; notes assertions removed
NEW    e2e/code.spec.ts             save → second profile → peek → copy
NEW    src/code/*.test.ts
```

## 6. Data model & migration

| Aspect | Value |
|---|---|
| Collection | `users/{uid}/snippets/{problemId}` |
| Doc cap | 1 (one solution per problem; "variants" are out of scope) |
| Merge policy | last-write-wins on `updatedAt`; offline writes queue via existing IndexedDB cache |
| Legacy | v3 backups' `notes[]` map to `snippets[].notes`; markdown body dropped (with a printed import warning listing affected ids) |
| Quota | one doc read per open, one write per save — same shape as notes today; still far inside Spark |
| Deletion | sign-out keeps local cache; "delete my data" must remove `snippets` too (test it) |

## 7. Accessibility & performance
- Editor: real `<textarea>` with `aria-label`, visible focus ring, `spellcheck=false`,
  `autocapitalize=off`; line numbers `aria-hidden`; save state announced via
  `aria-live="polite"`.
- Peek: the reveal button is focusable and the blurred code keeps `aria-hidden` until
  revealed (so screen readers don't leak the answer).
- Keyboard: `⌘S` save, `Tab` indent, `Esc` leave with unsaved-changes guard.
- Editor opens < 100 ms; the `#/code` list virtualizes past 200 rows if needed.

## 8. Tests
| Kind | What |
|---|---|
| Unit | sanitise (bad language, oversized code, non-string) · v3→v4 backup migration · limits |
| Playwright | save code → read in second browser profile · peek hidden by default · copy writes to clipboard (stubbed) · offline save then reconnect · `#/code` filters |
| Rules (emulator) | owner-only read/write · slug regex · size caps · language enum · stranger denied · delete works |
| Visual | code screen, editor with content, peek state |

## 9. Risks
| Risk | Mitigation |
|---|---|
| Silent data loss for existing note users | Migration prints what was dropped; notes body is long-markdown, the ≤500 tail is preserved; runbook step tells the owner to export a v3 backup first |
| Rules regression | Generator + `check:rules` + emulator tests in the same PR; the v1 lesson: never hand-edit `firestore.rules` |
| Editor scope creep | Hard limits: no highlighting lib, no multi-file, no execution (that's 07) |
| Backup schema drift | v4 is additive; v1–v3 import tests stay in the suite |

## 10. Acceptance
Notes are gone from code, UI, rules, backup and docs · a snippet saved on phone appears
on desktop (emulator two-context test) · peek works · rules tests green (stranger
denied, caps enforced) · v3 backup imports with a clear migration message · `#/code`
searchable and filterable · 0 axe violations · snapshots committed.

## 11. Exit
Owner merges. Phase 07 later plugs the runner into the same panel; nothing here needs
rework for it.
