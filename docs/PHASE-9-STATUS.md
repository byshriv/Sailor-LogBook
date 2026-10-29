# Phase 9 status — 29 October 2026

Implemented for review on `codex/phase-9-sync`, based on fetched/current main
`df2310d7d6cc9dd09830724fc1d37bcc3ad48007` (merged PR #17, final head `9d01b6c`).
Phase 8 is accepted and complete by explicit owner instruction. Phase 9 acceptance
and live/device exit evidence are pending. Phase 10 and deployment were not started.

Review at `npm run dev:foundation`, `http://127.0.0.1:5173/?phase=9&tool=help#sync`.
Use synthetic fixtures and disposable profiles; no personal data or live Dropbox
account was used for implementation/testing. See [architecture](ARCHITECTURE-PHASE-9.md),
[verification](VERIFICATION-PHASE-9.md) and [handoff](../PHASE-HANDOFF.md).

Implemented: real HTTP Dropbox port/PKCE; separate protocol floor/namespace;
plain-first transfer; verified read-back and durable receipts; first join and
three-way conflict/deletion review; local recovery and accessible retained cloud
alternatives; encrypted full-content/media uploads and backups; guided verified
recovery kit; session unlock/Lock/Disconnect; explicit backup-verified rejoining;
legacy revision/cutover review. Existing screens, owner edits and data are preserved.

The bounded full-baseline transport uses existing local durable operations; it does
not exchange/compact other devices' operation tails. Manual sync and optional open-screen
minute previews are implemented. Automatic sync throughout every screen/closed app is
not implemented. Limits: 64 MiB backup / 96 MiB encrypted wire; memory based.

Before phase acceptance: real two-device Dropbox OAuth/expiry/race/offline/migration
rehearsal, owner interaction review, physical-device/WASM/storage budgets and Firefox
evidence. Independent security review is unavailable. Passphrase/recovery-kit changes
are implemented as a combined verified rewrap flow. Keep the same passphrase when
only replacing the recovery kit. Content-key replacement now creates a new master and
cloud generation after verifying an external backup and new recovery kit. A lost-device
guide links to Dropbox access controls; revoking device/app access remains a manual
provider action, not a claim made by this app. Separate local erasure and Delete logbook
everywhere now provide typed previews, persistent write/sync fencing, revision-checked
owned-file deletion, a content-free cloud barrier and verified local clearing. Offline
copies and provider-managed retention remain; legacy/malicious writers can recreate files.
Native trusted
unlock belongs to the authorized-later Phase 10 adapter and is not claimed here.
Do not label the Phase 9 launch gate complete based on synthetic tests alone.

## Explicit cloud restart follow-up — 29 October 2026

Implemented: separate read-only/typed new-cloud review after erasure, fresh local/history
requirements, owned-namespace/legacy checks and exact marker-revision CAS. The new cloud
has an independently generated ID and a verified empty baseline. Configured encryption
requires unlock; intent persistence atomically checks state/history/policy and excludes
competing requests. Ordinary sync and policy changes pause during uncertain creation.

Reload/retry can verify exact already-uploaded bytes without uploading again. Read-back,
backup/decryption, namespace and atomic local receipt verification must all succeed.
Later local edits remain pending for a separate ordinary sync preview. Old anchored
devices cannot silently cross the new generation. No Synced status is inferred from
creation. This supersedes the earlier unimplemented cloud-restart limitation in the
historical handoff/verification entries. See [ADR 0008](adr/0008-phase9-explicit-cloud-restart.md).

Remaining Phase 9 work: broader sync scheduling, real multi-device Dropbox OAuth/expiry /
race/offline/migration rehearsal, owner acceptance and physical-device/resource/security
review. Firefox and real Safari evidence remain pending. No live account, Phase 10 or
deployment work was performed. Final test evidence/build hashes are in VERIFICATION-PHASE-9.

## Scheduling and review publication follow-up — 29 October 2026

Open Settings scheduling now debounces committed local saves and tab/network return,
checks periodically while visible and eligible, and pauses for drafts/dialogs/offline.
It uses monotonic deadlines, non-overlapping cycles, three bounded retries for transient
reads, and provider Retry-After handling using server dates. Authentication/conflict /
protocol/key errors stop automatic checks; long provider delays pause them. Automatic
checks prepare review only. No merge/upload is automatic and manual sync remains default.

All production screens now expose accurate local pending status through Ctrl/Cmd S and
a link to Dropbox review. A zero pending count does not claim fresh cloud state. Full
screen navigation/reload still requires reconnecting and re-enabling checks: credentials
stay in memory, and cross-screen/closed-app continuous transfer is not implemented.
Changing that session/navigation architecture remains a review decision, not a hidden
credential-persistence workaround.

[Live rehearsal](PHASE-9-LIVE-REHEARSAL.md) records the real OAuth/two-device, interruption,
legacy migration, key rotation, erasure and replacement-generation checks still required.
It is a procedure, not executed evidence. Physical Safari/Android/resource budgets,
independent security review and owner Phase 9 acceptance remain pending. Native trusted
unlock remains Phase 10. This branch is being published for repository review only;
publication does not authorize merge, real-data cutover or deployment.

Published for review: [draft PR #19](https://github.com/byshriv/Sailor-LogBook/pull/19).
Final local evidence is **122 foundation**, **130 Chromium/WebKit**, **2 production PWA**
and **85 unchanged demo** passes. Hosted final-head checks/CodeQL remain pending; review
publication is not phase acceptance or deployment approval. Cache: `slb-production-94c80a408981ebb4`.
