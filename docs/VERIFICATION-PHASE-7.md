# Phase 7 verification

28 October 2026. Local Windows, Node 24.22.0/npm 11.19.1 and Playwright 1.64.1.
Synthetic fixtures and disposable browser profiles only; no real journal, backup,
Dropbox account or owner browser profile was used.

## Baseline and scope

Fetched origin before implementation and again before final review. Local
`main == origin/main`, zero ahead/behind, at
`9debb35a6dc0ac8f3b0bbc72d8781e7e36f4b395`, containing merged PR #15 and its final
head `77ecb628639c18517320d0f23bb265a05c14d235`. The merge records 28 October,
19:32:03 IST. The owner explicitly accepts Phase 6 as complete and authorizes Phase 7
only. Prior hosted Phase 6 evidence is separate from Phase 7 validation.

README.md and DEPLOY.md retain their exact pre-existing owner diffs and are excluded
from the Phase 7 commits. The root v8 demo and all frozen reference files are untouched.
No dependency/lockfile/CI-policy change, new schema/command, transport, service worker,
production deployment, real-data migration or Phase 8+ implementation.

## Checks

| Check                              | Result                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Unchanged demo suite, `npm test`   | All 85 pass                                                            |
| `npm run verify:foundation`        | Typecheck, boundaries, all 57 tests and preview build pass             |
| Full Chromium/WebKit suite         | 89 pass, one explicit Windows WebKit profile-Blob skip                 |
| Firefox                            | Windows launch fails with spawn UNKNOWN; 44 cases not run; no app pass |
| Syntax/manifests/offline assets    | Pass                                                                   |
| Frozen v8 reference                | All 37 hashes pass                                                     |
| Narrow credential/private-key scan | Pass; not a security audit                                             |
| Formatting/whitespace              | Checked before review commits                                          |

## Regression coverage

Eight foundation cases cover:

- Cycles/fourth levels, including whole-subtree reparenting, without source mutation.
- Atomic deck reassignment, descendant aggregation without duplicates, no content deletion,
  compound Undo and original relationships.
- Targeted settings/profile overlays, migrated Calendar preferences, opaque payloads,
  unrelated layout fields and invalid settings rejection.
- Duration-free presets, identity/compatibility retention, reversible deletion and no logged time.
- Read-only entry/task/date/deck/Notebook/Reflection search.
- Reminder suppression by actual logs, daily receipts, local dates, plan/log distinction and opt-out.
- Atomic profile media/reference/name, missing-blob rollback, restart, causal replay, Undo,
  retained bytes and no raster bytes in operation payloads.
- Management edits after migration retaining the exact archive, editable drawings, sent/seen
  Sea state, original settings and all media bytes.

Twelve composed browser cases per engine cover persisted profile/preferences and Calendar
defaults; hierarchy/cycle/reassignment/ancestor records and restart recovery; zero-duration
preset selection/Done/deletion/Undo; search across all five review surfaces and original-date
editor links; typing guards and blocked navigation; safe keyboard practice/full reference,
completion flags and actual create/focus/duplicate/confirmed-delete/Undo commands; injected
quota failure with retained profile and one successful retry; shared editor lock; cancellable
atomic onboarding, full normal walkthrough, no automatic replay and 390px/1440px captures;
logged-day reminder suppression and once-only receipts; default verified WebP plus exact
opt-in original bytes/reopen/removal/Undo; explicit modal Tab wrap, Escape/focus return,
denied storage/notification APIs and Settings/deck search; and Planner 12/24-hour labels with
native time-input values retained. The final additional case verifies empty-store
create/help/guide routes do not stack first-run setup.

The profile-photo case explicitly skips the known Windows WebKit native Blob limitation;
Chromium proves default WebP MIME and exact original bytes. Existing Calendar photo coverage
also verifies honest storage failure with retained drafts. This is not real Safari proof.
All prior Calendar, Notebook/Sea, Home/Reflection, Planner and foundation browser tests
remain in the full run. New cases assert no application page errors.

## Findings corrected during verification

- Initial new test locators used generic Title instead of existing Activity/Task title labels,
  and did not scope Next to the walkthrough; these fixtures now use actual controls.
- A copied PNG fixture could not decode; the photo case now creates a valid synthetic
  canvas PNG and compares its original bytes exactly.
- Reminder text included a Dismiss control. The receipt was saved and notification shown;
  a dedicated text span makes its message independently inspectable. The virtual clock
  waits for mounting and uses the scheduled minute explicitly.
- Fixed shared controls overlapped Notebook Send and mobile content. Shared controls now
  occupy normal workspace/header layout; no fixed tools cover accepted-screen actions.
- Native dialog traversal could reach browser chrome. Explicit Tab wrapping contains focus;
  WebKit pointer-origin tracking and post-commit focus restoration return it to the opener.
- Calendar's synthetic resize could enter the separately tested edge-scroll zone and add
  scroll minutes. The resize fixture centers the handle before its 30-minute movement;
  Calendar gesture code is unchanged.
- Planner's old generic first-details selector opened the new deck dropdown. It now names
  the unresolved-task disclosure, retaining all rollover/history assertions.
- Final completeness review wired the saved time format to Planner display labels and
  persisted keyboard-practice completion/offer flags. Native time inputs stay unchanged.

The full passing report is retained at ignored `build/browser-phase7-chromium-webkit.json`.
A final Settings-only route-initialization follow-up runs separately after the full suite;
it passes 23 cases with one explicit Windows WebKit profile-Blob skip, saved at
`build/browser-phase7-settings-followup.json`. Earlier-screen composition and domain/media code
are unchanged by that follow-up.

The Settings-only follow-up fixes initial welcome stacking on explicit create/help/guide
routes in an empty store. Ordinary empty-store welcome and atomic onboarding remain covered.

## Evidence and limits

Ignored captures include `build/settings-desktop-chromium.png`,
`build/settings-mobile-chromium.png` and WebKit counterparts. Chromium desktop/mobile
captures were visually inspected, including original icons, readable cards, no horizontal
overflow and the retained mobile navigation. Full-suite captures also cover earlier screens.

Physical phone/Safari, keyboard insets, real touch/pen, OS-kill/storage-pressure, empirical
media budgets, independent accessibility/security review and existing issues #2/#3 remain
release gates. Permission/API mocks do not establish actual OS notification/haptic delivery.
Open-tab reminders do not prove background/closed-app scheduling. Synthetic causal replay
is not production sync. No hosted Phase 7, native/emulator or physical-device pass is claimed.
Before a later published PR merges, require check/android-proof/codeql and separate CodeQL
results on its exact final head; no earlier phase's run substitutes for that evidence.
