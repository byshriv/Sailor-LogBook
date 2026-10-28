# Phase handoff — Phase 7 management and experience

Updated 28 October 2026. Branch `codex/phase-7-settings`. Implemented for owner review
at `/?phase=7`, published in [draft PR #16](https://github.com/byshriv/Sailor-LogBook/pull/16). Phase 8 and later ports remain gated. No deployment, real-data cutover,
Dropbox connection or main push occurred.

## Baseline and acceptance

Read this handoff, LAUNCH-DECISIONS.md, LAUNCH-PLAN.md, ROADMAP.md, docs/PRODUCT-SPEC.md
and earlier architecture/ADRs/verification before continuing. The owner explicitly
accepts Phase 6 as complete and authorizes Phase 7 only; acceptance is recorded in the
launch documents, product spec and Phase 6 reports.

Fetched origin before work and again before final review. Local `main == origin/main`,
zero ahead/behind, at `9debb35a6dc0ac8f3b0bbc72d8781e7e36f4b395`, the PR #15 merge.
Its final head `77ecb628639c18517320d0f23bb265a05c14d235` is an ancestor. Git records
its merge at 19:32:03 IST on 28 October. Earlier hosted results are not Phase 7 proof.

README.md and DEPLOY.md retain their exact pre-existing owner diffs, remain uncommitted
and are excluded from Phase 7 commits. Phase 13 final owner review and Phase 14 deployment
gates remain in place. No owner feedback, final acceptance or later authorization is invented.

## Implementation map

- `packages/domain/src/management.ts`: settings/profile/deck/preset edits preserving
  compatibility, hierarchy validation, descendant records, search and reminder rules.
- Domain/persistence `logbook.ts`: existing media validation now also verifies profile
  digest references, atomic commit, migration staging/activation and startup hashes.
- `apps/web/src/management.tsx` / `management.module.css`: Settings, profile, hierarchy,
  presets, reassignment/recovery, onboarding and capability feedback.
- `management-ui.tsx` / `deck-art.ts`: original deck icons, shared avatar/menus/search,
  normal walkthrough, safe keyboard practice/reference, shortcuts, focus and reminders.
- Existing Calendar/Notebook/Home/Reflection/Planner: small shared-control composition,
  original-date item/preset links, Month preference, Reflection route/date and Planner time labels.
- Eight new foundation regressions and twelve Phase 7 browser cases per engine.

See [architecture](docs/ARCHITECTURE-PHASE-7.md), [status](docs/PHASE-7-STATUS.md) and
[verification](docs/VERIFICATION-PHASE-7.md). All ports share `slb-phase2`, verified replay,
Redux projection, durable command/media gateway and `slb-phase2-editor`. No new schema,
command, migration activation, transport or PWA behavior. IDs, opaque fields, archives,
editable drawings, original media and earlier screens stay intact. The root demo and
all 37 frozen reference files remain unchanged.

## Reviewable interactions

Settings has profile, preferences, decks, presets, reminders, storage, capabilities and
Help cards, desktop sidebar dropdowns and mobile pill navigation. Shared controls occupy
normal workspace/header layout and do not cover accepted-screen actions. Review desktop/
mobile proportions, keyboard/insets and visual density against v8.

Deck disclosure/open/edit controls are independent. Three levels are validated across
whole subtrees. Colours, all sixteen original icons and six original starter decks remain.
Deletion previews explicit child-deck/record/preset reassignment, never deletes activities
and has compound Undo. Preset duration zero retains the Calendar ghost length and exposes Done.
Normal changes have immediate Undo and 30-day Recent changes; stale restores require review.

Profile photos use the existing verified WebP pipeline and provisional media budgets.
Keep original starts unchecked and explains source size/storage/transfer cost. Name/reference/
blob save together; failure retains the draft. Removal is reversible without physically
collecting blobs. Migrated data URLs and archives stay. Windows WebKit's native Blob
limitation remains visible; no Safari photo-storage pass is implied.

Seven-step onboarding commits once at Set sail; Cancel writes nothing. Existing content
survives reviewing setup. Explicit create/help/guide links avoid stacked first-run overlays.
Joining an existing logbook explains later capabilities without connecting. The normal guide
visits actual screens with Back/Next/Skip and completion tracking. Desktop completion offers
optional keyboard practice. Four safe exercises end in the full reference and record completion
without creating journal content. Normal reopen does not replay the guide; Help allows replay.

Search spans entries/tasks, original dates/deck paths, Notebook/Reflection, decks/presets,
Settings and commands. Links open existing editors on their original day. Typing/composition
guards, Ctrl/Cmd variants, item focus/edit/Done/duplicate/confirmed delete, Undo and Calendar
shortcuts remain. Planner display follows time format while native time inputs retain their
values. Dialogs wrap Tab, handle Escape, keep the background inert and return focus, including
WebKit. Drafts block in-app tools/navigation. Failure retains fields and announces inside dialogs.

Reminders check open tabs in the selected local minute, only without logged activity that day.
Plans/completion never count as logging. A durable daily receipt prevents repeats. Permission
and Test are explicit; denial/unavailable APIs retain in-app feedback. Background suspension/
closed-app delivery is not promised. Storage grants/estimates and sound/haptics report actual limits.

Encryption remains secondary. This preview does not encrypt local IndexedDB or connect Dropbox.
Production PWA/update/data tools stay Phase 8; Dropbox/join/encryption stay Phase 9; native APK/
reminders/keys/widgets stay Phase 10. Platform targets are not physical-device verification claims.

## Verification and continuation

Synthetic fixtures/disposable profiles only. Results:

- All 85 unchanged demo tests pass.
- Typecheck, boundaries, all 57 foundation tests and preview build pass.
- Full Chromium/WebKit suite: 89 pass, one explicit Windows WebKit profile-Blob skip.
- Final Phase 7/empty-store route follow-up: 23 pass, one explicit Windows WebKit photo skip.
- Firefox fails before app launch with Windows `spawn UNKNOWN`; 44 remaining cases do not run.
- Syntax/manifests/assets, all 37 frozen hashes, narrow secret scan, formatting and whitespace pass.

The full passing report is retained locally at ignored `build/browser-phase7-chromium-webkit.json`.
The default report may show a later Firefox or targeted run. Desktop/mobile captures under
`build/` were inspected. Tests caught and corrected control overlap and dialog focus gaps.
Calendar's resize fixture centers the handle away from edge scrolling; its gesture code is
unchanged. Planner's disclosure fixture names unresolved tasks instead of a generic first dropdown.

Phase 7 owner acceptance remains pending. Physical phone/Safari/touch/keyboard-inset/storage-
pressure/OS-kill evidence, final media budgets, independent audits and existing #2/#3 gates remain.
No hosted Phase 7/native/emulator pass is claimed. Before any later PR merges, require check/
android-proof/codeql and separate CodeQL results on its exact final head. Local commits separate
rules/media, UI/browser, empty-store routing and documentation; they do not imply publication,
merge or deployment.

Run `npm run dev:foundation`, open `http://127.0.0.1:5173/?phase=7` and close other Phase 2–7
editing tabs first. Prior routes stay at phases 3/4/5/6; Reflection accepts
`/?phase=5&screen=reflection`. Use disposable data. Continue Phase 7 review/fixes only unless
the owner explicitly authorizes another phase. Do not start Phase 8 or later ports.

Review commits: `cb11575` (domain/media), `306128e` (UI/browser), `36d667c`
(empty-store route follow-up), followed by the acceptance/verification/handoff commit.
Only README.md and DEPLOY.md should remain modified after committing this handoff.

## Publication follow-up

Published through the connected GitHub Git-data tools in draft PR #16. Every full
domain/media, UI/browser, routing and documentation tree exactly matches its locally
verified counterpart. No terminal credential, force push, main push, merge or deployment.
The original local history is retained on `codex/phase-7-settings-local`; the active
branch tracks the published history after fetching. README/DEPLOY owner edits remain
uncommitted and excluded. See VERIFICATION-PHASE-7.md for the tree identity table.

The publication record itself also requires all checks on its final head. Hosted checks
were pending when this record was committed; use PR #16 checks/description for the exact
final head/run/artifact results. No earlier local or hosted run substitutes for a later
revision. Draft publication does not accept Phase 7 or authorize merge, deployment or Phase 8+.
