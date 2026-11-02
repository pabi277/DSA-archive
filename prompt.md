<!-- Adapted for a WEBSITE from AppFlow templates/prompt-app.md (MIT template). -->

# DSA Archive (website) — continuation prompt

> **Self-contained handoff.** Repo authority is `rule.md`; owner answers
> are in `docs/DECISIONS.md`; roadmap in `docs/ROADMAP.md`; live status
> is here. AppFlow @ `57597b3332ad578614a0d9d5609f9cf8a278ee8a` is
> provenance only. Update this file at every phase end in the same commit
> as the phase record.

## Identity (fixed — exit gate complete 2026-11-02)

- Site: `DSA Archive` · repo: `pabi277/DSA-archive` · MIT applies to
  original code/data only. `LICENSE` was added in Phase 0.1; it does not
  cover `copy-web/`, third-party content or libraries.
- Audience: owner + a few invited friends. Backend: **Firebase Spark
  only** — Google Auth + Firestore + Hosting (gated); no Functions,
  Storage or Blaze.
- Website first; any Android app is a separate project. Keep data,
  tokens and Firestore shape portable.
- Git author (owner-designated): `pabi277
  <chakraborttypabi2772006@gmail.com>`. Before each commit verify
  `git var GIT_AUTHOR_IDENT` and `git var GIT_COMMITTER_IDENT`; repo-local
  config is already set. Work only on the session branch assigned to your
  chat. The current session branch is `arena/07bfcf1a-dsa-archive`;
  planning branch `arena/6dcaf48f-dsa-archive` was merged and must not be
  reused. Never push `main`.

## Rules digest (full rules: `./rule.md`)

- One phase per chat, strictly within `docs/ROADMAP.md` "Done means".
- Never create/switch branches, push `main`, force-push, reset hard,
  open a PR, merge, tag, release, deploy (including Hosting preview
  channels), deploy live rules, create/upgrade a Firebase project, change
  repo visibility or bulk-delete/move files without the owner's explicit
  command.
- Read `docs/DECISIONS.md` before asking; recorded decisions are never
  re-asked. Ask less; gate always.
- Clean-room law: `copy-web/index.html` is STUDY-only. Never ship its
  code/assets/content. Only factual hierarchy, problem titles/order/levels
  and outbound links may cross over in our own code/data. Link out to
  learning content.
- No secrets in git/chat. Owner personally handles Firebase console
  work. Security rules are the protection and must be Emulator-tested
  before a gated live deploy.
- CI green + downloadable `site-preview` each phase. Firebase phases
  also need emulator rule tests. Docs ride with code; report CI run, tip
  SHA, artifact and what preview shows; print next-chat prompt in chat;
  stop at the merge gate.
- No real product UI until phase 0-D design approval and tokens freeze in
  `docs/UI-REFERENCE.md`.

## State (update at every phase end)

- **Phase 0 — Bootstrap + data extraction: ✅ complete** (2026-11-02)
  on this session branch. Record: `docs/phases/00-bootstrap-data-extraction.md`.
  Commit sequence starts with `4fd4b91`; branch tip before the final docs
  update was `58d5e3e`.
- Delivered: MIT licence/hygiene; one-time clean-room extraction to
  `data/problems.json`; pinned Vite + React + TypeScript + Tailwind/daisyUI
  hello-sheet; unit/data/build/link/dist checks; responsive/accessibility
  CI and emulator-only `firebase.json` (no Firebase SDK/project/Hosting
  config or live changes). `copy-web/` remains unchanged and excluded from
  every build.
- Catalogue: **495 rows · 20 topics**. Reconciled levels: Basic 84, Core
  287, Pro 109, plus 15 rows with no source badge (`level: null`). Link
  unique counts: practice 453, articles 286, LeetCode 273, `youtu.be` 256;
  extraction also retains 65 additional unique `youtube.com` links. The
  older 85/288/110 badge tally was not reproducible from the snapshot.
- CI first green run: #1
  `https://github.com/pabi277/DSA-archive/actions/runs/41473226909`
  (tip `58d5e3eafabd03d07d59ab8d9f1e9ac4d1f55f3d`); `site-preview`
  artifact uploaded (122,163 bytes, 14-day retention). The workflow Action
  dependencies were updated after GitHub emitted a Node 20 deprecation
  annotation; verify the latest run again at chat start/end.
- **Owner content-accuracy task still pending:** spot-check 10 random
  catalogue rows against the live sheet. The data file does not claim that
  review happened. This task does not license copying explanations.
- No design is approved. The page is only a minimal count/topic preview;
  no sign-in, progress, notes or planner behavior exists.
- Open owner items remain in `docs/DECISIONS.md`: repository is PUBLIC
  while holding third-party copied material (owner should make it private
  or explicitly command a visibility change); create a Spark Firebase
  project personally before Phase 2 (not now).
- No PR, merge, deploy, Hosting preview channel, live Firebase project,
  or live rules change has been authorized/performed.

## Next: Phase 0-D — Design prototype + tokens freeze

Read `rule.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`,
`docs/RESEARCH.md`, `docs/DATA-MODEL.md`, `docs/UI-REFERENCE.md`, and the
Phase 0 record. Verify `git status`, `git log`, PRs, CI and author identity.
Confirm the starting branch is the chat's assigned session branch; do not
reuse the previous branch. Do not re-ask any recorded answer.

Build only the phase 0-D prototype specified in `docs/UI-REFERENCE.md`:
phone-first mockups for every listed screen/state (including sign-in,
sync/offline and friends), using fake but real-shaped data; owner review
via the `site-preview` artifact; ask the four recorded design choices
(dark/light, badge colors, density, original wordmark); freeze tokens only
after explicit owner approval in chat. Keep real UI code blocked until
approval. Invite owner to complete the pending 10-row data spot-check.
Do not start Phase 1 before the 0-D approval is recorded. End at the
merge gate; no PR/merge/deploy without a new explicit command.
