# Phase 6 Tasks and Planner architecture

28 October 2026. Scope: Phase 6 only, following explicit Phase 5 acceptance and
verified PR #14 merge `5792285ded097bc16f5bf28b0f570e059d391831`.

## Composition and data preservation

`/?phase=6` lazily mounts Planner on the existing `slb-phase2` canonical IndexedDB,
verified startup/replay, Redux projection, durable command/media gateway and shared
`slb-phase2-editor` Web Lock. No schema, command vocabulary, storage fallback, legacy
reader, migration activation, transport, service worker or deployment was added.
The frozen demo and previous review routes remain available. Close other editing tabs.

`packages/domain/src/planner.ts` supplies pure task editing, moves, review, dates,
filters/flags and historical projection. All writes use existing `putMany`, `delete`
and `restore` commands through `createLogbookProjection`. The old `rollover` reducer
is unchanged so retained operation tails replay with their original semantics. New
review operations use reversible compound puts and do not require a protocol change.

Targeted task edits spread original entities/compatibility payloads and retain IDs,
opaque fields and history. Deck syntax/recent use and a task commit atomically. Existing
activities, Notebook pages/editable strokes, Sea histories, Reflection settings/moods,
raw migration archives, attachment references and digest media remain intact. Tasks do
not manufacture activity records, raster previews or attachment copies. Existing media
budgets/capabilities are unchanged; new task-photo creation remains unavailable as in
the Calendar task editor. Migration/media regressions verify exact retained bytes.

## Interaction preservation and review choices

The desktop workspace has a sidebar, toolbar and horizontally scrollable day board.
Mobile has snap columns and floating pill navigation. Eleven days retain three past
columns and eight from the selected date. Past headers dim, task content stays readable.
The editor supports shared quick syntax, deck selection, optional time/minutes, Must-do,
Waiting on, Low energy, Voyage percentage and six explicit/manual statuses. Skipped and
Not gonna do tasks remain inspectable, including through a dedicated filter.

Moves keep one task identity and the original time/status/flags. The original date/status
is appended to history; dated markers link to the current editor. Editor Date and Time
are the keyboard alternative to dragging. A scheduling dock exposes half-hour Calendar
drop targets and links to the full accepted Calendar. Scheduling sets task date/time;
clearing editor Time returns the same task to untimed. This small dock is a new reviewable
interaction, not a replacement for Calendar. Calendar/Notebook sources and CSS are unchanged.
Home changes only add Planner links and route its unresolved-task review to Planner.

Mouse handles capture one pointer and commit only the release hit target. Touch/pen
handles require a stationary 350ms hold; pre-hold movement cancels. Escape, pointer cancel,
lost capture and release outside a target abandon the draft without a write. Pointer
release reads its final position independently of React state batching. Edge movement
scrolls the board/time dock. An additional pointer must not replace the active gesture.

Unresolved tasks are identified by saved todo/doing/stuck, independent of a derived
clock-Done label. They remain on their original dates, including across midnight/restart.
Nothing automatically writes from the clock or moves a past task. Review is per-task:

- Leave planned/Cancel closes without a write.
- Rollover previews an explicit later day and optional time, defaulting to untimed To do.
  The same identity moves; original date is recorded as Skipped with its previous status,
  time and progress retained in history. Title/deck/flags/progress stay intact.
- Skip/Not gonna do keeps the original date and records its prior status in history.

Rollover defaults, historical markers, retained skipped rows and the scheduling dock
need owner review. They implement the accepted gentle review and retained-history rule;
they do not infer the owner's visual acceptance. Planned tasks, clock-Done tasks, manual
Done and 100% Voyage progress never enter logged time, streaks or logged-duration totals.

## Durability and remaining gates

Drafts live outside Redux until storage completion. In-app date/navigation/filter controls
are blocked while an editor/review is open; explicit Cancel discards it. Before-unload
warns for drafts/pending writes, without claiming OS-kill persistence before commit.
Failures retain every draft field and allow retry. Saved only follows the transaction.
Normal task creation/edit/move/review/deletion has immediate Undo and persistent 30-day
Recent changes; stale restores fail for review. Dialogs trap focus and restore their
opener. No history is acknowledged/compacted by fake sync.

Physical phone/Safari, keyboard insets, true held-touch feel, storage pressure/OS kill,
empirical media budgets and existing release gates remain separate. Synthetic replay is
not production sync. Phase 7 Settings and all later ports remain unauthorized.
