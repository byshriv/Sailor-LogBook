# Phase 6 verification

Acceptance follow-up — 28 October 2026: Phase 6 Tasks/Planner is accepted and complete by explicit owner instruction on
28 October 2026. Fetched local `main == origin/main`, zero ahead/behind, at
`9debb35a6dc0ac8f3b0bbc72d8781e7e36f4b395`, the merge of PR #15 (final head `77ecb628`).
Phase 7 management/experience only is authorized. Phase 8 and later ports remain gated.

The review-era report below is historical; current work is [Phase 7](PHASE-7-STATUS.md).

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

## Publication integrity

Review: [draft PR #15](https://github.com/byshriv/Sailor-LogBook/pull/15). Publication
used connected GitHub Git-data tools; no terminal credentials, main push, force push or
history rewrite. Original local history is retained on `codex/phase-6-planner-local`.
Each complete published tree was checked against its tested local counterpart:

| Scope                  | Local commit | Published commit                         | Identical tree                           |
| ---------------------- | ------------ | ---------------------------------------- | ---------------------------------------- |
| Domain/durability      | 26b94fd      | 7230a5f4d4cf5997c2707657fb6dbfe07a81e901 | ce780bc6b37325fc1a84c22cd815511eb622f84a |
| UI/browser regressions | f61bcf1      | 6cfb4dbe26b9d5d59fa97a0b877902a47d1fc98e | ef0ab571e7ebb7863d9e09a56170f4cf1254ceb1 |
| Acceptance/handoff     | 3d11602      | 01c819fb8decc35c1d20161fac8df7b8c74e98be | cc8395bd3883385bd6e049653c542c006862bd83 |

README/DEPLOY owner edits are preserved and excluded from publication. This publication
follow-up also requires every check on its final head. Use current PR checks/description
for exact final head/run/artifact evidence; earlier green runs do not substitute for it.
CI does not accept Phase 6 visuals or authorize merge, deployment or Phase 7+.

Hosted follow-up: run 40693819420 on head `956b756` passed Android and CodeQL,
including separate CodeQL results with no new alerts, but two Firefox gesture fixtures
failed because they assumed pointer ID 1. The other 100 browser checks passed. Fixtures
now capture the actual browser-assigned pointer ID before simulating touch-style input;
no application code or test coverage is bypassed. The corrected final head requires a
fresh full run; consult PR #15 checks/description for its result.
