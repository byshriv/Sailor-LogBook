# Phase 4 verification

28 October 2026. Local Windows; Node 24.22.0/npm 11.19.1 and pinned Playwright 1.64.1.
Only synthetic fixtures are used. Final results are recorded in PHASE-HANDOFF.md.

Final local results: all 85 demo tests, 36 foundation tests, typecheck/boundaries/build,
and all 42 Chromium/WebKit browser checks pass. Syntax/assets, narrow secret scan and all
37 frozen hashes pass. Firefox was attempted once with `--max-failures=1`: it fails before
launch with `spawn UNKNOWN`; 20 checks did not run. No Phase 4 hosted run is claimed.

## Regression coverage

Four added foundation cases cover lossless row/opaque-field edits, deck syntax and shared
best-thing identity; five-day eligibility, deduplication, ten-bottle cap, older-date weighting,
best/size/date filters and monthly rollover; exact migration/media bytes, durable text/drawing
restart/Undo, atomic missing-media failure and remote causal replay; and malformed-stroke
rendering without mutation of the canonical input.

Six added composed browser cases run under each configured engine. They cover in-place
Enter/blur writing and focus, quick syntax, append-only new rows, navigation/restart and
unchanged Calendar/settings/legacy data; drawing Undo/clear/recovery, send/Edit and responsive
captures; Sea filters/history/restart/date review and no redundant navigation; shared
Calendar moments and original-date links; injected quota failure with draft retention,
blocked navigation, one successful retry and the shared editor lock; and unfinished-pointer/
doodle cancellation plus persistent text recovery after reload.

The Notebook browser cases request reduced motion so floating bottles have stable action
targets. SVG pointer tests exercise mouse/cancellation mechanics; they are not physical
touch, stylus, OS-kill or Safari evidence. Review captures are ignored files under build/.
Existing Calendar/Phase 2/foundation browser tests remain in the full suite.

## Evidence boundaries

Hosted check/android-proof/codeql must pass on an eventual Phase 4 PR's exact head before
merge. No earlier phase's run is Phase 4 evidence, and no required check is waived.
The Phase 3 final hosted run 40640483228 passed 45 browser checks and all required jobs
before PR #12 merged. Phase 3 acceptance is recorded separately by explicit owner instruction.

Windows Firefox previously failed before browser launch with `spawn UNKNOWN`; any repeated
launcher failure is recorded as unavailable application evidence, not a passing Firefox
test or a Notebook defect. Actual Safari/phone/storage-pressure/media/OS-kill verification
remains pending. Vector drawing durability does not imply unsupported native Blob writes
work; existing photo capability/failure tests remain unchanged.

Synthetic two-store replay verifies text and editable drawing operations without local
recapture. It does not implement or certify the Phase 9 Dropbox transport, concurrent merge,
encryption or stale-device protocol. Phase 5 and later ports remain unstarted.
