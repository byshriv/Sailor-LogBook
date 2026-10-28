# Dropbox source review

Reviewed on 26 October 2026 against Super Productivity’s `master` branch. This is a focused source-level review of its Dropbox provider, not a full audit of its operation-log architecture.

Primary sources:

- [Dropbox provider](https://github.com/super-productivity/super-productivity/blob/master/packages/sync-providers/src/file-based/dropbox/dropbox.ts)
- [Dropbox HTTP API implementation](https://github.com/super-productivity/super-productivity/blob/master/packages/sync-providers/src/file-based/dropbox/dropbox-api.ts)
- [Sync configuration documentation](https://github.com/super-productivity/super-productivity/blob/master/docs/wiki/2.09-Configure-Sync-Backend.md)
- [Dropbox OAuth guidance](https://developers.dropbox.com/oauth-guide)

The provider’s `getAuthHelper` pairs a cached PKCE verifier with the authorization URL and asks for offline access. Its current `_getRedirectUri()` returns null for a manual authorization-code flow, with comments explaining its cross-platform reliability rationale. The token exchange supplies `client_id` and `code_verifier`; the refresh path uses the refresh token. The implementation bounds an expired-token retry.

The provider’s `uploadFile` preserves the caller’s expected revision instead of fetching a newer revision and overwriting a concurrent writer. The HTTP layer chooses `update` with the expected `rev`, or `add` when creating a file. It translates Dropbox path conflicts into a distinct revision-mismatch error. It separates provider credentials from synchronized data and sanitizes credential-related logging.

Sailor Logbook follows these authentication and revision-check patterns in an independently written browser implementation. It does not copy Super Productivity’s Angular infrastructure or claim to implement its full operation-log protocol. Our merge format is a versioned record document with per-record causal clocks, deletion tombstones, deterministic conflict selection and recoverable losing edits. Notebook lines are separate records; drawings are page/line records. Encrypted documents wrap the whole envelope.

Unlike the provider’s manual code return, Sailor Logbook uses the owner-requested redirect flow, with a state nonce, expiration/origin checks and PKCE. The live handoff reached Dropbox’s sign-in page after the owner registered the redirect URLs; account approval and actual transfers were deferred by the owner.

The local transport suite uses mocked responses to exercise first creation, expected-revision updates, competing uploads, refresh, disconnect, offline failures and edits during upload. Two independent clients additionally exercise a fresh-device join, bidirectional changes and encrypted joins against an in-memory revision-checked Dropbox simulation. These are not live account tests.

The selective scheduler is independently implemented: forced pull on open, throttled return/screen checks, a pause after saved edits, a visible periodic check, manual control and best-effort pending uploads on hide/close. Manual-only and five-minute settings remain available. Routine background successes are quiet; repeated failures are limited. This adapts the product’s sync-on-use approach without claiming identical scheduling or protocol. Shortcut conventions also reference the [official keyboard documentation](https://github.com/super-productivity/super-productivity/blob/master/docs/wiki/3.03-Keyboard-Shortcuts.md).

Keep research downloads out of deployment packages; source links above remain the reference.

## Final demo fixes — 27 October 2026

The owner’s screenshots show Super Productivity’s App Folder containing older/configuration files (including `_meta_`, archives, globalConfig and plugin data), plus `sync-data.json` and a backup. These screenshots provide product context, not an interoperability format. Sailor Logbook retains its existing revision-checked `/sailors-logbook.json` format so already-connected devices remain compatible.

The owner reports basic live mobile/desktop transfer works. The reported “Invalid preset” setup failure was reproduced with the application’s own duration-free preset representation (`dur: 0`). The validator now accepts that valid representation, including in cached history and decrypted documents. Initial unencrypted sync starts automatically; encryption is a later optional setting. Encryption changes wait for an existing upload to finish, preventing a plaintext upload from racing an encryption setting. Callback processing is shared by one promise; reused/expired codes get actionable errors. The owner’s isolated first-grant failure was not reproduced and is not claimed conclusively fixed.
