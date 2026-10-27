# Sailor Logbook — open-source 1.0 launch plan

Planning baseline: 27 October 2026. Owner: **byshriv**. Intended public repository: **byshriv/sailor-logbook**. Phase 1 is now in progress at the owner's request. A local Git repository and isolated foundation/proofs exist; the public repository, hosted CI and production deployment have not been created or verified. See [Phase 1 status](docs/PHASE-1-STATUS.md) and [handoff](PHASE-HANDOFF.md). This phase does not authorize later product ports or creating accounts/granting access.

The owner has now answered all 24 follow-up questions. [LAUNCH-DECISIONS.md](LAUNCH-DECISIONS.md) is the authoritative accepted-answer register; it supersedes older proposals. Sync starts first and encryption is optional. Safari/iOS PWA, macOS and Linux browser compatibility are 1.0 targets, with actual verification status recorded separately.

## 1. Product and release decisions already agreed

Sailor Logbook is a minimal, polished, logbook-first calendar. Its purpose is cheerful retrospection: record what actually happened, then keep the best thing. It is not being expanded into an all-in-one productivity suite.

| Decision | Agreed baseline |
| --- | --- |
| Name | **Sailor Logbook**; installed short name **Logbook**. Preserve the owner's original icon/SVG artwork. |
| Ownership/license | Personal GitHub account **byshriv**, public repo **sailor-logbook**, MIT. Keep source and notices available from the start. |
| 1.0 channels | Hosted web/PWA plus a signed Android APK on GitHub Releases. **Google Play is later**, not a 1.0 gate. |
| Widgets | Required for 1.0: **Quick log** and **Today / best thing**. Quick log opens the app directly into its logging sheet. Personal text is hidden by default, with a per-device option to show it. |
| Scope | All demo features, plus owner-requested UI/usability improvements and bug fixes before launch. No additional feature family is assumed by “and more.” |
| Schedule | Quality-based. No invented calendar deadline. Each milestone has an acceptance gate. |
| Architectural direction | Super Productivity's local-first, modular, operation-log/sync patterns. The owner delegated framework choice; a full upstream fork and Angular are not required. |
| UI stack | Proposed implementation choice: React + TypeScript + Vite, Redux Toolkit for deterministic state/actions/selectors, CSS Modules and shared design tokens. |
| Persistence | Move the canonical logbook from localStorage into IndexedDB. Sync history already uses IndexedDB in the demo; logbook data and OAuth credentials currently use localStorage. |
| Cloud privacy | **Sync first; encryption optional**, as in the demo. When enabled, encrypt content before upload so Dropbox cannot decrypt it without the key. Unencrypted sync does not provide that guarantee. File sizes/timing/account metadata remain observable. |
| Unlock/recovery | For optional encryption: guided passphrase + recovery file/printable code with verification. Trusted Android unlock uses platform protection; browser unlock is session-only. No compulsory biometric-on-every-open or inactivity lock by default. |
| Browser instances | One active editing tab per browser profile for 1.0, with stale-lock recovery and a return-to-active-tab screen. |
| Decks | Up to **three total levels**: deck → sub-deck → another sub-deck. Ancestors include descendant records without duplicates. |
| Dates/travel | Past records keep their original local time/date when the user travels. Store timezone/offset context rather than reinterpreting old dates through the current device zone. |
| Platforms and verification | Android 12+ official baseline; 4 GB RAM recommended, not a hard gate. iOS/iPadOS 17+ Safari/PWA, plus popular Windows/macOS/Linux browsers are 1.0 targets. Native iOS is later. Owner testing is available on Android/Windows; obtain additional coverage and label pending/unverified results honestly. |

The demo remains **Demo v8**, with final cache revision `slb-v8-r3`. The final Settings fix stops a shared `.sw` sea-wave animation from moving switch tracks. Its scope is Settings controls; the sea animation is preserved. The 85 existing tests pass, and browser inspection verifies stationary tracks and working toggles. This is a completed demo baseline, not a claim that every physical-device or security check is complete.

## 2. Complete roadmap

