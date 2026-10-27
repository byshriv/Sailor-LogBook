# Phase 0.1 verification — 27 October 2026

Phase 1 results: [docs/VERIFICATION-PHASE-1.md](docs/VERIFICATION-PHASE-1.md).
The unchanged demo suite was rerun: 85 pass here; the fresh source copy has 84 pass
and the expected ignored-v1-reference skip. Phase 1 browser/native/hosted review is pending.

## Passed locally

- `npm run check`: extracted inline script and external scripts pass `node --check`; manifests parse; offline assets exist.
- `npm test`: **85 tests pass**, with no failures or skips in this workspace.
- Desktop tests cover layouts, search, compact sidebar, Decks/Presets, toolbar actions, editor reservation, Notebook/Sea navigation and simulated movement/resizing for entries, timed tasks and ghosts.
- Onboarding tests cover the overlay, skipping phone-only steps, guide targets, focus, optional keyboard practice, typing guards and shortcuts. Original SVGs remain unchanged. Installed icon tests check native-mask framing, original inner curves/gradients, expected sizes and opaque full-bleed PNGs.
- Scheduler tests cover forced pulls on open, idle batching, throttled screen changes, foreground refresh, manual mode, best-effort hide/close, offline recovery and limited failure notifications. Saved notebook rows allow sync; unsaved text pauses it.
- Two independent clients use an in-memory, revision-checked Dropbox simulation for fresh-device adoption, bidirectional changes, encrypted joins and simultaneous conflicts. Tokens and device preferences stay separate.
- Transport/data tests cover tombstones, causal conflicts, notebook lines, best-thing limits, encryption, invalid data, create-only upload, revision races, refresh, offline failure, edits during upload, disconnect, storage failures, cross-tab exchange and stalled responses.
- OAuth tests cover redirect PKCE/state, expiry/origin checks, one callback exchange, automatic plaintext-first sync into an empty folder, fresh-device adoption, empty-folder onboarding, secondary encryption cancellation/enablement, encrypted joins and actionable expired-code errors. Encryption changes wait for any in-flight plaintext upload.
- Browser QA inspected onboarding with original artwork, Home, Calendar, right editor, Notebook, Settings and Reflection. Quick-add, search and notebook commits were exercised in earlier passes. Final Reflection cards align with no page overflow at 1440px.
- At 700px and 390px, browser checks confirmed available-width mobile layout, no desktop sidebar, no horizontal page overflow and the floating sync control. These are resized-browser checks, not physical devices.
- Original mobile view markup is compared against the ignored local v1 baseline. Shared branding, motion, width, sync UI and Notebook section navigation intentionally change. Planner's added date metadata/past-day class is normalized in the baseline comparison and tested separately. The baseline test skips on a clean checkout without `.local/v1.html`.
- The public Dropbox key is configured. After both redirect URLs were registered, a fresh request reached Dropbox’s sign-in page. The owner later reported successful live mobile/desktop transfers. No agent-led credentials or account grant were used.
- The duration-free preset bug (`dur: 0`) was reproduced before the fix, then tested through validation, cached-history initialization and encrypted round trips. Both mobile and desktop Planner Add task save into the chosen day, and `+lea` highlights Learning. Past days use a dimmed class. The one-off first authorization failure was not reproduced.
- Final browser checks saved tasks on desktop and at 390px, verified a yellow Learning border and selected state, and exercised preset Done saving/dismissing Menu B. Mobile sync now has a labelled pill with a dedicated 44px header space and no observed horizontal overflow.
- Actual desktop mouse input reordered Home and Reflection cards and moved a Planner task between days. The Calendar 3-day option was checked, then a timed task was moved across the now-line: Working on it when spanning the line, To do below it, and Done above it. Upward planned-task movement previously clamped to zero; the signed-delta fix was verified. Logged-block movement was left unchanged under the requested Calendar scope.
- The desktop Notebook footer button was clicked and correctly rejected an empty page; nonempty sending and sent-page editing are covered by tests. Keyboard practice was completed with actual key input to its fifth full-reference slide. Existing-Dropbox joins starting that tour are covered by mocked callbacks, including a mobile negative test.
- The local browser declined persistent storage both automatically and on an explicit retry. Settings correctly retained Standard browser storage. Tests cover granted, denied and unavailable API states; a grant cannot be forced by the application.
- Actual sidebar controls created/opened/collapsed a sub-deck without losing the current page. Deck-to-sub-deck navigation exposed the intended page animation; tests verify repeat renders stay still. Desktop sea water fills the workspace width; mobile Sea adventure has Back, no bottom nav or section switch, and the labelled sync pill. Notebook retains its switch.
- Conflict UI tests cover conditional display, identifiable device/Dropbox labels, both possible initial winners, keeping or restoring a version, choosing deletion, stale-review protection, stable IDs after another conflict is resolved, and preserving active drafts when requesting review. These use synthetic local records, not the owner’s Dropbox files.

