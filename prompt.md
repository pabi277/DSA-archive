<!-- Adapted for a WEBSITE from AppFlow templates/prompt-app.md (MIT template). -->

# DSA Archive (website) — continuation prompt

> **Self-contained handoff.** Repo authority: `rule.md`; owner answers:
> `docs/DECISIONS.md`; roadmap: `docs/ROADMAP.md`; design inventory and
> token approval: `docs/UI-REFERENCE.md`; living state: this file. AppFlow
> @ `57597b3332ad578614a0d9d5609f9cf8a278ee8a` is provenance only. Update
> this file at each phase end in the same commit as that phase record.

## Identity (fixed — exit gate complete 2026-11-02)

- Site: `DSA Archive` · repo: `pabi277/DSA-archive` · MIT applies to
  original code/data only; `LICENSE` is present.
- Audience: owner + a few invited friends. Backend: **Firebase Spark only**
  — Google Auth + Firestore + Hosting (gated); no Functions, Storage or
  Blaze. Website first; any Android app is a separate project.
- Git author: `pabi277 <chakraborttypabi2772006@gmail.com>`. Before every
  commit verify `git var GIT_AUTHOR_IDENT` / `GIT_COMMITTER_IDENT`; set
  repo-local identity if needed. Current branch is this chat's assigned
  `arena/9eff13a2-dsa-archive`; do not rename/switch it. Other chats must
  use their own Arena-assigned branch. Never push `main`.

## Rules digest (full rules: `./rule.md`)

- One phase per chat, exactly within `docs/ROADMAP.md` "Done means".
- No PR, merge, release, deployment (including GitHub Pages or Hosting
  preview channels), live Firebase changes, project creation/upgrade,
  visibility change, or bulk move/delete without explicit owner command.
- Never re-ask recorded choices. Read `docs/DECISIONS.md` first.
- Clean-room: `copy-web/` is STUDY-only. Do not ship its code/assets/text.
  Factual topic/problem labels/order/levels/links may be in our own data;
  link out to learning content.
- No secrets in git/chat. Owner handles Firebase console steps and
  creates the Spark project personally. Security rules protect the app.
- CI green + downloadable `site-preview` per phase. Any Firebase phase
  additionally needs emulator rules tests. Docs ride with code. Report CI
  run/tip/artifact and what preview shows; print next prompt; stop at gates.
- **No Phase 1 UI before the 0-D prototype is explicitly owner-approved
  and approved tokens are frozen in `docs/UI-REFERENCE.md`.**

## Current state (2026-11-02)

- **Phase 0 — Bootstrap + data extraction: ✅ complete and merged.**
  PR #2 merged to `main` at `8638a91` (owner explicitly commanded merge).
  Phase record: `docs/phases/00-bootstrap-data-extraction.md`.
- CI run #3 for the Phase 0 tip passed all checks and uploaded `site-preview`:
  https://github.com/pabi277/DSA-archive/actions/runs/41474032087
- Data: 495 rows · 20 topics. Levels Basic 84, Core 287, Pro 109, plus
  15 unbadged rows stored as `null`. The owner's 10-row live-sheet
  accuracy spot-check remains pending.
- **Phase 0-D — Design prototype + tokens freeze: 🚧 in progress.** The
  owner requested Phase 1, but Phase 1 is blocked until this prerequisite
  is approved. This chat is doing Phase 0-D only and will stop for approval.
- Owner selected prototype direction: **dark-first; neutral, text-labelled
  levels; responsive for both phone and desktop; text-only wordmark**.
  These are draft-direction choices, not prototype approval or frozen
  tokens. Record: `docs/DECISIONS.md` and `docs/UI-REFERENCE.md`.
- Prototype code: `src/design-prototype.tsx` + `src/styles.css`. It has a
  selector for all screen/state mocks, fake account/progress data, no
  Firebase connection, no persistence, no real outbound actions. The
  approval checkbox in `docs/UI-REFERENCE.md` remains blank; proposed
  palette/type/spacing are not frozen.
- Branch `arena/9eff13a2-dsa-archive` is active. Phase 0-D code and docs
  are in progress on that branch; verify status and latest CI/artifact before
  continuing. Do not open a PR or merge unless the owner explicitly commands it.
- No public website URL exists. GitHub Pages and Firebase Hosting have
  not been enabled/deployed. Repo remains public while `copy-web/` holds
  the third-party snapshot; owner should resolve the visibility item in
  `docs/DECISIONS.md`. Owner creates Spark project before Phase 2, not now.

## Finish Phase 0-D — approval gate

Read `rule.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `docs/RESEARCH.md`,
`docs/DATA-MODEL.md`, `docs/UI-REFERENCE.md`, and
`docs/phases/00d-design-prototype.md`. Verify branch, status, PRs, CI and
Git identity. Do not start Phase 1.

Run the Phase 0-D checks, obtain green CI and upload the `site-preview`
artifact. Present the prototype to the owner at phone and desktop widths.
Ask them to approve the mock and proposed tokens or list changes. The
owner's 10-row catalogue spot-check is a separate pending content-accuracy
task. Only after explicit approval: date the approval, freeze the final
values in `docs/UI-REFERENCE.md`, mark Phase 0-D ✅, and stop. Phase 1 is
for a later chat on that chat's assigned branch. No PR/merge/deploy without
fresh explicit authorization.
