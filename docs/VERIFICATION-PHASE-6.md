# Phase 6 verification

28 October 2026. Local Windows; Node 24.22.0/npm 11.19.1, Playwright 1.64.1.
Only synthetic fixtures/disposable browser profiles were used. No real logbook/cloud data.

## Local checks

| Check                                          | Result                                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm test`                                     | All 85 unchanged demo tests pass                                                                     |
| `npm run verify:foundation`                    | Typecheck, dependency boundaries, all 49 foundation tests and production preview build pass          |
| Full Chromium/WebKit suite                     | All 68 checks pass, including 14 Planner, 16 Calendar, 12 Notebook/Sea and 12 Home/Reflection checks |
| Firefox, `--workers=1 --max-failures=1`        | Fails before launch with Windows `spawn UNKNOWN`; 33 checks not run; no application pass claimed     |
| Syntax/manifests/assets and narrow secret scan | Pass                                                                                                 |
| Frozen v8 reference                            | All 37 hashes pass                                                                                   |
| Formatting/whitespace                          | Pass                                                                                                 |

Successful full browser report: ignored `build/browser-phase6-chromium-webkit.json`.
The default report records the subsequent Firefox launcher failure. No hosted Phase 6,
Android/emulator or physical-device pass is claimed. Phase 5's final hosted evidence is
recorded separately in VERIFICATION-PHASE-5.md; it is not Phase 6 proof.

## Regression coverage

Six foundation cases verify stable identity across dates/time/status, reviewed rollover
with skipped/prior history, Skip/Not gonna do, Undo, no clock/startup mutations, quick
deck syntax and atomicity, manual states/progress, invalid/leap dates, restart/deletion
recovery, stale restore refusal, ordered causal replay and exact preservation of migrated
Calendar, Notebook/Sea, Reflection, raw archive and digest media bytes.

Seven composed browser cases per engine verify:

- Mobile task creation, deck syntax/flags, Voyage/manual Done, responsive widths, restart
  and desktop/mobile captures; task completion leaves logged minutes unchanged.
- Actual pointer day movement, editor/date movement, Calendar scheduling/unscheduling,
  stable ID, timed/untimed restart and original-date full Calendar navigation.
- Escape, pointer cancellation, lost capture, outside release and pre-hold movement with
  zero canonical writes; held touch-style input with a second pointer ignored.
- Leave planned without a write; explicit rollover preview, retained skipped/prior history,
  original-date Skip/Not gonna do and persistent recovery after restart.
- Must-do/Waiting on/Low energy/Voyage filters and keyboard editor cancellation.
- Injected quota failure retaining every draft field, no partial deck/task, one retry,
  delete/restart recovery and the shared Calendar editor lock.
- Midnight changes without rescheduling, leap-day creation and preservation of every
  unrelated fixture entity, Notebook drawings/Sea history and legacy `slb1` sentinel.

All prior Calendar/Notebook/Sea/Home/Reflection/foundation browser cases remain in the
full suite. New cases assert no application page errors. Touch-style events test gesture
logic under live capture; they do not prove physical touch or pen behavior.

## Evidence, fixes and limits

Ignored captures: `build/planner-desktop-chromium.png`, `build/planner-mobile-chromium.png`
and WebKit counterparts. Chromium desktop/mobile captures were inspected. Visual review
caught a board initialization scroll that could hide the toolbar; it now changes only
horizontal board scroll. Status has an explicit accessible label; recovery orders
equal-timestamp changes newest first.

The first sandboxed test service could not become ready; disposable localhost runs used
approved execution. Early test fixtures had an ambiguous slider label, an off-slot drop,
an invalid synthetic capture, an incorrect quota store name and broad recovery/header
selectors. They were corrected to actual controls, targets and live pointer capture.
A full run overlapped a source edit, causing Vite reload and two Calendar failures; it
was stopped and rerun against settled source. The final 68-check run passes.
No Calendar implementation was changed.

Physical Safari/phone/keyboard-inset/storage-pressure/OS-kill evidence, empirical media
budgets and existing release gates remain. Windows WebKit's native Blob limitations
remain unchanged. No dependency/lockfile/audit/CI policy changes or security audit.
Required check/android-proof/codeql and separate CodeQL results must pass on a published
PR's exact final head before merge. Phase 7+ and production synchronization remain later.
