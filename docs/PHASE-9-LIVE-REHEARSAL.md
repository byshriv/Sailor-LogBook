# Phase 9 live acceptance rehearsal

Status: required evidence, **not run**. Synthetic regressions are recorded separately in
VERIFICATION-PHASE-9.md. Use a dedicated Dropbox App Folder application, disposable browser
profiles/accounts and invented records/media. Do not paste tokens, recovery secrets or
personal backups into GitHub, screenshots, logs or bug reports. This rehearsal does not
accept Phase 9, authorize real-data cutover, start Phase 10 or deploy the app.

## Preconditions and evidence

Record commit/build hash, OS/browser/device versions, network conditions and pass/fail for
each step. Keep secrets and test backup files privately. Register the exact HTTPS callback
`/?phase=9&tool=help`, public app key and content read/write plus metadata read scopes.
Confirm App Folder isolation and real CORS/revision headers. Use the existing local preview
or an already authorized secure review environment; a new deployment requires separate
owner authorization. Confirm all original data is backed up before testing any deletion.

## Two-device transfer and interruption

1. On clean A, save invented records/media, connect Dropbox and preview plain sync before
   setting up encryption. Cancel once and verify cloud/local state is unchanged. Apply,
   read back the exact provider revision and verify pending operations clear only then.
2. On nonempty B, save different records and an overlapping edit. Preview both copies;
   verify the external backup and local recovery point, select conflict alternatives and
   merge. Confirm all media and losing alternatives remain recoverable after reload.
3. Edit independent fields on both devices, edit/delete the same record, and delete while
   the other device is offline. Reconnect and review. No unreviewed resurrection or lost
   local operation is acceptable. Test featured-moment overflow and foreign tombstones.
4. Disconnect the network before upload, after provider commit but before response and
   before local receipt. Reopen/reconnect and verify pending intent recovery. Save another
   local edit during an uncertain result: it must remain pending until separately synced.
5. Repeat with expired/revoked consent, 429/5xx responses, changed provider revision and
   tab sleep/return. Authentication/conflict errors stop automatic checks. Temporary read
   retries are bounded; Retry-After is respected or automatic checks pause. No automatic
   merge occurs. Drafts survive and prevent automatic review from interrupting editing.
6. Change screens/reload. Confirm the app says reconnect; it must never imply credentials
   or checks survived navigation. Ctrl/Cmd S reports local pending status without claiming
   fresh cloud state. Closed tabs perform no promised transfer.

## Encryption, recovery and old clients

7. Enable optional full-content encryption; save/reopen/verify the kit before completing
   setup. Check invented text and media are absent from the wire. On B, test wrong input,
   tampered payload and recovery unlock. No plaintext fallback or empty overwrite.
8. Rewrap passphrase/recovery kit, then replace the content master/generation using the
   verified external-backup flow. Interrupt each transfer and verify exact-intent recovery.
   Old kits continue to open their own historical backups; old anchored devices are
   blocked by the new generation and retain unsynced edits. Revoke untrusted provider
   access manually; rotation cannot revoke an offline copy or malicious token holder.
9. Export old unencrypted and encrypted demo backups from each old device, verify/import
   through Phase 8, preserve unknown fields and review renamed streak-exclusion rules.
   Stop legacy writers, then confirm the legacy revision/cutover review. Recreated legacy
   files or unknown protocol/KDF versions must stop transfer for review.
10. On disposable fixtures only, test local erasure and Delete logbook everywhere with a
    held in-flight check/upload, partial conditional deletion and changed/recreated files.
    Verify retained local content/keys on partial failure, resumption after reload and
    local clearing only after independent cloud verification. Check unrelated files remain.
11. Explicitly start a fresh local session after erasure. Confirm ordinary sync refuses the
    deletion marker. Review/confirm NEW CLOUD; test plain and configured encrypted modes,
    lost responses and late local edits. Only the empty baseline may be created/verified;
    old devices may not silently upload into the replacement generation.

## Platform and security gates

Record actual Android 12+/lower-memory media/KDF/storage budgets, iOS/iPadOS 17+ Safari/PWA
and desktop coverage, not just Playwright WebKit. Test quota exhaustion and retained
recovery growth with realistic synthetic media. Review browser session-only key handling,
plaintext IndexedDB/recovery, Dropbox metadata/history and logical-erasure limits. Independent
security review remains unavailable until an actual reviewer supplies evidence. Native
Keystore/trusted unlock and Android lifecycle/widgets remain Phase 10, outside this PR.

For each failure, record the synthetic repro, expected/actual result, data-preservation
check and fix/retest commit in the review register. Keep release issues #2 and #3 open
until their respective live/platform/security and later native evidence is accepted.
