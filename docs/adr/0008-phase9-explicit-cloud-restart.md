# ADR 0008: Explicit cloud restart after erasure

Status: implemented for Phase 9 review; live/device acceptance pending.

## Decision

Ordinary synchronization continues to refuse a content-free deletion marker. A separate
Review new cloud logbook action may replace it only after a read-only preview, typed
`NEW CLOUD` confirmation and an explicit empty-logbook acknowledgement. Cancellation
leaves the marker unchanged. Active drafts block entry.

Initial creation requires a fresh, empty local generation with no pending operations,
receipts, recovery/source archives, media or previous sync journal. Existing copies must
be preserved externally and erased locally before this action. The provider namespace
must contain exactly the reviewed production marker: legacy data and explicitly owned
leftovers prevent creation. Unrelated files remain untouched. The marker's exact revision
is the conditional-write precondition; competing or changed cloud copies are never
silently replaced. A random new generation prevents old anchored devices from uploading
without separate explicit rejoin/recovery review.

Configured encryption is a floor: unlock the matching key before confirmation, with no
plaintext fallback. Intent persistence atomically rechecks fresh local state, retained
stores, absence of another sync journal and the expected encryption policy. Once saved,
a pending intent prevents encryption-policy changes. A current key may still be unlocked.
Only the original, verified empty backup is uploaded; this action never restores old data.

## Interruption and receipts

Persist the exact upload bytes, original marker/revision, actor, policy and empty baseline
before requesting a write. An uncertain response leaves a pending request. Ordinary sync
cannot consume it. Explicit review can either retry against the unchanged marker or
verify the identical uploaded content without rewriting it. A changed cloud copy fails
closed. Reload requires reconnecting; encrypted retries require unlocking again.

Read back exact bytes/revision, verify the cloud inventory and backup/decryption, then
atomically commit the anchor with the expected actor, local state and key policy. The
acknowledgement set is always empty. Local edits made after an interrupted request remain
local/pending, appear in retry review and need a separate ordinary sync preview. A failed
receipt transaction retains the intent. UI reports a verified new empty cloud, not Synced.

## Limits

This is cooperative protocol protection. Retire legacy clients and revoke untrusted access
manually. Authorized malicious provider writers, downloaded/offline copies and provider
history remain outside the guarantee. Inventory checks cannot lock Dropbox's namespace;
files recreated after a check need later review. Fresh unanchored copies still follow the
existing explicit first-join/recovery rules. No live account, physical-device, independent
security or Phase 10/native-trust result is inferred from synthetic tests.
