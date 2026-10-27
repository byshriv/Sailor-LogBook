# Phase handoff — Phase 1 technical work complete

Updated 28 October 2026. Technical foundation and feasibility work are complete. **Full Phase 1
closure still needs the owner's Protect Main policy enabled and required checks configured.**
Do not start Phase 2 merely because the code is published. No production deployment occurred.

## Read first

- [Phase status](docs/PHASE-1-STATUS.md), [verification](docs/VERIFICATION-PHASE-1.md) and [repository settings](docs/REPOSITORY-SETTINGS.md).
- [Technical review](docs/REVIEW-2026-10-28.md), four ADRs, [v8 cutover contract](docs/migrations/V8-CUTOVER-CONTRACT.md).
- LAUNCH-DECISIONS.md remains authoritative; LAUNCH-QUESTIONS.md is answered historical material.
- LAUNCH-PLAN.md / ROADMAP.md retain later phase boundaries. Pinned architecture review and research/PHASE-1-SPIKES.md explain the reuse choice.

## Published work

Public repository: https://github.com/byshriv/Sailor-LogBook (owner-created spelling).
Review: https://github.com/byshriv/Sailor-LogBook/pull/1, branch phase-1-foundation.
Source was published through the connected GitHub tools; terminal Git credentials were
unavailable and no desktop login/control was attempted. The PR is attached to this chat.

Implemented: isolated React/TS/Redux/Vite preview; canonical-store/operation atomic-write
proof with input snapshots, duplicate retry, abort/recovery and replay guards; Web Locks;
revision-checked fake transport; dual optional-encryption key wrappers; hash-wasm Argon2id
candidate; Capacitor/Kotlin private widget projection, immutable intents and cold/warm launch
routing; CI/headless browser/emulator/CodeQL checks; specification, ADRs, security/contribution
material, notices/inventory, migration/recovery contracts and public release-gate issues.

Root product remains Demo v8, slb-v8-r3. Its runtime and original artwork were preserved.
reference/demo-v8 contains 37 byte-preserved hashed files; Git attributes preserve them across
checkouts. The source has seven achievements, not eight. No actual migration, cloud connection,
full-domain port or production encryption/native release is implemented by these proofs.

## Evidence

- Existing workspace: 85 demo tests pass; nine foundation tests pass.
- Actual fresh Git clone installs/builds/type-checks and verifies all 37 reference hashes.
- Hosted clean Linux: 12 browser tests pass across Chromium, Firefox and WebKit.
- Android app/test APKs compile; two API31 emulator instrumentation tests pass.
- check, android-proof and codeql passed in run 40564791258; final PR revision must remain green.
- Artifact IDs/digests, failure history and real-device limitations are in the verification doc.
- Private vulnerability reporting is enabled and verified. Root public host returns HTTPS 200
  through Cloudflare; no Cloudflare account/staging access or deployment is claimed.

## Remaining owner action / closure

The owner explicitly chose exact settings rather than deferral. Private reporting is done.
Protect Main ruleset 25984549 was still disabled at last read and contained no required status
checks. Set Enforcement Active, require pull requests and check/android-proof (optionally
codeql), keep external approvals at zero for the solo owner, and prohibit force push/deletion.
The connector cannot change admin settings. Verify actual policy before declaring closure.
Then finalize/merge PR #1 after its latest checks pass. No protection bypass is authorized.

## Continue safely

Use Node 24.22.0/npm 11.19.1; npm ci, npm run verify:foundation, npm run test:browser,
npm run format:check, npm run scan:secrets and node scripts/freeze-demo.cjs.
Headless browsers require npx playwright install chromium firefox webkit. No PC control.
Local Windows Firefox launch failed; Linux Firefox passed. WebKit is not physical Safari.

Preview: npm run dev:foundation, port 5173, database slb-phase1-proof.
Demo: npm run dev, port 4173. Keep origins separate. No foundation service worker.
Android: build:foundation, sync:android, JDK21/SDK36, app-scoped Gradle tasks in CI.
Proof ID work.shriv.sailorlogbook.proof must not become the production identity by accident.
CI artifacts are seven-day debug/review artifacts with notices, not production releases.

Local authored commits and connector-created commits can have different hashes with identical
trees. Before later work, inspect git status/log and fetch origin; preserve local work and
align only after comparing trees. Do not blindly reset, pull through conflicts, or push a
divergent local history. Ignored .local contains clone/test/publication evidence, never source.

## Next implementation phase after closure and a new user request

Phase 2 only: complete typed domain, causal operations/checkpoints, storage/media/recovery and
lossless synthetic-fixture migration. Follow the reviewed cutover contract and preserve source
backups/unknown fields/IDs/original wall times. Do not port Calendar early.

Real platform/media/KDF evidence is tracked in issue #2; production encryption/rotation/
trusted Android unlock in issue #3. These are later release gates, not waived or falsely
proven by this phase. Full signed app/widgets are Phase 10. Preserve all accepted product rules:
sync-first optional encryption, original artwork/features, three deck levels, linked midnight
segments, union eligible minutes, inherited exclusions, reviewed rollover, recovery/Undo/trash,
private-by-default widgets and honest erasure. Never request real backups/keys/tokens in chat.