| Phase | Goal and concrete work | Exit gate | Status |
| --- | --- | --- | --- |
| 0 | Mobile HTML concept/demo: Calendar, Notebook, Reflection, onboarding, local PWA and original visual design. | Reviewable demo and preserved data examples. | Done |
| 0.1 | Desktop demo and final v8 fixes: responsive workspaces, sidebar/decks/presets, 3-day Calendar, Planner dragging, customization, keyboard tours, Dropbox, update notice, mobile header, profile pictures and Settings toggle fix. | Complete deployment/source bundles, test results and known limits documented. | Done; owner deploys/reviews v8 |
| 1 | Public GitHub foundation, frozen demo reference, product specification, architecture records, React/TS workspace, CI, design tokens, security/contribution docs and technical spikes. | Clean clone builds and passes CI; architecture/migration/encryption/widget contracts reviewed. | In progress; isolated foundation/proofs and local checks done; public/hosted/native/review gates open |
| 2 | Domain model, pure commands/reducers, canonical IndexedDB, durable operation pipeline, recovery checkpoints, attachment storage, timezone rules and lossless demo migration. | Migration/replay/crash tests pass; no data loss; existing demo backups/cloud copies remain recoverable. | Planned |
| 3 | Production Calendar port with existing mobile flow and desktop Day/3-day/Week/Month behavior, lanes, quick-add, gestures and clock-derived task states. | Mouse, touch, keyboard, overlap, midnight and timezone cases pass; owner reviews Calendar before large flow changes. | Planned |
| 4 | Notebook and Sea adventure port: writing, doodles, stroke undo, cream spread, best-thing links, send/edit behavior, bottle selection, filters and history. | Text/drawing survives saves, navigation, restart, migration and synchronization. | Planned |
| 5 | Home and Reflection port: bento composition, greeting, progress, moods, streaks, achievements, review, sharing and customization. | All metrics match agreed rules; responsive layout and ordering are stable. | Planned |
| 6 | Tasks/Planner port: day columns, moves, timed/untimed tasks, Must-do, rollover/skipped states, Waiting on, Low energy and Voyage progress. | No duplicate/lost tasks after moves, rollover, drag cancellation or date changes. | Planned |
| 7 | Settings/profile/deck/preset management, onboarding, normal and keyboard walkthroughs, reminders, global search, accessibility and platform-specific capability copy. | Every setting persists correctly; no replayed animations or dead controls; optional flows are understandable. | Planned |
| 8 | Production PWA/offline/update behavior, versioned backups, export/import, local recovery and storage health. | Install/offline/reopen/update/restore works with real data and active drafts; upgrade failure leaves a recoverable version. | Planned |
| 9 | Production Dropbox operation transport, optional full-content encryption after initial sync, guided key/recovery setup, first-device join, conflict review and mixed-version migration. | Real multi-device, race, expiry, offline, recovery and encryption scenarios pass; no false Synced status. | Planned; architecture starts in Phases 1–2 |
| 10 | Android Capacitor shell, app links/OAuth return, native reminders, secure unlock, backups and required native widgets; GitHub Actions signed APK builds. | APK installs/upgrades and both widgets work on real Android devices, including offline and process restart. | Required for 1.0 |
| 11 | Dedicated owner-led UI refinement, bug fixing and release hardening: browser/device matrix, accessibility, performance, storage stress, dependency/security review and soak tests. | Owner accepts the experience; no unresolved release blockers or known broken required flows. | Planned; feedback tracked throughout all phases |
| 12 | Launch documentation, MIT/third-party notices, privacy/security/support material, repository polish, migration guide and signed release assets. | Fresh contributor can build; user can install, recover data and report issues; all links/assets are real. | Planned |
| 13 | Release candidate, final migration rehearsal, production web/PWA deployment, GitHub APK release and 1.0.0 announcement. | Tested RC artifacts promoted without rebuilding; owner approval and post-release verification complete. | Planned |
| After 1.0 | Google Play, optional F-Droid consideration and further UI improvements. Native iOS/App Store and desktop installers are separate later scope. | Separate roadmap and platform acceptance. | Later |

