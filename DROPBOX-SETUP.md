# Dropbox setup

The public app key supplied by the owner is already in `config.js`. No app secret or generated access token belongs in the source or deployment.

## App Console

1. In the [Dropbox App Console](https://www.dropbox.com/developers/apps), use a scoped app with **App folder** access.
2. Enable and submit `files.content.read` and `files.content.write` in Permissions.
3. Under Settings → OAuth 2 → Redirect URIs, save these exact addresses, including the trailing slash:
   - `https://logbook.shriv.work/`
   - `http://localhost:4174/`
4. If the production hostname/path changes, register its exact root URL too. Local tests must use `localhost:4174`, rather than `127.0.0.1` or another port. In PowerShell: `$env:PORT='4174'` then `npm run dev`.
5. Keep development-mode account limits in mind when inviting other users; complete Dropbox’s production-access process when needed.

The owner confirmed both URLs are saved. A fresh authorization request reached Dropbox’s sign-in page. The owner later reported successful mobile/desktop transfers. Agent-led account login and consent remain deferred; the revised setup is covered by simulated tests.

## What the app does

Connect Dropbox redirects to Dropbox with a PKCE challenge and random state nonce. The callback validates the request and exchanges the code once, without a client secret. A new or unencrypted copy starts syncing immediately. An empty folder connected during welcome waits for profile setup before uploading the first logbook. Encryption is an optional later action in Sync settings; cancelling its form keeps ordinary sync usable. An already-encrypted copy requires its existing passphrase. Passphrases stay only in the current tab’s memory, so reopening an encrypted logbook requires unlocking sync again.

Only `/sailors-logbook.json` inside the App Folder is used. Credentials are device-local and excluded from backups and synchronized data. Do not rename this remote path during a branding update.

The v7 demo fixes validation of presets with no duration (`dur: 0`). The reported v6 error is consistent with this bug and does not itself show that a conflict occurred. Genuine conflicts are separately flagged on the sync control; open it to compare versions and choose which one to retain. Device/Dropbox labels are used when the source is identifiable. The agent has not inspected the owner’s live Dropbox conflict state. Update both devices to v7 before retesting.

## Deferred live acceptance check

After deployment, use two actual devices with separate browser storage. Authorize each, create a phone entry, return to the desktop and verify automatic download; edit the desktop notebook and verify the phone receives it. Test offline edits on both devices, a simultaneous edit to the same record, conflict recovery, a fresh-device join, disconnect, and an encrypted join after reopening. Export backups before testing with valuable data.

Do not rely on closing the browser to finish an upload. Use the status control when you need explicit confirmation before leaving. Automatic successes are quiet; explicit sync reports completion. Live transfer, CORS, real token refresh and physical-device behavior have not been certified by the simulated tests.

Authentication design follows [Dropbox’s OAuth guidance](https://developers.dropbox.com/oauth-guide); the Super Productivity source review is recorded in `research/SYNC-REVIEW.md`.
