# ADR 0007: reviewed permanent erasure and cloud deletion barriers

29 October 2026. Phase 9 only. Implements the accepted distinction between Lock,
Disconnect, Erase local data and Delete logbook everywhere. This is application code
and synthetic verification, not authorization to erase an owner profile or live account.

## Scope and confirmation

Erasure is a permanent exception to ordinary Undo/30-day recovery. Selecting an action
opens a read-only preview; cancellation writes nothing. Confirmation requires a scope-specific
typed phrase and explicit no-Undo acknowledgement. The cloud action additionally requires
the owner to stop legacy writers and acknowledge offline copies. Backups are offered through
the existing tools; erasure does not create another retained personal recovery copy.

Local scope is the canonical production database: content, media, operation receipts/tails,
trash, recovery points, source archives, key wrappers and sync state. Separate demo storage,
other profiles/devices, downloaded files and application-shell caches are outside it. The
in-memory key/token and pending PKCE state are forgotten after successful local clearing.
Logical clearing does not promise physical secure erasure of browser/OS storage.

Cloud scope is the current production manifest, legacy `/sailors-logbook.json`, and explicitly
owned media/backup files in the production namespace. Never delete folders recursively.
Allowlist: `/sailor-logbook/v2/{media,attachments}/<64 lowercase hex>[.bin]` and
`/sailor-logbook/v2/backups/<UUID>.json`. Current production stores media in the complete
manifest; these reserved paths cover app-owned objects if present. Unknown/unrelated files
are preserved even inside the namespace. Listing is bounded/paginated; exceeding bounds
fails before starting deletion. No account deletion or provider retention purge is claimed.

## Sequence and durability

1. Stop optional checks, abort/drain this tab's current sync, and read current local/cloud
   state plus the complete owned-file inventory. Existing draft guards block opening erasure.
2. Revalidate the preview and atomically persist a content-free erasure job/fence. From that
   point normal writes, imports, rescue, key/sync updates and operation capture fail closed.
3. For cloud deletion, CAS-replace/create the production file with a content-free `slb-erased`
   protocol-2 marker and a random generation. Read back exact bytes and revision. This marker
   deliberately remains: removing the file would allow empty/fresh clients to recreate it.
   Existing clients reject its unknown active format; new clients explicitly reject it.
4. Delete each reviewed owned file using its exact `parent_rev`. Re-list the owned scope and
   independently verify the unchanged barrier before clearing anything locally. Changed/new/
   recreated files require a fresh explicit preview. No blind retry deletes a newer revision.
5. In one local transaction clear all personal stores, create a blank new actor/checkpoint,
   retain only a content-free result/fence, and change a local handle epoch. Old store handles
   remain unable to write, even after an explicit new local session is started.

A partial/offline/uncertain cloud result retains all local content/keys and the persisted
job. Resume reuses the exact marker and only previously reviewed file revisions; missing
files are harmless, changed files require review. Closing/reloading preserves the fence and
requires reconnection because no token is stored in the job. Pause is best effort, not
rollback. A successful local clear reloads the application to discard the old projection;
first-run onboarding does not stack on the result. Starting a new local logbook is explicit.
The cloud barrier remains and ordinary sync will not recreate a cloud logbook automatically.

## Limits

An in-flight cooperative writer uses the old revision and loses a CAS race to the barrier;
a returning cooperative client cannot upload past it. Legacy demos do not read this new
barrier and may recreate their old file later. Malicious writers with valid provider access
can also alter files outside this protocol. Retire those clients and revoke access manually;
no remote wipe or universal non-resurrection claim is made. Provider deleted-file/history
retention and offline/downloaded copies remain outside the application's control. Explicit empty-cloud restart is now defined in [ADR 0008](0008-phase9-explicit-cloud-restart.md); ordinary sync still refuses the marker.

Primary API evidence: [Dropbox conditional delete](https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/delete-v-2)
and [folder inventory](https://docs.dropboxapi.com/dropbox-api/api-reference/user-endpoints/files/list-folder).
Acceptance/live-account, physical-device and independent security evidence remain open.
Phase 10 and deployment are unstarted.