Phases are dependency milestones, not a waterfall that postpones safety. Tests, accessibility, privacy, migration checks and owner reviews begin in Phase 1. Sync/storage/widget feasibility must be proven before committing the whole UI to an incompatible foundation.

## 3. What transfers from the demo

The production implementation preserves the existing experience unless an owner-reviewed refinement explicitly changes it. Refactoring is not permission to redesign the difficult Calendar flow.

### Visual and interaction contract

- Dark only. Background `#121010`; cream `#F7F5E4`; cards `#1c1a19` / `#2a2725`; muted `#9b978b`.
- Accent uses `rgba(34,97,146,.6)` for dark fills and solid `#226192` for strokes/text/logo. Red `#e5484d` stays reserved for Must-do bars and the now-line.
- Rethink Sans 800 headings with -2% heading tracking; 500 body/buttons with normal tracking. Patrick Hand and cream paper in Notebook. Keep local font files/notices.
- Original owner-designed icon/animation assets, Lucide-style line icons, typographic apostrophes and no emoji UI.
- Cream primary buttons, generous rounded cards, restrained `cubic-bezier(0.1,0.7,0.5,1)` motion, reduced-motion support. Screen changes may animate; ordinary state updates must not restart entrance animations.
- Mobile uses the floating pill navigation and date/search/sync/profile header, which yields space to editors. No bottom nav or redundant switch in Sea adventure. Notebook retains its section switch.
- Desktop uses a real workspace, contextual toolbar, profile picture and collapsible/hover sidebar. Deck and preset management stays in sidebar dropdowns. Reuse space intentionally rather than stretching a phone column.
- In-app sheets/dialogs throughout. Remove dead browser `alert`/`confirm`/`prompt` paths during the refactor. Preserve haptic/sound settings and keep drag feedback restrained.

### Functional preservation checklist

| Area | Behavior that must survive |
| --- | --- |
| Calendar | Log today/past days; quick ghost defaults to configured length; Menu B with title/deck match/presets/compact More Options; Enter saves; preset selection exposes Done. Menu A includes existing fields, best-thing star and expanded options. Planned tasks retain their own status controls. Outside mobile taps dismiss the active editor rather than select another block. Hold-to-resize, visible-edge scrolling, drag, pinch/scroll zoom, overlap lanes, correctly positioned handles and linked midnight day segments. |
| Quick syntax | `Read book +lea t45`, word-start deck matching, recent-use preference, duration, and an unknown prefix creating a deck with the existing organize toast. Preserve named decks and legacy IDs during migration. |
| Planning | Trello-style day columns, dimmed past days, working Add task, drag between dates, untimed task dropdown/drag to Calendar, Must-do and existing statuses. Clock-derived statuses remain distinct from actually logged activity. Must-do rollover is reviewed gently, with unresolved items shown as planned like the demo and skipped/done history retained. |
| Decks/presets | Three-level hierarchy, independent disclosure/navigation/edit controls, readable names, ancestor aggregation, no cycles, colour feedback and editable quick-add presets. |
| Home | Time-of-day greeting; desktop single line; mobile date lives in the header; current task, Must-do, best things, mood and progress; drag-to-customize and saved layout. |
| Reflection | Proper bento composition, hours/best-thing streaks, mood radar, heatmap, lessons, gratitude, achievements and canvas sharing. Backfilling counts. Hours streak retains the 120-minute threshold, counting overlapping eligible logged intervals once and excluding flagged decks/descendants. Preserve the four best things/day cap and four best-streak freezes/month. Sync overflow retains all notebook text and lets the user choose four featured moments. |
| Notebook | In-place committed rows, append-only new blank row UI, per-line doodles, stroke-based undo/clear and guarded free drawing. Desktop two-page spread and Send to sea below it as well as in the toolbar. Best things add a line to the day's page. Sent pages dim and expose Edit. |
| Sea adventure | Five sent days before bottles appear; at most ten, biased toward older dates; one-message and whole-day bottles; best/size/date filters; opened bottle hidden for the rest of the month, except explicit date review. Back returns to Notebook; desktop water fills the workspace. |
| Setup/settings | Name/photo, decks, presets, startup/default duration/time format/week settings, sound/haptics, storage status, backup/import/export and help. Desktop onboarding overlay; existing-logbook join; device-appropriate walkthrough; optional desktop keyboard practice ending in the full shortcut reference. |
| Search/keyboard | Preserve global entry/task search, commands and Settings/Reflection search. Keep the complete v8 shortcut reference, typing guards, focus handling, Esc and Ctrl/Cmd variants. Never intercept normal text entry or browser tab shortcuts. |
| Sync/update | Optional Dropbox connection; local use without an account; pull on open/return, selective scheduling and manual control; quiet background success, meaningful failure/conflict feedback; active drafts protected; explicit update/reload choice. Close-time sync remains best effort. |

