# Phase handoff — continue Phase 1

Updated 27 October 2026. **Phase 1 is in progress; its exit gate is not met.** This batch implemented an isolated local foundation and feasibility proofs. Do not start Phase 2 or deploy the preview over the demo.

## Read first

1. [LAUNCH-DECISIONS.md](LAUNCH-DECISIONS.md): authoritative accepted product decisions.
2. [docs/PHASE-1-STATUS.md](docs/PHASE-1-STATUS.md): deliverables, open decisions and owners.
3. [LAUNCH-PLAN.md](LAUNCH-PLAN.md), [ROADMAP.md](ROADMAP.md): phase boundaries and gates.
4. [research/ARCHITECTURE-REVIEW.md](research/ARCHITECTURE-REVIEW.md) and [research/PHASE-1-SPIKES.md](research/PHASE-1-SPIKES.md): pinned review and reuse evidence.
5. [ADRs](docs/adr/0001-foundation.md) 0001–0004: architecture, migration/protocol, optional encryption/recovery, Android/widget/release.
6. [docs/VERIFICATION-PHASE-1.md](docs/VERIFICATION-PHASE-1.md): actual results and limits.

LAUNCH-QUESTIONS.md is historical and answered. Do not repeat the 24 settled questions.

## Current state

- Workspace: C:/Users/swast/Downloads/SailorLogbook. Local Git initialized on main. **No commit, remote, push, hosted CI, public repo or tag was created.** Files remain untracked; inspect all source before initial publication. No GitHub CLI/connector was available. Public target remains byshriv/sailor-logbook, MIT.
- Root source and existing deploy folder/ZIPs remain Demo v8, cache slb-v8-r3. No demo runtime files or user data changed. reference/demo-v8 freezes 37 runtime/assets/license files with a SHA-256 manifest. ZIPs/dist are ignored.
- The root app still uses localStorage for canonical data/OAuth and IndexedDB for sync history. The proof does not read slb1, old credentials/databases or Dropbox.
- The source defines **seven** achievements, audited in docs/PRODUCT-SPEC.md. The earlier count of eight was incorrect.

## Implemented

- React 19.3.1, Redux Toolkit 2.13.0, Vite 8.3.5, TypeScript 7.0.2; pinned Node 24.22.0/npm 11.19.1, lockfile, formatter and package-boundary checks.
- Separate apps/web preview and domain/persistence/sync-core/sync-providers/platform/crypto packages. Original font/token direction, one synthetic sample form, local saved/unsaved copy and Web Locks single-editor ownership.
- Atomic IndexedDB state/sequence/operation proof, idempotent duplicates, input snapshots, transaction-completion notifications, abort rollback/retry and replay mismatch guards. Its local sequence is **not a causal clock**. No full domain model, checkpoints, remote replay, compaction or migration.
- Revision compare-and-swap fake, downgrade guard, dual passphrase/recovery wrapping experiment and private widget/deep-link contracts. No Dropbox connection, content encryption/rotation, or native widgets.
- ADRs/specification/changelog, contribution/conduct/security docs, issue/PR templates, read-only CI artifact workflow, Dependabot, narrow secret scan and lockfile license inventory.

## Verification

- Root demo check and **85/85 demo tests** pass with no skips.
- **8/8 foundation tests**, type/import checks, formatting and Vite build pass.
- All 37 reference hashes and the narrow credential scan pass. Inventory has 146 lockfile entries with license metadata (including optional platform packages; not a legal audit).
- Fresh source at .local/phase1-clean-check installed with npm ci; audit summary was zero vulnerabilities. Foundation checks/build pass there. Demo tests: **84 pass, 1 expected skip**, because ignored .local/v1.html is absent. This is a clean-source check, not a Git clone/hosted CI result.
- Actual pinned upstream package names @sp/sync-core and @sp/sync-providers returned registry E404. Cached manifests/core exports/provider contracts inspected; no upstream implementation built or vendored. Adoption remains open.
- In-app browser timed out reaching the preview. User stopped native Computer Use with Escape before navigation/save/reopen/second-tab checks. **Browser QA is incomplete; no further browser input was sent after the stop.**
- Android Studio at the standard path, java and adb were not found. No native build/device/Keystore/signing test was performed.

## Run

Use npm ci, npm run check, npm test, npm run format:check, npm run scan:secrets, node scripts/freeze-demo.cjs and npm run verify:foundation.

npm run dev:foundation serves http://127.0.0.1:5173/ with database slb-phase1-proof. Root demo uses npm run dev on port 4173. Keep origins separate. No proof service worker or production deployment job exists. Vite dev session 4473 was started; check whether it is still running before starting another. Build output build/foundation is cleared/rebuilt by the build command. Never deploy this proof to logbook.shriv.work.

## Next Phase 1 work only

1. Obtain authenticated GitHub access without secrets in chat. Review publication contents, create/publish the intended public repo and frozen demo reference, enable private reporting/scans/protection, run hosted CI and verify actual settings. SECURITY.md advertises no unverified private contact.
2. Review ADRs and preview. Resume actual browser save/reopen, second-tab/stale-lock and visual checks in a later turn when browser interaction is wanted. Preserve Calendar and other large flows.
3. Resolve upstream adoption through a complete pinned/licensed source build or verified package release. The current focused cache is not a buildable vendoring artifact.
4. Arrange Android JDK/SDK/Studio/device access. Capacitor candidate 8.5.3 is not installed. Compile a Kotlin projection publish/clear + widget launcher proof; test Quick log, private metrics, stale date/revision, process death/lock/reboot. Confirm stable app ID before a signed install. Never request signing secrets in chat.
5. Finalize/review migration compatibility and optional-encryption contracts; select vetted KDF/serialization after device evidence. Full converter/model implementation remains Phase 2.
6. Verify hosting/staging access and arrange real Safari/macOS/Linux and lower-memory Android coverage. Simulations/wrapping tests cannot substitute.

## Scope that must not drift

Sync first, encryption optional; no mandatory full-local-database encryption or silent plaintext fallback. Three deck levels, original past wall dates, linked midnight segments, union eligible minutes, inherited exclusions, reassignment on deck deletion and reviewed rollover. Preview/recovery before merge/import; preserve best-thing overflow; Undo/30-day trash with independent tombstone retention. Default WebP with Keep original and empirical budgets. Distinct Lock/Disconnect/Erase local/Delete everywhere with honest stale-device/partial-failure behavior. Web/PWA + signed GitHub APK + both widgets required for 1.0; Google Play/native iOS later. Preserve original artwork/features, no ads/telemetry, owner UI review and real platform coverage. No real backups or secrets in chat/tests.
