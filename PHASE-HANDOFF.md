# Phase handoff — Phase 10 Android

29 October 2026. Phase 9 implementation is accepted by explicit owner instruction.
Only Phase 10 was started. Implementation is on `codex/phase-10-android`; owner/native
acceptance remains pending. No Phase 11, deployment or release publication.

## Baseline and preservation

Read PHASE-HANDOFF, LAUNCH-DECISIONS, LAUNCH-PLAN, ROADMAP, PRODUCT-SPEC, relevant Phase 7–9
architecture/verification and Android ADR 0004 before implementation. Fetched origin,
fast-forwarded main and verified `main == origin/main`, zero ahead/behind, at
`0ec4f8c9e56e7f3c3fb20575d2a9fcb790a7bbbc`, merged PR #19 including `ade5f36`.
The historical handoff is now [docs/PHASE-9-HANDOFF.md](docs/PHASE-9-HANDOFF.md).

Canonical `slb-phase2`, schema 2, Web Lock, durable operations, verified replay, media,
Phase 9 CAS/read-back/sync/recovery and all accepted screens remain authoritative.
No real logbook/account was accessed. All 37 frozen demo hashes pass. README/DEPLOY
owner edits are byte-identical to their Phase 9 hashes and excluded from source work.

## Review map

- `capacitor.config.json`, Android app/manifest/resources: production application ID
  `work.shriv.sailorlogbook`, Logbook installed name, isolated `.debug`, packaged production
  entry, original artwork at Android install sizes, no native worker/debug bridge logging.
- `LogbookNativePlugin.kt`, `TrustedKeyStore.kt`, `NativeReminders.kt`: strict cold/warm
  links and OAuth, foreground/Back events, OS document export/read-back, Keystore trust,
  generic inexact reminders and explicit permissions. No saved activity-call payloads.
- `native-production.ts`, shared projection/tools, existing Settings/Sync/Data/Recovery:
  canonical observers, draft/modal/save guards, configured-key widget unlock, native
  backup integration and trust UI, no independent native logbook or background upload.
- Kotlin WidgetProjection/ProjectionStore/providers: canonical monotonic disposable
  projection, Quick log / Today, per-device text off, privacy Lock/Forget/erasure clearing.
- `android-signed.yml`: manual main-only protected-environment review APK/checksum,
  required reviewer/protected-branch verification, step-scoped signing secrets and signer
  fingerprint check. Normal PR CI has no signing credentials. No Release publishing job.

Details: [architecture](docs/ARCHITECTURE-PHASE-10.md),
[status](docs/PHASE-10-STATUS.md), [verification](docs/VERIFICATION-PHASE-10.md).

## Verification and artifacts

125 foundation and 85 unchanged demo cases pass. Final full Chromium/WebKit regression
is **138/138**, no failures/skips/flaky; fake native ports are labelled adapter tests.
Final production PWA Chromium/WebKit checks pass **2/2**. Formatting, expanded narrow
secret scan, whitespace and frozen hashes pass. Native debug app + six-case instrumentation
APK compile; instrumentation/device execution is **not run**. ADB lists no attached devices.
Release assembly without signing inputs intentionally fails closed. No signing secrets
were supplied/generated/committed, and no signed production APK or hosted CI pass is claimed.

Local debug review APK: `platforms/android/app/build/outputs/apk/debug/app-debug.apk`.
SHA-256 `6f1a3427fa721ba79642ffd7232a6e0b2efc6076aaa9ec87f333672cfa6a48be`.
This uses the local debug certificate and cannot establish production signed upgrade
continuity. Final web cache `slb-production-41c1db6afd0ea0bf`. Exact hashes/logs, initial
failed/invalidated runs and final reports are in verification; nothing was promoted.

The local JDK/SDK/Gradle toolchain is ignored under `.local/android-tools`. Normal
contributors use JDK21/SDK36, `npm ci`, foundation build, Capacitor sync and app-scoped
Gradle tasks. Avoid full upstream-module instrumentation. Native instrumentation requires
a secure, unlocked disposable emulator; never apply its CI test PIN to a personal device.

## Open release gates and next Phase 10 work

Run and record [the real-device rehearsal](docs/PHASE-10-DEVICE-REHEARSAL.md): signed clean
install/upgrade, launcher widgets, offline/OS-kill/reboot, real OAuth, secure-lock/biometrics,
permission revoke/Doze/daily reminders, document-provider backup/recovery and erasure cleanup.
Configure and independently verify `android-signing` protection/secrets/public fingerprint,
then run the reviewed workflow; never provide secrets in chat. No protection configuration
or signed artifact is inferred from YAML or a missing-input rejection.

Phase 9 live two-device App Folder/scopes/CORS/expiry/offline/races/migration rehearsal,
physical Android/Safari/resource budgets, actual Firefox/Safari/browser matrix, independent
security review and existing issues #2/#3 remain open. Windows Firefox still fails before
launch with spawn UNKNOWN. Browser fake bridges and compiled instrumentation are not device
evidence. Android 12–14 Keystore quirks require real testing; recovery remains independent.

Local IndexedDB remains plaintext. Older plaintext backups/provider history and other
profiles/offline devices remain. Whole-file 64/96 MiB transfer/memory budgets are provisional.
Tokens/keys remain session-only across full navigation/restart; reconnect/unlock in Settings.
No closed-app Dropbox sync, remote wipe, malicious-provider-writer protection or guaranteed
unsaved-draft survival after OS kill. Native reminders are inexact and OS/OEM constrained.
Earlier phase acceptance does not waive final Phase 13 owner review. Continue Phase 10
validation/review only; do not start Phase 11, publish or deploy.
## GitHub review publication — 29 October 2026

Published for owner-authorized review as [draft PR #20](https://github.com/byshriv/Sailor-LogBook/pull/20),
`codex/phase-10-android` → `main`. Implementation commit `c513b53` was pushed intact;
there was no snapshot rewrite, force push, merge, release publication or deployment.
Final fetch confirms `main == origin/main` at `0ec4f8c`, zero ahead/behind.
README/DEPLOY owner hashes remain unchanged and excluded. This publication supersedes
prior local-only/hosted-not-published statements; hosted CI/CodeQL is pending until
actually returned for the final pushed head. Physical-device, live Dropbox, protected
signing setup and all carried release gates remain open. Continue Phase 10 only.
