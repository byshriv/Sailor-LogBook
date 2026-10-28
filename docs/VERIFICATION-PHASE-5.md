# Phase 5 verification

Acceptance follow-up, 28 October 2026: Phase 5 is accepted and complete by explicit
owner instruction. PR #14 merged as `5792285ded097bc16f5bf28b0f570e059d391831` at
17:23:08 IST; fetched local main equals origin/main (zero ahead/behind) and includes it.
GitHub's PR metadata records final hosted [run 40682341891](https://github.com/byshriv/Sailor-LogBook/actions/runs/40682341891)
on head `2bdbb16a8408f5af72ec7b2a935f98de110c209c`: check/android-proof/codeql and
separate CodeQL results pass with no new alerts, 81 Linux browser checks, 43 foundation
tests and three Android emulator cases. This supersedes the pending-publication copy
below. Phase 6 needs its own verification; physical-device release gates remain.

28 October 2026. Local Windows; Node 24.22.0/npm 11.19.1; pinned Playwright 1.64.1.
Only synthetic fixtures and disposable browser profiles were used.

| Check                                                    | Result                                                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm test`                                               | All 85 unchanged demo tests pass                                                                     |
| `npm run verify:foundation`                              | Typecheck, dependency boundaries, all 43 tests and production build pass                             |
| Chromium/WebKit full browser suite                       | All 54 checks pass, including 12 Home/Reflection, 16 Calendar and 12 Notebook/Sea checks             |
| Firefox, one attempt with `--max-failures=1 --workers=1` | Fails before application launch with `spawn UNKNOWN`; 26 checks not run; no application pass claimed |
| Syntax/manifests/assets, narrow secret scan              | Pass                                                                                                 |
| Frozen v8 reference                                      | All 37 hashes pass                                                                                   |
| Formatting / whitespace                                  | Checked before local review commits; see handoff                                                     |

Phase 5 is published in [draft PR #14](https://github.com/byshriv/Sailor-LogBook/pull/14).
Hosted checks are running; no completed hosted or physical-device result is claimed here.
Use the PR checks and description for final exact-head evidence.
Before merging a published PR, require check/android-proof/codeql on its exact final
head and inspect the separate CodeQL results check; an earlier phase/run is not evidence
for a later revision. No required check is waived. Phase 4 acceptance and final hosted
run 40645674923 are recorded in VERIFICATION-PHASE-4.md and are separate evidence.

## Regression coverage

Seven new foundation cases cover interval union, explicit DST offsets and renamed/inherited
exclusion, planned-versus-logged time, 805-day streaks, missing-today continuation, gap
recovery, backfills, month-spanning freezes, fifth-gap breaks, unfeatured/future moments,
all seven sticky achievement identities, unknown fields, independent layouts, mood zero/
clear, four-of-six selection, reflection Undo, quick Must-do/atomic deck creation, exact
migrated source/media retention, restart and ordered causal replay into a second store.

The older Phase 2 compaction test assumed two concurrent commits finished in invocation
order. Hashing precedes transaction acquisition, so that order is not guaranteed. The
test now orders returned operations by their actual causal sequence, acknowledges the
second first and still asserts compaction cannot skip the pending first operation.
No persistence implementation or causal rule changed.

Six composed browser cases per engine cover:

- Home totals/progress, inherited exclusions, mood zero, Must-do/history, overflow text,
  four-item selection, restart and the same moments in Notebook.
- Historical lessons/gratitude, searchable review, deletion/restart recovery, all seven
  original achievement cards, streak/achievement PNG previews and 1080×1350 PNG encoding.
- Independent Home/Reflection order and visibility, actual mouse reorder, active-pointer
  cancellation without a write, keyboard reorder, mobile width and desktop/mobile captures.
- Injected IndexedDB quota failure retaining text, no partial write, one successful retry,
  and the editor lock shared with Calendar.
- Original-date Notebook links, On this day, direct Sea navigation and unchanged drawing,
  mood/compatibility fields and legacy `slb1` sentinel.
- Mobile quick Must-do syntax/atomic deck, unchanged logged totals, backfilled mood clear,
  immediate Undo, manual task-status override and percentage/history retention.

New browser cases assert no application page errors. All earlier Calendar/Notebook/Sea/
Phase 2/foundation cases remain in the full run. Physical touch, mobile keyboard insets
and actual file-sharing targets still need owner review; resized headless engines do not
establish physical Android/iOS or Safari acceptance.

## Evidence and failure history

The successful full browser report was retained locally as ignored
`build/browser-phase5-chromium-webkit.json`. Firefox then failed before launch. A final
readable-status/autofill refinement passed typecheck and both focused Home browser cases;
the default report records this last follow-up. The final preview was rebuilt. Ignored captures include `build/reflection-desktop-chromium.png`,
`build/reflection-mobile-chromium.png`, `build/home-mobile-chromium.png` and WebKit
counterparts. Chromium captures were inspected for bento composition and mobile overflow.

The first sandboxed browser command could not establish its local test service and was
stopped; isolated localhost tests ran with approved execution. Early new-test failures
used an obsolete Sea heading and a synthetic pointer without a live capture. Tests were
corrected to the actual heading and real mouse input; the handle is scrolled into view
before operating it. The final 54-check run passes with no page errors.

Physical Safari/phone/storage-pressure/OS-kill tests, empirical media budgets and issues
#2/#3 remain release gates. Native Blob capability limits and inherited moderate development
tool audit findings from Phase 4 are unchanged; no dependencies/lockfile or audit/CI policy
changed. No production sync, security audit, real-data cutover or deployment is claimed.

## Publication integrity

Publication used the connected GitHub Git-data tools without terminal credentials or a
main mutation. The three published full trees exactly match their local tested trees:

| Scope                             | Original local commit                    | Published commit                         | Identical tree                           |
| --------------------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Domain and durability regressions | eab86505f734a07d73ccf94846e8d384af3203b4 | 662a4692ab8d22b62d0de6e7dd50bd1214702c39 | 83e97aaf8404a176427cb8ca0949524c66c22b32 |
| UI and browser regressions        | 8cf9c782c673cd1d08cedf665a4b710a12a82c83 | 2bc655cb1b13b788eac42242d501a9e14abb6a30 | b1b5443f9047d407df8c2baf22196fbcda527b56 |
| Acceptance and handoff            | 675301fc79487d1858397db66aa5f61cf8603e6a | cbc4b32af340d6c65a1ac4b7d8c80454469f6375 | 10dc48463fb7426dadf3cb399d4718a2607dd063 |

Original local history remains on `codex/phase-5-home-reflection-local`. The active branch
tracks the published history. Concurrent owner planning edits in the shared workspace
were preserved and excluded from Phase 5 publication. No history rewrite, force push,
merge, required-check change or deployment occurred. This publication follow-up must
also pass every required job on its exact head; an earlier green run is not substituted.
