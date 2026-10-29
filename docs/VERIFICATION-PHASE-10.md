# Phase 10 verification — 29 October 2026

Base: fetched/current `main == origin/main` at merged PR #19,
`0ec4f8c9e56e7f3c3fb20575d2a9fcb790a7bbbc`, including `ade5f36`, zero ahead/behind.
Owner accepts Phase 9 implementation; remaining release gates are carried forward.
All data used here is synthetic/disposable. No live Dropbox grant, personal-data migration,
signing credential, release publication, deployment or Phase 11 work occurred.

## Local automated evidence

- `npm run verify:foundation`: typecheck, package boundaries, **125 foundation tests**
  (zero failures/skips) and production build pass. Log: `build/phase10-foundation-final2.log`.
  Three added cases cover strict native OAuth URLs/duplicate parameters, authenticated
  key handoff/zeroing/nonextractable imports and native PKCE callback/state/time checks.
- Final complete Chromium/WebKit regression: **138/138 pass**, zero failure/skip/flaky,
  `build/phase10-browser-complete.log`, `build/browser-phase10-complete.json`.
  Browser adapter cases explicitly use fake native ports. They prove UI wiring/draft fences,
  fast callback queuing, unlock routing, backup cancellation and native-erasure failure
  handling; they are **not** Android/device evidence.
- Final production offline/update Chromium/WebKit: **2/2 pass**, no failure/skip
  (`build/phase10-pwa-complete.log`, `build/pwa-results.json`). The fixture restores the
  production artifact after update simulation; final cache/hashes below remain unchanged.
- Unchanged demo: **85/85** pass, zero skip/failure (`build/phase10-demo.log`).
- Formatting, expanded narrow secret-pattern scan (including Kotlin/Java/Gradle/XML),
  whitespace checks and all **37 frozen demo hashes** pass. The scan is not an audit.
- `npm run sync:android` passes (`build/phase10-cap-sync-final2.log`).
- JDK21 / SDK36 / app-scoped Gradle `:app:assembleDebug :app:assembleDebugAndroidTest`
  pass (`build/phase10-android-verified.log`). The six-case instrumentation APK compiles;
  **instrumentation was not run**. Tests cover projection privacy/persistence/monotonicity,
  strict immutable launch intents, Keystore wrapping/identity/explicit-lock/forget,
  disabled/logged reminders and the packaged bridge. CI provisions an isolated emulator's
  secure lock only; a physical device is never assigned a test PIN.
- The debug APK's 30 packaged public assets are byte-compared with the final web build.
  Packaged config verifies production app ID, bridge logging disabled and WebView debugging
  disabled. This is artifact inspection, not installed-app or process-death evidence.
- `:app:assembleRelease` without signing inputs intentionally fails with
  `Protected signing inputs required` (`build/phase10-release-guard.log`). No release APK
  or signing secrets were generated. Protected-environment server settings, real signer
  fingerprint, increasing version history and signed update continuity remain unverified.

## Failure history and limits

The initial sandboxed browser server could not be used by the test runner; the identified
leftover test server was stopped and isolated checks rerun outside that sandbox. An early
mock URL matcher accidentally replaced the shared OAuth parser; it was scoped to the app
module. WebKit then exposed a real fast-return race: callbacks arriving during Connect were
ignored. The implementation now queues and drains them; focused tests passed afterward.

A first full 136-case run was invalidated by editing shared frontend modules during its
execution: Vite reloads interrupted WebKit navigations (127 pass / 9 fail). It is not a pass.
The next stable-source full run passed 136/136. Final follow-ups isolate native service-worker
behavior and fence new sessions after native cleanup failure; final evidence below covers
those changes. No assertions were skipped or weakened to obtain a pass.

Production PWA run with all three configured projects: Chromium/WebKit **2 pass**, Firefox
fails before application launch with Windows `spawn UNKNOWN` (`build/phase10-pwa.log`). This
is not a Firefox application pass. The final supported-local-project rerun is recorded below.
Actual Firefox, real Safari and the broader browser/device matrix remain release gates.

ADB device listing is empty. No real-device or local-emulator execution, launcher placement,
secure-credential prompt, native document-provider interaction, OS-kill/reboot/Doze or signed
install/update result is claimed. Six compiled instrumentation cases and fake-bridge browser
checks cannot substitute for [the device rehearsal](PHASE-10-DEVICE-REHEARSAL.md).
Hosted check/android-proof/CodeQL for this source are not run/published by this task.

Toolchain warnings remain: AGP understands SDK XML v3 while the new local CLI emits v4;
flatDir repositories, Gradle 9 deprecations and the deprecated platform confirm-credential
API are reported. Current JDK21/Gradle8 build succeeds; this is not an SDK migration or an
independent audit. Existing Phase 9 development CLI advisory and resource/security gates
remain carried forward, without claiming a new zero-vulnerability audit.

## Artifacts and owner edits

Final web cache: `slb-production-41c1db6afd0ea0bf`, 28 precached assets.
Index SHA-256 `b41da0d7a0350a2ddd1bed0dd49b520154bb07597b621a9a112cfded73a5e0ee`.
Worker SHA-256 `348bfc95a06ca159a2be231721f6e349f70ea53946b43312f88ec9cc25a46487`.

Local debug APK (not a production signed release):
`platforms/android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256
`6f1a3427fa721ba79642ffd7232a6e0b2efc6076aaa9ec87f333672cfa6a48be`.
Test APK SHA-256 `b40c6def15cb0c573a8eba4c4779364ecf7775b606cdee0cf2ad20325c6fa690`.
JDK/SDK/Gradle tooling remains ignored under `.local/android-tools`; no tooling archive,
APK, debug keystore or build output belongs in a source commit.

Owner README/DEPLOY edits remain excluded and byte-identical to the Phase 9 record:
README SHA-256 `cdf4694d0cbf3e53394ef3a4c7a4e6edfdd57d1af1b5feacf06f5a8d036265cb`;
DEPLOY SHA-256 `e242138dd63b994c439e3a64814d780781cd49433b350155eb39476aa8d6d844`.
No artifact is promoted. Phase 10 owner/native/signing acceptance remains pending.

## GitHub review publication — 29 October 2026

Implementation `c513b53` is published intact as [draft PR #20](https://github.com/byshriv/Sailor-LogBook/pull/20),
`codex/phase-10-android` → `main`. Main remains fetched/current at merged PR #19 `0ec4f8c`.
Documentation follows on the same branch; hosted checks must refer to the final pushed head.
No force push, merge, release publication, deployment, personal-data use or Phase 11 work.
Local verification above remains evidence for the unchanged implementation. Hosted CI and
CodeQL are pending until actually observed. Native instrumentation compilation is not an
executed-device pass; real-device and signed-upgrade/signing-environment gates remain open.
