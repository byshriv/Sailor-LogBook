# Phase handoff — Phase 9 Dropbox and optional encryption

29 October 2026. Branch `codex/phase-9-sync`. Phase 8 is accepted and complete by
explicit owner instruction. Phase 9 is implemented for review; acceptance and real
Dropbox/device exit evidence remain pending. Phase 10 and deployment are not started.

## Read and baseline

Read LAUNCH-DECISIONS.md, LAUNCH-PLAN.md, ROADMAP.md, docs/PRODUCT-SPEC.md, earlier
architecture/ADRs/verification, then docs/ARCHITECTURE-PHASE-9.md,
docs/PHASE-9-STATUS.md and docs/VERIFICATION-PHASE-9.md. Historical Phase 8 handoff
is retained at docs/PHASE-8-HANDOFF.md.

Fetched origin; fast-forwarded local `main == origin/main`, zero ahead/behind, to
`df2310d7d6cc9dd09830724fc1d37bcc3ad48007`, PR #17 merge, including final published
head `9d01b6c09bb9d0275ff83f021e38ed0d10abad34`. PR #17 merge time is 29 October
2026 00:15:20 IST. Owner README.md/DEPLOY.md edits remain intact and excluded.
No real account/data, production migration, publication, deployment or native work.

## Review map

- `packages/sync-providers/src/dropbox.ts`: injected real HTTP port, PKCE/state/code
  exchange, exact-revision or create-only upload, metadata check of unchanged legacy file.
- `packages/sync-core/src/reconcile.ts`: conservative three-way entity/field merge.
- `packages/crypto/src/content.ts`: Argon2id/AES-GCM full-content codec, independent
  wrappers, version/checksum recovery code, session unlock. Existing Phase 1 proof untouched.
- `packages/persistence/src/logbook.ts`: durable upload intent/anchor/acknowledgement,
  encryption policy, retained cloud sources, reviewed rejoin archive. No schema upgrade.
- `apps/web/src/sync-engine.ts`: verified preview/recovery/merge/CAS/read-back composition.
- `sync-tools.tsx`: Settings connect/preview/conflict/recovery-kit/unlock/Lock/Disconnect,
  encrypted backup and independent backup unlock, minute checks, backup-verified device rejoin.
- Existing DataTools accepts verified decrypted backups and exposes retained Dropbox
  copies for recovery. Parent guards keep sync/data previews separate from active drafts.

Review: `npm run dev:foundation`, then
`http://127.0.0.1:5173/?phase=9&tool=help#sync` with disposable synthetic profiles.
All earlier phase routes and original demo/reference remain. Production browser root
includes these Settings tools; native proof entry is unchanged.

## Important behavior

Ordinary sync works first without encryption setup. Production namespace is
`/sailor-logbook/v2/logbook.json`; the old `/sailors-logbook.json` is never changed.
Configure a real public App Folder app key and exact callback before live testing;
see architecture for scopes/redirect. No credentials or new app registration supplied.
Browser tokens/keys are memory-only; reload/navigation requires reconnect/unlock.
No background sync while closed; minute checks are open-Settings previews only.

The wire uses complete verified baselines, not remote operation-tail replay. Local
commands/receipts remain durable and pending until verified cloud read-back and an
atomic local acknowledgement. No automatic compaction. Whole backup limit 64 MiB,
encrypted wire 96 MiB; memory-based transfer is not a proven mobile budget.

Two nonempty copies require preview. Conflicts/deletion barriers and relationship
errors block apply. Every merge verifies local recovery and retains the incoming copy
before mutation. Interrupted uploads never report Synced on response/timeout alone.
A byte-exact reread can recover an uncertain successful upload. CAS/local changes
retain pending work. Retained cloud alternatives are recoverable through Storage & data.
Archives deduplicate instead of nesting on every alternating-device sync.

Legacy revision changes require stop-old-writers/import-latest-backups confirmation;
a change during transfer prevents acknowledgement. Export materialized state from the
unchanged demo (unlock there if encrypted), then use the existing v8 import preview.
Offline old writers cannot be remotely retired. Unknown versions fail closed.

Phase 8 rescue starts a new actor and clears sync continuity. Rescued/stale copies
must join/review, including tombstone conflicts. Missing/changed known cloud generations
never automatically recreate cloud data. Review device join requires a matching external
backup, verified local point and typed JOIN; it archives old journal/keeps pending work.
Encryption policy survives ordinary rejoin and prevents silent plaintext fallback.

Recovery setup requires actual saved-code reentry and cryptographic verification before
policy persistence. New encrypted backups are the recommended default; plaintext export
stays explicit. Old encrypted backup files can unlock independently without Dropbox.
Local IndexedDB, recovery sources and prior plaintext provider versions remain plaintext.
Lock forgets session key; Disconnect forgets provider token; neither erases local data.
No diagnostics/telemetry containing content, credentials or keys is added.

## Remaining Phase 9 and release work

Do not declare the Phase 9 launch gate complete. Real two-device Dropbox consent,
app-folder permissions/CORS, expiry/offline/races and owner interaction review remain.
Physical Android/Safari/WASM/memory/storage and independent security review are unverified.
Local Firefox previously fails before app launch; record fresh verification honestly.

Passphrase/recovery/content-key rotation UI and lost-device workflows are not implemented.
Delete everywhere/local erase are not shipped; erasure must prove generation barriers and
partial failures before making stale-device guarantees. Trusted native Android unlock
requires the later Phase 10 adapter; no Keystore/trust behavior is simulated here.
Full-screen automatic scheduling/large streaming transfers are also not implemented.
Continue Phase 9 review/gaps only. Phase 13 owner review and Phase 14 deployment remain.

Final local command outcomes and review commits follow in docs/VERIFICATION-PHASE-9.md.
No hosted CI, live-device pass or independent audit is inferred from local tests.

## Final local review record

Source review commits: `8a4be8c` core, `7a872c5` guarded UI/browser flows, `7102eb7`
featured-overflow preservation. Documentation follows. Local only; no PR/push/deploy.
Final fetch: main and origin/main remain equal at `df2310d`.

Evidence: 85 foundation and 85 unchanged demo tests; 110-case full Chromium/WebKit run;
after the narrow overflow follow-up, eight focused sync browser checks and both final
production PWA checks pass. Typecheck, boundaries, formatting, whitespace, narrow secret
scan and all 37 frozen hashes pass. Firefox remains a pre-launch Windows spawn failure.
Exact commands, artifact hashes, separate full/focused reports and unresolved platform /
security limits are in docs/VERIFICATION-PHASE-9.md. Current worker cache:
`slb-production-2bf69b6973e020b2`. No artifact was promoted.

Shared deletion barriers survive empty joins and same-generation rollback requires review.
When combined featured moments exceed four, every text is retained in Notebook and that
day becomes unfeatured for the existing Home chooser; unrelated sync continues.
README.md and DEPLOY.md should be the only dirty files after documentation is committed.
