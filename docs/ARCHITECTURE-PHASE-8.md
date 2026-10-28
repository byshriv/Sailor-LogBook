# Phase 8 architecture — local data and production PWA

28 October 2026. Phase 7 accepted by owner instruction. Base `main` was fetched and
fast-forwarded to `887fcdda9855e6fad62f5c05589110f8b25412aa` (PR #16), including
`e7b77bbfb11429ee48c48ed4a5b8dbebe89cc5af`; zero ahead/behind with origin/main.
Only Phase 8 is authorized. No Dropbox transport, encryption/key setup, native port,
deployment or real-data cutover is implemented here.

## Composition and review

`/?phase=8` composes the accepted Settings screen with Backup and recovery under
Storage & data. Existing phase routes and screens remain. The production build's
root opens this integrated management surface; the dev root retains the Phase 1 proof.
All production browser entry routes initialize offline installation. The existing Capacitor
proof keeps its Phase 1 entry and does not register a web service worker. Domain schema 2,
`slb-phase2`, verified replay, digest media and the shared `slb-phase2-editor` Web Lock
remain canonical. Redux refreshes only after successful durable writes. Root demo and
all frozen reference files remain untouched. README/DEPLOY owner diffs remain uncommitted.

## Backup and import

`packages/persistence/src/backup.ts` defines plaintext `sailor-logbook` version 1 /
schema 2 files. The envelope includes creation time, a canonical payload SHA-256,
full current state (including trash/tombstones/archive) and digest-checked base64 media.
All retained blob objects are exported, including originals and media no longer live.
No recompression, credential reader, cloud call or automatic upload is introduced.
SHA-256 detects corruption, not sender authenticity. Files contain personal data.
Encrypted backup/key setup remains Phase 9; no configured production encryption policy
exists to downgrade. Download is explicit and labelled plaintext. A download event does
not prove a disk write; users can reopen the actual file through Preview import.

The provisional whole-file transfer limit is 64 MiB; legacy embedded images retain the
existing 8 MiB per-image limit. Encoding/parsing uses memory and is not streaming. Bigger
logbooks require later bounded/streaming transfer work; rejection never trims data.

Selecting a file opens a read-only preview. Future formats, malformed input, checksum or
media failures are rejected. Old unencrypted v8 state files reuse `previewV8`; ambiguous
streak exclusions require per-deck decisions. Orphan references require an explicit
uncategorized decision. Unknown fields and exact source text remain archived. Encrypted
legacy envelopes are rejected rather than interpreted as empty state.

Merge adds new IDs. Collisions and local deletion barriers require an individual Keep
local / Use imported choice. Invalid combined relationships or featured-item limits block
Apply and explain review/Replace. Replace explicitly replaces current records/settings.
The full incoming state stays archived, so imported historical trash/tombstones remain
recoverable even though they are not adopted as this device's causal operation history.
Current local trash, deletion barriers and all blobs remain retained. This is local file
import, not Phase 9 concurrent synchronization or a provider acknowledgement.

Before Apply, source is parsed and verified again, and current canonical state must match
the preview baseline. `commit` checks that baseline again inside its serialized transaction.
The existing causal `recover` command creates a pre-import point, reads it back and compares
its state before writing head/tail/receipts/media. Any failure aborts the entire transaction.
No Saved projection publishes early. The 30-day Recent changes Undo also remains available.
Ordinary recovery retains five points; migration sources are separately retained.

## Recovery and health

Manual points are read back and compared. Recovery selection requires explicit confirmation;
restoring a healthy store uses the existing causal recover command and a pre-restore point.
Recovery snapshot reads now verify every referenced media hash before returning it. Point IDs
match their store keys, including `restore:` points, so they survive listing/reopening.

If Phase 8 startup replay fails, the local recovery screen offers a retained-store forensic
export (with recursively encoded Blob bytes, including nested migration/rescue records) and
validated local snapshots. With no valid snapshot it retains data and explains manual recovery;
there is no automatic reset. Forensic exports are separate from importable backups.

Explicit damaged-store rescue atomically archives every store in an unaged migration record,
reads the archive back, then installs a validated snapshot as a fresh baseline with a new actor.
Old head, checkpoint, tail, receipts, migrations and media remain in that archive; blobs/recovery
stores are retained. No old operations are acknowledged. A future Phase 9 adapter must treat
this as a new local generation requiring join/review, never upload it as old-history continuity.
Rescue with missing/corrupt snapshot media or archive write failure must fail closed.

Health verifies replay/live hashes, reports retained operation count without implying cloud
sync, exposes estimated usage/quota, warns above 80%, and distinguishes persistence grants.
The existing explicit persistence request remains. Estimates can be unavailable, change or
cover other origin storage; grants are browser decisions. Local points share the database's
failure/eviction boundary. Browser/OS clearing and unsaved drafts lost to OS kill remain limits.

## Production offline and updates

`scripts/production-pwa.cjs` runs after the Vite build and notices. It copies original icons,
creates a scoped manifest and hashes the complete artifact into an owned cache name. Every
lazy screen chunk, stylesheet, local font, icon, HTML and notices file is precached. Installation
fails atomically if any required resource fails, deleting only that new cache. Navigation uses
the active release's cached shell; asset reads use that release's cache. Journal data never
enters Cache Storage. Non-GET/external/unlisted requests are not cached.

No `skipWaiting`, `clients.claim` or controller-change reload exists. A waiting update stays
waiting until **all controlled old pages close**. The status tells users to save, close all
tabs and reopen. The explicit choice is to finish work first or close/reopen when ready;
there is no force-reload button that can bypass another tab's draft. Old pages retain their
whole old shell. An installation failure leaves the old active worker/cache usable. Activation
cleans only `slb-production-*` caches. There is no schema upgrade in this phase and no claim
that a frontend rollback can downgrade an incompatible future database.

Development never registers the production worker. The build requires a dedicated HTTPS origin
(or disposable localhost preview), separate from the live demo. Registration refuses an existing
foreign/demo service worker; it never unregisters another app or deletes its caches. A shared
origin is not an authorized cutover. No hosting configuration or live installation was changed.
The generated `_headers` requests no-cache for worker/HTML and immutable hashed assets; actual
hosting promotion and validation remain Phase 14. Build and test the same artifact.

Install UI depends on browser/platform; iPhone/iPad instructions use Share → Add to Home Screen.
Secure context, service-worker, IndexedDB and Web Locks support remain required. No physical
launcher, real Safari, phone pressure, suspension or OS-kill pass is implied by Playwright.
Reference API behavior: [worker lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting),
[persistence permission](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).
