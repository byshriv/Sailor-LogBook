# ADR 0002: data, migration and cloud compatibility contracts

Accepted direction. Phase 2 local schema/converter/recovery implementation is recorded in
ADR 0005 and ../PHASE-2-STATUS.md. Production cloud merge remains Phase 9.

Preserve wall date/time with timezone/offset context, linked midnight segments and stable
activity identity. Use three deck levels, cycle rejection and inherited excludeFromStreak.
Union eligible logged intervals for all-day totals/streaks. Planned tasks are not logs.
Normal deletion is reversible with Undo and 30 days of trash; causal tombstones outlive
trash where required. Deck deletion reassigns relationships as one reversible command.
These accepted rules are specifications, not features implemented by the sample Entry.

Before any v8 migration, preserve a downloadable source backup and local recovery point.
Preview counts, unsupported fields and ambiguity; validate all destination counts and
attachment hashes before marking completion. Do not clear slb1 or overwrite the cloud.
Persist a versioned migration journal so interruptions/retries are idempotent. Unknown
fields must be retained or explicitly surfaced, never silently dropped. Renamed Time
Wasted decks require review. Retain all best-thing overflow text with four featured items.

Required synthetic fixture matrix: empty/starter; all entity types and settings; 3-level
decks; dur:0 preset; midnight/overlap/DST/travel; photos and editable strokes; sent/seen
bottles; seven achievements; conflicts/deletes; malformed and near-quota data. Full fixtures
and converter belong to Phase 2; no claim of lossless conversion is made in Phase 1.

Cloud direction: versioned manifest with baseline and bounded operation tail, opaque
attachment references and revision-checked commit. Create-only means expected revision
null; stale revisions fail. On conflict re-read and merge/review within bounded retries;
never fetch a fresh revision merely to force the stale payload. Readers validate all
referenced objects before applying a manifest. There is no production wire format yet.

**Compatibility blocker:** old demo clients know no new-format floor. Keep production
transport in a separate versioned namespace; never replace /sailors-logbook.json in this
phase. Before enabling migration, design explicit old-client retirement/join guidance and
how unsynced old edits are imported. Separate files alone cannot reconcile two live
logbooks or prevent the old demo continuing to edit its old file.

Before merge/import/replace capture recovery; abort replacement if recovery fails. Erasure
must quiesce uploads and track generation/revocation barriers with stale-device handling.
Offline device copies and provider retention are outside immediate erasure guarantees.
Do not ship Delete everywhere until partial-failure and resurrection tests pass.
