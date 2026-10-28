# Phase 2 implementation and verification

Updated 28 October 2026. Local implementation delivered; no publication/deployment or
real-data cutover performed. Main was fetched and verified equal to origin/main at
`c0f3afa` (zero commits ahead/behind), with a clean workspace before edits. Phase 1 history
was preserved. No Calendar, Notebook, Reflection, Planner or Settings port was started.

## Delivered

- Versioned domain entities/commands and compatibility archive; three-level hierarchy,
  cycle/reference validation, linked midnight identity, elapsed interval unions, inherited
  exclusions, explicit offset/DST context, reviewed task rollover and preserved history.
- Undo/30-day recovery, compound reassignment and relationship restoration, retained
  tombstones, explicit full-snapshot causal recovery and five ordinary recovery points.
- Canonical IDB store, durable actor/vector sequences, atomic operations/receipts/media,
  validated replay, checkpoints, pending acknowledgements, safe payload compaction, restart
  idempotency, corruption export and failure-safe serialized gateway.
- React/Redux composition seam and isolated synthetic storage preview with local save,
  delete, Undo, manual recovery snapshot and one editing tab. Run `npm run dev:foundation`
  and open `http://127.0.0.1:5173/?phase=2`. The default Phase 1 preview stays compatible.
- Lossless v8 state-backup preview/converter, backup verification hook, retained raw source,
  unknown fields, deterministic generated IDs for formerly un-IDed presets, source/destination
  hashes, review blockers, deduplicated media and atomic resumable staging/completion.
- Bounded photo preparation with browser codec, checked MIME/dimensions, opt-in originals
  and explicit caller budgets. Migration retains original photo/drawing bytes and strokes.

The APIs and design rationale are in ADR 0005. Compatibility payloads for later screens
remain JSON rather than pretending those screens or their complete editors already exist.

## Verification

Host: Windows, Node 24.22.0, npm 11.19.1; pinned lockfile dependencies.

| Check                          | Result                                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                     | 85 existing demo tests passed                                                                                                                                                                 |
| `npm run verify:foundation`    | TypeScript, package boundaries, 25 tests and production preview build passed                                                                                                                  |
| Chromium + WebKit Playwright   | 14 tests passed, including Phase 2 composed UI, migration/restart/checkpoint and real image codec                                                                                             |
| Windows Firefox                | Launch fails before test execution with `browserType.launch: spawn UNKNOWN`; six checks attempted before the final preview test was added; all seven checks still required in hosted Linux CI |
| `npm run check`                | Legacy syntax/manifests/offline assets passed                                                                                                                                                 |
| `npm run scan:secrets`         | Narrow credential/private-key scan passed                                                                                                                                                     |
| `node scripts/freeze-demo.cjs` | All 37 frozen files verified                                                                                                                                                                  |
| Formatting                     | Prettier check passed                                                                                                                                                                         |

The 16 added Node tests cover hierarchy, midnight/overlaps, explicit DST/travel, planned
versus logged time, deck deletion/Undo/expiry, causal dependencies/concurrency rejection,
pending retention/compaction/retry, caller snapshots, source equality, all legacy entity
families/settings, zero-duration presets, sent/seen history, seven achievement-state entries,
editable strokes/photos, overflow, unknown conflicts/deletes, malformed/duplicate inputs,
orphan review, exact source-size boundary (~1 MiB), backup/recovery quota failures, aborted
activation, restart/resume, media integrity, recovery ring and failed secondary effects.

Browser output is locally generated in ignored `build/browser-results.json` and test traces
in `test-results`. Chromium/WebKit versions come from the pinned Playwright 1.64.1 install;
the report records each run. No new hosted CI, actual Firefox pass, physical Safari result,
OS process-kill durability result or phone performance measurement is claimed. Existing CI
already discovers the added tests. The production preview includes the Phase 2 lazy bundle.

## Remaining release gates

- Run the final revision in hosted Linux CI, including Firefox; keep existing native/CodeQL
  required checks. This session does not substitute old Phase 1 hosted results for Phase 2.
- Physical media/storage-pressure/OS-kill tests and final device budgets remain issue #2 /
  Phase 11 evidence. Synthetic transaction aborts do not prove durable writes under power loss.
- Production import/merge/replace and backup-download UI, old-device cutover guidance,
  historical cloud/encrypted readers and owner real-backup rehearsal remain gated. This
  implementation never touches `slb1`, OAuth storage or `/sailors-logbook.json`.
- Production conflict merge, acknowledgement protocol, stale-device barriers, optional
  encryption/rotation/trusted unlock and actual erasure remain Phases 9–10 / issue #3.
- Pending operations, tombstones, minimal receipts, source archives and referenced blobs
  are conservatively retained. Thirty-day trash eligibility is not a physical erasure claim.
  Blob garbage collection and epoch-aware metadata collection require later protocol evidence.

Stop at Phase 2. A new owner request is needed before beginning Calendar or another port.