Phase 1 audited the running source: index.html's ACH array has **seven** achievements (Maiden Voyage, Bright Spot, Message Sent, Fair Winds, Open Sea, Four Bells, Seasoned Sailor). The earlier count of eight was incorrect. See [product specification](docs/PRODUCT-SPEC.md). Widget previews and open-tab reminders are demos, not proof that native widgets or closed-app reminders already exist.

## 4. Architecture to build

### Stack and boundaries

React + TypeScript + Vite is the proposed UI implementation. Redux Toolkit supplies explicit actions, pure reducers and selectors; persistence/sync live behind commands and middleware/services, not inside React components. CSS Modules prevent generic class collisions like the Settings/sea `.sw` bug. A small workspace is enough; a large build-system framework is not required initially.

```text
sailor-logbook/
  apps/logbook/               # React shell, routes, features, store, platform wiring
  packages/domain/           # Journal models, pure commands/rules, schemas
  packages/persistence/      # IndexedDB adapter, migrations, checkpoints, blobs
  packages/sync-core/        # Generic operations, clocks, merge/replay contracts
  packages/sync-providers/   # Dropbox transport, credential/network ports
  platforms/android/        # Capacitor host, Kotlin widgets, native adapters
  tests/e2e/                 # User flows, updates, sync and upgrade scenarios
  docs/adr/                  # Decisions, alternatives, consequences
  docs/migrations/           # Local and cloud compatibility/recovery
  docs/releases/             # Acceptance, release and rollback checklists
  .github/workflows/         # Checks, previews, Android artifacts, releases
```

The app composes the domain, storage and providers. Generic sync code must not import React, Redux, app screens or Dropbox. Providers use public core/port contracts; storage/credentials/native APIs are injected. Pure journal/date rules do not depend on a UI framework. Enforce these directions in tooling and review.

[The pinned upstream review](research/ARCHITECTURE-REVIEW.md) explains which patterns are active and what differs. Phase 1 includes a small reuse spike for Super Productivity's public sync-core/provider APIs. Reuse is preferred when licensing, distribution, compatibility and tests fit; it is not promised simply because packages exist in the repository. Pin reused code and preserve notices. Do not fork its full app or add unrelated features.

### Canonical data and durable writes

1. Validate a user command against domain invariants.
2. Build a deterministic transition and operation with a stable operation ID, actor/sequence and causal clock.
3. Serialize persistence through one write gateway. Commit operation/clock and the required durable state changes atomically.
4. Distinguish optimistic UI, locally saved and remotely synchronized state. A failed transaction must surface an unsaved state and recovery/retry, not a success toast.
5. Schedule sync only after local durability. Remote replay must not be captured as a new local edit or retrigger local-only effects.
6. Start from a verified checkpoint and replay a bounded operation tail. Compact only safely covered/acknowledged history; retain pending writes and required deletion metadata.
7. Use one active browser editing instance, with ownership handoff and crash/stale-lock recovery. Do not rely on localStorage flags alone as a concurrency lock.

IndexedDB becomes the canonical store for records, operations, metadata, recovery points and attachment references/blobs. Redux is a live projection, not a second database. Keep only small local preferences in localStorage. Web credentials use a separate restricted storage boundary; moving a token into IndexedDB alone does not protect it from compromised same-origin JavaScript. Native credentials/unlock keys use appropriate platform-protected storage.

