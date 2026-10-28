# Phase 8 verification

28 October 2026, local Windows. Node 24.22.0, npm 11.19.1 and pinned Playwright 1.64.1.
Synthetic fixtures and disposable browser storage only; no real logbook/cloud data.

## Baseline and owner acceptance

Phase 7 accepted and complete by explicit owner instruction. `git fetch origin` at start
and finish verifies `main == origin/main` (zero ahead/behind) at PR #16 merge
`887fcdda9855e6fad62f5c05589110f8b25412aa`. Its final head
`e7b77bbfb11429ee48c48ed4a5b8dbebe89cc5af` is an ancestor. Phase 8 only implemented.

## Local checks

- `npm test`: all 85 unchanged demo tests pass.
- `npm run verify:foundation`: typecheck, dependency boundaries, 68 foundation tests and
  production build pass. Final browser-only bootstrap/native-proof exclusion also passes
  typecheck and build. No package dependency or lockfile change.
- Chromium/WebKit full suite: all 102 cases pass; zero skips. The full report is retained at ignored
  `build/browser-phase8-full-chromium-webkit.json`. A final content-comparison refinement
  passed all eight data-tool cases, with both local/imported values visible.
- `npm run test:pwa -- --project=chromium --project=webkit`: both production lifecycle
  cases pass on the final build. Complete shell/all-screen offline navigation, durable
  profile reopen, active draft, second-tab lock, waiting activation after all tabs close,
  failed required-asset install and subsequent offline reopen are exercised with real workers.
- Firefox: one bounded attempt fails before app launch with Windows `spawn UNKNOWN`;
  three remaining new data-tool cases do not run. No Firefox app result or PWA pass claimed.
- Syntax/manifests/assets, all 37 frozen hashes, narrow credential/private-key scan pass.
- Formatting and whitespace checked before final review commits; details below.

## Added regression coverage

Eleven foundation cases exercise exact backup state/retained original media/JSON drawings,
corruption/future-version rejection, read-only preview, merge, replace, pre-import snapshots,
reopen and Undo, explicit collisions/deletion choices, stale or mutated plans, injected
recovery-store quota rollback, legacy exclusion/opaque source retention, five-point policy
and explicit rescue after tail corruption. Browser tests use actual native IndexedDB.

Four data-tool cases per engine cover actual downloads/reopen, cancel, legacy Replace,
pre-import restore/restart, unsupported format, recovery-store quota failure with retained
preview and successful retry, narrow viewport, damaged startup/rescue, conflict choice and
profile draft disabling mutation. New data-tool cases assert no page errors. Existing
Calendar/Notebook/Sea/Home/Reflection/Planner/Settings/media cases remain in the full run.

The standalone production config uses a separate port/report/output directory, avoiding
artifact collisions with the dev suite. Worker/HTML fixtures are restored in finally.
Failure uses a deliberately unreachable localhost required resource, not Vite's SPA fallback
(which can return HTML with status 200 for a missing path). The fixture awaits activation
before starting a later failed upgrade and records cache contents before offline reopen.
CI now runs the production PWA suite after the existing complete browser suite/build.

## Findings and evidence limits

Initial fixture failures used a non-existent Name/close control, an ambiguous recovery label,
and navigated before WebKit's asynchronous save completed. Labels and waits now name actual
controls and commit completion. Added status regions require the Settings tests to target
the original direct main save status; save/reminder assertions remain unchanged.

The full run exposed a time-dependent existing ghost-resize fixture: at 23:10 its 60-minute
resize crosses midnight, placing the end handle on the next day outside that single-day view.
The fixture now fixes its clock at 10:00; linked-midnight coverage remains separate. Both
focused engine cases pass. Calendar product code/gesture behavior is unchanged.

One concurrent-load WebKit PWA run failed the final offline fetch. An isolated retry passed;
the final fixture additionally awaits full activation and records the actual cache before
asserting offline reopen. Both final engine runs pass. This history is retained rather than
claiming an unobserved universal browser/OS guarantee.

Mobile data-tools and desktop import-preview screenshots under ignored build/ were inspected.
This is resized headless browser evidence, not physical touch/keyboard/launcher acceptance.
Actual iOS Safari/PWA, Android installation, browser suspension/pressure/OS-kill and realistic
large-owner-data rehearsals remain pending. Native Blob limitations are exposed by the
existing media tests, with fields retained on failure. No storage fallback masks them.

No hosted Phase 8 CI, CodeQL, Android/emulator, independent audit or physical-device pass is
claimed. All required hosted checks and separate CodeQL results need the exact published
final head before a later merge; previous phase success is separate evidence. No deployment.

Final compatibility review also normalizes listed recovery IDs to their durable store keys
without rewriting old points. This preserves earlier `restore:ID` points whose stored value
used an unprefixed command ID. Foundation coverage creates that older representation and
verifies listing/rescue. Missing/corrupt media with a recomputed envelope checksum and corrupt
snapshot-media rescue rejection have dedicated regressions.

## Final artifact and follow-up

The final recovery-key compatibility change passes all 68 foundation cases, typecheck,
boundaries and build, all eight data-tool browser cases and both production PWA cases.
No earlier-screen product code changed after the full 102-case run. The focused follow-up
report is `build/browser-phase8-followup-chromium-webkit.json`; production report is
`build/pwa-results.json`. Local full-suite and focused results are separate evidence.

Final ignored build worker cache: `slb-production-ffe8e2dd6d2e0ae9` (28 precached assets).
The test fixtures restored the artifact before these SHA-256 values were recorded:

| File                                | SHA-256                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `build/foundation/index.html`       | `da232bbdc4b37df86d44d247d8db71207ce8080f23f58180aaefa2fbcb1c6e58` |
| `build/foundation/sw-production.js` | `2eaa5daa64a9c52cd202d603eeab05edbc6bfa61c26a8e36fc3701d5f4387c1a` |

Storage review commit `272fbf8`; PWA/UI/CI review commit `9625445`; documentation follows.
All commits are local. README/DEPLOY owner diffs are excluded and remain exactly intact.
No remote publication, merge, deployment, cloud authorization or native port occurred.
