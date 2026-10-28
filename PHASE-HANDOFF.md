# Phase handoff — Phase 2 local implementation

Updated 28 October 2026. The owner explicitly requested Phase 2 only. Domain, durable
storage/operations, recovery and synthetic lossless migration are implemented locally.
No later product port, real-data migration, cloud mutation or deployment occurred.

## Read first

1. LAUNCH-DECISIONS.md remains the authority; the 24 questions are already answered.
2. [Phase 2 status/evidence](docs/PHASE-2-STATUS.md) and [ADR 0005](docs/adr/0005-phase2-domain-durability.md).
3. LAUNCH-PLAN.md / ROADMAP.md, architecture review, ADRs 0001–0004 and
   [cutover contract](docs/migrations/V8-CUTOVER-CONTRACT.md).
4. Phase 1 history/evidence remains in docs/PHASE-1-STATUS.md,
   docs/VERIFICATION-PHASE-1.md and docs/REPOSITORY-SETTINGS.md.

## Repository state

Started clean on main, fetched origin and verified main == origin/main, zero ahead/behind,
at c0f3afa. No history reset/rebase or remote mutation was needed. These Phase 2 edits
are workspace changes, not a claimed published PR or hosted CI result. Main protection
and Phase 1 publication remain unchanged. Inspect current git status and fetch before
publication; do not force-push or bypass required checks.

## Implementation

- packages/domain/src/logbook.ts: schema 2 entities, pure commands/validation, linked
  midnight segments, unions with explicit offsets, inherited exclusion, reviewed rollover,
  compound deletion/reassignment, causal restores and 30-day Undo eligibility.
- packages/persistence/src/logbook.ts: isolated slb-phase2 DB, stable actor/causal vector,
  atomic head/tail/receipts/media, replay verification, pending acknowledgements, safe prefix
  checkpoints, compact duplicate receipts, recovery ring, raw corruption export and migration journal.
- packages/persistence/src/migration.ts: read-only v8 preview plus backup verification hook,
  source/destination digest validation, review blockers, retained source archive, blob extraction,
  interruption/retry and atomic activation. No live-origin storage reader is invoked.
- packages/persistence/src/media.ts and apps/web/src/photo-codec.ts: explicit resource
  budgets, WebP validation and opt-in originals. Unsupported encoders fail safely.
- apps/web/src/logbook-store.ts and phase2.tsx: Redux projection after durable load,
  one editing tab, synthetic save/delete/Undo and manual recovery snapshot.
- tests/foundation/phase2.test.ts and tests/browser/phase2.spec.ts: Node/browser coverage.

## Evidence

85 demo tests and 25 foundation/domain/storage tests pass. Typecheck, boundaries,
preview build, formatting, legacy checks, secret-pattern scan and 37 frozen hashes pass.
Fourteen Chromium/WebKit browser checks pass. Windows Firefox cannot launch
(spawn UNKNOWN), as in Phase 1; final Firefox checks need hosted Linux CI. See the status
doc for commands and limits. No new hosted CI, physical-device/OS-kill evidence or
independent security audit is claimed. No dependency update was introduced.

## Continue safely

Use Node 24.22.0/npm 11.19.1. Run npm ci, npm run verify:foundation, npm run test:browser,
npm test, npm run check, npm run format:check, npm run scan:secrets and
node scripts/freeze-demo.cjs. Browser execution needs local browser/server permissions;
the sandboxed run stalled and was stopped, then Chromium/WebKit passed outside it.
No desktop control. WebKit is not physical Safari.

Run npm run dev:foundation, then open http://127.0.0.1:5173/?phase=2.
Default / retains the Phase 1 proof and slb-phase1-proof DB. The live demo remains on
port 4173, Demo v8/slb-v8-r3, with original artwork/features/data unchanged.
No preview service worker or production deployment.

Migration callers supply explicit resource budgets, exclusion/orphan decisions and a
real saved-backup digest receipt. File selection/preview alone must never mutate storage.
Raw source bytes, unknown fields, IDs, settings, strokes and image bytes remain archived.
Overflow keeps all moments/notebook text pending the four-featured choice. Never request
personal backups/keys/tokens in chat or commit them.

A migration baseline creates no pending user operations. Ordinary edits do. Remote
replay creates no local interaction/sync effects. Only a future verified transport may
acknowledge operations; never fake acknowledgements to reduce storage. Concurrent branches
fail for review; Phase 9 must implement production merge.

Keep five ordinary recovery snapshots; migration source recovery is separately retained.
Undo/Recently deleted lasts 30 days, with conservative payload/tombstone/blob retention.
This is not permanent erasure. Corrupt stores remain available for raw export; do not
clear them, silently fall back, or auto-repair them from an unverified guess.

## Remaining inputs and stop boundary

Product decisions are settled. Empirical media budgets, physical phone/Safari/storage-
pressure coverage, production cloud retirement/join/import UI, merge/acknowledgement/epoch
collection, encryption/rotation and native trust remain release gates. Issue #2/#3 are
not waived. The backup callback in tests is not a shipped downloadable-backup UI.

Lossless means synthetic unencrypted state-backup conversion with exact source retention.
Encrypted/cloud record envelopes require later readers/unlock/review. No lossless
production downgrade is promised. Old cloud files and offline demo devices remain intact.

Stop at Phase 2. Calendar and every later feature port require a new owner request.
The next technical follow-up is final hosted CI/review without expanding phase scope.
