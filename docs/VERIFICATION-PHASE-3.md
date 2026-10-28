# Phase 3 publication and hosted verification

Accepted Phase 3 follow-up — 28 October 2026: the owner explicitly requested Phase 4 and instructed that Phase 3 be recorded as accepted and complete. GitHub confirms PR #12 merged at `327ad8dfac702377e7b77b9c63226cf34af29cff` on 28 October 2026 at 11:32 IST. Fetched local `main` equals `origin/main` at that SHA (zero ahead/behind), and contains PR #12. Final head `86cd491a80f64f895996c3e0ba09f36f1c1088c4` passed check/android-proof/codeql in [run 40640483228](https://github.com/byshriv/Sailor-LogBook/actions/runs/40640483228), including 45 hosted browser checks and 32 foundation tests. Physical-device and later release gates remain unchanged. The review-era report below is historical. Current Phase 4 work is in [Phase 4 status](PHASE-4-STATUS.md).

28 October 2026. Review: [PR #12](https://github.com/byshriv/Sailor-LogBook/pull/12),
branch `codex/phase-3-calendar`, based on main `7107798b96137a87328204d0db5576a80ecdc5ad`.
Owner Calendar acceptance remains separate. No later-phase port, merge, deployment,
real-data cutover, cloud mutation or change to required checks is included.

## Publication integrity

The GitHub main endpoint still matched the Phase 2 merge before publication. No existing
open PR used this branch. Terminal Git push was unavailable because no terminal GitHub
credential was configured. Publication used the connected GitHub Git-data tools instead;
no token, personal backup or credential was read or copied.

Two review commits preserve the domain/storage and UI/test/document split:

| Scope                                     | Original local commit                    | Published commit                         | Identical tree                           |
| ----------------------------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Calendar domain and durable media gateway | bca4e5d9252fb816f2efd47f945baaa510cbe290 | 0edf4ba2bcdd8e000f98cb1110cc1a5ca108d0ed | e7976e4c140777d3a202aad1c5e5677b14c28c24 |
| Calendar UI, regressions and handoff      | 217cc2f                                  | 85084024252972db798e5a89a9cbdd6fe253f959 | 43cbbee093781992773acf6d0096ae8c5714af0e |

GitHub recreated commit metadata, so commit IDs differ; both complete file trees were
checked for equality before creating the review branch. The original local branch was
preserved as `codex/phase-3-calendar-local`. The workspace then fetched and tracked the
published branch with a clean working tree. No reset, history rewrite or force push was
used. This follow-up records publication without changing the product implementation.

## Required hosted evidence

The existing workflow runs `check`, `android-proof` and `codeql` for this PR. The check job
runs a clean installation, formatting, secret-pattern scan, frozen hashes, legacy tests,
foundation tests/build, all Chromium/Firefox/WebKit browser cases and dependency audit.
Android builds the proof APKs and runs the existing Android 12 emulator instrumentation.
The APK retains its disposable proof identity; it is not a signed production release.

Use [current PR checks](https://github.com/byshriv/Sailor-LogBook/pull/12/checks) and the
PR description for the final head SHA, workflow run, merge snapshot and artifact links.
Every follow-up commit must pass the same required jobs. A passing earlier run is not
proof of a later head, and Phase 2 results are not Phase 3 evidence. No check is waived.
Artifacts retain the workflow's seven-day lifetime and runtime/font notices.

## Limits retained

Local Windows evidence is in PHASE-HANDOFF.md: 85 demo tests, 32 foundation tests,
30 Chromium/WebKit checks plus final Calendar reruns. Windows Firefox fails before launch
with `spawn UNKNOWN`; hosted Linux Firefox must provide its own application results.
The native Blob probe requires exact photo save/reopen/remove/Undo where supported and
safe draft retention where unsupported. Windows Playwright WebKit cannot store even a
standalone IndexedDB Blob. That limitation is not a claim about real Safari support.

Physical Safari/phone/keyboard/held-touch/OS-kill/storage-pressure tests, final empirical
media budgets, production cutover and issues #2/#3 remain release gates. Owner review of
Calendar interaction and visual preservation is still required. PR publication and hosted
CI do not accept the phase, authorize a merge, or begin Phase 4.
