# v8 cutover and rollback contract

Reviewed for Phase 1 on 28 October 2026. Phase 2 now implements the synthetic unencrypted
v8 state-backup converter/journal in packages/persistence/src/migration.ts and logbook.ts.
See ../PHASE-2-STATUS.md and ../adr/0005-phase2-domain-durability.md for evidence and limits.
Real cloud activation remains Phase 9. This contract does not migrate or erase user data.

1. Read legacy data without mutation. Record source schema, raw-byte digest, cloud revision
   (when present), entity/attachment counts and unknown fields. Preserve raw source bytes as
   a downloadable backup plus a local recovery point. Abort if recovery cannot be saved.
2. Preview destination counts, conflicts, renamed-deck streak-exclusion ambiguities and any
   unsupported fields. Preserve unknown fields in a versioned legacy extension/archive;
   block conversion if a required field cannot be retained. File selection alone changes nothing.
3. Stage the versioned destination with a migration journal keyed by source digest and
   destination generation. Validate counts, relationships, original wall times and every
   attachment content hash. Interrupted retries resume or discard staging, never mark a
   partial conversion complete. Never clear slb1 simply because IndexedDB opened.
4. Commit the verified baseline and completion marker atomically. Enable editing only after
   reopening/revalidating it. Keep the source/recovery copies. Capture the migration baseline
   once rather than replaying its records as new user interactions/notifications.
5. Production cloud data uses a new versioned namespace/manifest. Never replace or rename
   /sailors-logbook.json to force conversion. Old clients cannot understand a protocol floor;
   a new file alone cannot stop old clients editing their old copy.
6. The cutover screen explains which device should become authoritative and asks users to
   export pending edits from every old device, then stop editing the demo. Record the legacy
   cloud revision at cutover. A later legacy revision change triggers a visible import/review
   warning; it never silently replaces the new logbook. Import an old device's pending backup
   through preview/recovery/merge, preserving IDs, dates and provenance. Do not claim that
   remotely retiring an old browser erases its offline copy or prevents its old-file uploads.
7. Rollback before new edits can reopen the unchanged demo. After new-format edits, preserve
   a production backup first. Frontend rollback must honor database schema floors. Do not
   promise a lossless downgrade or automatically resume writing the legacy cloud file; that
   would create two independently changing copies. Retain a read/export recovery path.

Required Phase 2 tests include complete synthetic legacy entities/settings, dur:0 presets,
three-level decks, midnight/overlap/DST/travel, editable drawings/photos, best-thing overflow,
sent/seen bottle history, seven achievement states, deletes/conflicts, malformed/near-quota,
repeat/interrupted conversion, unknown fields and destination/source digest mismatch.

Owner real-backup rehearsal requires their participation in a later migration phase.
No personal backup should be committed or attached to a public issue.

## Phase 2 API integration

`previewV8(raw, options)` is pure with respect to storage. Its preview contains per-kind
counts, review items, unknown top-level fields and digest-addressed attachment paths.
Unknown nested fields remain in each legacy payload and the complete raw-source archive.
Source/destination equality and hashes are checked again by `migrateV8`. Decode errors,
duplicate IDs, bad relationships, missing recovery capacity and size-limit failures stop
before activation; staged data is retained for retry rather than partially adopted.

The caller must save and verify a downloadable source backup and return its digest from
the supplied callback. Then stage source recovery and destination together; activation
atomically installs baseline/blobs/completion in an empty destination only. Completed
same-generation retries preserve later edits. Never supply a fake backup receipt in a
user-facing flow; tests deliberately inject a synthetic callback. Real backup UI is later.

All non-default deck exclusions need explicit review; missing deck references need an
explicit target or null decision. Overflow days migrate with no featured moments until
selection, retaining all text. Deleted-activity best things retain their text and original
reference provenance while becoming unlinked. Missing original timezone/offset context
stays unknown. Do not reinterpret it through the importing device's timezone.

The reader deliberately rejects encrypted and slb-records cloud envelopes. Their later
readers must unlock/materialize/validate them before the same preview/recovery policy.
No legacy cloud transport, automatic live-origin migration or lossless downgrade is shipped.
