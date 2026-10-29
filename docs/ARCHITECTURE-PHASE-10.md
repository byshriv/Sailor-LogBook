# Phase 10 architecture — Android production adapters

29 October 2026. Owner accepts Phase 9 implementation. Base is fetched/current
`main == origin/main`, zero ahead/behind at `0ec4f8c9e56e7f3c3fb20575d2a9fcb790a7bbbc`,
merged PR #19, including `ade5f36`. Only Phase 10 is authorized.

## Host, data and lifecycle

Production application ID is `work.shriv.sailorlogbook`, installed name Logbook.
Debug uses `.debug` and a debug certificate; the old `.proof` installation is separate.
Do not uninstall/clear any installation to make an upgrade pass. Transfer from proof,
browser or demo through verified external backups and existing Merge/Replace review;
there is no silent cross-sandbox migration. Release signer/version continuity must be
established before the first signed APK. Version code comes from protected CI, greater
than 1; current review version is 0.1.0-phase10, not a published 1.0 release.

Packaged local web assets open the integrated production Settings surface, including
all existing routes. No dev server, remote code origin, cleartext traffic or native
service worker. Earlier explicit phase routes remain for regression. `slb-phase2`,
its Web Lock, verified replay, durable operations, media and Phase 9 recovery/sync are
unchanged. No new canonical storage/schema or independent widget writer.

Cold/warm native links and return-to-foreground are delivered through LogbookNative.
Only exact Quick log / Today actions and `sailorlogbook://oauth/dropbox` are accepted.
The shared screen tools defer native actions while a draft, modal, tour, erasure or
save is active, rechecking after asynchronous policy/unlock reads. Quick log opens
the existing Calendar editor; it never commits a record. Configured encryption
requires trusted-key restore or passphrase/recovery unlock before widget navigation.
Explicit Back also waits for safe navigation. Foreground refresh rebuilds derived
projections; it never reloads the WebView or uploads automatically. Uncommitted drafts
remain in memory: OS process death before Save cannot guarantee their survival.

## OAuth and secrets

External browser PKCE uses the existing real Dropbox port and single-use callback
exchange. Register the exact public-client redirect `sailorlogbook://oauth/dropbox`
in the owner's App Folder app, with Phase 9 scopes. The web callback is unchanged.
A temporary PKCE request lives in app-private no-backup storage to survive WebView
restart; code/state is consumed once, with exact URL, duplicate-parameter, state and
ten-minute expiry checks. Future timestamps are rejected. No client secret or native
refresh-token persistence. Cancellation, intercepted custom-scheme callbacks, process
death or missing/expired request requires reconnect; it never establishes Synced.
Custom schemes are not verified HTTPS Android App Links. PKCE protects code exchange;
real registration, browser return and competing-handler rehearsal remain gates.

Capacitor logging is disabled even in debug: its normal debug bridge logs method options.
The native plugin disables saved-instance-state serialization of calls, which otherwise
could persist raw key/backup options. Process death during credential confirmation or
document export requires retry. Bridge strings cannot be reliably zeroed; key bytes are
zeroed after handoff and WebCrypto imports remain nonextractable. No telemetry is added.

## Trusted unlock

Opt-in trust is offered when unlocking the current encryption policy, never an old
independent backup. A fresh platform AES-256-GCM Keystore key wraps the authenticated
32-byte content master. The wrapper uses fresh IVs and AAD binding to SHA-256 of the
complete canonical wrapper setup. It resides only in noBackupFilesDir. No passphrase,
recovery secret or provider token is saved. The native enrollment confirms device
credentials and requires a secure, currently unlocked device. Normal restore needs
that OS unlock boundary without prompting every open. Explicit Lock persists a flag
requiring a new device-credential confirmation; Forget deletes alias and wrapper.
Policy/key replacement invalidates the old binding. Keystore loss, authentication
cancellation, tampering or secure-lock removal falls back to passphrase/recovery.
This protects cloud-content keys; canonical IndexedDB remains plaintext.

`setUnlockedDeviceRequired(true)` has documented Android 12–14 issues, including key
loss on screen-lock removal and some biometric reauthorization failures. Do not weaken
the boundary on those devices; report unavailable trust and retain independent recovery.
No hardware-backed/StrongBox attestation or independent security audit is claimed.
[Android API contract](<https://developer.android.com/reference/android/security/keystore/KeyGenParameterSpec.Builder#setUnlockedDeviceRequired(boolean)>).

## Reminders, widgets and backup

Native AlarmManager schedules one inexact local-time daily reminder; no exact-alarm
permission or network/background sync. Permission is requested explicitly. Reconfigure
on saved preferences/foreground/date/timezone/reboot/package replacement; disabled or
denied notifications cancel the pending alarm. Native receipt prevents repeated daily
notifications. Skip a day with any saved local activity segment, using a minimal dated
projection; plans are not logs. Generic private notification content contains no journal
text. Doze/OEM delays, force-stop and revoked/channel permissions remain real-device gates.
[Android idle behavior](https://developer.android.com/training/monitoring-device-state/doze-standby).

The two Kotlin RemoteViews widgets use explicit immutable intents. Today gets canonical
union minutes, up to four featured moments and a date/time stamp after durable projection
publication, recovery and foreground. Native revisions are monotonic independently of wall
clock. Unknown fields are stripped; metrics/text are app-private and disposable. No saved
projection shows Open Logbook; old dates show last-updated state. Text defaults off in a
native per-device preference, cannot be enabled by import/sync, and is suppressed by Lock.
Forget/erasure resets visibility. Projection failure reports separately from Saved.

All existing normal/encrypted/recovery/forensic exports await ACTION_CREATE_DOCUMENT on
Android; cancellation/storage failures report failure. Import uses WebView's system file
chooser and the same bounded parsing, digest/decryption, preview and recovery transactions.
No broad filesystem permission. OS backup and device transfer explicitly exclude app data;
Keystore wrappers, widget projections and pending PKCE also use no-backup storage. Native
artifacts do not replace external verified backups. Whole-file 64/96 MiB limits and memory
costs remain Phase 9 limitations, not tested mobile budgets.
[Capacitor activity callbacks](https://capacitorjs.com/docs/plugins/android).

## Signed review CI

`android-signed.yml` is manual, main-only, contents/actions-read, uses pinned actions, and requires
`android-signing`. It fails closed unless the environment API confirms required reviewers
and protected-branch deployment policy. The environment and secrets
must be configured/verified by the maintainer; YAML alone does not prove protection exists.
Ordinary PR CI remains unsigned debug compilation and isolated emulator instrumentation.

Keystore material is decoded only into RUNNER_TEMP, removed by trap, and passwords are
step-scoped protected secrets. Gradle refuses release tasks without signing inputs.
Verify apksigner and the maintainer's expected public certificate SHA-256 before emitting
APK/checksum review artifacts. Monotonic version-code history and actual upgrade tests are
required; syntax validation alone cannot prove update continuity. No GitHub Release creation,
deploy, publication, signing secret or privileged PR follow-up is included.

The environment preflight uses read-only Actions permission per the [GitHub environment API](https://docs.github.com/en/rest/deployments/environments#get-an-environment).