## Deferred or remaining

- Agent-led live account testing remains deferred. The revised first-connect/encryption flow still needs real-device acceptance; the existing transfer behavior is owner-confirmed. Long-term refresh remains unverified.
- Physical Android/iPhone testing, haptics, iOS install/keyboard behavior, pen input, gestures and long-running storage stress remain pending.
- Close-time sync is best effort. Pending work retries on a later open/return; encrypted sync requires unlocking after reopening.
- Accessibility and independent security audits remain pending. Tests do not establish that the app is bug free.
- Main localStorage data, old duplicated code, IndexedDB migration and TypeScript remain later-phase work.
- A separate existing overlap was observed when opening Add preset from Menu B on mobile: the quick-add sheet can cover the preset editor's lower controls. It remains unchanged under the explicit request to limit Menu B changes to showing Done after selecting a preset. Existing presets can be selected and committed with Done.

Cache: `slb-v8-r3`. Icon URLs are versioned; actual launcher rendering still needs a phone install check. The Cloudflare-ready bundle and MIT source package are local. This work has not deployed to `logbook.shriv.work` or created a public GitHub repository.

## v8 checks

- Added 10 regression tests covering the full slot pointer/click sequence, outside taps dismissing both Calendar menus, hold-gated resizing, cancel rollback, draft preservation, edge scrolling, compact Menu B and autofill attributes, shared Dropbox help, mobile/desktop profile chrome, recursive deck rollups, guarded update notices and service-worker activation/cache cleanup. The entire suite passes: 85 tests.
- Actual browser checks verified the safe-storage Dropbox option, its expandable privacy explanation and scrollable onboarding layout; the sync screen has one connection description and unchanged controls.
- Actual browser slot input remained open through pointerup/click, retained +lea deck feedback and showed presets beside More Options. The mobile header fits without horizontal overflow; desktop parent deck names remain visible with the separate disclosure control. Phone resize/keyboard behavior remains simulated rather than physical-device validated. Autofill hints are best effort; browsers and password managers may override them.
- A separate local origin staged an actual service-worker update from a v8 test release to a v9 test release. The initial install showed no false update notice. The app downloaded the next worker, showed Update available, stayed on release 8 until Reload was clicked, then loaded release 9. The profile and original logged entry survived; the entry was verified through search. No browser errors were recorded. This fixture was never deployed, and the shipped worker remains Demo v8, with cache revision slb-v8-r3.
- Agent-led live Dropbox connection testing remains deferred. No Dropbox transport, encryption, scheduling or conflict-resolution behavior changed in v8; changes are connection copy/help and the existing onboarding entry point.

## Further v8 refinements

- Three additional tests cover full-weekday mobile dates, hiding/restoring the header around editors, text entry, search and customization, app-wide autofill hints with an encryption-field exception, saved avatar rendering on both headers and official Lucide SVG paths. The full suite now contains 85 tests. The v1 comparison ignores only requested input/date metadata and existing Planner dimming.
- Actual browser testing verified a real file upload and profile save, an image with a nonzero natural width in the mobile header, the full weekday at a narrow layout without horizontal overflow, Calendar editor top=0 with the header hidden, and restoration after an outside tap. The short Dropbox introduction was visually checked. No browser errors were recorded.
- Demo naming remains v8. The internal worker cache is slb-v8-r3, ensuring an earlier v8 cache is replaced rather than reused during installation. The cache-cleanup test covers both old v7 and initial v8 caches while retaining unrelated caches.
- Storage remains unchanged: main logbook and credentials in localStorage; record history in IndexedDB when available. Physical-device autofill/keyboard behavior and live Dropbox testing remain deferred.

## Final demo Settings fix

The `.sw` class was shared by sea-wave SVGs and Settings switch tracks, causing the latter to inherit an infinite horizontal wave animation. A scoped `button.rw2 > i.sw` rule disables animation/transform only on Settings tracks; the thumb retains its intentional on/off transition. Existing sea artwork/animation rules are unchanged. Real browser inspection on desktop and mobile found animationName=none and transform=none for all three Settings tracks. Sounds was toggled off/on and its thumb positions checked. Existing 85 tests pass; no new implementation-mirroring test was added for this CSS-only fix. Cache is slb-v8-r3.