Store photos as blobs rather than duplicating base64 strings throughout the main state. Compress to WebP by default and offer an unchecked Keep original option with size/storage/transfer warnings. Benchmark and set dimensions/byte limits, verify actual encoder output and preserve source bytes only on opt-in. Keep editable strokes and generated drawing previews separately. Validate size/type before import; use opaque attachment IDs and plan reference counting and delayed garbage collection. Exports, migrations and encrypted sync must include attachments without silently orphaning them.

### Record rules, Undo and erasure

Use two linked segments for a midnight-crossing activity. Calculate day totals/streaks using the union of eligible logged intervals, never automatically treating planned tasks as performed activity. Use a stable excludeFromStreak flag: Time Wasted defaults on, descendants inherit it, and other decks may be flagged. Offer reassignment rather than cascading activity deletion when a deck is removed.

Every normal content deletion offers Undo and a 30-day Recently deleted route, covering linked records/relationships as one reversible command. A restore is a new causal operation. Keep deletion tombstones as long as needed for safe synchronization; trash retention alone must not determine operation/tombstone compaction.

Separate Lock logbook, Disconnect Dropbox, Erase local data and Delete logbook everywhere. The legacy Delete your account action must erase local logbook data/keys and this app’s Dropbox files, attachments and app-owned backups. It must not delete the Dropbox account or unrelated files. Permanent erasure uses a distinct in-app confirmation, progress and verified result rather than a misleading Undo promise. Cancel pending uploads, handle cloud/offline errors honestly and prove stale-device behavior before claiming that deleted cloud content cannot be recreated. Do not promise remote deletion of another offline device’s local copy or control over Dropbox-managed retention.

### Lossless migration from v8

- Freeze representative v8 JSON/cloud/backup fixtures, including duration-free presets, nested decks, deleted/conflicting records, photos and doodles.
- Preserve a downloadable backup and a local recovery checkpoint before conversion. Never clear `slb1` just because the new database opened.
- Version the import/migration schema. Preserve record IDs, relationships, original wall dates/times, best-thing links, sent/seen bottle history, tags, achievement state and intended settings.
- Convert attachments with verified counts/content hashes. Keep original data until the destination is verified and the migration commits.
- Make interruption/resume idempotent. A partial migration cannot be mistaken for success. Test empty, full, near-quota, malformed and old-device data.
- Define cloud protocol compatibility before changing the remote envelope. Old clients must not overwrite a new-format logbook; newer clients must not discard unsynced edits from an old device.
- Retain a legacy reader/importer and a documented rollback/recovery route. Do not rename/delete existing Dropbox files as a shortcut to migration.

### Dropbox and conflict behavior

Dropbox remains optional; offline/local use needs no Sailor Logbook account or application data server. New/unencrypted connections sync first, without forcing encryption or recovery setup. Encryption is a separate later Settings choice. Existing encrypted copies still need their key and cannot be silently downgraded. The maintainer registers the App Folder app; users connect their existing Dropbox account through PKCE/redirect approval. Public app keys are not secrets; app secrets and signing credentials never enter client bundles or source history.

Separate the generic operation engine from Dropbox's file revisions and networking. Begin with a versioned baseline + bounded operation-tail transport unless the reuse spike establishes a better fit. Split attachment objects as needed, but make the manifest/envelope the explicit revision-checked commit boundary. Readers must never apply a partial multi-file upload. Do not imitate Super Productivity's older folder contents without understanding its protocol.

Retain selective open/return/edit-pause/screen/manual scheduling and status feedback. Add bounded retries, backoff, cancellation, refresh expiry, clock-skew handling, duplicate delivery and connection-change guards. Never let two sync cycles or two actors race unchecked. Persist pending work and retry on a later open; do not promise browser work after a tab is killed.

