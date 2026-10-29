# Phase 10 Android device rehearsal — NOT RUN

Use disposable synthetic logbooks and a test Dropbox App Folder registration. This is a
procedure, not evidence. Record APK SHA-256, certificate SHA-256, versionCode/name,
applicationId, device model, Android/API, WebView/browser and launcher versions for every run.
Preserve external backups before upgrade/recovery. Never clear the owner's profile to pass a test.

| Area                | Required device observation                                                                                                                                                                                                                   | Evidence status |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Install/upgrade     | Offline clean install; signed N→N+1 preserves all entities, blobs, pending operations, trash/recovery, settings; wrong signer/downgrade rejected without clearing data                                                                        | Not run         |
| Lifecycle           | Save/reopen, background/return, rotation/keyboard/insets, OS kill/reboot; durable data survives and replay verifies; unsaved draft limitation reported; native return never replaces an active draft                                          | Not run         |
| Links               | Both widgets cold/warm, multiple returns, invalid paths/query/fragment; Quick log opens existing editor without saving, Today shows local day; drafts defer and configured encryption requires unlock                                         | Not run         |
| OAuth               | Real external-browser consent with exact custom redirect; denial, expiry, duplicate/mismatched state, browser selection/competing handler, process death before/after return; no journal upload until reviewed sync                           | Not run         |
| Dropbox             | Complete Phase 9 two-device grant/expiry/offline/race/migration/recovery rehearsal with this APK and another client; pending operations and owner edits survive all failures                                                                  | Not run         |
| Trust               | Enroll after passphrase/recovery + device credential; reopen unlocked without forced biometric; locked device cannot unwrap; explicit Lock prompts again; cancel/failure retains recovery; Forget removes wrapper/alias                       | Not run         |
| Keystore variations | Android 12–14 PIN/strong/weak biometrics/work-profile behavior, Android 15+; remove/change device lock, key invalidation, restored/other-device wrapper and changed key policy fail safely                                                    | Not run         |
| Reminders           | Explicit grant/deny/revoke, disabled channel, edit time/off, logged day vs planned task, midnight/DST/timezone, reboot/app update, process kill, Doze/OEM delay, force-stop/reopen; no private journal text or duplicate daily alert          | Not run         |
| Widgets             | Add both to actual launcher, resize, no initial projection, cold/warm launch, offline canonical commit, recovery/import/sync, date/timezone/clock rollback, stale display and reboot; no independent writes                                   | Not run         |
| Privacy             | Text hidden initially; enable only on that device; sync/import cannot enable; Lock suppresses and Forget/erasure clears text/policy; no secrets in intents/logcat/saved-instance/OS backup/device transfer                                    | Not run         |
| Backup              | Real local and cloud document providers; plaintext/encrypted/recovery/forensic exports, cancel/full storage/provider failure/read-back mismatch; original kits unlock old backups; Merge/Replace preview/recovery preserves all records/media | Not run         |
| Erasure             | Local/everywhere failure/resume and verified completion clear native trust/projection/reminders/PKCE; old handles stay fenced; no claims of wiping other devices/provider history                                                             | Not run         |
| Resources           | Representative multi-year/large-media data, Android 12 baseline, 4 GB and lower RAM graceful limits, cold start, keyboard/touch and Argon2 latency; do not infer budgets from desktop tests                                                   | Not run         |

Protected signing setup: maintainer creates `android-signing` with required reviewer(s) and
protected-branch deployment policy, verified through the environment API by CI. The sole
maintainer may be the reviewer; no extra main-branch reviewer rule is introduced. Install
signing material only in environment secrets: ANDROID_KEYSTORE_BASE64, ANDROID_STORE_PASSWORD,
ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD. Set public environment variable ANDROID_CERT_SHA256
to the expected lowercase hexadecimal certificate digest without colons. Keep the keystore
and recovery custody offline; never paste either into chat or source. Verify increasing
version codes against the prior signed artifact. Dispatch from main only after reviewed
source/checks. This produces a review artifact; it does not authorize publishing a release.

Hosted isolated emulator instrumentation is useful additional native evidence but cannot
replace this actual-device matrix. For local native builds use JDK21 + Android SDK36,
`npm ci`, `npm run verify:foundation`, `npm run sync:android`, then app-scoped Gradle debug /
instrumentation tasks. Instrumentation requires a secure, unlocked disposable emulator;
CI sets a synthetic PIN only in its fresh isolated emulator. Never run that PIN setup on
an owner's physical device. No attached-device test is implicitly authorized to erase data.
