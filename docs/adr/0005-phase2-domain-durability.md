# ADR 0005: Phase 2 domain, durability and migration

28 October 2026. Implements Phase 2 under the owner's explicit continuation request.
LAUNCH-DECISIONS.md remains authoritative. No Calendar or later product port is included.

## Decisions closed here

- Keep Phase 1 proof APIs/database compatible. Use schema 2 in `slb-phase2`, with public
  `domain/src/logbook.ts` and `persistence/src/logbook.ts` entries. The isolated React
  preview at `?phase=2` composes the canonical store with a Redux projection and Web Lock.
  It never reads the live demo's storage. No production identity/deployment is selected.
- Store discriminated deck/activity/task/moment/page/preset/reflection/settings/history
  entities. Retain compatibility payloads and the entire exact raw legacy source in a
  versioned archive. Later feature ports can progressively type those compatibility
  payloads without losing fields. Do not interpret missing timezone metadata as the
  importing device's timezone. Unknown offsets/zones remain null.
- One activity owns its linked day segments. Union intervals for totals and eligible
  streak minutes, with inherited stable exclusion. Explicit start/end offsets account
  for DST elapsed time; missing legacy offsets retain wall-time arithmetic. It is
  impossible to reconstruct unrecorded historical DST context without user evidence.
- Generate a persistent actor once per database. Operations have actor sequence, vector
  clock, command identity and local revision. Validate contiguous causal replay against
  checkpoint/head. Commit head, operation, receipt and supplied media atomically.
  Hashing/encoding happens outside IDB transactions. Publish Saved only after completion.
- Replay remote operations through the same transition without local capture/scheduling.
  Missing dependencies, reused IDs and concurrent branches fail closed for review.
  Production concurrent merge, provider acknowledgements and epochs belong to Phase 9.
- Compact only an acknowledged contiguous prefix. Retain all pending payloads, causal
  tombstones and minimal hashed duplicate receipts. No tombstone/receipt epoch collection
  is safe before the stale-device protocol is established. Offline pending history may
  grow; do not claim constant total database size or a permanent full audit trail.
- Reversible deletes, updates, feature changes and deck reassignment retain compound
  before/after values. Restore is a new causal operation and refuses to overwrite changed
  relationships. Thirty days controls Recently deleted/Undo eligibility. Retained payload
  cleanup and permanent erasure are separate; this phase does not claim physical erasure.
- Keep five ordinary recovery snapshots; migration source recovery is separately retained.
  Full recovery is an explicit causal `recover` command with an atomic pre-restore point.
  Corrupt stores refuse edits but expose raw retained stores for recovery/export. No
  automatic clearing, fallback to legacy storage, or speculative repair is allowed.
- Stage migration by source SHA-256 plus caller-chosen destination generation. Verify
  backup receipt, source/destination digests, relationships and every attachment hash.
  Commit baseline/blobs/completion together. Revalidate before returning a usable state.
  Retry is idempotent, including after new-format edits. Nonempty destinations require
  later explicit import/merge review; this converter never replaces them automatically.
- Require explicit exclusion decisions for non-default legacy decks, because renamed
  Time Wasted cannot be recognized safely. Orphan deck references need explicit reassignment
  or unassignment. A best thing whose source activity was deleted remains unlinked with
  original provenance retained. Overflow moments all keep notebook text; none are featured
  on that day until the later selection flow chooses up to four. Other edits remain usable.
- Deduplicate legacy image bytes by digest and store blobs with paths/references. Do not
  recompress migrated photos or original artwork. New photo preparation defaults to WebP
  through an injected codec; original bytes require explicit opt-in. Reject unsupported
  encoder MIME, excess dimensions/bytes or decode errors. Callers supply explicit budgets.

## Unresolved inputs and boundaries

Empirical phone media limits, OS-kill/storage-pressure behavior, physical Safari/Android
coverage, production namespace/merge/retirement UI, encryption/rotation and native trust
remain their documented release gates. The 2048px/~1 MiB candidate is not a shipped limit.
WebKit can lack WebP canvas encoding; preserve the draft and report unsupported encoding,
never relabel fallback PNG/JPEG. A user-facing capability fallback belongs to the photo port.

Migration takes an unencrypted `slb1`/v8 JSON state backup. Encrypted/cloud record envelopes
must first pass the appropriate later reader/unlock/review flow. They are rejected here,
not guessed. The backup callback must actually save/verify the raw backup and return its
digest; a test callback is not a production downloadable-backup implementation. No real
backup or cloud file was read in this phase. See PHASE-2-STATUS.md for exact evidence.
