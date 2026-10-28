# v8 cutover and rollback contract

Reviewed for Phase 1 on 28 October 2026. Implementation and fixture completion are Phase 2;
real cloud activation is Phase 9. This contract does not migrate or erase user data.

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
