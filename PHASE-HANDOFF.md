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

Passphrase/recovery-kit changes and content-key replacement are implemented in the
follow-ups below. Provider access revocation is a manual Dropbox action; erasure remains open.
Separate local/cloud erasure is implemented in the follow-up below, with explicit
legacy/malicious-writer limits. Trusted native Android unlock
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

## Credential-change follow-up — 29 October 2026

Implemented the next Phase 9 code gap: combined passphrase/recovery-kit changes through
current credential authentication, new passphrase verification and saved-code reentry.
Use the same passphrase when replacing only the recovery kit. Complete reviewed encrypted
sync before changing credentials. CAS/read-back and local recovery protect the change;
policy/anchor update atomically and archive old wrappers. Uncertain success resumes from
the durable upload intent. An interruption does not undo a possible cloud commit: use the
new kit and preview again. Old backups remain readable with their original kit.

This keeps the existing content master, key ID and logbook generation. It does not revoke
a lost device's keys/tokens or protect earlier cached/provider copies. Content-key
rotation, lost-device and erasure workflows remain Phase 9 work. No Phase 10/deployment.

Verification: 91 foundation tests, 18 sync/backup Chromium/WebKit checks, final focused
credential checks 2/2 and final production PWA 2/2 pass. Typecheck, boundaries, formatting,
whitespace, narrow secret scan and all 37 frozen hashes pass. Exact separate reports and
final build hashes are in docs/VERIFICATION-PHASE-9.md. Current cache is
`slb-production-0bc79a32554be5f1`. Owner README/DEPLOY diffs remain byte-identical and
excluded. This follow-up is local; Phase 9 owner/live exit acceptance remains pending.

## Content-key replacement follow-up — 29 October 2026

Source `81ec0c7` completes the next Phase 9 implementation step: independent master/key ID
and cloud generation, authenticated current credentials, current external-backup verification,
manual Dropbox access-review guidance, typed ROTATE, and a verified replacement recovery kit.
Complete encrypted sync first. The same CAS/read-back/recovery/atomic-policy path re-encrypts
all verified content/media. Old clients cannot automatically upload across the generation
barrier. Exact matching local transition intents can recover uncertain success using the new
key; later local edits remain pending and are preserved. Old backups retain their own kits.

Dropbox revocation remains manual: the app cannot enumerate/revoke another device's token,
prove the user's provider review, remotely erase an offline copy or prevent a still-authorized
malicious provider writer. Follow the linked official guidance, revoke untrusted access and
reconnect as needed before rotating. No live account was modified. Erasure, live multi-device
Dropbox rehearsal, physical-device/resource/security review and native trust remain open.
Continue Phase 9 only; do not start Phase 10 or deploy.

Evidence: 96 foundation tests; 20 sync/backup Chromium/WebKit checks; final focused rotation
checks 4/4; production PWA 2/2. Typecheck, boundaries, formatting, whitespace, narrow secret
scan and all 37 frozen hashes pass. Reports and final hashes are in VERIFICATION-PHASE-9.
Current cache: `slb-production-9a43185990e30c8a`. Only README.md/DEPLOY.md should remain
dirty after documentation is committed; their owner hashes are unchanged. Local commits only.

## Permanent erasure follow-up — 29 October 2026

Core `ab248d7` and UI/browser `dac7c53` implement separate Erase local data and Delete
logbook everywhere, using read-only/typed previews and explicit no-Undo scope acknowledgement.
Current checks/uploads abort/drain before review; drafts block entry. A confirmed persistent
job fences writes/sync across reloads. Cloud deletion retains a content-free generation barrier,
uses exact-revision individual deletion of explicitly owned files, and independently re-lists /
reads back before clearing local content. Offline/partial/uncertain results keep local data/keys;
resume handles missing files and demands fresh review for changed/recreated ones.

Local clear atomically removes content, blobs, pending operations, receipts, trash, all recovery /
source archives, sync state and key wrappers. A blank actor/checkpoint, content-free receipt and
new handle epoch remain. Old store handles stay unable to write after an explicit new local
session. Completed result reads check blank state/allowed metadata/empty personal stores and
fail closed on inconsistencies; malformed deletion intents cannot upload a content-bearing marker.
The UI reloads to drop old projections/tokens/keys and avoids stacking first-run onboarding.

No real user/account deletion was performed. Separate demo storage, other profiles/offline devices,
downloaded backups and provider-managed deleted files/revisions remain. Legacy demos can recreate
their old file later, and malicious authorized writers are outside this protocol. Stop/revoke those
clients manually. Logical erasure is not forensic secure wipe. The content-free Dropbox marker
intentionally remains; a new cloud-logbook initialization flow is not implemented. The offered
restart is a new local logbook. See docs/adr/0007-phase9-permanent-erasure.md for exact ownership.

Evidence: 107 foundation tests; 120-case full Chromium/WebKit run; after final narrow integrity
checks, six focused erasure browser checks and both final production PWA checks pass. All 85
unchanged demo tests, typecheck, boundaries, formatting, whitespace, narrow secret scan and 37
frozen hashes pass. Exact separate reports/build hashes are in docs/VERIFICATION-PHASE-9.md.
Current cache: `slb-production-ba4304af72641721`. README/DEPLOY remain byte-identical owner edits.
Local commits only; Phase 9 owner/live exit acceptance remains pending. Continue Phase 9 only.
Remaining work includes explicit new-cloud initialization after erasure, broader sync scheduling,
real multi-device Dropbox rehearsal, physical/resource/security review and later native trust.
No Phase 10 or deployment.

