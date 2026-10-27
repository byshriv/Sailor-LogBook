# Phase 1 verification — 28 October 2026

No personal logbook, live Dropbox account or desktop browser profile was used.

| Check                                     | Result                                                                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Root demo syntax/manifests/offline assets | Pass                                                                                                                                          |
| Root demo regressions                     | 85 pass, zero fail/skip in the existing workspace                                                                                             |
| Foundation unit/contracts                 | 9 pass, zero fail/skip                                                                                                                        |
| Type/import/format/narrow secret checks   | Pass                                                                                                                                          |
| Frozen reference                          | All 37 SHA-256 hashes pass, including after an actual Git clone                                                                               |
| Fresh Git clone                           | npm ci installs 168 packages; audit summary zero vulnerabilities; type check and production build pass                                        |
| License inventory                         | 238 lockfile entries, zero missing license metadata; includes optional platforms, not a legal audit                                           |
| Windows headless                          | Chromium/WebKit: 8 pass; Firefox: four launch failures (spawn UNKNOWN), not application failures or claimed passes                            |
| Clean Linux hosted browser tests          | 12 pass across Chromium/Firefox/WebKit; save/reopen, single editor/recovery, real IDB abort/draft retry, mobile width/keyboard, Argon2id WASM |
| Android 12/API31 hosted emulator          | Two instrumentation tests passed; application and test APKs build                                                                             |
| Source scanning                           | Scoped JavaScript/TypeScript foundation CodeQL job succeeds; not an independent audit                                                         |
| Public host                               | HTTPS HEAD returned 200, Cloudflare server; no deployment/account/staging verification                                                        |
| Private vulnerability reporting           | Public read-only API reports enabled                                                                                                          |
| Main ruleset                              | Last observed disabled, without required statuses; owner setup remains a closure gate                                                         |

## Hosted evidence

[Run 40564791258](https://github.com/byshriv/Sailor-LogBook/actions/runs/40564791258) passed
check, android-proof and codeql for PR head 8979ac6695126e303d50e78d710cd8d160ed82b8.
GitHub tested the PR merge snapshot d0a591d2178e6298e692d3b46fb11bb9465a87c6.
Final source revisions must preserve passing checks; consult PR #1 for the latest run.

- Foundation artifact ID 12763080869, archive digest sha256:bd3306da9421ccd32a18cbd35a6746b1acd0e825a2645cb4b2e1e10f8aad57ae.
- Android proof artifact ID 12762507213, archive digest sha256:0f61b791c85410e085e5f81a1942e3fda63c681e5018e8a742cd89ee5347b5b8.
- These artifacts have seven-day CI retention. The APK uses a disposable proof ID/debug
  signing, is not a 1.0 release, and must not receive personal data or be treated as upgrade proof.

The native log reports Starting 2 tests / Finished 2 tests on emulator-5554 - 12 and BUILD
SUCCESSFUL. Tests cover atomic projection persistence, default-hidden text, unknown-field
stripping, stale revisions, invalid input, visibility changes/clear, strict actions and
immutable PendingIntents. They do not place/visually accept widgets on a real launcher or
verify Keystore/reboot/OS process-death behavior. Those remain Phase 10 gates.

A third instrumentation case was added after that baseline: it launches the packaged
WebView and calls getLaunchAction/publish across the JavaScript-to-Kotlin bridge. Its result
belongs to the final PR revision, not the earlier two-test run above.

Windows synthetic Argon2id candidate observations: Chromium 106 ms, WebKit 105 ms, under
that run's load. Memory parameter 19,456 KiB, two iterations, one lane. These are observations,
not a mobile performance budget or independent cryptographic review.

## Failure history and limits

The original in-app browser timed out, and the user stopped native Computer Use. This
continuation respected their no-PC-control instruction and used headless disposable profiles.
A sandbox blocked localhost sockets; the authorized isolated test command ran outside it.

The first broad Android Gradle task also assembled upstream modules' instrumented suites,
failing their duplicate Kotlin dependency graph even though our app/test APKs compiled.
CI was corrected to app-scoped tasks; the emulator run then passed. The CLI was pinned to
compatible 8.4.3 to remove its unused iOS xcode/uuid advisory chain; core/android stay 8.5.3.

Clean environments omit ignored .local/v1.html: the demo suite has 84 passes plus one expected
legacy-reference skip there. No migration, full causal merge/checkpoint compaction, production
encrypted format/recovery rotation, physical Safari or release-signed native validation is claimed.
