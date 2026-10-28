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
evidence. Independent security review is unavailable. Passphrase/recovery/content-key
rotation and lost-device workflows remain a Phase 9 security gap; Delete everywhere
requires its own generation/tombstone and partial-failure evidence. Native trusted
unlock belongs to the authorized-later Phase 10 adapter and is not claimed here.
Do not label the Phase 9 launch gate complete based on synthetic tests alone.
