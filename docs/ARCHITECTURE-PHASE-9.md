# Phase 9 — Dropbox, joining and optional encryption

29 October 2026. Base: PR #17 merge `df2310d`, including `9d01b6c`. Phase 8
accepted by owner instruction. Only Phase 9 is authorized. No deployment, personal
data, live Dropbox consent or Phase 10 native work occurred.

## Composition

`/?phase=9&tool=help#sync` opens Settings with Dropbox synchronization. Earlier
routes/screens, domain schema 2, `slb-phase2`, editor Web Lock, Redux projection,
media pipeline, operation receipts and recovery tools remain. Production browser
root includes the same tools; native entry remains the existing proof. README and
DEPLOY owner diffs are excluded. No frozen demo files change.

`packages/sync-providers/src/dropbox.ts` injects HTTP/token access and implements
PKCE S256 and Dropbox download/upload with create-only or the caller's exact `rev`.
No autorename, force overwrite, fresh-revision substitution or token persistence.
The callback verifier/state live in tab session storage for at most ten minutes;
callback processing consumes them and removes code/state from the address bar.
Access tokens and nonextractable content keys live in memory. Reload/navigation
requires reconnection. Browser public clients request short-lived online access;
there is no browser refresh-token flow or embedded client secret.

Configure a public **App Folder** Dropbox app key through
`VITE_DROPBOX_APP_KEY` or the review field. Register the exact secure-origin callback
`/?phase=9&tool=help`, and grant `files.content.read`, `files.content.write` and
`files.metadata.read`. App registration/permissions and a real two-device rehearsal
must be verified before accepting production readiness. No app was registered here.