Merge independent records/eligible independent fields automatically. Preserve losing alternatives for genuinely overlapping edits and deletions, with a conditional comparison/restore choice. Resolve against stable conflict IDs and re-check freshness before applying a user's choice. Keep active drafts safe. The owner's review requirement intentionally differs from upstream's current retired conflict-journal UI.

### Optional end-to-end encryption and recovery

When the user enables encryption, the requirement is content confidentiality from Dropbox, beyond TLS or Dropbox's server-side encryption. Encrypt titles, text, moods, relationships, drawings, photos and logbook content before upload. Keep plain and encrypted modes versioned and explicit. Unencrypted sync remains usable but must not be described as unreadable to Dropbox. Use opaque file IDs where possible; account/filesize/activity metadata remains observable.

Proposed key design: a randomly generated logbook master key, authenticated encryption with unique nonces, and separate wrappers allowing unlock with either the user's passphrase or a high-entropy recovery key. Derive passphrase keys using a vetted, versioned KDF; evaluate upstream Argon2id helpers and benchmark memory/latency on supported Android devices. Do not invent cryptographic primitives.

Provide a short optional setup after ordinary sync is working: create a passphrase, save/verify the recovery file and printable code, connect another device, and explain loss/recovery plainly. Do not upload the unwrapped key/passphrase or include it in diagnostics. Trusted Android unlock wraps the key using platform protection and the device-unlock boundary; browser unlock is session-only. Avoid compulsory biometric-on-every-open and inactivity lock by default; an explicit Lock requires authentication again. Keep device unlock separate from a content-encryption guarantee for local data.

Default backups to encrypted once a key is configured, with a clearly labelled plaintext export choice. Without a key, offer optional encrypted-backup setup or plaintext export without blocking sync. Full local database encryption is not required for 1.0; platform-protected keys do not make IndexedDB itself encrypted. Specify and test recovery-key rotation, passphrase changes and lost-device handling as technical contracts in Phase 1. Existing plaintext cloud revisions/backups cannot be made retroactively private by encrypting the next upload; the migration guide must explain this accurately. No silent plaintext fallback on decrypt/unlock failure.

### Platforms, Android and widgets

Target Android 12+ for the signed APK. Four GB RAM is recommended rather than a hard install restriction; establish image/drawing/encryption budgets and graceful resource errors on lower-memory hardware. Target iOS/iPadOS 17+ Safari and the installable PWA for 1.0, plus supported popular browsers on Windows/macOS/Linux. These are product support choices, not the framework’s theoretical minimums; verify pinned dependency compatibility in Phase 1. Native iOS/App Store packaging remains later.

Use Capacitor to host the shared app and isolate native lifecycle, OAuth return, notifications, files, share, haptics and unlock behind adapters. Verify background/foreground, keyboard insets, back navigation, permission denial, process death and APK upgrades on real phones.

Build native widgets in Kotlin using supported Android widget APIs. Quick log launches a validated deep link to the logging sheet. Today / best thing reads a minimal native projection updated after canonical commits. That projection is disposable and is never another independently writable logbook. Hide personal text by default; opt-in visibility is device-local. Protect projection data and mark stale displays honestly. Do not put encryption secrets, OAuth tokens or complete notebook pages into widget intents/preferences.

Package assets with the APK; do not turn it into an uncontrolled remote-code loader. Native code updates use signed APK releases. Keep app ID, signing certificate and version codes stable. The maintainer owns and backs up release keys; CI secrets are provided through protected settings, never chat or commits.

## 5. GitHub foundation and delivery

Phase 1 work, after the plan is agreed:

