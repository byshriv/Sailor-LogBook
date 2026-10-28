# Sailor Logbook

A personal book for the little things you do in the day. A local-first, dark, logbook-first calendar, with optional Dropbox sync. The application source is open source under the [MIT license](LICENSE). Fonts retain their SIL Open Font Licenses in `fonts/`.

## Phase 1 foundation

The production foundation is isolated in `apps/web` and `packages`. The root app below
remains Demo v8. Use Node **24.22.0** / npm **11.19.1**, then:

```sh
npm ci
npm run verify:foundation
npm run dev:foundation
```

The proof preview uses port 5173 and its own IndexedDB database. It does not import demo
data or connect Dropbox. `build/foundation` is a review artifact, not a production release.
See [Phase 1 status](docs/PHASE-1-STATUS.md), [ADRs](docs/adr/0001-foundation.md),
[spike evidence](research/PHASE-1-SPIKES.md) and [handoff](PHASE-HANDOFF.md).
Public source and hosted checks are in [byshriv/Sailor-LogBook](https://github.com/byshriv/Sailor-LogBook)
and [PR #1](https://github.com/byshriv/Sailor-LogBook/pull/1). The design review is in
[docs/REVIEW-2026-10-28.md](docs/REVIEW-2026-10-28.md). Run demo and proof on separate origins.

`npm run test:browser` uses isolated headless Chromium/Firefox/WebKit profiles. Android
source in platforms/android is a disposable bridge/widget feasibility host with its own
app ID; it is not the signed 1.0 app. Hosted artifacts include runtime/font license notices.
See [current evidence and remaining gates](docs/PHASE-1-STATUS.md) before continuing work.

## Run and check the demo

Use the pinned Node/npm versions above. The demo itself has no runtime package dependencies
or build step; the new foundation uses the dependencies in package.json.

```sh
npm ci
npm run dev
npm run check
npm test
npm run package
```

Open `http://127.0.0.1:4173/`. `npm run package` creates `dist/`, ready for Cloudflare Pages upload. See [DEPLOY.md](DEPLOY.md). Only deploy `dist/`; development files and research are excluded.

## Desktop demo (phase 0.1)

At widths of 900px and above, the app uses a sidebar and wide workspace. Outside Home, the sidebar stays compact and expands on hover or keyboard focus without shifting the workspace. Home retains its manual collapse control. Decks and Presets are sidebar dropdowns. A parent deck has a separate disclosure button for its sub-decks, which can be closed without leaving the current page. Open/edit deck actions remain separate. Their duplicate cards are removed from desktop Settings; mobile Settings retains them.

The primary Log something button is at the top right, alongside search, Dropbox status/sync and a contextual action: New task in Calendar/Planner, Send to sea or Edit page in Notebook, Write a message in Sea adventure, Review in Reflection, and Backup in Settings. A disconnected Dropbox button opens setup; a connected one requests sync and shows failures without claiming success.

The calendar opens in week view, with Day, 3 days, Week and Month available on desktop. Quick-add sits beside its slot, and existing blocks use a right editor beside the grid. Planned tasks can move earlier or later: a block entirely after the now-line is to-do, one spanning it is working, and one whose end has passed is done. Dragging resets a task’s manual status override and keeps it a task. Only this planned-task path and the 3-day option changed in this pass; logged-block movement, resizing, quick-add and editors retain their existing behavior.

Home shows its time-of-day greeting and name on one line. Home and Reflection use wider dashboards; Customize supports mouse hold-and-drag, saved ordering, cancel and edge scrolling. Planner tasks can be dragged between day columns while retaining their identity and other details. Desktop deck/sub-deck navigation animates when the deck changes; re-rendering the same page does not replay it.

Desktop Notebook has a cream two-page writing/drawing spread, an in-place moment count and Send to sea below the pages as well as in the toolbar. Notebook keeps its Notebook/Sea adventure switch on both layouts. Sea adventure uses Back instead, has no mobile bottom nav or section switch, and fills the available desktop workspace with water.

| Shortcut | Action |
| --- | --- |
| N | New log |
| T | New task |
| 1–5 | Home, Calendar, Planner, Reflection, Notebook |
| Left / Right | Previous / next calendar period |
| / or Ctrl+K (Cmd+K on Mac) | Search entries/tasks and commands |
| Esc | Close search, editor or guide |
| Ctrl+scroll over calendar | Zoom time grid |
| Shift+A / Shift+P | New task / deck |
| Shift+S / Shift+L / Alt+N | Calendar / Planner / Notebook |
| W / 6 or comma | Home / Settings |
| Shift+T | Today |
| J / K | Focus next / previous visible block or task |
| E or Enter / D | Edit focused item / toggle focused task status |
| Ctrl+Enter / Ctrl+D | Save editor / duplicate focused item |
| Delete or Backspace | Delete focused item with in-app confirmation |
| + / - / 0 | Zoom calendar in / out / reset |
| Ctrl+S | Sync outside an editor |
| ? | Keyboard shortcut reference |

Command shortcuts also accept Cmd on Mac. Shortcuts do not intercept ordinary typing or browser tab shortcuts. Desktop onboarding uses an overlay and its own walkthrough, followed by optional keyboard practice. Connecting an existing logbook on desktop starts that practice directly after a successful join. Four safe practice steps lead to a fifth full shortcut-reference slide, with progress, examples and Back/Done controls. Help keeps it available later. Desktop welcome and storage settings include bookmarking guidance. Motion uses `cubic-bezier(0.1,0.7,0.5,1)` and respects reduced-motion. Mobile occupies the available viewport width below 900px.

Desktop requests persistent storage once and checks its actual grant status in Settings → Persistent storage. A retry button allows a user-requested attempt. Browsers control whether the request is honored; unavailable or denied requests stay labelled accordingly. This does not increase localStorage’s quota or prevent explicit site-data deletion. See [the browser API documentation](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).

The app is now **Sailor Logbook**, with **Logbook** as the installed short name. The owner’s original SVGs are preserved by `scripts/brand-assets.cjs`. `npm run icons` renders install assets from that same artwork, squaring only the outer frame for the operating system’s mask, with no padding or redesign. Sharp is a development-only rasterizer; the app has no runtime dependency on it. Icon URLs are versioned for this update. Existing installed shortcuts may still need an OS/browser refresh or removal and reinstallation to show updated metadata.

The final demo pass places a labelled sync pill at the mobile top right, with its own header space. It shows Connect, Sync, Syncing, Synced, Offline or Review sync as appropriate. Past Planner days are dimmer, and Add task starts a fresh focused editor. Task quick-add highlights the matched deck in its colour while typing `+lea`. Calendar Menu B reveals Done after selecting a preset; the rest of that menu is retained.

## Optional Dropbox sync

Dropbox is contacted directly from the browser; there is no application server. The owner’s **public app key** is configured in `config.js`. Leaving it blank shows a configurable setup field. Never put a client secret there. One shared Dropbox app is registered by the maintainer, rather than requiring every end user to create one. See [DROPBOX-SETUP.md](DROPBOX-SETUP.md).

Create a scoped **App Folder** app in the [Dropbox App Console](https://www.dropbox.com/developers/apps). Enable `files.content.read` and `files.content.write`. The implementation uses PKCE with S256, a validated state nonce, registered redirect URLs and offline refresh tokens. App Folder access is a setting in the Dropbox console; the browser cannot enforce it for an arbitrary supplied key.

1. Open Settings → Synchronize data and enter the public app key if requested.
2. Select Connect Dropbox. Approve access on Dropbox’s website.
3. Dropbox returns to the app automatically; no code needs copying. Callback parameters are removed from the address before the app starts.
4. A new or unencrypted copy starts syncing automatically. Encryption is secondary: enable it later in Sync settings with a passphrase of at least 12 characters. An existing encrypted copy still requires its existing passphrase and is never silently converted to plaintext.
5. Repeat on the other device with the same Dropbox account. A fresh device can use Connect existing logbook during onboarding. An empty starter logbook adopts the existing remote data on its first sync.

The remote file remains `/sailors-logbook.json`, relative to the app’s Dropbox folder, for compatibility. Balanced sync pulls on open, checks on return or screen changes (throttled), combines saved edits after a 15-second pause, and checks about every 90 seconds while visible. Every 5 minutes and Manual only modes are also available. Returning on desktop therefore checks for mobile changes even when the desktop has no pending edits. Device scheduling preferences stay local.

Desktop has a toolbar sync control; mobile has a floating status/sync button. Routine background success stays quiet; manual completion, new conflicts, failures and offline recovery provide feedback, with repeated background errors limited. Unsaved editors pause sync. A focused but committed notebook row does not. Hide/close attempts send pending changes on a best-effort basis: browsers cannot guarantee completion on close. Offline changes remain local and retry on a later open/return.

Entries, tasks, decks, presets, best things, notebook lines/pages, reflections, sent/seen bottles, profile and dashboard layouts sync. Device preferences, onboarding state, zoom, tokens and connection settings do not. Same-record concurrent edits retain the other version in Sync settings for review. Different notebook lines merge separately; a drawing is a single record. Deletions retain tombstones so an older device does not silently restore deleted data. The current deterministic version can be a deletion; review the saved conflict to restore the other edit.

When a conflict exists, the sync control opens a readable comparison. This device and Dropbox labels are used when those sources are identifiable; otherwise Current version and Saved alternative avoid guessing. Choices use stable conflict IDs and re-check the current version before applying, so a stale review cannot overwrite a newer edit. Deletions are explicitly shown as Removed. After a choice, that resolution is synchronized. Normal sync has no conflict prompt. “Invalid preset” is a validation error, not a conflict notification; v7 accepts the app’s valid duration-free presets (`dur: 0`) while still rejecting malformed data.

Optional encryption uses AES-256-GCM with a fresh nonce and salt and PBKDF2-SHA-256 (310,000 iterations). The complete sync document is encrypted before upload. Passphrases live only in the current tab’s memory: enter the same passphrase after reopening or on another device. Keep backups; a lost passphrase cannot be recovered. This encryption protects the Dropbox file, not local storage, JSON backups or access tokens. It has not received an independent security audit. Changing/removing encryption on an existing remote file is intentionally not offered in this demo.

OAuth tokens are stored separately from the logbook and excluded from backups and remote data. Sync history uses IndexedDB, with a localStorage fallback when unavailable. BroadcastChannel coordinates edits between tabs where supported. Disconnect removes this device’s credentials and retains the Dropbox file. It does not revoke the Dropbox app grant; use Dropbox’s connected-app settings for that.

## Verification and limits

`npm run check` extracts the inline app script and runs `node --check`, checks external scripts/manifests, and verifies offline assets. `npm test` exercises jsdom application flows, mobile view regression, record conflicts/deletions, encryption, malformed input and mocked Dropbox requests.

The local v1 baseline used for the one-time mobile regression check is in ignored `.local/v1.html`; that check skips if the reference is absent. Other tests run from a clean checkout.

The owner subsequently reported successful transfers between actual mobile and desktop devices, alongside first-connection/encryption setup errors. This revision fixes duration-free presets (`dur: 0`) being rejected by sync validation and blocking cached history on reload, simplifies initial connection, handles each callback once, and serializes encryption changes after any in-flight upload. Automated tests exercise these cases against simulated Dropbox responses. The one-off first authorization failure was not reproduced; expired or reused authorization links now receive specific feedback. The agent did not perform a live account grant or re-test the revised flow on physical devices. Long-term refresh, haptics, iOS installation/keyboard behavior, pen pressure and storage stress remain physical-device checks. Main logbook storage still uses localStorage; IndexedDB/TypeScript migration is later-phase work. Large photos/drawings can exhaust storage. Export backups regularly.

No test suite establishes that an application is bug free. See [research/SYNC-REVIEW.md](research/SYNC-REVIEW.md) for the source-level review and [ROADMAP.md](ROADMAP.md) for remaining work.

## Demo v8 refinements

Updates download in the background and show a Reload / Remind me later notice. Settings → Help checks for updates. Reload waits until active editors are closed; logbook storage is preserved. A user still running v7 needs a normal online close/reopen cycle to receive this new updater. The worker cache is slb-v8-r3.

Mobile Calendar outside taps dismiss the active menu and keyboard without switching blocks. Resize dots require a stationary 340 ms hold, and the timeline scrolls near its visible edge during a resize. Canceled gestures restore timing. Presets and More Options share a compact row. Input hints discourage credential/address autofill, although browser UI cannot be completely controlled.

The mobile header shows today’s date with a full weekday, labelled sync status, search and the saved profile picture/settings. It hides when menus, overlays, customization or text entry need the space, and Home omits its duplicate date. Desktop also has a profile/picture button. Nested sidebar disclosures retain parent names, and deck pages include logs and planned tasks from descendant decks once. Imported parent cycles cannot loop during aggregation.

The safe-storage onboarding slide now offers Dropbox. Both it and the sync screen include the same short Dropbox introduction: direct sync to the user’s own account, no developer collection of logbook data, secure cloud storage and a [Dropbox privacy policy](https://www.dropbox.com/privacy) link. Encryption controls retain their detailed passphrase guidance. Connection, encryption and scheduling controls retain their existing behavior.

The main logbook (`slb1`) and Dropbox OAuth credentials (`slb-dropbox-auth`) use localStorage. Only sync record history uses IndexedDB (`slb-sync`, data store), with a localStorage fallback if the API is unavailable. This is not a full IndexedDB migration.

Autofill suppression hints apply to text fields/forms across the app, including dynamically opened editors. The encryption password area keeps its own behavior. Browser and password-manager UI may still override hints. Sync uses Lucide’s official refresh-cw SVG paths, with its ISC notice in THIRD_PARTY_NOTICES.md.

## Production launch planning

Demo v8 is the completed prototype baseline. The final cache revision is `slb-v8-r3`; Settings switches are isolated from the legacy sea-wave animation. Production work is planned for public `byshriv/sailor-logbook` under MIT. The owner requires web/PWA, signed GitHub Android APK and Quick log + Today / best thing widgets for 1.0; Google Play is later. Launch is quality-based, with all demo features and continued owner UI/bug refinements.

See [the complete launch plan](LAUNCH-PLAN.md), [roadmap](ROADMAP.md), [accepted launch answers](LAUNCH-DECISIONS.md) and [pinned Super Productivity architecture review](research/ARCHITECTURE-REVIEW.md). These are planning artifacts; the GitHub repository and production rewrite have not been started by this demo task.

All 24 follow-up questions are answered in LAUNCH-DECISIONS.md. The production plan is sync-first with optional encryption; WebP compression plus opt-in originals; Undo and 30-day recovery; preview/recovery before merge/import; and a confirmed erase-everywhere flow for app-owned Dropbox data. Target Android 12+ (4 GB recommended, not enforced), iOS/iPadOS 17+ Safari/PWA and popular Windows/macOS/Linux browsers, with honest coverage records. These are launch requirements only; the frozen v8 app is unchanged and Phase 1 has not started.

## Phase 3 Calendar

Run `npm run dev:foundation` and open `http://127.0.0.1:5173/?phase=3`.
Calendar uses the Phase 2 durable pipeline/database and shared editing lock. The default
foundation preview, Phase 2 preview and demo remain available. This is an isolated Calendar
review, not a production cutover. See [status](docs/PHASE-3-STATUS.md),
[architecture](docs/ARCHITECTURE-PHASE-3.md) and [handoff](PHASE-HANDOFF.md).

Phase 3 is accepted and complete; PR #12 merged as `327ad8d` with final required checks passing.

## Phase 4 Notebook and Sea adventure review

Run `npm run dev:foundation` and open `http://127.0.0.1:5173/?phase=4`.
Notebook shares Calendar's durable store and editing lock. It includes in-place writing,
editable drawings/Undo, cream desktop spread, best-thing links, send/Edit and Sea bottles,
filters and monthly history. Close other preview editors before use. See
[status](docs/PHASE-4-STATUS.md), [architecture](docs/ARCHITECTURE-PHASE-4.md),
[verification](docs/VERIFICATION-PHASE-4.md) and [handoff](PHASE-HANDOFF.md).
This isolated review does not activate a production migration or start Phase 5.

### Phase 5 Home and Reflection review

Phase 4 is accepted and complete after merged PR #13 (`953205b`). Run
`npm run dev:foundation` and open `http://127.0.0.1:5173/?phase=5` to review Home and
Reflection on the existing durable store. Close any other Phase 2/3/4/5 editing tab first.
See [Phase 5 status](docs/PHASE-5-STATUS.md), [architecture](docs/ARCHITECTURE-PHASE-5.md)
and [handoff](PHASE-HANDOFF.md). The root demo and earlier review routes are preserved.
This is a local review surface; Phase 6 and later ports, cutover and deployment are gated.
