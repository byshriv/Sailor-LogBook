# Phase 7 management and experience architecture

28 October 2026. Phase 7 only. The owner explicitly accepted Phase 6 as complete.
Fetched `main == origin/main`, zero ahead/behind, at
`9debb35a6dc0ac8f3b0bbc72d8781e7e36f4b395`, containing merged PR #15 and its final
head `77ecb628639c18517320d0f23bb265a05c14d235`. Work is on `codex/phase-7-settings`.
The uncommitted README/DEPLOY owner edits are retained separately.

## Composition and compatibility

`/?phase=7` mounts Settings/profile and management. Calendar, Notebook/Sea,
Home/Reflection and Planner retain their existing routes, screens and editors.
Small composition changes add shared search/profile access, desktop deck/preset menus,
keyboard handling and original-date item/preset links. Reflection accepts explicit
screen/date links; Calendar reads the existing `m` Month preference as well as numeric
views. The demo root source and all 37 frozen reference files remain unchanged.

Every surface uses `slb-phase2`, verified replay, the same Redux projection,
`slb-phase2-editor` Web Lock and durable operation/media gateway. There is no new
database/schema/command, legacy-storage read, migration activation, cloud transport,
service worker or deployment. No real owner logbook/cloud copy is used in tests.

`packages/domain/src/management.ts` owns settings compatibility, targeted deck/preset
edits, hierarchy validation, descendant aggregation, search projection and reminder rules.
New settings overlay migrated `settings:legacy.value.pf` through the existing
`settings:preferences` seam read by Calendar. Name and photo changes retain the existing
`settings:legacy` payload, layouts, unknown fields and compatibility metadata. Defaults
retain v8's sound/haptics, Sunday week, 24-hour time, Day and 21:00 reminder.

## Management, media and recovery

Decks support three total levels. Disclosure, opening descendant records and editing
are separate controls, including desktop dropdowns. Names, colours and original v8
16-icon artwork (`legacy.ic`) remain available. Reparenting validates the whole tree;
cycles and fourth-level descendants fail before saving. Stable exclusion flags remain
independent of visible names and apply to descendants.

Deletion previews an explicit reassignment, including direct child decks, activities,
tasks and presets. Existing `deck.remove` commits relationships atomically and never
deletes activities. Undo restores the compound relationships. Presets preserve identity,
unknown fields and zero-duration meaning (keep the current ghost length); Calendar
selection exposes Done. Normal mutations use reversible commands, immediate Undo and
30-day Recent changes, with stale-restore refusal from the existing domain.

New profile photos use `preparePhoto` and `browserPhotoCodec`: WebP by default, unchecked
Keep original with source size/storage/transfer copy, explicit 8 MiB input, 16 million
pixels, 2048px long edge / 1 MiB WebP preview budgets. These remain provisional device-test
budgets. Encoding precedes the transaction. `settings:legacy.value.avatarDigest` refers
to the shared digest blob store; `attachmentIds` extends existing media validation to
this reference for commit, migration staging/activation and startup hash verification.
Name/photo and blob commit together. No image bytes enter operation payloads. Existing
data URLs, archived source, drawings and unrelated attachments stay intact. Removal/Undo
retains blobs; no physical collection or encryption is claimed. Windows WebKit native
Blob limitations remain visible failures, with the file/name retained for retry.

Drafts stay outside Redux until transaction completion. Failure never publishes Saved,
retains fields and supports retry. In-app tools/navigation are disabled while an editor,
write or drawing draft is active; browser close warns without guaranteeing OS-kill
survival before commit. Global shortcuts operate on the committed projection and share
the durable gateway. No fake acknowledgement or compaction is introduced.

## Onboarding, guides, search and keyboard

An empty Phase 7 store offers an in-app welcome overlay. Seven steps cover local use,
name, reflection prompt, startup priorities, the six v8 starter decks, an optional
reminder and completion. Choices commit together only at Set sail; Cancel writes nothing.
Existing content is preserved when reviewing onboarding. Existing-logbook joining explains
the later backup/Dropbox phases without connecting or advertising an active transport.

The normal walkthrough visits actual accepted screens, outlines available targets and
has Back/Next/Skip. Its revised rollover/capability copy follows accepted decisions.
Completion persists and ordinary renders/reopens do not replay it. Desktop completion
offers optional keyboard practice; phone layouts omit that offer. Four safe exercises
end in the full v8 shortcut reference. Practice creates no journal content. Explicit
replay remains in Help. These overlays/step grouping and the shared tool row
are reviewable Phase 7 interactions requiring owner visual/interaction review.

Search includes activity/task title, original date and deck path, Notebook messages,
Reflection text, decks, presets, Settings sections and navigation/create commands.
Item links open the original-date Calendar/Planner editor; Reflection links retain
their date. Search is read-only and stays available from all accepted surfaces when
no draft blocks navigation.

The complete shortcut reference retains create/find/navigation/item/Calendar groups,
Ctrl/Cmd variants, typing/composition guards and browser-tab shortcut protection.
N/T/Shift A/Shift P, 1–6, Alt N, Shift S/L/T/D, comma, search/help, item focus/edit,
manual Done, duplicate, confirmed delete, form Save and Calendar period/zoom are wired.
Ctrl/Cmd S shows an honest sync-status explanation until Phase 9. Keyboard item changes
do not manufacture logged time. Native modal dialogs plus an explicit Tab wrap provide focus containment, Escape,
background inertness and focus return (including WebKit pointer-origin tracking); save errors are announced inside the modal.
Labels, visible focus, no colour-only deck names, narrow layouts and existing reduced
motion rules remain in use. Automated checks are not an accessibility audit.

## Reminders and honest platform boundaries

Open-tab reminders check every 30 seconds, only in the selected local minute and when
no activity segment exists for that local day. Plans/Done tasks do not count as logs.
A durable daily receipt precedes notification and prevents repeat alerts; failed receipt
writes retry without claiming delivery. Active drafts/overlays pause checks. Test reminder
is explicit and does not alter the daily receipt. Permission is requested only by an
explicit button; denial/unavailable constructor retains in-app feedback. Background tab
suspension and closed-app delivery are not guaranteed. Native scheduling is Phase 10.

Sound/haptic preferences apply to explicit button gestures through available browser
APIs, with visual feedback retained when unsupported/muted. Storage estimate/persistence
requests report returned grants, denial/unavailable APIs and estimated usage honestly;
no grant can be forced. Production PWA/offline/update/backup/import/export work stays in
Phase 8. Dropbox joining/transport and optional encryption stay in Phase 9. Signed APK,
native reminders/keys/widgets stay in Phase 10. Android 12+, recommended 4 GB and iOS 17+
Safari/PWA are targets, not physical-device verification claims. Optional encryption is
secondary; IndexedDB is not encrypted and unencrypted Dropbox copies lack that privacy.

## Continuation boundary

Phase 7 owner review, physical keyboard/touch/insets/Safari, storage pressure/OS kill,
final media budgets and existing issues #2/#3 remain explicit gates. Phase 8 and later
ports have not started. Phase 13 final owner review remains required before deployment.