1. Create public `byshriv/sailor-logbook`; add MIT, original-asset/font/third-party notices, README, contribution guide, code of conduct, security-reporting instructions and issue/PR templates.
2. Preserve the final demo as an explicit reference/tag/artifact. Demo v8 is not a product major version 8; use separate prerelease/semantic version names for the production line.
3. Record ADRs for stack, dependency boundaries, persistence, command durability, single-instance behavior, dates/decks, cloud protocol, encryption/recovery, Android/widget projection and deployment rollback.
4. Add a pinned toolchain, lockfile, reproducible installs, formatting/type checks, package-boundary checks and a clean-clone build guide. Remove runtime globals, chained view wrappers, dead duplicate views and duplicate-ID risks incrementally as features move.
5. Preserve the owner-reviewed visual/behavior contract with fixtures and representative screen/interaction checks. Keep a separate reviewable migration branch/preview; do not replace live user storage with an incomplete rewrite.
6. Enable required checks and branch protection where available. Keep PR test jobs read-only and secret-free; untrusted fork code never receives release/deployment/signing secrets.
7. Build immutable preview artifacts from the PR/reviewed commit. Production deployment uses a protected environment and the exact tested artifact. Avoid deploying through a workflow that executes untrusted PR code with privileged tokens.
8. Add dependency/secret scanning, appropriate code scanning, a license inventory and safe update review. Pin Actions to reviewed revisions. Scan outputs for secrets and personal fixture data.
9. Use a public issue board with phase, platform, bug/UI, migration/sync and severity labels. Track owner feedback as explicit acceptance items; do not bury it in chat-only history.
10. Add changelogs, reproducible web builds, Android debug CI artifacts and signed release APKs/checksums from protected release jobs. Signing is not allowed from ordinary external PRs.

Cloudflare Pages and the existing `logbook.shriv.work` deployment remain the default hosting plan. Confirm ownership/access and staging URLs during Phase 1. No server for personal logbook data, advertising or telemetry is assumed. Do not add invented support/social/donation links to the UI; use only owner-provided destinations.

## 6. Quality and launch gates

The aim is no known broken required flows at launch, not an unverifiable guarantee that unknown bugs cannot exist. A count of tests alone is not release approval.

| Gate | Required evidence |
| --- | --- |
| Local durability | Save/reopen, quota failure, interrupted transaction, process termination, stale lock, operation replay and checkpoint corruption recovery. |
| Migration | Every entity/attachment retained from demo fixtures; repeat/interrupted migrations; real owner backup rehearsal; old/new protocol protection. |
| Sync | Two or more independent devices; immediate unencrypted first sync without encryption setup; later opt-in encryption; nonempty-copy preview/recovery/merge; offline edits, edit/delete races, retries, refresh/revoke, network changes and pending writes during transfer. |
| Encryption | Correct/wrong key, tampered ciphertext, key/recovery rotation, new-device recovery, unsupported envelope, attachment integrity, locked startup and no plaintext fallback. Check cloud payloads for recognizable logbook content. Seek independent security review rather than treating an implementation review as an audit. |
| UI/usability | Every demo flow ported; owner review; stable switches/keyboard/navigation/editors/gestures/motion; Undo for every normal deletion; 30-day recovery; planned-item rollover presentation; WebP/Keep original and backup/import previews. |
| Accessibility | Keyboard-only use, visible focus, sensible semantics, contrast, screen-reader checks, reduced motion and zoom. Resolve issues throughout feature work. |
| Browser matrix | Target supported releases of Chrome, Edge, Firefox, Brave, Opera, Arc, Vivaldi, Samsung Internet and Safari on their vendor-supported Windows/macOS/Linux/Android/iOS platforms. Maintain exact version/result records. CI Chromium/Firefox/WebKit is not proof of every product browser or real Safari behavior; obtain actual tester/cloud coverage and label remaining gaps. |
| Native | Signed install/update, deep links/OAuth return, deny/revoke permissions, offline start, OS kill/restart, reminders, trusted unlock and both required widgets. |
| Performance | Representative multi-year data, dense Calendar/Month overlaps, long titles, large notebook pages/photos, drawing latency and cold start on a lower-memory Android phone. Establish measurable budgets from the agreed dataset. |
| Updates/rollback | Web offline start and update discovery, draft-safe reload, broken-asset/network failures, old-client compatibility and database schema floors. A frontend rollback must not open an incompatible database and destroy data. |
| Security/privacy | Dependency/license review, safe imports, no secret/logbook content in diagnostics, permissions/CSP reviewed, authenticated encrypted payloads, release secrets isolated. |
| Acceptance | Owner approves required UI/flows. No data-loss/security blockers or unresolved functional defects in required scenarios; any proposed deferral is visible and owner-approved. |

