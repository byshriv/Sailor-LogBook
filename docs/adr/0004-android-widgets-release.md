# ADR 0004: Android projection, links and release isolation

Accepted direction; native proof implemented on 28 October 2026. See current hosted
results in docs/VERIFICATION-PHASE-1.md. Physical-device acceptance remains Phase 10.

Capacitor core/android 8.5.3 is pinned. CLI 8.4.3 avoids the unused iOS xcode/uuid advisory
chain introduced by CLI 8.5.x and successfully synchronizes this host. Official v8 setup requires
Node 22+ and Android Studio 2025.2.1+. Product minimum remains Android 12/API 31 and 4 GB
recommended, independently of Capacitor's minimum. Native iOS remains later.

Use Kotlin AppWidgetProvider/RemoteViews for the two small required widgets. Expose a
Capacitor WidgetProjection plugin with publish/clear methods matching packages/platform.
After a canonical commit, write only schema/revision/date/minutes/bestCount/updatedAt and
opt-in short text to an app-private atomic projection file, then update widgets. Reject
older revisions. Never store notebook pages, tokens or keys in intents/preferences.
No network fetch or independently writable logbook in widgets. Catch projection failures
separately: a widget error must not change a successful canonical save into Unsaved.

No projection at startup means Open Logbook, never a fabricated zero. Date/revision mismatch
shows stale/last-updated status. Rebuild on next app foreground after process death, timezone
or date change. Lock/erase/forget-trust clears personal text and refreshes widgets. The
per-device text setting defaults off; migration/sync must not enable it. Metrics-only is
still user data and belongs in private app storage with appropriate backup exclusion.

Use explicit immutable PendingIntents targeting this app's activity. Route only
sailorlogbook://widget/quick-log and /today, reject arbitrary paths/query payloads. Quick
log waits for initialization/unlock and then opens the sheet; never logs content directly.
The TypeScript validator and Kotlin projection/plugin/providers/layouts are implemented.
The proof bridge handles cold/warm launch events, private text policy, atomic file writes,
revision rejection, explicit clear and date/timezone refresh. Instrumentation targets an
isolated Android 12 emulator. Full process-death/Keystore/device-unlock and real launcher
acceptance remain Phase 10; this scaffold never claims production widgets already exist.

Package local web assets in the APK. App ID/signing certificate/versionCode must be stable
before first signed release. Proof ID work.shriv.sailorlogbook.proof is disposable;
the production ID remains unassigned. Release keys stay with the
maintainer/protected CI secrets, never chat. No signing/deployment job in Phase 1 PR CI.

Production web release promotes a reviewed immutable artifact with checksum through a
protected environment. Database schema floor must be checked before rollback; frontend
rollback alone cannot undo an incompatible migration. Preview has no service worker and
must not share the live demo origin. GitHub required checks/branch protection and private
reporting must be enabled and verified after repository creation.

Sources checked 27 October 2026:

- https://capacitorjs.com/docs/getting-started/environment-setup
- https://developer.android.com/develop/ui/views/appwidgets/overview
- https://vite.dev/guide/build

## Phase 10 implementation — 29 October 2026

Owner accepted Phase 9 implementation after merged PR #19. Production ID is now
`work.shriv.sailorlogbook`, installed name Logbook, debug suffix `.debug`; the old
`.proof` namespace remains only for source/class compatibility and historical proof
installations. The production packaged entry uses canonical `slb-phase2`. See
[Phase 10 architecture](../ARCHITECTURE-PHASE-10.md) for native lifecycle, strict OAuth,
Keystore, reminders, backup and privacy behavior and the protected signing workflow.
This supersedes earlier unassigned-ID / proof-only statements, not their evidence limits.
Physical launcher/device, signed upgrade, live Dropbox and independent security gates
remain unverified; no old proof result is promoted to current native acceptance.
