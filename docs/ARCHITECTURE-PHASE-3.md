# Phase 3 Calendar architecture

28 October 2026. Owner request: Phase 3 only. Based on current main
`7107798b96137a87328204d0db5576a80ecdc5ad`, the verified merge of PR #11.

## Composition and review boundary

`/?phase=3` lazily mounts `apps/web/src/calendar.tsx` with CSS Modules, the existing
fonts/tokens and original brand artwork. Default `/` and `/?phase=2` stay compatible.
The Calendar shares `slb-phase2` and `slb-phase2-editor` with Phase 2. It loads the
verified canonical state before creating the Redux projection. It does not read `slb1`,
OAuth storage or cloud data. No service worker, cutover or deployment was added.

This is the Calendar review surface, not the complete future application shell. Deck
and preset lists provide Calendar context. Notebook, Home/Reflection, Planner board,
Settings, onboarding, backup/import, cloud transport and native ports remain their
existing phases. Calendar can show/edit timed tasks without porting the Planner.
Owner Calendar acceptance is required before treating the phase as accepted.

## Domain and writes

`packages/domain/src/calendar.ts` owns pure date/view ranges, quick syntax, word-start
and recent-deck matching, connected overlap groups, clock-derived task presentation,
linked-interval movement and timezone resolution. Plans never enter logged totals.
Daily labels use Phase 2's union selector, including explicit elapsed offsets.

`putMany` is an additive command: validate and put an entire entity set atomically, reject
duplicate keys/tombstone resurrection, capture one reversible before/after set, then let
Phase 2 validate relationships and the four-featured cap. New-deck quick-add, recent-use
updates, activity and best-thing links cannot partially commit. Calendar single-entity
updates also use this command. Undo retains deletion barriers for additions.

The new command detaches its Undo after-values from mutable entities. Otherwise a later
activity deletion could mutate a linked moment and also mutate the earlier Undo comparison
value. Existing Phase 2 command semantics are retained for deterministic old-tail replay.
Old code cannot replay a new command; do not downgrade an edited database to old bundles
or acknowledge/checkpoint with an unverified transport. Production protocol floors remain
Phase 9. The synthetic preview is not a production schema cutover.

`OperationPipeline.save` now accepts snapshotted media alongside the command. The existing
store hashes before the transaction and commits blobs/head/tail/receipts together. Redux
and Saved publish only after completion. Errors retain the draft; no fallback database,
fake acknowledgement, automatic repair or deletion is introduced.

## Time and interactions

Title/metadata-only edits retain the exact original segments/offsets/zone, including
unknown legacy context. Moves and resizes of known-zone records resolve that original
zone, never the travelling device zone. Unknown legacy context remains null. New logs
capture the device's current IANA zone. DST gaps/repeated times fail for explicit offset
review in More Options; no ambiguous time is guessed. Linked segments remain one activity,
including when the second displayed segment is dragged. Missing historical context cannot
be reconstructed. Original media/unknown legacy fields are retained.

Menu B keeps title syntax, presets, More Options, Enter save and preset-triggered Done.
Menu A has date/time/duration, deck, best thing, tags, status (tasks), expanded metadata and
photo input. A duration-free preset retains the current ghost duration. Migrated `pf.dl`,
`pf.dv`, `pf.ws` and `pf.h24` are read. Unknown deck prefixes create a deck with organize
feedback. Best-thing unfeaturing retains notebook moment text.

Pointer drafts are disposable until release/save. A ref records the latest pointer
position independently of React batching; release commits that final position. Pointer
cancel/Escape leaves canonical state untouched. Touch uses a stationary 350ms hold;
pre-hold movement cancels. Draft edge resize preserves typed text and waits for Done.
Edge proximity scrolls the visible timeline during movement. Slider, Ctrl-wheel and
pinch control zoom. Alt+Up/Down move by five minutes; Alt+Shift+Up/Down resize. Enter/Space
opens a focused block. Outside editor taps dismiss without selecting another block.
Navigation/reload cannot silently commit a draft. Physical keyboard/insets/gesture feel
still needs actual phone acceptance; synthetic pointer events are not physical touch.

## Media limits and capabilities

Calendar reuses Phase 2 photo preparation, MIME validation and digest blobs. Keep original
starts unchecked and explains storage/transfer cost. Review-only limits: 8 MiB source,
16 million decoded pixels, 2048px long edge / 1 MiB WebP output. These are conservative
preview budgets, not empirically approved release guarantees. Original artwork is unchanged.
WebP encoder failure retains the draft and offers the explicit original choice; it never
relabels PNG/JPEG. Native IndexedDB Blob failure reports photo storage failure and retains
the draft. Windows Playwright WebKit currently fails even a standalone Blob put; Chromium
passes exact original-byte save/reopen. Do not infer Safari support or change canonical
storage to localStorage to conceal that engine limitation.
