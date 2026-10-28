# Phase handoff — Phase 6 Tasks and Planner

Updated 28 October 2026. Scope: Phase 6 only. Branch `codex/phase-6-planner`.
Implemented for owner review at `/?phase=6`. Phase 7 and later ports remain gated.
No production deployment, real-data cutover, cloud mutation or main push occurred.

## Baseline and acceptance

Read PHASE-HANDOFF.md, LAUNCH-DECISIONS.md, LAUNCH-PLAN.md, ROADMAP.md,
docs/PRODUCT-SPEC.md and earlier architecture/ADRs/verification records before editing.
The owner's continuation explicitly accepts Phase 5 as complete and authorizes Phase 6
only. Acceptance is recorded in launch decisions/plan, roadmap, product spec and Phase 5
status/verification. Earlier review-era reports remain historical.

Fetched origin and verified local `main == origin/main`, zero ahead/behind, at
`5792285ded097bc16f5bf28b0f570e059d391831`, containing merged PR #14. GitHub independently
confirms its merge on 28 October at 17:23:08 IST. Final Phase 5 head
`2bdbb16a8408f5af72ec7b2a935f98de110c209c` passes check/android-proof/codeql and separate
CodeQL results (no new alerts) in [run 40682341891](https://github.com/byshriv/Sailor-LogBook/actions/runs/40682341891),
including 81 Linux browser checks, 43 foundation tests and three Android emulator cases.
Those are Phase 5 results, not hosted Phase 6 evidence.

Pre-existing uncommitted owner planning updates are preserved: Phase 13 is the final
owner-dictated review after Phase 12 and before deployment, now Phase 14. Track errors,
bugs, UI/UX changes, missing additions and Demo v8 discrepancies, including previously
unmentioned feedback, in [the review register](docs/PRE-RELEASE-OWNER-REVIEW.md). Implement
agreed fixes, retest and repeat until owner acceptance. Earlier acceptance does not waive
this review; Phase 11 hardening remains. No later implementation was started.

## Implementation map

- `packages/domain/src/planner.ts`: task drafts/flags, quick syntax, atomic edits,
  stable-identity moves, reviewed rollover/skipping, dated history and day columns.
- `apps/web/src/planner.tsx` / `planner.module.css`: desktop/mobile Planner, task editor,
  pointer/held-touch moves, filters, review, scheduling dock, Undo and persistent recovery.
- `apps/web/src/main.tsx`: lazy `/?phase=6`; earlier routes remain compatible.
- `apps/web/src/reflection.tsx`: Planner links only, including unresolved-task review.
- `tests/foundation/planner.test.ts`: six domain/durability/migration/media regressions.
- `tests/browser/planner.spec.ts`: seven composed cases per engine covering interaction,
  rollover, cancellation, dates/restart, failure retry and prior-surface preservation.

See [architecture](docs/ARCHITECTURE-PHASE-6.md), [status](docs/PHASE-6-STATUS.md) and
[verification](docs/VERIFICATION-PHASE-6.md). The port shares `slb-phase2`, verified
Redux projection, existing commands, durable/media gateway and `slb-phase2-editor` lock.
No schema/command/migration/transport changes. Calendar and Notebook sources/CSS are
untouched. IDs, unknown compatibility fields, raw archives, editable strokes and digest
blobs survive targeted edits. Task edits never create logged activities or media copies.

## Reviewable interactions

The board retains three past days and eight from the selected day; past headers dim.
Timed and untimed tasks, Must-do, Waiting on, Low energy, Voyage percentage and explicit/
manual/clock statuses stay available. Skipped/Not gonna do rows and dated historical
markers remain inspectable. Editor Date/Time is the keyboard alternative to dragging.

Unresolved tasks stay on their original dates across midnight/restart. Clock Done does
not mean work was logged or automatically resolve a saved To do plan. Review offers:

- Leave planned/Cancel, with no write.
- Rollover preview to an explicit later date/time, defaulting to untimed To do. The same
  identity moves; history records Skipped on its original day plus the prior saved status.
  Title/deck/flags/progress remain. Ordinary moves preserve current status/time.
- Skip or Not gonna do, retaining the original date and historical prior status.

The optional Calendar scheduling dock adds half-hour drop targets and a full Calendar
link; scheduling only changes the same task's date/time. Clearing Time makes it untimed.
This dock, rollover defaults and historical markers require owner interaction review.
Plans, clock-Done tasks, manual Done and 100% Voyage never add logged time or streak hours.

Mouse release commits once using its final hit target. Touch/pen uses a stationary 350ms
hold; early movement cancels. Escape, pointer cancel, lost capture and outside release
leave canonical state unchanged; other pointers are ignored. Drafts block in-app date/
navigation/filter changes; explicit Cancel discards. Failed saves retain fields and allow
retry. Saved follows transaction completion. Normal creation/edit/move/review/deletion
supports immediate Undo and persistent 30-day Recent changes, with stale-restore review.

## Verification and continuation

Local results and exact limits are in [Phase 6 verification](docs/VERIFICATION-PHASE-6.md).
Only synthetic fixtures/disposable profiles were used. Actual phone/Safari/keyboard/
storage-pressure/OS-kill tests, final media budgets and existing issues #2/#3 remain
release gates. Synthetic replay is not production sync; Dropbox remains Phase 9.

Run `npm run dev:foundation`, open `http://127.0.0.1:5173/?phase=6`, and close other
Phase 2/3/4/5/6 editing tabs first. Calendar/Notebook/Home remain at `/?phase=3`,
`/?phase=4` and `/?phase=5`; day links retain their original dates. The root demo and
37-file frozen reference are unchanged. Review desktop/mobile composition, actual touch
hold/cancel/edge scrolling, keyboard/insets, date boundaries, history, rollover defaults,
statuses and Voyage. This implementation does not accept Phase 6 on the owner's behalf.

Before merging a published Phase 6 PR, require check/android-proof/codeql and separate
CodeQL results on its exact final head. Phase 5's green run is not Phase 6 evidence.
No Phase 6 hosted/Android/physical-device pass is claimed by local tests. Settings and
all Phase 7+ ports require a new owner request; no later port was started.