API references checked during implementation:
[Dropbox OAuth](https://docs.dropboxapi.com/dropbox-api/docs/oauth),
[upload revision semantics](https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/upload).

## Transport and durable operations

Production exclusively writes `/sailor-logbook/v2/logbook.json`; it never writes,
renames or deletes `/sailors-logbook.json`. Manifest format `slb-sync`, protocol and
reader floor 2, random generation, explicit plain/encrypted mode, optional wrappers
and complete backup payload. Unknown versions fail closed. A known generation
disappearing/changing never causes automatic cloud recreation.

This first transport deliberately uses **complete verified baselines**, rather than
replaying another device's local causal commands. Each local mutation still uses
the existing durable command/receipt pipeline. A merged baseline becomes one
recover command with expected-state protection and Undo. Local pending operations
remain until their represented state has been uploaded and verified. Nothing calls
checkpoint automatically. This does not establish cross-device operation-tail
compaction interoperability or use the Phase 1 fake envelope as a production format.

The app composition `sync-engine.ts` joins framework-independent provider, crypto,
merge and persistence ports. `sync-core/reconcile.ts` has no domain/browser imports.
It compares local/cloud entities against this device's last verified baseline.
Independent top-level field changes merge; arrays/opaque nested fields conflict.
Delete versus edit conflicts require a choice. A first join checks tombstone
barriers even without a shared baseline. Safe deletion from a known baseline stays
deleted on a stale device. Relationships validate before apply. If combining copies
produces more than four featured moments on a day, every text remains in Notebook
and all moments for that day become unfeatured pending the existing Home chooser.
The preview asks the user to choose up to four after sync; unrelated changes continue.
Source recovery retains both original selections. No moment text is discarded.

Foreign deletion barriers travel in the verified shared payload and durable anchor,
separately from the unchanged local actor's reducer/tombstones. An empty joining device
preserves those barriers in its next upload. Live content crossing any known deletion
barrier requires explicit review, including a Dropbox historical rollback under the same
generation. The upload intent retains the shared baseline for interrupted acknowledgement
recovery. This preserves old operation replay semantics without allowing an empty join
to remove shared deletion history. Ordinary local backups retain local causal history;
the incoming cloud source/anchor separately retain foreign barriers.

Every apply re-reads Dropbox, re-creates/compares the preview, checks local actor/state,
verifies a media-complete local recovery point, and retains the verified incoming
backup in unaged `migration` records keyed by payload digest. Those cloud copies
retain remote trash, opaque history and conflict alternatives without pretending
their local causal receipts belong to this device. Review retained Dropbox copies
in Storage & data to preview/recover them. Ordinary backups cover current state and
all retained blobs; retained incoming snapshots are separately recoverable and are
also included in the retained-store forensic export. They are not aged out here;
quota failure aborts further merging. Distinct opaque archives use a deduplicated,
sorted set so alternating devices cannot recursively nest archives every sync.

A durable sync journal records exact upload bytes, represented local baseline,
included pending IDs, actor and generation **before** the revision-checked upload.
After upload, a second download must match both returned revision and exact bytes.
Payload/media are validated again. A serialized local transaction checks actor and
state and atomically records the anchor plus acknowledgements. Only then may UI show
Synced, and later local edits invalidate that status. Cancellation, read-back failure,
CAS races, quota and expired auth keep operations pending. An uncertain successful
upload can recover its receipt from byte-exact read-back after restart; a timeout
alone cannot acknowledge anything. No blind automatic overwrite/retry loop exists.

Sync is manual by default. Optional minute checks run only on this open Settings
screen, stop for drafts/modals and open a preview. They never apply a nonempty merge
without review. There is no closed-app/background transfer guarantee. Other screens
continue local editing; they do not secretly sync. Parent draft/navigation guards and
mutual data-tool/sync busy guards protect active drafts. Closing/OS killing an unsaved
draft still has the documented browser limitations.

## Keys and backups

`crypto/content.ts` uses pinned hash-wasm Argon2id (19,456 KiB, two iterations, one
lane, 16-byte salt) and WebCrypto AES-256-GCM. Fresh 256-bit master and recovery secret,
independent passphrase/recovery wrappers and random 96-bit nonces. An allowlisted KDF
identifier prevents attacker-selected memory/iteration costs. Content AAD binds format,
logbook generation and the complete wrapper setup/key ID. Ciphertext includes all
backup content/media, not only selected text fields. Wrong secrets and tampering fail.

The recovery file and printable, versioned/checksummed code represent the same random
secret. Users must save/print and re-enter it; an encrypt/decrypt probe proves it unlocks
the same key before wrappers are persisted. Wrappers/encryption policy stay in local
metadata independently of the session key. Configured/previously encrypted copies fail
closed while locked. No secret is uploaded in plaintext or added to diagnostics.

Configured users are directed to encrypted backup download by default; plaintext export
remains explicitly labelled. Encrypted backup selection decrypts/verifies before entering
the existing Phase 8 Merge/Replace preview. Backups carry their own wrappers, so older
backups can unlock with their original passphrase/recovery code without Dropbox or a
current session key. Unlocking an old backup does not replace current sync key policy.

Lock forgets this tab's key; it does not encrypt/hide IndexedDB or clear local content.
Disconnect only forgets this tab's provider token. The separate erasure flows below
require explicit permanent-deletion confirmation.
Content-key replacement is implemented as described below. Dropbox access revocation
remains manual. The code refuses
unreviewed remote generation changes; explicit device rejoin needs a matching external
backup, verified local recovery, typed JOIN and retained old sync journal. Encryption
policy remains enforced. Phase 8 damaged-store rescue clears sync metadata and creates
a new actor; returning rescued data always enters first-join/tombstone review.

The combined passphrase/recovery-kit change authenticates the current passphrase or
recovery code, verifies the new passphrase, and requires saved recovery-code reentry.
It rewraps the same master using fresh salt/nonces and a new recovery secret. Users
can keep their passphrase when only replacing their recovery kit. Current encrypted
copies must already have a reviewed, verified sync with no pending local operations.
The change verifies local recovery, retains the old incoming copy, persists an upload
intent, and revision-checks a complete re-encrypted manifest. Independent read-back and
payload/media validation precede one local transaction updating policy and anchor while
archiving the old policy. Failure retains old policy and a retryable intent; exact
read-back recovers an uncertain successful change without another write. Other devices
cannot upload using old wrappers over the new manifest. Old backups retain their own
wrappers and original unlock routes. This changes credentials, not the content key:
cached keys, provider tokens and historical ciphertext remain accessible to their holders.
Interrupting or canceling after upload is not a rollback; reconnect/preview using the
newly saved kit to determine the outcome.

For content-key replacement/lost-device recovery, authenticate the old wrapper, verify
a current external backup, review provider access, type ROTATE, and create/verify a new
passphrase/recovery kit. The master, key ID and cloud generation are all new. Every byte
of the verified shared backup—including retained media—is re-encrypted under the new
master before a single CAS manifest replacement. The old master cannot decrypt the new
payload. The same durable intent/read-back/atomic-policy path handles failures, with a
content-key transition marker allowing only that device's exact upload to cross the old
generation barrier. An uncertain transition validates the new ciphertext and media using
the new key before committing its receipt. Local edits saved after upload remain pending;
they are neither acknowledged nor overwritten by transition recovery. Old/rescued devices
without the matching intent require normal explicit join/review and the new secret.

The provider guide links to [Dropbox's device/account security guidance](https://help.dropbox.com/security/unknown-device-linked).
Users must review/revoke untrusted devices, sessions and connected apps there and reconnect
as needed. The app cannot enumerate or selectively revoke other devices' tokens. Keeping a
valid provider token can permit malicious file replacement/deletion outside this cooperative
protocol. Key rotation protects new ciphertext, not old cloud revisions, backups, plaintext
local databases or offline copies. No remote wipe or successful provider revocation is
inferred from the in-app acknowledgement. No personal account was modified during testing.

## Permanent erasure

Settings now separates Erase local data and Delete logbook everywhere from Lock and
Disconnect. Each starts with a read-only preview and a typed, no-Undo confirmation.
Active drafts block entry. Opening erasure stops minute checks and aborts/drains current
sync before preparing its preview. After confirmation, a persistent local fence blocks
normal mutations and synchronization until completion, including after a reload.

Cloud deletion first CAS-installs and reads back a content-free `slb-erased` generation
barrier at the production path. The barrier deliberately remains; both old strict-format
clients and current clients refuse automatic recreation. The legacy file and explicitly
owned media/backup files are removed individually using their reviewed revisions. A full
owned-scope re-list and barrier read-back must succeed before local clearing. Changed or
reappearing files require another explicit review. Partial/offline/uncertain results retain
all local content/keys and a retryable job, with no stored credentials or journal payload
in that job. A matching uncertain marker upload can resume without another write.

Local clearing atomically removes content, media, receipts/tails, trash, recovery/migration
archives, sync state and key wrappers; installs a blank actor/checkpoint; and retains a
content-free result/fence. A changed handle epoch prevents pre-erasure store handles from
writing even after the user explicitly starts a new local session. The completed app
reloads to drop its projection and memory-only credentials. Separate demo storage, other
profiles/devices, downloaded backups and application-shell caches are preserved.

No physical secure-wipe or Dropbox history purge is claimed. Cooperative stale uploads
lose the old-revision race or refuse the barrier. Legacy demos can recreate their old
file later; malicious authorized writers can also alter cloud files outside this protocol.
Retire/revoke those writers manually. Ordinary sync remains blocked by the barrier; the
separate explicit empty-cloud restart is described below. Exact ownership grammar,
limits and verification sequence are in [ADR 0007](adr/0007-phase9-permanent-erasure.md).

## Compatibility and limits

Legacy metadata revision is read on preview, before upload and after read-back.
A first/new legacy revision requires explicit confirmation that old writers stopped and
their latest verified backups were reviewed/imported. A change during transfer prevents
acknowledgement. The unchanged demo exports its materialized state, including when its
cloud file is encrypted; use that export through Phase 8's v8 converter. New transport
never interprets legacy encrypted/record envelopes as empty state or rewrites them.
There is no automatic cross-format live reconciliation. Offline old browsers cannot be
remotely retired; collect each one's unsynced export, stop both-way editing, then review.

Whole-file backup limit is 64 MiB; encrypted wire limit 96 MiB including base64 overhead.
Transfers are memory based and include retained media. No streaming/large-logbook or mobile
memory budget is claimed. Metadata, lengths, account and timings remain visible. Earlier
plaintext Dropbox versions/downloads are not retroactively protected. IndexedDB/recovery
archives are plaintext. JS/runtime copies cannot be guaranteed securely erased.

This is an independently implemented protocol/codec using vetted primitives, not an
independent audit. Real Dropbox grant/expiry/CORS/app-folder scope, real network races,
physical Android/Safari resources, Firefox and secure native key storage still require
actual evidence. No Keystore adapter or native trust is simulated. Phase 10 is unstarted.

## Explicit cloud restart after erasure

A separate typed/acknowledged new-cloud preview can now replace the reviewed deletion
marker with a fresh empty generation. Initial local content and all retained personal
history must be empty; no prior sync journal or owned cloud leftovers/legacy file may
remain. Fresh state and configured encryption policy are checked atomically when the
exact request is persisted. Configured encryption requires unlock and cannot downgrade.
The production marker's exact revision is the CAS precondition; no files are deleted.

A persisted uncertain request blocks ordinary sync and policy changes. Explicit retry
verifies or retransmits only the original empty baseline. Read-back, namespace and backup
verification precede the atomic anchor receipt; no local operation IDs are acknowledged.
Later local edits remain pending for separate sync review. Known old-generation devices
stay blocked and keep their unsynced edits. This replaces the earlier local-only restart
limitation; [ADR 0008](adr/0008-phase9-explicit-cloud-restart.md) defines the boundary.