## Explicit cloud restart follow-up — 29 October 2026

Source `5cf77d4` implements the next Phase 9 step: after erasure and an explicit new local
session, connect/check Dropbox, then Review new cloud logbook. Typed NEW CLOUD and an
empty-baseline acknowledgement are required. Initial content, retained history and prior
sync state must be empty. The cloud must contain only the unchanged deletion marker in
its owned namespace; legacy recreation/owned leftovers require review. Unrelated files
remain untouched. Configured encryption requires unlock and cannot fall back to plaintext.

The exact verified empty request is persisted with atomic fresh-state/history/policy checks
before CAS upload to a random new generation. Interrupted/uncertain results block ordinary
sync and policy changes across reload; reconnect/unlock and explicitly re-review to retry
or verify the identical upload. No newer local records are uploaded or acknowledged by
that retry. Later edits remain pending for a separate ordinary sync preview. Exact read-back,
inventory, backup/decryption and atomic receipt verification precede success. Old anchored
devices retain unsynced edits and cannot upload automatically into the replacement generation.

This supersedes the earlier unimplemented cloud-restart limitation. See
`docs/adr/0008-phase9-explicit-cloud-restart.md` and updated Phase 9 architecture/status.
The protocol cannot remotely erase downloaded/offline copies or provider history, retire
legacy writers, revoke tokens or prevent malicious authorized provider writes. Inventory
checks cannot lock the entire Dropbox namespace. No new live-account/security guarantee.

Evidence: 116 foundation cases; final targeted Chromium/WebKit sync/erasure/backup 30/30;
final production PWA 2/2. Typecheck, boundaries, formatting, whitespace, narrow secret scan
and all 37 frozen hashes pass. A repeated existing WebKit import fixture race was fixed by
waiting for input readiness after export; final suite passes without suppressing assertions.
Reports and final artifact hashes are in `docs/VERIFICATION-PHASE-9.md`.
Current cache: `slb-production-ccb88786f62c6cd6`. README/DEPLOY owner edits remain identical
and excluded. Local review commits only; no push/PR/deployment/live owner data changes.

Next Phase 9 work: broader sync scheduling, real multi-device Dropbox grant/expiry/race /
offline/migration rehearsal, owner interaction acceptance and physical-device/resource /
security review. Firefox and real Safari evidence remain pending. Native trusted unlock
belongs to later Phase 10 and is unstarted. Phase 9 is not yet accepted; do not deploy.

## Scheduling and repository-review continuation — 29 October 2026

Source `0076922` adds opt-in checks after durable local saves, tab/network return and a
visible/eligible minute interval. Three-second coalescing, monotonic deadlines, no overlap,
draft/dialog/offline/hidden guards, cancellation and three bounded transient-read retries
replace the minute-only timer. Retry-After uses server Date for HTTP dates; delays over
five minutes pause checks instead of violating the requested delay. Authentication /
conflict/protocol/key failures stop checks. Automatic review never applies a merge/upload.

The shared Ctrl/Cmd S panel on all production screens now reads local pending operations
and erasure fencing, links to Dropbox review and never infers fresh cloud state from a
zero pending count. Cross-screen continuous transfer remains unavailable: full navigation
or reload drops the in-memory token/key, so reconnect and enable checks again in Settings.
No persistent-credential workaround or Phase 10 native adapter was introduced.

A live acceptance procedure is in `docs/PHASE-9-LIVE-REHEARSAL.md`. It is **not run** and
must not be presented as real Dropbox/device/security evidence. Real grant/expiry/CORS /
scope and two-device/migration/network rehearsal, physical Safari/Android/resource budgets,
independent security review and owner Phase 9 acceptance remain open. Existing repository
release gates #2/#3 remain open, including later native trusted unlock. No deployment.

Main was fetched and remains equal to origin/main, including merged PR #17. All Phase 9
implementation commits are on `codex/phase-9-sync`; the owner requested repository review
publication. Preserve README/DEPLOY edits: their hashes are unchanged and excluded.
Latest verified source has 122 foundation passes, the focused scheduling/status browsers
6/6, production PWA 2/2 and unchanged demo 85/85. Full browser and hosted review evidence
is recorded in the verification follow-up; pending checks must not be called passed.

Final local full browser regression: **130/130 Chromium/WebKit pass**, zero failure/skip /
flaky, after the scheduling fixes. Report: `build/browser-phase9-review-full.json`.
Published as [draft PR #19](https://github.com/byshriv/Sailor-LogBook/pull/19), branch
`codex/phase-9-sync` against `main`, with original local commits intact. No force push,
merge, deployment or Phase 10 work. Final hosted CI/CodeQL evidence belongs to the final
pushed head and remains pending until actually returned. Review the PR and live rehearsal
before owner Phase 9 acceptance; no real-data cutover is approved. Only the unchanged
README.md/DEPLOY.md owner edits should remain dirty after this handoff commit.