Run unit/domain and storage/merge tests, integration tests and Playwright user-flow tests in CI. Use real browsers/devices for native keyboard, installation, haptics, app lifecycle, notification and widget acceptance; simulations cannot substitute for those checks. Log the tested app/OS/browser version and result.

## 7. Release sequence and maintenance

1. Finish an alpha with local durability and safe migration before widening testers.
2. Build feature-complete beta web/PWA and Android APK with both widgets, working sync-first connections and optional encrypted sync/recovery. Include the iOS/macOS/Linux browser-target checks in the beta matrix.
3. Run the owner-led UI refinement/bug-fix pass, regression matrix and multi-device soak period. Define the soak window with the owner instead of inventing a launch date.
4. Produce a release candidate and exact artifact hashes. Rehearse migration/recovery against exported real data with the owner's participation. Keep signing keys and personal data out of issue attachments.
5. Complete README/screenshots, setup/update/import/recovery instructions, release notes, license inventory, privacy disclosures, GitHub Issues/private vulnerability-reporting route and known support limits. Arrange Dropbox production readiness/review for public use; a development app key alone is not proof of broad release eligibility.
6. After owner approval, tag `v1.0.0`, publish the tested signed APK/checksums/source reference on GitHub Releases, and deploy the tested web artifact to production.
7. Verify a clean install and an upgrade, sync across devices, recovery-key use, both widgets, and rollback/recovery procedures. Do not clear users' browser data to fix an upgrade.
8. Triage incoming issues, keep security/dependency patches moving, and ship small versioned fixes. Continue owner-requested usability improvements through a public backlog.

Google Play is a separate post-1.0 milestone. It requires store assets/disclosures, signing/AAB decisions, an eligible verified developer account, applicable testing and policy checks. Current guidance for qualifying newer personal accounts requires a closed test with at least 12 testers continuously opted in for 14 days; re-check the rule at that later release. F-Droid, native iOS and desktop installers need separate scope/maintenance decisions.

## 8. Accepted decisions and immediate next work

The owner has answered the 16 foundational questions and all 24 follow-ups. [LAUNCH-DECISIONS.md](LAUNCH-DECISIONS.md) records accepted answers/delegated choices and takes priority over old proposals; [LAUNCH-QUESTIONS.md](LAUNCH-QUESTIONS.md) is the historical questionnaire. Product-scope answers are complete. Collect concrete test devices/versions, external testing access, empirical media/encryption budgets and review resources during the relevant phases. Do not repeat settled questions.

The app is free, has no ads and has no telemetry by default. Use manual sanitized diagnostics, GitHub Issues and GitHub private vulnerability reporting after enabling them on the real repository. Start with Issues only; Discussions and real owner-provided donation links may come later. Use a small beta group, public source throughout and wider testing after migration/recovery checks. Record independent-review limits honestly.

Continue Phase 1 only. The isolated React/TS preview, frozen reference, durable-write/replay and wrapping/widget contracts, local checks, ADRs and reuse assessment are recorded in [Phase 1 status](docs/PHASE-1-STATUS.md) and [spike evidence](research/PHASE-1-SPIKES.md). Public repository/hosted CI, native execution, successful browser review and architecture acceptance remain open. Do not begin Calendar or other large ports until this phase's gates are resolved.

Primary external references: [pinned source review](research/ARCHITECTURE-REVIEW.md), [Redux Toolkit + TypeScript](https://redux.js.org/toolkit/usage/usage-with-typescript), [Vite](https://vite.dev/guide/), [Capacitor Android](https://capacitorjs.com/docs/android), [Android widgets](https://developer.android.com/develop/ui/views/appwidgets/overview), [Android signing](https://developer.android.com/studio/publish/app-signing), [Dropbox production guide](https://docs.dropboxapi.com/dropbox-api/docs/developer-resources/developer-guide), [Google Play personal-account test requirements](https://support.google.com/googleplay/android-developer/answer/14151465).
